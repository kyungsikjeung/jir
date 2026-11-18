import { NotFoundException } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn() },
    workItem: { findMany: jest.fn() },
    workItemType: { findFirst: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };
}

describe('WorkItemsService.getWbs', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WorkItemsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WorkItemsService(prisma as any);
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1', key: 'DEMO' });
    prisma.workItemType.findFirst.mockResolvedValue({ id: 'type-page', name: 'page' });
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'dev@alm.local', displayName: '개발자' },
    ]);
    prisma.workItemType.findMany.mockResolvedValue([
      { id: 'type-req', name: 'requirement', color: '#2563eb', icon: null },
      { id: 'type-task', name: 'task', color: '#059669', icon: null },
    ]);
  });

  it('parentId 기준 트리를 만들고 키 번호 순으로 정렬한다', async () => {
    // 일부러 순서를 뒤섞어 반환: 정렬은 서비스가 담당
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'w10', key: 'DEMO-10', title: '열 번째', parentId: null, typeId: 'type-task', assigneeId: null, estimatedHours: null, progressPercent: 0 },
      { id: 'w2', key: 'DEMO-2', title: '두 번째', parentId: 'w1', typeId: 'type-req', assigneeId: 'u1', estimatedHours: 4, progressPercent: 50 },
      { id: 'w1', key: 'DEMO-1', title: '첫 번째', parentId: null, typeId: 'type-req', assigneeId: 'u1', estimatedHours: 8, progressPercent: 100 },
      { id: 'w9', key: 'DEMO-9', title: '아홉 번째', parentId: null, typeId: 'type-task', assigneeId: null, estimatedHours: null, progressPercent: 0 },
    ]);

    const wbs = await service.getWbs('DEMO');

    expect(wbs.roots.map((r: any) => r.key)).toEqual(['DEMO-1', 'DEMO-9', 'DEMO-10']);
    expect(wbs.roots[0].children.map((c: any) => c.key)).toEqual(['DEMO-2']);
    expect(wbs.total).toBe(4);
    expect(wbs.assigned).toBe(2);
    expect(wbs.estimatedHours).toBe(12);
    expect(wbs.averageProgress).toBe(37.5);
    // 페이지 타입 제외 필터
    expect(prisma.workItem.findMany).toHaveBeenCalledWith({
      where: { spaceId: 'space-1', typeId: { not: 'type-page' } },
    });
    // 부모에 담당자/유형 정보가 붙는다
    expect(wbs.roots[0].assignee).toEqual({
      id: 'u1',
      email: 'dev@alm.local',
      displayName: '개발자',
    });
    expect(wbs.roots[0].type.name).toBe('requirement');
  });

  it('부모가 목록에 없으면 루트로 승격한다', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'w5', key: 'DEMO-5', title: '고아 작업', parentId: 'deleted-parent', typeId: 'type-task', assigneeId: null, estimatedHours: null, progressPercent: 0 },
    ]);

    const wbs = await service.getWbs('DEMO');

    expect(wbs.roots).toHaveLength(1);
    expect(wbs.roots[0].key).toBe('DEMO-5');
  });

  it('페이지 타입이 없으면 타입 필터 없이 조회한다', async () => {
    prisma.workItemType.findFirst.mockResolvedValue(null);
    prisma.workItem.findMany.mockResolvedValue([]);

    const wbs = await service.getWbs('DEMO');

    expect(prisma.workItem.findMany).toHaveBeenCalledWith({
      where: { spaceId: 'space-1' },
    });
    expect(wbs).toMatchObject({
      roots: [],
      total: 0,
      assigned: 0,
      estimatedHours: 0,
      averageProgress: 0,
    });
  });

  it('스페이스가 없으면 NotFoundException 을 던진다', async () => {
    prisma.space.findUnique.mockResolvedValue(null);

    await expect(service.getWbs('NOPE')).rejects.toBeInstanceOf(NotFoundException);
  });
});
