import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ROLE_KEY = 'requireRole';

/** 엔드포인트에 필요한 역할 이름(예: project_admin, approver)을 표시한다. */
export const RequireRole = (roleName: string) =>
  SetMetadata(REQUIRE_ROLE_KEY, roleName);
