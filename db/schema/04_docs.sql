-- ============================================================
-- 04_docs.sql
-- 문서/지식 관리 (Confluence 핵심: Pages, Comments, Attachments)
-- ============================================================

-- ── 페이지 템플릿 (Confluence Templates + ASPICE Deliverables) ─
CREATE TABLE page_templates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,  -- NULL = 글로벌
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    body        JSONB,                    -- TipTap JSON 템플릿
    category    VARCHAR(50),              -- aspice, general, meeting, spec
    aspice_process VARCHAR(20),           -- SWE.2 등 매핑
    is_system   BOOLEAN DEFAULT FALSE,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 페이지 (Confluence Page) ─────────────────────────────────
-- work_items.type='page' 인 경우 확장 테이블
CREATE TABLE pages (
    work_item_id    UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE,
    parent_page_id  UUID REFERENCES work_items(id) ON DELETE SET NULL,
    template_id     UUID REFERENCES page_templates(id),
    position        INT DEFAULT 0,         -- 형제 간 정렬 순서
    is_homepage     BOOLEAN DEFAULT FALSE,  -- 스페이스 홈 페이지
    view_count      INT DEFAULT 0,
    last_viewed_at  TIMESTAMPTZ
);

CREATE INDEX idx_pages_parent ON pages(parent_page_id);

-- ── 페이지 버전 (Confluence Version History) ─────────────────
-- work_item_versions와 별도로 문서 전용 버전 관리
CREATE TABLE page_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id         UUID REFERENCES work_items(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    title           VARCHAR(500),
    body            JSONB,
    body_text       TEXT,
    author_id       UUID REFERENCES users(id),
    change_summary  VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, version)
);

-- ── 댓글 (Confluence Comments) ───────────────────────────────
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type     VARCHAR(50) NOT NULL,   -- work_item, page, test_run, review, baseline
    target_id       UUID NOT NULL,
    parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE, -- 스레드
    author_id       UUID REFERENCES users(id),
    body            TEXT NOT NULL,
    body_html       TEXT,
    -- Confluence 인라인 댓글
    anchor          JSONB,                  -- {from, to, text} 인라인 위치
    is_inline       BOOLEAN DEFAULT FALSE,
    is_resolved     BOOLEAN DEFAULT FALSE,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- ── 댓글 반응 (Reactions) ───────────────────────────────────
CREATE TABLE comment_reactions (
    comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    emoji       VARCHAR(50) NOT NULL,       -- 👍, ❤️, etc.
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id, emoji)
);

-- ── 첨부파일 (Attachments) ───────────────────────────────────
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type     VARCHAR(50) NOT NULL,   -- work_item, page, comment, test_run, review
    target_id       UUID NOT NULL,
    file_name       VARCHAR(500) NOT NULL,
    file_path       TEXT NOT NULL,           -- S3/MinIO 경로
    file_size       BIGINT,
    mime_type       VARCHAR(200),
    thumbnail_path  TEXT,
    uploaded_by     UUID REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_attachments_target ON attachments(target_type, target_id);

-- ── 페이지 라벨 (Confluence Labels) ──────────────────────────
CREATE TABLE page_labels (
    page_id     UUID REFERENCES work_items(id) ON DELETE CASCADE,
    label_id    UUID REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, label_id)
);

-- ── 페이지 즐겨찾기 (Confluence Favorites) ───────────────────
CREATE TABLE favorites (
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id   UUID NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, target_type, target_id)
);
