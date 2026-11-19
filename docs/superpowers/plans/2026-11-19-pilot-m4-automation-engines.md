# M4 자동화 엔진/부트스트래핑/버전·실행 방법 구현 계획

**일정:** 2주 (1인)
**목표:** 자동화 엔진(engines/request-response 등) 공통 기반 구축, 부트스트래핑 진입점, 반복 실행 가능한 버전 프로세스 정립.
**완료 기준:** 엔진 기반 자동화 실행 통합 테스트 pass, 버전/릴리스 프로세스 문서화, 실행 문서(README) 갱신.

---

## 1. 범위

M3(문서·리뷰·승인·전자서명·기준선·Export·감사·My Work) 완료.
M4: 자동화 엔진/부트스트래핑/버전·실행 방법.

---

## 2. 백엔드 태스크 (TDD)

### T1. 자동화 엔진(Engine) 기반 구축
**파일:** `backend/src/modules/engines/` 신규
**인터페이스:**
```ts
// 자동화 엔진 공통 기반
interface Engine {
  name: string;
  async execute(params: Record<string, any>, context: any): Promise<any>;
  async verify(params: Record<string, any>, context: any): Promise<{ ok: boolean; errors: string[] }>;
}
```
**작업:**
- `Engine` 인터페이스 + `EngineRegistry` (엔진 레지스트리)
- 기반 엔진 구현 예:
  - `WorkflowEngine` (M3 전이 흐름 엔진화: request(전이 요청) → guard condition 평가 → postActions 실행 → WorkflowTransitionHistory 기록)
  - `NotificationEngine` (자동화된 알림 발송)
  - `AuditEngine` (변경 이벤트 자동 기록 — audit service 재사용)
  - `ExportEngine` (자동 export)
- M3 `WorkItemsService.transition` → `WorkflowEngine` 위임(이관)
**테스트:** `engines.service.spec.ts`, 엔진별 spec — 엔진 레지스트리, execute/verify
**완료:** 엔진 기반 자동화 실행/검증 통합 테스트 pass

### T2. 버전/릴리스 프로세스 정립
**파일:** `docs/versions/` 신규, `RELEASE.md` 신규, README 로드맵 갱신
**작업:**
- 파일럿 버전(M1/M2/M3 plan 문서) 분리·정리
- 버전/릴리스 프로세스 정의: Stage(dev/pilot/release), SemVer 버전 부여, 태그, CHANGELOG
**테스트:** 문서 검토(버전/릴리스 프로세스 문서 존재)
**완료:** 버전/릴리스 프로세스 문서화 완료

### T3. 부트스트래핑 진입점 + 실행 문서
**파일:** `scripts/bootstrap.sh`, `Makefile`, README 빠른 시작
**작업:**
- backend: `prisma migrate deploy` → `prisma generate` → `prisma db seed` → 개발 서버 시작
- frontend: `npm run build` → `npm run dev`
- DEPLOYMENT.md 연동(로컬/OCI/AWS/On-Premise)
**테스트:** 부트스트래핑 스크립트 동작 검증(로컬 실행 가능)
**완료:** 부트스트래핑 스크립트 + 실행 문서(README/배포) 갱신

---

## 3. 완료 기준 (M4)

1. 엔진 기반 자동화 실행 통합 테스트 pass
2. 버전/릴리스 프로세스 문서화 완료
3. 부트스트래핑 스크립트 동작 확인
4. CI 통과 (백엔드 테스트 + 빌드 + 프론트 빌드)

---

## 4. 다음 단계 (M5)

README 로드맵 참고: 외부 이해관계자 포털(초대·승인 플로우), Keycloak SSO 연동, E2E 테스트, Flutter 모바일 앱 — 엔진/프로세스 기반으로 점진적 확대.
