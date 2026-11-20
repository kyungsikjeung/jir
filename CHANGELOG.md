# CHANGELOG

모든 notable 변경은 이 파일에 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/)
를 따르며 버전 규칙은 [`docs/versions/README.md`](./docs/versions/README.md) 참조.

## [0.1.0] — 2026-11-20 — 파일럿 기준선 (태그 예정, 아직 생성되지 않음)

### 추가
- M1: 템플릿 레지스트리/버전, 프로세스 워크스페이스, 서버 RBAC, 감사 해시 체인,
  JWT DB 검증, 프로젝트 생성 API
- M2: 동적 작업 항목 타입/필드, customFields 서버 검증, 워크플로우 전이 검증,
  suspect 자동 탐지, 동적 폼/목록/WBS/R&R UI
- M3: 문서/리뷰/승인/전자서명/기준선 잠금/Export/감사 뷰어/My Work
- M4: 자동화 엔진(EngineRegistry + Workflow/Audit/Notification/Export),
  버전·릴리스 프로세스, 부트스트래핑
- `docs/pilot/ASPICE_PRINCIPLES_REVIEW.md`: 10원칙 증거 기반 반영 검토

### 보안
- 전자서명: 비밀번호 재인증 + 서버 HMAC-SHA256(버전/콘텐츠 해시 바인딩) +
  `POST /api/signatures/verify` + signerId 위조 차단 + 취소/변경 시 무효 처리
- 추적 링크 생성·suspect 해결 시 인증된 사용자 ID 강제 (`req.user.id`)

### 수정
- `resolveSuspect`가 새 행을 만들지 않고 기존 링크를 갱신
- 기준선 하드 락 + 기준선/current 비교 구현

## [미계획] — 차기 파일럿 개선

- 영향 분석 API, ChangeRequest 워크플로우
- 외부 이해관계자 포털, Keycloak SSO, E2E 테스트
