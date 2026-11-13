# ASPICE ALM — 구현 명세서 (SPEC.md)

> 이 문서는 REQUIREMENTS.md의 요구사항을 구현하기 위한 기술 명세서입니다.
> 개발 시 이 문서를 참조하여 일관된 구현을 보장합니다.

---

## 1. 프로젝트 구조

```
jir/
├── docker-compose.yml              # 인프라 (PostgreSQL, Redis, Meilisearch, MinIO, Keycloak)
├── docker-compose.test.yml         # 테스트용 인프라
├── Caddyfile                       # 리버스 프록시
├── .env.example                    # 환경변수 템플릿
├── .github/workflows/              # CI/CD
│   ├── test.yml
│   └── deploy.yml
├── backend/                        # NestJS
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma 스키마 (DB 모델)
│   │   └── migrations/             # 마이그레이션 파일
│   ├── src/
│   │   ├── main.ts                 # 엔트리포인트
│   │   ├── app.module.ts           # 루트 모듈
│   │   ├── common/                 # 공통 (필터, 가드, 인터셉터, 파이프)
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── guards/
│   │   │   │   ├── keycloak-auth.guard.ts
│   │   │   │   └── permission.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── permissions.decorator.ts
│   │   │   └── utils/
│   │   ├── modules/
│   │   │   ├── auth/               # Keycloak 연동
│   │   │   ├── spaces/             # 프로젝트 관리
│   │   │   ├── work-items/         # 이슈/페이지 통합
│   │   │   ├── documents/          # Confluence 스타일
│   │   │   ├── requirements/       # 요구사항
│   │   │   ├── tests/              # 테스트 관리
│   │   │   ├── traceability/       # 추적성
│   │   │   ├── compliance/         # ASPICE
│   │   │   ├── workflows/          # 워크플로우/리뷰/승인
│   │   │   ├── notifications/      # WebSocket + Email
│   │   │   ├── search/             # Meilisearch
│   │   │   ├── mcp/                # MCP Server
│   │   │   ├── git/                # Git/CI 연동
│   │   │   ├── stakeholders/       # 이해관계자
│   │   │   ├── upload/             # 파일 업로드
│   │   │   └── health/             # Health Check
│   │   └── prisma/
│   │       └── prisma.service.ts
│   ├── test/                       # E2E 테스트
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                       # React + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/                 # 라우트 정의
│   │   ├── components/             # 공통 컴포넌트
│   │   │   ├── ui/                 # shadcn/ui
│   │   │   └── layout/             # 레이아웃
│   │   ├── pages/                  # 페이지
│   │   ├── hooks/                  # 커스텀 훅
│   │   ├── stores/                 # Zustand 스토어
│   │   ├── services/               # API 클라이언트
│   │   ├── i18n/                   # 다국어
│   │   └── lib/                    # 유틸리티
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── mobile/                         # Flutter
│   ├── lib/
│   └── pubspec.yaml
├── db/                             # DB 스키마 (기존)
│   ├── schema/
│   ├── auth.dbml
│   └── auth_approval.dbml
├── scripts/                        # 유틸리티 스크립트
│   ├── backup.sh                   # DB 백업
│   └── seed.ts                     # 시드 데이터
├── SPEC.md                         # 이 파일
├── REQUIREMENTS.md
└── README.md
```

---

## 2. 모듈별 구현 명세

### 2.1 Auth Module (인증)

**책임**: Keycloak 연동, JWT 검증, 사용자 정보 조회

```typescript
// auth.module.ts
@Module({
  imports: [KeycloakConnectModule.register(keycloakConfig)],
  controllers: [AuthController],
  providers: [AuthService, KeycloakService],
  exports: [AuthService, KeycloakService],
})

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(private keycloak: KeycloakService, private prisma: PrismaService) {}

  async getCurrentUser(token: string): Promise<UserDto> {
    const payload = await this.keycloak.verifyToken(token);
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }

  async syncUser(keycloakUser: KeycloakUser): Promise<User> {
    // Keycloak 사용자 → ALM User 동기화
    return this.prisma.user.upsert({
      where: { email: keycloakUser.email },
      update: { displayName: keycloakUser.name, lastLoginAt: new Date() },
      create: {
        email: keycloakUser.email,
        displayName: keycloakUser.name,
        isInternal: this.isInternalEmail(keycloakUser.email),
        isVerified: true,
        isApproved: this.isInternalEmail(keycloakUser.email), // 내부는 자동 승인
      },
    });
  }
}
```

