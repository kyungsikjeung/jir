# M3 문서·리뷰·승인·전자서명·기준선 잠금·Export·감사 뷰어·My Work 구현 계획

**일정:** 2주 (1인) / 1.5주 (2인)
**목표:** 문서 목록/상세/링크·리뷰 목록/상세/findings·승인 목록/상세/상태 반영·전자서명·기준선 비교/잠금·Export(문서 pdf/docx/html·traceability/compliance excel)·감사 해시 체인 뷰어·My Work(내 작업 항목/승인 대기)를 구현한다.
**완료 기준:** 문서/리뷰/승인/전자서명/기준선 잠금/Export/감사 뷰어/My Work 기능이 백엔드+프론트엔드 연동 완결, 백엔드 테스트 pass, 프론트 빌드 pass.

---

## 1. 데이터 모델 변경

### 1.1 신규 모델/엔드포인트

- `ElectronicSignature` (M1 존재) — 전자서명 기능 연동(sign/verify), 검증 상태 추적
- `Approval` (M1 존재, 인덱스 보완) — 승인 조회/반영 엔드포인트 신규
- `My Work` — 화면 기반 정의(뷰 없음): 내 작업 항목(assigneeId=현재 사용자), 승인 대기(Approval.approverId=현재 사용자)

### 1.2 스키마 변경

- `Baseline`: `isLocked Boolean @default(false)`, `lockedAt DateTime?`, `lockedById String?`, `lockReason String?` (잠금 후 BaselineItem 변경/추가 방지) — M3에서 추가

---

## 2. 백엔드 태스크 (TDD)

### T1. 문서 페이지 연결 + Export UI
**파일:** `backend/src/modules/documents/documents.controller.ts` (GET 문서 목록/상세), `backend/src/modules/traceability/traceability.controller.ts` (문서↔항목 링크 조회)
**인터페이스:**
```ts
// GET /api/spaces/:key/docs/pages  → 문서(페이지) 트리/목록
// GET /api/spaces/:key/trace/links?itemId=...  → 이미 구현됨(M2) — 문서 상세에 표시
```
**테스트:** `documents.controller.spec.ts` 문서 목록/상세 조회, 링크 표시 테스트
**완료:** 문서 목록/상세 API 연결, 문서 상세 페이지(DocsTree/PageDetail → 문서 상세 연결), Export 페이지(pdf/docx/html 링크)

### T2. 리뷰
**파일:** `backend/src/modules/workflows/workflows.controller.ts` + `workflows.service.ts`
**인터페이스:**
```ts
// GET /api/spaces/:key/reviews  (이미 존재)
// POST /api/spaces/:key/reviews (이미 존재)
// GET /api/spaces/:key/reviews/:id  (신규 — 리뷰 상세)
// POST /api/spaces/:key/reviews/:id/findings (이미 존재)
// PATCH /api/spaces/:key/reviews/:id  (신규 — status 변경/completedAt)
```
**테스트:** `workflows.service.spec.ts` 신규 — 리뷰 조회/수정, finding 생성
**완료:** 리뷰 페이지(목록/상세/finding 추가/상태 변경)

### T3. 승인
**파일:** `backend/src/modules/workflows/workflows.controller.ts` + `workflows.service.ts`
**인터페이스:**
```ts
// GET /api/workflows/approvals?spaceId=... (신규 — spaceId 추가로 승인 목록)
// POST /api/workflows/approvals (이미 존재)
// 승인 → 작업 항목 status 반영: Approval.decision='approved' → WorkItem.status='Approved'
```
**테스트:** `workflows.service.spec.ts` — 승인 목록 조회, 승인 시 작업 항목 상태 반영, 'Approved' 상태 정의 기반
**완료:** 승인 페이지(목록/상세/확인)

### T4. 전자서명
**파일:** 신규 `backend/src/modules/signatures/` (sign/verify endpoints)
**인터페이스:**
```ts
// POST /api/signatures { entityType, entityId, signerId, data }  → signature 발급
// GET /api/signatures?entityType=&entityId= → 서명 조회
```
**테스트:** `signatures.service.spec.ts` — 서명 생성/조회, 중복 방지
**완료:** 전자서명 페이지(작업 항목/문서 서명)

