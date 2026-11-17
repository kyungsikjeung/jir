import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TraceabilityService {
  constructor(private prisma: PrismaService) {}

  async createLink(data: { fromType: string; fromId: string; toType: string; toId: string; linkType: string }, userId: string) {
    const link = await this.prisma.traceLink.create({
      data: { fromType: data.fromType, fromId: data.fromId, toType: data.toType, toId: data.toId, linkType: data.linkType, createdById: userId },
    });
    // 양방향 링크 자동 생성
    const reverseMap: Record<string, string> = { verifies: 'verified_by', satisfies: 'satisfied_by', implements: 'implemented_by', derives: 'derived_from' };
    const reverseType = reverseMap[data.linkType];
    if (reverseType) {
      await this.prisma.traceLink.create({
        data: { fromType: data.toType, fromId: data.toId, toType: data.fromType, toId: data.fromId, linkType: reverseType, createdById: userId },
      }).catch(() => {});
    }
    return link;
  }

  async getMatrix(spaceKey: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const links = await this.prisma.traceLink.findMany();
    const requirements = await this.prisma.workItem.findMany({ where: { spaceId: space.id, typeId: 'requirement-type-id' } });
    const tests = await this.prisma.workItem.findMany({ where: { spaceId: space.id, typeId: 'test-case-type-id' } });
    return { requirements, tests, links };
  }

  async getCoverage(spaceKey: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const requirements = await this.prisma.workItem.findMany({ where: { spaceId: space.id, typeId: 'requirement-type-id' } });
    const links = await this.prisma.traceLink.findMany({ where: { fromType: 'requirement', toType: 'test_case' } });
    const covered = requirements.filter(r => links.some(l => l.fromId === r.id));
    return { total: requirements.length, covered: covered.length, percent: requirements.length > 0 ? (covered.length / requirements.length) * 100 : 0, uncovered: requirements.filter(r => !covered.includes(r)).map(r => r.key) };
  }

  async markSuspect(changedItemId: string) {
    await this.prisma.traceLink.updateMany({
      where: { OR: [{ fromId: changedItemId }, { toId: changedItemId }] },
      data: { isSuspect: true },
    });
  }

  async getSuspectLinks(spaceKey: string) {
    return this.prisma.traceLink.findMany({ where: { isSuspect: true } });
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
