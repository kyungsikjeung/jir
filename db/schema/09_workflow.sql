-- ============================================================
-- 09_workflow.sql
-- 워크플로우/프로세스 (Jira Workflow + ASPICE Process)
-- ============================================================

-- ── 워크플로우 (Workflow) ───────────────────────────────────
CREATE TABLE workflows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,  -- NULL = 글로벌
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    -- ASPICE 매핑
    aspice_process  VARCHAR(20),              -- SWE.2, SWE.3, ...
    is_default      BOOLEAN DEFAULT FALSE,
    is_system       BOOLEAN DEFAULT FALSE,     -- 시스템 기본 (삭제 불가)
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 워크플로우 상태 (States) ────────────────────────────────
CREATE TABLE workflow_states (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID REFERENCES workflows(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,    -- Draft, In Review, Approved, Released
    description     TEXT,
    category        VARCHAR(20) NOT NULL,     -- todo, in_progress, done
    color           VARCHAR(7) DEFAULT '#6B7280',
    position        INT DEFAULT 0,            -- 보드 컬럼 순서
    -- ASPICE
    is_initial      BOOLEAN DEFAULT FALSE,    -- 초기 상태
    is_terminal     BOOLEAN DEFAULT FALSE,    -- 종료 상태
    UNIQUE(workflow_id, name)
);

CREATE INDEX idx_wf_states_workflow ON workflow_states(workflow_id);

-- ── 워크플로우 전이 (Transitions) ───────────────────────────
CREATE TABLE workflow_transitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID REFERENCES workflows(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,    -- "Submit for Review", "Approve", "Reject"
    from_state_id   UUID REFERENCES workflow_states(id) ON DELETE CASCADE,
    to_state_id     UUID REFERENCES workflow_states(id) ON DELETE CASCADE,
    -- 조건
    condition_type  VARCHAR(50),              -- role_check, field_required, approval_count
    condition_config JSONB DEFAULT '{}',      -- {roles: ["PM", "SE"], min_approvers: 2}
    -- 사후 액션
    post_actions    JSONB DEFAULT '[]',       -- [{type: "notify", config: {...}}, {type: "create_link", ...}]
    -- 메타
    is_global       BOOLEAN DEFAULT FALSE,    -- 모든 상태에서 가능 (예: "Cancel")
    position        INT DEFAULT 0,
    UNIQUE(workflow_id, from_state_id, to_state_id)
);

CREATE INDEX idx_wf_trans_workflow ON workflow_transitions(workflow_id);
CREATE INDEX idx_wf_trans_from ON workflow_transitions(from_state_id);

-- ── 워크플로우 전이 이력 ────────────────────────────────────
CREATE TABLE workflow_transition_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_item_id    UUID REFERENCES work_items(id) ON DELETE CASCADE,
    transition_id   UUID REFERENCES workflow_transitions(id),
    from_state_id   UUID REFERENCES workflow_states(id),
    to_state_id     UUID REFERENCES workflow_states(id),
    performed_by    UUID REFERENCES users(id),
    comment         TEXT,
    performed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wth_item ON workflow_transition_history(work_item_id);

-- ── spaces.default_workflow_id FK 추가 ───────────────────────
ALTER TABLE spaces
    ADD CONSTRAINT fk_spaces_default_workflow
    FOREIGN KEY (default_workflow_id) REFERENCES workflows(id) ON DELETE SET NULL;

-- ── work_items.workflow_state_id FK 추가 ─────────────────────
ALTER TABLE work_items
    ADD CONSTRAINT fk_work_items_workflow_state
    FOREIGN KEY (workflow_state_id) REFERENCES workflow_states(id) ON DELETE SET NULL;

-- ── 리뷰 (Reviews) ──────────────────────────────────────────
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    review_type     VARCHAR(50) NOT NULL,     -- code, design, requirement, test, document
    -- 대상
    target_type     VARCHAR(50) NOT NULL,     -- work_item, baseline, page
    target_id       UUID NOT NULL,
    -- 상태
    status          VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    -- 리뷰어
    moderator_id    UUID REFERENCES users(id),
    -- ASPICE
    aspice_process  VARCHAR(20),
    -- 메타
    due_date        DATE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE review_participants (
    review_id       UUID REFERENCES reviews(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(30) DEFAULT 'reviewer', -- reviewer, author, moderator
    status          VARCHAR(30) DEFAULT 'pending',  -- pending, approved, rejected, abstained
    decision_at     TIMESTAMPTZ,
    comment         TEXT,
    PRIMARY KEY (review_id, user_id)
);

CREATE TABLE review_findings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id       UUID REFERENCES reviews(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    severity        VARCHAR(20) DEFAULT 'minor', -- critical, major, minor, suggestion
    status          VARCHAR(30) DEFAULT 'open',  -- open, resolved, waived, deferred
    -- 위치 (인라인)
    location        JSONB,                     -- {file, line, section}
    -- 결함 연동
    defect_id       UUID REFERENCES work_items(id),
    -- 메타
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- ── 승인 (Approvals) ────────────────────────────────────────
CREATE TABLE approvals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50) NOT NULL,     -- work_item, baseline, change_request, document
    entity_id       UUID NOT NULL,
    approver_id     UUID REFERENCES users(id),
    decision        VARCHAR(20) NOT NULL,     -- approve, reject, abstain
    comment         TEXT,
    -- 전자서명 (ASPICE 증적)
    signature       TEXT,                     -- Base64 서명 또는 해시
    signature_method VARCHAR(30),             -- password, certificate, sso
    decided_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, approver_id)
);

CREATE INDEX idx_approvals_entity ON approvals(entity_type, entity_id);
