# Just Enough Spec — ASPICE ALM

> 모듈별 200줄 이내의 "Just Enough" 명세.
> AI가 이 문서만 보고 정확하게 구현할 수 있도록 작성.
> 각 모듈: Requirements → API Contract → Data Model → Business Rules → Dependencies → Acceptance Criteria

---

## Module: Spaces (프로젝트)

### Requirements
- FR-SPACE-001: 프로젝트 생성 (이름, 키, 템플릿)
- FR-SPACE-002: 자동 프로비저닝 (워크플로우, 템플릿, 역할, 홈 페이지)
- FR-SPACE-003: 프로젝트 목록/상세 조회
- FR-SPACE-004: 프로젝트 수정/삭제/아카이브
- FR-SPACE-005: 멤버 추가/제거/역할 변경
- FR-SPACE-006: 프로젝트 설정 (워크플로우, 템플릿, 알림, ASPICE)

### API Contract
```
GET    /spaces                    → SpaceListResponse[]
GET    /spaces/:key               → SpaceDetailResponse
POST   /spaces                    → CreateSpaceDto → SpaceResponse
PUT    /spaces/:key               → UpdateSpaceDto → SpaceResponse
DELETE /spaces/:key               → 204
GET    /spaces/:key/members       → SpaceMemberResponse[]
POST   /spaces/:key/members       → AddMemberDto → SpaceMemberResponse
DELETE /spaces/:key/members/:userId → 204
GET    /spaces/:key/settings      → SpaceSettingsResponse
PUT    /spaces/:key/settings      → UpdateSettingsDto → SpaceSettingsResponse
```

### Data Model
```prisma
model Space { id, orgId, key, name, description, spaceType, aspiceLevel, automotiveDomain, processProfile, isArchived, createdById, createdAt, updatedAt }
model SpaceMember { spaceId, userId, roleId, addedById, addedAt }
model SpaceSettings { spaceId, defaultPageTemplateId, allowAnonymousView, requireApprovalForRelease, minApprovers, autoSuspectLinks, requireTraceForRelease, notificationChannels, aspiceLevel, requireEvidenceForAll }
model Component { id, spaceId, name, description, leadUserId, createdAt }
model Label { id, spaceId, name, color }
model Version { id, spaceId, name, description, releaseDate, status, createdAt }
```

### Business Rules
- 프로젝트 키: 2~10자 영문 대문자+숫자, 조직 내 고유
- 생성 시 자동 프로비저닝: SpaceProcessArea(N개), Workflow(6개), PageTemplate(5개), Role(6개), HomePage(1개), SpaceSettings(1개)
- 멤버 추가 시 permission_audit_log 기록
- 아카이브된 프로젝트는 수정 불가 (400)
- 프로젝트 삭제 시 cascade (WorkItems, SpaceMembers 등)

### Dependencies
- PrismaService, AuthService (권한), AuditService, TemplateService

### Acceptance Criteria
- [ ] 프로젝트 생성 시 워크플로우 6개 자동 생성
- [ ] 프로젝트 생성 시 역할 6개 자동 생성
- [ ] 멤버 추가 시 감사 로그 기록
- [ ] 권한 없는 사용자 접근 시 403 반환
- [ ] 아카이브된 프로젝트 수정 시 400 반환

---

## Module: WorkItems (이슈 + 페이지 통합)

### Requirements
- FR-WI-001: 통합 객체 (type으로 구분)
- FR-WI-002: CRUD
- FR-WI-003: 상태 워크플로우 (프로세스별)
- FR-WI-004: 우선순위, 담당자, 라벨, 컴포넌트
- FR-WI-005: 부모-자식 계층
- FR-WI-006: 이슈 링크 (typed)
- FR-WI-007: 버전 관리
- FR-WI-008: JQL 유사 쿼리

### API Contract
```
GET    /spaces/:key/issues                    → WorkItemListResponse[]
GET    /spaces/:key/issues/:issueKey           → WorkItemDetailResponse
POST   /spaces/:key/issues                    → CreateWorkItemDto → WorkItemResponse
PUT    /spaces/:key/issues/:issueKey          → UpdateWorkItemDto → WorkItemResponse
DELETE /spaces/:key/issues/:issueKey          → 204
POST   /spaces/:key/issues/:issueKey/transitions → { transition, comment } → WorkItemResponse
POST   /spaces/:key/issues/:issueKey/comments  → { body } → CommentResponse
POST   /spaces/:key/issue-links               → { from, to, linkType } → LinkResponse
```

