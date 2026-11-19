import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SignaturesService } from './signatures.service';

@Controller('signatures')
export class SignaturesController {
  constructor(private service: SignaturesService) {}

  @Post()
  async sign(@Body() body: any) {
    return this.service.sign({
      entityType: body.entityType,
      entityId: body.entityId,
      signerId: body.signerId,
      signatureType: body.signatureType,
      signatureData: body.signatureData,
      isEvidence: body.isEvidence,
      evidenceTag: body.evidenceTag,
      comment: body.comment,
      ipAddress: body.ipAddress,
    });
  }

  @Get()
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.service.findByEntity(entityType, entityId);
  }
}
