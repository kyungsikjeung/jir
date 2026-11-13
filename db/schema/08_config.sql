-- ============================================================
-- 08_config.sql
-- 구성/변경 관리 (SUP.8, SUP.10, CM)
-- ============================================================

-- ── 베이스라인 (Baseline) ───────────────────────────────────
CREATE TABLE baselines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,   -- 예: "v1.0.0", "Sprint 5 Release"
    description     TEXT,
    version         VARCHAR(50),             -- 시맨틱 버전
    baseline_type   VARCHAR(50) DEFAULT 'release', -- release, milestone, sprint, custom
    -- 상태
    status          VARCHAR(30) DEFAULT 'draft', -- draft, under_review, approved, released
    -- 스냅샷 (베이스라인 시점의 모든 항목 상태)
    snapshot_data   JSONB,                   -- {work_items: [...], trace_links: [...]}
    -- 승인
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    released_at     TIMESTAMPTZ,
    -- 메타
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, name)
);

CREATE INDEX idx_baselines_space ON baselines(space_id);
CREATE INDEX idx_baselines_status ON baselines(status);

-- ── 베이스라인 항목 (Baseline Items) ────────────────────────
CREATE TABLE baseline_items (
    baseline_id     UUID REFERENCES baselines(id) ON DELETE CASCADE,
    item_type       VARCHAR(50) NOT NULL,    -- work_item, document, code_module
    item_id         UUID NOT NULL,
    item_version    INT,                     -- 해당 항목의 버전
    PRIMARY KEY (baseline_id, item_type, item_id)
);

-- ── 구성 항목 (Configuration Items) ─────────────────────────
CREATE TABLE configuration_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    ci_type         VARCHAR(50) NOT NULL,    -- document, source_code, model, hardware, test_data
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    -- 위치/버전
    location        TEXT,                    -- Git path, file path, URL
    current_version VARCHAR(50),
    -- 상태
    status          VARCHAR(30) DEFAULT 'active', -- active, deprecated, retired
    -- 연동
    linked_work_items UUID[] DEFAULT '{}',
    -- 메타
    owner_id        UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 변경 요청 (Change Request) ──────────────────────────────
CREATE TABLE change_requests (
    work_item_id    UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    cr_type         VARCHAR(50) DEFAULT 'standard', -- standard, emergency, normal
    -- 영향 분석
    impact_analysis TEXT,
    affected_items  UUID[] DEFAULT '{}',     -- 영향받는 work_item IDs
    estimated_effort INT,                    -- 시간 단위
    -- 우선순위/긴급도
    urgency         VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    -- 승인
    approval_status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected, deferred
    -- 메타
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 변경 요청-베이스라인 영향 ───────────────────────────────
CREATE TABLE change_baseline_impact (
    change_request_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
    baseline_id     UUID REFERENCES baselines(id) ON DELETE CASCADE,
    impact_level    VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    PRIMARY KEY (change_request_id, baseline_id)
);

-- ── 릴리스 (Release) ────────────────────────────────────────
CREATE TABLE releases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    version         VARCHAR(50),
    release_date    DATE,
    status          VARCHAR(30) DEFAULT 'planned', -- planned, in_progress, released, cancelled
    baseline_id     UUID REFERENCES baselines(id),
    -- 메타
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, name)
);
