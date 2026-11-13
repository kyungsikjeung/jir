-- ============================================================
-- 06_tests.sql
-- 테스트 관리 (SWE.4, SWE.5, SWE.6)
-- ============================================================

-- ── 테스트 케이스 (work_items.type='test_case') ─────────────
CREATE TABLE test_cases (
    work_item_id    UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    test_type       VARCHAR(50) NOT NULL,   -- unit, integration, system, acceptance, regression
    -- 테스트 단계
    preconditions   TEXT,
    postconditions  TEXT,
    steps           JSONB DEFAULT '[]',     -- [{step_no, action, expected_result, test_data}]
    -- 자동화
    is_automated    BOOLEAN DEFAULT FALSE,
    automation_framework VARCHAR(50),       -- jest, pytest, gtest, robot, etc.
    automation_script_path TEXT,
    -- 환경
    test_environment VARCHAR(100),
    -- 메타
    estimated_duration INT,                 -- 초 단위
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 테스트 스위트 (Test Suite) ──────────────────────────────
CREATE TABLE test_suites (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id   UUID REFERENCES test_suites(id) ON DELETE SET NULL,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_suite_cases (
    suite_id    UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
    position    INT DEFAULT 0,
    PRIMARY KEY (suite_id, test_case_id)
);

-- ── 테스트 실행 (Test Run) ──────────────────────────────────
CREATE TABLE test_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,   -- 예: "Sprint 5 Regression"
    description     TEXT,
    test_suite_id   UUID REFERENCES test_suites(id),
    -- 실행 정보
    environment     VARCHAR(100),            -- dev, staging, HIL, SIL
    build_version   VARCHAR(100),            -- 테스트 대상 빌드
    baseline_id     UUID,                    -- FK: baselines
    -- 상태
    status          VARCHAR(30) DEFAULT 'planned', -- planned, in_progress, completed, aborted
    -- 실행자
    assigned_to     UUID REFERENCES users(id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_runs_space ON test_runs(space_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);

-- ── 테스트 결과 (Test Result) ───────────────────────────────
CREATE TABLE test_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_run_id     UUID REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id    UUID REFERENCES work_items(id) ON DELETE CASCADE,
    -- 결과
    result          VARCHAR(20) NOT NULL,    -- pass, fail, blocked, skipped, not_run
    actual_result   TEXT,
    -- 증적
    evidence        JSONB DEFAULT '[]',      -- [{type: screenshot/log, path, description}]
    -- 실행 정보
    executed_by     UUID REFERENCES users(id),
    executed_at     TIMESTAMPTZ DEFAULT NOW(),
    duration_ms     INT,
    -- 결함 연동
    defect_id       UUID REFERENCES work_items(id),  -- 실패 시 생성된 결함
    -- 재실행
    retry_count     INT DEFAULT 0,
    previous_result_id UUID REFERENCES test_results(id),
    UNIQUE(test_run_id, test_case_id)
);

CREATE INDEX idx_test_results_run ON test_results(test_run_id);
CREATE INDEX idx_test_results_case ON test_results(test_case_id);
CREATE INDEX idx_test_results_result ON test_results(result);

-- ── 테스트-요구사항 커버리지 ─────────────────────────────────
CREATE TABLE test_coverage (
    test_case_id    UUID REFERENCES work_items(id) ON DELETE CASCADE,
    requirement_id  UUID REFERENCES work_items(id) ON DELETE CASCADE,
    coverage_type   VARCHAR(30) DEFAULT 'verifies', -- verifies, partially_verifies
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (test_case_id, requirement_id)
);

-- ── 결함 (Defect) - work_items.type='bug' 확장 ──────────────
CREATE TABLE defects (
    work_item_id    UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    severity        VARCHAR(20) NOT NULL,    -- critical, major, minor, trivial
    defect_type     VARCHAR(50),             -- functional, performance, security, usability
    -- 환경
    found_in_version VARCHAR(100),
    found_in_environment VARCHAR(100),
    -- 수정
    fixed_in_version VARCHAR(100),
    root_cause      TEXT,
    -- 재현
    reproduction_steps TEXT,
    -- 메트릭
    time_to_fix_hours DECIMAL(10,2),
    -- ASPICE
    safety_impact   BOOLEAN DEFAULT FALSE,   -- 안전 영향 여부
    asil_level      VARCHAR(5)               -- 영향받는 ASIL
);
