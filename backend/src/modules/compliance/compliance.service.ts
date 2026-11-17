import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  async getSummary(spaceKey: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const processes = await this.prisma.spaceProcessArea.findMany({ where: { spaceId: space.id, isApplicable: true } });
    return Promise.all(processes.map(async (sp) => {
      const checklists = await this.prisma.complianceChecklist.findMany({ where: { spaceId: space.id, processCode: sp.processCode } });
      const deliverables = await this.prisma.projectDeliverable.findMany({ where: { spaceId: space.id } });
      const procDeliverables = deliverables.filter(d => d.deliverableId === sp.processCode);
      return {
        processCode: sp.processCode,
        processName: sp.processCode,
        totalItems: checklists.length,
        completedItems: checklists.filter(c => c.status === 'completed').length,
        completionPercent: checklists.length > 0 ? (checklists.filter(c => c.status === 'completed').length / checklists.length) * 100 : 0,
        totalDeliverables: procDeliverables.length,
        releasedDeliverables: procDeliverables.filter(d => d.status === 'released').length,
      };
    }));
  }

  async getProcessDetail(spaceKey: string, processCode: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    const checklists = await this.prisma.complianceChecklist.findMany({ where: { spaceId: space.id, processCode } });
    const deliverables = await this.prisma.projectDeliverable.findMany({ where: { spaceId: space.id } });
    return { processCode, checklists, deliverables: deliverables.filter(d => d.deliverableId === processCode) };
  }

  async updateChecklist(checklistId: string, data: any) {
    return this.prisma.complianceChecklist.update({ where: { id: checklistId }, data: { status: data.status, completedAt: data.status === 'completed' ? new Date() : null } });
  }

  async createAssessment(spaceKey: string, data: any, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    return this.prisma.processAssessment.create({
      data: { spaceId: space.id, processCode: data.processCode, capabilityLevel: data.capabilityLevel, assessmentDate: new Date(data.assessmentDate), assessorId: userId, evidenceItems: data.evidenceItems || [], notes: data.notes },
    });
  }
}
