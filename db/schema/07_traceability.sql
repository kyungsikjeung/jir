-- ============================================================
-- 07_traceability.sql
-- 추적성 매트릭스 (ALM 핵심 기능)
-- ============================================================

-- ── 추적성 링크 (범용) ──────────────────────────────────────
-- Jira/Confluence에 없는 ALM 고유 기능
CREATE TABLE trace_links (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- 소스 (from)
    from_type       VARCHAR(50) NOT NULL,    -- requirement, design, code, test_case, defect, change_request
    from_id         UUID NOT NULL,
    -- 대상 (to)
    to_type         VARCHAR(50) NOT NULL,
    to_id           UUID NOT NULL,
    -- 링크 유형
    link_type       VARCHAR(50) NOT NULL,    -- verifies, satisfies, implements, tests, derives, refines, traces_to
    -- 메타
    description     TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    -- 베이스라인 (이 링크가 유효한 베이스라인)
    baseline_id     UUID,                   -- FK: baselines
    is_suspect      BOOLEAN DEFAULT FALSE,   -- 변경으로 인해 재검증 필요 (Suspect Link)
    UNIQUE(from_type, from_id, to_type, to_id, link_type)
);

CREATE INDEX idx_trace_from ON trace_links(from_type, from_id);
CREATE INDEX idx_trace_to ON trace_links(to_type, to_id);
CREATE INDEX idx_trace_type ON trace_links(link_type);
CREATE INDEX idx_trace_suspect ON trace_links(is_suspect) WHERE is_suspect = TRUE;

-- ── 추적성 매트릭스 스냅샷 ──────────────────────────────────
CREATE TABLE trace_matrix_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    baseline_id     UUID,                   -- FK: baselines
    name            VARCHAR(255) NOT NULL,
    -- 매트릭스 데이터 (JSON)
    matrix_data     JSONB NOT NULL,         -- {rows: [...], cols: [...], cells: [...]}
    -- 커버리지 통계
    total_requirements INT DEFAULT 0,
    covered_requirements INT DEFAULT 0,
    coverage_percent DECIMAL(5,2) DEFAULT 0,
    -- 메타
    generated_by    UUID REFERENCES users(id),
    generated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 커버리지 리포트 ─────────────────────────────────────────
CREATE TABLE coverage_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    baseline_id     UUID,
    report_type     VARCHAR(50) NOT NULL,    -- requirement_coverage, test_coverage, code_coverage
    -- 결과
    total_items     INT NOT NULL,
    covered_items   INT NOT NULL,
    coverage_percent DECIMAL(5,2) NOT NULL,
    uncovered_items JSONB DEFAULT '[]',     -- 미커버 항목 ID 목록
    -- 메타
    generated_by    UUID REFERENCES users(id),
    generated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Suspect Link 관리 ────────────────────────────────────────
-- 요구사항 변경 시 영향받는 하위 항목을 suspect로 표시
CREATE TABLE suspect_links (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_link_id   UUID REFERENCES trace_links(id) ON DELETE CASCADE,
    reason          TEXT,                    -- 변경 사유
    marked_at       TIMESTAMPTZ DEFAULT NOW(),
    marked_by       UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id),
    resolution      VARCHAR(50)              -- verified, updated, waived
);
