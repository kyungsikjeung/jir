-- ============================================================
-- 11_process.sql
-- ASPICE 프로세스 & 컴플라이언스
-- ============================================================

-- ── ASPICE 프로세스 영역 ────────────────────────────────────
CREATE TABLE process_areas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(20) UNIQUE NOT NULL,  -- SYS.1, SWE.1, SWE.2, ..., SUP.1, MAN.3
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(50) NOT NULL,         -- system, software, support, management, process_improvement
    description     TEXT,
    -- ASPICE 레벨
    level           INT NOT NULL,                 -- 1, 2, 3, 4, 5
    parent_code     VARCHAR(20),                  -- 상위 프로세스
    -- 필수 산출물
    required_work_products TEXT[] DEFAULT '{}',   -- ["Software Requirements Specification", "Architecture Design", ...]
    sort_order      INT DEFAULT 0
);

-- 시드 데이터: ASPICE 프로세스 영역
INSERT INTO process_areas (code, name, category, level, sort_order) VALUES
    -- System Engineering
    ('SYS.1', 'Requirements Elicitation', 'system', 2, 1),
    ('SYS.2', 'System Requirements Analysis', 'system', 2, 2),
    ('SYS.3', 'System Architectural Design', 'system', 2, 3),
    ('SYS.4', 'System Integration and Integration Test', 'system', 2, 4),
    ('SYS.5', 'System Qualification Test', 'system', 2, 5),
    -- Software Engineering
    ('SWE.1', 'Software Requirements Analysis', 'software', 2, 10),
    ('SWE.2', 'Software Architectural Design', 'software', 2, 11),
    ('SWE.3', 'Software Detailed Design and Unit Construction', 'software', 2, 12),
    ('SWE.4', 'Software Unit Verification', 'software', 2, 13),
    ('SWE.5', 'Software Integration and Integration Test', 'software', 2, 14),
    ('SWE.6', 'Software Qualification Test', 'software', 2, 15),
    -- Support
    ('SUP.1', 'Quality Assurance', 'support', 2, 20),
    ('SUP.2', 'Verification', 'support', 2, 21),
    ('SUP.4', 'Joint Review', 'support', 2, 22),
    ('SUP.7', 'Documentation', 'support', 2, 23),
    ('SUP.8', 'Configuration Management', 'support', 2, 24),
    ('SUP.9', 'Problem Resolution Management', 'support', 2, 25),
    ('SUP.10', 'Change Request Management', 'support', 2, 26),
    -- Management
    ('MAN.3', 'Project Management', 'management', 2, 30),
    ('MAN.5', 'Risk Management', 'management', 2, 31),
    -- Process Improvement
    ('PIM.3', 'Process Improvement', 'process_improvement', 3, 40);

-- ── 프로세스 템플릿 (워크플로우 + 산출물 세트) ─────────────
CREATE TABLE process_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    aspice_level    VARCHAR(10) NOT NULL,    -- 2, 3
    automotive_domain VARCHAR(50),            -- adas, powertrain, etc.
    -- 포함 프로세스
    process_codes   TEXT[] NOT NULL,          -- ['SWE.1', 'SWE.2', ...]
    -- 워크플로우 매핑
    workflow_mappings JSONB DEFAULT '{}',    -- {process_code: workflow_id}
    -- 산출물 템플릿
    deliverable_templates JSONB DEFAULT '[]', -- [{name, template_id, process_code}]
    is_system       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 프로세스 평가 (Process Assessment) ──────────────────────
CREATE TABLE process_assessments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    process_code    VARCHAR(20) REFERENCES process_areas(code),
    -- 평가
    capability_level INT NOT NULL,            -- 0~5
    assessment_date DATE NOT NULL,
    assessor_id     UUID REFERENCES users(id),
    -- 증적
    evidence_items  UUID[] DEFAULT '{}',     -- audit_log IDs
    notes           TEXT,
    -- 메타
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 컴플라이언스 체크리스트 ─────────────────────────────────
CREATE TABLE compliance_checklists (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    process_code    VARCHAR(20) REFERENCES process_areas(code),
    item_name       VARCHAR(500) NOT NULL,
    description     TEXT,
    is_required     BOOLEAN DEFAULT TRUE,
    -- 상태
    status          VARCHAR(30) DEFAULT 'not_started', -- not_started, in_progress, completed, not_applicable
    evidence_id     UUID REFERENCES audit_log(id),
    assigned_to     UUID REFERENCES users(id),
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklists_space ON compliance_checklists(space_id);
CREATE INDEX idx_checklists_process ON compliance_checklists(process_code);

-- ── 스페이스-프로세스 매핑 ──────────────────────────────────
CREATE TABLE space_process_areas (
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    process_code    VARCHAR(20) REFERENCES process_areas(code),
    is_applicable   BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    PRIMARY KEY (space_id, process_code)
);
