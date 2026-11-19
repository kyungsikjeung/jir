import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  isEvidence?: boolean;
  evidenceTag?: string;
}

/**
 * 감사 로그 서비스.
 * 모든 변경 이벤트를 불변 해시 체인으로 기록하여 위조 시도를 탐지할 수 있다.
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * 감사 이벤트를 기록한다. 이전 로그의 chainHash 를 previousHash 로 참조해
   * 해시 체인을 연결한다.
   */
  async log(input: AuditLogInput) {
    const previous = await this.prisma.auditLog.findFirst({
      where: { entityType: input.entityType, entityId: input.entityId },
      orderBy: { createdAt: 'desc' },
      select: { chainHash: true },
    });

    const previousHash = previous?.chainHash ?? null;
    const chainHash = this.computeHash({
      previousHash,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId,
      oldValue: input.oldValue,
      newValue: input.newValue,
    });

    const oldValueStr =
      input.oldValue != null
        ? typeof input.oldValue === 'string'
          ? input.oldValue
          : JSON.stringify(input.oldValue)
        : null;
    const newValueStr =
      input.newValue != null
        ? typeof input.newValue === 'string'
          ? input.newValue
          : JSON.stringify(input.newValue)
        : null;

    return this.prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorId: input.actorId,
        fieldName: input.fieldName ?? null,
        oldValue: oldValueStr,
        newValue: newValueStr,
        diff:
          input.oldValue != null && input.newValue != null
            ? this.computeDiff(input.oldValue, input.newValue)
            : null,
        previousHash,
        chainHash,
        actorIp: input.ipAddress ?? null,
        actorUserAgent: input.userAgent ?? null,
        isEvidence: input.isEvidence ?? false,
        evidenceTag: input.evidenceTag ?? null,
      },
    });
  }

  /**
   * 주어진 엔티티의 감사 로그 해시 체인을 검증한다.
   * 위조되거나 순서가 바뀌면 false 를 반환한다.
   */
  async verifyChain(entityType?: string, entityId?: string): Promise<boolean> {
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        actorId: true,
        oldValue: true,
        newValue: true,
        previousHash: true,
        chainHash: true,
        createdAt: true,
      },
    });

    let expectedPrevious: string | null = null;
    for (const log of logs) {
      const expectedHash = this.computeHash({
        previousHash: expectedPrevious,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        actorId: log.actorId,
        oldValue: log.oldValue,
        newValue: log.newValue,
      });
      if (expectedHash !== log.chainHash) return false;
      if (log.previousHash !== expectedPrevious) return false;
      expectedPrevious = log.chainHash;
    }
    return true;
  }

  async findAll(filters?: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
  }) {
    const where: any = {};
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.action) where.action = filters.action;
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private computeHash(data: {
    previousHash: string | null;
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string;
    oldValue?: any;
    newValue?: any;
  }): string {
    const payload = JSON.stringify({
      previousHash: data.previousHash,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actorId: data.actorId,
      oldValue: data.oldValue,
      newValue: data.newValue,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private computeDiff(oldValue: any, newValue: any): any {
    const oldObj =
      typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue;
    const newObj =
      typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
    const diff: Record<string, { from: any; to: any }> = {};
    const keys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {}),
    ]);
    for (const key of keys) {
      if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key])) {
        diff[key] = { from: oldObj?.[key], to: newObj?.[key] };
      }
    }
    return diff;
  }
}
