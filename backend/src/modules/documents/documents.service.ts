import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TraceabilityService } from '../traceability/traceability.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private traceabilityService: TraceabilityService,
  ) {}

  private async space(key: string) {
    const space = await this.prisma.space.findUnique({ where: { key } });
    if (!space) throw new NotFoundException(`Space not found: ${key}`);
    return space;
  }

  private async pageTypeId(spaceId: string) {
    const type = await this.prisma.workItemType.findFirst({
      where: { spaceId, name: 'page' },
    });
    return type?.id;
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

  /** 문서(페이지) 트리 — page 타입만, parentPageId 계층 포함 */
  async getTree(spaceKey: string) {
    const space = await this.space(spaceKey);
    const typeId = await this.pageTypeId(space.id);
    if (!typeId) return [];

    const pages = await this.prisma.workItem.findMany({
      where: { spaceId: space.id, typeId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        version: true,
        updatedAt: true,
      },
    });
    const pageMeta = await this.prisma.page.findMany({
      where: { workItemId: { in: pages.map((p) => p.id) } },
    });
    const metaById = new Map(pageMeta.map((p) => [p.workItemId, p]));

    const nodes = pages.map((p) => ({
      ...p,
      parentPageId: metaById.get(p.id)?.parentPageId ?? null,
      position: metaById.get(p.id)?.position ?? 0,
      isHomepage: metaById.get(p.id)?.isHomepage ?? false,
      children: [] as any[],
    }));

    const map = new Map(nodes.map((n) => [n.id, n]));
    const roots: any[] = [];
    for (const node of nodes) {
      if (node.parentPageId && map.has(node.parentPageId)) {
        map.get(node.parentPageId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortRec = (list: any[]) => {
      list.sort((a, b) => a.position - b.position || a.key.localeCompare(b.key));
      list.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  }

  async getPage(pageId: string) {
    const page = await this.prisma.workItem.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);
    const [meta, versions, comments] = await Promise.all([
      this.prisma.page.findUnique({ where: { workItemId: pageId } }),
      this.prisma.workItemVersion.findMany({
        where: { workItemId: pageId },
        orderBy: { version: 'desc' },
      }),
      this.prisma.comment.findMany({
        where: { targetType: 'page', targetId: pageId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { ...page, page: meta, versions, comments };
  }

  async createPage(
    spaceKey: string,
    data: { title: string; body?: any; bodyText?: string; parentPageId?: string; templateId?: string },
    userId: string,
  ) {
    const space = await this.space(spaceKey);
    const typeId = await this.pageTypeId(space.id);
    if (!typeId) throw new NotFoundException(`Work item type not found: page`);

    let body = data.body ?? null;
    if (!body && data.templateId) {
      const template = await this.prisma.pageTemplate.findUnique({ where: { id: data.templateId } });
      if (template) body = template.body;
    }

    const workItem = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId,
        key: await this.nextKey(space.id, space.key),
        title: data.title,
        status: 'open',
        priority: 'medium',
        body: body ?? undefined,
        bodyText: data.bodyText ?? (body ? this.extractText(body) : null),
        reporterId: userId,
        labels: [],
        version: 1,
      },
    });

    await this.prisma.page.create({
      data: {
        workItemId: workItem.id,
        parentPageId: data.parentPageId,
        templateId: data.templateId,
      },
    });

    await this.prisma.workItemVersion.create({
      data: {
        workItemId: workItem.id,
        version: 1,
        title: data.title,
        body: body ?? undefined,
        bodyText: workItem.bodyText,
        changedById: userId,
      },
    });

    return this.getPage(workItem.id);
  }

  async updatePage(
    pageId: string,
    data: { title?: string; body?: any; bodyText?: string; changeSummary?: string },
    userId: string,
  ) {
    const page = await this.prisma.workItem.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);

    const newVersion = page.version + 1;
    const body = data.body !== undefined ? data.body : page.body;
    const bodyText =
      data.bodyText !== undefined
        ? data.bodyText
        : data.body !== undefined
          ? this.extractText(data.body)
          : page.bodyText;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id: pageId },
        data: {
          title: data.title ?? page.title,
          body: body ?? undefined,
          bodyText,
          version: newVersion,
        },
      });
      await tx.workItemVersion.create({
        data: {
          workItemId: pageId,
          version: newVersion,
          title: updated.title,
          body: body ?? undefined,
          bodyText,
          changedById: userId,
          changeSummary: data.changeSummary,
        },
      });
      return updated;
    });

    // 영향받는 추적 링크를 suspect로 표시
    await this.traceabilityService.markSuspect(pageId, '문서 변경 시');
    return updated;
  }

  async deletePage(pageId: string) {
    const page = await this.prisma.page.findUnique({ where: { workItemId: pageId } });
    if (page) {
      await this.prisma.page.updateMany({
        where: { parentPageId: pageId },
        data: { parentPageId: page.parentPageId },
      });
    }
    await this.prisma.workItem.delete({ where: { id: pageId } });
  }

  async getVersions(pageId: string) {
    return this.prisma.workItemVersion.findMany({
      where: { workItemId: pageId },
      orderBy: { version: 'desc' },
    });
  }

  private extractText(body: any): string {
    if (!body) return '';
    if (typeof body === 'string') return body;
    const extract = (node: any): string => {
      if (!node) return '';
      if (node.text) return node.text;
      if (Array.isArray(node.content)) return node.content.map(extract).join(' ');
      return '';
    };
    return extract(body);
  }
}
