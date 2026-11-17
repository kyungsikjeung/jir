import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getTree(spaceKey: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const pages = await this.prisma.workItem.findMany({
      where: { spaceId: space.id },
      orderBy: { createdAt: 'asc' },
    });
    return this.buildTree(pages);
  }

  private buildTree(pages: any[]) {
    const map = new Map();
    const roots = [];
    for (const page of pages) {
      map.set(page.id, { ...page, children: [] });
    }
    for (const page of pages) {
      if (page.page?.parentPageId && map.has(page.page.parentPageId)) {
        map.get(page.page.parentPageId).children.push(map.get(page.id));
      } else {
        roots.push(map.get(page.id));
      }
    }
    return roots;
  }

  async getPage(pageId: string) {
    const page = await this.prisma.workItem.findUnique({
      where: { id: pageId },
    });
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);
    return page;
  }

  async createPage(spaceKey: string, data: { title: string; body?: any; parentId?: string; templateId?: string }, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);

    const type = await this.prisma.workItemType.findFirst({ where: { spaceId: space.id, name: 'page' } });
    const count = await this.prisma.workItem.count({ where: { spaceId: space.id } });
    const key = `${space.key}-${count + 1}`;

    let body = data.body || {};
    if (data.templateId) {
      const template = await this.prisma.pageTemplate.findUnique({ where: { id: data.templateId } });
      if (template) body = template.body;
    }

    const workItem = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: type.id,
        key,
        title: data.title,
        body,
        bodyText: this.extractText(body),
        reporterId: userId,
        version: 1,
      },
    });

    await this.prisma.page.create({
      data: { workItemId: workItem.id, parentPageId: data.parentId, templateId: data.templateId },
    });

    await this.prisma.workItemVersion.create({
      data: { workItemId: workItem.id, version: 1, title: data.title, body, changedById: userId },
    });

    return workItem;
  }

  async updatePage(pageId: string, data: { title?: string; body?: any; changeSummary?: string }, userId: string) {
    const page = await this.prisma.workItem.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);

    const newVersion = page.version + 1;
    const body = data.body || page.body;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id: pageId },
        data: { title: data.title || page.title, body, bodyText: this.extractText(body), version: newVersion },
      });
      await tx.workItemVersion.create({
        data: { workItemId: pageId, version: newVersion, title: data.title || page.title, body, changedById: userId, changeSummary: data.changeSummary },
      });
      return updated;
    });
  }

  async deletePage(pageId: string) {
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
      if (node.text) return node.text;
      if (node.content) return node.content.map(extract).join(' ');
      return '';
    };
    return extract(body);
  }
}
