import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpacesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId?: string) {
    return this.prisma.space.findMany({
      where: orgId ? { orgId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByKey(key: string) {
    const space = await this.prisma.space.findUnique({ where: { key } });
    if (!space) throw new NotFoundException(`Space not found: ${key}`);
    return space;
  }

  async create(data: { name: string; key: string; orgId: string; createdById?: string }) {
    const existing = await this.prisma.space.findUnique({ where: { key: data.key } });
    if (existing) throw new ConflictException('Space key already exists');

    return this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: { name: data.name, key: data.key, orgId: data.orgId, createdById: data.createdById },
      });

      await tx.spaceSettings.create({ data: { spaceId: space.id } });

      // 기본 프로세스 영역 매핑 (ASPICE Level 2)
      const processes = ['SWE.1', 'SWE.2', 'SWE.3', 'SWE.4', 'SWE.5', 'SWE.6', 'SUP.1', 'SUP.2', 'SUP.8', 'SUP.10'];
      await tx.spaceProcessArea.createMany({
        data: processes.map(code => ({ spaceId: space.id, processCode: code, isApplicable: true })),
      });

      return space;
    });
  }

  async update(key: string, data: { name?: string; description?: string; isArchived?: boolean }) {
    const space = await this.findByKey(key);
    return this.prisma.space.update({ where: { id: space.id }, data });
  }

  async delete(key: string) {
    const space = await this.findByKey(key);
    await this.prisma.space.delete({ where: { id: space.id } });
  }

  async addMember(spaceKey: string, userId: string, roleId: string, addedById: string) {
    const space = await this.findByKey(spaceKey);
    return this.prisma.spaceMember.create({
      data: { spaceId: space.id, userId, roleId, addedById },
    });
  }

  async removeMember(spaceKey: string, userId: string) {
    const space = await this.findByKey(spaceKey);
    await this.prisma.spaceMember.delete({
      where: { spaceId_userId: { spaceId: space.id, userId } },
    });
  }

  async getMembers(spaceKey: string) {
    const space = await this.findByKey(spaceKey);
    return this.prisma.spaceMember.findMany({ where: { spaceId: space.id } });
  }
}
