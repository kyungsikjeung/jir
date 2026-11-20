# ASPICE/ALM 10원칙 반영 검토 (2026-11-20)

사용자가 제시한 10개 원칙이 현재 코드베이스(M1~M4 구현 완료, 0.1.0 파일럿 기준선)에
실제로 반영되었는지 **코드 증거 기반**으로 검토한 결과.
M4 완료 후 원칙 9·10 상태를 갱신했다(2026-11-20).

상태 범례:
- **반영** — 원칙이 데이터 모델 + 서비스 + UI까지 구현됨
- **부분** — 기반은 있으나 일부가 비어 있거나 연결이 끊김
- **미반영** — 모델/스텁만 있거나 아직 없음

전체 테스트: 16 suites / 98 tests pass (M4 완료 시점 기준, 앱 기동 스모크 통과).

---

## 1. Single Source of Truth — **반영**

근거:
- `WorkItem` 하나에 요구사항/테스트/버그/문서가 타입으로 통합 (`work_items`)
- `WorkItem.customFields` JSONB + `FieldDefinition`으로 동적 속성도 같은 레코드에 저장
- 프로젝트(space)가 보안·데이터·기준선 경계 (`spaces`, `SpaceMember`, `ProcessAccessGrant`)
- 프로세스는 별도 subspace가 아닌 `ProcessWorkspace` 뷰 → 크로스 프로세스 링크가 프로젝트 내부에 유지
- 기준선·감사·서명이 모두 같은 space/work item을 참조

판정: 산출물이 흩어지지 않고 한 DB/space에 모이는 구조는 달성.

---

## 2. Traceability Must Be Built In — **부분 →大体 반영**

반영된 부분:
- 양방향 링크: `createLink`가 `verified_by` ↔ `verifies` 역링크를 함께 생성
  (`traceability.service.ts:36-40`)
- **자동 suspect 탐지**: `WorkItemsService.update()`가 `markSuspect()`를 호출
  (`work-items.service.ts:262`) → 산출물 변경 시 연결 링크에 `isSuspect=true`
- `resolveSuspect`가 기존 링크를 갱신하도록 수정됨 (`traceability.service.ts:189`)
- 커버리지 계산 + `GET coverage` (`traceability.controller.ts:13`)

남은 갭:
- **영향 분석(impact analysis) 미구현** — 변경 전파 범위를 보여주는 API/UI 없음
  (suspect 플래그는 있으나 "무엇이 얼마나 영향받는지" 분석 없음)
- 링크 생성자 위조 가능 갭은 **보완 완료**: `createLink`/`resolveSuspect`가
  `req.user?.id`를 강제 사용하도록 수정 (`traceability.controller.ts`)
- TraceabilityPage에 링크 생성/삭제 UI가 붙어 있는지 확인 필요

---

## 3. Ownership Becomes Explicit and Enforceable — **반영**

근거:
- `ProcessAssignment` (프로세스 × 역할 × 사용자, primary 플래그)
- `RoleResponsibility` R&R 매트릭스 (역할 × 프로세스 × 책임)
- 서버 측 RBAC: `PolicyService.can()/canProcess()` + `@RequirePermission` 가드
- 감사 로그에 `actorId` 기록 + 해시 체인 (`AuditService`)
- 승인자·서명자·작성자가 각각 레코드에 남음 (`Approval.approverId`,
  `ElectronicSignature.signerId`, `WorkItem.reporterId`)

판정: "누가 만들고/검토하고/승인했는지"는 구조적으로 보장.

단, 서명 `signerId`가 요청 body에서 그대로 들어옴(아래 7번 갭 참조).

---

## 4. Progress Is Measured Objectively — **부분**

반영된 부분:
- `GET /coverage` 커버리지 수치
- 컴플라이언스 체크리스트/산출물 상태
- 대시보드가 실제 DB 데이터를 조회

남은 갭:
- "미해결 finding / 미완료 승인 / 열린 의존성"을 한 화면에서 보는
  객관적 지표 대시보드가 없음 (My Work는 개인 할당 중심)
- 커버리지가 요구사항→테스트Case 중심이며 설계/코드 커버리지는 없음

---

## 5. Change Control Happens in Real Time — **부분**

반영된 부분:
- **기준선 하드 락**: `Baseline.isLocked`, `assertBaselineUnlocked()`가
  잠긴 기준선 변경을 거부 (`compliance.service.ts:149,207`)
- **기준선 vs 현재 비교**: `getBaselineDiff()` (`compliance.service.ts:164`)
- 요구사항/문서 변경 시 suspect 자동 표시(실시간 전파)

남은 갭:
- **ChangeRequest(CR) 워크플로우 없음** — 스키마에 `ChangeRequest` 모델은 있으나
  서비스/컨트롤러/UI 없음. "영향 분석 → CR 승인 → 기준선 변경" 흐름 미완성
- M3 계획에는 CR이 명시되지 않음 → M5 이후 과제로 명시 필요

---

## 6. Consistency Across Teams and Suppliers — **반영**

근거:
- `TemplatePackage` + `TemplateVersion` (조직 레벨 템플릿, 버전 고정)
- 프로젝트 생성 시 템플릿 스냅샷 인스턴스화 → 프로세스/필드/워크플로우 일괄 적용
- RBAC + R&R 템플릿으로 역할/책임 표준화
- 모든 변경이 감사 로그로 남아 편차 추적 가능

판정: 템플릿 기반 일관성 적용은 달성. 공급사 간 적용은 8번 참조.

---

