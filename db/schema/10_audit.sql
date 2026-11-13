-- ============================================================
-- 10_audit.sql
-- 감사 로그 & 증적 (ASPICE SUP.8, SUP.10)
-- ============================================================

-- ── 감사 로그 (Audit Log) ──────────────────────────────────
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- 대상
    entity_type     VARCHAR(50) NOT NULL,     -- work_item, page, baseline, user, space, ...
    entity_id       UUID NOT NULL,
    -- 액션
    action          VARCHAR(50) NOT NULL,     -- create, update, delete, status_change, approve, link, unlink
    -- 변경 내용
    field_name      VARCHAR(100),             -- 변경된 필드 (update 시)
    old_value       JSONB,
    new_value       JSONB,
    diff            JSONB,                    -- 상세 diff
    -- 수행자
    actor_id        UUID REFERENCES users(id),
    actor_ip        INET,
    actor_user_agent TEXT,
    -- 세션
    session_id      VARCHAR(255),
    -- ASPICE 증적
    is_evidence     BOOLEAN DEFAULT FALSE,    -- 증적 여부
    evidence_tag    VARCHAR(100),             -- 예: "SWE.2-Review", "SUP.8-Baseline"
    -- 메타
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_evidence ON audit_log(is_evidence) WHERE is_evidence = TRUE;

-- ── 증적 링크 (Evidence Links) ──────────────────────────────
CREATE TABLE evidence_links (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_log_id    UUID REFERENCES audit_log(id) ON DELETE CASCADE,
    -- ASPICE 매핑
    aspice_process  VARCHAR(20) NOT NULL,     -- SWE.1, SWE.2, ...
    aspice_clause   VARCHAR(50),              -- 예: "SWE.2.BP3"
    work_item_id    UUID REFERENCES work_items(id),
    -- 증적 설명
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_process ON evidence_links(aspice_process);

-- ── 활동 피드 (Activity Feed) ───────────────────────────────
CREATE TABLE activity_feed (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id        UUID REFERENCES spaces(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,
    target_type     VARCHAR(50) NOT NULL,
    target_id       UUID NOT NULL,
    target_title    VARCHAR(500),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_space ON activity_feed(space_id, created_at DESC);
CREATE INDEX idx_activity_actor ON activity_feed(actor_id);

-- ── 알림 (Notifications) ────────────────────────────────────
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,     -- mention, assignment, status_change, review_request, ...
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    target_type     VARCHAR(50),
    target_id       UUID,
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ── 알림 설정 ───────────────────────────────────────────────
CREATE TABLE notification_preferences (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    channel         VARCHAR(20) DEFAULT 'in_app', -- in_app, email, slack, teams
    enabled         BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, notification_type, channel)
);
