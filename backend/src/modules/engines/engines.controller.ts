import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { EngineRegistry } from './engines.service';

@Controller('engines')
export class EnginesController {
  constructor(private registry: EngineRegistry) {}

  @Get()
  list() {
    return { engines: this.registry.list() };
  }

  /**
   * 엔진 실행 — 행위자는 반드시 인증된 사용자로 고정한다.
   * 클라이언트가 보낸 userId/actorId는 context로 덮어써 무시된다.
   */
  @Post(':name/execute')
  execute(@Param('name') name: string, @Body() body: any, @Request() req: any) {
    const context = { userId: req.user?.id };
    return this.registry.execute(name, body?.params ?? body, context);
  }

  @Post(':name/verify')
  verify(@Param('name') name: string, @Body() body: any, @Request() req: any) {
    const context = { userId: req.user?.id };
    return this.registry.verify(name, body?.params ?? body, context);
  }
}
