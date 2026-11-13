-- ============================================================
-- 02_spaces.sql
-- 스페이스 (Jira Project + Confluence Space 통합)
-- ============================================================

-- ── 스페이스 (Space) ─────────────────────────────────────────
-- Jira의 "Project"와 Confluence의 "Space"를 하나로 통합
CREATE TABLE spaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key             VARCHAR(20) UNIQUE NOT NULL,   -- 예: "ADAS", "ECU-BMS"
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    space_type      VARCHAR(50) DEFAULT 'software', -- software, business, service_desk
    icon_url        TEXT,
    -- ASPICE 프로필
    aspice_level    VARCHAR(10) DEFAULT '2',        -- 1, 2, 3
    automotive_domain VARCHAR(50),                  -- adas, powertrain, infotainment, chassis
    process_profile  VARCHAR(50) DEFAULT 'default',  -- 적용할 프로세스 템플릿
    -- 설정
    default_workflow_id UUID,                       -- FK는 09_workflow에서 추가
    settings        JSONB DEFAULT '{}',
    is_archived     BOOLEAN DEFAULT FALSE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spaces_org ON spaces(org_id);
CREATE INDEX idx_spaces_key ON spaces(key);

-- ── 스페이스 멤버 (Space-level 역할) ─────────────────────────
-- Jira: Project Roles
CREATE TABLE space_members (
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID REFERENCES roles(id) ON DELETE CASCADE,
    added_by    UUID REFERENCES users(id),
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (space_id, user_id)
);

CREATE INDEX idx_space_members_user ON space_members(user_id);

-- ── 스페이스 구성요소 (Components) ───────────────────────────
-- Jira: Components
CREATE TABLE components (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    lead_user_id UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, name)
);

-- ── 라벨 (Labels) ────────────────────────────────────────────
CREATE TABLE labels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    color       VARCHAR(7) DEFAULT '#6B7280',
    UNIQUE(space_id, name)
);

-- ── 버전/릴리스 (Versions) ───────────────────────────────────
-- Jira: Versions/Releases
CREATE TABLE versions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    release_date DATE,
    status      VARCHAR(20) DEFAULT 'unreleased', -- unreleased, released, archived
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, name)
);
