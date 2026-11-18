import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ResponsibilitiesController } from './responsibilities.controller';
import { ResponsibilitiesService } from './responsibilities.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResponsibilitiesController],
  providers: [ResponsibilitiesService],
})
export class ResponsibilitiesModule {}
