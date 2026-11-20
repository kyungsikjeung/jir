import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { SignaturesService } from './signatures.service';

@Controller('signatures')
export class SignaturesController {
  constructor(private service: SignaturesService) {}

  /** 서명 등록 — signerId는 인증된 사용자로 강제 (body 위조 방지) */
  @Post()
  async sign(@Body() body: any, @Request() req: any) {
    return this.service.sign({
      entityType: body.entityType,
      entityId: body.entityId,
      signerId: req.user?.id,
      password: body.password,
      signatureType: body.signatureType,
      signatureData: body.signatureData,
      isEvidence: body.isEvidence,
      evidenceTag: body.evidenceTag,
      comment: body.comment,
      ipAddress: req.ip,
    });
  }

  /** 서명 검증 (무결성/콘텐츠 변경/취소 여부) */
  @Post('verify')
  async verify(@Body() body: any) {
    return this.service.verify(body.entityType, body.entityId);
  }

  @Get()
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.service.findByEntity(entityType, entityId);
  }
}
