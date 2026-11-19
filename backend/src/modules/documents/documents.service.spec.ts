import { DocumentsService } from './documents.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn() },
    workItem: { findUnique: jest.fn(), findMany: jest.fn() },
    workItemType: { findFirst: jest.fn() },
    page: { findMany: jest.fn(), findUnique: jest.fn() },
    comment: { findMany: jest.fn() },
    workItemVersion: { create: jest.fn(), findMany: jest.fn() },
  };
}

function createTraceabilityMock() {
  return { markSuspect: jest.fn().mockResolvedValue({ marked: 0 }) };
}

describe('DocumentsService.updatePage', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let traceability: ReturnType<typeof createTraceabilityMock>;
  let service: DocumentsService;
  let capturedTx: any;

  beforeEach(() => {
    prisma = createPrismaMock();
    traceability = createTraceabilityMock();
    service = new DocumentsService(prisma as any, traceability as any);
    prisma.workItem.findUnique.mockResolvedValue({
      id: 'p1',
      version: 2,
      title: '구문',
      body: null,
      bodyText: '기존 본문',
    });
    capturedTx = null;
    (prisma as any).$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        workItem: { update: jest.fn().mockResolvedValue({ id: 'p1', version: 3 }) },
        workItemVersion: { create: jest.fn().mockResolvedValue({ id: 'v2' }) },
      };
      capturedTx = tx;
      return fn(tx);
    });
  });

  it('updatePage()는 영향받는 추적 링크를 suspect로 표시한다', async () => {
    await service.updatePage('p1', { title: '새 문서 제목' }, 'u1');

    expect(traceability.markSuspect).toHaveBeenCalledWith('p1', '문서 변경 시');
  });

  it('updatePage()는 제목과 본문을 저장한다', async () => {
    await service.updatePage('p1', { title: '새 제목', bodyText: '새 본문' }, 'u1');

    expect(capturedTx.workItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ title: '새 제목', bodyText: '새 본문' }),
      }),
    );
    expect(capturedTx.workItemVersion.create).toHaveBeenCalled();
  });
});

describe('DocumentsService.getTree', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: DocumentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new DocumentsService(prisma as any, createTraceabilityMock() as any);
  });

  it('문서 트리를 부모 기준으로 반환한다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.workItemType.findFirst.mockResolvedValue({ id: 'type-page' });
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'p1', key: 'DOC-1', title: '루트', parentPageId: null, position: 0 },
      { id: 'p2', key: 'DOC-2', title: '자식', parentPageId: 'p1', position: 1 },
    ]);
    prisma.page.findMany.mockResolvedValue([
      { workItemId: 'p1', parentPageId: null },
      { workItemId: 'p2', parentPageId: 'p1' },
    ]);

    const tree = await service.getTree('DEMO');

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('p1');
    expect(tree[0].children.map((c: any) => c.id)).toEqual(['p2']);
  });
});

describe('DocumentsService.getPage', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: DocumentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new DocumentsService(prisma as any, createTraceabilityMock() as any);
  });

  it('문서 상세(meta, versions, comments)를 반환한다', async () => {
    prisma.workItem.findUnique.mockResolvedValue({ id: 'p1', title: '구문', version: 3 });
    prisma.page.findUnique.mockResolvedValue({ workItemId: 'p1', parentPageId: null });
    prisma.workItemVersion.findMany.mockResolvedValue([{ version: 3 }]);
    prisma.comment.findMany.mockResolvedValue([{ id: 'c1' }]);

    const page = await service.getPage('p1');

    expect(page.id).toBe('p1');
    expect(page.page).toEqual({ workItemId: 'p1', parentPageId: null });
    expect(page.versions).toHaveLength(1);
    expect(page.comments).toHaveLength(1);
  });
});
