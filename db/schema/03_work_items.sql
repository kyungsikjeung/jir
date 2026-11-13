-- ============================================================
-- 03_work_items.sql
-- 워크 아이템 (Jira Issue + Confluence Page 통합 객체)
-- ============================================================

-- ── 워크 아이템 타입 정의 ────────────────────────────────────
CREATE TABLE work_item_types (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,        -- Epic, Story, Task, Bug, Requirement, Test Case, Page, ...
    icon        VARCHAR(50),
    color       VARCHAR(7),
    hierarchy_level INT DEFAULT 0,            -- 0: Epic, 1: Story/Task, 2: Sub-task
    is_subtask  BOOLEAN DEFAULT FALSE,
    -- ASPICE 매핑
    aspice_process VARCHAR(20),              -- SWE.1, SWE.2, ... (NULL이면 일반)
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, name)
);

-- ── 워크 아이템 (핵심 테이블) ────────────────────────────────
CREATE TABLE work_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    type_id         UUID REFERENCES work_item_types(id),
    -- 식별자
    key             VARCHAR(50) NOT NULL,      -- 예: "ADAS-123"
    -- 기본 필드 (Jira 스타일)
    title           VARCHAR(500) NOT NULL,
    description     TEXT,                     -- 마크다운/HTML
    status          VARCHAR(50) DEFAULT 'open', -- open, in_progress, in_review, done, closed
    priority        VARCHAR(20) DEFAULT 'medium', -- lowest, low, medium, high, highest
    -- 담당/보고
    assignee_id     UUID REFERENCES users(id),
    reporter_id     UUID REFERENCES users(id),
    -- 계층
    parent_id       UUID REFERENCES work_items(id) ON DELETE SET NULL,
    epic_id         UUID REFERENCES work_items(id) ON DELETE SET NULL,
    -- 워크플로우
    workflow_state_id UUID,                   -- FK: 09_workflow
    -- 버전/베이스라인
    version         INT DEFAULT 1,
    baseline_id     UUID,                     -- FK: 08_config
    -- Confluence 스타일 (문서 본문)
    body            JSONB,                    -- TipTap/ProseMirror JSON
    body_text       TEXT,                     -- 전문 검색용 평문
    -- 메타
    labels          TEXT[] DEFAULT '{}',
    components      UUID[] DEFAULT '{}',
    fix_versions     UUID[] DEFAULT '{}',
    due_date        DATE,
    story_points    INT,
    -- ASPICE 특화
    aspice_process  VARCHAR(20),              -- SWE.1 ~ SWE.6, SYS.1 ~ SYS.5
    asil_level      VARCHAR(5),               -- QM, A, B, C, D
    -- 타임스탬프
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    UNIQUE(space_id, key)
);

CREATE INDEX idx_work_items_space ON work_items(space_id);
CREATE INDEX idx_work_items_type ON work_items(type_id);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_assignee ON work_items(assignee_id);
CREATE INDEX idx_work_items_parent ON work_items(parent_id);
CREATE INDEX idx_work_items_epic ON work_items(epic_id);
CREATE INDEX idx_work_items_aspice ON work_items(aspice_process);
-- 전문 검색 인덱스
CREATE INDEX idx_work_items_fts ON work_items
    USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body_text,'')));

-- ── 워크 아이템 링크 (Jira Issue Links) ─────────────────────
CREATE TABLE work_item_links (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_id     UUID REFERENCES work_items(id) ON DELETE CASCADE,
    to_id       UUID REFERENCES work_items(id) ON DELETE CASCADE,
    link_type   VARCHAR(50) NOT NULL,          -- blocks, is_blocked_by, relates_to, duplicates, ...
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_id, to_id, link_type)
);

CREATE INDEX idx_wil_from ON work_item_links(from_id);
CREATE INDEX idx_wil_to ON work_item_links(to_id);

-- ── 워크 아이템 버전 (Confluence Page History) ───────────────
CREATE TABLE work_item_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_item_id    UUID REFERENCES work_items(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    title           VARCHAR(500),
    body            JSONB,
    body_text       TEXT,
    changed_by      UUID REFERENCES users(id),
    change_summary  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(work_item_id, version)
);

CREATE INDEX idx_wiv_item ON work_item_versions(work_item_id);

-- ── 워크 아이템 감시자 (Watchers) ───────────────────────────
CREATE TABLE work_item_watchers (
    work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    added_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (work_item_id, user_id)
);

-- ── 워크 아이템 커스텀 필드 값 ──────────────────────────────
-- Jira: Custom Fields
CREATE TABLE custom_field_defs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    field_type  VARCHAR(50) NOT NULL,          -- text, number, select, multi_select, date, user, url
    options     JSONB DEFAULT '[]',            -- select 옵션
    required    BOOLEAN DEFAULT FALSE,
    default_value JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, name)
);

CREATE TABLE custom_field_values (
    work_item_id    UUID REFERENCES work_items(id) ON DELETE CASCADE,
    field_id        UUID REFERENCES custom_field_defs(id) ON DELETE CASCADE,
    value           JSONB,
    PRIMARY KEY (work_item_id, field_id)
);
