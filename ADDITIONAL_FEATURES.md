# ASPICE ALM — 추가 기능 요구사항 (Phase 2+)

> 이 문서는 REQUIREMENTS.md의 추가 기능을 정의합니다.
> R&R, WBS, 작업 할당, 양방향 추적성, 문서 편집, 워크플로우 빌더, 전자서명, Export 등을 포함합니다.

---

## 1. R&R (Roles & Responsibilities) 관리

### 1.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-RR-01 | R&R 매트릭스 (역할별 프로세스 책임 정의) | P0 |
| FR-RR-02 | 프로젝트별 R&R 설정 (PM, SE, QA, CM별 담당 프로세스) | P0 |
| FR-RR-03 | R&R 변경 이력 추적 | P1 |
| FR-RR-04 | R&R 템플릿 (ASPICE 기본 R&R) | P1 |
| FR-RR-05 | R&R Export (Excel/PDF) | P2 |

### 1.2 R&R 매트릭스 구조

```
┌──────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Process      │ PM       │ SE(Arch) │ SE(Dev)  │ QA       │ CM       │
├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ SWE.1 (요구) │ Owner    │ Contrib  │ Viewer   │ Reviewer │ Viewer   │
│ SWE.2 (아키) │ Reviewer │ Owner    │ Contrib  │ Viewer   │ Viewer   │
│ SWE.3 (상세) │ Reviewer │ Contrib  │ Owner    │ Viewer   │ Viewer   │
│ SWE.4 (구현) │ Viewer   │ Contrib  │ Owner    │ Reviewer │ Viewer   │
│ SWE.5 (단위) │ Viewer   │ Viewer   │ Contrib  │ Owner    │ Viewer   │
│ SWE.6 (통합) │ Reviewer │ Contrib  │ Contrib  │ Owner    │ Viewer   │
│ SUP.8 (구성) │ Viewer   │ Viewer   │ Viewer   │ Viewer   │ Owner    │
│ SUP.10(변경) │ Approver │ Contrib  │ Contrib  │ Reviewer │ Owner    │
└──────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Owner: 주 담당 (생성/수정/승인)
Contrib: 기여 (생성/수정)
Reviewer: 리뷰 (읽기 + 코멘트)
Approver: 승인 (읽기 + 승인/거절)
Viewer: 읽기 전용
```

### 1.3 DB 모델

```sql
CREATE TABLE role_responsibilities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    aspice_process  VARCHAR(20),
    responsibility  VARCHAR(50) NOT NULL,  -- owner, contributor, reviewer, approver, viewer
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, space_id, aspice_process)
);
```

---

## 2. WBS (Work Breakdown Structure) & 작업 할당

### 2.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-WBS-01 | WBS 트리 (Epic → Story → Task → Sub-task) | P0 |
| FR-WBS-02 | 작업 할당 (담당자, 예상 시간, 우선순위) | P0 |
| FR-WBS-03 | WBS 간트 차트 (타임라인 시각화) | P1 |
| FR-WBS-04 | WBS Export (Excel/PDF/Gantt) | P1 |
| FR-WBS-05 | 작업 진행률 (0~100%) | P0 |
| FR-WBS-06 | 작업 의존성 (선행/후행 작업) | P1 |
| FR-WBS-07 | 리소스 할당 (인력별 작업량) | P2 |

### 2.2 WBS 구조

```
Epic: "ADAS Controller v2.1 개발"
├── Story: "차선 유지 기능 구현"
│   ├── Task: "요구사항 분석 (SWE.1)" — 담당: 김철수, 예상: 8h, 진행: 100%
│   ├── Task: "아키텍처 설계 (SWE.2)" — 담당: 이영희, 예상: 16h, 진행: 80%
│   ├── Task: "상세 설계 (SWE.3)" — 담당: 박민수, 예상: 24h, 진행: 30%
│   ├── Task: "코드 구현 (SWE.4)" — 담당: 김철수, 예상: 40h, 진행: 0%
│   └── Task: "단위 테스트 (SWE.5)" — 담당: 이영희, 예상: 16h, 진행: 0%
├── Story: "보행자 감지 기능 구현"
│   └── ...
└── Story: "통합 테스트 (SWE.6)"
    └── ...
```

