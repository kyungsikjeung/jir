import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entityType: string, entityId: string, action: string, actorId?: string, before?: any, after?: any) {
    return this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        actorId,
        oldValue: before ? (typeof before === 'string' ? before : JSON.stringify(before)) : null,
        newValue: after ? (typeof after === 'string' ? after : JSON.stringify(after)) : null,
      },
    });
  }

  async findAll(filters?: { entityType?: string; entityId?: string; actorId?: string; action?: string }) {
    const where: any = {};
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.action) where.action = filters.action;
    return this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}
