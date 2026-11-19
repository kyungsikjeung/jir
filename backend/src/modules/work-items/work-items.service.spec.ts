import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn() },
    workflow: { findFirst: jest.fn() },
    workflowState: { findFirst: jest.fn(), findUnique: jest.fn() },
    workflowTransition: { findMany: jest.fn() },
    workflowTransitionHistory: { create: jest.fn() },
    workItem: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    workItemVersion: { create: jest.fn() },
    workItemType: { findFirst: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };
}

function createFieldDefinitionMock() {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

function createTraceabilityMock() {
  return { markSuspect: jest.fn().mockResolvedValue({ marked: 0 }) };
}

describe('WorkItemsService.getWbs', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WorkItemsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    const fieldDefinitionService = createFieldDefinitionMock();
    const traceabilityService = createTraceabilityMock();
    service = new WorkItemsService(prisma as any, fieldDefinitionService as any, traceabilityService as any);
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

describe('WorkItemsService.create', () => {
  it('필수 customFields 검증 후 생성한다', async () => {
    const prisma = createPrismaMock();
    const fieldDefinitionService = createFieldDefinitionMock();
    fieldDefinitionService.findAll.mockResolvedValue([
      { key: 'signoff', isRequired: true, fieldType: 'text' },
    ]);
    const traceabilityService = createTraceabilityMock();
    const service = new WorkItemsService(prisma as any, fieldDefinitionService as any, traceabilityService as any);
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1', key: 'DEMO' });
    prisma.workItemType.findFirst.mockResolvedValue({ id: 'type-req', name: 'requirement' });
    prisma.workflow.findFirst.mockResolvedValue(null);
    prisma.workItem.findMany.mockResolvedValue([]);
    prisma.workItem.create.mockResolvedValue({ id: 'w9', key: 'DEMO-1' });

    await expect(
      service.create('DEMO', { title: 'x', typeId: 'type-req', customFields: {} }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    const created = await service.create(
      'DEMO',
      { title: 'x', typeId: 'type-req', customFields: { signoff: 'yes' } },
      'u1',
    );
    expect(created.key).toBe('DEMO-1');
    expect(prisma.workItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customFields: { signoff: 'yes' } }),
      }),
    );
  });
});

describe('WorkItemsService.update', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let traceability: ReturnType<typeof createTraceabilityMock>;
  let service: WorkItemsService;
  let capturedTx: any;

  const item = {
    id: 'w1',
    key: 'DEMO-1',
    spaceId: 'space-1',
    typeId: 'type-req',
    version: 2,
    title: '첫 번째',
    customFields: {},
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    const fieldDefinitionService = createFieldDefinitionMock();
    traceability = createTraceabilityMock();
    service = new WorkItemsService(prisma as any, fieldDefinitionService as any, traceability as any);
    prisma.workItem.findFirst.mockResolvedValue(item);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'dev@alm.local', displayName: '개발자' }]);
    prisma.workItemType.findMany.mockResolvedValue([{ id: 'type-req', name: 'requirement' }]);
    capturedTx = null;
    (prisma as any).$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        workItem: { update: jest.fn().mockResolvedValue({ ...item, title: '새 제목' }) },
        workItemVersion: { create: jest.fn().mockResolvedValue({ id: 'v2' }) },
      };
      capturedTx = tx;
      return fn(tx);
    });
  });

  it('update()는 영향받는 추적 링크를 suspect로 표시한다', async () => {
    await service.update('DEMO-1', { title: '새 제목' });
    expect(traceability.markSuspect).toHaveBeenCalledWith('w1', '작업 항목 변경 시');
  });

  it('customFields를 함께 저장한다', async () => {
    await service.update('DEMO-1', { title: '새 제목', customFields: { signoff: 'yes' } });
    expect(capturedTx.workItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customFields: { signoff: 'yes' } }) }),
    );
  });

  it('필수 customFields가 누락되면 BadRequestException 을 던진다', async () => {
    const fieldDefinitionService = createFieldDefinitionMock();
    fieldDefinitionService.findAll.mockResolvedValue([
      { key: 'signoff', isRequired: true, fieldType: 'text' },
    ]);
    service = new WorkItemsService(prisma as any, fieldDefinitionService as any, traceability as any);

    await expect(service.update('DEMO-1', { title: '새 제목', customFields: {} })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('number 필드에 숫자가 아닌 값이 오면 BadRequestException 을 던진다', async () => {
    const fieldDefinitionService = createFieldDefinitionMock();
    fieldDefinitionService.findAll.mockResolvedValue([
      { key: 'effort', isRequired: false, fieldType: 'number' },
    ]);
    service = new WorkItemsService(prisma as any, fieldDefinitionService as any, traceability as any);

    await expect(service.update('DEMO-1', { customFields: { effort: 'abc' } })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('WorkItemsService.transition', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WorkItemsService;
  const item = {
    id: 'w1',
    key: 'DEMO-1',
    spaceId: 'space-1',
    typeId: 'type-req',
    workflowStateId: 's1',
    status: 'Open',
    title: '첫 번째',
    customFields: {},
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    const fieldDefinitionService = createFieldDefinitionMock();
    const traceabilityService = createTraceabilityMock();
    service = new WorkItemsService(prisma as any, fieldDefinitionService as any, traceabilityService as any);
    prisma.workItem.findFirst.mockResolvedValue(item);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'dev@alm.local', displayName: '개발자' }]);
    prisma.workItemType.findMany.mockResolvedValue([{ id: 'type-req', name: 'requirement' }]);
    prisma.workItem.update.mockResolvedValue({ ...item, status: 'Done', workflowStateId: 's2' });
    prisma.workflowState.findFirst.mockResolvedValue({
      id: 's2',
      name: 'Done',
      workflowId: 'wf1',
      category: 'done',
    });
    prisma.workflowState.findUnique.mockResolvedValue({
      id: 's1',
      name: 'Open',
      workflowId: 'wf1',
      category: 'open',
    });
    prisma.workflowTransition.findMany.mockResolvedValue([
      {
        id: 't1',
        workflowId: 'wf1',
        fromStateId: 's1',
        toStateId: 's2',
        conditionType: null,
        conditionConfig: {},
        postActions: [],
        isGlobal: false,
      },
    ]);
    prisma.workflowTransitionHistory.create.mockResolvedValue({ id: 'h1' });
  });

  it('존재하는 전이로 전환하고 이력에 transitionId/fromStateId를 기록한다', async () => {
    const updated = await service.transition('DEMO-1', 'Done', 'u1');

    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: expect.objectContaining({ workflowStateId: 's2', status: 'Done' }),
    });
    expect(prisma.workflowTransitionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workItemId: 'w1',
        transitionId: 't1',
        fromStateId: 's1',
        toStateId: 's2',
        performedById: 'u1',
      }),
    });
    expect(updated.status).toBe('Done');
  });

  it('전이가 없으면 BadRequestException 을 던진다', async () => {
    prisma.workflowTransition.findMany.mockResolvedValue([]);

    await expect(service.transition('DEMO-1', 'Done', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guard condition이 통과하지 않으면 BadRequestException 을 던진다', async () => {
    prisma.workflowTransition.findMany.mockResolvedValue([
      {
        id: 't1',
        workflowId: 'wf1',
        fromStateId: 's1',
        toStateId: 's2',
        conditionType: 'required_fields',
        conditionConfig: { fields: ['signoff'] },
        postActions: [],
        isGlobal: false,
      },
    ]);

    await expect(service.transition('DEMO-1', 'Done', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.workItem.update).not.toHaveBeenCalled();
  });
});
