# jir — ASPICE ALM

> Jira + Confluence 스타일의 **자동차 SPICE(ASPICE) 대응 ALM**.
> 요구사항 · 테스트 · 양방향 추적성 · 문서 · 워크플로우 · 컴플라이언스 · 전자서명 · 감사 로그를 하나의 플랫폼에서.

[![Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20React%20%2B%20PostgreSQL-blue)](#기술-스택)
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)](#라이선스)

---

## 목차

1. [주요 기능](#주요-기능)
2. [기술 스택](#기술-스택)
3. [아키텍처](#아키텍처)
4. [빠른 시작 (로컬)](#빠른-시작-로컬)
5. [데모 계정](#데모-계정)
6. [API / MCP](#api--mcp)
7. [프로젝트 구조](#프로젝트-구조)
8. [문서](#문서)
9. [로드맵](#로드맵)

---

## 주요 기능

| 영역 | 설명 |
|---|---|
| **프로젝트(스페이스)** | `/spaces/{spaceKey}` 단위 멀티 프로젝트, 프로젝트별 프로세스/역할/권한 |
| **이슈/작업 항목** | Jira 스타일 Work Item (epic / requirement / task / bug / test_case / page) |
| **요구사항 관리** | ASIL, 안전 관련, 검증 방법, 인수 기준, 파생 요구사항 |
| **테스트 관리** | 테스트 케이스, 테스트 런, 결과 기록, 증적(evidence) |
| **양방향 추적성** | 요구사항 ↔ 테스트 ↔ 설계 링크, 커버리지 %, **Suspect Link** 자동 표시/해소 |
| **문서(Confluence)** | 페이지 트리, 버전 관리, TipTap WYSIWYG, 다이어그램(Mermaid) |
| **워크플로우** | 사용자 정의 상태/전이, 승인·반려, 리뷰 및 결함(Finding) |
| **ASPICE 컴플라이언스** | 19개 프로세스, 체크리스트, 산출물(Work Product), Capability 평가, 베이스라인 |
| **전자서명 / 감사** | 승인 시 서명 기록, 모든 변경 Audit Log |
| **검색** | Meilisearch 기반 이슈/문서 전문 검색 + 자동완성 |
| **첨부파일** | S3 호환 스토리지, MIME 화이트리스트, 50MB 제한 |
| **내보내기** | Word / Excel / PDF / HTML (버전 관리 연동) |
| **MCP 서버** | Rovo MCP 동등 도구 17종 (Streamable HTTP + SSE) |
| **외부 이해관계자** | 초대 기반 포털, 이메일 인증 + 관리자 승인 |

---

## 기술 스택

```
Backend   NestJS 10 (TypeScript) · Prisma 5 · PostgreSQL 16 · Redis 7
Search    Meilisearch 1.6
Storage   MinIO 호환 (pgsty/silo) · S3 SDK
Auth      JWT (자체) + Keycloak 24 (SSO 확장)
Frontend  React 18 · Vite 5 · TypeScript · TailwindCSS · TanStack Query · TipTap
Infra     Docker Compose (CLI) · Caddy · OCI Always Free 지원
```

---

## 아키텍처

```
┌──────────┐     ┌───────────┐     ┌──────────────┐
│ Frontend │────▶│  Backend  │────▶│  PostgreSQL  │
│ (React)  │     │ (NestJS)  │     ├──────────────┤
└──────────┘     │           │────▶│    Redis     │
     │           │           │     ├──────────────┤
     │           │           │────▶│ Meilisearch  │
     │           │           │     ├──────────────┤
     │           │           │────▶│  MinIO/Silo  │
     │           └───────────┘     └──────────────┘
     │                 ▲
     │                 │ JWT / MCP
     └─────────────────┘
```

---

## 빠른 시작 (로컬)

### 1) 인프라 실행 (Docker Compose CLI — 무료)

```bash
docker compose up -d
docker compose ps
```

| 서비스 | 포트 |
|---|---|
| PostgreSQL | 5432 |
| Redis | 6379 |
| Meilisearch | 7700 |
| MinIO S3 API / Console | 9000 / **9002** |
| Keycloak | 8080 |
| Caddy | 80, 443 |

> **이미지 노트**: `minio/minio`·`quay.io/minio/minio`는 2026년 9월 이후 익명 pull 불가(401).
> 본 프로젝트는 드롭인 호환 포크 `pgsty/silo`를 사용합니다.

### 2) MinIO 버킷 생성 (최초 1회)

```bash
docker exec alm-minio mc alias set local http://127.0.0.1:9000 minioadmin minioadmin
docker exec alm-minio mc mb --ignore-existing local/alm-attachments
```

### 3) 백엔드

```bash
cd backend
cp .env.example .env        # 값 확인/수정
npm install
npx prisma migrate deploy   # 스키마 적용 (93 테이블)
npm run prisma:seed         # 데모 데이터
npm run start:dev           # http://localhost:3000
```

- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/api/health

### 4) 프론트엔드

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:3000
npm install
npm run dev                 # http://localhost:5173
```

---

## 데모 계정

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 시스템 관리자 | `admin@alm.local` | `admin1234` |
| 개발자 | `dev@alm.local` | `dev1234` |
| 테스터 | `tester@alm.local` | `test1234` |
| 외부 감사자 | `auditor@external.test` | `audit1234` |

데모 스페이스: **DEMO** (Demo ECU Project, ASPICE Level 2)

---

## API / MCP

### REST

```
POST   /api/auth/login
GET    /api/spaces
GET    /api/spaces/:key/issues
GET    /api/spaces/:key/issues/wbs
GET    /api/spaces/:key/rr
POST   /api/spaces/:key/rr
GET    /api/spaces/:key/members
POST   /api/spaces/:key/requirements
GET    /api/spaces/:key/tests/cases
GET    /api/spaces/:key/trace
GET    /api/spaces/:key/trace/coverage
GET    /api/spaces/:key/compliance
GET    /api/spaces/:key/compliance/baselines
GET    /api/spaces/:key/docs
POST   /api/search
POST   /api/upload
GET    /api/audit
```

### MCP (Model Context Protocol)

| 전송 | 엔드포인트 |
|---|---|
| Streamable HTTP | `POST /api/mcp` |
| SSE (legacy) | `GET /api/mcp/sse` → `POST /api/mcp/message?sessionId=...` |

```bash
curl -s http://localhost:3000/api/mcp -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0", "id": 1, "method": "tools/list"
}'
```

**제공 도구 (17)**
`alm_search_issues`, `alm_get_issue`, `alm_create_issue`, `alm_update_issue`,
`alm_transition_issue`, `alm_add_comment`, `alm_link_issues`,
`alm_search_pages`, `alm_get_page`, `alm_create_page`, `alm_update_page`,
`alm_get_traceability`, `alm_get_coverage`, `alm_get_compliance_status`,
`alm_create_baseline`, `alm_get_project_summary`, `alm_list_spaces`

> `MCP_API_KEY` 환경변수를 설정하면 `X-MCP-API-Key` 헤더가 필수입니다.

---

## 프로젝트 구조

```
jir/
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma        # 93 테이블
│  │  ├─ migrations/          # SQL 마이그레이션
│  │  └─ seed.js              # 데모 데이터
│  └─ src/
│     ├─ common/              # 필터, 인터셉터, 가드, 데코레이터
│     └─ modules/             # 18개 도메인 모듈
├─ frontend/
│  └─ src/
│     ├─ layouts/             # App / Auth / Space / Protected
│     ├─ pages/               # auth, dashboard, spaces
│     └─ services/            # API 클라이언트
├─ db/                        # 원본 SQL 스키마 (12파일), DBML
├─ docker-compose.yml
├─ Caddyfile
├─ DEPLOYMENT.md              # 로컬/OCI/AWS/GCP/온프레미스 배포 가이드
├─ REQUIREMENTS.md
├─ SPEC.md                    # Just Enough 모듈별 명세 (17 모듈)
└─ ADDITIONAL_FEATURES.md
```

---

## 문서

| 문서 | 내용 |
|---|---|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | FR/NFR 요구사항 기준선 |
| [SPEC.md](./SPEC.md) | 모듈별 Just Enough 명세 (요구사항→API→데이터→규칙→의존성→인수기준) |
| [ADDITIONAL_FEATURES.md](./ADDITIONAL_FEATURES.md) | 140+ 확장 기능 (R&R, WBS, 워크플로우 빌더, 전자서명, 내보내기) |
| [FEATURE_INTEGRATION.md](./FEATURE_INTEGRATION.md) | 기능 의존 관계 및 구현 순서 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 로컬 / OCI 무료 티어 / 클라우드 / 온프레미스 배포 |

---

## 로드맵

- [x] DB 설계 (93 테이블)
- [x] 백엔드 18개 모듈 + R&R/WBS 모듈
- [x] 프론트엔드 화면 (인증, 대시보드, 이슈, 문서, 추적성, 컴플라이언스, WBS, R&R)
- [x] Docker Compose 인프라 + 마이그레이션 + 시드
- [x] MCP 서버 (17 도구)
- [x] TipTap 에디터 + Mermaid 다이어그램 통합
- [x] WBS / R&R 매트릭스 UI
- [x] Word / Excel / PDF / HTML 내보내기 구현
- [x] 단위 테스트 + GitHub Actions CI 파이프라인
- [ ] 외부 이해관계자 포털 (초대·승인 플로우)
- [ ] Keycloak SSO 연동
- [ ] E2E 테스트
- [ ] Flutter 모바일 앱

---

## 라이선스

사내/고객사 전용 (Proprietary). 외부 오픈소스 컴포넌트는 각 라이선스를 따릅니다.
