import { NotFoundException } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';

function createPrismaMock() {
  return {
    space: { findUnique: jest.fn() },
    workItem: { findUnique: jest.fn(), findMany: jest.fn() },
    traceLink: { findMany: jest.fn(), updateMany: jest.fn() },
    suspectLink: { findMany: jest.fn(), create: jest.fn() },
  };
}

describe('TraceabilityService.getLinks', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: TraceabilityService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TraceabilityService(prisma as any);
  });

  it('스페이스 소속 항목의 링크를 파트너 정보(key/title)로 반환한다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.workItem.findUnique.mockResolvedValue({ id: 'item-1', spaceId: 'space-1' });
    prisma.traceLink.findMany.mockResolvedValue([
      { id: 'l1', fromId: 'item-1', toId: 'item-2', linkType: 'verifies' },
      { id: 'l2', fromId: 'item-3', toId: 'item-1', linkType: 'satisfies' },
    ]);
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'item-2', key: 'DOC-2', title: '문서 2' },
      { id: 'item-3', key: 'REQ-3', title: '요구사항 3' },
    ]);

    const links = await service.getLinks('DEMO', 'item-1');

    expect(links).toHaveLength(2);
    const outgoing = links.find((l: any) => l.id === 'l1');
    const incoming = links.find((l: any) => l.id === 'l2');
    expect(outgoing.direction).toBe('out');
    expect(outgoing.partnerKey).toBe('DOC-2');
    expect(outgoing.partnerTitle).toBe('문서 2');
    expect(incoming.direction).toBe('in');
    expect(incoming.partnerKey).toBe('REQ-3');
    expect(incoming.partnerTitle).toBe('요구사항 3');
  });

  it('스페이스에 소속되지 않은 항목은 NotFoundException 을 던진다', async () => {
    prisma.space.findUnique.mockResolvedValue({ id: 'space-1' });
    prisma.workItem.findUnique.mockResolvedValue({ id: 'item-9', spaceId: 'space-2' });

    await expect(service.getLinks('DEMO', 'item-9')).rejects.toBeInstanceOf(NotFoundException);
  });
});
