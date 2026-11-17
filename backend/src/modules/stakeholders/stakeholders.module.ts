import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StakeholdersService } from './stakeholders.service';
import { StakeholdersController } from './stakeholders.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StakeholdersController],
  providers: [StakeholdersService],
  exports: [StakeholdersService],
})
export class StakeholdersModule {}
