# ASPICE ALM — 요구사항 정의서

## 1. 프로젝트 개요

### 1.1 목적
Jira + Confluence 느낌의 ALM(Application Lifecycle Management) 시스템을 구축하여, ASPICE(Automotive SPICE) 프로세스에 대응하는 소프트웨어 개발 라이프사이클 관리를 제공한다.

### 1.2 범위
- 요구사항 관리 (SYS.1~SYS.3, SWE.1)
- 설계 관리 (SWE.2, SWE.3)
- 구현/코드 관리 (SWE.4)
- 테스트 관리 (SWE.4~SWE.6)
- 추적성 매트릭스 (요구사항→설계→코드→테스트)
- 구성/변경 관리 (SUP.8, SUP.10)
- 리뷰/승인 (SUP.1, SUP.2, SUP.4)
- 문서/지식 관리 (Confluence 스타일)
- ASPICE 컴플라이언스 대시보드
- 멀티 프로젝트 관리
- 내부/외부 이해관계자 관리
- AI 연동 (MCP Server)

### 1.3 사용자
- 내부: 임직원 (회사 이메일 자동 인증)
- 외부: 고객, 공급사, 심사원, 파트너, 규제기관 (관리자 승인)
- 관리자: Admin, Super Admin

---

## 2. 기술 스택 (확정)

| 레이어 | 기술 |
|---|---|
| 백엔드 | Node.js + NestJS (TypeScript) |
| 프론트엔드 | React + Vite + TypeScript |
| 모바일 | Flutter (iOS + Android) |
| DB | PostgreSQL 16 + Redis 7 |
| 검색 | PostgreSQL FTS + Meilisearch |
| 파일 저장 | MinIO (S3 호환) |
| 인증 | Keycloak 24 |
| 실시간 | WebSocket (Socket.io) + SSE |
| 리버스 프록시 | Caddy |
| 배포 | Docker Compose (OCI 무료 티어) |
| CI/CD | GitHub Actions |
| ORM | Prisma |
| 에디터 | TipTap (ProseMirror) |

---

## 3. 기능 요구사항

### 3.1 인증 & 사용자 관리 (FR-AUTH)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-AUTH-01 | 회사 이메일 도메인으로 내부/외부 사용자 자동 판별 | P0 |
| FR-AUTH-02 | 내부 사용자: 이메일 인증만으로 자동 승인 | P0 |
| FR-AUTH-03 | 외부 사용자: 이메일 인증 + 관리자 승인 필요 | P0 |
| FR-AUTH-04 | Keycloak SSO 연동 (SAML/OIDC) | P1 |
| FR-AUTH-05 | 2FA (OTP) 지원 | P2 |
| FR-AUTH-06 | LDAP/Active Directory 연동 | P2 |
| FR-AUTH-07 | 슈퍼관리자: 시스템 설정, 전체 감사 로그, 관리자 역할 부여 | P0 |
| FR-AUTH-08 | 관리자: 사용자 승인/거절, 역할 부여/회수 | P0 |
| FR-AUTH-09 | 계정 비활성화/활성화 | P0 |
| FR-AUTH-10 | 임시 권한 (만료일 설정) | P1 |

### 3.2 프로젝트 (Space) 관리 (FR-SPACE)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-SPACE-01 | 프로젝트 생성 (이름, 키, 템플릿 선택) | P0 |
| FR-SPACE-02 | 프로젝트 키 자동 생성 (URL-safe, 고유) | P0 |
| FR-SPACE-03 | 프로젝트 생성 시 자동 프로비저닝 (워크플로우, 템플릿, 역할, 홈 페이지) | P0 |
| FR-SPACE-04 | 프로젝트 템플릿 (ASPICE Level 2/3) | P1 |
| FR-SPACE-05 | 프로젝트별 멤버 관리 (추가/제거/역할 변경) | P0 |
| FR-SPACE-06 | 프로젝트별 설정 (워크플로우, 템플릿, 알림, ASPICE) | P1 |
| FR-SPACE-07 | 프로젝트 아카이브/복원 | P2 |
| FR-SPACE-08 | 프로젝트 그룹 (차량 프로그램 단위) | P2 |
| FR-SPACE-09 | 교차 프로젝트 링크 | P2 |

