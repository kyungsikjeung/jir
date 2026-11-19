import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn() },
    baseline: { findUnique: jest.fn(), update: jest.fn() },
    baselineItem: { findMany: jest.fn() },
    workItem: { findMany: jest.fn() },
  };
}

describe('ComplianceService.lockBaseline', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ComplianceService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ComplianceService(prisma as any);
  });

  it('기준선을 잠근다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.baseline.findUnique.mockResolvedValue({
      id: 'b1',
      spaceId: 'space-1',
      name: 'REL-1',
      isLocked: false,
    });
    prisma.baseline.update.mockResolvedValue({
      id: 'b1',
      name: 'REL-1',
      isLocked: true,
      lockReason: '기준선 고정',
    });

    const locked = await service.lockBaseline('DEMO', 'b1', {
      reason: '기준선 고정',
      userId: 'u1',
    });

    expect(locked.isLocked).toBe(true);
    expect(prisma.baseline.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: expect.objectContaining({
        isLocked: true,
        lockedById: 'u1',
        lockReason: '기준선 고정',
      }),
    });
  });

  it('이미 잠긴 기준선은 재잠금 거부', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.baseline.findUnique.mockResolvedValue({
      id: 'b1',
      spaceId: 'space-1',
      name: 'REL-1',
      isLocked: true,
    });

    await expect(
      service.lockBaseline('DEMO', 'b1', { userId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('다른 스페이스 기준선은 NotFoundException', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.baseline.findUnique.mockResolvedValue({ id: 'b9', spaceId: 'space-2', isLocked: false });

    await expect(
      service.lockBaseline('DEMO', 'b9', { userId: 'u1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ComplianceService.getBaselineDiff', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ComplianceService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ComplianceService(prisma as any);
  });

  it('버전 변화 항목을 반환한다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.baseline.findUnique.mockResolvedValue({ id: 'b1', spaceId: 'space-1', isLocked: false });
    prisma.baselineItem.findMany.mockResolvedValue([
      { baselineId: 'b1', itemType: 'work_item', itemId: 'w1', itemVersion: 3 },
    ]);
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'w1', version: 5 },
      { id: 'w2', version: 1 },
    ]);

    const diff = await service.getBaselineDiff('DEMO', 'b1');

    expect(diff.changedSinceBaseline).toEqual([
      { itemType: 'work_item', itemId: 'w1', baselineVersion: 3, currentVersion: 5 },
    ]);
    expect(diff.addedSinceBaseline).toEqual([
      { itemType: 'work_item', itemId: 'w2', currentVersion: 1 },
    ]);
    expect(diff.hasChanges).toBe(true);
  });
});

describe('ComplianceService.assertBaselineUnlocked', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ComplianceService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ComplianceService(prisma as any);
  });

  it('잠긴 기준선은 BaselineItem 변경이 거부된다', async () => {
    prisma.baseline.findUnique.mockResolvedValue({ id: 'b1', isLocked: true, name: 'REL-1' });

    await expect(service.assertBaselineUnlocked('b1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('잠긴 기준선이 아니면 통과한다', async () => {
    prisma.baseline.findUnique.mockResolvedValue({ id: 'b1', isLocked: false, name: 'REL-1' });

    await expect(service.assertBaselineUnlocked('b1')).resolves.toBeUndefined();
  });
});