### Data Model
```prisma
model WorkItem { id, spaceId, typeId, key, title, description, status, priority, assigneeId, reporterId, parentId, epicId, workflowStateId, version, baselineId, body, bodyText, labels, components, fixVersions, dueDate, storyPoints, aspiceProcess, asilLevel, estimatedHours, actualHours, progressPercent, startDate, endDate, createdAt, updatedAt, resolvedAt }
model WorkItemLink { id, fromId, toId, linkType, createdById, createdAt }
model WorkItemVersion { id, workItemId, version, title, body, bodyText, changedById, changeSummary, createdAt }
model WorkItemWatcher { workItemId, userId, addedAt }
```

### Business Rules
- 키 자동 생성: {SPACE_KEY}-{순번} (ADAS-1, ADAS-2, ...)
- 상태 전이: Workflow 조건 체크 (역할, 필드 필수, 승인 수)
- 전이 시 사후 액션 실행 (알림, 링크 생성, 필드 업데이트)
- 전이 시 Audit Log 자동 기록
- 삭제 시 Trace Link cascade 삭제
- 수정 시 Version History 자동 생성
- 수정 시 Suspect Link 자동 생성 (연결된 항목)
- Meilisearch 인덱싱 (비동기)

### Dependencies
- PrismaService, SpaceService, WorkflowService, TraceabilityService, AuditService, SearchService, NotificationService

### Acceptance Criteria
- [ ] 이슈 생성 시 키 자동 생성 (ADAS-1)
- [ ] 상태 전이 시 조건 체크 (역할, 필드)
- [ ] 전이 시 사후 액션 실행 (알림)
- [ ] 수정 시 버전 히스토리 생성
- [ ] 수정 시 Suspect Link 생성
- [ ] 삭제 시 Trace Link cascade 삭제

---

## Module: Documents (Confluence 스타일)

### Requirements
- FR-DOC-001: 리치 텍스트 에디터 (TipTap)
- FR-DOC-002: 페이지 트리 (부모-자식)
- FR-DOC-003: 버전 히스토리 (diff)
- FR-DOC-004: 인라인 댓글 + 스레드
- FR-DOC-005: 첨부파일
- FR-DOC-006: 페이지 템플릿 (ASPICE 산출물)
- FR-DOC-007: 목차 (TOC) 자동 생성
- FR-DOC-008: 다이어그램 (Mermaid) 삽입 + 프리뷰
- FR-DOC-009: 코드 블록 (syntax highlighting)
- FR-DOC-010: 저장 시 프리뷰 (Split View)

### API Contract
```
GET    /spaces/:key/docs                    → PageTreeResponse
GET    /spaces/:key/docs/:pageId             → PageDetailResponse
POST   /spaces/:key/docs                    → CreatePageDto → PageResponse
PUT    /spaces/:key/docs/:pageId            → UpdatePageDto → PageResponse
DELETE /spaces/:key/docs/:pageId            → 204
GET    /spaces/:key/docs/:pageId/versions   → PageVersionResponse[]
GET    /spaces/:key/docs/:pageId/comments   → CommentResponse[]
POST   /spaces/:key/docs/:pageId/comments   → { body, isInline, anchor } → CommentResponse
```

### Data Model
```prisma
model Page { workItemId, parentPageId, templateId, position, isHomepage, viewCount, lastViewedAt }
model PageTemplate { id, spaceId, name, description, body, category, aspiceProcess, isSystem, createdById, createdAt }
model PageVersion { id, pageId, version, title, body, bodyText, authorId, changeSummary, createdAt }
model Comment { id, targetType, targetId, parentId, authorId, body, bodyHtml, anchor, isInline, isResolved, resolvedById, resolvedAt, createdAt, updatedAt }
model CommentReaction { commentId, userId, emoji, createdAt }
```

