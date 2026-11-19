import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async getWorkflows(spaceKey: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    return this.prisma.workflow.findMany({ where: { spaceId: space.id },  });
  }

  async createWorkflow(spaceKey: string, data: any, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    return this.prisma.workflow.create({
      data: { spaceId: space.id, name: data.name, description: data.description, aspiceProcess: data.aspiceProcess, isDefault: data.isDefault || false, createdById: userId },
    });
  }

  async createState(workflowId: string, data: any) {
    return this.prisma.workflowState.create({
      data: { workflowId, name: data.name, description: data.description, category: data.category, color: data.color, position: data.position, isInitial: data.isInitial, isTerminal: data.isTerminal },
    });
  }

  async createTransition(workflowId: string, data: any) {
    return this.prisma.workflowTransition.create({
      data: { workflowId, name: data.name, fromStateId: data.fromStateId, toStateId: data.toStateId, conditionType: data.conditionType, conditionConfig: data.conditionConfig || {}, postActions: data.postActions || [], isGlobal: data.isGlobal, position: data.position },
    });
  }

  async getReviews(spaceKey: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    return this.prisma.review.findMany({ where: { spaceId: space.id },  });
  }

  async getReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(`Review not found: ${reviewId}`);

    const [findings, participants] = await Promise.all([
      this.prisma.reviewFinding.findMany({
        where: { reviewId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.reviewParticipant.findMany({ where: { reviewId } }),
    ]);
    const userIds = Array.from(new Set(participants.map((p) => p.userId)));
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, displayName: true, email: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    return {
      ...review,
      findings,
      participants: participants.map((p) => ({
        userId: p.userId,
        role: p.role,
        status: p.status,
        user: userById.get(p.userId) ?? null,
      })),
    };
  }

  /** 리뷰 상태 변경 (terminal 상태이면 completedAt 자동 설정) */
  async updateReview(
    reviewId: string,
    data: { status?: string; completedAt?: Date | null },
  ) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(`Review not found: ${reviewId}`);

    const status = data.status ?? review.status;
    const completedAt =
      data.completedAt !== undefined
        ? data.completedAt
        : ['done', 'completed', 'closed', 'rejected'].includes(status) && !review.completedAt
          ? new Date()
          : review.completedAt;

    return this.prisma.review.update({ where: { id: reviewId }, data: { status, completedAt } });
  }

  async createReview(spaceKey: string, data: any, userId: string) {
    const space = await this.prisma.space.findUnique({ where: { key: spaceKey } });
    if (!space) throw new NotFoundException(`Space not found: ${spaceKey}`);
    return this.prisma.review.create({
      data: { spaceId: space.id, title: data.title, description: data.description, reviewType: data.reviewType, targetType: data.targetType, targetId: data.targetId, status: 'pending', moderatorId: data.moderatorId, aspiceProcess: data.aspiceProcess, dueDate: data.dueDate, createdById: userId },
    });
  }

  async createFinding(reviewId: string, data: any, userId: string) {
    return this.prisma.reviewFinding.create({
      data: { reviewId, title: data.title, description: data.description, severity: data.severity || 'minor', status: 'open', location: data.location, createdById: userId },
    });
  }

  async createApproval(data: any, userId: string) {
    return this.prisma.approval.create({
      data: { entityType: data.entityType, entityId: data.entityId, approverId: userId, decision: data.decision, comment: data.comment, signature: data.signature, signatureMethod: data.signatureMethod },
    });
  }
}
