import { PolicyService } from './policy.service';

function createPrismaMock() {
  return {
    spaceMember: { findMany: jest.fn() },
    userRole: { findMany: jest.fn() },
    role: { findMany: jest.fn() },
    rolePermission: { findMany: jest.fn() },
    permission: { findMany: jest.fn() },
    processWorkspace: { findFirst: jest.fn() },
    processAssignment: { findMany: jest.fn() },
    processAccessGrant: { findMany: jest.fn() },
  };
}

describe('PolicyService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: PolicyService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PolicyService(prisma as any);
  });

  describe('can', () => {
    it('스페이스 멤버가 해당 권한을 가지면 true', async () => {
      prisma.spaceMember.findMany.mockResolvedValue([
        { userId: 'u1', spaceId: 's1', roleId: 'r1' },
      ]);
      prisma.userRole.findMany.mockResolvedValue([]);
      prisma.rolePermission.findMany.mockResolvedValue([
        { roleId: 'r1', permissionId: 'p1' },
      ]);
      prisma.permission.findMany.mockResolvedValue([
        { id: 'p1', code: 'space:manage' },
      ]);

      const result = await service.can('u1', 's1', 'space:manage');

      expect(result).toBe(true);
      expect(prisma.spaceMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', spaceId: 's1' },
          select: { roleId: true },
        }),
      );
    });

    it('스페이스 멤버가 해당 권한을 가지지 않으면 false', async () => {
      prisma.spaceMember.findMany.mockResolvedValue([
        { userId: 'u1', spaceId: 's1', roleId: 'r1' },
      ]);
      prisma.userRole.findMany.mockResolvedValue([]);
      prisma.rolePermission.findMany.mockResolvedValue([
        { roleId: 'r1', permissionId: 'p1' },
      ]);
      prisma.permission.findMany.mockResolvedValue([]);

      const result = await service.can('u1', 's1', 'space:manage');

      expect(result).toBe(false);
    });

    it('멤버가 없으면 false', async () => {
      prisma.spaceMember.findMany.mockResolvedValue([]);
      prisma.userRole.findMany.mockResolvedValue([]);

      const result = await service.can('u1', 's1', 'space:manage');

      expect(result).toBe(false);
    });

    it('전역 역할(spaceId undefined) 권한도 확인한다', async () => {
      prisma.userRole.findMany.mockResolvedValue([
        { userId: 'u1', roleId: 'r1', spaceId: null },
      ]);
      prisma.rolePermission.findMany.mockResolvedValue([
        { roleId: 'r1', permissionId: 'p1' },
      ]);
      prisma.permission.findMany.mockResolvedValue([
        { id: 'p1', code: 'org:admin' },
      ]);

      const result = await service.can('u1', undefined, 'org:admin');

      expect(result).toBe(true);
    });
  });

  describe('canProcess', () => {
    it('프로세스 할당 사용자가 해당 프로세스 권한을 가지면 true', async () => {
      prisma.processWorkspace.findFirst.mockResolvedValue({
        id: 'ws1',
        spaceId: 's1',
        processCode: 'SYS.2',
      });
      prisma.processAssignment.findMany.mockResolvedValue([
        { workspaceId: 'ws1', userId: 'u1', roleId: 'r1', isPrimary: true },
      ]);
      prisma.rolePermission.findMany.mockResolvedValue([
        { roleId: 'r1', permissionId: 'p1' },
      ]);
      prisma.permission.findMany.mockResolvedValue([
        { id: 'p1', code: 'process:edit' },
      ]);

      const result = await service.canProcess('u1', 's1', 'SYS.2', 'process:edit');

      expect(result).toBe(true);
    });

    it('프로세스 접근 권한(ProcessAccessGrant)이 있으면 true', async () => {
      prisma.processWorkspace.findFirst.mockResolvedValue({
        id: 'ws1',
        spaceId: 's1',
        processCode: 'SYS.2',
      });
      prisma.processAssignment.findMany.mockResolvedValue([]);
      prisma.processAccessGrant.findMany.mockResolvedValue([
        { workspaceId: 'ws1', userId: 'u1', permission: 'view' },
      ]);

      const result = await service.canProcess('u1', 's1', 'SYS.2', 'process:view');

      expect(result).toBe(true);
    });

    it('프로세스 워크스페이스가 없으면 false', async () => {
      prisma.processWorkspace.findFirst.mockResolvedValue(null);

      const result = await service.canProcess('u1', 's1', 'NOPE', 'process:view');

      expect(result).toBe(false);
    });
  });
});