### Business Rules
- 페이지는 Work Item (type=page)으로 저장
- 저장 시 Version History 자동 생성
- 수정 시 Suspect Link 자동 생성 (연결된 항목)
- 댓글 스레드 (parent_id로 계층)
- 인라인 댓글 (anchor: {from, to, text})
- TOC: H1~H6 제목에서 자동 생성
- Mermaid: 코드 블록 → SVG 렌더링 (클라이언트)
- 페이지 잠금: 편집 중 다른 사용자 읽기 전용

### Dependencies
- PrismaService, WorkItemService, TraceabilityService, AuditService, UploadService

### Acceptance Criteria
- [ ] TipTap 에디터에서 텍스트/표/코드/다이어그램 작성
- [ ] 저장 시 버전 히스토리 자동 생성
- [ ] 수정 시 Suspect Link 생성
- [ ] 인라인 댓글 + 스레드
- [ ] Mermaid 다이어그램 렌더링
- [ ] TOC 자동 생성

---

## Module: Traceability (양방향 추적성)

### Requirements
- FR-TRACE-001: 범용 추적성 링크 (typed)
- FR-TRACE-002: 양방향 링크 (A→B, B→A 자동)
- FR-TRACE-003: Suspect Link 자동 감지
- FR-TRACE-004: 추적성 매트릭스 (그래프/테이블)
- FR-TRACE-005: 커버리지 계산
- FR-TRACE-006: 베이스라인 스냅샷

### API Contract
```
GET    /spaces/:key/trace                    → TraceMatrixResponse
GET    /spaces/:key/trace/coverage           → CoverageReportResponse
GET    /spaces/:key/trace/suspect            → SuspectLinkResponse[]
POST   /spaces/:key/trace/links              → CreateTraceLinkDto → TraceLinkResponse
DELETE /spaces/:key/trace/links/:id          → 204
POST   /spaces/:key/trace/suspect/:id/resolve → { resolution } → SuspectLinkResponse
```

### Data Model
```prisma
model TraceLink { id, fromType, fromId, toType, toId, linkType, description, createdById, createdAt, baselineId, isSuspect }
model SuspectLink { id, traceLinkId, reason, markedAt, markedById, resolvedAt, resolvedById, resolution }
model TraceMatrixSnapshot { id, spaceId, baselineId, name, matrixData, totalRequirements, coveredRequirements, coveragePercent, generatedById, generatedAt }
model CoverageReport { id, spaceId, baselineId, reportType, totalItems, coveredItems, coveragePercent, uncoveredItems, generatedById, generatedAt }
```

### Business Rules
- 링크 생성 시 양방향 자동 생성 (from→to, to→from)
- 링크 타입: verifies, satisfies, implements, tests, derives, refines, traces_to
- 항목 수정 시 연결된 모든 링크 → isSuspect = TRUE
- 커버리지: (커버된 요구사항 수 / 전체 요구사항 수) × 100
- 베이스라인 시점 스냅샷 저장
- Suspect Link 해결: verified, updated, waived

### Dependencies
- PrismaService, WorkItemService, SpaceService, AuditService, NotificationService

### Acceptance Criteria
- [ ] 링크 생성 시 양방향 자동 생성
- [ ] 항목 수정 시 Suspect Link 자동 생성
- [ ] 커버리지 계산 정확 (100% chain)
- [ ] 매트릭스 UI (그래프/테이블)
- [ ] Suspect Link 해결 (resolve)

---

## Module: Workflows (상태 머신 + 리뷰 + 승인)

### Requirements
- FR-WF-001: 프로세스별 워크플로우
- FR-WF-002: 상태 전이 (조건, 사후 액션)
- FR-WF-003: 리뷰 세션
- FR-WF-004: 리뷰 지적 사항 (Finding)
- FR-WF-005: 승인 (전자 서명)
- FR-WF-006: Kanban/Scrum 보드

