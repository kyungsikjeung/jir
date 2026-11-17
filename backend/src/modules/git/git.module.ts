import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GitService } from './git.service';
import { GitController } from './git.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GitController],
  providers: [GitService],
  exports: [GitService],
})
export class GitModule {}
