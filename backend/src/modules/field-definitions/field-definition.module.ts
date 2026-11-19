import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FieldDefinitionService } from './field-definition.service';
import { FieldDefinitionController } from './field-definition.controller';

@Module({
  imports: [PrismaModule],
  providers: [FieldDefinitionService],
  controllers: [FieldDefinitionController],
  exports: [FieldDefinitionService],
})
export class FieldDefinitionModule {}