### 3.3 워크 아이템 (Issue + Page 통합) (FR-WI)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-WI-01 | 통합 객체 (type으로 구분: task, bug, story, epic, requirement, test_case, page) | P0 |
| FR-WI-02 | CRUD (생성/조회/수정/삭제) | P0 |
| FR-WI-03 | 상태 워크플로우 (프로세스별 상태 머신) | P0 |
| FR-WI-04 | 우선순위, 담당자, 라벨, 컴포넌트 | P0 |
| FR-WI-05 | 부모-자식 계층 (Epic → Story → Sub-task) | P0 |
| FR-WI-06 | 이슈 링크 (blocks, relates, duplicates, verifies, satisfies, implements, derives) | P0 |
| FR-WI-07 | 버전 관리 (변경 이력) | P0 |
| FR-WI-08 | 커스텀 필드 | P1 |
| FR-WI-09 | 감시자 (Watcher) | P1 |
| FR-WI-10 | JQL 유사 쿼리 검색 | P1 |
| FR-WI-11 | 벌크 편집 | P2 |

### 3.4 문서/지식 관리 (Confluence) (FR-DOC)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-DOC-01 | 리치 텍스트 에디터 (TipTap, 블록 기반) | P0 |
| FR-DOC-02 | 페이지 트리 (부모-자식 계층) | P0 |
| FR-DOC-03 | 버전 히스토리 (diff 비교) | P0 |
| FR-DOC-04 | 인라인 댓글 + 스레드 | P0 |
| FR-DOC-05 | 첨부파일 (이미지, PDF 등) | P0 |
| FR-DOC-06 | @멘션 | P1 |
| FR-DOC-07 | 페이지 템플릿 (ASPICE 산출물) | P0 |
| FR-DOC-08 | 라벨/즐겨찾기 | P1 |
| FR-DOC-09 | 페이지 잠금 (동시 편집 방지) | P0 |
| FR-DOC-10 | PDF/Word export | P1 |
| FR-DOC-11 | Confluence 호환 매크로 (Jira 이슈 임베드 등) | P2 |

### 3.5 요구사항 관리 (FR-REQ)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-REQ-01 | 요구사항 CRUD (시스템/소프트웨어/인터페이스) | P0 |
| FR-REQ-02 | ASIL 레벨 (QM/A/B/C/D) | P0 |
| FR-REQ-03 | 파생 관계 (상위→하위 요구사항) | P0 |
| FR-REQ-04 | 검증 방법 (test, analysis, inspection, demonstration) | P1 |
| FR-REQ-05 | 수용 기준 (Acceptance Criteria) | P1 |
| FR-REQ-06 | 요구사항 리뷰/승인 워크플로우 | P0 |
| FR-REQ-07 | 외부 도구 연동 (DOORS, Polarion) | P2 |

### 3.6 테스트 관리 (FR-TEST)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-TEST-01 | 테스트 케이스 CRUD (단계, 사전/사후 조건) | P0 |
| FR-TEST-02 | 테스트 스위트 (그룹핑) | P1 |
| FR-TEST-03 | 테스트 실행 (Run) + 결과 (Pass/Fail/Blocked) | P0 |
| FR-TEST-04 | 증적 (스크린샷, 로그) 첨부 | P0 |
| FR-TEST-05 | 결함 자동 생성 (실패 시) | P1 |
| FR-TEST-06 | 자동화 테스트 연동 (JUnit, pytest 등) | P2 |
| FR-TEST-07 | 테스트 커버리지 (요구사항→테스트) | P0 |

### 3.7 추적성 (FR-TRACE)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-TRACE-01 | 범용 추적성 링크 (from→to, 타입화) | P0 |
| FR-TRACE-02 | 양방향 추적성 (요구사항↔설계↔코드↔테스트) | P0 |
| FR-TRACE-03 | Suspect Link 자동 감지 (변경 시 재검증 필요 표시) | P0 |
| FR-TRACE-04 | 추적성 매트릭스 UI (그래프/테이블) | P0 |
| FR-TRACE-05 | 커버리지 계산 (요구사항 커버리지 %) | P0 |
| FR-TRACE-06 | 베이스라인 시점 스냅샷 | P1 |

### 3.8 구성/변경 관리 (FR-CM)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-CM-01 | 베이스라인 생성/승인/릴리스 | P0 |
| FR-CM-02 | 베이스라인 스냅샷 (모든 항목 상태) | P0 |
| FR-CM-03 | 변경 요청 (CR) 생성/승인 | P0 |
| FR-CM-04 | 영향 분석 (affected items) | P1 |
| FR-CM-05 | 구성 항목 (CI) 관리 | P1 |
| FR-CM-06 | 릴리스 관리 | P1 |