### 2.3 DB 모델

```sql
-- 작업 할당 (work_items에 이미 assignee_id 존재, 추가 필드)
ALTER TABLE work_items ADD COLUMN estimated_hours DECIMAL(10,2);
ALTER TABLE work_items ADD COLUMN actual_hours DECIMAL(10,2);
ALTER TABLE work_items ADD COLUMN progress_percent INT DEFAULT 0;
ALTER TABLE work_items ADD COLUMN start_date DATE;
ALTER TABLE work_items ADD COLUMN end_date DATE;

-- 작업 의존성
CREATE TABLE work_item_dependencies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_item_id    UUID REFERENCES work_items(id) ON DELETE CASCADE,
    to_item_id      UUID REFERENCES work_items(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) NOT NULL,  -- finish_to_start, start_to_start, finish_to_finish
    lag_days        INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_item_id, to_item_id)
);
```

### 2.4 간트 차트 UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  WBS: ADAS Controller v2.1                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Task                    │ Assignee │ Est │ Progress │ Timeline      │
├──────────────────────────┼──────────┼─────┼──────────┼───────────────┤
│  ▼ Epic: ADAS v2.1       │ PM       │ 200h│ 45%      │ ████████░░░░  │
│    ├ SWE.1 요구사항       │ 김철수   │ 8h  │ 100%     │ ████████      │
│    ├ SWE.2 아키텍처       │ 이영희   │ 16h │ 80%      │ ███████░      │
│    ├ SWE.3 상세설계       │ 박민수   │ 24h │ 30%      │ ██░░░░░░      │
│    ├ SWE.4 구현           │ 김철수   │ 40h │ 0%       │ ░░░░░░░░      │
│    └ SWE.5 단위테스트     │ 이영희   │ 16h │ 0%       │ ░░░░░░░░      │
└──────────────────────────┴──────────┴─────┴──────────┴───────────────┘
```

---

## 3. 양방향 추적성 (Bidirectional Traceability)

### 3.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-TRACE-BI-01 | 양방향 링크 (A→B, B→A 자동 생성) | P0 |
| FR-TRACE-BI-02 | 추적성 그래프 (D3/React Flow 시각화) | P0 |
| FR-TRACE-BI-03 | Suspect Link 자동 감지 + 알림 | P0 |
| FR-TRACE-BI-04 | 커버리지 대시보드 (Req→Design→Code→Test) | P0 |
| FR-TRACE-BI-05 | 추적성 Export (Excel/PDF) | P1 |
| FR-TRACE-BI-06 | 추적성 갭 분석 (미커버 항목 하이라이트) | P0 |

### 3.2 양방향 링크 자동 생성

```
사용자가 REQ-001 → TC-042 링크 생성 ("verifies")
  → 시스템이 자동으로 TC-042 → REQ-001 역방향 링크 생성 ("verified_by")
  → 양방향 탐색 가능

Forward: REQ-001 → TC-042 (이 요구사항을 검증하는 테스트)
Backward: TC-042 → REQ-001 (이 테스트가 검증하는 요구사항)
```

### 3.3 추적성 그래프 UI

```
┌─────────────────────────────────────────────────────────────┐
│  Traceability Graph: ADAS Controller                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────┐  │
│  │ REQ-001 │────→│ DES-015 │────→│ CODE-03 │────→│ TC-042│ │
│  │ (SWE.1) │     │ (SWE.2) │     │ (SWE.4) │     │(SWE.5)│ │
│  └─────────┘     └─────────┘     └─────────┘     └───────┘  │
│       │               │               │               │     │
│       │ (suspect)     │               │               │     │
│       ▼               ▼               ▼               ▼     │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────┐  │
│  │ REQ-002 │────→│ DES-016 │     │ CODE-04 │     │ TC-043│ │
│  └─────────┘     └─────────┘     └─────────┘     └───────┘  │
│                                                             │
│  Legend: ──→ verifies  ──→ satisfies  ⚠️ suspect link        │
│  Coverage: 85% (15% 미커버)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Suspect Link 자동 감지

