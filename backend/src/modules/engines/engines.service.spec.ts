import { BadRequestException } from '@nestjs/common';
import {
  EngineRegistry,
  WorkflowEngine,
  AuditEngine,
  NotificationEngine,
  ExportEngine,
} from './engines.service';

const ITEM = {
  id: 'w1',
  key: 'DEMO-1',
  version: 2,
  workflowStateId: 's1',
  status: 'Open',
  title: '요구사항',
  customFields: {},
};

function workflowPrismaMock() {
  return {
    workItem: {
      findFirst: jest.fn().mockResolvedValue(ITEM),
      update: jest.fn().mockResolvedValue({ ...ITEM, status: 'Done', workflowStateId: 's2' }),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    workItemType: { findMany: jest.fn().mockResolvedValue([]) },
    workflowState: {
      findFirst: jest.fn().mockResolvedValue({ id: 's2', name: 'Done', workflowId: 'wf1', category: 'done' }),
      findUnique: jest.fn().mockResolvedValue({ id: 's1', name: 'Open', workflowId: 'wf1', category: 'open' }),
    },
    workflowTransition: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 't1', workflowId: 'wf1', fromStateId: 's1', toStateId: 's2',
          conditionType: null, conditionConfig: {}, postActions: [],
        },
      ]),
    },
    workflowTransitionHistory: { create: jest.fn().mockResolvedValue({ id: 'h1' }) },
  };
}

describe('EngineRegistry', () => {
  it('엔진을 등록하고 이름으로 조회한다', () => {
    const registry = new EngineRegistry();
    const engine = { name: 'demo', execute: jest.fn(), verify: jest.fn() } as any;
    registry.register(engine);
    expect(registry.get('demo')).toBe(engine);
    expect(registry.list()).toEqual(['demo']);
  });

  it('execute/verify를 해당 엔진에 위임한다', async () => {
    const registry = new EngineRegistry();
    const engine = {
      name: 'demo',
      execute: jest.fn().mockResolvedValue('ok'),
      verify: jest.fn().mockResolvedValue({ ok: true, errors: [] }),
    } as any;
    registry.register(engine);

    await expect(registry.execute('demo', { a: 1 })).resolves.toBe('ok');
    await expect(registry.verify('demo', { a: 1 })).resolves.toEqual({ ok: true, errors: [] });
    expect(engine.execute).toHaveBeenCalledWith({ a: 1 }, undefined);
  });

  it('등록되지 않은 엔진은 BadRequestException 을 던진다', () => {
    const registry = new EngineRegistry();
    expect(() => registry.get('nope')).toThrow(BadRequestException);
  });
});

describe('WorkflowEngine', () => {
  it('전이를 실행하고 이력을 기록한다', async () => {
    const prisma = workflowPrismaMock();
    const engine = new WorkflowEngine(prisma as any);

    const updated = await engine.execute({ issueKey: 'DEMO-1', transitionName: 'Done', userId: 'u1' });

    expect(updated.status).toBe('Done');
    expect(prisma.workflowTransitionHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ transitionId: 't1', fromStateId: 's1', toStateId: 's2' }),
      }),
    );
  });

  it('허용되지 않은 전이는 execute/verify 모두 거부한다', async () => {
    const prisma = workflowPrismaMock();
    prisma.workflowTransition.findMany.mockResolvedValue([]);
    const engine = new WorkflowEngine(prisma as any);

    await expect(
      engine.execute({ issueKey: 'DEMO-1', transitionName: 'Done', userId: 'u1' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      engine.verify({ issueKey: 'DEMO-1', transitionName: 'Done' }),
    ).resolves.toEqual({ ok: false, errors: expect.any(Array) });
  });
});

describe('AuditEngine', () => {
  it('감사 로그 기록과 체인 검증을 위임한다', async () => {
    const audit = {
      log: jest.fn().mockResolvedValue({ id: 'a1' }),
      verifyChain: jest.fn().mockResolvedValue(true),
    } as any;
    const engine = new AuditEngine(audit);

    await expect(engine.execute({ entityType: 'work_item', entityId: 'w1', action: 'update' })).resolves.toEqual({ id: 'a1' });
    await expect(engine.verify({ entityType: 'work_item', entityId: 'w1' })).resolves.toEqual({ ok: true, errors: [] });
    expect(audit.verifyChain).toHaveBeenCalledWith('work_item', 'w1');
  });
});

describe('NotificationEngine', () => {
  it('알림을 DB에 기록한다', async () => {
    const prisma = { notification: { create: jest.fn().mockResolvedValue({ id: 'n1' }) } };
    const engine = new NotificationEngine(prisma as any);

    await engine.execute({ userId: 'u1', type: 'review_request', title: '리뷰 요청' });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', type: 'review_request', title: '리뷰 요청' }),
      }),
    );
  });

  it('필수 파라미터가 없으면 verify가 실패한다', async () => {
    const engine = new NotificationEngine({} as any);
    await expect(engine.verify({ userId: 'u1' })).resolves.toEqual({ ok: false, errors: expect.any(Array) });
  });
});

describe('ExportEngine', () => {
  it('지원하지 않는 포맷은 거부한다', async () => {
    const engine = new ExportEngine({} as any);
    await expect(engine.verify({ format: 'pdf', entityId: 'p1' })).resolves.toEqual({ ok: true, errors: [] });
    await expect(engine.verify({ format: 'exe', entityId: 'p1' })).resolves.toEqual({ ok: false, errors: expect.any(Array) });
  });

  it('포맷에 맞는 export 서비스를 호출한다', async () => {
    const exporter = {
      exportDocumentToPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    } as any;
    const engine = new ExportEngine(exporter);
    const result = await engine.execute({ format: 'pdf', entityId: 'p1' });
    expect(exporter.exportDocumentToPdf).toHaveBeenCalledWith('p1');
    expect(result).toEqual(expect.objectContaining({ format: 'pdf', bytes: expect.any(Number) }));
  });
});
