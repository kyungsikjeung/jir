# 릴리스 절차

파일럿 ASPICE ALM의 릴리스는 아래 순서를 따른다. 각 단계는
[`docs/versions/README.md`](./docs/versions/README.md)의 버전 규칙에 매핑된다.

## 1. 사전 조건 (모든 단계 공통)

- [ ] `backend`: `npx jest --no-coverage` 전체 통과
- [ ] `backend`: `npx tsc --noEmit` 통과
- [ ] `frontend`: `npm run build` 통과
- [ ] CI(`.github/workflows/ci.yml`) 초록
- [ ] `docs/pilot/ASPICE_PRINCIPLES_REVIEW.md`의 상태가 현재 코드와 일치

## 2. dev → pilot

- [ ] 마일스톤 계획(`docs/superpowers/plans/`)의 완료 기준 충족
- [ ] `CHANGELOG.md`에 `0.MINOR.0` 항목 작성
- [ ] `prisma migrate deploy` → `prisma generate` → `prisma db seed` 순서 검증
- [ ] 부트스트래핑 스크립트(`scripts/bootstrap.sh`)로 로컬 기동 확인
- [ ] 골든 패스 수동 확인: 프로젝트 생성 → 요구사항 → 테스트 링크 →
      리뷰/승인/전자서명 → 기준선 릴리스 → Export → 감사 검증
- [ ] 태그: `git tag -a v0.MINOR.0 -m "pilot: <요약>" && git push origin v0.MINOR.0`

## 3. pilot → release (v1.0.0)

- [ ] 외부 이해관계자 포털(초대·이메일 인증·관리자 승인) 완료
- [ ] Keycloak SSO 연동 또는 동등한 인증 강화
- [ ] E2E 테스트 통과
- [ ] 영향 분석 + ChangeRequest 워크플로우 완료 (원칙 2·5)
- [ ] 보안 검토(서명/감사/MCP API 키) 완료
- [ ] `CHANGELOG.md`에 `1.0.0` 항 작성 후 태그

## 4. 릴리스 후

- [ ] 배포 환경에서 `/health` 및 `/health/ready` 확인
- [ ] `GET /api/engines`로 등록 엔진 확인
- [ ] `POST /api/audit/verify`로 감사 체인 무결성 확인
- [ ] 릴리스 커밋에 문제 시 `CHANGELOG.md`에 `수정` 항목 추가 후 PATCH