```
REQ-001 수정됨
  → 시스템이 REQ-001을 from/to로 하는 모든 trace_link 검색
  → 해당 링크의 is_suspect = TRUE 설정
  → 알림: "REQ-001 변경으로 3개 항목 재검증 필요"
  → DES-015, CODE-03, TC-042에 ⚠️ 표시
  → 사용자가 재검증 후 "Resolve Suspect" 클릭 → is_suspect = FALSE
```

---

## 4. 문서 편집 (WYSIWYG + 다이어그램 + 목차)

### 4.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-DOC-ADV-01 | WYSIWYG 에디터 (TipTap) | P0 |
| FR-DOC-ADV-02 | 목차 (TOC) 자동 생성 | P0 |
| FR-DOC-ADV-03 | 다이어그램 삽입 (Mermaid, PlantUML) | P0 |
| FR-DOC-ADV-04 | 코드 블록 (syntax highlighting) | P0 |
| FR-DOC-ADV-05 | 저장 시 프리뷰 (Split View) | P0 |
| FR-DOC-ADV-06 | 실시간 협업 (Yjs CRDT) | P2 |
| FR-DOC-ADV-07 | 템플릿 (계획서, 회의록, SRS, SAD 등) | P0 |
| FR-DOC-ADV-08 | @멘션, 댓글, 인라인 코멘트 | P0 |
| FR-DOC-ADV-09 | 버전 비교 (Diff) | P0 |
| FR-DOC-ADV-10 | Export (Word, Excel, PDF, HTML) | P0 |

### 4.2 WYSIWYG 에디터 (TipTap)

```
TipTap 블록 타입:
├── 텍스트 (Bold, Italic, Underline, Strikethrough)
├── 제목 (H1~H6)
├── 목록 (Bullet, Numbered, Task)
├── 표 (삽입, 편집, 정렬)
├── 코드 블록 (syntax highlighting: 100+ 언어)
├── 인용 (Blockquote)
├── 이미지 (업로드, URL, 드래그앤드롭)
├── 다이어그램 (Mermaid, PlantUML)
├── 임베드 (YouTube, Figma, Jira 이슈)
├── TOC (목차 자동 생성)
├── 페이지 구분 (Page Break)
└── 커스텀 블록 (요구사항 카드, 추적성 매트릭스)
```

### 4.3 다이어그램 삽입 (코드 + 프리뷰)

```
┌─────────────────────────────────────────────────────┐
│  다이어그램 블록 (Split View)                        │
├──────────────────────┬──────────────────────────────┤
│  Code (편집)          │  Preview (실시간 렌더링)      │
├──────────────────────┼──────────────────────────────┤
│  graph TD            │                              │
│    A[시작] --> B{조건}│     ┌────┐                  │
│    B -->|Yes| C[처리] │     │시작│                  │
│    B -->|No| D[종료]  │     └──┬─┘                  │
│                      │        │                    │
│  [Mermaid ▼]         │     ┌──┴──┐                 │
│  [PlantUML ▼]        │     │조건?│                 │
│  [Draw.io ▼]         │     └──┬──┘                 │
│                      │    Yes│  │No               │
│                      │   ┌───┘  └───┐             │
│                      │   ▼         ▼             │
│                      │ ┌────┐  ┌────┐            │
│                      │ │처리│  │종료│            │
│                      │ └────┘  └────┘            │
└──────────────────────┴──────────────────────────────┘
```

### 4.4 저장 시 프리뷰

```
사용자가 "Save" 클릭
  ↓
1. TipTap JSON → HTML 변환
  ↓
2. Mermaid/PlantUML 코드 → SVG 렌더링
  ↓
3. 코드 블록 → Syntax Highlighting
  ↓
4. 표 → HTML Table
  ↓
5. 이미지 → Base64 또는 URL
  ↓
6. 최종 HTML 프리뷰 렌더링
  ↓
7. 사용자에게 "Preview" 탭에서 확인 가능
  ↓
8. "Publish" 클릭 → 릴리스 (외부 사용자에게 공개)
```

### 4.5 목차 (TOC) 자동 생성

