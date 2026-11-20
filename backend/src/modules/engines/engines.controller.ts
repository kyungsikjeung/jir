import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EngineRegistry } from './engines.service';

@Controller('engines')
export class EnginesController {
  constructor(private registry: EngineRegistry) {}

  @Get()
  list() {
    return { engines: this.registry.list() };
  }

  @Post(':name/execute')
  execute(@Param('name') name: string, @Body() body: any) {
    return this.registry.execute(name, body?.params ?? body, body?.context);
  }

  @Post(':name/verify')
  verify(@Param('name') name: string, @Body() body: any) {
    return this.registry.verify(name, body?.params ?? body, body?.context);
  }
}
