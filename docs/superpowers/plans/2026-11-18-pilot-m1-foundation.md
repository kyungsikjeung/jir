# M1 Foundation 구현 계획

**일정:** 2주 (1인) / 1.5주 (2인)
**목표:** 템플릿 레지스트리/인스턴스화, 서버 측 RBAC, 감사 로그 해시 체인, JWT DB 검증, 프로젝트/프로세스 생성 API를 구현하고 단위·통합 테스트로 검증한다.
**완료 기준:** 템플릿으로 프로젝트 생성 → 프로세스 워크스페이스 생성 → 역할 기반 접근 제어 → 모든 변경이 감사 로그에 해시 체인으로 기록되는 골든 패스가 백엔드 API로 완결되고, 백엔드 테스트가 모두 pass.

---

## 1. 데이터 모델 변경

### 1.1 신규 모델 (Prisma 스키마 추가)

| 모델 | 목적 | 핵심 필드 |
|------|------|-----------|
| `TemplatePackage` | 조직 레벨 템플릿 패키지 (ASPICE 골든 패스 등) | id, orgId, name, description, isSystem, isPublished, createdById, createdAt |
| `TemplateVersion` | 템플릿의 불변 스냅샷 버전 | id, packageId, version (int), processes (Json), workflows (Json), fieldDefinitions (Json), deliverables (Json), rrDefaults (Json), wbsSkeleton (Json), createdById, createdAt |
| `ProcessWorkspace` | 프로젝트 내 프로세스 뷰 (SYS.2, SWE.1…) | id, spaceId, processCode, name, description, isApplicable, createdAt |
| `ProcessAssignment` | 프로세스 × 역할 × 사용자 매핑 | id, workspaceId, roleId, userId, isPrimary, assignedById, assignedAt, expiresAt |
| `ProcessAccessGrant` | 외부/제한 사용자 프로세스 단위 접근 | id, workspaceId, userId, permission (view/comment), expiresAt, grantedById, grantedAt |
| `FieldDefinition` | 동적 필드 정의 (템플릿 버전 스냅샷에 고정) | id, spaceId (nullable: org 템플릿), typeId (workItemType), key (immutable), label, labelKo/labelEn, fieldType, isRequired, requiredForApproval, validationJson, sortOrder, isSoftDeleted |
| `AuditEvent` | 감사 이벤트 (해시 체인) | id, entityType, entityId, action, actorId, oldHash, newHash, chainHash, createdAt, ipAddress, userAgent |
| `Signature` (ElectronicSignature 보강) | 전자서명 (내부 승인) | contentHash, signedVersionId, signerId, signedAt, signatureData, verificationStatus, revokedAt, revokedById |

### 1.2 기존 모델 수정

- `WorkItem`: `customFields Json @default("{}")` 추가
- `ElectronicSignature`: `contentHash String?`, `signedVersionId String?`, `verificationStatus String @default("valid")`, `revokedAt DateTime?`, `revokedById String?` 추가
- `AuditLog`: `previousHash String?`, `chainHash String` 추가 (기존 필드 재사용 + 해시 체인)

### 1.3 마이그레이션

- `prisma migrate dev --name m1-foundation` 으로 스키마 적용
- `backend/prisma/migrations/` 아래 생성된 SQL 검토

---

## 2. 태스크 목록 (TDD 순서)

각 태스크는 **테스트 작성 → 구현 → 리팩토링 → 커밋** 순서로 진행한다.

