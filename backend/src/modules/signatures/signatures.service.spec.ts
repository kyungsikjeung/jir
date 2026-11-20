import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
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
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    workItem: { findUnique: jest.fn() },
  };
}

const WORK_ITEM = {
  id: 'w1',
  version: 3,
  title: '요구사항 제목',
  description: '설명',
  status: 'Approved',
  customFields: { hazard: 'QM' },
  updatedAt: new Date('2026-11-20T00:00:00.000Z'),
};

describe('SignaturesService.sign (HMAC + 재인증)', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SignaturesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SignaturesService(prisma as any);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: bcrypt.hashSync('pass1234', 10),
    });
    prisma.workItem.findUnique.mockResolvedValue(WORK_ITEM);
    prisma.electronicSignature.findFirst.mockResolvedValue(null);
    prisma.electronicSignature.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 's1', ...data }),
    );
  });

  it('올바른 비밀번호로 서명하면 HMAC/콘텐츠해시/버전이 저장된다', async () => {
    const sig = await service.sign({
      entityType: 'work_item',
      entityId: 'w1',
      signerId: 'u1',
      password: 'pass1234',
      signatureData: '홍길동',
    });

    expect(sig.id).toBe('s1');
    const data = prisma.electronicSignature.create.mock.calls[0][0].data;
    expect(data.signatureHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.signedVersionId).toBe('3');
    expect(data.signatureData).toBe('홍길동');
    expect(data.verificationStatus).toBe('valid');
  });

  it('잘못된 비밀번호는 서명을 거부한다', async () => {
    await expect(
      service.sign({
        entityType: 'work_item',
        entityId: 'w1',
        signerId: 'u1',
        password: 'wrong',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.electronicSignature.create).not.toHaveBeenCalled();
  });

  it('존재하지 않는 서명자는 거부한다', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.sign({
        entityType: 'work_item',
        entityId: 'w1',
        signerId: 'ghost',
        password: 'pass1234',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('서명 대상 작업 항목이 없으면 거부한다', async () => {
    prisma.workItem.findUnique.mockResolvedValue(null);
    await expect(
      service.sign({
        entityType: 'work_item',
        entityId: 'nope',
        signerId: 'u1',
        password: 'pass1234',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('취소된 서명은 재서명하지 않는다', async () => {
    prisma.electronicSignature.findFirst.mockResolvedValue({
      id: 's1',
      revokedAt: new Date(),
    });
    await expect(
      service.sign({
        entityType: 'work_item',
        entityId: 'w1',
        signerId: 'u1',
        password: 'pass1234',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SignaturesService.verify', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SignaturesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SignaturesService(prisma as any);
    prisma.workItem.findUnique.mockResolvedValue(WORK_ITEM);
  });

  it('변조되지 않은 서명은 ok=true 를 반환한다', async () => {
    const signedAt = new Date('2026-11-20T01:00:00.000Z');
    const contentHash = service.computeContentHash(WORK_ITEM);
    const signatureHash = service.computeSignatureHash({
      entityType: 'work_item',
      entityId: 'w1',
      signedVersionId: 3,
      contentHash,
      signerId: 'u1',
      signedAt,
    });
    prisma.electronicSignature.findMany.mockResolvedValue([
      {
        id: 's1',
        entityType: 'work_item',
        entityId: 'w1',
        signerId: 'u1',
        signedVersionId: 3,
        contentHash,
        signatureHash,
        signedAt,
        revokedAt: null,
      },
    ]);

    const result = await service.verify('work_item', 'w1');

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('내용이 변경된 서명은 무효로 판정한다', async () => {
    const signedAt = new Date('2026-11-20T01:00:00.000Z');
    const signatureHash = service.computeSignatureHash({
      entityType: 'work_item',
      entityId: 'w1',
      signedVersionId: 3,
      contentHash: '예전-콘텐츠-해시',
      signerId: 'u1',
      signedAt,
    });
    prisma.electronicSignature.findMany.mockResolvedValue([
      {
        id: 's1',
        entityType: 'work_item',
        entityId: 'w1',
        signerId: 'u1',
        signedVersionId: 3,
        contentHash: '예전-콘텐츠-해시',
        signatureHash,
        signedAt,
        revokedAt: null,
      },
    ]);

    const result = await service.verify('work_item', 'w1');

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('변경');
  });

  it('취소된 서명은 무효로 판정한다', async () => {
    prisma.electronicSignature.findMany.mockResolvedValue([
      {
        id: 's1',
        entityType: 'work_item',
        entityId: 'w1',
        signerId: 'u1',
        signedVersionId: 3,
        contentHash: 'x',
        signatureHash: 'x',
        signedAt: new Date(),
        revokedAt: new Date(),
      },
    ]);

    const result = await service.verify('work_item', 'w1');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('취소');
  });
});

describe('SignaturesService.findByEntity / revoke', () => {
  it('서명 목록을 signedAt 최신순으로 반환한다 (signer 정보 부착)', async () => {
    const prisma = createPrismaMock();
    const service = new SignaturesService(prisma as any);
    prisma.electronicSignature.findMany.mockResolvedValue([{ id: 's1', signerId: 'u1' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', displayName: '서명자' }]);

    const sigs = await service.findByEntity('work_item', 'w1');

    expect(sigs).toHaveLength(1);
    expect(sigs[0].signer).toEqual(expect.objectContaining({ id: 'u1', displayName: '서명자' }));
  });

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
