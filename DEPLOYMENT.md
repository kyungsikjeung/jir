# ASPICE ALM — 배포 가이드 (Deployment Guide)

## 1. 배포 옵션 개요

| 옵션 | 환경 | 비용 | 적합한 경우 |
|---|---|---|---|
| **Option A: 로컬 개발** | Windows + WSL2 + Docker | $0 | 개발/테스트 |
| **Option B: OCI 무료 티어** | Oracle Cloud VM (Linux) | $0 | 소규모/데모 |
| **Option C: 클라우드 (AWS/GCP/Azure)** | 관리형 서비스 | $50~200/월 | 프로덕션 |
| **Option D: 온프레미스** | 고객사 서버 | 하드웨어 비용 | 자동차 OEM/Tier1 |

> **이미지 노트 (2026-11 기준)**
> - `minio/minio` / `quay.io/minio/minio`는 2026년 9월 이후 익명 pull이 불가능합니다(401).
> - 본 프로젝트는 드롭인 호환 포크인 **`docker.io/pgsty/silo`**를 사용합니다
>   (S3 API/`MINIO_*` 환경변수/`/minio/health/*` 경로 호환, 콘솔 포함).
> - MinIO 콘솔은 호스트 **9002** 포트로 매핑됩니다(9000은 S3 API).

---

## 2. Option A: 로컬 개발 (Windows + WSL2 + Docker)

### 전제 조건
- Windows 10/11 + WSL2 (Ubuntu)
- Docker Engine + Docker Compose (WSL2 내부 설치)

### 설치 순서
```bash
# 1. WSL2 Ubuntu 접속
wsl -d Ubuntu

# 2. Docker Engine 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Docker Compose 설치
sudo apt-get install -y docker-compose-plugin

# 4. 확인
docker --version
docker compose version
```

### 실행
```bash
# 1. 프로젝트 클론
git clone https://github.com/kyungsikjeung/jir.git
cd jir

# 2. 환경변수 설정
cp .env.example .env

# 3. 인프라 실행
docker compose up -d

# 4. 상태 확인
docker compose ps
docker compose logs -f postgres

# 5. Backend 실행
cd backend
npm install
npx prisma migrate dev
npm run start:dev

# 6. Frontend 실행 (별도 터미널)
cd frontend
npm install
npm run dev
```

### 접속 URL
| 서비스 | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Keycloak | http://localhost:8080 |
| MinIO Console | http://localhost:9002 |
| Meilisearch | http://localhost:7700 |

### 장점
- 추가 비용 없음
- 빠른 개발/테스트
- 오프라인 가능

### 단점
- WSL2 + Docker 설치 필요
- Windows에서 파일 시스템 성능 저하 (WSL2)
- 24/7 운영 불가 (PC 꺼지면 서비스 중단)

---

## 3. Option B: OCI 무료 티어 (Oracle Cloud)

### OCI Always Free 티어 스펙
- **VM**: 4 OCPU, 24GB RAM (Ampere A1)
- **스토리지**: 200GB 블록 볼륨
- **네트워크**: 10TB/월 아웃바운드
- **비용**: $0 (영구 무료)

### 설치 순서
```bash
# 1. OCI VM 생성 (Ubuntu 22.04, Ampere A1)
# OCI Console → Compute → Instances → Create Instance
# Shape: VM.Standard.A1.Flex (4 OCPU, 24GB RAM)

# 2. SSH 접속
ssh -i ~/.ssh/oci_key ubuntu@<VM_IP>

# 3. Docker Engine 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# 4. Docker Compose 설치
sudo apt-get install -y docker-compose-plugin

# 5. 프로젝트 클론
git clone https://github.com/kyungsikjeung/jir.git
cd jir

# 6. 환경변수 설정
cp .env.example .env
# .env 파일 수정 (DB_PASSWORD, MEILI_MASTER_KEY 등)

# 7. 인프라 실행
docker compose up -d

# 8. Backend 실행 (PM2로 데몬화)
cd backend
npm install
npx prisma migrate deploy
npm install -g pm2
pm2 start npm --name "alm-backend" -- run start:prod
pm2 save
pm2 startup

# 9. Frontend 빌드
cd frontend
npm install
npm run build
# Caddy가 정적 파일 서빙
```

### Caddyfile (OCI용)
```caddyfile
your-domain.com {
    handle /api/* {
        reverse_proxy backend:3000
    }
    handle /mcp/* {
        reverse_proxy backend:3000
    }
    handle {
        root * /var/www/frontend/dist
        file_server
        try_files {path} /index.html
    }
}
```

