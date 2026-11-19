import { NotFoundException } from '@nestjs/common';
import { TemplateService } from './template.service';

function createPrismaMock() {
  return {
    templatePackage: { findMany: jest.fn() },
    templateVersion: { findFirst: jest.fn(), findUnique: jest.fn() },
    processWorkspace: { create: jest.fn() },
  };
}

describe('TemplateService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: TemplateService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TemplateService(prisma as any);
  });

  describe('listPackages', () => {
    it('조직의 게시된 템플릿 패키지 목록을 반환한다', async () => {
      prisma.templatePackage.findMany.mockResolvedValue([
        { id: 'tp1', orgId: 'org1', name: 'ASPICE Default', isSystem: true, isPublished: true },
      ]);

      const result = await service.listPackages('org1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ASPICE Default');
      expect(prisma.templatePackage.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org1', isPublished: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getVersion', () => {
    it('템플릿 버전을 조회한다', async () => {
      prisma.templateVersion.findFirst.mockResolvedValue({
        id: 'tv1',
        packageId: 'tp1',
        version: 1,
        processes: [{ code: 'SYS.2', name: '요구사항 분석' }],
      });

      const result = await service.getVersion('tp1', 1);

      expect(result.version).toBe(1);
      expect(prisma.templateVersion.findFirst).toHaveBeenCalledWith({
        where: { packageId: 'tp1', version: 1 },
      });
    });

    it('존재하지 않는 버전은 NotFoundException 을 던진다', async () => {
      prisma.templateVersion.findFirst.mockResolvedValue(null);

      await expect(service.getVersion('tp1', 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('instantiate', () => {
    it('템플릿을 인스턴스화해 프로세스 워크스페이스를 생성한다', async () => {
      prisma.templateVersion.findUnique.mockResolvedValue({
        id: 'tv1',
        packageId: 'tp1',
        version: 1,
        processes: [
          { code: 'SYS.2', name: '요구사항 분석', isApplicable: true },
          { code: 'SWE.1', name: '소프트웨어 요구사항', isApplicable: true },
        ],
      });
      prisma.processWorkspace.create.mockResolvedValue({ id: 'ws1' });

      const result = await service.instantiate('s1', 'tv1', 'u1');

      expect(result.spaceId).toBe('s1');
      expect(result.workspaces).toHaveLength(2);
      expect(prisma.processWorkspace.create).toHaveBeenCalledTimes(2);
      expect(prisma.processWorkspace.create).toHaveBeenCalledWith({
        data: {
          spaceId: 's1',
          processCode: 'SYS.2',
          name: '요구사항 분석',
          description: null,
          isApplicable: true,
        },
      });
    });

    it('존재하지 않는 템플릿 버전은 NotFoundException 을 던진다', async () => {
      prisma.templateVersion.findUnique.mockResolvedValue(null);

      await expect(service.instantiate('s1', 'tv-none', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