### API Contract
```
GET    /spaces/:key/workflows              → WorkflowResponse[]
POST   /spaces/:key/workflows              → CreateWorkflowDto → WorkflowResponse
PUT    /spaces/:key/workflows/:id          → UpdateWorkflowDto → WorkflowResponse
POST   /spaces/:key/workflows/:id/states   → CreateStateDto → StateResponse
POST   /spaces/:key/workflows/:id/transitions → CreateTransitionDto → TransitionResponse
GET    /spaces/:key/boards                → BoardResponse[]
POST   /spaces/:key/boards                → CreateBoardDto → BoardResponse
GET    /spaces/:key/reviews               → ReviewResponse[]
POST   /spaces/:key/reviews               → CreateReviewDto → ReviewResponse
POST   /spaces/:key/reviews/:id/findings  → CreateFindingDto → FindingResponse
POST   /spaces/:key/approvals              → { entityType, entityId, decision, signature } → ApprovalResponse
```

### Data Model
```prisma
model Workflow { id, spaceId, name, description, aspiceProcess, isDefault, isSystem, createdById, createdAt, updatedAt }
model WorkflowState { id, workflowId, name, description, category, color, position, isInitial, isTerminal }
model WorkflowTransition { id, workflowId, name, fromStateId, toStateId, conditionType, conditionConfig, postActions, isGlobal, position }
model WorkflowTransitionHistory { id, workItemId, transitionId, fromStateId, toStateId, performedById, comment, performedAt }
model Review { id, spaceId, title, description, reviewType, targetType, targetId, status, moderatorId, aspiceProcess, dueDate, createdById, createdAt, completedAt }
model ReviewParticipant { reviewId, userId, role, status, decisionAt, comment }
model ReviewFinding { id, reviewId, title, description, severity, status, location, defectId, createdById, createdAt, resolvedAt }
model Approval { id, entityType, entityId, approverId, decision, comment, signature, signatureMethod, decidedAt }
model ElectronicSignature { id, entityType, entityId, signerId, signatureType, signatureData, signedAt, ipAddress, isEvidence, evidenceTag, comment }
```

### Business Rules
- 상태 전이 시 조건 체크 (역할, 필드 필수, 승인 수)
- 전이 시 사후 액션 실행 (알림, 링크, 필드 업데이트)
- 리뷰 Finding → Defect 자동 생성 (선택)
- 전자 서명: 비밀번호/인증서/SSO/그리기
- 보드: Kanban (컬럼=상태), Scrum (스프린트)
- 드래그앤드롭 → 상태 전이

### Dependencies
- PrismaService, WorkItemService, SpaceService, NotificationService, TraceabilityService, AuditService

### Acceptance Criteria
- [ ] 상태 전이 시 조건 체크
- [ ] 전이 시 사후 액션 실행
- [ ] 리뷰 세션 생성/참여/결정
- [ ] Finding → Defect 자동 생성
- [ ] 전자 서명 저장
- [ ] Kanban 보드 드래그앤드롭

---

## Module: Compliance (ASPICE)

### Requirements
- FR-COMPLIANCE-001: ASPICE 프로세스 영역 정의
- FR-COMPLIANCE-002: 프로세스별 체크리스트
- FR-COMPLIANCE-003: 컴플라이언스 대시보드
- FR-COMPLIANCE-004: 산출물 템플릿
- FR-COMPLIANCE-005: 프로세스 평가 (Capability Level)

### API Contract
```
GET    /spaces/:key/compliance                    → ComplianceSummaryResponse
GET    /spaces/:key/compliance/:processCode       → ProcessDetailResponse
PUT    /spaces/:key/compliance/:processCode/checklists/:id → UpdateChecklistDto
POST   /spaces/:key/compliance/assessments        → CreateAssessmentDto → AssessmentResponse
GET    /spaces/:key/deliverables                 → DeliverableResponse[]
PUT    /spaces/:key/deliverables/:id             → UpdateDeliverableDto → DeliverableResponse
```

### Data Model
```prisma
model ProcessArea { id, code, name, category, description, level, parentCode, requiredWorkProducts, sortOrder }
model SpaceProcessArea { spaceId, processCode, isApplicable, notes }
model AspiceDeliverable { id, processCode, name, shortName, description, isMandatory, templateId, sortOrder }
model ProjectDeliverable { id, spaceId, deliverableId, workItemId, status, assignedToId, dueDate, completedAt, createdAt }
model DeliverableVersion { id, projectDeliverableId, workItemVersionId, baselineId, versionLabel, isReleased, createdAt }
model ProcessAssessment { id, spaceId, processCode, capabilityLevel, assessmentDate, assessorId, evidenceItems, notes, createdAt }
model ComplianceChecklist { id, spaceId, processCode, itemName, description, isRequired, status, evidenceId, assignedToId, dueDate, completedAt, createdAt }
```