**Keycloak 설정**:
- Realm: `alm`
- Client: `alm-web` (Public, PKCE), `alm-api` (Confidential), `alm-mcp` (Confidential)
- Roles: `super_admin`, `admin`, `pm`, `se`, `qa`, `cm`, `viewer`
- Session: Access Token 15분, Refresh Token 7일, SSO Idle 30분, Max 10시간

---

### 2.2 Spaces Module (프로젝트)

**책임**: 프로젝트 CRUD, 멤버 관리, 설정, 자동 프로비저닝

```typescript
// space.service.ts
@Injectable()
export class SpaceService {
  async createSpace(dto: CreateSpaceDto, userId: string): Promise<Space> {
    // 1. 프로젝트 템플릿 조회
    const template = await this.prisma.projectTemplate.findUnique({
      where: { id: dto.templateId },
    });

    // 2. Space 생성 + 자동 프로비저닝 (트랜잭션)
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: { key: dto.key, name: dto.name, orgId: dto.orgId, createdBy: userId },
      });

      // 프로세스 영역 매핑
      await tx.spaceProcessArea.createMany({
        data: template.processCodes.map(code => ({
          spaceId: space.id, processCode: code, isApplicable: true,
        })),
      });

      // 워크플로우 복제
      for (const wfId of template.workflowTemplateIds) {
        await this.cloneWorkflow(tx, wfId, space.id);
      }

      // 페이지 템플릿 복제
      for (const ptId of template.pageTemplateIds) {
        await this.clonePageTemplate(tx, ptId, space.id);
      }

      // 기본 역할 생성
      await this.createDefaultRoles(tx, space.id);

      // 홈 페이지 생성
      await this.createHomePage(tx, space.id, userId);

      // Space 설정 생성
      await tx.spaceSettings.create({
        data: { spaceId: space.id, aspiceLevel: template.aspiceLevel },
      });

      return space;
    });
  }

  async getSpace(key: string): Promise<Space> {
    const cached = await this.cache.get<Space>(`space:${key}`);
    if (cached) return cached;
    const space = await this.prisma.space.findUnique({ where: { key } });
    if (!space) throw new NotFoundException(`Space not found: ${key}`);
    await this.cache.set(`space:${key}`, space, 300);
    return space;
  }

  async addMember(spaceKey: string, dto: AddMemberDto, grantedBy: string) {
    const space = await this.getSpace(spaceKey);
    return this.prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: dto.userId,
        roleId: dto.roleId,
        addedBy: grantedBy,
      },
    });
  }
}
```

**API 엔드포인트**:
```
GET    /spaces                    → 프로젝트 목록
GET    /spaces/:key               → 프로젝트 상세
POST   /spaces                    → 프로젝트 생성
PUT    /spaces/:key               → 프로젝트 수정
DELETE /spaces/:key               → 프로젝트 삭제
GET    /spaces/:key/members       → 멤버 목록
POST   /spaces/:key/members       → 멤버 추가
DELETE /spaces/:key/members/:userId → 멤버 제거
GET    /spaces/:key/settings      → 설정 조회
PUT    /spaces/:key/settings      → 설정 수정
```

---

### 2.3 Work Items Module (이슈 + 페이지 통합)

**책임**: 통합 워크 아이템 CRUD, 상태 전이, 링크, 버전 관리

