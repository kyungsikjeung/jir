import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateFieldDefinitionInput {
  spaceId?: string;
  typeId?: string;
  key: string;
  label: string;
  labelKo?: string;
  labelEn?: string;
  fieldType: string;
  isRequired?: boolean;
  requiredForApproval?: boolean;
  validation?: Record<string, any>;
  sortOrder?: number;
}

export interface UpdateFieldDefinitionInput {
  // 불변 필드: 변경 시도는 400
  key?: string;
  typeId?: string;
  fieldType?: string;
  label?: string;
  labelKo?: string;
  labelEn?: string;
  isRequired?: boolean;
  requiredForApproval?: boolean;
  validation?: Record<string, any>;
  sortOrder?: number;
}

/**
 * 동적 필드 정의 서비스.
 * FieldDefinition은 템플릿 버전 스냅샷에 고정되며, 프로젝트 생성 시 복사된다.
 * 키(key)는 불변, 라벨(label)만 변경 가능. 삭제는 soft-delete.
 */
@Injectable()
export class FieldDefinitionService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFieldDefinitionInput) {
    // 중복 키 검사 (같은 spaceId + key)
    const existing = await this.prisma.fieldDefinition.findFirst({
      where: { spaceId: data.spaceId ?? null, key: data.key, isSoftDeleted: false },
    });
    if (existing) {
      throw new ConflictException(`Field key already exists: ${data.key}`);
    }

    return this.prisma.fieldDefinition.create({
      data: {
        spaceId: data.spaceId ?? null,
        key: data.key,
        label: data.label,
        labelKo: data.labelKo ?? null,
        labelEn: data.labelEn ?? null,
        fieldType: data.fieldType,
        typeId: data.typeId ?? null,
        isRequired: data.isRequired ?? false,
        requiredForApproval: data.requiredForApproval ?? false,
        validation: data.validation ?? {},
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async findAll(spaceId?: string, typeId?: string) {
    const where: any = { isSoftDeleted: false };
    if (spaceId) where.spaceId = spaceId;
    if (typeId) where.typeId = typeId;

    return this.prisma.fieldDefinition.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const field = await this.prisma.fieldDefinition.findUnique({
      where: { id },
    });
    if (!field || field.isSoftDeleted) {
      throw new NotFoundException(`Field definition not found: ${id}`);
    }
    return field;
  }

  async update(id: string, data: UpdateFieldDefinitionInput) {
    const existing = await this.prisma.fieldDefinition.findUnique({
      where: { id },
    });
    if (!existing || existing.isSoftDeleted) {
      throw new NotFoundException(`Field definition not found: ${id}`);
    }

    // key/type은 불변
    if (data.key !== undefined && data.key !== existing.key) {
      throw new BadRequestException(`Field key is immutable: ${existing.key}`);
    }
    if (data.typeId !== undefined && data.typeId !== existing.typeId) {
      throw new BadRequestException('Field typeId is immutable');
    }
    if (data.fieldType !== undefined && data.fieldType !== existing.fieldType) {
      throw new BadRequestException(`Field type is immutable: ${existing.fieldType}`);
    }

    return this.prisma.fieldDefinition.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.labelKo !== undefined && { labelKo: data.labelKo }),
        ...(data.labelEn !== undefined && { labelEn: data.labelEn }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.requiredForApproval !== undefined && {
          requiredForApproval: data.requiredForApproval,
        }),
        ...(data.validation !== undefined && { validation: data.validation }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async softDelete(id: string) {
    const existing = await this.prisma.fieldDefinition.findUnique({
      where: { id },
    });
    if (!existing || existing.isSoftDeleted) {
      throw new NotFoundException(`Field definition not found: ${id}`);
    }

    return this.prisma.fieldDefinition.update({
      where: { id },
      data: { isSoftDeleted: true },
    });
  }
}
