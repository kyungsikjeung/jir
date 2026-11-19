import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SignaturesService } from './signatures.service';

function createPrismaMock() {
  return {
    electronicSignature: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };
}

describe('SignaturesService.sign', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SignaturesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SignaturesService(prisma as any);
  });

  it('신규 서명을 생성한다', async () => {
    prisma.electronicSignature.findFirst.mockResolvedValue(null);
    prisma.electronicSignature.create.mockResolvedValue({ id: 's1', entityType: 'work_item' });

    const sig = await service.sign({
      entityType: 'work_item',
      entityId: 'w1',
      signerId: 'u1',
      signatureData: '서명 데이터',
    });

    expect(sig.id).toBe('s1');
    expect(prisma.electronicSignature.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'work_item',
          entityId: 'w1',
          signerId: 'u1',
          signatureType: 'typed',
          signatureData: '서명 데이터',
        }),
      }),
    );
  });

  it('이미 서명된 entity+signer는 기존 서명을 반환한다', async () => {
    prisma.electronicSignature.findFirst.mockResolvedValue({ id: 's1', revokedAt: null });

    const sig = await service.sign({ entityType: 'work_item', entityId: 'w1', signerId: 'u1' });

    expect(sig.id).toBe('s1');
    expect(prisma.electronicSignature.create).not.toHaveBeenCalled();
  });

  it('취소된 서명은 재서명하지 않는다', async () => {
    prisma.electronicSignature.findFirst.mockResolvedValue({ id: 's1', revokedAt: new Date() });

    await expect(
      service.sign({ entityType: 'work_item', entityId: 'w1', signerId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SignaturesService.findByEntity', () => {
  it('서명 목록을 signedAt 최신순으로 반환한다 (signer 정보 부착)', async () => {
    const prisma = createPrismaMock();
    const service = new SignaturesService(prisma as any);
    prisma.electronicSignature.findMany.mockResolvedValue([{ id: 's1', signerId: 'u1' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', displayName: '서명자' }]);

    const sigs = await service.findByEntity('work_item', 'w1');

    expect(sigs).toHaveLength(1);
    expect(sigs[0].signer).toEqual(expect.objectContaining({ id: 'u1', displayName: '서명자' }));
    expect(prisma.electronicSignature.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityType: 'work_item', entityId: 'w1' },
        orderBy: { signedAt: 'desc' },
      }),
    );
  });
});

describe('SignaturesService.revoke', () => {
  it('서명을 취소한다', async () => {
    const prisma = createPrismaMock();
    const service = new SignaturesService(prisma as any);
    prisma.electronicSignature.findUnique.mockResolvedValue({ id: 's1', revokedAt: null });
    prisma.electronicSignature.update.mockResolvedValue({ id: 's1', revokedAt: new Date() });

    const sig = await service.revoke('s1', 'u2');

    expect(sig.revokedAt).toBeDefined();
    expect(prisma.electronicSignature.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revokedById: 'u2' }) }),
    );
  });

  it('없는 서명은 NotFoundException 을 던진다', async () => {
    const prisma = createPrismaMock();
    const service = new SignaturesService(prisma as any);
    prisma.electronicSignature.findUnique.mockResolvedValue(null);

    await expect(service.revoke('nope', 'u2')).rejects.toBeInstanceOf(NotFoundException);
  });
});
