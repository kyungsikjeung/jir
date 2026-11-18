import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  private async space(key: string) {
    const space = await this.prisma.space.findUnique({ where: { key } });
    if (!space) throw new NotFoundException(`Space not found: ${key}`);
    return space;
  }

  /** ASPICE 프로세스별 컴플라이언스 요약 */
  async getSummary(spaceKey: string) {
    const space = await this.space(spaceKey);
    const [processes, processAreas, checklists, deliverables, deliverableCatalog] = await Promise.all([
      this.prisma.spaceProcessArea.findMany({ where: { spaceId: space.id, isApplicable: true } }),
      this.prisma.processArea.findMany(),
      this.prisma.complianceChecklist.findMany({ where: { spaceId: space.id } }),
      this.prisma.projectDeliverable.findMany({ where: { spaceId: space.id } }),
      this.prisma.aspiceDeliverable.findMany(),
    ]);

    const areaByCode = new Map(processAreas.map((p) => [p.code, p]));

    return processes
      .map((sp) => {
        const items = checklists.filter((c) => c.processCode === sp.processCode);
        const done = items.filter((c) => c.status === 'completed').length;
        const catalogIds = new Set(deliverableCatalog.filter((d) => d.processCode === sp.processCode).map((d) => d.id));
        const procDeliverables = deliverables.filter((d) => catalogIds.has(d.deliverableId));
        const area = areaByCode.get(sp.processCode);
        return {
          processCode: sp.processCode,
          processName: area?.name || sp.processCode,
          category: area?.category,
          level: area?.level,
          totalItems: items.length,
          completedItems: done,
          completionPercent: items.length ? +((done / items.length) * 100).toFixed(1) : 0,
          totalDeliverables: procDeliverables.length,
          releasedDeliverables: procDeliverables.filter((d) => d.status === 'released').length,
        };
      })
      .sort((a, b) => a.processCode.localeCompare(b.processCode));
  }

  /** 특정 프로세스 상세 (체크리스트 + 산출물) */
  async getProcessDetail(spaceKey: string, processCode: string) {
    const space = await this.space(spaceKey);
    const [checklists, deliverables, catalog, area] = await Promise.all([
      this.prisma.complianceChecklist.findMany({ where: { spaceId: space.id, processCode }, orderBy: { createdAt: 'asc' } }),
      this.prisma.projectDeliverable.findMany({ where: { spaceId: space.id } }),
      this.prisma.aspiceDeliverable.findMany({ where: { processCode } }),
      this.prisma.processArea.findUnique({ where: { code: processCode } }),
    ]);
    const catalogIds = new Set(catalog.map((c) => c.id));
    return {
      processCode,
      processName: area?.name || processCode,
      processArea: area,
      checklists,
      deliverables: deliverables.filter((d) => catalogIds.has(d.deliverableId)),
      deliverableCatalog: catalog,
    };
  }

  async updateChecklist(checklistId: string, data: any) {
    const checklist = await this.prisma.complianceChecklist.findUnique({ where: { id: checklistId } });
    if (!checklist) throw new NotFoundException(`Checklist not found: ${checklistId}`);
    return this.prisma.complianceChecklist.update({
      where: { id: checklistId },
      data: {
        status: data.status,
        evidenceId: data.evidenceId ?? checklist.evidenceId,
        completedAt: data.status === 'completed' ? new Date() : null,
      },
    });
  }

  async createAssessment(spaceKey: string, data: any, userId: string) {
    const space = await this.space(spaceKey);
    return this.prisma.processAssessment.create({
      data: {
        spaceId: space.id,
        processCode: data.processCode,
        capabilityLevel: data.capabilityLevel,
        assessmentDate: data.assessmentDate ? new Date(data.assessmentDate) : new Date(),
        assessorId: userId,
        evidenceItems: data.evidenceItems || [],
        notes: data.notes,
      },
    });
  }

  // ── Baseline (SUP.8 형상관리) ─────────────────────────────
  async getBaselines(spaceKey: string) {
    const space = await this.space(spaceKey);
    return this.prisma.baseline.findMany({ where: { spaceId: space.id }, orderBy: { createdAt: 'desc' } });
  }

  async createBaseline(spaceKey: string, data: any, userId: string) {
    const space = await this.space(spaceKey);
    const baseline = await this.prisma.baseline.create({
      data: {
        spaceId: space.id,
        name: data.name,
        description: data.description,
        baselineType: data.baselineType || 'release',
        version: data.version || new Date().toISOString().slice(0, 10),
        status: 'draft',
        createdById: userId,
      },
    });
    const items = await this.prisma.workItem.findMany({ where: { spaceId: space.id } });
    await this.prisma.baselineItem.createMany({
      data: items.map((i) => ({ baselineId: baseline.id, itemType: 'work_item', itemId: i.id, itemVersion: i.version })),
      skipDuplicates: true,
    });
    return { ...baseline, itemCount: items.length };
  }

  async releaseBaseline(baselineId: string, userId: string) {
    const baseline = await this.prisma.baseline.findUnique({ where: { id: baselineId } });
    if (!baseline) throw new NotFoundException(`Baseline not found: ${baselineId}`);
    return this.prisma.baseline.update({
      where: { id: baselineId },
      data: { status: 'released', releasedAt: new Date(), approvedById: userId, approvedAt: new Date() },
    });
  }
}
