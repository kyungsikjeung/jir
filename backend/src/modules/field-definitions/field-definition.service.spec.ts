import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FieldDefinitionService } from './field-definition.service';

function createPrismaMock() {
  return {
    fieldDefinition: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('FieldDefinitionService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: FieldDefinitionService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new FieldDefinitionService(prisma as any);
  });

  describe('create', () => {
    it('필드 정의를 생성한다', async () => {
      prisma.fieldDefinition.create.mockResolvedValue({
        id: 'fd1',
        key: 'hazard_level',
        label: 'Hazard Level',
        fieldType: 'select',
      });

      const result = await service.create({
        spaceId: 's1',
        key: 'hazard_level',
        label: 'Hazard Level',
        fieldType: 'select',
      });

      expect(result.key).toBe('hazard_level');
      expect(prisma.fieldDefinition.create).toHaveBeenCalledWith({
        data: {
          spaceId: 's1',
          key: 'hazard_level',
          label: 'Hazard Level',
          labelKo: null,
          labelEn: null,
          fieldType: 'select',
          typeId: null,
          isRequired: false,
          requiredForApproval: false,
          validation: {},
          sortOrder: 0,
        },
      });
    });
  });

  describe('findAll', () => {
    it('스페이스의 필드 정의 목록을 반환한다', async () => {
      prisma.fieldDefinition.findMany.mockResolvedValue([
        { id: 'fd1', key: 'hazard_level', label: 'Hazard Level' },
      ]);

      const result = await service.findAll('s1');

      expect(result).toHaveLength(1);
      expect(prisma.fieldDefinition.findMany).toHaveBeenCalledWith({
        where: { spaceId: 's1', isSoftDeleted: false },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('typeId로 필터링한다', async () => {
      prisma.fieldDefinition.findMany.mockResolvedValue([]);

      await service.findAll('s1', 'type-req');

      expect(prisma.fieldDefinition.findMany).toHaveBeenCalledWith({
        where: { spaceId: 's1', typeId: 'type-req', isSoftDeleted: false },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('필드 정의를 조회한다', async () => {
      prisma.fieldDefinition.findUnique.mockResolvedValue({
        id: 'fd1',
        key: 'hazard_level',
        label: 'Hazard Level',
      });

      const result = await service.findOne('fd1');

      expect(result.id).toBe('fd1');
    });

    it('존재하지 않는 필드는 NotFoundException 을 던진다', async () => {
      prisma.fieldDefinition.findUnique.mockResolvedValue(null);

      await expect(service.findOne('fd-none')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('라벨을 수정한다 (키는 불변)', async () => {
      prisma.fieldDefinition.findUnique.mockResolvedValue({
        id: 'fd1',
        key: 'hazard_level',
        label: 'Hazard Level',
      });
      prisma.fieldDefinition.update.mockResolvedValue({
        id: 'fd1',
        key: 'hazard_level',
        label: 'Hazard Level (Updated)',
      });

      const result = await service.update('fd1', { label: 'Hazard Level (Updated)' });

      expect(result.label).toBe('Hazard Level (Updated)');
      expect(prisma.fieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'fd1' },
        data: { label: 'Hazard Level (Updated)' },
      });
    });

    it('존재하지 않는 필드는 NotFoundException 을 던진다', async () => {
      prisma.fieldDefinition.findUnique.mockResolvedValue(null);

      await expect(service.update('fd-none', { label: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('키 변경 시도는 BadRequestException 을 던진다 (key 불변)', async () => {
      prisma.fieldDefinition.findUnique.mockResolvedValue({
        id: 'fd1',
        key: 'hazard_level',
        label: 'Hazard Level',
        fieldType: 'select',
      });

      await expect(
        service.update('fd1', { key: 'different_key' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.fieldDefinition.update).not.toHaveBeenCalled();
    });

    it('타입 변경 시도는 BadRequestException 을 던진다 (fieldType 불변)', async () => {
      prisma.fieldDefinition.findUnique.mockResolvedValue({
        id: 'fd1',
        key: 'hazard_level',
        label: 'Hazard Level',
        fieldType: 'select',
      });

      await expect(
        service.update('fd1', { fieldType: 'number' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.fieldDefinition.update).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('필드를 soft-delete 한다 (데이터 보존)', async () => {
      prisma.fieldDefinition.findUnique.mockResolvedValue({
        id: 'fd1',
        key: 'hazard_level',
        isSoftDeleted: false,
      });
      prisma.fieldDefinition.update.mockResolvedValue({
        id: 'fd1',
        isSoftDeleted: true,
      });

      const result = await service.softDelete('fd1');

      expect(result.isSoftDeleted).toBe(true);
      expect(prisma.fieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'fd1' },
        data: { isSoftDeleted: true },
      });
    });
  });
});
