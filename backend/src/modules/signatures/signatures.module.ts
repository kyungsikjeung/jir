import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SignaturesService } from './signatures.service';
import { SignaturesController } from './signatures.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SignaturesController],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
