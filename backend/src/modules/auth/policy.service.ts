import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 서버 측 공간/프로세스 기반 RBAC 정책 서비스.
 * - 스페이스 멤버십(SpaceMember)과 전역 역할(UserRole)을 평가
 * - 역할 → 권한(RolePermission → Permission) 체인에서 코드 일치 확인
 * - 프로세스 단위 할당(ProcessAssignment)과 외부 접근 권한(ProcessAccessGrant)도 평가
 */
@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  /**
   * 사용자가 주어진 스페이스에서 특정 권한을 가지는지 확인한다.
   * spaceId 가 undefined 면 전역 역할(조직 단위)만 평가한다.
   */
  async can(
    userId: string,
    spaceId: string | undefined,
    permissionCode: string,
  ): Promise<boolean> {
    const roleIds: string[] = [];

    if (spaceId) {
      // 스페이스 멤버십
      const members = await this.prisma.spaceMember.findMany({
        where: { userId, spaceId },
        select: { roleId: true },
      });
      members.forEach((m) => roleIds.push(m.roleId));

      // 스페이스 범위 사용자 역할
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId, spaceId },
        select: { roleId: true },
      });
      userRoles.forEach((r) => roleIds.push(r.roleId));
    } else {
      // 전역 역할 (조직 단위)
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId, spaceId: null },
        select: { roleId: true },
      });
      userRoles.forEach((r) => roleIds.push(r.roleId));
    }

    if (roleIds.length === 0) return false;

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permissionId: true },
    });
    const permissionIds = rolePermissions.map((rp) => rp.permissionId);
    if (permissionIds.length === 0) return false;

    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds }, code: permissionCode },
      select: { id: true },
    });

    return permissions.length > 0;
  }

  /**
   * 사용자가 주어진 프로세스 워크스페이스에서 특정 권한을 가지는지 확인한다.
   * 프로세스 할당(소유자/담당자)과 외부 접근 권한(열람/댓글)을 모두 평가한다.
   */
  async canProcess(
    userId: string,
    spaceId: string,
    processCode: string,
    permissionCode: string,
  ): Promise<boolean> {
    const workspace = await this.prisma.processWorkspace.findFirst({
      where: { spaceId, processCode },
      select: { id: true },
    });
    if (!workspace) return false;

    // 1) 프로세스 할당 기반 역할 권한
    const assignments = await this.prisma.processAssignment.findMany({
      where: { workspaceId: workspace.id, userId },
      select: { roleId: true },
    });
    if (assignments.length > 0) {
      const roleIds = assignments.map((a) => a.roleId);
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: { in: roleIds } },
        select: { permissionId: true },
      });
      const permissionIds = rolePermissions.map((rp) => rp.permissionId);
      if (permissionIds.length > 0) {
        const permissions = await this.prisma.permission.findMany({
          where: { id: { in: permissionIds }, code: permissionCode },
          select: { id: true },
        });
        if (permissions.length > 0) return true;
      }
    }

    // 2) 외부/제한 사용자 접근 권한 (기본: view/comment)
    const grants = await this.prisma.processAccessGrant.findMany({
      where: { workspaceId: workspace.id, userId },
      select: { permission: true, expiresAt: true },
    });
    const now = new Date();
    const validGrant = grants.find(
      (g) =>
        (!g.expiresAt || g.expiresAt > now) &&
        (g.permission === 'view' || g.permission === 'comment'),
    );
    if (validGrant) {
      if (permissionCode === 'process:view') return true;
      if (validGrant.permission === 'comment' && permissionCode === 'process:comment')
        return true;
    }

    return false;
  }

  /**
   * 사용자가 속한 역할 목록을 반환한다.
   */
  async getUserRoles(userId: string, spaceId?: string) {
    const where: any = { userId };
    if (spaceId !== undefined) where.spaceId = spaceId;
    else where.spaceId = null;

    const userRoles = await (this.prisma as any).userRole.findMany({
      where,
      select: { roleId: true },
    });

    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((ur: any) => ur.roleId);
    const roles = await (this.prisma as any).role.findMany({
      where: { id: { in: roleIds } },
    });

    return roles;
  }
}