```
문서 작성 시:
  # 1. Introduction
  ## 1.1 Purpose
  ## 1.2 Scope
  # 2. Requirements
  ## 2.1 Functional
  ## 2.2 Non-Functional

TOC 자동 생성:
  ┌─────────────────────────────┐
  │ Table of Contents           │
  │ 1. Introduction             │
  │   1.1 Purpose               │
  │   1.2 Scope                 │
  │ 2. Requirements             │
  │   2.1 Functional            │
  │   2.2 Non-Functional        │
  └─────────────────────────────┘
  → 클릭 시 해당 섹션으로 스크롤
  → 제목 변경 시 TOC 자동 업데이트
```

### 4.6 문서 템플릿 (ASPICE 산출물)

```
템플릿 목록:
├── SRS (Software Requirements Specification)
│   ├── 1. Introduction
│   ├── 2. Overall Description
│   ├── 3. Specific Requirements
│   ├── 4. Traceability Matrix
│   └── 5. Appendix
├── SAD (Software Architecture Design)
│   ├── 1. Introduction
│   ├── 2. Architectural Overview
│   ├── 3. Component Design
│   ├── 4. Interface Design
│   └── 5. Traceability
├── SDD (Software Detailed Design)
├── Test Plan
├── Test Report
├── 회의록 (Meeting Minutes)
│   ├── 참석자
│   ├── 안건
│   ├── 논의 내용
│   ├── 결정 사항
│   └── 액션 아이템
├── 프로젝트 계획서 (Project Plan)
│   ├── 목표
│   ├── 일정 (WBS)
│   ├── 리소스
│   └── 리스크
└── 사용자 정의 템플릿 (관리자가 생성)
```

---

## 5. 워크플로우 빌더 (Custom Workflow)

### 5.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-WF-BUILDER-01 | 시각적 워크플로우 편집기 (드래그앤드롭) | P1 |
| FR-WF-BUILDER-02 | 상태 (State) 추가/삭제/편집 | P0 |
| FR-WF-BUILDER-03 | 전이 (Transition) 추가/삭제 (조건, 사후 액션) | P0 |
| FR-WF-BUILDER-04 | 조건 설정 (역할 체크, 필드 필수, 승인 수) | P0 |
| FR-WF-BUILDER-05 | 사후 액션 (알림, 링크 생성, 필드 업데이트) | P1 |
| FR-WF-BUILDER-06 | 워크플로우 템플릿 (ASPICE 기본) | P0 |
| FR-WF-BUILDER-07 | 워크플로우 버전 관리 | P2 |

### 5.2 워크플로우 빌더 UI

```
┌─────────────────────────────────────────────────────────────┐
│  Workflow Builder: SWE.2 Architecture Design                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Canvas (드래그앤드롭)                               │    │
│  │                                                     │    │
│  │  ┌────────┐    ┌──────────┐    ┌──────────┐        │    │
│  │  │ Draft  │───→│ In Review│───→│ Approved │        │    │
│  │  └────────┘    └──────────┘    └──────────┘        │    │
│  │       │              │              │               │    │
│  │       │              │ (reject)     │ (release)     │    │
│  │       │              ▼              ▼               │    │
│  │       │         ┌──────────┐    ┌──────────┐        │    │
│  │       └────────→│ Rejected │    │ Released │        │    │
│  │                 └──────────┘    └──────────┘        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Properties Panel (선택된 전이):                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Transition: "Submit for Review"                      │    │
│  │ From: Draft → To: In Review                         │    │
│  │ Conditions:                                         │    │
│  │   ☑ Role check: [SE, Arch]                          │    │
│  │   ☑ Field required: [title, body]                   │    │
│  │   ☐ Approval count: [2]                             │    │
│  │ Post Actions:                                       │    │
│  │   ☑ Notify: [reviewers]                             │    │
│  │   ☑ Create linked: [review session]                 │    │
│  │   ☐ Update field: [status → in_review]              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Save] [Publish] [Test] [Export]                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 워크플로우 트리거

```
트리거 유형:
├── 수동 (Manual): 사용자가 버튼 클릭
├── 자동 (Automatic): 조건 충족 시 자동 전이
│   ├── 필드 값 변경 시
│   ├── 링크 생성 시
│   └── 시간 기반 (예: 3일 후 자동 종료)
├── 승인 (Approval): N명 승인 시 전이
│   ├── 순차 승인 (1명 → 2명 → 3명)
│   └── 병렬 승인 (N명 중 M명)
└── 외부 (External): API/Webhook으로 전이
    ├── CI/CD 파이프라인 완료 시
    └── 외부 시스템 승인 시
