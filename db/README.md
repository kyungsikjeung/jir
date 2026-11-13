# ASPICE ALM Database Schema

Jira + Confluence 느낌의 ASPICE 대응 ALM 시스템용 PostgreSQL 스키마.

## 구조

```
db/schema/
├── 01_core.sql          # 사용자, 조직, 역할, 권한
├── 02_spaces.sql        # 스페이스 (Jira Project + Confluence Space 통합)
├── 03_work_items.sql    # 워크 아이템 (Issue + Page 통합), 링크, 버전
├── 04_docs.sql          # 문서/페이지, 댓글, 첨부파일 (Confluence)
├── 05_requirements.sql  # 요구사항 관리 (SYS/SWE)
├── 06_tests.sql         # 테스트 케이스/실행/결과, 결함
├── 07_traceability.sql  # 추적성 매트릭스, 커버리지, Suspect Link
├── 08_config.sql        # 베이스라인, 구성항목, 변경요청, 릴리스
├── 09_workflow.sql      # 워크플로우, 상태, 전이, 리뷰, 승인
├── 10_audit.sql         # 감사 로그, 증적, 알림
└── 11_process.sql       # ASPICE 프로세스 영역, 평가, 컴플라이언스
```

## 실행 순서

```bash
# PostgreSQL 접속 후
psql -d alm_db -f db/schema/01_core.sql
psql -d alm_db -f db/schema/02_spaces.sql
# ... 순서대로 실행
```

또는 한 번에:
```bash
cat db/schema/*.sql | psql -d alm_db
```

## 핵심 설계 원칙

1. **통합 객체 (Work Item)**: Jira의 Issue와 Confluence의 Page를 하나의 `work_items` 테이블로 통합. `type` 컬럼으로 구분.
2. **추적성 (Traceability)**: `trace_links` 테이블이 모든 산출물 간 관계를 관리. Suspect Link 자동 감지.
3. **버전 관리**: 모든 산출물(work_items, pages, requirements)에 버전 이력.
4. **ASPICE 증적**: `audit_log` + `evidence_links`로 모든 변경을 추적하고 ASPICE 프로세스에 매핑.
5. **워크플로우**: 프로세스별 상태 머신 (SWE.2~SWE.6 각각 다른 워크플로우).

## Jira/Confluence 매핑

| Jira/Confluence | ALM 테이블 |
|---|---|
| Project | spaces |
| Issue | work_items (type=task/bug/story/...) |
| Page | work_items (type=page) + pages |
| Comment | comments |
| Attachment | attachments |
| Version/Release | versions, releases, baselines |
| Workflow | workflows, workflow_states, workflow_transitions |
| Custom Field | custom_field_defs, custom_field_values |
| Issue Link | work_item_links |
| Watcher | work_item_watchers |
| Component | components |
| Label | labels |
| Sprint | (sprints 테이블 추가 필요) |
| Board | (boards 테이블 추가 필요) |
