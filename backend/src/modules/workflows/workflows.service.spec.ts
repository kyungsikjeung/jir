import { NotFoundException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn() },
    review: { findUnique: jest.fn(), update: jest.fn() },
    reviewFinding: { findMany: jest.fn() },
    reviewParticipant: { findMany: jest.fn() },
    workItem: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    approval: { findMany: jest.fn(), create: jest.fn() },
    user: { findMany: jest.fn() },
  };
}

describe('WorkflowsService.getReview', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WorkflowsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WorkflowsService(prisma as any);
  });

  it('리뷰 상세 + findings + participants를 반환한다', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 'r1', title: 'REV', status: 'pending' });
    prisma.reviewFinding.findMany.mockResolvedValue([
      { id: 'f1', reviewId: 'r1', title: 'Finding 1', severity: 'major' },
    ]);
    prisma.reviewParticipant.findMany.mockResolvedValue([
      { userId: 'u1', role: 'reviewer', status: 'pending' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', displayName: 'Rev', email: 'rev@alm.local' },
    ]);

    const review = await service.getReview('r1');

    expect(review.title).toBe('REV');
    expect(review.findings).toHaveLength(1);
    expect(review.findings[0].title).toBe('Finding 1');
    expect(review.participants[0].user).toEqual(
      expect.objectContaining({ id: 'u1', displayName: 'Rev' }),
    );
  });

  it('없는 리뷰는 NotFoundException 을 던진다', async () => {
    prisma.review.findUnique.mockResolvedValue(null);

    await expect(service.getReview('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WorkflowsService.updateReview', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WorkflowsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WorkflowsService(prisma as any);
  });

  it('terminal 상태로 변경하면 completedAt을 설정한다', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'pending',
      completedAt: null,
    });
    prisma.review.update.mockImplementation((args: any) => args.data);

    const data = await service.updateReview('r1', { status: 'done' });

    expect(data.status).toBe('done');
    expect(data.completedAt).toBeInstanceOf(Date);
  });

  it('비 terminal 상태 변경은 completedAt을 유지한다', async () => {
    const completedAt = new Date();
    prisma.review.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'done',
      completedAt,
    });
    prisma.review.update.mockImplementation((args: any) => args.data);

    const data = await service.updateReview('r1', { status: 'pending' });

    expect(data.status).toBe('pending');
    expect(data.completedAt).toBe(completedAt);
  });
});

describe('WorkflowsService.createApproval', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WorkflowsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WorkflowsService(prisma as any);
  });

  it("decision='approved'면 작업 항목 status를 'Approved'로 반영한다", async () => {
    prisma.approval.create.mockResolvedValue({ id: 'ap1', decision: 'approved' });
    prisma.workItem.findUnique.mockResolvedValue({ id: 'w1', spaceId: 'space-1' });
    prisma.workItem.update.mockResolvedValue({ id: 'w1', status: 'Approved' });

    const created = await service.createApproval(
      { entityType: 'work_item', entityId: 'w1', decision: 'approved' },
      'u1',
    );

    expect(created.id).toBe('ap1');
    expect(prisma.approval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'work_item',
          entityId: 'w1',
          approverId: 'u1',
          decision: 'approved',
        }),
      }),
    );
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: { status: 'Approved' },
    });
  });

  it("decision='rejected'면 상태 변경 없이 저장한다", async () => {
    prisma.approval.create.mockResolvedValue({ id: 'ap1', decision: 'rejected' });

    await service.createApproval(
      { entityType: 'work_item', entityId: 'w1', decision: 'rejected' },
      'u1',
    );

    expect(prisma.workItem.update).not.toHaveBeenCalled();
  });
});

describe('WorkflowsService.getApprovals', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WorkflowsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WorkflowsService(prisma as any);
  });

  it('승인 목록을 조회한다 (approver/item 정보 부착)', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.workItem.findMany.mockResolvedValueOnce([{ id: 'w1' }]);
    prisma.workItem.findMany.mockResolvedValueOnce([{ id: 'w1', key: 'DEMO-1', title: '작업 1' }]);
    prisma.approval.findMany.mockResolvedValue([
      {
        id: 'ap1',
        entityType: 'work_item',
        entityId: 'w1',
        approverId: 'u1',
        decision: 'approved',
        decidedAt: new Date(),
      },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', displayName: 'Approver' }]);

    const approvals = await service.getApprovals('DEMO');

    expect(approvals).toHaveLength(1);
    expect(approvals[0].item).toEqual({ key: 'DEMO-1', title: '작업 1' });
    expect(approvals[0].approver.displayName).toBe('Approver');
  });

  it('없는 스페이스는 NotFoundException 을 던진다', async () => {
    prisma.space.findUnique.mockResolvedValue(null);

    await expect(service.getApprovals('NOPE')).rejects.toBeInstanceOf(NotFoundException);
  });
});