```

### 5.4 전자 서명 (Electronic Signature)

```sql
CREATE TABLE electronic_signatures (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50) NOT NULL,   -- work_item, baseline, document, approval
    entity_id       UUID NOT NULL,
    signer_id       UUID REFERENCES users(id),
    signature_type  VARCHAR(30) NOT NULL,    -- password, certificate, sso, drawn
    signature_data  TEXT NOT NULL,          -- Base64 서명 이미지 또는 해시
    signed_at       TIMESTAMPTZ DEFAULT NOW(),
    ip_address      INET,
    -- ASPICE 증적
    is_evidence     BOOLEAN DEFAULT TRUE,
    evidence_tag    VARCHAR(100),           -- "SWE.2-Approval"
    -- 메타
    comment         TEXT,
    UNIQUE(entity_type, entity_id, signer_id)
);
```

```
전자 서명 플로우:
1. 사용자가 "승인" 버튼 클릭
2. 서명 모달 팝업
   ├── 비밀번호 재입력 (password type)
   ├── 또는 인증서 선택 (certificate type)
   ├── 또는 SSO 재인증 (sso type)
   └── 또는 서명 그리기 (drawn type, 모바일)
3. 서명 데이터 생성 (Base64 이미지 또는 해시)
4. DB에 저장 (electronic_signatures)
5. 감사 로그 기록 (is_evidence = TRUE)
6. 워크플로우 전이 실행
```

---

## 6. Export (Word, Excel, PDF, HTML)

### 6.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-EXPORT-01 | Word (.docx) export | P0 |
| FR-EXPORT-02 | PDF export (워터마크 포함) | P0 |
| FR-EXPORT-03 | Excel (.xlsx) export (추적성 매트릭스) | P0 |
| FR-EXPORT-04 | HTML export (정적 페이지) | P1 |
| FR-EXPORT-05 | Markdown export | P1 |
| FR-EXPORT-06 | 일괄 Export (프로젝트 전체) | P2 |
| FR-EXPORT-07 | Export 템플릿 (커스텀 레이아웃) | P2 |

### 6.2 Export 구조

```
Export 서비스:
├── Word (.docx): docx 라이브러리 (Node.js)
│   ├── 제목, 본문, 표, 이미지
│   ├── 목차 자동 생성
│   ├── 페이지 번호
│   └── 헤더/푸터 (회사 로고)
├── PDF: Puppeteer 또는 WeasyPrint
│   ├── HTML → PDF 변환
│   ├── 워터마크 (사용자명, 날짜, "CONFIDENTIAL")
│   ├── 페이지 번호
│   └── 목차 (북마크)
├── Excel (.xlsx): ExcelJS
│   ├── 추적성 매트릭스 (시트별)
│   ├── 이슈 목록 (필터 적용)
│   ├── R&R 매트릭스
│   └── 커스텀 컬럼 선택
└── HTML: 정적 페이지 생성
    ├── 단일 HTML 파일 (CSS 인라인)
    ├── 이미지 Base64 인코딩
    └── 오프라인 열람 가능
