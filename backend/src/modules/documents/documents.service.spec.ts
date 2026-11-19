import { DocumentsService } from './documents.service';

function createPrismaMock() {
  return {
    workItem: { findUnique: jest.fn() },
    workItemVersion: { create: jest.fn() },
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