### Business Rules
- 프로젝트 생성 시 SpaceProcessArea 자동 생성 (템플릿의 processCodes)
- 산출물 상태: not_started → in_progress → in_review → approved → released
- 체크리스트 상태: not_started → in_progress → completed → not_applicable
- 커버리지: (완료 체크리스트 수 / 전체 체크리스트 수) × 100
- 증적: Audit Log → EvidenceLink → ASPICE 조항 매핑

### Dependencies
- PrismaService, SpaceService, WorkItemService, AuditService

### Acceptance Criteria
- [ ] 프로세스별 완료율 계산
- [ ] 체크리스트 상태 변경
- [ ] 산출물 상태 관리
- [ ] 프로세스 평가 (Capability Level)
- [ ] 증적 수집 (Audit Log → ASPICE 매핑)

---

## Module: Search (Meilisearch)

### Requirements
- FR-SEARCH-001: 전문 검색 (제목, 본문, 코멘트)
- FR-SEARCH-002: 타이포 허용
- FR-SEARCH-003: 필터 (프로젝트, 상태, 우선순위, ASIL, ASPICE)
- FR-SEARCH-004: 자동완성
- FR-SEARCH-005: JQL 유사 쿼리
- FR-SEARCH-006: CQL 유사 쿼리

### API Contract
```
GET    /search?q=...&filter=...&limit=50    → SearchResultResponse
GET    /search/suggest?q=...                → SuggestResponse[]
POST   /search/index                        → IndexDocumentDto → 201
DELETE /search/index/:id                   → 204
```

### Business Rules
- Work Item CRUD 시 Meilisearch 자동 인덱싱 (비동기)
- 타이포 허용 (fuzziness: AUTO)
- 하이라이팅 (검색어 강조)
- 필터: spaceKey, status, priority, aspiceProcess, asilLevel, type
- 자동완성: prefix 검색, 5개 결과

### Dependencies
- Meilisearch Client, WorkItemService

### Acceptance Criteria
- [ ] 전문 검색 (제목 + 본문)
- [ ] 타이포 허용 ("requirment" → "requirement")
- [ ] 필터 적용 (상태, 우선순위, 프로젝트)
- [ ] 자동완성 (5개 결과)
- [ ] 하이라이팅 (검색어 강조)

---

## Module: MCP (AI 연동)

### Requirements
- FR-MCP-001: MCP SSE 엔드포인트
- FR-MCP-002: MCP JSON-RPC 엔드포인트
- FR-MCP-003: tools/list, tools/call
- FR-MCP-004: resources/list, resources/read
- FR-MCP-005: 20+ 도구 (Jira/Confluence 호환 + ALM 확장)
- FR-MCP-006: API Key 관리
- FR-MCP-007: MCP 감사 로그

### API Contract
```
GET    /mcp/sse                           → SSE Stream
POST   /mcp/message                       → JsonRpcRequest → JsonRpcResponse
```

### MCP Tools (20+)
```
Jira/Confluence 호환:
  alm_search_issues, alm_get_issue, alm_create_issue, alm_update_issue,
  alm_transition_issue, alm_add_comment, alm_link_issues,
  alm_search_pages, alm_get_page, alm_create_page, alm_update_page

ALM 확장:
  alm_get_traceability, alm_get_coverage, alm_get_compliance_status,
  alm_create_baseline, alm_get_project_summary
```

### Business Rules
- SSE 연결 수립 → JSON-RPC 메시지 교환
- 인증: Bearer JWT 또는 X-MCP-API-Key
- 권한: API Key 스코프 기반 (alm:read, alm:write, alm:admin)
- 모든 tool call → Audit Log 기록
- Rate Limiting: 60 요청/분

### Dependencies
- 모든 서비스 모듈 (Tool Registry)

### Acceptance Criteria
- [ ] SSE 연결 수립
- [ ] JSON-RPC 메시지 처리
- [ ] 20+ 도구 실행
- [ ] API Key 인증
- [ ] Audit Log 기록

---