### T5. 기준선 잠금
**파일:** `backend/src/modules/compliance/compliance.controller.ts` + `compliance.service.ts`
**인터페이스:**
```ts
// GET /api/compliance/spaces/:key/baselines (이미 존재 — BaselineList)
// POST /api/compliance/spaces/:key/baselines/:id/lock { reason } (신규)
// GET /api/compliance/spaces/:key/baselines/:id/diff (신규 — BaselineItem 비교)
```
**테스트:** `compliance.service.spec.ts` — 잠금 생성, 잠금된 baseline의 BaselineItem 수정 거부, diff 비교
**완료:** 기준선 페이지(목록/비교/잠금)

### T6. Export
**파일:** Export endpoints 재확인(`export.controller.ts`) + `export.service.ts` (재사용)
**인터페이스:**
```ts
// GET /api/export/documents/:id/pdf|docx|html  (이미 존재)
// GET /api/export/spaces/:key/traceability/excel (이미 존재)
// GET /api/export/spaces/:key/compliance/excel (이미 존재)
```
**테스트:** `export.service.spec.ts` 신규 또는 경로 검증
**완료:** Export 페이지(문서 pdf/docx/html, traceability, compliance excel 링크)

### T7. 감사 뷰어
**파일:** `backend/src/modules/audit/audit.controller.ts` + `audit.service.ts`
**인터페이스:**
```ts
// GET /api/audit?entityType=&entityId= (이미 존재)
// POST /api/audit/verify (신규) — chainHash 검증 (verifyChain)
```
**테스트:** `audit.service.spec.ts` — findAll 필터, 해시 체인 검증
**완료:** 감사 페이지(해시 체인 검증 UI, EvidenceLink 표시), 해시 체인 검증 테스트

---

## 3. 프론트엔드 태스크

### T8. 문서 페이지 연결
**파일:** `frontend/src/pages/docs/PageDetailPage.tsx` (수정), `DocsTreePage.tsx`
**완료:** 문서 상세 페이지(제목/본문/링크 표시), 문서 목록/상세 연결

### T9. 리뷰 페이지
**파일:** `frontend/src/pages/reviews/ReviewsPage.tsx` (신규)
**완료:** 리뷰 목록/상세(finding 생성, 상태 변경)

### T10. 승인 페이지
**파일:** `frontend/src/pages/approvals/ApprovalsPage.tsx` (신규)
**완료:** 승인 목록/상세(확인, 반려)

### T11. 전자서명
**파일:** `frontend/src/pages/signatures/SignaturePage.tsx` 또는 작업 상세 확장 (신규)
**완료:** 전자서명 페이지/서명 목록

### T12. 기준선 페이지
**파일:** `frontend/src/pages/compliance/CompliancePage.tsx` (확장 또는 신규 `BaselinesPage.tsx`)
**완료:** 기준선 목록/비교(diff)/잠금 토글

### T13. Export 페이지
**파일:** `frontend/src/pages/export/ExportPage.tsx` (신규)
**완료:** 문서 pdf/docx/html, traceability, compliance excel 링크

### T14. 감사 페이지
**파일:** `frontend/src/pages/audit/AuditPage.tsx` (신규)
**완료:** 감사 로그 목록(entityType/entityId/action 필터), 해시 체인 검증 결과 표시

### T15. My Work 페이지
**파일:** `frontend/src/pages/mywork/MyWorkPage.tsx` (신규)
**완료:** 내 작업 항목(assigneeId=me), 승인 대기(Approval.approverId=me), 리뷰/finding 대기

---

## 4. 완료 기준 (M3)

1. 문서/리뷰/승인/전자서명/기준선 잠금/Export/감사 뷰어/My Work 기능 백엔드 테스트 pass
2. 잠긴 baseline에서 BaselineItem 변경 방지 테스트 pass
3. 승인 후 작업 항목 status 반영 테스트 pass
4. 프론트엔드: 문서 연결, 리뷰, 승인, 전자서명, 기준선, Export, 감사, My Work 페이지 동작
5. CI 통과 (백엔드 테스트 + 빌드 + 프론트 빌드)

---

## 5. 다음 단계 (M4)

M3 완료 후 M4는 자동화 엔진(engines/request-response 등), 부트스트래핑/모키케이션 진입점, 반복 실행 가능한 버전 및 실행 방법을 정립한다.
