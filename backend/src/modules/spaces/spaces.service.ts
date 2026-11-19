import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateService } from '../templates/template.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SpacesService {
  constructor(
    private prisma: PrismaService,
    private templateService: TemplateService,
    private audit: AuditService,
  ) {}

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

  async create(data: {
    name: string;
    key: string;
    orgId: string;
    description?: string;
    createdById?: string;
    templateVersionId?: string;
    memberEmails?: string[];
  }) {
    const existing = await this.prisma.space.findUnique({ where: { key: data.key } });
    if (existing) throw new ConflictException('Space key already exists');

    const space = await this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: {
          name: data.name,
          key: data.key,
          orgId: data.orgId,
          description: data.description,
          createdById: data.createdById,
        },
      });

      await tx.spaceSettings.create({ data: { spaceId: space.id } });

      // 기본 프로세스 영역 매핑 (ASPICE Level 2)
      const processes = [
        'SWE.1',
        'SWE.2',
        'SWE.3',
        'SWE.4',
        'SWE.5',
        'SWE.6',
        'SUP.1',
        'SUP.2',
        'SUP.8',
        'SUP.10',
      ];
      await tx.spaceProcessArea.createMany({
        data: processes.map((code) => ({
          spaceId: space.id,
          processCode: code,
          isApplicable: true,
        })),
      });

      return space;
    });

    // 템플릿 인스턴스화 (트랜잭션 외부: 스페이스 생성 후)
    let processWorkspaceIds: string[] = [];
    if (data.templateVersionId) {
      const result = await this.templateService.instantiate(
        space.id,
        data.templateVersionId,
        data.createdById ?? '',
      );
      processWorkspaceIds = result.workspaces.map((w) => w.id);
    }

    // 멤버 초대 (이메일 → 사용자 매핑 후 뷰어 역할 할당)
    if (data.memberEmails && data.memberEmails.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { email: { in: data.memberEmails } },
        select: { id: true },
      });
      const viewerRole = await this.prisma.role.findFirst({
        where: { name: 'viewer' },
        select: { id: true },
      });
      if (viewerRole && users.length > 0) {
        await this.prisma.spaceMember.createMany({
          data: users.map((u) => ({
            spaceId: space.id,
            userId: u.id,
            roleId: viewerRole.id,
            addedById: data.createdById ?? null,
          })),
          skipDuplicates: true,
        });
      }
    }

    // 감사 로그
    await this.audit.log({
      entityType: 'space',
      entityId: space.id,
      action: 'create',
      actorId: data.createdById ?? null,
      newValue: {
        key: data.key,
        name: data.name,
        templateVersionId: data.templateVersionId,
      },
      isEvidence: true,
    });

    return { ...space, processWorkspaceIds };
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
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId: space.id },
    });
    if (!members.length) return [];
    const [users, roles] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: members.map((m) => m.userId) } },
        select: { id: true, displayName: true, email: true, title: true },
      }),
      this.prisma.role.findMany({
        where: { id: { in: members.map((m) => m.roleId) } },
        select: { id: true, name: true },
      }),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const roleById = new Map(roles.map((r) => [r.id, r]));
    return members.map((m) => ({
      ...m,
      user: userById.get(m.userId) ?? null,
      role: roleById.get(m.roleId) ?? null,
    }));
  }
}
