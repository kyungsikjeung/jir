import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ResponsibilitiesService {
  constructor(private prisma: PrismaService) {}

  private async space(key: string) {
    const space = await this.prisma.space.findUnique({ where: { key } });
    if (!space) throw new NotFoundException(`Space not found: ${key}`);
    return space;
  }

  /** ASPICE 프로세스 × 역할 책임 매트릭스 */
  async getMatrix(spaceKey: string) {
    const space = await this.space(spaceKey);

    const [applicable, areas, members, cells] = await Promise.all([
      this.prisma.spaceProcessArea.findMany({
        where: { spaceId: space.id, isApplicable: true },
      }),
      this.prisma.processArea.findMany(),
      this.prisma.spaceMember.findMany({ where: { spaceId: space.id } }),
      this.prisma.roleResponsibility.findMany({
        where: { spaceId: space.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const areaByCode = new Map(areas.map((a) => [a.code, a]));
    const processes = applicable
      .map((p) => ({
        code: p.processCode,
        name: areaByCode.get(p.processCode)?.name ?? p.processCode,
        category: areaByCode.get(p.processCode)?.category ?? null,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    const roleIds = Array.from(new Set(members.map((m) => m.roleId)));
    const [roles, users] = await Promise.all([
      roleIds.length
        ? this.prisma.role.findMany({ where: { id: { in: roleIds } }, orderBy: { name: 'asc' } })
        : Promise.resolve([]),
      members.length
        ? this.prisma.user.findMany({
            where: { id: { in: members.map((m) => m.userId) } },
            select: { id: true, displayName: true, email: true },
          })
        : Promise.resolve([]),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      processes,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        members: members
          .filter((m) => m.roleId === role.id)
          .map((m) => userById.get(m.userId) ?? { id: m.userId, displayName: m.userId }),
      })),
      cells,
    };
  }

  /** 역할×프로세스 책임 지정 (upsert) */
  async setResponsibility(
    spaceKey: string,
    data: {
      roleId: string;
      aspiceProcess: string;
      responsibility: string;
      isPrimary?: boolean;
    },
  ) {
    const space = await this.space(spaceKey);
    const responsibility = data.responsibility || 'viewer';

    return this.prisma.roleResponsibility.upsert({
      where: {
        roleId_spaceId_aspiceProcess: {
          roleId: data.roleId,
          spaceId: space.id,
          aspiceProcess: data.aspiceProcess,
        },
      },
      update: { responsibility, isPrimary: !!data.isPrimary },
      create: {
        roleId: data.roleId,
        spaceId: space.id,
        aspiceProcess: data.aspiceProcess,
        responsibility,
        isPrimary: !!data.isPrimary,
      },
    });
  }

  async remove(spaceKey: string, id: string) {
    const space = await this.space(spaceKey);
    await this.prisma.roleResponsibility.deleteMany({
      where: { id, spaceId: space.id },
    });
    return { success: true };
  }
}