```typescript
// work-item.service.ts
@Injectable()
export class WorkItemService {
  async create(dto: CreateWorkItemDto, userId: string): Promise<WorkItem> {
    const space = await this.spaceService.getSpace(dto.spaceKey);
    const key = await this.generateKey(space.key); // ADAS-1, ADAS-2, ...

    const workItem = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: dto.typeId,
        key,
        title: dto.title,
        description: dto.description,
        status: 'open',
        priority: dto.priority || 'medium',
        assigneeId: dto.assigneeId,
        reporterId: userId,
        parentId: dto.parentId,
        labels: dto.labels || [],
        aspiceProcess: dto.aspiceProcess,
        asilLevel: dto.asilLevel,
        body: dto.body, // TipTap JSON
        bodyText: this.extractText(dto.body),
      },
    });

    // Meilisearch 인덱싱 (비동기)
    this.searchService.indexDocument('work_items', workItem.id, workItem);

    // 감사 로그
    await this.auditService.log('work_item', workItem.id, 'create', userId);

    return workItem;
  }

  async transition(issueKey: string, transitionName: string, userId: string, comment?: string) {
    const item = await this.getByKey(issueKey);
    const workflow = await this.workflowService.getWorkflow(item.spaceId, item.typeId);
    const transition = workflow.transitions.find(t => t.name === transitionName);

    if (!transition) throw new BadRequestException('Invalid transition');
    if (!await this.permissionService.canTransition(userId, item, transition)) {
      throw new ForbiddenException('Permission denied');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workflowTransitionHistory.create({
        data: { workItemId: item.id, transitionId: transition.id, fromStateId: item.workflowStateId, toStateId: transition.toStateId, performedBy: userId, comment },
      });
      return tx.workItem.update({
        where: { id: item.id },
        data: { workflowStateId: transition.toStateId, status: transition.toState.category },
      });
    });

    // Suspect Link 처리
    if (transition.toState.isTerminal) {
      await this.traceabilityService.markSuspectLinks(item.id);
    }

    return updated;
  }
}
```

**API 엔드포인트**:
```
GET    /spaces/:key/issues                    → 이슈 목록 (JQL 필터)
GET    /spaces/:key/issues/:issueKey           → 이슈 상세
POST   /spaces/:key/issues                    → 이슈 생성
PUT    /spaces/:key/issues/:issueKey          → 이슈 수정
DELETE /spaces/:key/issues/:issueKey          → 이슈 삭제
POST   /spaces/:key/issues/:issueKey/transitions → 상태 전이
POST   /spaces/:key/issues/:issueKey/comments  → 코멘트 추가
POST   /spaces/:key/issue-links               → 이슈 링크 생성
```

---

### 2.4 Documents Module (Confluence 스타일)

**책임**: 페이지 CRUD, 버전 관리, 댓글, 첨부파일, 템플릿

```typescript
// document.service.ts
@Injectable()
export class DocumentService {
  async createPage(dto: CreatePageDto, userId: string): Promise<Page> {
    const space = await this.spaceService.getSpace(dto.spaceKey);

    // 템플릿 적용
    let body = dto.body;
    if (dto.templateId) {
      const template = await this.prisma.pageTemplate.findUnique({ where: { id: dto.templateId } });
      body = template.body;
    }

    const workItem = await this.prisma.workItem.create({
      data: {
        spaceId: space.id,
        typeId: await this.getPageTypeId(space.id),
        key: await this.generateKey(space.key),
        title: dto.title,
        body,
        bodyText: this.extractText(body),
        reporterId: userId,
        aspiceProcess: dto.aspiceProcess,
      },
    });

    await this.prisma.page.create({
      data: { workItemId: workItem.id, parentPageId: dto.parentId, templateId: dto.templateId },
    });

    // 버전 1 생성
    await this.prisma.pageVersion.create({
      data: { pageId: workItem.id, version: 1, title: dto.title, body, authorId: userId },
    });

    return workItem;
  }

  async updatePage(pageId: string, dto: UpdatePageDto, userId: string): Promise<Page> {
    const page = await this.prisma.workItem.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException();

    // 버전 증가
    const newVersion = page.version + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      const workItem = await tx.workItem.update({
        where: { id: pageId },
        data: { title: dto.title, body: dto.body, bodyText: this.extractText(dto.body), version: newVersion },
      });
      await tx.pageVersion.create({
        data: { pageId, version: newVersion, title: dto.title, body: dto.body, authorId: userId, changeSummary: dto.changeSummary },
      });
      return workItem;
    });

    // Suspect Link 처리 (페이지 변경 시 연결된 항목 suspect)
    await this.traceabilityService.markSuspectLinks(pageId);

    return updated;
  }
}
```

