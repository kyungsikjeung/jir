import { Controller, Get, Post, Sse, Body, Req } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private mcpService: McpService) {}

  @Sse('sse')
  sseEndpoint(@Req() req: any) {
    return this.mcpService.createSession(req);
  }

  @Post('message')
  async handleMessage(@Body() request: any) {
    const user = { id: 'system' };
    const result = await this.mcpService.handleMethod(request.method, request.params, user);
    return { jsonrpc: '2.0', id: request.id, result };
  }
}
