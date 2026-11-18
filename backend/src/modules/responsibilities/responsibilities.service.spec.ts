import { NotFoundException } from '@nestjs/common';
import { ResponsibilitiesService } from './responsibilities.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn() },
    spaceProcessArea: { findMany: jest.fn() },
    processArea: { findMany: jest.fn() },
    spaceMember: { findMany: jest.fn() },
    roleResponsibility: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    role: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };
}

describe('ResponsibilitiesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ResponsibilitiesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ResponsibilitiesService(prisma as any);
  });

  it('프로세스·역할·책임 셀을 매트릭스로 묶어 반환한다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1', key: 'DEMO' });
    prisma.spaceProcessArea.findMany.mockResolvedValue([
      { processCode: 'SWE.1', isApplicable: true },
      { processCode: 'MAN.3', isApplicable: true },
    ]);
    prisma.processArea.findMany.mockResolvedValue([
      { code: 'SWE.1', name: 'Software Requirements Analysis', category: 'SWE' },
      { code: 'MAN.3', name: 'Project Management', category: 'MAN' },
    ]);
    prisma.spaceMember.findMany.mockResolvedValue([
      { userId: 'u1', roleId: 'r-admin' },
      { userId: 'u2', roleId: 'r-dev' },
    ]);
    prisma.role.findMany.mockResolvedValue([
      { id: 'r-admin', name: 'project_admin', description: '프로젝트 관리자' },
      { id: 'r-dev', name: 'developer', description: '개발자' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', displayName: '관리자', email: 'admin@alm.local' },
      { id: 'u2', displayName: '개발자', email: 'dev@alm.local' },
    ]);
    prisma.roleResponsibility.findMany.mockResolvedValue([
      {
        id: 'cell-1',
        roleId: 'r-dev',
        aspiceProcess: 'SWE.1',
        responsibility: 'owner',
        isPrimary: true,
      },
    ]);

    const matrix = await service.getMatrix('DEMO');

    expect(matrix.processes.map((p) => p.code)).toEqual(['MAN.3', 'SWE.1']);
    expect(matrix.processes[1].name).toBe('Software Requirements Analysis');
    expect(matrix.roles).toHaveLength(2);
    const devRole = matrix.roles.find((r) => r.id === 'r-dev');
    expect(devRole?.members).toEqual([
      { id: 'u2', displayName: '개발자', email: 'dev@alm.local' },
    ]);
    expect(matrix.cells).toHaveLength(1);
    expect(prisma.roleResponsibility.findMany).toHaveBeenCalledWith({
      where: { spaceId: 'space-1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('스페이스가 없으면 NotFoundException 을 던진다', async () => {
    prisma.space.findUnique.mockResolvedValue(null);
    await expect(service.getMatrix('NOPE')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('책임 지정은 역할·프로세스 기준 upsert 로 저장한다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1', key: 'DEMO' });
    prisma.roleResponsibility.upsert.mockResolvedValue({ id: 'cell-1' });

    await service.setResponsibility('DEMO', {
      roleId: 'r-dev',
      aspiceProcess: 'SWE.1',
      responsibility: 'owner',
      isPrimary: true,
    });

    expect(prisma.roleResponsibility.upsert).toHaveBeenCalledWith({
      where: {
        roleId_spaceId_aspiceProcess: {
          roleId: 'r-dev',
          spaceId: 'space-1',
          aspiceProcess: 'SWE.1',
        },
      },
      update: { responsibility: 'owner', isPrimary: true },
      create: {
        roleId: 'r-dev',
        spaceId: 'space-1',
        aspiceProcess: 'SWE.1',
        responsibility: 'owner',
        isPrimary: true,
      },
    });
  });

  it('책임 수준이 비어 있으면 viewer 로 저장한다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1', key: 'DEMO' });
    prisma.roleResponsibility.upsert.mockResolvedValue({ id: 'cell-1' });

    await service.setResponsibility('DEMO', {
      roleId: 'r-dev',
      aspiceProcess: 'SWE.2',
      responsibility: '',
    });

    expect(prisma.roleResponsibility.upsert.mock.calls[0][0].create.responsibility).toBe('viewer');
  });

  it('삭제는 스페이스 범위로 제한한다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1', key: 'DEMO' });
    prisma.roleResponsibility.deleteMany.mockResolvedValue({ count: 1 });

    await service.remove('DEMO', 'cell-1');

    expect(prisma.roleResponsibility.deleteMany).toHaveBeenCalledWith({
      where: { id: 'cell-1', spaceId: 'space-1' },
    });
  });
});