## Module: Upload (MinIO)

### Requirements
- FR-UPLOAD-001: 파일 업로드 (MinIO)
- FR-UPLOAD-002: MIME 타입 검증
- FR-UPLOAD-003: 파일 크기 제한 (50MB)
- FR-UPLOAD-004: Magic Number 검증
- FR-UPLOAD-005: 썸네일 생성 (이미지)
- FR-UPLOAD-006: 업로드 진행률 (WebSocket)

### API Contract
```
POST   /upload                            → multipart/form-data → AttachmentResponse
GET    /attachments/:id                   → AttachmentDetailResponse
DELETE /attachments/:id                   → 204
GET    /attachments/:id/download          → File (binary)
GET    /attachments/:id/thumbnail         → Image (binary)
```

### Business Rules
- 허용 MIME: image/*, application/pdf, text/plain, text/markdown
- 차단 MIME: application/x-executable, application/javascript, text/html
- Magic Number 검증 (확장자 위조 방지)
- 이미지 → 썸네일 자동 생성 (200x200 WebP)
- 파일 경로: {type}/{id}/{timestamp}_{filename}

### Dependencies
- MinIO (S3 SDK), PrismaService, ThumbnailService (Sharp)

### Acceptance Criteria
- [ ] 파일 업로드 (MinIO)
- [ ] MIME 검증 (허용/차단)
- [ ] Magic Number 검증
- [ ] 썸네일 생성 (이미지)
- [ ] 50MB 크기 제한

---

## Module: Export (Word/PDF/Excel/HTML)

### Requirements
- FR-EXPORT-001: Word (.docx) export
- FR-EXPORT-002: PDF export (워터마크)
- FR-EXPORT-003: Excel (.xlsx) export
- FR-EXPORT-004: HTML export

### API Contract
```
GET    /export/documents/:id/word         → .docx (binary)
GET    /export/documents/:id/pdf          → .pdf (binary, watermark)
GET    /export/spaces/:key/traceability/excel → .xlsx (binary)
GET    /export/spaces/:key/issues/excel   → .xlsx (binary)
```

### Business Rules
- Word: TipTap JSON → docx (제목, 본문, 표, 이미지, 목차)
- PDF: HTML → PDF (Puppeteer) + 워터마크 (사용자명, 날짜, "CONFIDENTIAL")
- Excel: 추적성 매트릭스, 이슈 목록, R&R 매트릭스
- HTML: 정적 페이지 (CSS 인라인, 이미지 Base64)
- Export 파일 MinIO에 저장 + 다운로드 URL 반환

### Dependencies
- DocumentService, TraceabilityService, SpaceService, MinIO

### Acceptance Criteria
- [ ] Word export (제목, 본문, 표)
- [ ] PDF export (워터마크 포함)
- [ ] Excel export (추적성 매트릭스)
- [ ] HTML export (오프라인 열람)

---

## Module: Stakeholders (이해관계자)

### Requirements
- FR-STAKE-001: 내부/외부 이해관계자 유형
- FR-STAKE-002: 외부 조직 관리
- FR-STAKE-003: 유형별 접근 정책
- FR-STAKE-004: 프로젝트별 접근 설정
- FR-STAKE-005: 초대 관리
- FR-STAKE-006: NDA 서명
- FR-STAKE-007: 외부 포털

### API Contract
```
GET    /admin/stakeholders/types          → StakeholderTypeResponse[]
POST   /admin/stakeholders/types          → CreateTypeDto → StakeholderTypeResponse
PUT    /admin/stakeholders/types/:id/policy → UpdatePolicyDto → PolicyResponse
GET    /admin/stakeholders/organizations  → ExternalOrgResponse[]
POST   /admin/stakeholders/organizations  → CreateOrgDto → ExternalOrgResponse
POST   /admin/stakeholders/invitations    → InviteDto → InvitationResponse
GET    /portal/:spaceKey                  → PortalDashboardResponse
GET    /portal/:spaceKey/docs             → PortalDocsResponse[]
```

### Business Rules
- 내부 사용자: 회사 도메인 이메일 → 자동 승인
- 외부 사용자: 비회사 이메일 → 관리자 승인 필요
- 접근 정책: 허용 액션, 문서 접근 범위, 데이터 필터
- 프로젝트별 접근: allowedSpaces, restrictedSpaces
- NDA: 서명 전 접근 차단
- 외부 포털: 릴리스된 문서만 표시

### Dependencies
- PrismaService, SpaceService, AuthService, NotificationService

### Acceptance Criteria
- [ ] 이해관계자 유형 CRUD
- [ ] 접근 정책 설정
- [ ] 초대 발송/수락
- [ ] 외부 포털 (릴리스된 문서만)
- [ ] NDA 서명

---

## Module: Notifications

### Requirements
- FR-NOTIF-001: 인앱 알림 (WebSocket)
- FR-NOTIF-002: 이메일 알림
- FR-NOTIF-003: @멘션 알림
- FR-NOTIF-004: 알림 설정
- FR-NOTIF-005: 알림 이력

### API Contract
```
GET    /notifications                     → NotificationResponse[]
PUT    /notifications/:id/read            → 204
PUT    /notifications/read-all            → 204
GET    /notifications/preferences         → PreferenceResponse[]
PUT    /notifications/preferences         → UpdatePreferenceDto → PreferenceResponse
```

### Business Rules
- WebSocket 실시간 전송 (Socket.io)
- 이메일: Bull Queue + Redis (비동기)
- @멘션: 댓글에서 @username 파싱 → 알림
- 알림 설정: 유형별 on/off, 채널별 on/off
- 알림 이력: 30일 보관

### Dependencies
- PrismaService, WebSocketGateway, EmailService (Bull), UserService

### Acceptance Criteria
- [ ] WebSocket 실시간 알림
- [ ] 이메일 알림 (Bull Queue)
- [ ] @멘션 알림
- [ ] 알림 설정 (on/off)
- [ ] 알림 이력 조회

---

## Module: Git/CI 연동

### Requirements
- FR-GIT-001: GitHub/GitLab 연동 (OAuth)
- FR-GIT-002: 스마트 커밋 (키워드 → 상태 전이)
- FR-GIT-003: PR/MR → 이슈 자동 링크
- FR-GIT-004: CI/CD 파이프라인 연동
- FR-GIT-005: 코드 커버리지 연동

### API Contract
```
POST   /git/webhook                       → WebhookEvent → 200
GET    /git/connections                   → ConnectionResponse[]
POST   /git/connections                   → CreateConnectionDto → ConnectionResponse
DELETE /git/connections/:id               → 204
```

### Business Rules
- 스마트 커밋: "ADAS-123 #done #comment Fixed" → 상태 전이 + 코멘트
- PR: 제목/본문에서 이슈 키 추출 → 자동 링크
- CI/CD: 빌드 성공/실패 → 이슈 상태 업데이트 + 결함 생성
- Webhook: HMAC 서명 검증

### Dependencies
- WorkItemService, WorkflowService, CommentService, DefectService

### Acceptance Criteria
- [ ] GitHub/GitLab OAuth 연동
- [ ] 스마트 커밋 파싱 (#done, #comment, #time)
- [ ] PR → 이슈 자동 링크
- [ ] CI/CD 결과 → 이슈 상태 업데이트
- [ ] Webhook HMAC 검증

---

## 8. Frontend 구조

### 8.1 페이지 목록
```
pages/
├── auth/ (Login, Register, VerifyEmail)
├── dashboard/ (Dashboard)
├── spaces/ (SpacesList, SpaceDashboard, Board, Backlog, IssuesList, IssueDetail, DocsTree, PageDetail, Requirements, Tests, Traceability, Coverage, Compliance, ProcessDetail, Baselines, BaselineDetail, ChangeRequests, Releases, Reviews, Members, SpaceSettings)
├── admin/ (AdminDashboard, UserManagement, Registrations, Stakeholders, AllSpaces, ApiKeys)
├── super-admin/ (SuperAdminDashboard, SystemSettings, AuditLogs)
├── portal/ (PortalDashboard, PortalDocs, PortalPageDetail, PortalRequirements)
└── NotFound
```

### 8.2 상태 관리 (Zustand)
```typescript
// stores/auth.store.ts: user, token, isAuthenticated, login, logout
// stores/space.store.ts: currentSpace, spaces, setCurrentSpace, fetchSpaces
// stores/ui.store.ts: sidebarOpen, theme, locale, toggleSidebar, setTheme, setLocale
```

### 8.3 API 클라이언트
```typescript
// services/api.client.ts: axios + JWT interceptor + 401 refresh
```

---

## 9. Testing 명세

### 9.1 테스트 구조
```
backend/test/
├── setup.ts (Testcontainers)
├── factories/ (user, space, work-item)
└── e2e/ (auth, space, work-item)
backend/src/**/*.spec.ts (Unit)
```

### 9.2 커버리지 목표
- Service: 90%+, Controller: 80%+, 전체: 80%+
- E2E: 핵심 10개 시나리오

---

## 10. Security 명세

### 10.1 인증/인가
- Keycloak JWT (Access 15분, Refresh 7일)
- RBAC (3단계: Global → Space → WorkItem)
- Permission Guard (데코레이터 기반)

### 10.2 보안 설정
- CORS: Frontend URL만 허용
- Rate Limiting: 10req/s, 50req/10s, 200req/min
- Helmet: CSP, HSTS, X-Frame-Options
- 파일 업로드: MIME 화이트리스트, Magic Number, 50MB 제한

---

## 11. Performance 명세

### 11.1 캐싱
- Phase 1: 인메모리 (TTL 5분)
- Phase 2: Redis (TTL 5분, 캐시 무효화)
- 캐시 대상: Space, User, Permission, Workflow

### 11.2 DB 인덱스
- WorkItem: (spaceId), (status), (assigneeId), (aspiceProcess), FTS
- TraceLink: (fromType, fromId), (toType, toId)
- AuditLog: (entityType, entityId), (createdAt)
- Comment: (targetType, targetId)
- Notification: (userId, isRead, createdAt DESC)

### 11.3 페이지네이션
- Cursor 기반 (대용량)
- Offset 기반 (소규모, 관리자)

---

## 12. i18n 명세

### 12.1 지원 언어
- Phase 1: 한국어 (ko) + 영어 (en)
- Phase 2: + 일본어 (ja), 독일어 (de)

### 12.2 번역 키 구조
```json
{ "common": { "save": "저장" }, "space": { "title": "프로젝트" }, "workItem": { "status": { "open": "열림" } } }
```

---

## 13. Email 명세

### 13.1 알림 유형
- approval-request, status-change, mention, invitation, password-reset, registration-approved, registration-rejected

### 13.2 발송 큐
- Bull + Redis (비동기)
- 재시도: 3회, 지수 백오프 (5초 → 10초 → 20초)

---

## 14. Onboarding 명세

### 14.1 신규 사용자 가이드
- Step 1: 환영 + 역할 선택
- Step 2: 프로젝트 생성 또는 참여
- Step 3: 데모 프로젝트 체험
- Step 4: 역할별 대시보드

### 14.2 빈 프로젝트 가이드
- "첫 번째 이슈를 만들어보세요" (CTA)
- "문서 템플릿으로 SRS 작성하기" (CTA)
- "팀원 초대하기" (CTA)

---

## 15. Accessibility 명세

### 15.1 WCAG 2.1 AA
- 키보드 네비게이션, 포커스 표시, 색상 대비 4.5:1, 이미지 alt, 폼 라벨, 에러 메시지, ARIA role

### 15.2 CI 검사
- Lighthouse CI: 접근성 점수 90+
- axe-core: 자동 테스트 (Playwright 연동)

---

## 16. Monitoring 명세

### 16.1 Health Check
- GET /health → DB, Redis, Meilisearch, Keycloak, MinIO 상태

### 16.2 Winston 로깅
- JSON 구조화 로그, 파일 + 콘솔, 에러/combined 분리

---

## 17. DB Backup 명세

### 17.1 백업
- pg_dump + gzip + MinIO 업로드 (일 1회, 자정)
- 30일 보관 정책
- Slack 알림

### 17.2 복구
- gunzip + psql (5~10분)
- WAL 아카이빙 (Phase 3, Point-in-Time Recovery)

---

**이 Just Enough Spec을 기반으로 개발을 시작할 수 있습니다. Step 1 (Docker Compose + 인프라)부터 시작하시겠어요?**