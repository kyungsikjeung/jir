import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequirementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(spaceKey: string, filters?: { reqType?: string; asilLevel?: string; status?: string }) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const type = await this.prisma.workItemType.findFirst({ where: { spaceId: space.id, name: 'requirement' } });
    const where: any = type ? { spaceId: space.id, typeId: type.id } : { spaceId: space.id };
    if (filters?.status) where.status = filters.status;
    if (filters?.asilLevel) where.asilLevel = filters.asilLevel;
    return this.prisma.workItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(spaceKey: string, data: any, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const type = await this.prisma.workItemType.findFirst({ where: { spaceId: space.id, name: 'requirement' } });
    const count = await this.prisma.workItem.count({ where: { spaceId: space.id } });
    const key = `${space.key}-${count + 1}`;

    const workItem = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: type.id,
        key,
        title: data.title,
        description: data.description,
        status: 'open',
        priority: data.priority || 'medium',
        assigneeId: data.assigneeId,
        reporterId: userId,
        aspiceProcess: data.aspiceProcess || 'SWE.1',
        asilLevel: data.asilLevel,
        body: data.body,
        bodyText: data.body ? this.extractText(data.body) : null,
      },
    });

    await this.prisma.requirement.create({
      data: {
        workItemId: workItem.id,
        reqType: data.reqType || 'software',
        asilLevel: data.asilLevel,
        safetyRelated: data.safetyRelated || false,
        rationale: data.rationale,
        acceptanceCriteria: data.acceptanceCriteria,
        verificationMethod: data.verificationMethod,
        derivedFromId: data.derivedFromId,
      },
    });

    if (data.derivedFromId) {
      await this.prisma.requirementRelation.create({
        data: { fromReqId: data.derivedFromId, toReqId: workItem.id, relationType: 'derives', createdById: userId },
      });
    }

    return workItem;
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
