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
    return this.prisma.user.upsert({
      where: { email: keycloakUser.email },
      update: { displayName: keycloakUser.name, lastLoginAt: new Date() },
      create: {
        email: keycloakUser.email,
        displayName: keycloakUser.name,
        isInternal: this.isInternalEmail(keycloakUser.email),
        isVerified: true,
        isApproved: this.isInternalEmail(keycloakUser.email),
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
    const template = await this.prisma.projectTemplate.findUnique({
      where: { id: dto.templateId },
    });

    return this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: { key: dto.key, name: dto.name, orgId: dto.orgId, createdById: userId },
      });

      await tx.spaceProcessArea.createMany({
        data: template.processCodes.map(code => ({
          spaceId: space.id, processCode: code, isApplicable: true,
        })),
      });

      for (const wfId of template.workflowTemplateIds) {
        await this.cloneWorkflow(tx, wfId, space.id);
      }

      for (const ptId of template.pageTemplateIds) {
        await this.clonePageTemplate(tx, ptId, space.id);
      }

      await this.createDefaultRoles(tx, space.id);
      await this.createHomePage(tx, space.id, userId);

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
    const key = await this.generateKey(space.key);

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
        body: dto.body,
        bodyText: this.extractText(dto.body),
      },
    });

    this.searchService.indexDocument('work_items', workItem.id, workItem);
    await this.auditService.log('work_item', workItem.id, 'create', userId);

    return workItem;
  }

  async transition(issueKey: string, transitionName: string, userId: string, comment?: string) {
    const item = await this.getByKey(issueKey);
    const workflow = await this.workflowService.getWorkflow(item.spaceId, item.typeId);
    const transition = workflow.transitions.find(t => t.name === transitionName);

    if (!transition) throw new BadRequestException('Invalid transition');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workflowTransitionHistory.create({
        data: { workItemId: item.id, transitionId: transition.id, fromStateId: item.workflowStateId, toStateId: transition.toStateId, performedById: userId, comment },
      });
      return tx.workItem.update({
        where: { id: item.id },
        data: { workflowStateId: transition.toStateId, status: transition.toState.category },
      });
    });

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

    await this.prisma.pageVersion.create({
      data: { pageId: workItem.id, version: 1, title: dto.title, body, authorId: userId },
    });

    return workItem;
  }

  async updatePage(pageId: string, dto: UpdatePageDto, userId: string): Promise<Page> {
    const page = await this.prisma.workItem.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException();

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
- `mermaidBlock`: Mermaid 다이어그램 (코드 + 프리뷰)
- `tocBlock`: 목차 자동 생성

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
    const links = await this.prisma.traceLink.findMany();
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
      percent: requirements.length > 0 ? (covered.length / requirements.length) * 100 : 0,
      uncovered: requirements.filter(r => !covered.includes(r)).map(r => r.key),
    };
  }

  async markSuspectLinks(changedItemId: string): Promise<void> {
    await this.prisma.traceLink.updateMany({
      where: { OR: [{ fromId: changedItemId }, { toId: changedItemId }] },
      data: { isSuspect: true },
    });
  }
}
```

---

### 2.7 Workflows Module

**책임**: 워크플로우 CRUD, 상태 전이, 리뷰, 승인, 전자 서명

```typescript
// workflow.service.ts
@Injectable()
export class WorkflowService {
  async executeTransition(workItemId: string, transitionName: string, userId: string, comment?: string) {
    const item = await this.workItemService.getById(workItemId);
    const workflow = await this.getWorkflow(item.spaceId, item.typeId);
    const transition = workflow.transitions.find(t => t.name === transitionName);

    if (!transition) throw new BadRequestException('Invalid transition');

    // 조건 체크
    if (transition.conditionType === 'role_check') {
      const config = transition.conditionConfig as { roles: string[] };
      const userRoles = await this.userService.getRoles(userId, item.spaceId);
      if (!config.roles.some(r => userRoles.includes(r))) {
        throw new ForbiddenException('Role check failed');
      }
    }

    if (transition.conditionType === 'approval_count') {
      const config = transition.conditionConfig as { minApprovers: number };
      const approvals = await this.prisma.approval.count({
        where: { entityType: 'work_item', entityId: workItemId, decision: 'approve' },
      });
      if (approvals < config.minApprovers) {
        throw new BadRequestException(`Need ${config.minApprovers} approvals, got ${approvals}`);
      }
    }

    // 전이 실행
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workflowTransitionHistory.create({
        data: { workItemId, transitionId: transition.id, fromStateId: item.workflowStateId, toStateId: transition.toStateId, performedById: userId, comment },
      });
      return tx.workItem.update({
        where: { id: workItemId },
        data: { workflowStateId: transition.toStateId, status: transition.toState.category },
      });
    });

    // 사후 액션 실행
    for (const action of transition.postActions as any[]) {
      await this.executePostAction(action, item, userId);
    }

    return updated;
  }

  private async executePostAction(action: any, item: WorkItem, userId: string) {
    switch (action.type) {
      case 'notify':
        await this.notificationService.sendToUsers(action.config.users, { type: 'status_change', targetId: item.id });
        break;
      case 'create_link':
        await this.traceabilityService.createLink(action.config);
        break;
      case 'update_field':
        await this.prisma.workItem.update({ where: { id: item.id }, data: { [action.config.field]: action.config.value } });
        break;
    }
  }
}
```

---

### 2.8 Compliance Module (ASPICE)

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

### 2.9 Stakeholders Module

**책임**: 이해관계자 유형, 외부 조직, 접근 정책, 초대 관리

```typescript
// stakeholder.service.ts
@Injectable()
export class StakeholderService {
  async checkAccess(user: User, space: Space, workItem: WorkItem | null, action: string): Promise<boolean> {
    const profile = await this.prisma.userStakeholderProfile.findUnique({
      where: { userId: user.id },
      include: { stakeholderType: true, externalOrg: true },
    });

    if (!profile) return false;
    if (profile.stakeholderType.isInternal) {
      return this.permissionService.checkPermission(user.id, space.id, action);
    }

    const policy = await this.prisma.stakeholderAccessPolicy.findUnique({
      where: { stakeholderTypeId_orgId: { stakeholderTypeId: profile.stakeholderTypeId, orgId: user.orgId } },
    });

    if (!policy || !policy.allowedActions.includes(action)) return false;
    if (profile.restrictedSpaces.includes(space.id)) return false;
    if (profile.allowedSpaces.length > 0 && !profile.allowedSpaces.includes(space.id)) return false;

    if (workItem?.type === 'page' && policy.documentAccess !== 'all') {
      const allowedStatuses = policy.documentAccess === 'released_only'
        ? ['released'] : ['approved', 'released'];
      if (!allowedStatuses.includes(workItem.status)) return false;
    }

    if (policy.requireNda && !profile.externalOrg?.hasNda) return false;

    return true;
  }

