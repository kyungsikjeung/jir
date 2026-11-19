# M2 Dynamic Work Items 구현 계획

**일정:** 3주 (1인) / 2주 (2인)
**목표:** 동적 작업 항목 타입/필드, 작업 목록/상세 UI, WBS 편집, R&R 편집, 워크플로우 전이 검증, suspect 링크 자동 탐지를 구현한다.
**완료 기준:** 템플릿으로 프로젝트 생성 → 동적 필드가 있는 작업 항목 생성/수정 → WBS 트리 편집 → R&R 매트릭스 편집 → 전이 검증 → suspect 링크 자동 탐지가 백엔드+프론트에서 완결.

---

## 1. 스키마 변경

### 1.1 기존 모델 수정

- `WorkflowTransitionHistory`: `fromStateId String?`, `transitionId String?` 컬럼 추가 (전이 이력의 provenance 강화)

### 1.2 마이그레이션

- `prisma migrate deploy`로 `20261120000000_m2_workflow-history` 마이그레이션 적용 ✓ (dev DB에 컬럼 존재 확인, migrate deploy로 기록)
- 추가 수정: 템플릿 → 프로젝트 생성 시 템플릿 `fieldDefinitions` JSON을 스페이스 field definitions으로 복사 (SpacesService.create)

---

## 2. 백엔드 태스크 (TDD)

### T1. FieldDefinition CRUD
**파일:** `backend/src/modules/field-definitions/field-definition.service.ts`, `.controller.ts`, `.module.ts`
**인터페이스:**
```ts
class FieldDefinitionService {
  create(data): Promise<FieldDefinition>
  findAll(spaceId?: string, typeId?: string): Promise<FieldDefinition[]>
  findOne(id): Promise<FieldDefinition>
  update(id, data): Promise<FieldDefinition>  // label만 변경, key/type 불변
  softDelete(id): Promise<FieldDefinition>     // isSoftDeleted=true
}
```
**테스트:** `field-definition.service.spec.ts` — 생성, 조회, 수정, soft-delete, 중복 키 거절
**완료:** CRUD 엔드포인트 `POST/GET/PATCH/DELETE /field-definitions`

### T2. WorkItem customFields 서버 검증
**파일:** `backend/src/modules/work-items/work-items.service.ts` (수정)
**인터페이스:**
```ts
// create/update/부모 update 시 FieldDefinition 기반으로 customFields 검증
// - 필수 필드(required) 확인
// - 승인 시 필수(requiredForApproval) 확인 (transition 시) — 예약
// - 타입별 필드 검증 (text, number, select 등) — number/decimal 숫자, select/multiselect options
```
**테스트:** `work-items.service.spec.ts`에 customFields 검증 케이스 추가
**완료:** 잘못된 customFields로 생성/수정 시 400 반환; customFields 저장 및 전이 시 저장 개선

### T3. 워크플로우 전이 검증
**파일:** `backend/src/modules/work-items/work-items.service.ts` (transition 메서드 수정)
**인터페이스:**
```ts
// transition() 수정:
// 1. 현재 상태의 WorkflowState 조회
// 2. WorkflowTransition 테이블에서 fromStateId → toStateId 전이 존재 확인
// 3. guard condition 평가 (conditionConfig)
// 4. postActions 실행 (postActions JSON)
// 5. WorkflowTransitionHistory에 fromStateId, transitionId 기록
// 6. 전이가 없으면 400 반환
```
**테스트:** `work-items.service.spec.ts`에 전이 검증 케이스 추가
**완료:** 임의 상태 전이 불가, 존재하는 전이만 허용 (guard condition 평가 + postActions 실행 + 히스토리 transitionId/fromStateId 기록)

### T4. suspect 링크 자동 탐지
**파일:** `backend/src/modules/work-items/work-items.service.ts` (update 메서드 수정), `backend/src/modules/documents/documents.service.ts` (updatePage 메서드 수정)
**인터페이스:**
```ts
// update() 시: 영향받는 추적 링크의 isSuspect=true 설정
// updatePage() 시: 영향받는 추적 링크의 isSuspect=true 설정
// TraceabilityService.markSuspect() 호출 (이미 구현됨, 호출만 추가)
```
**테스트:** `work-items.service.spec.ts`, `documents.service.spec.ts`에 suspect 탐지 케이스 추가
**완료:** 요구사항/문서/작업 항목 변경 시 연결된 테스트/문서가 suspect로 표시 (markSuspect 호출 추가, 중복 행 방지)

