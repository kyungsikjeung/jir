import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * API 호출 감사 인터셉터.
 * 상태 변경 메서드(POST/PUT/PATCH/DELETE) 호출 후 감사 로그를 작성한다.
 * 감사 로그 실패는 주 요청에 영향을 주지 않는다.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string } | undefined;
    const actorId = user?.id ?? null;

    const method = request.method;
    const path = request.route?.path ?? request.url;
    const routeParams = request.params;
    const entityId =
      routeParams.id ??
      routeParams.workItemId ??
      routeParams.spaceId ??
      routeParams.documentId ??
      routeParams.baselineId ??
      null;

    let entityType = 'api';
    if (path.includes('work-items')) entityType = 'work_item';
    else if (path.includes('spaces')) entityType = 'space';
    else if (path.includes('documents')) entityType = 'document';
    else if (path.includes('baselines')) entityType = 'baseline';
    else if (path.includes('templates')) entityType = 'template';
    else if (path.includes('approvals')) entityType = 'approval';

    return next.handle().pipe(
      tap(async () => {
        // 상태 변경 메서드만 감사 대상으로 기록
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
          return;
        }

        try {
          await this.audit.log({
            entityType,
            entityId: entityId ?? 'unknown',
            action: method.toLowerCase(),
            actorId,
            ipAddress: request.ip,
            userAgent: request.get('user-agent') ?? undefined,
            isEvidence: true,
            evidenceTag: 'api',
          });
        } catch {
          // 감사 로그 실패는 주 요청을 실패시키지 않음
        }
      }),
    );
  }
}