**TipTap 에디터 블록**:
- `requirementBlock`: 요구사항 임베드 (ID, ASIL, 상태 표시)
- `traceabilityBlock`: 추적성 매트릭스 자동 생성
- `aspiceClauseBlock`: ASPICE 조항 체크리스트
- `codeBlock`: 코드 블록 (syntax highlighting)
- `table`: 표 (정렬, 셀 병합)

---

### 2.5 Requirements Module

**책임**: 요구사항 CRUD, 파생 관계, 리뷰/승인

```typescript
// requirement.service.ts
@Injectable()
export class RequirementService {
  async create(dto: CreateRequirementDto, userId: string): Promise<Requirement> {
    const workItem = await this.workItemService.create({
      ...dto,
      type: 'requirement',
      aspiceProcess: dto.aspiceProcess || 'SWE.1',
    }, userId);

    await this.prisma.requirement.create({
      data: {
        workItemId: workItem.id,
        reqType: dto.reqType,
        asilLevel: dto.asilLevel,
        safetyRelated: dto.safetyRelated || false,
        verificationMethod: dto.verificationMethod,
        derivedFromId: dto.derivedFromId,
      },
    });

    // 파생 관계 생성
    if (dto.derivedFromId) {
      await this.prisma.requirementRelation.create({
        data: { fromReqId: dto.derivedFromId, toReqId: workItem.id, relationType: 'derives' },
      });
    }

    return workItem;
  }
}
```

---

### 2.6 Traceability Module

**책임**: 추적성 링크 CRUD, 매트릭스 생성, 커버리지 계산, Suspect Link

```typescript
// traceability.service.ts
@Injectable()
export class TraceabilityService {
  async createLink(dto: CreateTraceLinkDto, userId: string): Promise<TraceLink> {
    return this.prisma.traceLink.create({
      data: {
        fromType: dto.fromType,
        fromId: dto.fromId,
        toType: dto.toType,
        toId: dto.toId,
        linkType: dto.linkType,
        createdBy: userId,
      },
    });
  }

  async getMatrix(spaceKey: string): Promise<TraceMatrix> {
    const space = await this.spaceService.getSpace(spaceKey);
    const links = await this.prisma.traceLink.findMany({
      where: { /* space 관련 */ },
    });
    // 매트릭스 데이터 구조화 (rows: requirements, cols: tests, cells: link 존재 여부)
    return this.buildMatrix(links);
  }

  async getCoverage(spaceKey: string): Promise<CoverageReport> {
    const space = await this.spaceService.getSpace(spaceKey);
    const requirements = await this.prisma.workItem.findMany({
      where: { spaceId: space.id, type: { name: 'requirement' } },
    });
    const linked = await this.prisma.traceLink.findMany({
      where: { fromType: 'requirement', toType: 'test_case' },
    });
    const covered = requirements.filter(r => linked.some(l => l.fromId === r.id));
    return {
      total: requirements.length,
      covered: covered.length,
      percent: (covered.length / requirements.length) * 100,
      uncovered: requirements.filter(r => !covered.includes(r)).map(r => r.key),
    };
  }

  async markSuspectLinks(changedItemId: string): Promise<void> {
    // 변경된 항목을 from/to로 하는 링크를 suspect로 표시
    await this.prisma.traceLink.updateMany({
      where: { OR: [{ fromId: changedItemId }, { toId: changedItemId }] },
      data: { isSuspect: true },
    });
  }
}
```

---

### 2.7 MCP Module

**책임**: MCP Server (SSE + JSON-RPC), Tool Registry, Resource Registry

