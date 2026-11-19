import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

/** 프로젝트 생성 요청 DTO */
export class CreateSpaceDto {
  @IsString()
  key: string;

  @IsString()
  name: string;

  @IsString()
  orgId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  templateVersionId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberEmails?: string[];
}
