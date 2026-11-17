import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private prisma: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<any> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return (this as any).getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Prisma check failed', (this as any).getStatus(key, false, { message: error.message }));
    }
  }
}