## 7. Evidence Is Generated as a Byproduct — **부분 (중요 갭)**

반영된 부분:
- `AuditService.log()`가 모든 상태 변경 호출 + **해시 체인**
  (`previousHash`/`chainHash`, `verifyChain()`)
- 감사 뷰어 + `POST /audit/verify` (M3 T7)
- Export 페이지(PDF/DOCX/HTML/XLSX) (M3 T1)
- 서명 레코드가 `isEvidence`/`evidenceTag`를 가짐

**보완 완료 (검토 당일 조치):**
검토 시점에는 HMAC/검증/재인증이 없어 서명이 "서명 기록 UI"에 가까웠으나, 즉시 보완함:
- `SignaturesService.sign()`이 **비밀번호 재인증** 후 서명
  (bcrypt/레거시 base64 모두 지원)
- 서버 HMAC-SHA256 over
  `entityType|entityId|signedVersionId|contentHash|signerId|signedAt`
  → `signatureHash`에 저장 (`SIGNATURE_SECRET` 환경변수, 미설정 시 JWT secret 폴백)
- `contentHash`(제목/설명/상태/customFields/version의 표준 해시) +
  `signedVersionId`(버전) 동시 저장 → **내용이 바뀌면 서명 무효**
- `POST /api/signatures/verify` 검증 엔드포인트 추가
  (취소 여부 + 콘텐츠 변경 + HMAC 무결성 검사, 실패 시
  `verificationStatus='invalid'` 기록)
- `signerId`를 **컨트롤러가 `req.user.id`로 강제 주입** → body 위조 차단
- 프런트: 비밀번호 재인증 입력, 서명 검증 버튼/결과, 무효 배지 표시
- 마이그레이션 `20261120000000_m4_signature_hash` (`signatureHash` 컬럼)
- 테스트 11개 (HMAC 생성/재인증 거부/대상 없음/콘텐츠 변경/취소/검증)

→ 원칙 7의 핵심("audit-ready by design") 충족.

남은 소객: 기준선 릴리스 시점 자동 서명 요청/서명 만료 정책은 M5 과제.

---

## 8. Supplier Interfaces Become Structured — **미반영**

현재 상태:
- `User.isExternal`, `external_stakeholder` 역할, `ProcessAccessGrant` 만료/권한 모델은 존재
- 그러나 외부 이해관계자 **포털 UI 없음**, 초대·이메일 인증·관리자 승인 플로우 미완성
- NDA 모델/서명 없음, 공급사 간 구조화된 교환 인터페이스 없음

→ M5 과제(README 로드맵의 "외부 이해관계자 포털")로 명시.

---

## 9. Manual Overhead Is Reduced — **부분 → 대부분 반영**

반영된 부분:
- 워크플로우 전이 시 guard condition 평가 + postActions 자동 실행
  → `WorkflowEngine`으로 이관되어 엔진 API(`POST /api/engines/workflow/*`)로도 실행/검증 가능
- suspect 자동 탐지, 감사 자동 기록, 커버리지 자동 계산
- M4 완료: `EngineRegistry` + Workflow/Audit/Notification/Export 엔진 구현 및
  `GET /api/engines`로 등록 확인 가능

남은 갭:
- NotificationEngine은 알림을 DB에 저장만 하고 전달 채널(WebSocket/이메일)이 없음
- 검색 인덱싱은 여전히 스텁 → 수동 확인이 일부 남아 있음

---

## 10. ASPICE Becomes Sustainable — **반영**

반영된 부분:
- 프로세스가 템플릿/워크플로우/감사에 박혀 있어 "따르는 것이 기본 동작"이 되도록 설계됨
- 마이그레이션 → 시드 → 서버 기동 반복 가능성 확보(M1)
- M4 완료: 버전/릴리스 정책(`docs/versions/README.md`), `CHANGELOG.md`,
  `RELEASE.md` 체크리스트, `scripts/bootstrap.sh`/`Makefile` 부트스트래핑 제공
- 앱 전체 DI 그래프 부트 + `/api/engines` 라우트 매핑 스모크 확인

남은 갭:
- `v0.1.0` 태그는 아직 생성되지 않음 — `RELEASE.md` 체크리스트 통과 후 부여 예정

---

## 종합

| # | 원칙 | 상태 |
|---|------|------|
| 1 | Single Source of Truth | 반영 |
| 2 | Traceability Built In | 부분 (영향 분석 없음, 위조 갭 해결) |
| 3 | Ownership Explicit | 반영 (서명자 위조 차단 포함) |
| 4 | Progress Objective | 부분 |
| 5 | Change Control Real Time | 부분 (CR 없음) |
| 6 | Consistency Across Teams | 반영 |
| 7 | Evidence as Byproduct | 반영 (HMAC/검증/재인증 보완 완료) |
| 8 | Supplier Interfaces | 미반영 |
| 9 | Manual Overhead Reduced | 대부분 반영 (엔진 구현, 알림 전달/검색 잔여) |
| 10 | Sustainability | 반영 (v0.1.0 태그 대기) |

**즉시 보완 가치가 높은 순서**
1. ~~전자서명 HMAC/검증/재인증~~ → 완료
2. ~~링크 생성자 인증~~ 완료 / 영향 분석 API는 잔여 (원칙 2)
3. ChangeRequest 워크플로우 (원칙 5)
4. ~~M4 엔진/버전문서 완성~~ → 완료 (v0.1.0 태그만 대기)
5. 공급사 포털 (원칙 6·8, M5)

이 문서는 M4 T2(버전/릴리스 문서) 산출물로도 활용한다.
