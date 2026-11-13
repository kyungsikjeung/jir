import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    if (filters?.type) where.type = { name: filters.type };

    return this.prisma.workItem.findMany({
      where,
      include: { type: true, assignee: true, reporter: true, workflowState: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByKey(key: string) {
    const item = await this.prisma.workItem.findUnique({
      where: { key },
      include: { type: true, space: true, assignee: true, reporter: true, workflowState: true, parent: true, children: true, linksFrom: true, linksTo: true },
    });
    if (!item) throw new NotFoundException(`Work item not found: ${key}`);
    return item;
  }

  async create(spaceKey: string, data: { typeId: string; title: string; description?: string; priority?: string; assigneeId?: string; parentId?: string; labels?: string[]; aspiceProcess?: string; asilLevel?: string; body?: any }, reporterId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);

    // 키 생성: SPACE-순번
    const count = await this.prisma.workItem.count({ where: { spaceId: space.id } });
    const key = `${space.key}-${count + 1}`;

    return this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: data.typeId,
        key,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        assigneeId: data.assigneeId,
        reporterId,
        parentId: data.parentId,
        labels: data.labels || [],
        aspiceProcess: data.aspiceProcess,
        asilLevel: data.asilLevel,
        body: data.body,
        bodyText: data.body ? this.extractText(data.body) : null,
      },
      include: { type: true, assignee: true, reporter: true },
    });
  }

  async update(key: string, data: { title?: string; description?: string; status?: string; priority?: string; assigneeId?: string; labels?: string[]; body?: any; progressPercent?: number; estimatedHours?: number; actualHours?: number }) {
    const item = await this.findByKey(key);

    // 버전 증가
    const newVersion = item.version + 1;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id: item.id },
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          assigneeId: data.assigneeId,
          labels: data.labels,
          body: data.body,
          bodyText: data.body ? this.extractText(data.body) : undefined,
          progressPercent: data.progressPercent,
          estimatedHours: data.estimatedHours,
          actualHours: data.actualHours,
          version: newVersion,
          updatedAt: new Date(),
        },
      });

      // 버전 히스토리
      await tx.workItemVersion.create({
        data: {
          workItemId: item.id,
          version: newVersion,
          title: data.title || item.title,
          body: data.body || item.body,
          bodyText: data.body ? this.extractText(data.body) : item.bodyText,
          changedById: item.reporterId,
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

  async linkItems(fromKey: string, toKey: string, linkType: string, userId: string) {
    const from = await this.findByKey(fromKey);
    const to = await this.findByKey(toKey);

    const link = await this.prisma.workItemLink.create({
      data: { fromId: from.id, toId: to.id, linkType, createdById: userId },
    });

    // 양방향 링크 자동 생성
    const reverseType = this.getReverseLinkType(linkType);
    if (reverseType) {
      await this.prisma.workItemLink.create({
        data: { fromId: to.id, toId: from.id, linkType: reverseType, createdById: userId },
      }).catch(() => {}); // 이미 존재하면 무시
    }

    return link;
  }

  private getReverseLinkType(type: string): string | null {
    const reverseMap: Record<string, string> = {
      'blocks': 'is_blocked_by',
      'is_blocked_by': 'blocks',
      'verifies': 'verified_by',
      'verified_by': 'verifies',
      'satisfies': 'satisfied_by',
      'satisfied_by': 'satisfies',
      'implements': 'implemented_by',
      'implemented_by': 'implements',
      'derives': 'derived_from',
      'derived_from': 'derives',
    };
    return reverseMap[type] || null;
  }

  private extractText(body: any): string {
    if (!body) return '';
    if (typeof body === 'string') return body;
    // TipTap JSON → 평문 추출
    const extract = (node: any): string => {
      if (node.text) return node.text;
      if (node.content) return node.content.map(extract).join(' ');
      return '';
    };
    return extract(body);
  }
}
