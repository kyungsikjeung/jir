#!/usr/bin/env bash
# 파일럿 ALM 부트스트래핑 진입점 (WSL2 / Linux / macOS)
# 사용법: ./scripts/bootstrap.sh [check|install|db|dev|verify|all]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STEP="${1:-all}"

log() { printf '\n==> %s\n' "$*"; }

check() {
  log "도구 버전 확인"
  node --version
  npm --version
  [ -f "$ROOT/backend/.env" ] || { echo "backend/.env 가 없습니다. .env.example을 복사하세요."; exit 1; }
  [ -f "$ROOT/frontend/.env" ] || echo "frontend/.env 없음 (기본값 사용)"
}

install() {
  log "backend 의존성"
  (cd "$ROOT/backend" && npm ci)
  log "frontend 의존성"
  (cd "$ROOT/frontend" && npm ci)
}

db() {
  log "Prisma migrate deploy → generate → seed"
  (cd "$ROOT/backend" && \
    npx prisma migrate deploy && \
    npx prisma generate && \
    npm run prisma:seed)
}

verify() {
  log "백엔드 테스트"
  (cd "$ROOT/backend" && npm test -- --runInBand)
  log "백엔드 타입 체크"
  (cd "$ROOT/backend" && npx tsc --noEmit)
  log "프론트엔드 빌드"
  (cd "$ROOT/frontend" && npm run build)
}

dev() {
  log "개발 서버 기동 (backend :3000, frontend :5173)"
  (cd "$ROOT/backend" && npm run start:dev) &
  BACKEND_PID=$!
  (cd "$ROOT/frontend" && npm run dev) &
  FRONTEND_PID=$!
  trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT
  wait
}

case "$STEP" in
  check)   check ;;
  install) install ;;
  db)      check; db ;;
  verify)  verify ;;
  dev)     dev ;;
  all)     check; install; db; verify; echo "부트스트래핑 완료. './scripts/bootstrap.sh dev'로 서버를 시작하세요." ;;
  *) echo "사용법: $0 [check|install|db|dev|verify|all]" >&2; exit 2 ;;
esac