### 3.9 워크플로우 & 리뷰 (FR-WF)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-WF-01 | 프로세스별 워크플로우 (SWE.1~SWE.6) | P0 |
| FR-WF-02 | 상태 전이 (조건, 사후 액션) | P0 |
| FR-WF-03 | 커스텀 워크플로우 생성 | P1 |
| FR-WF-04 | 리뷰 세션 (코드/설계/요구사항/문서) | P0 |
| FR-WF-05 | 리뷰 지적 사항 (Finding) | P0 |
| FR-WF-06 | 승인 (전자서명 포함) | P0 |
| FR-WF-07 | Kanban/Scrum 보드 | P0 |

### 3.10 ASPICE 컴플라이언스 (FR-ASPICE)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-ASPICE-01 | ASPICE 프로세스 영역 정의 (SYS, SWE, SUP, MAN) | P0 |
| FR-ASPICE-02 | 프로세스별 체크리스트 | P0 |
| FR-ASPICE-03 | 컴플라이언스 대시보드 (프로세스별 완료율) | P0 |
| FR-ASPICE-04 | 산출물 템플릿 (SRS, SAD, SDD 등) | P0 |
| FR-ASPICE-05 | 프로세스 평가 (Capability Level) | P1 |
| FR-ASPICE-06 | 증적 수집 (감사 로그 → ASPICE 매핑) | P0 |

### 3.11 이해관계자 관리 (FR-STAKE)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-STAKE-01 | 내부/외부 이해관계자 유형 정의 | P0 |
| FR-STAKE-02 | 외부 조직 관리 (고객사, 공급사, 심사원 등) | P0 |
| FR-STAKE-03 | 유형별 접근 정책 (허용 액션, 문서 접근 범위, 데이터 필터) | P0 |
| FR-STAKE-04 | 프로젝트별 이해관계자 접근 설정 | P0 |
| FR-STAKE-05 | 초대 관리 (이메일, 토큰, 만료) | P0 |
| FR-STAKE-06 | NDA 서명 관리 | P1 |
| FR-STAKE-07 | 외부 사용자 포털 (릴리스된 문서만) | P0 |
| FR-STAKE-08 | 워터마크 PDF export | P1 |

### 3.12 알림 (FR-NOTIF)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-NOTIF-01 | 인앱 알림 (WebSocket 실시간) | P0 |
| FR-NOTIF-02 | 이메일 알림 (Keycloak SMTP) | P0 |
| FR-NOTIF-03 | @멘션 알림 | P1 |
| FR-NOTIF-04 | 알림 설정 (유형별 on/off) | P1 |
| FR-NOTIF-05 | 알림 이력 | P1 |

### 3.13 검색 (FR-SEARCH)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-SEARCH-01 | 전문 검색 (제목, 본문, 코멘트) | P0 |
| FR-SEARCH-02 | 타이포 허용 (Meilisearch) | P1 |
| FR-SEARCH-03 | 필터 (프로젝트, 상태, 우선순위, ASIL, ASPICE) | P0 |
| FR-SEARCH-04 | 자동완성 | P1 |
| FR-SEARCH-05 | JQL 유사 쿼리 | P1 |
| FR-SEARCH-06 | CQL 유사 쿼리 (문서) | P1 |

### 3.14 MCP Server (FR-MCP)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-MCP-01 | MCP SSE 엔드포인트 (연결) | P0 |
| FR-MCP-02 | MCP JSON-RPC 엔드포인트 (메시지) | P0 |
| FR-MCP-03 | tools/list (도구 목록) | P0 |
| FR-MCP-04 | tools/call (도구 실행) | P0 |
| FR-MCP-05 | resources/list, resources/read (페이지 Resource) | P1 |
| FR-MCP-06 | Jira/Confluence 호환 도구 (search, get, create, update) | P0 |
| FR-MCP-07 | ALM 확장 도구 (traceability, coverage, compliance, baseline) | P0 |
| FR-MCP-08 | API Key 관리 (슈퍼관리자) | P0 |
| FR-MCP-09 | MCP 감사 로그 | P0 |