### T5. FieldDefinition 모듈 등록
**파일:** `backend/src/app.module.ts` (수정)
**완료:** AppModule에 FieldDefinitionModule 등록

---

## 3. 프론트엔드 태스크

### T6. 동적 폼 렌더러
**파일:** `frontend/src/components/DynamicForm.tsx` (신규)
**인터페이스:**
```tsx
// FieldDefinition 배열을 받아 폼을 렌더링
// field types: text, textarea, number, decimal, boolean, date, select, multiselect, user, url
// required, requiredForApproval 표시
// :user-invalid 유효성 검증
```
**완료:** 작업 항목 상세에서 동적 필드 렌더링

### T7. 작업 항목 목록 (동적 컬럼/필터)
**파일:** `frontend/src/pages/spaces/WorkItemsListPage.tsx` (신규 또는 기존 IssuesListPage 확장)
**인터페이스:**
```tsx
// FieldDefinition 기반 컬럼 선택
// 상태/우선순위/담당자/프로세스 필터
// Create Issue 버튼 onClick 연결
```
**완료:** 작업 항목 목록에서 CRUD(Create 모달 → 상세 이동) + 동적 컬럼/필터 + 정렬

### T8. 작업 항목 상세 (동적 폼·링크·이력·승인)
**파일:** `frontend/src/pages/spaces/WorkItemDetailPage.tsx` (기존 IssueDetailPage 확장)
**인터페이스:**
```tsx
// DynamicForm 렌더링
// 링크 패널 (from/to, link type)
// 버전 이력 타임라인
// 승인/서명 모달 연동
```
**완료:** 작업 항목 상세에서 DynamicForm 렌더링, 링크 패널(from/to, link type, 확인/suspect), 버전 이력 타임라인(`GET /spaces/:key/issues/:issueKey/versions`), 승인/반려 서명 모달(Approval 기록)

### T9. WBS 편집
**파일:** `frontend/src/pages/spaces/WbsPage.tsx` (수정)
**인터페이스:**
```tsx
// POST/DELETE mutation 추가 (현재 GET/PUT만 있음)
// 드래그 앤 드롭으로 부모 변경
// 상태 옵션을 워크플로우 상태와 일치
```
**완료:** WBS에서 편집/상위 변경/자식 추가/삭제 가능 (update 시 parentId 지원, `DELETE /spaces/:key/issues/:issueKey`)

### T10. R&R 편집
**파일:** `frontend/src/pages/spaces/ResponsibilityPage.tsx` (수정)
**인터페이스:**
```tsx
// ProcessAssignment 기반 멤버 할당
// Owner single, Approver multiple
// 프로세스별 오버라이드
```
**완료:** R&R 매트릭스에서 책임 지정/해제, 멤버 할당 섹션 (`GET/POST/DELETE /spaces/:key/rr/assignments` — ProcessAssignment 기반, Owner 단일/Approver 다중)

---

## 4. 완료 기준 (M2)

1. FieldDefinition CRUD 백엔드 테스트 pass
2. WorkItem customFields 서버 검증 pass
3. 워크플로우 전이 검증 pass (임의 전이 불가)
4. suspect 링크 자동 탐지 pass
5. 프론트엔드: 동적 폼, 작업 목록, 작업 상세, WBS, R&R 편집 가능
6. CI 통과 (백엔드 테스트 + 빌드 + 프론트 빌드)
7. 골든 패스: 템플릿 → 프로젝트 → 요구사항 등록 → WBS → R&R → 전이 검증 → suspect 탐지

---

## 5. 다음 단계 (M3 연계)

M2 완료 후 M3는 문서·리뷰·승인·전자서명·기준선 잠금·Export·감사 뷰어·My Work를 다룬다.
