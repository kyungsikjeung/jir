import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database'),
      () => this.http.pingCheck('meilisearch', 'http://meilisearch:7700/health'),
    ]);
  }

  @Get('ready')
  ready() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