### T1. Prisma 스키마 + 마이그레이션
**파일:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/*/migration.sql`
**인터페이스:** 위의 1.1~1.3 모델 정의
**테스트:** `npx prisma validate` 통과, 마이그레이션 적용 후 테이블 존재 확인
**완료:** 스키마 검증 통과 + 마이그레이션 적용 성공

### T2. RBAC PolicyService + 데코레이터/가드
**파일:** `backend/src/modules/auth/policy.service.ts`, `backend/src/common/guards/roles.guard.ts`, `backend/src/common/decorators/require-permission.decorator.ts`, `backend/src/common/decorators/require-role.decorator.ts`
**인터페이스:**
```ts
class PolicyService {
  can(userId: string, spaceId: string | undefined, permissionCode: string): Promise<boolean>
  canProcess(userId: string, spaceId: string, processCode: string, permissionCode: string): Promise<boolean>
  getUserRoles(userId: string, spaceId?: string): Promise<Role[]>
}
```
**테스트:** `policy.service.spec.ts` — 프로젝트 관리자/기여자/외부 감사자 권한 행위 행렬
**완료:** 서버 측 권한 강제, `@Public()` 제외 모든 라우트 인증, 권한 없음 403

### T3. Auth 강화 (JWT validate에서 DB 조회)
**파일:** `backend/src/modules/auth/jwt.strategy.ts`, `backend/src/modules/auth/auth.service.ts`
**인터페이스:**
```ts
// jwt.strategy.validate
async validate(payload: any) {
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new UnauthorizedException();
  return { id: user.id, email: user.email, isInternal: user.isInternal, isVerified: user.isVerified, isApproved: user.isApproved };
}
```
**테스트:** `auth.service.spec.ts` — 로그인 성공/실패, 비활성 사용자 거절, 미승인 외부 사용자 거절
**완료:** JWT 페이로드가 DB 실태와 동기화, `roles: []` 하드코딩 제거

### T4. 감사 서비스 + 인터셉터 + 해시 체인
**파일:** `backend/src/modules/audit/audit.service.ts`, `backend/src/common/interceptors/audit.interceptor.ts`, `backend/src/main.ts` (인터셉터 등록)
**인터페이스:**
```ts
class AuditService {
  log({ entityType, entityId, action, actorId, oldValue, newValue, ipAddress, userAgent }): Promise<AuditLog>
  verifyChain(entityType?: string, entityId?: string): Promise<boolean>
}
```
**테스트:** `audit.service.spec.ts` — 로그 작성, 해시 체인 연결, 위조 감지, `isEvidence` 플래그
**완료:** 모든 create/update/delete/전이/승인/기준선/내보내기가 감사 로그에 기록, 해시 체인 검증 가능

### T5. 템플릿 인스턴스화 서비스
**파일:** `backend/src/modules/templates/template.service.ts`, `backend/src/modules/templates/template.controller.ts`, `backend/src/modules/templates/template.module.ts`
**인터페이스:**
```ts
class TemplateService {
  listPackages(orgId): Promise<TemplatePackage[]>
  getVersion(packageId, version): Promise<TemplateVersion>
  instantiate(spaceId, templateVersionId, createdById): Promise<{ spaceId; workspaces: ProcessWorkspace[] }>
}
```
**테스트:** `template.service.spec.ts` — 템플릿으로 프로젝트 생성, 프로세스 워크스페이스 생성, 버전 고정(sp snapshot)
**완료:** 템플릿 선택 → 프로젝트 생성 → 프로세스 워크스페이스 자동 생성 → `templateVersionId` 고정

### T6. 프로젝트 생성 API + DTO
**파일:** `backend/src/modules/spaces/spaces.service.ts` (확장), `backend/src/modules/spaces/spaces.controller.ts` (확장), `backend/src/modules/spaces/dto/create-space.dto.ts`
**인터페이스:**
```ts
POST /spaces
body: { key, name, description, templateVersionId, memberEmails?: string[] }
response: { spaceId, key, processWorkspaceIds: string[] }
```
**테스트:** `spaces.service.spec.ts` — 프로젝트 생성, 템플릿 적용, 멤버 초대, 중복 키 거절
**완료:** 프로젝트 생성 위저드 연동용 API 완성

### T7. 단위/통합 테스트 전체 실행
**파일:** `backend/src/**/*.spec.ts`, `jest.config.js`
**테스트:** 모든 M1 테스트 파일, `npm test -- --passWithNoTests=false`
**완료:** 백엔드 테스트 100% pass, CI 워크플로우 통과

### T8. 시드 데이터 업데이트
**파일:** `backend/prisma/seed.js`
**내용:** 템플릿 패키지 1개 (SYS.2→SWE.1→SWE.4 골든 패스), 프로세스 영역, 기본 역할/권한, 데모 사용자(내부/외부/승인 대기)
**완료:** `npx prisma db seed` 후 골든 패스 프로젝트 생성 가능

---

## 3. 완료 기준 (M1)

1. `npx prisma validate` 통과
2. `prisma migrate dev` 적용 후 새 테이블 생성 확인
3. 모든 백엔드 단위 테스트 pass (T2~T6)
4. 템플릿으로 프로젝트 생성 API 호출 → 프로세스 워크스페이스 자동 생성 확인
5. 권한 없는 사용자 API 호출 → 403 반환 확인
6. 감사 로그 작성 → 해시 체인 검증 → 위조 감지 확인
7. JWT 로그인 → DB 기반 사용자 정보 반환 (isActive, isApproved 등)
8. CI `.github/workflows/ci.yml` 통과

---

## 4. 다음 단계 (M2 연계)

M1 완료 후 M2는 동적 타입/필드, WBS 편집, R&R 편집, 작업 목록/상세 UI, 골든 패스 프론트 연동을 다룬다.