```typescript
// mcp.controller.ts
@Controller('mcp')
export class McpController {
  @Sse('sse')
  sseEndpoint(@Req() req: Request): Observable<MessageEvent> {
    return this.mcpService.createSession(req);
  }

  @Post('message')
  async handleMessage(@Body() request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const user = await this.authService.validateMcpToken(request);
    const result = await this.mcpService.handleMethod(request.method, request.params, user);
    return { jsonrpc: '2.0', id: request.id, result };
  }
}

// mcp.service.ts
@Injectable()
export class McpService {
  private tools = new Map<string, McpToolHandler>();

  constructor(/* services */) {
    this.registerTools();
  }

  private registerTools() {
    this.tools.set('alm_search_issues', async (args, user) => {
      const issues = await this.workItemService.search(args.jql, args.maxResults, user);
      return { content: [{ type: 'text', text: JSON.stringify(issues) }] };
    });
    // ... 20+ tools
  }

  async handleMethod(method: string, params: any, user: User): Promise<any> {
    switch (method) {
      case 'initialize': return { serverInfo: { name: 'alm-mcp-server', version: '1.0.0' } };
      case 'tools/list': return { tools: this.getToolDefinitions() };
      case 'tools/call': return this.executeTool(params.name, params.arguments, user);
      case 'resources/list': return this.resourceRegistry.list(user);
      case 'resources/read': return this.resourceRegistry.read(params.uri, user);
      default: throw new Error(`Unknown method: ${method}`);
    }
  }
}
```

---

### 2.8 Search Module (Meilisearch)

**책임**: Meilisearch 연동, 인덱싱, 검색, 자동완성

```typescript
// search.service.ts
@Injectable()
export class SearchService {
  private client = new MeiliSearch({
    host: process.env.MEILI_HOST,
    apiKey: process.env.MEILI_API_KEY,
  });

  async createIndex() {
    const index = this.client.index('work_items');
    await index.updateSettings({
      searchableAttributes: ['title', 'bodyText', 'description'],
      filterableAttributes: ['spaceKey', 'status', 'priority', 'aspiceProcess', 'asilLevel', 'type'],
      sortableAttributes: ['createdAt', 'priority', 'updatedAt'],
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    });
  }

  async indexDocument(id: string, document: any) {
    await this.client.index('work_items').addDocuments([{ id, ...document }]);
  }

  async search(query: string, filters?: string, limit = 50) {
    return this.client.index('work_items').search(query, {
      filter: filters,
      limit,
      attributesToHighlight: ['title', 'bodyText'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    });
  }
}
```

---

### 2.9 Notification Module

**책임**: WebSocket 실시간 알림, 이메일 알림

```typescript
// notification.gateway.ts
@WebSocketGateway({ cors: true })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  async sendToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    // 이메일 알림 (비동기)
    if (notification.emailEnabled) {
      await this.emailService.send(notification);
    }
  }
}

// notification.service.ts
@Injectable()
export class NotificationService {
  async notifyMention(comment: Comment, mentionedUsers: string[]) {
    for (const userId of mentionedUsers) {
      await this.gateway.sendToUser(userId, {
        type: 'mention',
        title: '멘션됨',
        body: `${comment.author.displayName}님이 댓글에서 멘션했습니다`,
        targetId: comment.targetId,
        emailEnabled: true,
      });
    }
  }
}
```

---

### 2.10 Upload Module (MinIO)

**책임**: 파일 업로드, MIME 검증, 썸네일 생성