### 3.15 REST API (FR-API)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-API-01 | Jira 호환 REST API (/rest/api/3/...) | P1 |
| FR-API-02 | Confluence 호환 REST API (/rest/api/content/...) | P1 |
| FR-API-03 | ALM 확장 REST API (/api/alm/...) | P0 |
| FR-API-04 | OpenAPI/Swagger 문서 | P1 |
| FR-API-05 | Webhook (이벤트 발송) | P2 |

### 3.16 Git/CI 연동 (FR-GIT)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-GIT-01 | GitHub/GitLab 연동 (OAuth) | P1 |
| FR-GIT-02 | 스마트 커밋 (키워드 → 이슈 상태 전이) | P1 |
| FR-GIT-03 | PR/MR → 이슈 자동 링크 | P1 |
| FR-GIT-04 | CI/CD 파이프라인 연동 (빌드/테스트 결과) | P2 |
| FR-GIT-05 | 코드 커버리지 연동 | P2 |

### 3.17 애자일 (FR-AGILE)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-AGILE-01 | Kanban 보드 (드래그앤드롭) | P0 |
| FR-AGILE-02 | Scrum 보드 + 스프린트 | P1 |
| FR-AGILE-03 | 백로그 관리 (랭킹) | P1 |
| FR-AGILE-04 | 번다운 차트 | P2 |

---

## 4. 비기능 요구사항 (NFR)

### 4.1 성능

| ID | 요구사항 | 목표 |
|---|---|---|
| NFR-PERF-01 | 페이지 로딩 시간 | < 2초 |
| NFR-PERF-02 | 검색 응답 시간 | < 500ms |
| NFR-PERF-03 | API 응답 시간 (P95) | < 1초 |
| NFR-PERF-04 | 동시 사용자 | 50명 (MVP) |
| NFR-PERF-05 | 데이터 보존 | 5년 |

### 4.2 보안

| ID | 요구사항 |
|---|---|
| NFR-SEC-01 | JWT 기반 인증 (Keycloak) |
| NFR-SEC-02 | 역할 기반 접근 제어 (RBAC) |
| NFR-SEC-03 | 3단계 권한 (Global → Space → Work Item) |
| NFR-SEC-04 | 외부 사용자 데이터 필터링 (ASIL, 상태) |
| NFR-SEC-05 | 감사 로그 (모든 변경 기록) |
| NFR-SEC-06 | HTTPS (Caddy 자동 인증서) |
| NFR-SEC-07 | 파일 업로드 크기 제한 (50MB) |
| NFR-SEC-08 | Rate Limiting (API, MCP) |

### 4.3 가용성

| ID | 요구사항 | 목표 |
|---|---|---|
| NFR-AVAIL-01 | 서비스 가용성 | 99% (MVP) |
| NFR-AVAIL-02 | 백업 | 일 1회 자동 백업 |
| NFR-AVAIL-03 | 복구 시간 (RTO) | < 4시간 |

### 4.4 호환성

| ID | 요구사항 |
|---|---|
| NFR-COMP-01 | 브라우저: Chrome, Firefox, Safari, Edge (최신 2버전) |
| NFR-COMP-02 | 모바일: iOS 15+, Android 10+ |
| NFR-COMP-03 | Jira/Confluence API 호환 (마이그레이션 지원) |

---

## 5. 데이터 모델 (DB 스키마)

### 5.1 핵심 테이블 (12개 SQL 파일)

```
db/schema/
├── 01_core.sql          # users, organizations, roles, permissions
├── 02_spaces.sql        # spaces, space_members, components, labels, versions
├── 03_work_items.sql    # work_items, work_item_links, versions, custom_fields
├── 04_docs.sql          # pages, comments, attachments, favorites
├── 05_requirements.sql  # requirements, relations, change_history
├── 06_tests.sql         # test_cases, test_runs, test_results, defects
├── 07_traceability.sql  # trace_links, matrix_snapshots, suspect_links
├── 08_config.sql        # baselines, configuration_items, change_requests, releases
├── 09_workflow.sql      # workflows, states, transitions, reviews, approvals
├── 10_audit.sql         # audit_log, evidence_links, notifications
├── 11_process.sql       # process_areas, assessments, compliance_checklists
└── 12_agile.sql         # boards, sprints, sprint_items, backlog_ranking
```

### 5.2 DBML (인증/권한)

```
db/auth.dbml            # 사용자, 역할, 권한, 스페이스 멤버
db/auth_approval.dbml   # 내부/외부 인증, 승인 워크플로우, 슈퍼관리자
```

