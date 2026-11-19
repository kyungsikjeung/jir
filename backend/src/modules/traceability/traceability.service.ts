import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TraceabilityService {
  constructor(private prisma: PrismaService) {}

  private async space(key: string) {
    const space = await this.prisma.space.findUnique({ where: { key } });
    if (!space) throw new NotFoundException(`Space not found: ${key}`);
    return space;
  }

  private async typeId(spaceId: string, name: string) {
    const t = await this.prisma.workItemType.findFirst({ where: { spaceId, name } });
    return t?.id;
  }

  async createLink(
    data: { fromType: string; fromId: string; toType: string; toId: string; linkType: string },
    userId: string,
  ) {
    const link = await this.prisma.traceLink.create({
      data: {
        fromType: data.fromType,
        fromId: data.fromId,
        toType: data.toType,
        toId: data.toId,
        linkType: data.linkType,
        createdById: userId,
      },
    });

    // 양방향 링크 자동 생성
    const reverseMap: Record<string, string> = {
      verifies: 'verified_by',
      satisfies: 'satisfied_by',
      implements: 'implemented_by',
      derives: 'derived_from',
      verified_by: 'verifies',
      satisfied_by: 'satisfies',
      implemented_by: 'implements',
      derived_from: 'derives',
    };
    const reverseType = reverseMap[data.linkType];
    if (reverseType) {
      await this.prisma.traceLink
        .create({
          data: {
            fromType: data.toType,
            fromId: data.toId,
            toType: data.fromType,
            toId: data.fromId,
            linkType: reverseType,
            createdById: userId,
          },
        })
        .catch(() => undefined);
    }
    return link;
  }

  async deleteLink(linkId: string) {
    const link = await this.prisma.traceLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException(`Trace link not found: ${linkId}`);
    const reverseMap: Record<string, string> = {
      verifies: 'verified_by', verified_by: 'verifies',
      satisfies: 'satisfied_by', satisfied_by: 'satisfies',
      implements: 'implemented_by', implemented_by: 'implements',
      derives: 'derived_from', derived_from: 'derives',
    };
    const reverse = reverseMap[link.linkType];
    if (reverse) {
      await this.prisma.traceLink.deleteMany({
        where: { fromType: link.toType, fromId: link.toId, toType: link.fromType, toId: link.fromId, linkType: reverse },
      });
    }
    await this.prisma.traceLink.delete({ where: { id: linkId } });
    return { success: true };
  }

  async getMatrix(spaceKey: string) {
    const space = await this.space(spaceKey);
    const [reqTypeId, testTypeId] = await Promise.all([
      this.typeId(space.id, 'requirement'),
      this.typeId(space.id, 'test_case'),
    ]);
    const [requirements, tests, allItems] = await Promise.all([
      reqTypeId ? this.prisma.workItem.findMany({ where: { spaceId: space.id, typeId: reqTypeId }, orderBy: { key: 'asc' } }) : [],
      testTypeId ? this.prisma.workItem.findMany({ where: { spaceId: space.id, typeId: testTypeId }, orderBy: { key: 'asc' } }) : [],
      this.prisma.workItem.findMany({ where: { spaceId: space.id }, select: { id: true } }),
    ]);
    const ids = new Set(allItems.map((i) => i.id));
    const links = await this.prisma.traceLink.findMany();
    const scoped = links.filter((l) => ids.has(l.fromId) || ids.has(l.toId));
    return { requirements, tests, links: scoped };
  }

  async getCoverage(spaceKey: string) {
    const space = await this.space(spaceKey);
    const reqTypeId = await this.typeId(space.id, 'requirement');
    if (!reqTypeId) return { total: 0, covered: 0, percent: 0, uncovered: [] };

    const requirements = await this.prisma.workItem.findMany({
      where: { spaceId: space.id, typeId: reqTypeId },
      orderBy: { key: 'asc' },
    });
    const reqIds = requirements.map((r) => r.id);
    const links = await this.prisma.traceLink.findMany({
      where: { fromType: 'requirement', toType: 'test_case', fromId: { in: reqIds } },
    });
    const coveredIds = new Set(links.map((l) => l.fromId));
    const covered = requirements.filter((r) => coveredIds.has(r.id));
    return {
      total: requirements.length,
      covered: covered.length,
      percent: requirements.length > 0 ? +((covered.length / requirements.length) * 100).toFixed(2) : 0,
      uncovered: requirements.filter((r) => !coveredIds.has(r.id)).map((r) => r.key),
    };
  }

  async getLinks(spaceKey: string, itemId: string) {
    const space = await this.space(spaceKey);
    const item = await this.prisma.workItem.findUnique({ where: { id: itemId } });
    if (!item || item.spaceId !== space.id) {
      throw new NotFoundException(`Item not found: ${itemId}`);
    }
    const links = await this.prisma.traceLink.findMany({
      where: { OR: [{ fromId: itemId }, { toId: itemId }] },
      orderBy: { createdAt: 'asc' },
    });
    if (!links.length) return [];
    const partnerIds = Array.from(
      new Set(links.flatMap((l) => [l.fromId, l.toId]).filter((id) => id !== itemId)),
    );
    const partners = await this.prisma.workItem.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, key: true, title: true },
    });
    const keyById = new Map(partners.map((p) => [p.id, p.key]));
    const titleById = new Map(partners.map((p) => [p.id, p.title]));
    return links.map((l) => {
      const isOutgoing = l.fromId === itemId;
      const partnerId = isOutgoing ? l.toId : l.fromId;
      return {
        ...l,
        direction: isOutgoing ? 'out' : 'in',
        partnerKey: keyById.get(partnerId) ?? null,
        partnerTitle: titleById.get(partnerId) ?? null,
      };
    });
  }

  async markSuspect(changedItemId: string, reason?: string) {
    const links = await this.prisma.traceLink.findMany({
      where: { OR: [{ fromId: changedItemId }, { toId: changedItemId }] },
    });
    if (!links.length) return { marked: 0 };
    await this.prisma.traceLink.updateMany({
      where: { OR: [{ fromId: changedItemId }, { toId: changedItemId }] },
      data: { isSuspect: true },
    });
    // 이미 등록된 suspectLink는 중복 생성하지 않는다
    const existing = await this.prisma.suspectLink.findMany({
      where: { traceLinkId: { in: links.map((l) => l.id) } },
    });
    const existingIds = new Set(existing.map((e) => e.traceLinkId));
    for (const l of links) {
      if (existingIds.has(l.id)) continue;
      await this.prisma.suspectLink.create({
        data: { traceLinkId: l.id, reason: reason || '연결된 항목이 변경됨' },
      });
    }
    return { marked: links.length };
  }

  async getSuspectLinks(spaceKey: string) {
    const space = await this.space(spaceKey);
    const items = await this.prisma.workItem.findMany({ where: { spaceId: space.id }, select: { id: true } });
    const ids = items.map((i) => i.id);
    return this.prisma.traceLink.findMany({
      where: { isSuspect: true, OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] },
    });
  }

  async resolveSuspect(linkId: string, resolution: string, userId: string) {
    const link = await this.prisma.traceLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException(`Trace link not found: ${linkId}`);
    await this.prisma.traceLink.update({ where: { id: linkId }, data: { isSuspect: false } });
    return this.prisma.suspectLink.create({
      data: { traceLinkId: linkId, resolution, resolvedById: userId, resolvedAt: new Date() },
    });
  }
}
