import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SpacesService } from './spaces.service';
import { SpacesController } from './spaces.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
