import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(spaceKey: string, filters?: { status?: string; priority?: string; assigneeId?: string; type?: string }) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);

    const where: any = { spaceId: space.id };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.type) {
      const type = await this.prisma.workItemType.findFirst({ where: { spaceId: space.id, name: filters.type } });
      if (type) where.typeId = type.id;
    }

    const items = await this.prisma.workItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrich(items);
  }

  async findByKey(key: string) {
    const item = await this.prisma.workItem.findFirst({ where: { key } });
    if (!item) throw new NotFoundException(`Work item not found: ${key}`);
    const [enriched] = await this.enrich([item]);
    return enriched;
  }

  /** WBS 트리: 페이지 문서를 제외한 작업 항목을 parentId 계층으로 구성 */
  async getWbs(spaceKey: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);

    const pageType = await this.prisma.workItemType.findFirst({
      where: { spaceId: space.id, name: 'page' },
    });
    const items = await this.prisma.workItem.findMany({
      where: {
        spaceId: space.id,
        ...(pageType ? { typeId: { not: pageType.id } } : {}),
      },
    });

    const keyNumber = (key: string) => Number(key.split('-').pop()) || 0;
    items.sort((a, b) => keyNumber(a.key) - keyNumber(b.key));

    const enriched = await this.enrich(items);
    const nodes = enriched.map((item) => ({ ...item, children: [] as any[] }));
    const byId = new Map(nodes.map((item) => [item.id, item]));
    const roots: any[] = [];
    for (const node of nodes) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return {
      roots,
      total: enriched.length,
      assigned: enriched.filter((i) => !!i.assigneeId).length,
      estimatedHours: enriched.reduce(
        (sum, i) => sum + (i.estimatedHours ? Number(i.estimatedHours) : 0),
        0,
      ),
      averageProgress: enriched.length
        ? enriched.reduce((sum, i) => sum + (i.progressPercent ?? 0), 0) / enriched.length
        : 0,
    };
  }

  /** 담당자/보고자/유형 이름을 붙여 반환 (Prisma relation 미사용) */
  private async enrich(items: any[]) {
    if (!items.length) return items;
    const userIds = Array.from(
      new Set(items.flatMap((i) => [i.assigneeId, i.reporterId]).filter(Boolean)),
    );
    const typeIds = Array.from(new Set(items.map((i) => i.typeId).filter(Boolean)));
    const [users, types] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds as string[] } },
            select: { id: true, email: true, displayName: true },
          })
        : Promise.resolve([]),
      typeIds.length
        ? this.prisma.workItemType.findMany({
            where: { id: { in: typeIds as string[] } },
            select: { id: true, name: true, color: true, icon: true },
          })
        : Promise.resolve([]),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const typeById = new Map(types.map((t) => [t.id, t]));
    return items.map((i) => ({
      ...i,
      assignee: i.assigneeId ? userById.get(i.assigneeId) ?? null : null,
      reporter: i.reporterId ? userById.get(i.reporterId) ?? null : null,
      type: typeById.get(i.typeId) ?? null,
    }));
  }

  private async nextKey(spaceId: string, spaceKey: string) {
    const items = await this.prisma.workItem.findMany({ where: { spaceId }, select: { key: true } });
    let max = 0;
    for (const { key } of items) {
      const n = Number(key.split('-').pop());
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `${spaceKey}-${max + 1}`;
  }

  async create(
    spaceKey: string,
    data: {
      typeId?: string;
      type?: string;
      title: string;
      description?: string;
      priority?: string;
      assigneeId?: string;
      parentId?: string;
      labels?: string[];
      aspiceProcess?: string;
      asilLevel?: string;
      body?: any;
    },
    reporterId: string,
  ) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);

    let typeId = data.typeId;
    if (!typeId) {
      const type = await this.prisma.workItemType.findFirst({
        where: { spaceId: space.id, name: data.type || 'task' },
      });
      if (!type) throw new NotFoundException(`Work item type not found: ${data.type || 'task'}`);
      typeId = type.id;
    }

    const initial = await this.prisma.workflow.findFirst({
      where: { spaceId: space.id, isDefault: true },
    });
    let workflowStateId: string | undefined;
    if (initial) {
      const state = await this.prisma.workflowState.findFirst({
        where: { workflowId: initial.id, isInitial: true },
      });
      workflowStateId = state?.id;
    }

    return this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId,
        key: await this.nextKey(space.id, space.key),
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        assigneeId: data.assigneeId,
        reporterId,
        parentId: data.parentId,
        workflowStateId,
        labels: data.labels || [],
        aspiceProcess: data.aspiceProcess,
        asilLevel: data.asilLevel,
        body: data.body,
        bodyText: data.body ? this.extractText(data.body) : data.description ?? null,
      },
    });
  }

  async update(
    key: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeId?: string;
      labels?: string[];
      body?: any;
      progressPercent?: number;
      estimatedHours?: number;
      actualHours?: number;
      dueDate?: string | Date | null;
    },
    userId?: string,
  ) {
    const item = await this.findByKey(key);
    const newVersion = item.version + 1;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id: item.id },
        data: {
          title: data.title ?? item.title,
          description: data.description ?? item.description,
          status: data.status ?? item.status,
          priority: data.priority ?? item.priority,
          assigneeId:
            data.assigneeId === undefined ? item.assigneeId : data.assigneeId || null,
          labels: data.labels ?? item.labels,
          body: data.body ?? item.body,
          bodyText: data.body ? this.extractText(data.body) : item.bodyText,
          progressPercent: data.progressPercent ?? item.progressPercent,
          estimatedHours: data.estimatedHours ?? item.estimatedHours,
          actualHours: data.actualHours ?? item.actualHours,
          dueDate:
            data.dueDate === undefined
              ? item.dueDate
              : data.dueDate
                ? new Date(data.dueDate)
                : null,
          version: newVersion,
          updatedAt: new Date(),
        },
      });

      await tx.workItemVersion.create({
        data: {
          workItemId: item.id,
          version: newVersion,
          title: updated.title,
          body: updated.body,
          bodyText: updated.bodyText,
          changedById: userId,
          changeSummary: 'Updated',
        },
      });

      return updated;
    });
  }

  async delete(key: string) {
    const item = await this.findByKey(key);
    await this.prisma.workItem.delete({ where: { id: item.id } });
  }

  async addComment(key: string, body: string, authorId: string) {
    const item = await this.findByKey(key);
    return this.prisma.comment.create({
      data: { targetType: 'work_item', targetId: item.id, authorId, body, bodyHtml: body },
    });
  }

  async getComments(key: string) {
    const item = await this.findByKey(key);
    const comments = await this.prisma.comment.findMany({
      where: { targetType: 'work_item', targetId: item.id },
      orderBy: { createdAt: 'asc' },
    });
    const authorIds = Array.from(new Set(comments.map((c) => c.authorId)));
    const users = authorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, email: true, displayName: true, avatarUrl: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return comments.map((c) => ({ ...c, author: byId.get(c.authorId) ?? null }));
  }

  async linkItems(fromKey: string, toKey: string, linkType: string, userId: string) {
    const from = await this.findByKey(fromKey);
    const to = await this.findByKey(toKey);

    const link = await this.prisma.workItemLink.create({
      data: { fromId: from.id, toId: to.id, linkType, createdById: userId },
    });

    const reverseType = this.getReverseLinkType(linkType);
    if (reverseType) {
      await this.prisma.workItemLink
        .create({ data: { fromId: to.id, toId: from.id, linkType: reverseType, createdById: userId } })
        .catch(() => undefined);
    }

    return link;
  }

  private getReverseLinkType(type: string): string | null {
    const reverseMap: Record<string, string> = {
      blocks: 'is_blocked_by',
      is_blocked_by: 'blocks',
      verifies: 'verified_by',
      verified_by: 'verifies',
      satisfies: 'satisfied_by',
      satisfied_by: 'satisfies',
      implements: 'implemented_by',
      implemented_by: 'implements',
      derives: 'derived_from',
      derived_from: 'derives',
      relates: 'relates',
    };
    return reverseMap[type] || null;
  }

  /**
   * 워크플로우 전이
   * @param transitionName 상태 이름 (예: "In Review", "Approved") 또는 상태 ID
   */
  async transition(issueKey: string, transitionName: string, userId: string, comment?: string) {
    const item = await this.findByKey(issueKey);

    const state = await this.prisma.workflowState.findFirst({
      where: {
        OR: [{ id: transitionName }, { name: { equals: transitionName, mode: 'insensitive' } }],
      },
    });

    const data: any = { updatedAt: new Date() };
    if (state) {
      data.workflowStateId = state.id;
      data.status = state.name;
      data.resolvedAt = state.category === 'done' ? new Date() : null;
    } else {
      data.status = transitionName;
      data.resolvedAt = ['done', 'released', 'closed', 'resolved'].includes(transitionName) ? new Date() : null;
    }

    const updated = await this.prisma.workItem.update({ where: { id: item.id }, data });

    await this.prisma.workflowTransitionHistory.create({
      data: {
        workItemId: item.id,
        toStateId: state?.id,
        performedById: userId,
        comment,
      },
    });

    return updated;
  }

  private extractText(body: any): string {
    if (!body) return '';
    if (typeof body === 'string') return body;
    // TipTap JSON → 평문 추출
    const extract = (node: any): string => {
      if (!node) return '';
      if (node.text) return node.text;
      if (Array.isArray(node.content)) return node.content.map(extract).join(' ');
      return '';
    };
    return extract(body);
  }
}
