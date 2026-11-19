import {
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';
import { PolicyService } from '../../modules/auth/policy.service';

/**
 * 역할/권한 가드.
 * - @Public() 이면 통과
 * - @RequirePermission('code') 이면 PolicyService.can 으로 스페이스 권한 확인
 * - @RequireRole('name') 이면 사용자 역할 이름 확인
 * - 둘 다 없으면 인증만 통과 (JwtAuthGuard 가 이미 처리)
 */
@Injectable()
export class RolesGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private policy: PolicyService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // JWT 인증 먼저 통과
    const jwtResult = (await super.canActivate(context)) as boolean;
    if (!jwtResult) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string; email?: string } | undefined;
    if (!user || !user.id) throw new UnauthorizedException();

    const requirePermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requireRole = this.reflector.getAllAndOverride<string>(
      REQUIRE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const spaceId =
      request.params?.spaceId ??
      request.query?.spaceId ??
      request.body?.spaceId ??
      undefined;

    if (requirePermission) {
      const allowed = await this.policy.can(user.id, spaceId, requirePermission);
      if (!allowed) throw new ForbiddenException();
    }

    if (requireRole) {
      const roles = await this.policy.getUserRoles(user.id, spaceId);
      const hasRole = roles.some((r) => r.name === requireRole);
      if (!hasRole) throw new ForbiddenException();
    }

    return true;
  }
}
