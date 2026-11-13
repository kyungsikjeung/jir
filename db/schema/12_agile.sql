-- ============================================================
-- 12_agile.sql
-- 애자일 (Jira: Boards, Sprints, Backlog)
-- ============================================================

-- ── 보드 (Board) ────────────────────────────────────────────
CREATE TABLE boards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    board_type      VARCHAR(20) NOT NULL,     -- scrum, kanban
    -- 필터
    filter_jql      TEXT,                     -- JQL 유사 쿼리
    -- 컬럼 매핑
    column_config   JSONB DEFAULT '{}',       -- {todo: [state_ids], in_progress: [...], done: [...]}
    -- 설정
    settings        JSONB DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 스프린트 (Sprint) ──────────────────────────────────────
CREATE TABLE sprints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id        UUID REFERENCES boards(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,    -- "Sprint 5"
    goal            TEXT,
    state           VARCHAR(20) DEFAULT 'future', -- future, active, closed
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sprints_board ON sprints(board_id);
CREATE INDEX idx_sprints_state ON sprints(state);

-- ── 스프린트-워크아이템 매핑 ────────────────────────────────
CREATE TABLE sprint_items (
    sprint_id       UUID REFERENCES sprints(id) ON DELETE CASCADE,
    work_item_id    UUID REFERENCES work_items(id) ON DELETE CASCADE,
    added_at        TIMESTAMPTZ DEFAULT NOW(),
    added_by        UUID REFERENCES users(id),
    PRIMARY KEY (sprint_id, work_item_id)
);

-- ── 백로그 순서 (Backlog Ranking) ───────────────────────────
CREATE TABLE backlog_ranking (
    work_item_id    UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    rank            VARCHAR(100) NOT NULL,    -- LexoRank 스타일
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backlog_rank ON backlog_ranking(space_id, rank);
