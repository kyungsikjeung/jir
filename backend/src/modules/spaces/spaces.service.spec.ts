import { ConflictException } from '@nestjs/common';
import { SpacesService } from './spaces.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn(), create: jest.fn() },
    spaceSettings: { create: jest.fn() },
    spaceProcessArea: { createMany: jest.fn() },
    user: { findMany: jest.fn() },
    role: { findFirst: jest.fn() },
    spaceMember: { createMany: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb({
      space: { create: jest.fn() },
      spaceSettings: { create: jest.fn() },
      spaceProcessArea: { createMany: jest.fn() },
    })),
  };
}

describe('SpacesService.create', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let templateService: any;
  let audit: any;
  let service: SpacesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    templateService = { instantiate: jest.fn() };
    audit = { log: jest.fn() };
    service = new SpacesService(prisma as any, templateService, audit);
  });

  it('스페이스를 생성한다', async () => {
    prisma.space.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        space: { create: jest.fn().mockResolvedValue({ id: 's1', key: 'DEMO', name: 'Demo' }) },
        spaceSettings: { create: jest.fn() },
        spaceProcessArea: { createMany: jest.fn() },
      };
      return cb(tx);
    });

    const result = await service.create({
      name: 'Demo',
      key: 'DEMO',
      orgId: 'org1',
      createdById: 'u1',
    });

    expect(result.key).toBe('DEMO');
    expect(prisma.space.findUnique).toHaveBeenCalledWith({ where: { key: 'DEMO' } });
  });

  it('중복 키는 ConflictException 을 던진다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 's1', key: 'DEMO' });

    await expect(service.create({
      name: 'Demo',
      key: 'DEMO',
      orgId: 'org1',
      createdById: 'u1',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('템플릿 버전으로 생성 시 프로세스 워크스페이스 ID 를 반환한다', async () => {
    prisma.space.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        space: { create: jest.fn().mockResolvedValue({ id: 's1', key: 'DEMO', name: 'Demo' }) },
        spaceSettings: { create: jest.fn() },
        spaceProcessArea: { createMany: jest.fn() },
      };
      return cb(tx);
    });
    templateService.instantiate.mockResolvedValue({
      workspaces: [{ id: 'ws1' }, { id: 'ws2' }],
    });

    const result = await service.create({
      name: 'Demo',
      key: 'DEMO',
      orgId: 'org1',
      createdById: 'u1',
      templateVersionId: 'tv1',
    });

    expect(result.processWorkspaceIds).toEqual(['ws1', 'ws2']);
    expect(templateService.instantiate).toHaveBeenCalledWith('s1', 'tv1', 'u1');
  });

  it('멤버 이메일로 사용자를 초대해 뷰어 역할을 할당한다', async () => {
    prisma.space.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        space: { create: jest.fn().mockResolvedValue({ id: 's1', key: 'DEMO', name: 'Demo' }) },
        spaceSettings: { create: jest.fn() },
        spaceProcessArea: { createMany: jest.fn() },
      };
      return cb(tx);
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'u2' }]);
    prisma.role.findFirst.mockResolvedValue({ id: 'r-viewer' });

    await service.create({
      name: 'Demo',
      key: 'DEMO',
      orgId: 'org1',
      createdById: 'u1',
      memberEmails: ['external@alm.local'],
    });

    expect(prisma.spaceMember.createMany).toHaveBeenCalledWith({
      data: [{ spaceId: 's1', userId: 'u2', roleId: 'r-viewer', addedById: 'u1' }],
      skipDuplicates: true,
    });
  });

  it('감사 로그를 작성한다', async () => {
    prisma.space.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        space: { create: jest.fn().mockResolvedValue({ id: 's1', key: 'DEMO', name: 'Demo' }) },
        spaceSettings: { create: jest.fn() },
        spaceProcessArea: { createMany: jest.fn() },
      };
      return cb(tx);
    });

    await service.create({
      name: 'Demo',
      key: 'DEMO',
      orgId: 'org1',
      createdById: 'u1',
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'space',
        entityId: 's1',
        action: 'create',
        actorId: 'u1',
        isEvidence: true,
      }),
    );
  });
});