  async invite(dto: InviteDto, invitedBy: string): Promise<Invitation> {
    const token = crypto.randomUUID();
    return this.prisma.invitation.create({
      data: {
        orgId: dto.orgId,
        email: dto.email,
        stakeholderTypeId: dto.stakeholderTypeId,
        externalOrgId: dto.externalOrgId,
        allowedSpaces: dto.allowedSpaces || [],
        dataFilter: dto.dataFilter || {},
        contractEnd: dto.contractEnd,
        token,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72시간
        invitedById: invitedBy,
      },
    });
  }
}
```

---

### 2.10 Git Module

**책임**: GitHub/GitLab 연동, 스마트 커밋, PR 링크, CI/CD 연동

```typescript
// git.service.ts
@Injectable()
export class GitService {
  async handleSmartCommit(commitMessage: string, userId: string): Promise<void> {
    // 스마트 커밋 파싱: "ADAS-123 #done #comment Fixed the bug"
    const issueKeyMatch = commitMessage.match(/([A-Z]+-\d+)/);
    if (!issueKeyMatch) return;

    const issueKey = issueKeyMatch[1];
    const item = await this.workItemService.getByKey(issueKey);

    // #done → 상태 전이
    if (commitMessage.includes('#done') || commitMessage.includes('#resolve')) {
      await this.workflowService.executeTransition(item.id, 'Done', userId, `Git commit: ${commitMessage}`);
    }

    // #comment → 코멘트 추가
    const commentMatch = commitMessage.match(/#comment\s+(.+)/);
    if (commentMatch) {
      await this.commentService.add(item.id, userId, commentMatch[1]);
    }

    // #time → 작업 시간 기록
    const timeMatch = commitMessage.match(/#time\s+(\d+)h/);
    if (timeMatch) {
      await this.workItemService.update(item.id, { actualHours: parseFloat(timeMatch[1]) });
    }
  }

  async handlePullRequest(pr: PullRequestEvent): Promise<void> {
    // PR → Work Item 자동 링크
    const issueKeys = this.extractIssueKeys(pr.title + ' ' + pr.body);
    for (const key of issueKeys) {
      await this.workItemService.linkPullRequest(key, pr.url, pr.state);
    }
  }

  async handleCiResult(ciResult: CiResultEvent): Promise<void> {
    // CI/CD 결과 → Work Item 상태 업데이트
    if (ciResult.status === 'success') {
      // 빌드 성공 → 상태 전이 가능
    } else if (ciResult.status === 'failure') {
      // 빌드 실패 → 결함 생성
      await this.defectService.create({
        title: `CI Build Failed: ${ciResult.pipelineName}`,
        description: ciResult.errorMessage,
        severity: 'major',
      });
    }
  }
}
```

---

### 2.11 Health Module

**책임**: Health Check 엔드포인트, 시스템 상태 모니터링

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.http.pingCheck('meilisearch', 'http://meilisearch:7700/health'),
      () => this.http.pingCheck('keycloak', 'http://keycloak:8080/health/ready'),
      () => this.http.pingCheck('minio', 'http://minio:9000/minio/health/live'),
    ]);
  }

  @Get('ready')
  ready() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
```

---

### 2.12 Export Module

**책임**: Word, PDF, Excel, HTML Export

```typescript
// export.service.ts
@Injectable()
export class ExportService {
  async exportToWord(documentId: string): Promise<Buffer> {
    const doc = await this.documentService.getPage(documentId);
    const docx = new Document({
      sections: [{
        children: [
          new Paragraph({ text: doc.title, heading: HeadingLevel.HEADING_1 }),
          ...this.convertTipTapToDocx(doc.body),
        ],
      }],
    });
    return Packer.toBuffer(docx);
  }

  async exportToPdf(documentId: string, userId: string, watermark?: string): Promise<Buffer> {
    const html = await this.renderToHtml(documentId);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4', displayHeaderFooter: true });
    await browser.close();
    if (watermark) return this.addWatermark(pdf, watermark);
    return pdf;
  }

  async exportTraceabilityToExcel(spaceKey: string): Promise<Buffer> {
    const matrix = await this.traceabilityService.getMatrix(spaceKey);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Traceability Matrix');
    sheet.addRow(['Requirement', 'Design', 'Code', 'Test Case', 'Status']);
    matrix.rows.forEach(row => sheet.addRow([row.req, row.design, row.code, row.test, row.status]));
    sheet.getRow(1).font = { bold: true };
    return workbook.xlsx.writeBuffer();
  }
}
```

---

### 2.13 Upload Module (MinIO)

**책임**: 파일 업로드, MIME 검증, 썸네일 생성

```typescript
// upload.service.ts
@Injectable()
export class UploadService {
  private s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    credentials: { accessKeyId: process.env.MINIO_USER, secretAccessKey: process.env.MINIO_PASSWORD },
    forcePathStyle: true,
  });

  async upload(file: Express.Multer.File, target: UploadTarget) {
    await this.validateFile(file);
    const path = `${target.type}/${target.id}/${Date.now()}_${file.originalname}`;
    await this.s3.send(new PutObjectCommand({ Bucket: 'alm-attachments', Key: path, Body: file.buffer, ContentType: file.mimetype }));

    let thumbnailPath = null;
    if (file.mimetype.startsWith('image/')) {
      const thumb = await this.thumbnailService.generate(file.buffer);
      thumbnailPath = `${target.type}/${target.id}/thumb_${Date.now()}.webp`;
      await this.s3.send(new PutObjectCommand({ Bucket: 'alm-attachments', Key: thumbnailPath, Body: thumb, ContentType: 'image/webp' }));
    }

    return this.prisma.attachment.create({
      data: { fileName: file.originalname, filePath: path, thumbnailPath, fileSize: file.size, mimeType: file.mimetype, targetId: target.id, targetType: target.type, uploadedById: target.userId },
    });
  }

  private async validateFile(file: Express.Multer.File) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('허용되지 않는 파일 형식');
    if (file.size > 50 * 1024 * 1024) throw new BadRequestException('파일 크기가 50MB를 초과합니다');
  }
}
```

---

### 2.14 Notification Module

**책임**: WebSocket 실시간 알림, 이메일 알림

```typescript
// notification.gateway.ts
@WebSocketGateway({ cors: true })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  async sendToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
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

  async notifyStatusChange(workItem: WorkItem, oldStatus: string, newStatus: string) {
    const watchers = await this.prisma.workItemWatcher.findMany({ where: { workItemId: workItem.id } });
    for (const watcher of watchers) {
      await this.gateway.sendToUser(watcher.userId, {
        type: 'status_change',
        title: '상태 변경',
        body: `${workItem.key}: ${oldStatus} → ${newStatus}`,
        targetId: workItem.id,
        emailEnabled: false,
      });
    }
  }
}
```

---

### 2.15 Search Module (Meilisearch)

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

  async suggest(prefix: string) {
    const result = await this.client.index('work_items').search(prefix, { limit: 5 });
    return result.hits.map(h => h.title);
  }
}
```

---

### 2.16 MCP Module

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

  constructor() { this.registerTools(); }

  private registerTools() {
    this.tools.set('alm_search_issues', async (args, user) => {
      const issues = await this.workItemService.search(args.jql, args.maxResults, user);
      return { content: [{ type: 'text', text: JSON.stringify(issues) }] };
    });
    this.tools.set('alm_get_issue', async (args, user) => {
      const issue = await this.workItemService.getByKey(args.issueKey, user);
      return { content: [{ type: 'text', text: JSON.stringify(issue) }] };
    });
    this.tools.set('alm_create_issue', async (args, user) => {
      const issue = await this.workItemService.create(args, user);
      return { content: [{ type: 'text', text: `Created: ${issue.key}` }] };
    });
    this.tools.set('alm_add_comment', async (args, user) => {
      await this.commentService.add(args.issueKey, user.id, args.body);
      return { content: [{ type: 'text', text: 'Comment added' }] };
    });
    this.tools.set('alm_get_traceability', async (args, user) => {
      const matrix = await this.traceabilityService.getMatrix(args.spaceKey);
      return { content: [{ type: 'text', text: JSON.stringify(matrix) }] };
    });
    this.tools.set('alm_get_coverage', async (args, user) => {
      const coverage = await this.traceabilityService.getCoverage(args.spaceKey);
      return { content: [{ type: 'text', text: JSON.stringify(coverage) }] };
    });
    this.tools.set('alm_get_compliance_status', async (args, user) => {
      const status = await this.complianceService.getSummary(args.spaceKey);
      return { content: [{ type: 'text', text: JSON.stringify(status) }] };
    });
    this.tools.set('alm_create_baseline', async (args, user) => {
      const baseline = await this.baselineService.create(args, user);
      return { content: [{ type: 'text', text: `Baseline created: ${baseline.name}` }] };
    });
    this.tools.set('alm_search_pages', async (args, user) => {
      const pages = await this.documentService.search(args.cql, user);
      return { content: [{ type: 'text', text: JSON.stringify(pages) }] };
    });
    this.tools.set('alm_get_page', async (args, user) => {
      const page = await this.documentService.getPage(args.pageId, user);
      return { content: [{ type: 'text', text: JSON.stringify(page) }] };
    });
    this.tools.set('alm_create_page', async (args, user) => {
      const page = await this.documentService.createPage(args, user);
      return { content: [{ type: 'text', text: `Page created: ${page.title}` }] };
    });
    this.tools.set('alm_get_project_summary', async (args, user) => {
      const summary = await this.spaceService.getSummary(args.spaceKey);
      return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
    });
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

## 3. 에러 코드 체계

```typescript
// common/errors/error-codes.ts
export const ErrorCodes = {
  // Space (1000)
  SPACE_NOT_FOUND: { code: 'ALM-1001', message: '프로젝트를 찾을 수 없습니다', status: 404 },
  SPACE_KEY_EXISTS: { code: 'ALM-1002', message: '이미 존재하는 프로젝트 키입니다', status: 409 },
  SPACE_ACCESS_DENIED: { code: 'ALM-1003', message: '프로젝트 접근 권한이 없습니다', status: 403 },
  SPACE_ARCHIVED: { code: 'ALM-1004', message: '아카이브된 프로젝트입니다', status: 400 },

  // Work Item (2000)
  WORK_ITEM_NOT_FOUND: { code: 'ALM-2001', message: '워크 아이템을 찾을 수 없습니다', status: 404 },
  INVALID_TRANSITION: { code: 'ALM-2002', message: '유효하지 않은 상태 전이입니다', status: 400 },
  PERMISSION_DENIED: { code: 'ALM-2003', message: '권한이 없습니다', status: 403 },
  WORK_ITEM_LOCKED: { code: 'ALM-2004', message: '편집 잠금 상태입니다', status: 423 },
  PARENT_NOT_FOUND: { code: 'ALM-2005', message: '부모 항목을 찾을 수 없습니다', status: 404 },

  // Auth (3000)
  UNAUTHORIZED: { code: 'ALM-3001', message: '인증이 필요합니다', status: 401 },
  APPROVAL_PENDING: { code: 'ALM-3002', message: '관리자 승인 대기 중입니다', status: 403 },
  EMAIL_NOT_VERIFIED: { code: 'ALM-3003', message: '이메일 인증이 필요합니다', status: 403 },
  ACCOUNT_DEACTIVATED: { code: 'ALM-3004', message: '계정이 비활성화되었습니다', status: 403 },
  INVALID_TOKEN: { code: 'ALM-3005', message: '유효하지 않은 토큰입니다', status: 401 },
  NDA_REQUIRED: { code: 'ALM-3006', message: 'NDA 서명이 필요합니다', status: 403 },

  // Upload (4000)
  FILE_TOO_LARGE: { code: 'ALM-4001', message: '파일 크기가 50MB를 초과합니다', status: 413 },
  INVALID_FILE_TYPE: { code: 'ALM-4002', message: '허용되지 않는 파일 형식입니다', status: 415 },
  MAGIC_NUMBER_MISMATCH: { code: 'ALM-4003', message: '파일 형식이 일치하지 않습니다', status: 400 },

  // Traceability (5000)
  TRACE_LINK_EXISTS: { code: 'ALM-5001', message: '이미 존재하는 추적성 링크입니다', status: 409 },
  SUSPECT_LINK_UNRESOLVED: { code: 'ALM-5002', message: '미해결 Suspect Link가 있습니다', status: 400 },

  // Workflow (6000)
  WORKFLOW_NOT_FOUND: { code: 'ALM-6001', message: '워크플로우를 찾을 수 없습니다', status: 404 },
  CONDITION_NOT_MET: { code: 'ALM-6002', message: '전이 조건이 충족되지 않았습니다', status: 400 },
  APPROVAL_INSUFFICIENT: { code: 'ALM-6003', message: '승인 수가 부족합니다', status: 400 },

  // Compliance (7000)
  PROCESS_NOT_FOUND: { code: 'ALM-7001', message: '프로세스를 찾을 수 없습니다', status: 404 },
  DELIVERABLE_NOT_FOUND: { code: 'ALM-7002', message: '산출물을 찾을 수 없습니다', status: 404 },

  // General (9000)
  VALIDATION_ERROR: { code: 'ALM-9001', message: '입력 값이 유효하지 않습니다', status: 400 },
  INTERNAL_ERROR: { code: 'ALM-9002', message: '서버 오류가 발생했습니다', status: 500 },
  RATE_LIMIT_EXCEEDED: { code: 'ALM-9003', message: '요청 한도를 초과했습니다', status: 429 },
} as const;
```

---

## 4. 환경변수 (.env.example)

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

## 5. 개발 시작 순서

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

## 6. AI 프롬프트 (구현 시작)

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
- modules: auth, spaces, work-items, documents, requirements, tests, traceability, compliance, workflows, notifications, search, mcp, upload, health, stakeholders, git, export
- PrismaService, KeycloakService
- ESLint + Prettier + Husky 설정
- Health Check + Winston 로깅"
```

---

**이 SPEC.md를 기반으로 개발을 시작할 수 있습니다. Step 1 (Docker Compose + 인프라)부터 시작하시겠어요?**