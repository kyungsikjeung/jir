-- ============================================================
-- 05_requirements.sql
-- 요구사항 관리 (SYS.1~SYS.3, SWE.1)
-- ============================================================

-- ── 요구사항 확장 (work_items.type='requirement') ────────────
CREATE TABLE requirements (
    work_item_id    UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    req_type        VARCHAR(50) NOT NULL,   -- stakeholder, system, software, interface
    -- ASPICE 속성
    asil_level      VARCHAR(5),             -- QM, A, B, C, D
    safety_related  BOOLEAN DEFAULT FALSE,
    -- 요구사항 내용
    rationale       TEXT,                   -- 근거/배경
    acceptance_criteria TEXT,               -- 인수 조건
    verification_method VARCHAR(50),        -- test, analysis, inspection, demonstration
    -- 파생/정제 관계
    derived_from_id UUID REFERENCES work_items(id) ON DELETE SET NULL,  -- 상위 요구사항
    -- 상태 관리
    review_status   VARCHAR(30) DEFAULT 'draft', -- draft, in_review, approved, rejected
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    -- 베이스라인
    baseline_id     UUID,                   -- FK: baselines
    -- 외부 연동 (DOORS, Polarion 등)
    external_id     VARCHAR(255),           -- 외부 도구 ID
    external_source VARCHAR(100)            -- doors, polarion, Jama
);

CREATE INDEX idx_req_type ON requirements(req_type);
CREATE INDEX idx_req_asil ON requirements(asil_level);
CREATE INDEX idx_req_derived ON requirements(derived_from_id);

-- ── 요구사항 속성 (확장 가능) ────────────────────────────────
CREATE TABLE requirement_attributes (
    requirement_id  UUID REFERENCES requirements(work_item_id) ON DELETE CASCADE,
    attr_key        VARCHAR(100) NOT NULL,
    attr_value      TEXT,
    PRIMARY KEY (requirement_id, attr_key)
);

-- ── 요구사항 관계 (derive, refine, satisfy, conflict) ────────
CREATE TABLE requirement_relations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_req_id     UUID REFERENCES work_items(id) ON DELETE CASCADE,
    to_req_id       UUID REFERENCES work_items(id) ON DELETE CASCADE,
    relation_type   VARCHAR(50) NOT NULL,   -- derives, refines, satisfies, conflicts, duplicates
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_req_id, to_req_id, relation_type)
);

-- ── 요구사항 변경 이력 (버전별 diff) ─────────────────────────
CREATE TABLE requirement_change_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id  UUID REFERENCES work_items(id) ON DELETE CASCADE,
    version_from    INT NOT NULL,
    version_to      INT NOT NULL,
    changed_fields  JSONB,                  -- {field: {old, new}}
    changed_by      UUID REFERENCES users(id),
    changed_at      TIMESTAMPTZ DEFAULT NOW()
);
