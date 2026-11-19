import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/** 엔드포인트에 필요한 권한 코드를 표시한다. 없는 경우 403 을 반환한다. */
export const RequirePermission = (permissionCode: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissionCode);