### 장점
- 무료 (Always Free)
- 24/7 운영 가능
- 공개 URL (도메인 연결)
- SSH 원격 관리

### 단점
- OCI 계정 필요
- VM 관리 필요 (보안 패치, 모니터링)
- 무료 티어 리소스 제한 (4 OCPU, 24GB)

---

## 4. Option C: 클라우드 (AWS/GCP/Azure)

### AWS 예시

```bash
# 인프라
- ECS/EKS (컨테이너)
- RDS PostgreSQL (관리형 DB)
- ElastiCache Redis
- S3 (파일 저장)
- Cognito (인증, Keycloak 대체)
- CloudFront (CDN)

# 비용 (월간)
- ECS (2 tasks): $30
- RDS PostgreSQL (db.t3.micro): $15
- ElastiCache (cache.t3.micro): $12
- S3 (10GB): $0.23
- CloudFront: $5
- 합계: ~$62/월
```

### GCP 예시

```bash
# 인프라
- Cloud Run (컨테이너)
- Cloud SQL PostgreSQL
- Memorystore Redis
- Cloud Storage (GCS)
- Firebase Auth (Keycloak 대체)

# 비용 (월간)
- Cloud Run: $20
- Cloud SQL: $25
- Memorystore: $35
- Cloud Storage: $0.20
- 합계: ~$80/월
```

### 장점
- 관리형 서비스 (DB, 캐시, 스토리지)
- 자동 스케일링
- 99.9% 가용성 SLA
- 글로벌 CDN

### 단점
- 월 비용 발생
- 벤더 종속
- 설정 복잡

---

## 5. Option D: 온프레미스 (자동차 OEM/Tier1)

### 요구사항
- 서버: 4+ OCPU, 16GB+ RAM, 500GB+ SSD
- OS: Ubuntu 22.04 / Oracle Linux 8
- 네트워크: 내부망 (VPN)
- 보안: 방화벽, WAF, IDS

### 설치
```bash
# 고객사 서버에서
# Docker Engine + Compose (CLI)
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y docker-compose-plugin

# 프로젝트 배포
git clone https://github.com/kyungsikjeung/jir.git
cd jir
cp .env.example .env
# .env 수정 (프로덕션 설정)

# 인프라 실행
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Backend (PM2 데몬)
cd backend
npm install --production
npx prisma migrate deploy
npm run build
pm2 start dist/main.js --name alm-backend
pm2 save && pm2 startup

# Frontend (Nginx 정적 파일)
cd frontend
npm install
npm run build
# Nginx로 dist/ 서빙
```

### 장점
- 데이터 주권 (고객사 서버)
- ASPICE/ISO 26262 보안 요구 충족
- 인터넷 불필요 (폐쇄망)
- 커스터마이징 자유

### 단점
- 하드웨어 비용
- 인프라 관리 인력 필요
- 백업/DR 직접 구현

---

## 6. 배포 체크리스트

### 공통 (모든 옵션)
- [ ] .env 파일 설정 (DB_PASSWORD, JWT_SECRET 등)
- [ ] Keycloak Realm/Client 설정
- [ ] MinIO 버킷 생성 (alm-attachments)
- [ ] DB 마이그레이션 (npx prisma migrate deploy)
- [ ] 시드 데이터 (npx prisma db seed)
- [ ] HTTPS 인증서 (Caddy 자동 또는 Let's Encrypt)
- [ ] 백업 스크립트 설정 (cron)

### 프로덕션 추가
- [ ] CORS 설정 (FRONTEND_URL)
- [ ] Rate Limiting 활성화
- [ ] Sentry DSN 설정
- [ ] 로그 로테이션
- [ ] 모니터링 (Health Check)
- [ ] 방화벽 설정 (80, 443, 22만 오픈)

---

## 7. 현재 상태

```
✅ Docker Compose 파일 작성 완료
✅ .env.example 작성 완료
✅ Caddyfile 작성 완료
✅ Backend TypeScript 빌드 통과
✅ Frontend React+Vite 빌드 가능
✅ Prisma Schema 검증 완료
✅ GitHub 리포지토리 업로드 완료

⏳ Docker Engine 설치 (WSL2에서 진행 중)
⏳ DB 마이그레이션
⏳ Backend/Frontend 실행 & 테스트
```

## 8. 다음 단계

1. **Docker Engine 설치 완료 확인** (WSL2에서 진행 중)
2. **docker compose up -d** (인프라 실행)
3. **npx prisma migrate dev** (DB 스키마 적용)
4. **npm run start:dev** (Backend 실행)
5. **npm run dev** (Frontend 실행)
6. **브라우저에서 http://localhost:5173 접속 & 테스트**