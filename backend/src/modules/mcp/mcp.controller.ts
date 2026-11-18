import { Controller, Get, Post, Body, Query, Req, Res, HttpCode, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { Subject } from 'rxjs';
import { McpService } from './mcp.service';
import { Public } from '../../common/decorators/public.decorator';

interface SseSession {
  subject: Subject<{ event: string; data: any }>;
}

/**
 * MCP 서버 엔드포인트
 * - Streamable HTTP:  POST /api/mcp            (JSON-RPC 2.0)
 * - SSE (legacy):      GET  /api/mcp/sse        (endpoint 이벤트 → /api/mcp/message?sessionId=...)
 * - SSE 메시지 수신:   POST /api/mcp/message
 */
@Public()
@Controller('mcp')
export class McpController {
  private sessions = new Map<string, SseSession>();

  constructor(private mcpService: McpService) {}

  private assertApiKey(req: any) {
    const expected = process.env.MCP_API_KEY;
    if (!expected) return; // 개발 모드: 키 미설정 시 허용
    const provided = req.headers['x-mcp-api-key'] || req.query.apiKey;
    if (provided !== expected) throw new UnauthorizedException('Invalid MCP API key');
  }

  // ── Streamable HTTP (권장) ───────────────────────────────
  @Post()
  @HttpCode(200)
  async handleHttp(@Body() request: any, @Req() req: any) {
    this.assertApiKey(req);
    const user = { id: req.headers['x-user-id'] || 'system' };
    try {
      const result = await this.mcpService.handleMethod(request.method, request.params, user);
      return { jsonrpc: '2.0', id: request.id ?? null, result };
    } catch (e: any) {
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: { code: -32603, message: e.message || 'Internal error' },
      };
    }
  }

  // ── SSE 세션 시작 ────────────────────────────────────────
  @Get('sse')
  sse(@Req() req: any, @Res() res: Response) {
    this.assertApiKey(req);

    const sessionId = crypto.randomUUID();
    const subject = new Subject<{ event: string; data: any }>();
    this.sessions.set(sessionId, { subject });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const write = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
    };

    // MCP SSE 규격: 클라이언트가 POST 할 endpoint 안내
    write('endpoint', `/api/mcp/message?sessionId=${sessionId}`);

    const sub = subject.subscribe((msg) => write(msg.event, msg.data));

    // 30초 keepalive
    const ka = setInterval(() => res.write(': keepalive\n\n'), 30000);

    req.on('close', () => {
      clearInterval(ka);
      sub.unsubscribe();
      this.sessions.delete(sessionId);
      res.end();
    });
  }

  // ── SSE 메시지 수신 ──────────────────────────────────────
  @Post('message')
  @HttpCode(202)
  async handleMessage(@Body() request: any, @Query('sessionId') sessionId: string, @Req() req: any) {
    this.assertApiKey(req);
    const user = { id: req.headers['x-user-id'] || 'system' };

    // 알림(notification)은 응답 없음
    const isNotification = request.id === undefined || request.id === null;

    const result = await this.mcpService
      .handleMethod(request.method, request.params, user)
      .then((r) => ({ jsonrpc: '2.0', id: request.id ?? null, result: r }))
      .catch((e) => ({ jsonrpc: '2.0', id: request.id ?? null, error: { code: -32603, message: e.message } }));

    if (isNotification) return {};

    const session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (session) {
      session.subject.next({ event: 'message', data: result });
      return {};
    }
    // 세션이 없으면 직접 결과 반환 (디버깅/단발 호출)
    return result;
  }

  // ── 헬스/정보 ────────────────────────────────────────────
  @Get()
  info() {
    return {
      name: 'alm-mcp-server',
      version: '1.0.0',
      protocol: 'mcp',
      transports: ['streamable-http (POST /api/mcp)', 'sse (GET /api/mcp/sse)'],
      tools: this.mcpService.getToolDefinitions().map((t) => t.name),
    };
  }
}
