import { NotFoundException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

function createPrismaMock() {
  return {
    review: { findUnique: jest.fn(), update: jest.fn() },
    reviewFinding: { findMany: jest.fn() },
    reviewParticipant: { findMany: jest.fn() },
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
