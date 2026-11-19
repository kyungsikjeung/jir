import { AuditService } from './audit.service';

function createPrismaMock() {
  return {
    auditLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

function computeHash(data: any): string {
  const crypto = require('crypto');
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

describe('AuditService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AuditService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AuditService(prisma as any);
  });

  it('첫 로그 는 previousHash 가 null 이다', async () => {
    prisma.auditLog.findFirst.mockResolvedValue(null);
    prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await service.log({
      entityType: 'work_item',
      entityId: 'wi-1',
      action: 'create',
      actorId: 'u1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousHash: null,
        }),
      }),
    );
  });

  it('두 번째 로그 는 이전 chainHash 를 previousHash 로 갖는다', async () => {
    prisma.auditLog.findFirst.mockResolvedValue({ chainHash: 'prev-hash' });
    prisma.auditLog.create.mockResolvedValue({ id: 'log-2' });

    await service.log({
      entityType: 'work_item',
      entityId: 'wi-1',
      action: 'update',
      actorId: 'u1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousHash: 'prev-hash',
        }),
      }),
    );
  });

  it('로그 생성 시 chainHash 가 계산되어 저장된다', async () => {
    prisma.auditLog.findFirst.mockResolvedValue(null);
    prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await service.log({
      entityType: 'work_item',
      entityId: 'wi-1',
      action: 'create',
      actorId: 'u1',
      oldValue: null,
      newValue: { title: 'Hello' },
    });

    const createCall = prisma.auditLog.create.mock.calls[0][0];
    const expectedHash = computeHash({
      previousHash: null,
      entityType: 'work_item',
      entityId: 'wi-1',
      action: 'create',
      actorId: 'u1',
      oldValue: null,
      newValue: { title: 'Hello' },
    });
    expect(createCall.data.chainHash).toBe(expectedHash);
  });

  it('verifyChain 은 유효한 체인 에 대해 true 를 반환한다', async () => {
    const hash1 = computeHash({
      previousHash: null,
      entityType: 'wi',
      entityId: '1',
      action: 'create',
      actorId: 'u1',
      oldValue: null,
      newValue: null,
    });
    const hash2 = computeHash({
      previousHash: hash1,
      entityType: 'wi',
      entityId: '1',
      action: 'update',
      actorId: 'u1',
      oldValue: null,
      newValue: null,
    });

    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: '1', entityType: 'wi', entityId: '1', action: 'create', actorId: 'u1',
        oldValue: null, newValue: null, previousHash: null, chainHash: hash1, createdAt: new Date(),
      },
      {
        id: '2', entityType: 'wi', entityId: '1', action: 'update', actorId: 'u1',
        oldValue: null, newValue: null, previousHash: hash1, chainHash: hash2, createdAt: new Date(),
      },
    ]);

    expect(await service.verifyChain('wi', '1')).toBe(true);
  });

  it('verifyChain 은 해시가 위조되면 false 를 반환한다', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: '1', entityType: 'wi', entityId: '1', action: 'create', actorId: 'u1',
        oldValue: null, newValue: null, previousHash: null, chainHash: 'tampered-hash', createdAt: new Date(),
      },
    ]);

    expect(await service.verifyChain('wi', '1')).toBe(false);
  });

  it('verifyChain 은 빈 체인 에 대해 true 를 반환한다', async () => {
    prisma.auditLog.findMany.mockResolvedValue([]);
    expect(await service.verifyChain('wi', '1')).toBe(true);
  });
});

describe('AuditService.findAll', () => {
  it('필터(entityType/entityId/actorId/action)로 감사 로그를 조회한다', async () => {
    const prisma = createPrismaMock();
    const service = new AuditService(prisma as any);
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'a1' }]);

    const logs = await service.findAll({
      entityType: 'space',
      entityId: 's1',
      actorId: 'u1',
      action: 'create',
    });

    expect(logs).toHaveLength(1);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { entityType: 'space', entityId: 's1', actorId: 'u1', action: 'create' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });
});
