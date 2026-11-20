.PHONY: help check install db verify dev all test

help:
	@echo "사용법: make <target>"
	@echo "  check   - 도구/환경 확인"
	@echo "  install - backend/frontend 의존성 설치"
	@echo "  db      - migrate deploy → generate → seed"
	@echo "  verify  - 백엔드 테스트+타입체크, 프론트 빌드"
	@echo "  dev     - 개발 서버 기동"
	@echo "  all     - check+install+db+verify"

check:
	./scripts/bootstrap.sh check

install:
	./scripts/bootstrap.sh install

db:
	./scripts/bootstrap.sh db

verify:
	./scripts/bootstrap.sh verify

dev:
	./scripts/bootstrap.sh dev

all:
	./scripts/bootstrap.sh all

test:
	cd backend && npm test -- --runInBand
