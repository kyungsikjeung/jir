import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExportService } from '../export/export.service';

/** 자동화 엔진 공통 계약 */
export interface Engine {
  name: string;
  execute(params: Record<string, any>, context?: any): Promise<any>;
  verify(params: Record<string, any>, context?: any): Promise<{ ok: boolean; errors: string[] }>;
}

/** 엔진 레지스트리 — 이름으로 엔진을 등록/조회/실행/검증 */
@Injectable()
export class EngineRegistry {
  private engines = new Map<string, Engine>();

  register(engine: Engine): void {
    this.engines.set(engine.name, engine);
  }

  get(name: string): Engine {
    const engine = this.engines.get(name);
    if (!engine) throw new BadRequestException(`Unknown engine: ${name}`);
    return engine;
  }

  list(): string[] {
    return Array.from(this.engines.keys());
  }

  execute(name: string, params: Record<string, any>, context?: any): Promise<any> {
    return this.get(name).execute(params, context);
  }

  verify(name: string, params: Record<string, any>, context?: any): Promise<{ ok: boolean; errors: string[] }> {
    return this.get(name).verify(params, context);
  }
}

/** 워크플로우 엔진 — M3 전이 흐름(요청 → 조건 → postActions → 이력) */
@Injectable()
export class WorkflowEngine implements Engine {
  readonly name = 'workflow';
  constructor(private prisma: PrismaService) {}

  private async resolve(params: Record<string, any>) {
    const { issueKey, transitionName } = params;
    const item = await this.prisma.workItem.findFirst({ where: { key: issueKey } } as any);
    if (!item) throw new BadRequestException(`Work item not found: ${issueKey}`);

    const target = await this.prisma.workflowState.findFirst({
      where: {
        OR: [{ id: transitionName }, { name: { equals: transitionName, mode: 'insensitive' } }],
      },
    } as any);
    if (!target) throw new BadRequestException(`Transition not allowed: ${transitionName}`);

    const current = item.workflowStateId
      ? await this.prisma.workflowState.findUnique({ where: { id: item.workflowStateId } } as any)
      : null;

    const candidates = await this.prisma.workflowTransition.findMany({
      where: { workflowId: target.workflowId, toStateId: target.id },
    } as any);
    const transition =
      candidates.find((t: any) => t.fromStateId === current?.id) ??
      (current ? null : candidates.find((t: any) => t.fromStateId === null));
    if (!transition) throw new BadRequestException(`Transition not allowed: ${transitionName}`);

    return { item, target, current, transition };
  }

  private conditionPassed(transition: any, item: any): boolean {
    const type = transition.conditionType;
    if (!type) return true;
    const cfg = transition.conditionConfig || {};
    const customFields = (item.customFields || {}) as Record<string, any>;
    if (type === 'required_fields') {
      const fields = Array.isArray(cfg.fields) ? cfg.fields : [];
      return fields.every(
        (k: string) => customFields[k] !== undefined && customFields[k] !== null && customFields[k] !== '',
      );
    }
    if (type === 'field_equals') {
      const key = cfg.key ?? cfg.field;
      if (!key) return true;
      return customFields[key] === cfg.value;
    }
    return true;
  }

  async execute(params: Record<string, any>) {
    const { item, target, current, transition } = await this.resolve(params);
    if (!this.conditionPassed(transition, item)) {
      throw new BadRequestException(`Transition blocked by condition: ${params.transitionName}`);
    }

    const updated = await this.prisma.workItem.update({
      where: { id: item.id },
      data: {
        workflowStateId: target.id,
        status: target.name,
        resolvedAt: target.category === 'done' ? new Date() : null,
        updatedAt: new Date(),
      },
    } as any);

    await this.runPostActions(transition.postActions, updated);

    await this.prisma.workflowTransitionHistory.create({
      data: {
        workItemId: item.id,
        transitionId: transition.id,
        fromStateId: current?.id ?? null,
        toStateId: target.id,
        performedById: params.userId,
        comment: params.comment,
      },
    } as any);

    return updated;
  }

  async verify(params: Record<string, any>) {
    try {
      const { item, transition } = await this.resolve(params);
      if (!this.conditionPassed(transition, item)) {
        return { ok: false, errors: [`Transition blocked by condition: ${params.transitionName}`] };
      }
      return { ok: true, errors: [] };
    } catch (e: any) {
      return { ok: false, errors: [e?.message ?? String(e)] };
    }
  }

  private async runPostActions(postActions: any, item: any) {
    const actions = Array.isArray(postActions) ? postActions : [];
    for (const action of actions) {
      if (!action || typeof action !== 'object') continue;
      if (action.type === 'set_field') {
        const key = action.key ?? action.field;
        if (!key) continue;
        await this.prisma.workItem.update({
          where: { id: item.id },
          data: { customFields: { ...(item.customFields || {}), [key]: action.value ?? null } },
        } as any);
      }
    }
  }
}

/** 감사 엔진 — AuditService를 Engine 계약으로 감싼다 */
@Injectable()
export class AuditEngine implements Engine {
  readonly name = 'audit';
  constructor(@Inject(AuditService) private audit: AuditService) {}

  execute(params: Record<string, any>) {
    return this.audit.log(params as any);
  }

  async verify(params: Record<string, any>) {
    const ok = await this.audit.verifyChain(params.entityType, params.entityId);
    return { ok: !!ok, errors: ok ? [] : ['감사 해시 체인이 유효하지 않습니다.'] };
  }
}

/** 알림 엔진 — 알림을 DB에 기록 */
@Injectable()
export class NotificationEngine implements Engine {
  readonly name = 'notification';
  constructor(private prisma: PrismaService) {}

  execute(params: Record<string, any>) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
      },
    } as any);
  }

  async verify(params: Record<string, any>) {
    const errors: string[] = [];
    if (!params.userId) errors.push('userId가 필요합니다.');
    if (!params.type) errors.push('type이 필요합니다.');
    if (!params.title) errors.push('title이 필요합니다.');
    return { ok: errors.length === 0, errors };
  }
}

/** Export 엔진 — 포맷별 ExportService 위임 */
@Injectable()
export class ExportEngine implements Engine {
  readonly name = 'export';
  private supported = ['pdf', 'docx', 'html'];
  constructor(@Inject(ExportService) private exporter: ExportService) {}

  async execute(params: Record<string, any>) {
    const method: Record<string, string> = {
      pdf: 'exportDocumentToPdf',
      docx: 'exportDocumentToDocx',
      html: 'exportDocumentToHtml',
    };
    const fn = method[params.format];
    if (!fn) throw new BadRequestException(`Unsupported export format: ${params.format}`);
    const result = await this.exporter[fn](params.entityId);
    return { format: params.format, bytes: Buffer.isBuffer(result) ? result.length : String(result).length };
  }

  async verify(params: Record<string, any>) {
    const ok = this.supported.includes(params.format);
    return { ok, errors: ok ? [] : [`Unsupported export format: ${params.format}`] };
  }
}
