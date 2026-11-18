import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * MCP (Model Context Protocol) 서버 서비스
 * - JSON-RPC 2.0 메서드 처리
 * - ALM 도구(tools) 정의 및 실제 Prisma 쿼리 실행
 */
@Injectable()
export class McpService {
  constructor(private prisma: PrismaService) {}

  // ── JSON-RPC 디스패치 ─────────────────────────────────────
  async handleMethod(method: string, params: any, user: any) {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'alm-mcp-server', version: '1.0.0' },
        };
      case 'notifications/initialized':
        return {};
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: this.getToolDefinitions() };
      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments || {};
        if (!name) throw new BadRequestException('tools/call: name is required');
        return this.executeTool(name, args, user);
      }
      case 'resources/list':
        return { resources: [] };
      case 'prompts/list':
        return { prompts: [] };
      default:
        throw new BadRequestException(`Unknown method: ${method}`);
    }
  }

  // ── 도구 정의 ─────────────────────────────────────────────
  getToolDefinitions() {
    return [
      this.tool('alm_search_issues', '이슈/작업 항목을 검색합니다 (JQL 유사 필터 지원)',
        { query: { type: 'string', description: '제목/본문 검색어' }, spaceKey: { type: 'string', description: '스페이스 키 (예: DEMO)' }, status: { type: 'string' }, assigneeId: { type: 'string' }, limit: { type: 'number', description: '최대 결과 수 (기본 20)' } }),
      this.tool('alm_get_issue', '이슈 상세 정보를 조회합니다',
        { key: { type: 'string', description: '이슈 키 (예: DEMO-1)' } }, ['key']),
      this.tool('alm_create_issue', '이슈를 생성합니다',
        { spaceKey: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, type: { type: 'string', description: 'work item type name (기본 task)' }, priority: { type: 'string' }, assigneeId: { type: 'string' }, aspiceProcess: { type: 'string' }, parentId: { type: 'string' } }, ['spaceKey', 'title']),
      this.tool('alm_update_issue', '이슈를 수정합니다',
        { key: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string' }, priority: { type: 'string' }, assigneeId: { type: 'string' }, aspiceProcess: { type: 'string' } }, ['key']),
      this.tool('alm_transition_issue', '이슈 상태를 변경합니다',
        { key: { type: 'string' }, status: { type: 'string' }, comment: { type: 'string' } }, ['key', 'status']),
      this.tool('alm_add_comment', '이슈/페이지에 댓글을 추가합니다',
        { key: { type: 'string', description: '이슈 키 또는 페이지 ID' }, body: { type: 'string' }, targetType: { type: 'string', description: 'work_item | page (기본 work_item)' } }, ['key', 'body']),
      this.tool('alm_link_issues', '두 이슈를 연결합니다',
        { fromKey: { type: 'string' }, toKey: { type: 'string' }, linkType: { type: 'string', description: 'blocks | relates | verifies | implements | derives (기본 relates)' } }, ['fromKey', 'toKey']),
      this.tool('alm_search_pages', '문서(페이지)를 검색합니다',
        { spaceKey: { type: 'string' }, query: { type: 'string' }, limit: { type: 'number' } }, ['spaceKey']),
      this.tool('alm_get_page', '문서(페이지) 상세를 조회합니다',
        { pageId: { type: 'string' }, key: { type: 'string' } }),
      this.tool('alm_create_page', '문서(페이지)를 생성합니다',
        { spaceKey: { type: 'string' }, title: { type: 'string' }, bodyText: { type: 'string' }, parentPageId: { type: 'string' } }, ['spaceKey', 'title']),
      this.tool('alm_update_page', '문서(페이지)를 수정합니다',
        { pageId: { type: 'string' }, title: { type: 'string' }, bodyText: { type: 'string' }, changeSummary: { type: 'string' } }, ['pageId']),
      this.tool('alm_get_traceability', '추적성 매트릭스(요구사항/테스트/링크)를 조회합니다',
        { spaceKey: { type: 'string' } }, ['spaceKey']),
      this.tool('alm_get_coverage', '요구사항 커버리지를 조회합니다',
        { spaceKey: { type: 'string' } }, ['spaceKey']),
      this.tool('alm_get_compliance_status', 'ASPICE 프로세스별 컴플라이언스 상태를 조회합니다',
        { spaceKey: { type: 'string' } }, ['spaceKey']),
      this.tool('alm_create_baseline', '베이스라인을 생성합니다',
        { spaceKey: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, baselineType: { type: 'string', description: 'release | milestone | audit (기본 release)' }, version: { type: 'string' } }, ['spaceKey', 'name']),
      this.tool('alm_get_project_summary', '프로젝트 요약(이슈/커버리지/컴플라이언스/리스크)을 조회합니다',
        { spaceKey: { type: 'string' } }, ['spaceKey']),
      this.tool('alm_list_spaces', '접근 가능한 스페이스 목록을 조회합니다', {}),
    ];
  }

  private tool(name: string, description: string, properties: Record<string, any>, required: string[] = []) {
    return { name, description, inputSchema: { type: 'object', properties, required } };
  }

  // ── 도구 실행 ─────────────────────────────────────────────
  private async executeTool(name: string, args: any, user: any): Promise<McpToolResult> {
    try {
      const data = await this.dispatch(name, args, user);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }

  private async dispatch(name: string, args: any, user: any) {
    switch (name) {
      case 'alm_search_issues': return this.searchIssues(args);
      case 'alm_get_issue': return this.getIssue(args.key);
      case 'alm_create_issue': return this.createIssue(args, user);
      case 'alm_update_issue': return this.updateIssue(args);
      case 'alm_transition_issue': return this.transitionIssue(args, user);
      case 'alm_add_comment': return this.addComment(args, user);
      case 'alm_link_issues': return this.linkIssues(args, user);
      case 'alm_search_pages': return this.searchPages(args);
      case 'alm_get_page': return this.getPage(args);
      case 'alm_create_page': return this.createPage(args, user);
      case 'alm_update_page': return this.updatePage(args, user);
      case 'alm_get_traceability': return this.getTraceability(args.spaceKey);
      case 'alm_get_coverage': return this.getCoverage(args.spaceKey);
      case 'alm_get_compliance_status': return this.getCompliance(args.spaceKey);
      case 'alm_create_baseline': return this.createBaseline(args, user);
      case 'alm_get_project_summary': return this.getProjectSummary(args.spaceKey);
      case 'alm_list_spaces': return this.prisma.space.findMany({ orderBy: { createdAt: 'desc' } });
      default:
        throw new BadRequestException(`Unknown tool: ${name}`);
    }
  }

  // ── helpers ───────────────────────────────────────────────
  private async space(key: string) {
    if (!key) throw new BadRequestException('spaceKey is required');
    const space = await this.prisma.space.findUnique({ where: { key } });
    if (!space) throw new NotFoundException(`Space not found: ${key}`);
    return space;
  }

  private async workItemByKey(key: string) {
    if (!key) throw new BadRequestException('key is required');
    const item = await this.prisma.workItem.findFirst({ where: { key } });
    if (!item) throw new NotFoundException(`Work item not found: ${key}`);
    return item;
  }

  private async nextKey(spaceId: string, spaceKey: string) {
    const count = await this.prisma.workItem.count({ where: { spaceId } });
    return `${spaceKey}-${count + 1}`;
  }

  private extractText(body: any): string {
    if (!body) return '';
    if (typeof body === 'string') return body;
    const extract = (node: any): string => {
      if (!node) return '';
      if (node.text) return node.text;
      if (Array.isArray(node.content)) return node.content.map(extract).join(' ');
      return '';
    };
    return extract(body);
  }

  private async typeId(spaceId: string, typeName = 'task') {
    const type = await this.prisma.workItemType.findFirst({ where: { spaceId, name: typeName } });
    if (!type) throw new NotFoundException(`Work item type not found: ${typeName}`);
    return type.id;
  }

  // ── issue tools ───────────────────────────────────────────
  private async searchIssues(args: any) {
    const where: any = {};
    if (args.spaceKey) where.spaceId = (await this.space(args.spaceKey)).id;
    if (args.status) where.status = args.status;
    if (args.assigneeId) where.assigneeId = args.assigneeId;
    if (args.query) {
      where.OR = [
        { title: { contains: args.query, mode: 'insensitive' } },
        { bodyText: { contains: args.query, mode: 'insensitive' } },
      ];
    }
    return this.prisma.workItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Number(args.limit) || 20, 100),
    });
  }

  private async getIssue(key: string) {
    const item = await this.workItemByKey(key);
    const [comments, links, requirement, testCase, page] = await Promise.all([
      this.prisma.comment.findMany({ where: { targetType: 'work_item', targetId: item.id }, orderBy: { createdAt: 'asc' } }),
      this.prisma.workItemLink.findMany({ where: { OR: [{ fromId: item.id }, { toId: item.id }] } }),
      this.prisma.requirement.findUnique({ where: { workItemId: item.id } }),
      this.prisma.testCase.findUnique({ where: { workItemId: item.id } }),
      this.prisma.page.findUnique({ where: { workItemId: item.id } }),
    ]);
    return { ...item, comments, links, requirement, testCase, page };
  }

  private async createIssue(args: any, user: any) {
    const space = await this.space(args.spaceKey);
    const item = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: await this.typeId(space.id, args.type || 'task'),
        key: await this.nextKey(space.id, space.key),
        title: args.title,
        description: args.description,
        priority: args.priority || 'medium',
        status: 'open',
        assigneeId: args.assigneeId,
        reporterId: user?.id,
        parentId: args.parentId,
        aspiceProcess: args.aspiceProcess,
        bodyText: args.description,
        labels: [],
      },
    });
    return item;
  }

  private async updateIssue(args: any) {
    const item = await this.workItemByKey(args.key);
    const data: any = {};
    for (const f of ['title', 'description', 'status', 'priority', 'assigneeId', 'aspiceProcess', 'dueDate']) {
      if (args[f] !== undefined) data[f] = args[f];
    }
    if (args.description !== undefined) data.bodyText = args.description;
    return this.prisma.workItem.update({ where: { id: item.id }, data });
  }

  private async transitionIssue(args: any, user: any) {
    const item = await this.workItemByKey(args.key);
    await this.prisma.workflowTransitionHistory.create({
      data: { workItemId: item.id, toStateId: args.status, performedById: user?.id, comment: args.comment },
    });
    return this.prisma.workItem.update({
      where: { id: item.id },
      data: { status: args.status, resolvedAt: ['done', 'released', 'closed'].includes(args.status) ? new Date() : null },
    });
  }

  private async addComment(args: any, user: any) {
    let targetType = args.targetType || 'work_item';
    let targetId: string;
    if (targetType === 'work_item') {
      targetId = (await this.workItemByKey(args.key)).id;
    } else {
      const page = await this.prisma.page.findUnique({ where: { workItemId: args.key } });
      targetId = page ? page.workItemId : args.key;
      targetType = 'page';
    }
    return this.prisma.comment.create({
      data: { targetType, targetId, authorId: user?.id || 'system', body: args.body, bodyHtml: args.body },
    });
  }

  private async linkIssues(args: any, user: any) {
    const from = await this.workItemByKey(args.fromKey);
    const to = await this.workItemByKey(args.toKey);
    const linkType = args.linkType || 'relates';
    const reverseMap: Record<string, string> = {
      blocks: 'blocked_by', blocked_by: 'blocks', relates: 'relates',
      verifies: 'verified_by', verified_by: 'verifies',
      implements: 'implemented_by', implemented_by: 'implements',
      derives: 'derived_from', derived_from: 'derives',
    };
    const link = await this.prisma.workItemLink.create({
      data: { fromId: from.id, toId: to.id, linkType, createdById: user?.id },
    });
    const reverse = reverseMap[linkType];
    if (reverse) {
      await this.prisma.workItemLink.create({
        data: { fromId: to.id, toId: from.id, linkType: reverse, createdById: user?.id },
      }).catch(() => undefined);
    }
    return link;
  }

  // ── page tools ────────────────────────────────────────────
  private async searchPages(args: any) {
    const space = await this.space(args.spaceKey);
    const where: any = { spaceId: space.id, typeId: await this.typeId(space.id, 'page') };
    if (args.query) where.OR = [
      { title: { contains: args.query, mode: 'insensitive' } },
      { bodyText: { contains: args.query, mode: 'insensitive' } },
    ];
    const items = await this.prisma.workItem.findMany({
      where, orderBy: { updatedAt: 'desc' }, take: Math.min(Number(args.limit) || 20, 100),
    });
    return items.map((p) => ({ id: p.id, key: p.key, title: p.title, updatedAt: p.updatedAt }));
  }

  private async getPage(args: any) {
    let workItemId = args.pageId;
    if (!workItemId && args.key) workItemId = (await this.workItemByKey(args.key)).id;
    if (!workItemId) throw new BadRequestException('pageId or key is required');
    const item = await this.prisma.workItem.findUnique({ where: { id: workItemId } });
    if (!item) throw new NotFoundException(`Page not found: ${workItemId}`);
    const page = await this.prisma.page.findUnique({ where: { workItemId } });
    const versions = await this.prisma.workItemVersion.findMany({
      where: { workItemId }, orderBy: { version: 'desc' }, take: 10,
    });
    return { ...item, page, versions };
  }

  private async createPage(args: any, user: any) {
    const space = await this.space(args.spaceKey);
    const item = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: await this.typeId(space.id, 'page'),
        key: await this.nextKey(space.id, space.key),
        title: args.title,
        status: 'open',
        priority: 'medium',
        reporterId: user?.id,
        bodyText: args.bodyText,
        labels: [],
      },
    });
    await this.prisma.page.create({
      data: { workItemId: item.id, parentPageId: args.parentPageId, position: 0 },
    });
    await this.prisma.workItemVersion.create({
      data: { workItemId: item.id, version: 1, title: item.title, bodyText: args.bodyText, changedById: user?.id },
    });
    return this.getPage({ pageId: item.id });
  }

  private async updatePage(args: any, user: any) {
    const item = await this.prisma.workItem.findUnique({ where: { id: args.pageId } });
    if (!item) throw new NotFoundException(`Page not found: ${args.pageId}`);
    const newVersion = item.version + 1;
    const updated = await this.prisma.workItem.update({
      where: { id: item.id },
      data: {
        title: args.title ?? item.title,
        bodyText: args.bodyText ?? item.bodyText,
        version: newVersion,
      },
    });
    await this.prisma.workItemVersion.create({
      data: {
        workItemId: item.id,
        version: newVersion,
        title: updated.title,
        bodyText: updated.bodyText,
        changedById: user?.id,
        changeSummary: args.changeSummary,
      },
    });
    return this.getPage({ pageId: item.id });
  }

  // ── traceability / compliance ─────────────────────────────
  private async getTraceability(spaceKey: string) {
    const space = await this.space(spaceKey);
    const [reqTypeId, testTypeId] = await Promise.all([
      this.typeId(space.id, 'requirement').catch(() => undefined),
      this.typeId(space.id, 'test_case').catch(() => undefined),
    ]);
    const [requirements, tests, allItems] = await Promise.all([
      reqTypeId ? this.prisma.workItem.findMany({ where: { spaceId: space.id, typeId: reqTypeId } }) : Promise.resolve([]),
      testTypeId ? this.prisma.workItem.findMany({ where: { spaceId: space.id, typeId: testTypeId } }) : Promise.resolve([]),
      this.prisma.workItem.findMany({ where: { spaceId: space.id }, select: { id: true } }),
    ]);
    const ids = new Set(allItems.map((i) => i.id));
    const links = (await this.prisma.traceLink.findMany()).filter((l) => ids.has(l.fromId) || ids.has(l.toId));
    return { requirements, tests, links, count: links.length };
  }

  private async getCoverage(spaceKey: string) {
    const space = await this.space(spaceKey);
    const reqTypeId = await this.typeId(space.id, 'requirement').catch(() => undefined);
    const requirements = await this.prisma.workItem.findMany({
      where: { spaceId: space.id, ...(reqTypeId ? { typeId: reqTypeId } : {}) },
    });
    const reqIds = requirements.map((r) => r.id);
    const links = await this.prisma.traceLink.findMany({
      where: { fromType: 'requirement', toType: 'test_case', fromId: { in: reqIds } },
    });
    const coveredIds = new Set(links.map((l) => l.fromId));
    const covered = requirements.filter((r) => coveredIds.has(r.id));
    return {
      total: requirements.length,
      covered: covered.length,
      percent: requirements.length ? +((covered.length / requirements.length) * 100).toFixed(2) : 0,
      uncovered: requirements.filter((r) => !coveredIds.has(r.id)).map((r) => r.key),
    };
  }

  private async getCompliance(spaceKey: string) {
    const space = await this.space(spaceKey);
    const processes = await this.prisma.spaceProcessArea.findMany({ where: { spaceId: space.id, isApplicable: true } });
    const checklists = await this.prisma.complianceChecklist.findMany({ where: { spaceId: space.id } });
    const deliverables = await this.prisma.projectDeliverable.findMany({ where: { spaceId: space.id } });
    return processes
      .map((p) => {
        const items = checklists.filter((c) => c.processCode === p.processCode);
        const done = items.filter((c) => c.status === 'completed').length;
        return {
          processCode: p.processCode,
          totalItems: items.length,
          completedItems: done,
          completionPercent: items.length ? +((done / items.length) * 100).toFixed(1) : 0,
        };
      })
      .sort((a, b) => a.processCode.localeCompare(b.processCode));
  }

  private async createBaseline(args: any, user: any) {
    const space = await this.space(args.spaceKey);
    const baseline = await this.prisma.baseline.create({
      data: {
        spaceId: space.id,
        name: args.name,
        description: args.description,
        baselineType: args.baselineType || 'release',
        version: args.version || new Date().toISOString().slice(0, 10),
        status: 'draft',
        createdById: user?.id,
      },
    });
    const items = await this.prisma.workItem.findMany({ where: { spaceId: space.id } });
    await this.prisma.baselineItem.createMany({
      data: items.map((i) => ({ baselineId: baseline.id, itemType: 'work_item', itemId: i.id, itemVersion: i.version })),
      skipDuplicates: true,
    });
    return { ...baseline, itemCount: items.length };
  }

  private async getProjectSummary(spaceKey: string) {
    const space = await this.space(spaceKey);
    const [workItems, coverage, compliance, openBugs, recent] = await Promise.all([
      this.prisma.workItem.count({ where: { spaceId: space.id } }),
      this.getCoverage(spaceKey),
      this.getCompliance(spaceKey),
      this.prisma.workItem.count({ where: { spaceId: space.id, status: 'open' } }),
      this.prisma.workItem.findMany({ where: { spaceId: space.id }, orderBy: { updatedAt: 'desc' }, take: 5 }),
    ]);
    const avg = compliance.length ? compliance.reduce((s: number, c: any) => s + c.completionPercent, 0) / compliance.length : 0;
    return {
      space: { key: space.key, name: space.name, aspiceLevel: space.aspiceLevel },
      workItems,
      openItems: openBugs,
      coverage,
      compliancePercent: +avg.toFixed(1),
      complianceByProcess: compliance,
      recentActivity: recent.map((r) => ({ key: r.key, title: r.title, status: r.status, updatedAt: r.updatedAt })),
    };
  }

  // ── SSE 세션 (기존 클라이언트 호환) ───────────────────────
  createSession(_req: any) {
    return { message: 'MCP session created' };
  }
}