```typescript
// upload.service.ts
@Injectable()
export class UploadService {
  private s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_USER,
      secretAccessKey: process.env.MINIO_PASSWORD,
    },
    forcePathStyle: true,
  });

  async upload(file: Express.Multer.File, target: UploadTarget) {
    // 1. MIME + Magic Number 검증
    await this.validateFile(file);

    // 2. MinIO 업로드
    const path = `${target.type}/${target.id}/${Date.now()}_${file.originalname}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: 'alm-attachments',
      Key: path,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    // 3. 썸네일 생성 (이미지)
    let thumbnailPath = null;
    if (file.mimetype.startsWith('image/')) {
      const thumb = await this.thumbnailService.generate(file.buffer);
      thumbnailPath = `${target.type}/${target.id}/thumb_${Date.now()}.webp`;
      await this.s3.send(new PutObjectCommand({
        Bucket: 'alm-attachments',
        Key: thumbnailPath,
        Body: thumb,
        ContentType: 'image/webp',
      }));
    }

    // 4. DB 저장
    return this.prisma.attachment.create({
      data: { fileName: file.originalname, filePath: path, thumbnailPath, fileSize: file.size, mimeType: file.mimetype, targetId: target.id, targetType: target.type, uploadedBy: target.userId },
    });
  }
}
```

---

### 2.11 Compliance Module (ASPICE)

**책임**: ASPICE 컴플라이언스 대시보드, 체크리스트, 프로세스 평가

```typescript
// compliance.service.ts
@Injectable()
export class ComplianceService {
  async getSummary(spaceKey: string): Promise<ComplianceSummary> {
    const space = await this.spaceService.getSpace(spaceKey);
    const processes = await this.prisma.spaceProcessArea.findMany({
      where: { spaceId: space.id, isApplicable: true },
      include: { processArea: true },
    });

    const summary = await Promise.all(
      processes.map(async (sp) => {
        const checklists = await this.prisma.complianceChecklist.findMany({
          where: { spaceId: space.id, processCode: sp.processCode },
        });
        const deliverables = await this.prisma.projectDeliverable.findMany({
          where: { spaceId: space.id },
          include: { deliverable: true },
        });
        const procDeliverables = deliverables.filter(d => d.deliverable.processCode === sp.processCode);

        return {
          processCode: sp.processCode,
          processName: sp.processArea.name,
          totalItems: checklists.length,
          completedItems: checklists.filter(c => c.status === 'completed').length,
          completionPercent: checklists.length > 0
            ? (checklists.filter(c => c.status === 'completed').length / checklists.length) * 100
            : 0,
          totalDeliverables: procDeliverables.length,
          releasedDeliverables: procDeliverables.filter(d => d.status === 'released').length,
        };
      })
    );

    return { spaceKey, processes: summary };
  }
}
```

---

## 3. Prisma 스키마 (핵심 모델)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  domain    String
  plan      String   @default("free")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  spaces    Space[]
  users     User[]
}

model User {
  id           String   @id @default(uuid())
  orgId        String
  org          Organization @relation(fields: [orgId], references: [id])
  email        String   @unique
  passwordHash String?
  displayName  String
  avatarUrl    String?
  title        String?
  department   String?
  isInternal   Boolean  @default(false)
  isVerified   Boolean  @default(false)
  isApproved   Boolean  @default(false)
  isActive     Boolean  @default(true)
  isExternal   Boolean  @default(false)
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  roles        UserRole[]
  spaces       SpaceMember[]
  workItems    WorkItem[] @relation("assignee")
  reported     WorkItem[] @relation("reporter")
}

model Space {
  id          String   @id @default(uuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id])
  key         String   @unique
  name        String
  description String?
  isArchived  Boolean  @default(false)
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  members     SpaceMember[]
  workItems   WorkItem[]
  settings    SpaceSettings?
  @@index([orgId])
  @@index([key])
}

model WorkItem {
  id              String   @id @default(uuid())
  spaceId         String
  space           Space    @relation(fields: [spaceId], references: [id])
  typeId          String
  type            WorkItemType @relation(fields: [typeId], references: [id])
  key             String
  title           String
  description     String?
  status          String   @default("open")
  priority        String   @default("medium")
  assigneeId      String?
  assignee        User?    @relation("assignee", fields: [assigneeId], references: [id])
  reporterId      String?
  reporter        User?    @relation("reporter", fields: [reporterId], references: [id])
  parentId        String?
  parent          WorkItem? @relation("parent", fields: [parentId], references: [id])
  children        WorkItem[] @relation("parent")
  workflowStateId  String?
  workflowState   WorkflowState? @relation(fields: [workflowStateId], references: [id])
  version         Int      @default(1)
  body            Json?
  bodyText        String?
  labels          String[]
  aspiceProcess   String?
  asilLevel       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  resolvedAt      DateTime?
  @@unique([spaceId, key])
  @@index([spaceId])
  @@index([status])
  @@index([assigneeId])
  @@index([aspiceProcess])
}

// ... (나머지 모델은 DB 스키마에서 변환)
```

---

## 4. 에러 코드 체계

