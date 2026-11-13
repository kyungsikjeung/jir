-- ============================================================
-- 01_core.sql
-- 사용자, 조직, 역할, 권한 (Jira: Users/Groups/Permissions)
-- ============================================================

-- UUID 확장 (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 조직 (Organization) ──────────────────────────────────────
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    logo_url    TEXT,
    plan        VARCHAR(50) DEFAULT 'free',   -- free, pro, enterprise
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 사용자 (User) ────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),              -- NULL if SSO only
    display_name    VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    title           VARCHAR(100),              -- 직책 (예: "SW Engineer")
    department      VARCHAR(100),              -- 부서
    locale          VARCHAR(10) DEFAULT 'ko',
    timezone        VARCHAR(50) DEFAULT 'Asia/Seoul',
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);

-- ── SSO / 외부 인증 (OAuth, SAML, LDAP) ─────────────────────
CREATE TABLE user_identities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,      -- google, microsoft, saml, ldap
    provider_uid    VARCHAR(255) NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_uid)
);

-- ── 역할 (Role) ──────────────────────────────────────────────
-- Jira: Project Roles / Global Roles
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,        -- Admin, PM, SE, QA, CM, Viewer
    description TEXT,
    is_system   BOOLEAN DEFAULT FALSE,        -- 시스템 기본 역할 (삭제 불가)
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, name)
);

-- ── 권한 (Permission) ────────────────────────────────────────
-- ASPICE 프로세스별 세분화 권한
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(100) UNIQUE NOT NULL,  -- 예: "requirement.create", "baseline.approve"
    description TEXT,
    category    VARCHAR(50)                    -- core, requirement, test, config, process
);

-- ── 역할-권한 매핑 ───────────────────────────────────────────
CREATE TABLE role_permissions (
    role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ── 사용자-역할 매핑 (글로벌) ────────────────────────────────
CREATE TABLE user_roles (
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_by  UUID REFERENCES users(id),
    granted_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- ── 기본 권한 시드 데이터 ────────────────────────────────────
INSERT INTO permissions (code, description, category) VALUES
    -- Core
    ('space.view',          '스페이스 조회',           'core'),
    ('space.manage',        '스페이스 설정 관리',       'core'),
    ('workitem.create',     '워크 아이템 생성',         'core'),
    ('workitem.edit',       '워크 아이템 수정',         'core'),
    ('workitem.delete',     '워크 아이템 삭제',         'core'),
    ('workitem.view',       '워크 아이템 조회',         'core'),
    -- Requirement
    ('requirement.create',  '요구사항 생성',            'requirement'),
    ('requirement.approve', '요구사항 승인',            'requirement'),
    ('requirement.release', '요구사항 릴리스',          'requirement'),
    -- Test
    ('testcase.create',     '테스트 케이스 생성',       'test'),
    ('testrun.execute',     '테스트 실행',              'test'),
    ('testrun.approve',     '테스트 결과 승인',         'test'),
    -- Config
    ('baseline.create',     '베이스라인 생성',          'config'),
    ('baseline.approve',    '베이스라인 승인',          'config'),
    ('changerequest.create','변경 요청 생성',           'config'),
    ('changerequest.approve','변경 요청 승인',          'config'),
    -- Process
    ('review.conduct',      '리뷰 수행',               'process'),
    ('audit.view',          '감사 로그 조회',           'process'),
    ('compliance.view',     '컴플라이언스 대시보드 조회','process');

-- ── 시스템 기본 역할 시드 (org_id NULL = 글로벌 템플릿) ──────
-- 실제 조직 생성 시 복사하여 사용
INSERT INTO roles (id, org_id, name, description, is_system) VALUES
    (uuid_generate_v4(), NULL, 'Admin',   '시스템 관리자 (모든 권한)', TRUE),
    (uuid_generate_v4(), NULL, 'PM',     '프로젝트 매니저',            TRUE),
    (uuid_generate_v4(), NULL, 'SE',     '시스템/소프트웨어 엔지니어',  TRUE),
    (uuid_generate_v4(), NULL, 'QA',     '품질 보증 / 테스트',          TRUE),
    (uuid_generate_v4(), NULL, 'CM',     '구성 관리자',                TRUE),
    (uuid_generate_v4(), NULL, 'Viewer', '읽기 전용',                  TRUE);