```

### 6.3 NestJS Export 구현

```typescript
// export.service.ts
@Injectable()
export class ExportService {
  async exportToWord(documentId: string, userId: string): Promise<Buffer> {
    const doc = await this.documentService.getPage(documentId);
    const docx = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: doc.title, heading: HeadingLevel.HEADING_1 }),
          ...this.convertTipTapToDocx(doc.body),
        ],
      }],
    });
    return Packer.toBuffer(docx);
  }

  async exportToPdf(documentId: string, userId: string, watermark?: string): Promise<Buffer> {
    const html = await this.renderToHtml(documentId);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm' },
      displayHeaderFooter: true,
      footerTemplate: `<div style="font-size:8px;text-align:center;width:100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    });
    await browser.close();

    if (watermark) {
      return this.addWatermark(pdf, watermark);
    }
    return pdf;
  }

  async exportTraceabilityToExcel(spaceKey: string): Promise<Buffer> {
    const matrix = await this.traceabilityService.getMatrix(spaceKey);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Traceability Matrix');

    // 헤더
    sheet.addRow(['Requirement', 'Design', 'Code', 'Test Case', 'Status']);
    // 데이터
    matrix.rows.forEach(row => {
      sheet.addRow([row.req, row.design, row.code, row.test, row.status]);
    });

    // 스타일
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach(col => { col.width = 20; });

    return workbook.xlsx.writeBuffer();
  }
}
```

---

## 7. Confluence + Jira 통합 뷰

### 7.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-INTEGRATED-01 | 통합 대시보드 (이슈 + 문서 + 추적성) | P0 |
| FR-INTEGRATED-02 | 관련 항목 사이드바 (이슈 상세에서 관련 문서/테스트 표시) | P0 |
| FR-INTEGRATED-03 | @멘션으로 이슈/문서/사용자 참조 | P0 |
| FR-INTEGRATED-04 | 인라인 이슈 생성 (문서에서 이슈 생성) | P1 |
| FR-INTEGRATED-05 | 통합 검색 (이슈 + 문서 + 요구사항) | P0 |

### 7.2 통합 뷰 UI

```
┌─────────────────────────────────────────────────────────────┐
│  Work Item Detail: ADAS-123 (응답시간 개선)                  │
├──────────────────────────────┬──────────────────────────────┤
│  Main Content                │  Related Items (Sidebar)     │
│                              │                              │
│  Title: 응답시간 개선         │  📄 Related Documents        │
│  Status: In Progress         │  ├── SRS v2.1 (REQ-001)     │
│  Priority: High              │  ├── SAD v1.3 (DES-015)     │
│  Assignee: 김철수             │  └── Test Report v1.0       │
│                              │                              │
│  Description:                │  🔗 Traceability             │
│  시스템 응답시간을 100ms     │  REQ-001 → DES-015 → TC-042 │
│  이내로 개선해야 함           │  Coverage: 100% ✓            │
│                              │                              │
│  Comments (3):               │  🐛 Linked Defects           │
│  - 김철수: "진행 중"         │  └── BUG-045 (Open)          │
│  - 이영희: "리뷰 요청"       │                              │
│                              │  📋 Related Issues           │
│  Attachments (2):            │  ├── ADAS-120 (blocks)       │
│  - screenshot.png            │  └── ADAS-125 (relates)      │
│  - spec.pdf                  │                              │
│                              │  🏷️ Labels: performance, safety│
└──────────────────────────────┴──────────────────────────────┘
```

---

## 8. 감사 로그 (Audit Log) — 모든 변경 이력

### 8.1 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-AUDIT-01 | 모든 엔티티 변경 시 자동 감사 로그 | P0 |
| FR-AUDIT-02 | 변경 전/후 값 기록 (diff) | P0 |
| FR-AUDIT-03 | 수행자, IP, 타임스탬프 기록 | P0 |
| FR-AUDIT-04 | ASPICE 증적 태깅 (is_evidence) | P0 |
| FR-AUDIT-05 | 감사 로그 조회/필터/Export | P0 |
| FR-AUDIT-06 | 감사 로그 불변성 (수정/삭제 불가) | P0 |

### 8.2 감사 로그 자동 기록 (NestJS Interceptor)

```typescript
// audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService, private reflector: Reflector) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    // 변경 요청만 감사 (POST, PUT, PATCH, DELETE)
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const entityType = this.extractEntityType(url);
    const entityId = this.extractEntityId(url);
    const action = this.mapMethodToAction(method);

    // 변경 전 상태 조회
    const before = entityId ? await this.getEntityState(entityType, entityId) : null;

    return next.handle().pipe(
      tap(async (after) => {
        await this.auditService.log({
          entityType,
          entityId: entityId || after?.id,
          action,
          actorId: user?.id,
          actorIp: request.ip,
          before: before ? JSON.stringify(before) : null,
          after: after ? JSON.stringify(after) : null,
          diff: this.computeDiff(before, after),
        });
      }),
    );
  }
}
```

### 8.3 감사 로그 조회 UI

```
┌─────────────────────────────────────────────────────────────┐
│  Audit Log — ADAS Controller                                │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All ▼] [User ▼] [Action ▼] [Date Range] [Export] │
├─────────────────────────────────────────────────────────────┤
│  2026-11-13 14:30  김철수  Updated  ADAS-123              │
│    status: open → in_progress                               │
│    priority: medium → high                                  │
│  2026-11-13 14:25  이영희  Commented ADAS-123              │
│    "리뷰 요청합니다"                                        │
│  2026-11-13 14:20  박민수  Approved  Baseline v1.0         │
│    signature: SHA256:abc123...                              │
│  2026-11-13 14:15  시스템  Created  ADAS-124               │
│    (CI/CD 파이프라인에서 자동 생성)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. 종합 기능 목록 (전체)

### Phase 1 (MVP) — 4주
- [ ] Docker Compose 인프라
- [ ] NestJS + Prisma + Keycloak
- [ ] Space CRUD + 멤버 관리 + R&R
- [ ] Work Item CRUD (Issue + Page)
- [ ] WBS (Epic → Story → Task) + 작업 할당
- [ ] 문서 에디터 (TipTap) + 버전 관리
- [ ] 목차 (TOC) 자동 생성
- [ ] 다이어그램 (Mermaid) 삽입 + 프리뷰
- [ ] 코드 블록 (syntax highlighting)
- [ ] 코멘트 + 첨부파일
- [ ] Kanban 보드
- [ ] 기본 추적성 (양방향 링크)
- [ ] 감사 로그 (자동 기록)
- [ ] Unit + Integration Test
- [ ] Health Check + Winston

### Phase 2 (ALM 핵심) — 3주
- [ ] 워크플로우 엔진 (상태 전이, 조건, 사후 액션)
- [ ] 워크플로우 빌더 (시각적 편집기)
- [ ] 전자 서명 (비밀번호/인증서/SSO)
- [ ] 리뷰 + 승인
- [ ] 베이스라인 + 버전 관리
- [ ] 추적성 매트릭스 UI + 커버리지
- [ ] Suspect Link 자동 감지 + 알림
- [ ] Meilisearch 연동 (검색)
- [ ] WebSocket 알림 + 이메일
- [ ] MCP Server (기본 도구)
- [ ] Export (Word, PDF, Excel, HTML)
- [ ] E2E Test (핵심 10개 시나리오)

### Phase 3 (ASPICE 완성) — 3주
- [ ] ASPICE 산출물 템플릿 (SRS, SAD, SDD, 회의록, 계획서)
- [ ] 컴플라이언스 대시보드
- [ ] 프로세스별 체크리스트
- [ ] 프로젝트 템플릿 (ASPICE Level 2)
- [ ] 이해관계자 관리 (외부 조직, 접근 정책, 초대, NDA)
- [ ] 외부 포털 (릴리스된 문서)
- [ ] 워터마크 PDF export
- [ ] 간트 차트 (WBS 타임라인)

### Phase 4 (연동 & 고도화) — 2주
- [ ] GitHub/GitLab 연동 (스마트 커밋)
- [ ] CI/CD 파이프라인 연동
- [ ] Jira/Confluence 호환 REST API
- [ ] MCP Server (전체 20+ 도구)
- [ ] Flutter 모바일 앱 (기본)
- [ ] i18n (한국어 + 영어)
- [ ] WCAG 2.1 AA 접근성
- [ ] 바이러스 스캔 (ClamAV)

---

## 10. 기능 수량 요약

| 카테고리 | 기능 수 |
|---|---|
| 인증 & 사용자 | 10 |
| 프로젝트 (Space) | 9 |
| 워크 아이템 | 11 |
| 문서/지식 | 11 + 10 (고급) |
| 요구사항 | 7 |
| 테스트 | 7 |
| 추적성 | 6 + 6 (양방향) |
| 구성/변경 | 6 |
| 워크플로우 | 7 + 7 (빌더) |
| ASPICE | 6 |
| 이해관계자 | 8 |
| 알림 | 5 |
| 검색 | 6 |
| MCP Server | 9 |
| REST API | 5 |
| Git/CI | 5 |
| 애자일 | 4 |
| R&R | 5 |
| WBS | 7 |
| Export | 7 |
| 통합 뷰 | 5 |
| 감사 로그 | 6 |
| **총계** | **~140개 기능** |

---

**이 추가 기능들을 REQUIREMENTS.md와 SPEC.md에 반영할까요? 아니면 별도 문서로 관리할까요?**