```typescript
// common/errors/error-codes.ts
export const ErrorCodes = {
  // Space
  SPACE_NOT_FOUND: { code: 'ALM-1001', message: '프로젝트를 찾을 수 없습니다', status: 404 },
  SPACE_KEY_EXISTS: { code: 'ALM-1002', message: '이미 존재하는 프로젝트 키입니다', status: 409 },
  SPACE_ACCESS_DENIED: { code: 'ALM-1003', message: '프로젝트 접근 권한이 없습니다', status: 403 },

  // Work Item
  WORK_ITEM_NOT_FOUND: { code: 'ALM-2001', message: '워크 아이템을 찾을 수 없습니다', status: 404 },
  INVALID_TRANSITION: { code: 'ALM-2002', message: '유효하지 않은 상태 전이입니다', status: 400 },
  PERMISSION_DENIED: { code: 'ALM-2003', message: '권한이 없습니다', status: 403 },

  // Auth
  UNAUTHORIZED: { code: 'ALM-3001', message: '인증이 필요합니다', status: 401 },
  APPROVAL_PENDING: { code: 'ALM-3002', message: '관리자 승인 대기 중입니다', status: 403 },
  EMAIL_NOT_VERIFIED: { code: 'ALM-3003', message: '이메일 인증이 필요합니다', status: 403 },

  // Upload
  FILE_TOO_LARGE: { code: 'ALM-4001', message: '파일 크기가 50MB를 초과합니다', status: 413 },
  INVALID_FILE_TYPE: { code: 'ALM-4002', message: '허용되지 않는 파일 형식입니다', status: 415 },
} as const;
```

---

## 5. 환경변수 (.env.example)

```env
# Database
DATABASE_URL=postgresql://alm:password@postgres:5432/alm

# Redis
REDIS_URL=redis://redis:6379

# Meilisearch
MEILI_HOST=http://meilisearch:7700
MEILI_API_KEY=master-key

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_USER=admin
MINIO_PASSWORD=password123
MINIO_BUCKET=alm-attachments

# Keycloak
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=alm
KEYCLOAK_CLIENT_ID=alm-api
KEYCLOAK_CLIENT_SECRET=secret

# JWT
JWT_SECRET=your-jwt-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@tovis.com
SMTP_PASSWORD=app-password

# Sentry (optional)
SENTRY_DSN=

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

---

## 6. 개발 시작 순서

```
Step 1: 인프라 (Docker Compose)
  → PostgreSQL, Redis, Meilisearch, MinIO, Keycloak 실행
  → Health Check 확인

Step 2: Prisma 스키마
  → db/schema/*.sql → prisma/schema.prisma 변환
  → npx prisma migrate dev (초기 마이그레이션)
  → npx prisma generate (타입 생성)

Step 3: Backend (NestJS)
  → 프로젝트 생성 (nest new backend)
  → 모듈 구조 생성
  → PrismaService, KeycloakService 구현
  → Space CRUD → WorkItem CRUD → ...

Step 4: Frontend (React + Vite)
  → 프로젝트 생성 (npm create vite)
  → 라우팅, 레이아웃, Keycloak 연동
  → Space 목록 → 이슈 목록 → ...

Step 5: 통합 테스트
  → Unit Test (Service)
  → Integration Test (API)
  → E2E Test (핵심 시나리오)
```

---

## 7. AI 프롬프트 (구현 시작)

### Step 1: Docker Compose
```
"ASPICE ALM용 Docker Compose를 작성해줘.
서비스: PostgreSQL 16, Redis 7, Meilisearch v1.6, MinIO, Keycloak 24, Caddy
- OCI 무료 티어 호환 (메모리 제한)
- 환경변수는 .env에서 읽기
- Health Check 설정
- 볼륨으로 데이터 영속화"
```

### Step 2: Prisma 스키마
```
"db/schema/*.sql 파일들을 Prisma schema.prisma로 변환해줘.
- 12개 SQL 파일의 모든 테이블/관계/인덱스 포함
- PostgreSQL provider
- UUID 기본값, DateTime 기본값
- 관계 (1:N, N:M) 정의
- 인덱스 정의 (@@index)
- enum 타입 정의"
```

### Step 3: NestJS 프로젝트
```
"NestJS 프로젝트를 생성하고 다음 모듈 구조를 만들어줘.
- common: filters, guards, interceptors, decorators
- modules: auth, spaces, work-items, documents, requirements, tests, traceability, compliance, workflows, notifications, search, mcp, upload, health
- PrismaService, KeycloakService
- ESLint + Prettier + Husky 설정"
```

---

**이 SPEC.md를 기반으로 개발을 시작할 수 있습니다. 어떤 Step부터 시작하시겠어요?**