---

## 6. URL 라우팅

```
/spaces/{spaceKey}                    → 프로젝트 홈
/spaces/{spaceKey}/issues             → 이슈 목록
/spaces/{spaceKey}/issues/{issueKey}  → 이슈 상세
/spaces/{spaceKey}/docs              → 문서 트리
/spaces/{spaceKey}/docs/{pageId}     → 페이지 상세
/spaces/{spaceKey}/trace            → 추적성 매트릭스
/spaces/{spaceKey}/compliance       → ASPICE 대시보드
/spaces/{spaceKey}/compliance/{proc} → 프로세스 상세
/admin                              → 관리자 대시보드
/super-admin                        → 슈퍼관리자 대시보드
/portal/{spaceKey}                  → 외부 포털
/api/v1/...                         → REST API
/mcp/sse                            → MCP SSE
```

---

## 7. 개발 로드맵

### Phase 1: MVP (4주)
- Docker Compose 인프라 (PostgreSQL, Redis, Keycloak, MinIO)
- NestJS 프로젝트 + Prisma + DB 스키마
- Keycloak 연동 (인증, 역할)
- Space CRUD + 멤버 관리
- Work Item CRUD (Issue + Page)
- 문서 에디터 (TipTap) + 버전 관리
- 코멘트 + 첨부파일
- Kanban 보드
- 기본 추적성 (requirement ↔ test_case 링크)
- 감사 로그

### Phase 2: ALM 핵심 (3주)
- 워크플로우 엔진 (상태 전이, 조건)
- 리뷰 + 승인 (전자서명)
- 베이스라인 + 버전 관리
- 추적성 매트릭스 UI + 커버리지
- Suspect Link 자동 감지
- Meilisearch 연동 (검색)
- WebSocket 알림
- 이메일 알림
- MCP Server (기본 도구)

### Phase 3: ASPICE 완성 (3주)
- ASPICE 산출물 템플릿 (SRS, SAD, SDD 등)
- 컴플라이언스 대시보드
- 프로세스별 체크리스트
- 프로젝트 템플릿 (ASPICE Level 2)
- 이해관계자 관리 (외부 조직, 접근 정책, 초대)
- 외부 포털 (릴리스된 문서)
- NDA 서명

### Phase 4: 연동 & 고도화 (2주)
- GitHub/GitLab 연동 (스마트 커밋)
- CI/CD 파이프라인 연동
- Jira/Confluence 호환 REST API
- MCP Server (전체 도구)
- Flutter 모바일 앱 (기본)
- PDF export (워터마크)

---

## 8. MCP 도구 목록 (20+)

### Jira/Confluence 호환
- alm_search_issues, alm_get_issue, alm_create_issue, alm_update_issue
- alm_transition_issue, alm_add_comment, alm_link_issues
- alm_search_pages, alm_get_page, alm_create_page, alm_update_page

### ALM 확장
- alm_get_traceability, alm_get_coverage
- alm_get_compliance_status, alm_create_baseline
- alm_get_project_summary

---

## 9. AI 프롬프트 패턴

### Backend (NestJS)
```
"SpaceService를 구현해줘.
- createSpace(name, key, templateId): Space
- getSpace(key): Space
- updateSpace(key, data): Space
- addMember(spaceKey, userId, roleId): SpaceMember
- removeMember(spaceKey, userId): void
- checkPermission(userId, spaceKey, permissionCode): boolean"
```

### Frontend (React)
```
"SpaceDashboard 페이지를 만들어줘.
- 프로젝트 요약 (이슈 수, 커버리지, ASPICE 현황)
- 최근 활동 피드
- 빠른 액션 (이슈 생성, 문서 생성, 보드 보기)
- ASPICE 컴플라이언스 미니 차트"
```

---

## 10. 개발 시작 체크리스트

- [ ] Docker Compose 파일 작성
- [ ] PostgreSQL + Prisma 스키마
- [ ] Keycloak Realm/Client 설정
- [ ] NestJS 프로젝트 생성 + 모듈 구조
- [ ] React + Vite 프로젝트 생성 + 라우팅
- [ ] Keycloak 연동 (Backend + Frontend)
- [ ] DB 스키마 적용 (마이그레이션)
- [ ] 기본 CRUD API (Space, WorkItem)
- [ ] 기본 UI (로그인, 대시보드, 프로젝트 목록)