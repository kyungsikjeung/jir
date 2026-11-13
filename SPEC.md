generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════
// 01. Core (사용자, 조직, 역할, 권한)
// ═══════════════════════════════════════════

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  domain    String
  logoUrl   String?
  plan      String   @default("free")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  spaces    Space[]
  users     User[]
  projectTemplates ProjectTemplate[]
  externalOrgs ExternalOrganization[]
  systemSettings SystemSetting[]
  invitations  Invitation[]
  sharedComponents SharedComponent[]
  apiKeys   ApiKey[]
  webhooks  Webhook[]
  ndaDocuments NdaDocument[]
  spaceTemplatesApplied SpaceTemplateApplied[]

  @@map("organizations")
}

model User {
  id            String   @id @default(uuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id])
  email         String   @unique
  passwordHash  String?
  displayName   String
  avatarUrl     String?
  title         String?
  department    String?
  isInternal    Boolean  @default(false)
  isVerified    Boolean  @default(false)
  isApproved    Boolean  @default(false)
  isActive      Boolean  @default(true)
  isExternal    Boolean  @default(false)
  lastLoginAt   DateTime?
  contractStart DateTime?
  contractEnd   DateTime?
  isTemporary   Boolean  @default(false)
  invitedById   String?
  invitedBy     User?    @relation("invitedBy", fields: [invitedById], references: [id])
  invitedUsers   User[]   @relation("invitedBy")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  roles         UserRole[]
  spaceMembers  SpaceMember[]
  assignedItems WorkItem[] @relation("assignee")
  reportedItems WorkItem[] @relation("reporter")
  identities    UserIdentity[]
  sessions      UserSession[]
  comments      Comment[]
  resolvedComments Comment[] @relation("resolver")
  attachments   Attachment[]
  requirements  Requirement[]
  testRuns      TestRun[]
  testResults   TestResult[]
  baselines     Baseline[]
  releases      Release[]
  reviews       Review[]
  reviewParticipants ReviewParticipant[]
  reviewFindings ReviewFinding[]
  approvals     Approval[]
  signatures    ElectronicSignature[]
  ndaSignatures NdaSignature[]
  workflows     Workflow[]
  pageTemplates PageTemplate[]
  projectTemplates ProjectTemplate[]
  projectDeliverables ProjectDeliverable[]
  processAssessments ProcessAssessment[]
  complianceChecklists ComplianceChecklist[]
  apiKeys       ApiKey[]
  mcpSessions   McpSession[]
  webhooks      Webhook[]
  urlAccessLogs UrlAccessLog[]
  activityFeeds ActivityFeed[]
  notifications Notification[]
  notificationPrefs NotificationPreference[]
  auditLogs     AuditLog[]
  systemAuditLogs SystemAuditLog[]
  systemSettings SystemSetting[]
  spaceTemplatesApplied SpaceTemplateApplied[]
  spaceStakeholderAccess SpaceStakeholderAccess[]
  stakeholderProfiles UserStakeholderProfile[]
  spaceDailyMetrics SpaceDailyMetric[]
  backlogRankings BacklogRanking[]
  sprintItems   SprintItem[]
  crossProjectLinks CrossProjectLink[]
  sharedComponents SharedComponent[]
  componentUsages ComponentUsage[]
  workItemVersions WorkItemVersion[]
  workItemLinks WorkItemLink[]
  workItemDependencies WorkItemDependency[] @relation("depFrom")
  workItemDependenciesTo WorkItemDependency[] @relation("depTo")
  traceLinks    TraceLink[]
  suspectLinksMarked SuspectLink[] @relation("markedBy")
  suspectLinksResolved SuspectLink[] @relation("resolvedBy")
  traceMatrixSnapshots TraceMatrixSnapshot[]
  coverageReports CoverageReport[]
  evidenceLinks EvidenceLink[]
  urlSlugs      UrlSlug[]
  workItemWatchers WorkItemWatcher[]
  testSuites    TestSuite[]
  sprintItemsAdded SprintItem[] @relation("addedBy")
  spaceMembersAdded SpaceMember[] @relation("addedBy")
  registrationRequests RegistrationRequest[]
  reviewedRegistrations RegistrationRequest[] @relation("reviewedBy")
  approvalAuditLogs ApprovalAuditLog[] @relation("targetUser")
  performedApprovalAudits ApprovalAuditLog[] @relation("performer")
  acceptedInvitations Invitation[] @relation("acceptedBy")
  invitedInvitations Invitation[] @relation("invitedBy")
  roleResponsibilities RoleResponsibility[]
  @@index([orgId])
  @@index([email])
  @@map("users")
}

model UserIdentity {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider    String
  providerUid String
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())
  @@unique([provider, providerUid])
  @@map("user_identities")
}

model UserSession {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash   String   @unique
  ipAddress   String?
  userAgent   String?
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
  @@index([userId])
  @@map("user_sessions")
}

model Role {
  id          String   @id @default(uuid())
  orgId       String?
  org         Organization? @relation(fields: [orgId], references: [id])
  name        String
  description String?
  isSystem    Boolean  @default(false)
  isSuperAdmin Boolean @default(false)
  isAdmin     Boolean  @default(false)
  createdAt   DateTime @default(now())
  permissions RolePermission[]
  userRoles   UserRole[]
  spaceMembers SpaceMember[]
  roleResponsibilities RoleResponsibility[]
  approvalAuditLogs ApprovalAuditLog[]
  @@unique([orgId, name])
  @@map("roles")
}

model Permission {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  category    String
  action      String
  resource    String
  isSystem    Boolean  @default(false)
  roles       RolePermission[]
  @@map("permissions")
}

model RolePermission {
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  grantedAt    DateTime   @default(now())
  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleId     String
  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  spaceId    String?
  space      Space?   @relation(fields: [spaceId], references: [id])
  grantedBy  String?
  grantedByUser User?  @relation(fields: [grantedBy], references: [id])
  grantedAt  DateTime @default(now())
  expiresAt  DateTime?
  @@id([userId, roleId, spaceId])
  @@map("user_roles")
}

// ═══════════════════════════════════════════
// 02. Spaces
// ═══════════════════════════════════════════

model Space {
  id               String   @id @default(uuid())
  orgId            String
  org              Organization @relation(fields: [orgId], references: [id])
  key              String   @unique
  name             String
  description      String?
  spaceType        String   @default("software")
  iconUrl          String?
  aspiceLevel      String   @default("2")
  automotiveDomain String?
  processProfile   String   @default("default")
  defaultWorkflowId String?
  defaultWorkflow  Workflow? @relation(fields: [defaultWorkflowId], references: [id])
  settings         Json     @default("{}")
  isArchived       Boolean  @default(false)
  createdById      String?
  createdBy        User?    @relation(fields: [createdById], references: [id])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  members          SpaceMember[]
  workItems        WorkItem[]
  settingsRel      SpaceSettings?
  components       Component[]
  labels           Label[]
  versions         Version[]
  boards           Board[]
  sprints          Sprint[]
  testSuites       TestSuite[]
  testRuns         TestRun[]
  baselines        Baseline[]
  releases         Release[]
  workflows        Workflow[]
  pageTemplates    PageTemplate[]
  reviews          Review[]
  activityFeeds    ActivityFeed[]
  spaceProcessAreas SpaceProcessArea[]
  projectDeliverables ProjectDeliverable[]
  processAssessments ProcessAssessment[]
  complianceChecklists ComplianceChecklist[]
  spaceStakeholderAccess SpaceStakeholderAccess[]
  spaceDailyMetrics SpaceDailyMetric[]
  backlogRankings  BacklogRanking[]
  spaceTemplatesApplied SpaceTemplateApplied[]
  sharedComponents SharedComponent[]
  componentUsages  ComponentUsage[]
  roleResponsibilities RoleResponsibility[]
  webhooks         Webhook[]
  crossProjectLinksFrom CrossProjectLink[] @relation("fromSpace")
  crossProjectLinksTo   CrossProjectLink[] @relation("toSpace")
  userRoles        UserRole[]
  @@index([orgId])
  @@index([key])
  @@map("spaces")
}

model SpaceMember {
  spaceId   String
  space     Space  @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  userId    String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleId    String
  role      Role   @relation(fields: [roleId], references: [id])
  addedById String?
  addedBy   User?  @relation("addedBy", fields: [addedById], references: [id])
  addedAt   DateTime @default(now())
  @@id([spaceId, userId])
  @@map("space_members")
}

model SpaceSettings {
  spaceId                   String  @id
  space                     Space   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  defaultPageTemplateId     String?
  defaultPageTemplate       PageTemplate? @relation(fields: [defaultPageTemplateId], references: [id])
  allowAnonymousView        Boolean @default(false)
  requireApprovalForRelease Boolean @default(true)
  minApprovers              Int     @default(1)
  autoSuspectLinks          Boolean @default(true)
  requireTraceForRelease    Boolean @default(true)
  notificationChannels      Json    @default("[\"in_app\", \"email\"]")
  aspiceLevel               String  @default("2")
  requireEvidenceForAll     Boolean @default(false)
  updatedAt                 DateTime @updatedAt
  @@map("space_settings")
}

model Component {
  id          String   @id @default(uuid())
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name        String
  description String?
  leadUserId  String?
  leadUser    User?    @relation(fields: [leadUserId], references: [id])
  createdAt   DateTime @default(now())
  @@unique([spaceId, name])
  @@map("components")
}

model Label {
  id      String   @id @default(uuid())
  spaceId String
  space   Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name    String
  color   String   @default("#6B7280")
  @@unique([spaceId, name])
  @@map("labels")
}

model Version {
  id          String   @id @default(uuid())
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name        String
  description String?
  releaseDate DateTime?
  status      String   @default("unreleased")
  createdAt   DateTime @default(now())
  @@unique([spaceId, name])
  @@map("versions")
}

// ═══════════════════════════════════════════
// 03. Work Items
// ═══════════════════════════════════════════

model WorkItemType {
  id             String   @id @default(uuid())
  spaceId        String
  space          Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name           String
  icon           String?
  color          String?
  hierarchyLevel Int      @default(0)
  isSubtask      Boolean  @default(false)
  aspiceProcess  String?
  createdAt      DateTime @default(now())
  workItems      WorkItem[]
  @@unique([spaceId, name])
  @@map("work_item_types")
}

model WorkItem {
  id              String   @id @default(uuid())
  spaceId         String
  space           Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
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
  epicId          String?
  epic            WorkItem? @relation("epic", fields: [epicId], references: [id])
  epics           WorkItem[] @relation("epic")
  workflowStateId String?
  workflowState   WorkflowState? @relation(fields: [workflowStateId], references: [id])
  version         Int      @default(1)
  baselineId      String?
  baseline        Baseline? @relation(fields: [baselineId], references: [id])
  body            Json?
  bodyText        String?
  labels          String[]
  components      String[]
  fixVersions     String[]
  dueDate         DateTime?
  storyPoints     Int?
  aspiceProcess   String?
  asilLevel       String?
  estimatedHours  Decimal? @db.Decimal(10,2)
  actualHours     Decimal? @db.Decimal(10,2)
  progressPercent Int      @default(0)
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  resolvedAt      DateTime?
  versions        WorkItemVersion[]
  watchers        WorkItemWatcher[]
  customFields    CustomFieldValue[]
  linksFrom       WorkItemLink[] @relation("from")
  linksTo         WorkItemLink[] @relation("to")
  page            Page?
  requirement     Requirement?
  testCase        TestCase?
  defect          Defect?
  changeRequest   ChangeRequest?
  comments        Comment[]
  attachments     Attachment[]
  testSuiteCases  TestSuiteCase[]
  testResults     TestResult[]
  defectResults   TestResult[] @relation("defectResult")
  reviewFindings  ReviewFinding[] @relation("defectFinding")
  sprintItems     SprintItem[]
  backlogRanking  BacklogRanking?
  baselineItems   BaselineItem[]
  projectDeliverables ProjectDeliverable[]
  evidenceLinks   EvidenceLink[]
  workflowHistory WorkflowTransitionHistory[]
  dependenciesFrom WorkItemDependency[] @relation("depFrom")
  dependenciesTo   WorkItemDependency[] @relation("depTo")
  traceLinksFrom   TraceLink[] @relation("traceFrom")
  traceLinksTo     TraceLink[] @relation("traceTo")
  testCoverageAsCase TestCoverage[] @relation("testCaseCoverage")
  testCoverageAsReq  TestCoverage[] @relation("reqCoverage")
  derivedRequirements Requirement[] @relation("derivedFrom")
  @@unique([spaceId, key])
  @@index([spaceId])
  @@index([status])
  @@index([assigneeId])
  @@index([aspiceProcess])
  @@map("work_items")
}

model WorkItemLink {
  id          String   @id @default(uuid())
  fromId      String
  from        WorkItem @relation("from", fields: [fromId], references: [id], onDelete: Cascade)
  toId        String
  to          WorkItem @relation("to", fields: [toId], references: [id], onDelete: Cascade)
  linkType    String
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  @@unique([fromId, toId, linkType])
  @@index([fromId])
  @@index([toId])
  @@map("work_item_links")
}

model WorkItemVersion {
  id            String   @id @default(uuid())
  workItemId    String
  workItem      WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  version       Int
  title         String?
  body          Json?
  bodyText      String?
  changedById   String?
  changedBy     User?    @relation(fields: [changedById], references: [id])
  changeSummary String?
  createdAt     DateTime @default(now())
  deliverableVersions DeliverableVersion[]
  @@unique([workItemId, version])
  @@index([workItemId])
  @@map("work_item_versions")
}

model WorkItemWatcher {
  workItemId String
  workItem   WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  addedAt    DateTime @default(now())
  @@id([workItemId, userId])
  @@map("work_item_watchers")
}

model CustomFieldDef {
  id           String   @id @default(uuid())
  spaceId      String
  space        Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name         String
  fieldType    String
  options      Json     @default("[]")
  required     Boolean  @default(false)
  defaultValue Json?
  createdAt    DateTime @default(now())
  values       CustomFieldValue[]
  @@unique([spaceId, name])
  @@map("custom_field_defs")
}

model CustomFieldValue {
  workItemId String
  workItem   WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  fieldId    String
  field      CustomFieldDef @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  value      Json?
  @@id([workItemId, fieldId])
  @@map("custom_field_values")
}

model WorkItemDependency {
  id             String   @id @default(uuid())
  fromItemId     String
  fromItem       WorkItem @relation("depFrom", fields: [fromItemId], references: [id], onDelete: Cascade)
  toItemId       String
  toItem         WorkItem @relation("depTo", fields: [toItemId], references: [id], onDelete: Cascade)
  dependencyType String
  lagDays        Int      @default(0)
  createdAt      DateTime @default(now())
  @@unique([fromItemId, toItemId])
  @@map("work_item_dependencies")
}

// ═══════════════════════════════════════════
// 04. Documents
// ═══════════════════════════════════════════

model Page {
  workItemId    String   @id
  workItem      WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  parentPageId  String?
  parentPage    WorkItem? @relation("pageParent", fields: [parentPageId], references: [id])
  childPages    Page[]   @relation("pageParent")
  templateId    String?
  template      PageTemplate? @relation(fields: [templateId], references: [id])
  position      Int      @default(0)
  isHomepage    Boolean  @default(false)
  viewCount     Int      @default(0)
  lastViewedAt  DateTime?
  @@map("pages")
}

model PageTemplate {
  id             String   @id @default(uuid())
  spaceId        String?
  space          Space?   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name           String
  description    String?
  body           Json?
  category       String?
  aspiceProcess  String?
  isSystem       Boolean  @default(false)
  createdById    String?
  createdBy      User?    @relation(fields: [createdById], references: [id])
  createdAt      DateTime @default(now())
  pages          Page[]
  aspiceDeliverables AspiceDeliverable[]
  @@map("page_templates")
}

model Comment {
  id            String   @id @default(uuid())
  targetType    String
  targetId      String
  parentId      String?
  parent        Comment? @relation("thread", fields: [parentId], references: [id])
  replies       Comment[] @relation("thread")
  authorId      String
  author        User     @relation(fields: [authorId], references: [id])
  body          String
  bodyHtml      String?
  anchor        Json?
  isInline      Boolean  @default(false)
  isResolved    Boolean  @default(false)
  resolvedById  String?
  resolvedBy    User?    @relation("resolver", fields: [resolvedById], references: [id])
  resolvedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  reactions     CommentReaction[]
  @@index([targetType, targetId])
  @@index([parentId])
  @@map("comments")
}

model CommentReaction {
  commentId String
  comment   Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  emoji     String
  createdAt DateTime @default(now())
  @@id([commentId, userId, emoji])
  @@map("comment_reactions")
}

model Attachment {
  id            String   @id @default(uuid())
  targetType    String
  targetId      String
  fileName      String
  filePath      String
  fileSize      BigInt?
  mimeType      String?
  thumbnailPath String?
  uploadedById  String
  uploadedBy    User     @relation(fields: [uploadedById], references: [id])
  uploadedAt    DateTime @default(now())
  isDeleted     Boolean  @default(false)
  @@index([targetType, targetId])
  @@map("attachments")
}

model Favorite {
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  targetType String
  targetId   String
  createdAt  DateTime @default(now())
  @@id([userId, targetType, targetId])
  @@map("favorites")
}

// ═══════════════════════════════════════════
// 05. Requirements
// ═══════════════════════════════════════════

model Requirement {
  workItemId         String   @id
  workItem           WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  reqType            String
  asilLevel          String?
  safetyRelated      Boolean  @default(false)
  rationale          String?
  acceptanceCriteria String?
  verificationMethod String?
  derivedFromId      String?
  derivedFrom        WorkItem? @relation("derivedFrom", fields: [derivedFromId], references: [id])
  reviewStatus       String   @default("draft")
  approvedById       String?
  approvedBy         User?    @relation(fields: [approvedById], references: [id])
  approvedAt         DateTime?
  baselineId         String?
  baseline           Baseline? @relation(fields: [baselineId], references: [id])
  externalId         String?
  externalSource     String?
  attributes         RequirementAttribute[]
  relationsFrom      RequirementRelation[] @relation("fromReq")
  relationsTo        RequirementRelation[] @relation("toReq")
  changeHistory      RequirementChangeHistory[]
  @@map("requirements")
}

model RequirementAttribute {
  requirementId String
  requirement   Requirement @relation(fields: [requirementId], references: [workItemId], onDelete: Cascade)
  attrKey       String
  attrValue     String?
  @@id([requirementId, attrKey])
  @@map("requirement_attributes")
}

model RequirementRelation {
  id           String   @id @default(uuid())
  fromReqId    String
  fromReq      WorkItem @relation("fromReq", fields: [fromReqId], references: [id], onDelete: Cascade)
  toReqId      String
  toReq        WorkItem @relation("toReq", fields: [toReqId], references: [id], onDelete: Cascade)
  relationType String
  createdById  String?
  createdBy    User?    @relation(fields: [createdById], references: [id])
  createdAt    DateTime @default(now())
  @@unique([fromReqId, toReqId, relationType])
  @@map("requirement_relations")
}

model RequirementChangeHistory {
  id             String   @id @default(uuid())
  requirementId  String
  requirement    WorkItem @relation(fields: [requirementId], references: [id], onDelete: Cascade)
  versionFrom    Int
  versionTo      Int
  changedFields  Json?
  changedById    String?
  changedBy      User?    @relation(fields: [changedById], references: [id])
  changedAt      DateTime @default(now())
  @@map("requirement_change_history")
}

// ═══════════════════════════════════════════
// 06. Tests
// ═══════════════════════════════════════════

model TestCase {
  workItemId          String   @id
  workItem            WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  testType            String
  preconditions       String?
  postconditions      String?
  steps               Json     @default("[]")
  isAutomated         Boolean  @default(false)
  automationFramework String?
  automationScriptPath String?
  testEnvironment     String?
  estimatedDuration   Int?
  createdAt           DateTime @default(now())
  @@map("test_cases")
}

model TestSuite {
  id          String   @id @default(uuid())
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name        String
  description String?
  parentId    String?
  parent      TestSuite? @relation("suiteParent", fields: [parentId], references: [id])
  children    TestSuite[] @relation("suiteParent")
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  cases       TestSuiteCase[]
  testRuns    TestRun[]
  @@map("test_suites")
}

model TestSuiteCase {
  suiteId    String
  suite      TestSuite @relation(fields: [suiteId], references: [id], onDelete: Cascade)
  testCaseId String
  testCase   WorkItem  @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
  position   Int      @default(0)
  @@id([suiteId, testCaseId])
  @@map("test_suite_cases")
}

model TestRun {
  id           String   @id @default(uuid())
  spaceId      String
  space        Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name         String
  description  String?
  testSuiteId  String?
  testSuite    TestSuite? @relation(fields: [testSuiteId], references: [id])
  environment  String?
  buildVersion String?
  baselineId   String?
  baseline     Baseline? @relation(fields: [baselineId], references: [id])
  status       String   @default("planned")
  assignedToId String?
  assignedTo   User?    @relation(fields: [assignedToId], references: [id])
  startedAt    DateTime?
  completedAt  DateTime?
  createdById  String?
  createdBy    User?    @relation(fields: [createdById], references: [id])
  createdAt    DateTime @default(now())
  results      TestResult[]
  @@index([spaceId])
  @@index([status])
  @@map("test_runs")
}

model TestResult {
  id               String   @id @default(uuid())
  testRunId        String
  testRun          TestRun  @relation(fields: [testRunId], references: [id], onDelete: Cascade)
  testCaseId       String
  testCase         WorkItem @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
  result           String
  actualResult     String?
  evidence         Json     @default("[]")
  executedById     String?
  executedBy       User?    @relation(fields: [executedById], references: [id])
  executedAt       DateTime @default(now())
  durationMs       Int?
  defectId         String?
  defect           WorkItem? @relation("defectResult", fields: [defectId], references: [id])
  retryCount       Int      @default(0)
  previousResultId String?
  previousResult   TestResult? @relation("retry", fields: [previousResultId], references: [id])
  retries          TestResult[] @relation("retry")
  @@unique([testRunId, testCaseId])
  @@index([testRunId])
  @@index([testCaseId])
  @@map("test_results")
}

model TestCoverage {
  testCaseId     String
  testCase       WorkItem @relation("testCaseCoverage", fields: [testCaseId], references: [id], onDelete: Cascade)
  requirementId  String
  requirement    WorkItem @relation("reqCoverage", fields: [requirementId], references: [id], onDelete: Cascade)
  coverageType   String   @default("verifies")
  createdAt      DateTime @default(now())
  @@id([testCaseId, requirementId])
  @@map("test_coverage")
}

model Defect {
  workItemId         String   @id
  workItem           WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  severity           String
  defectType         String?
  foundInVersion     String?
  foundInEnvironment String?
  fixedInVersion     String?
  rootCause          String?
  reproductionSteps  String?
  timeToFixHours     Decimal? @db.Decimal(10,2)
  safetyImpact       Boolean  @default(false)
  asilLevel          String?
  @@map("defects")
}

// ═══════════════════════════════════════════
// 07. Traceability
// ═══════════════════════════════════════════

model TraceLink {
  id          String   @id @default(uuid())
  fromType    String
  fromId      String
  fromItem    WorkItem? @relation("traceFrom", fields: [fromId], references: [id])
  toType      String
  toId        String
  toItem      WorkItem? @relation("traceTo", fields: [toId], references: [id])
  linkType    String
  description String?
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  baselineId  String?
  baseline    Baseline? @relation(fields: [baselineId], references: [id])
  isSuspect   Boolean  @default(false)
  suspectLinks SuspectLink[]
  @@unique([fromType, fromId, toType, toId, linkType])
  @@index([fromType, fromId])
  @@index([toType, toId])
  @@index([isSuspect])
  @@map("trace_links")
}

model SuspectLink {
  id           String   @id @default(uuid())
  traceLinkId  String
  traceLink    TraceLink @relation(fields: [traceLinkId], references: [id], onDelete: Cascade)
  reason       String?
  markedAt     DateTime @default(now())
  markedById   String?
  markedBy     User?    @relation("markedBy", fields: [markedById], references: [id])
  resolvedAt   DateTime?
  resolvedById String?
  resolvedBy   User?    @relation("resolvedBy", fields: [resolvedById], references: [id])
  resolution   String?
  @@map("suspect_links")
}

model TraceMatrixSnapshot {
  id                  String   @id @default(uuid())
  spaceId             String
  space               Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  baselineId          String?
  baseline            Baseline? @relation(fields: [baselineId], references: [id])
  name                String
  matrixData          Json
  totalRequirements   Int      @default(0)
  coveredRequirements Int      @default(0)
  coveragePercent     Decimal  @default(0) @db.Decimal(5,2)
  generatedById       String?
  generatedBy         User?    @relation(fields: [generatedById], references: [id])
  generatedAt         DateTime @default(now())
  @@map("trace_matrix_snapshots")
}

model CoverageReport {
  id              String   @id @default(uuid())
  spaceId         String
  space           Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  baselineId      String?
  baseline        Baseline? @relation(fields: [baselineId], references: [id])
  reportType      String
  totalItems      Int
  coveredItems    Int
  coveragePercent Decimal  @db.Decimal(5,2)
  uncoveredItems  Json     @default("[]")
  generatedById   String?
  generatedBy     User?    @relation(fields: [generatedById], references: [id])
  generatedAt     DateTime @default(now())
  @@map("coverage_reports")
}

// ═══════════════════════════════════════════
// 08. Config (베이스라인, 변경관리)
// ═══════════════════════════════════════════

model Baseline {
  id            String   @id @default(uuid())
  spaceId       String
  space         Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name          String
  description   String?
  version       String?
  baselineType  String   @default("release")
  status        String   @default("draft")
  snapshotData  Json?
  approvedById  String?
  approvedBy    User?    @relation(fields: [approvedById], references: [id])
  approvedAt    DateTime?
  releasedAt    DateTime?
  createdById   String?
  createdBy     User?    @relation(fields: [createdById], references: [id])
  createdAt     DateTime @default(now())
  items         BaselineItem[]
  traceLinks    TraceLink[]
  snapshots     TraceMatrixSnapshot[]
  coverageReports CoverageReport[]
  testRuns      TestRun[]
  requirements  Requirement[]
  deliverableVersions DeliverableVersion[]
  changeBaselineImpacts ChangeBaselineImpact[]
  @@unique([spaceId, name])
  @@index([spaceId])
  @@index([status])
  @@map("baselines")
}

model BaselineItem {
  baselineId   String
  baseline     Baseline @relation(fields: [baselineId], references: [id], onDelete: Cascade)
  itemType     String
  itemId       String
  itemVersion  Int?
  @@id([baselineId, itemType, itemId])
  @@map("baseline_items")
}

model ConfigurationItem {
  id             String   @id @default(uuid())
  spaceId        String
  space          Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  ciType         String
  name           String
  description    String?
  location       String?
  currentVersion String?
  status         String   @default("active")
  linkedWorkItems String[]
  ownerId        String?
  owner          User?    @relation(fields: [ownerId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@map("configuration_items")
}

model ChangeRequest {
  workItemId     String   @id
  workItem       WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  crType         String   @default("standard")
  impactAnalysis String?
  affectedItems  String[]
  estimatedEffort Int?
  urgency        String   @default("medium")
  approvalStatus String   @default("pending")
  createdAt      DateTime @default(now())
  baselineImpacts ChangeBaselineImpact[]
  @@map("change_requests")
}

model ChangeBaselineImpact {
  changeRequestId String
  changeRequest   ChangeRequest @relation(fields: [changeRequestId], references: [workItemId], onDelete: Cascade)
  baselineId      String
  baseline        Baseline @relation(fields: [baselineId], references: [id], onDelete: Cascade)
  impactLevel     String   @default("medium")
  @@id([changeRequestId, baselineId])
  @@map("change_baseline_impact")
}

model Release {
  id          String   @id @default(uuid())
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name        String
  description String?
  version     String?
  releaseDate DateTime?
  status      String   @default("planned")
  baselineId  String?
  baseline    Baseline? @relation(fields: [baselineId], references: [id])
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  @@unique([spaceId, name])
  @@map("releases")
}

// ═══════════════════════════════════════════
// 09. Workflow
// ═══════════════════════════════════════════

model Workflow {
  id            String   @id @default(uuid())
  spaceId       String?
  space         Space?   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name          String
  description   String?
  aspiceProcess String?
  isDefault     Boolean  @default(false)
  isSystem      Boolean  @default(false)
  createdById   String?
  createdBy     User?    @relation(fields: [createdById], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  states        WorkflowState[]
  transitions   WorkflowTransition[]
  workItems     WorkItem[]
  spaces        Space[]
  @@map("workflows")
}

model WorkflowState {
  id          String   @id @default(uuid())
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  name        String
  description String?
  category    String
  color       String   @default("#6B7280")
  position    Int      @default(0)
  isInitial   Boolean  @default(false)
  isTerminal  Boolean  @default(false)
  workItems   WorkItem[]
  transitionsFrom WorkflowTransition[] @relation("fromState")
  transitionsTo   WorkflowTransition[] @relation("toState")
  historyFrom WorkflowTransitionHistory[] @relation("histFrom")
  historyTo   WorkflowTransitionHistory[] @relation("histTo")
  @@unique([workflowId, name])
  @@index([workflowId])
  @@map("workflow_states")
}

model WorkflowTransition {
  id             String   @id @default(uuid())
  workflowId     String
  workflow       Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  name           String
  fromStateId    String?
  fromState      WorkflowState? @relation("fromState", fields: [fromStateId], references: [id])
  toStateId      String
  toState        WorkflowState @relation("toState", fields: [toStateId], references: [id])
  conditionType  String?
  conditionConfig Json    @default("{}")
  postActions    Json     @default("[]")
  isGlobal       Boolean  @default(false)
  position       Int      @default(0)
  history        WorkflowTransitionHistory[]
  @@unique([workflowId, fromStateId, toStateId])
  @@index([workflowId])
  @@map("workflow_transitions")
}

model WorkflowTransitionHistory {
  id            String   @id @default(uuid())
  workItemId    String
  workItem      WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  transitionId  String?
  transition    WorkflowTransition? @relation(fields: [transitionId], references: [id])
  fromStateId   String?
  fromState     WorkflowState? @relation("histFrom", fields: [fromStateId], references: [id])
  toStateId     String?
  toState       WorkflowState? @relation("histTo", fields: [toStateId], references: [id])
  performedById String?
  performedBy   User?    @relation(fields: [performedById], references: [id])
  comment       String?
  performedAt   DateTime @default(now())
  @@index([workItemId])
  @@map("workflow_transition_history")
}

model Review {
  id            String   @id @default(uuid())
  spaceId       String
  space         Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  reviewType    String
  targetType    String
  targetId      String
  status        String   @default("pending")
  moderatorId   String?
  moderator     User?    @relation(fields: [moderatorId], references: [id])
  aspiceProcess String?
  dueDate       DateTime?
  createdById   String?
  createdBy     User?    @relation(fields: [createdById], references: [id])
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  participants  ReviewParticipant[]
  findings      ReviewFinding[]
  @@map("reviews")
}

model ReviewParticipant {
  reviewId   String
  review     Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       String   @default("reviewer")
  status     String   @default("pending")
  decisionAt DateTime?
  comment    String?
  @@id([reviewId, userId])
  @@map("review_participants")
}

model ReviewFinding {
  id          String   @id @default(uuid())
  reviewId    String
  review      Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  title       String
  description String?
  severity    String   @default("minor")
  status      String   @default("open")
  location    Json?
  defectId    String?
  defect      WorkItem? @relation("defectFinding", fields: [defectId], references: [id])
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
  @@map("review_findings")
}

model Approval {
  id              String   @id @default(uuid())
  entityType      String
  entityId        String
  approverId      String
  approver        User     @relation(fields: [approverId], references: [id])
  decision        String
  comment         String?
  signature       String?
  signatureMethod String?
  decidedAt       DateTime @default(now())
  @@unique([entityType, entityId, approverId])
  @@index([entityType, entityId])
  @@map("approvals")
}

model ElectronicSignature {
  id             String   @id @default(uuid())
  entityType     String
  entityId       String
  signerId       String
  signer         User     @relation(fields: [signerId], references: [id])
  signatureType  String
  signatureData  String
  signedAt       DateTime @default(now())
  ipAddress      String?
  isEvidence     Boolean  @default(true)
  evidenceTag    String?
  comment        String?
  @@unique([entityType, entityId, signerId])
  @@map("electronic_signatures")
}

// ═══════════════════════════════════════════
// 10. Audit
// ═══════════════════════════════════════════

model AuditLog {
  id             String   @id @default(uuid())
  entityType     String
  entityId       String
  action         String
  fieldName      String?
  oldValue       Json?
  newValue       Json?
  diff           Json?
  actorId        String?
  actor          User?    @relation(fields: [actorId], references: [id])
  actorIp        String?
  actorUserAgent String?
  sessionId      String?
  isEvidence     Boolean  @default(false)
  evidenceTag    String?
  createdAt      DateTime @default(now())
  evidenceLinks  EvidenceLink[]
  complianceChecklists ComplianceChecklist[]
  ndaSignatures  NdaSignature[]
  @@index([entityType, entityId])
  @@index([actorId])
  @@index([action])
  @@index([createdAt])
  @@index([isEvidence])
  @@map("audit_logs")
}

model EvidenceLink {
  id            String   @id @default(uuid())
  auditLogId    String
  auditLog      AuditLog @relation(fields: [auditLogId], references: [id], onDelete: Cascade)
  aspiceProcess String
  aspiceClause  String?
  workItemId    String?
  workItem      WorkItem? @relation(fields: [workItemId], references: [id])
  description   String?
  createdAt     DateTime @default(now())
  @@index([aspiceProcess])
  @@map("evidence_links")
}

model ActivityFeed {
  id          String   @id @default(uuid())
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  actorId     String?
  actor       User?    @relation(fields: [actorId], references: [id])
  action      String
  targetType  String
  targetId    String
  targetTitle String?
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())
  @@index([spaceId, createdAt(sort: Desc)])
  @@map("activity_feed")
}

model Notification {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       String
  title      String
  body       String?
  targetType String?
  targetId   String?
  isRead     Boolean  @default(false)
  readAt     DateTime?
  createdAt  DateTime @default(now())
  @@index([userId, isRead, createdAt(sort: Desc)])
  @@map("notifications")
}

model NotificationPreference {
  userId           String
  user             User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  notificationType String
  channel          String @default("in_app")
  enabled          Boolean @default(true)
  @@id([userId, notificationType, channel])
  @@map("notification_preferences")
}

// ═══════════════════════════════════════════
// 11. Process (ASPICE)
// ═══════════════════════════════════════════

model ProcessArea {
  id                   String   @id @default(uuid())
  code                 String   @unique
  name                 String
  category             String
  description          String?
  level                Int
  parentCode           String?
  requiredWorkProducts String[]
  sortOrder            Int      @default(0)
  spaceProcessAreas    SpaceProcessArea[]
  deliverables         AspiceDeliverable[]
  assessments          ProcessAssessment[]
  checklists           ComplianceChecklist[]
  @@map("process_areas")
}

model SpaceProcessArea {
  spaceId      String
  space        Space        @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  processCode  String
  processArea  ProcessArea  @relation(fields: [processCode], references: [code])
  isApplicable Boolean      @default(true)
  notes        String?
  @@id([spaceId, processCode])
  @@map("space_process_areas")
}

model AspiceDeliverable {
  id          String   @id @default(uuid())
  processCode String
  processArea ProcessArea @relation(fields: [processCode], references: [code])
  name        String
  shortName   String?
  description String?
  isMandatory Boolean  @default(true)
  templateId  String?
  template    PageTemplate? @relation(fields: [templateId], references: [id])
  sortOrder   Int      @default(0)
  projectDeliverables ProjectDeliverable[]
  @@map("aspice_deliverables")
}

model ProjectDeliverable {
  id             String   @id @default(uuid())
  spaceId        String
  space          Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  deliverableId  String
  deliverable    AspiceDeliverable @relation(fields: [deliverableId], references: [id])
  workItemId     String?
  workItem       WorkItem? @relation(fields: [workItemId], references: [id])
  status         String   @default("not_started")
  assignedToId   String?
  assignedTo     User?    @relation(fields: [assignedToId], references: [id])
  dueDate        DateTime?
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  versions       DeliverableVersion[]
  @@unique([spaceId, deliverableId])
  @@map("project_deliverables")
}

model DeliverableVersion {
  id                    String   @id @default(uuid())
  projectDeliverableId  String
  projectDeliverable    ProjectDeliverable @relation(fields: [projectDeliverableId], references: [id], onDelete: Cascade)
  workItemVersionId     String?
  workItemVersion       WorkItemVersion? @relation(fields: [workItemVersionId], references: [id])
  baselineId            String?
  baseline              Baseline? @relation(fields: [baselineId], references: [id])
  versionLabel          String?
  isReleased            Boolean  @default(false)
  createdAt             DateTime @default(now())
  @@map("deliverable_versions")
}

model ProcessAssessment {
  id             String   @id @default(uuid())
  spaceId        String
  space          Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  processCode    String
  processArea    ProcessArea @relation(fields: [processCode], references: [code])
  capabilityLevel Int
  assessmentDate DateTime
  assessorId     String?
  assessor       User?    @relation(fields: [assessorId], references: [id])
  evidenceItems  String[]
  notes          String?
  createdAt      DateTime @default(now())
  @@map("process_assessments")
}

model ComplianceChecklist {
  id          String   @id @default(uuid())
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  processCode String
  processArea ProcessArea @relation(fields: [processCode], references: [code])
  itemName    String
  description String?
  isRequired  Boolean  @default(true)
  status      String   @default("not_started")
  evidenceId  String?
  evidence    AuditLog? @relation(fields: [evidenceId], references: [id])
  assignedToId String?
  assignedTo  User?    @relation(fields: [assignedToId], references: [id])
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  @@index([spaceId])
  @@index([processCode])
  @@map("compliance_checklists")
}

// ═══════════════════════════════════════════
// 12. Agile
// ═══════════════════════════════════════════

model Board {
  id           String   @id @default(uuid())
  spaceId      String
  space        Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name         String
  boardType    String
  filterJql    String?
  columnConfig Json     @default("{}")
  settings     Json     @default("{}")
  createdById  String?
  createdBy    User?    @relation(fields: [createdById], references: [id])
  createdAt    DateTime @default(now())
  sprints      Sprint[]
  @@map("boards")
}

model Sprint {
  id          String   @id @default(uuid())
  boardId     String
  board       Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  name        String
  goal        String?
  state       String   @default("future")
  startDate   DateTime?
  endDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  items       SprintItem[]
  @@map("sprints")
}

model SprintItem {
  sprintId    String
  sprint      Sprint   @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  workItemId  String
  workItem    WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  addedAt     DateTime @default(now())
  addedById   String?
  addedBy     User?    @relation("addedBy", fields: [addedById], references: [id])
  @@id([sprintId, workItemId])
  @@map("sprint_items")
}

model BacklogRanking {
  workItemId String   @id
  workItem   WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  spaceId    String
  space      Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  rank       String
  updatedAt  DateTime @updatedAt
  @@index([spaceId, rank])
  @@map("backlog_ranking")
}

// ═══════════════════════════════════════════
// Stakeholders, Invitations, NDA
// ═══════════════════════════════════════════

model StakeholderType {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  isInternal  Boolean  @default(false)
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  profiles    UserStakeholderProfile[]
  policies    StakeholderAccessPolicy[]
  spaceAccess SpaceStakeholderAccess[]
  invitations Invitation[]
  @@map("stakeholder_types")
}

model ExternalOrganization {
  id            String   @id @default(uuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name          String
  orgType       String
  domain        String?
  contactEmail  String?
  contactPhone  String?
  address       String?
  hasNda        Boolean  @default(false)
  ndaSignedAt   DateTime?
  ndaDocumentId String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  profiles      UserStakeholderProfile[]
  spaceAccess   SpaceStakeholderAccess[]
  ndaSignatures NdaSignature[]
  @@map("external_organizations")
}

model UserStakeholderProfile {
  userId            String   @id
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stakeholderTypeId String
  stakeholderType   StakeholderType @relation(fields: [stakeholderTypeId], references: [id])
  externalOrgId     String?
  externalOrg       ExternalOrganization? @relation(fields: [externalOrgId], references: [id])
  contractStart     DateTime?
  contractEnd       DateTime?
  isTemporary       Boolean  @default(false)
  allowedSpaces     String[]
  restrictedSpaces  String[]
  createdAt         DateTime @default(now())
  @@map("user_stakeholder_profiles")
}

model StakeholderAccessPolicy {
  id                       String   @id @default(uuid())
  stakeholderTypeId        String
  stakeholderType          StakeholderType @relation(fields: [stakeholderTypeId], references: [id])
  orgId                    String?
  org                      Organization? @relation(fields: [orgId], references: [id])
  scope                    String
  allowedActions           String[]
  deniedActions            String[]
  dataFilter               Json     @default("{}")
  documentAccess           String   @default("released_only")
  requireNda               Boolean  @default(false)
  requireApprovalForAccess Boolean  @default(false)
  createdAt                DateTime @default(now())
  @@unique([stakeholderTypeId, orgId])
  @@map("stakeholder_access_policies")
}

model SpaceStakeholderAccess {
  id                   String   @id @default(uuid())
  spaceId              String
  space                Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  stakeholderTypeId    String
  stakeholderType      StakeholderType @relation(fields: [stakeholderTypeId], references: [id])
  externalOrgId        String?
  externalOrg          ExternalOrganization? @relation(fields: [externalOrgId], references: [id])
  allowedWorkItemTypes String[]
  allowedStatuses      String[]
  allowedLabels        String[]
  deniedLabels         String[]
  dataFilter           Json     @default("{}")
  accessStart          DateTime @default(now())
  accessEnd            DateTime?
  grantedById          String?
  grantedBy            User?    @relation(fields: [grantedById], references: [id])
  grantedAt            DateTime @default(now())
  isActive             Boolean  @default(true)
  @@unique([spaceId, stakeholderTypeId, externalOrgId])
  @@map("space_stakeholder_access")
}

model Invitation {
  id                String   @id @default(uuid())
  orgId             String
  org               Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  email             String
  stakeholderTypeId String?
  stakeholderType   StakeholderType? @relation(fields: [stakeholderTypeId], references: [id])
  externalOrgId     String?
  externalOrg       ExternalOrganization? @relation(fields: [externalOrgId], references: [id])
  allowedSpaces     String[]
  dataFilter        Json     @default("{}")
  contractEnd       DateTime?
  token             String   @unique
  expiresAt         DateTime
  status            String   @default("pending")
  invitedById       String?
  invitedBy         User?    @relation("invitedBy", fields: [invitedById], references: [id])
  acceptedById      String?
  acceptedBy        User?    @relation("acceptedBy", fields: [acceptedById], references: [id])
  acceptedAt        DateTime?
  createdAt         DateTime @default(now())
  @@index([token])
  @@index([email])
  @@index([status])
  @@map("invitations")
}

model RegistrationRequest {
  id                    String   @id @default(uuid())
  orgId                 String
  org                   Organization @relation(fields: [orgId], references: [id])
  email                 String
  displayName           String
  requestedRole         String?
  reason                String?
  verificationToken     String?  @unique
  verificationExpiresAt DateTime?
  isEmailVerified       Boolean  @default(false)
  status                String   @default("pending")
  reviewedById          String?
  reviewedBy            User?    @relation("reviewedBy", fields: [reviewedById], references: [id])
  reviewedAt            DateTime?
  reviewComment         String?
  ipAddress             String?
  userAgent             String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  @@map("registration_requests")
}

model ApprovalAuditLog {
  id            String   @id @default(uuid())
  action        String
  targetUserId  String
  targetUser    User     @relation("targetUser", fields: [targetUserId], references: [id])
  performedById String
  performedBy   User     @relation("performer", fields: [performedById], references: [id])
  oldStatus     String?
  newStatus     String?
  roleId        String?
  role          Role?    @relation(fields: [roleId], references: [id])
  comment       String?
  ipAddress     String?
  createdAt     DateTime @default(now())
  @@map("approval_audit_log")
}

model SystemSetting {
  id          String   @id @default(uuid())
  orgId       String?
  org         Organization? @relation(fields: [orgId], references: [id])
  key         String
  value       Json
  description String?
  updatedById String?
  updatedBy   User?    @relation(fields: [updatedById], references: [id])
  updatedAt   DateTime @default(now())
  @@unique([orgId, key])
  @@map("system_settings")
}

model SystemAuditLog {
  id          String   @id @default(uuid())
  orgId       String?
  org         Organization? @relation(fields: [orgId], references: [id])
  action      String
  entityType  String
  entityId    String?
  actorId     String?
  actor       User?    @relation(fields: [actorId], references: [id])
  actorIp     String?
  details     Json     @default("{}")
  createdAt   DateTime @default(now())
  @@map("system_audit_log")
}

model ApiKey {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orgId      String
  org        Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name       String
  keyHash    String   @unique
  keyPrefix  String
  scopes     String[]
  expiresAt  DateTime?
  lastUsedAt DateTime?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  @@index([userId])
  @@index([keyHash])
  @@map("api_keys")
}

model McpSession {
  id               String   @id @default(uuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionToken     String   @unique
  clientName       String?
  clientVersion    String?
  ipAddress        String?
  connectedAt      DateTime @default(now())
  lastActivityAt   DateTime @default(now())
  disconnectedAt   DateTime?
  @@map("mcp_sessions")
}

model Webhook {
  id          String   @id @default(uuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  spaceId     String?
  space       Space?   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  name        String
  url         String
  secret      String?
  events      String[]
  isActive    Boolean  @default(true)
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  deliveries  WebhookDelivery[]
  @@map("webhooks")
}

model WebhookDelivery {
  id             String   @id @default(uuid())
  webhookId      String
  webhook        Webhook  @relation(fields: [webhookId], references: [id], onDelete: Cascade)
  eventType      String
  payload        Json
  responseStatus Int?
  responseBody   String?
  deliveredAt    DateTime?
  retryCount     Int      @default(0)
  nextRetryAt    DateTime?
  status         String   @default("pending")
  createdAt      DateTime @default(now())
  @@map("webhook_deliveries")
}

model NdaDocument {
  id            String   @id @default(uuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  title         String
  version       String
  content       String
  effectiveDate DateTime?
  expiryDate    DateTime?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  signatures    NdaSignature[]
  @@map("nda_documents")
}

model NdaSignature {
  id             String   @id @default(uuid())
  ndaDocumentId  String
  ndaDocument    NdaDocument @relation(fields: [ndaDocumentId], references: [id])
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  externalOrgId  String?
  externalOrg    ExternalOrganization? @relation(fields: [externalOrgId], references: [id])
  signature      String
  signatureMethod String
  ipAddress      String?
  signedAt       DateTime @default(now())
  auditLogId     String?
  auditLog       AuditLog? @relation(fields: [auditLogId], references: [id])
  @@unique([ndaDocumentId, userId])
  @@map("nda_signatures")
}

model UrlSlug {
  id         String   @id @default(uuid())
  entityType String
  entityId   String
  slug       String
  isPrimary  Boolean  @default(true)
  redirectTo String?
  createdAt  DateTime @default(now())
  @@unique([entityType, slug])
  @@index([entityType, entityId])
  @@map("url_slugs")
}

model UrlAccessLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  url         String
  spaceKey    String?
  entityType  String?
  entityId    String?
  ipAddress   String?
  userAgent   String?
  accessedAt  DateTime @default(now())
  @@index([spaceKey, accessedAt(sort: Desc)])
  @@map("url_access_log")
}

model SpaceDailyMetric {
  spaceId              String
  space                Space   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  metricDate           DateTime @db.Date
  totalItems           Int     @default(0)
  openItems            Int     @default(0)
  inProgressItems      Int     @default(0)
  doneItems            Int     @default(0)
  openDefects          Int     @default(0)
  criticalDefects      Int     @default(0)
  traceCoveragePercent Decimal @default(0) @db.Decimal(5,2)
  suspectLinksCount    Int     @default(0)
  testPassRate         Decimal @default(0) @db.Decimal(5,2)
  testExecutionCount   Int     @default(0)
  @@id([spaceId, metricDate])
  @@map("space_daily_metrics")
}

model ProjectTemplate {
  id                    String   @id @default(uuid())
  name                  String
  description           String?
  aspiceLevel           String
  automotiveDomain      String?
  processCodes          String[]
  workflowTemplateIds   String[]
  pageTemplateIds       String[]
  defaultRoles          Json     @default("[]")
  isSystem              Boolean  @default(false)
  createdAt             DateTime @default(now())
  spaces                SpaceTemplateApplied[]
  @@map("project_templates")
}

model SpaceTemplateApplied {
  spaceId     String
  space       Space           @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  templateId  String
  template    ProjectTemplate @relation(fields: [templateId], references: [id])
  appliedAt   DateTime        @default(now())
  appliedById String?
  appliedBy   User?           @relation(fields: [appliedById], references: [id])
  @@id([spaceId, templateId])
  @@map("space_template_applied")
}

model SharedComponent {
  id            String   @id @default(uuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name          String
  description   String?
  componentType String?
  version       String?
  ownerSpaceId  String?
  ownerSpace    Space?   @relation(fields: [ownerSpaceId], references: [id])
  createdAt     DateTime @default(now())
  usages        ComponentUsage[]
  @@map("shared_components")
}

model ComponentUsage {
  componentId String
  component   SharedComponent @relation(fields: [componentId], references: [id], onDelete: Cascade)
  spaceId     String
  space       Space          @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  usedVersion String?
  addedAt     DateTime       @default(now())
  @@id([componentId, spaceId])
  @@map("component_usage")
}

model RoleResponsibility {
  id             String   @id @default(uuid())
  roleId         String
  role           Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  spaceId        String
  space          Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  aspiceProcess  String?
  responsibility String
  isPrimary      Boolean  @default(false)
  createdAt      DateTime @default(now())
  @@unique([roleId, spaceId, aspiceProcess])
  @@map("role_responsibilities")
}

model CrossProjectLink {
  id          String   @id @default(uuid())
  fromSpaceId String
  fromSpace   Space    @relation("fromSpace", fields: [fromSpaceId], references: [id], onDelete: Cascade)
  fromType    String
  fromId      String
  toSpaceId   String
  toSpace     Space    @relation("toSpace", fields: [toSpaceId], references: [id], onDelete: Cascade)
  toType      String
  toId        String
  linkType    String
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  @@map("cross_project_links")
}
```

---

## 2. 모듈별 구현 명세 (Just Enough)

### Module: Spaces
- **FR**: FR-SPACE-001~006
- **API**: GET/POST/PUT/DELETE /spaces, GET/POST/DELETE /spaces/:key/members, GET/PUT /spaces/:key/settings
- **Model**: Space, SpaceMember, SpaceSettings, Component, Label, Version
- **Rules**: 키 2~10자 영문대문자+숫자, 고유. 생성 시 자동 프로비저닝 (SpaceProcessArea, Workflow×6, PageTemplate×5, Role×6, HomePage, SpaceSettings). 멤버 추가 시 audit log. 아카이브 시 수정 불가.
- **Deps**: PrismaService, AuthService, AuditService, TemplateService
- **AC**: [ ] 워크플로우 6개 자동 생성 [ ] 역할 6개 자동 생성 [ ] 멤버 추가 시 audit log [ ] 권한 없으면 403

### Module: WorkItems
- **FR**: FR-WI-001~008
- **API**: GET/POST/PUT/DELETE /spaces/:key/issues, POST /spaces/:key/issues/:key/transitions, POST /spaces/:key/issues/:key/comments, POST /spaces/:key/issue-links
- **Model**: WorkItem, WorkItemLink, WorkItemVersion, WorkItemWatcher, CustomFieldDef, CustomFieldValue, WorkItemDependency
- **Rules**: 키 자동 생성 ({SPACE}-{순번}). 상태 전이 시 조건 체크. 전이 시 사후 액션. 수정 시 버전+Suspect Link. 삭제 시 cascade. Meilisearch 비동기 인덱싱.
- **Deps**: PrismaService, SpaceService, WorkflowService, TraceabilityService, AuditService, SearchService, NotificationService
- **AC**: [ ] 키 자동 생성 [ ] 조건 체크 [ ] 사후 액션 [ ] 버전 히스토리 [ ] Suspect Link [ ] cascade 삭제

### Module: Documents
- **FR**: FR-DOC-001~010
- **API**: GET/POST/PUT/DELETE /spaces/:key/docs, GET /spaces/:key/docs/:id/versions, GET/POST /spaces/:key/docs/:id/comments
- **Model**: Page, PageTemplate, PageVersion, Comment, CommentReaction, Attachment, Favorite
- **Rules**: WorkItem(type=page)으로 저장. 저장 시 버전 자동 생성. 수정 시 Suspect Link. 댓글 스레드. 인라인 댓글 (anchor). TOC 자동 생성. Mermaid 렌더링. 페이지 잠금.
- **Deps**: PrismaService, WorkItemService, TraceabilityService, AuditService, UploadService
- **AC**: [ ] TipTap 에디터 [ ] 버전 히스토리 [ ] Suspect Link [ ] 인라인 댓글 [ ] Mermaid [ ] TOC

### Module: Traceability
- **FR**: FR-TRACE-001~006
- **API**: GET /spaces/:key/trace, GET /spaces/:key/trace/coverage, GET /spaces/:key/trace/suspect, POST/DELETE /spaces/:key/trace/links, POST /spaces/:key/trace/suspect/:id/resolve
- **Model**: TraceLink, SuspectLink, TraceMatrixSnapshot, CoverageReport
- **Rules**: 양방향 링크 자동 생성. 링크 타입: verifies, satisfies, implements, tests, derives, refines, traces_to. 항목 수정 시 isSuspect=TRUE. 커버리지: (커버/전체)×100. Suspect 해결: verified, updated, waived.
- **Deps**: PrismaService, WorkItemService, SpaceService, AuditService, NotificationService
- **AC**: [ ] 양방향 링크 [ ] Suspect 자동 생성 [ ] 커버리지 계산 [ ] 매트릭스 UI [ ] Suspect 해결

### Module: Workflows
- **FR**: FR-WF-001~007
- **API**: GET/POST/PUT /spaces/:key/workflows, POST /spaces/:key/workflows/:id/states, POST /spaces/:key/workflows/:id/transitions, GET/POST /spaces/:key/reviews, POST /spaces/:key/reviews/:id/findings, POST /spaces/:key/approvals
- **Model**: Workflow, WorkflowState, WorkflowTransition, WorkflowTransitionHistory, Review, ReviewParticipant, ReviewFinding, Approval, ElectronicSignature
- **Rules**: 조건 체크 (역할, 필드, 승인 수). 사후 액션 (알림, 링크, 필드). Finding → Defect 자동 생성. 전자 서명 (password/certificate/sso/drawn). Kanban/Scrum 보드.
- **Deps**: PrismaService, WorkItemService, SpaceService, NotificationService, TraceabilityService, AuditService
- **AC**: [ ] 조건 체크 [ ] 사후 액션 [ ] 리뷰 [ ] Finding→Defect [ ] 전자 서명 [ ] Kanban 보드

### Module: Compliance
- **FR**: FR-COMPLIANCE-001~005
- **API**: GET /spaces/:key/compliance, GET /spaces/:key/compliance/:processCode, PUT /spaces/:key/compliance/:processCode/checklists/:id, POST /spaces/:key/compliance/assessments, GET/PUT /spaces/:key/deliverables
- **Model**: ProcessArea, SpaceProcessArea, AspiceDeliverable, ProjectDeliverable, DeliverableVersion, ProcessAssessment, ComplianceChecklist
- **Rules**: 프로젝트 생성 시 SpaceProcessArea 자동. 산출물 상태: not_started→in_progress→in_review→approved→released. 체크리스트: not_started→in_progress→completed→not_applicable. 커버리지: (완료/전체)×100. 증적: Audit Log → EvidenceLink.
- **Deps**: PrismaService, SpaceService, WorkItemService, AuditService
- **AC**: [ ] 프로세스별 완료율 [ ] 체크리스트 상태 [ ] 산출물 관리 [ ] 프로세스 평가 [ ] 증적 수집

### Module: Search
- **FR**: FR-SEARCH-001~006
- **API**: GET /search, GET /search/suggest, POST /search/index, DELETE /search/index/:id
- **Model**: (Meilisearch 인덱스, Prisma 모델 없음)
- **Rules**: Work Item CRUD 시 비동기 인덱싱. 타이포 허용 (fuzziness: AUTO). 하이라이팅. 필터: spaceKey, status, priority, aspiceProcess, asilLevel, type. 자동완성: prefix, 5개.
- **Deps**: Meilisearch Client, WorkItemService
- **AC**: [ ] 전문 검색 [ ] 타이포 허용 [ ] 필터 [ ] 자동완성 [ ] 하이라이팅

### Module: MCP
- **FR**: FR-MCP-001~007
- **API**: GET /mcp/sse (SSE), POST /mcp/message (JSON-RPC)
- **Model**: ApiKey, McpSession
- **Rules**: SSE 연결 → JSON-RPC 메시지 교환. 인증: Bearer JWT 또는 X-MCP-API-Key. 권한: 스코프 기반. 모든 tool call → Audit Log. Rate Limiting: 60/min. 20+ 도구.
- **Deps**: 모든 서비스 (Tool Registry)
- **AC**: [ ] SSE 연결 [ ] JSON-RPC [ ] 20+ 도구 [ ] API Key 인증 [ ] Audit Log

### Module: Upload
- **FR**: FR-UPLOAD-001~006
- **API**: POST /upload, GET/DELETE /attachments/:id, GET /attachments/:id/download, GET /attachments/:id/thumbnail
- **Model**: Attachment
- **Rules**: 허용 MIME 화이트리스트. 50MB 제한. Magic Number 검증. 이미지 → 썸네일 (200x200 WebP). 경로: {type}/{id}/{timestamp}_{filename}.
- **Deps**: MinIO (S3 SDK), PrismaService, ThumbnailService (Sharp)
- **AC**: [ ] 파일 업로드 [ ] MIME 검증 [ ] Magic Number [ ] 썸네일 [ ] 크기 제한

### Module: Export
- **FR**: FR-EXPORT-001~007
- **API**: GET /export/documents/:id/word, GET /export/documents/:id/pdf, GET /export/spaces/:key/traceability/excel, GET /export/spaces/:key/issues/excel
- **Model**: (Export 결과 → MinIO 저장)
- **Rules**: Word: TipTap JSON → docx. PDF: HTML → PDF (Puppeteer) + 워터마크. Excel: 추적성 매트릭스, 이슈 목록. HTML: 정적 페이지. Export 파일 MinIO 저장.
- **Deps**: DocumentService, TraceabilityService, SpaceService, MinIO
- **AC**: [ ] Word export [ ] PDF export (워터마크) [ ] Excel export [ ] HTML export

### Module: Stakeholders
- **FR**: FR-STAKE-001~008
- **API**: GET/POST /admin/stakeholders/types, PUT /admin/stakeholders/types/:id/policy, GET/POST /admin/stakeholders/organizations, POST /admin/stakeholders/invitations, GET /portal/:spaceKey, GET /portal/:spaceKey/docs
- **Model**: StakeholderType, ExternalOrganization, UserStakeholderProfile, StakeholderAccessPolicy, SpaceStakeholderAccess, Invitation, RegistrationRequest, NdaDocument, NdaSignature
- **Rules**: 내부: 회사 도메인 → 자동 승인. 외부: 비회사 → 관리자 승인. 접근 정책: 허용 액션, 문서 범위, 데이터 필터. 프로젝트별 접근: allowedSpaces, restrictedSpaces. NDA: 서명 전 차단. 포털: 릴리스된 문서만.
- **Deps**: PrismaService, SpaceService, AuthService, NotificationService
- **AC**: [ ] 유형 CRUD [ ] 접근 정책 [ ] 초대 [ ] 포털 [ ] NDA

### Module: Notifications
- **FR**: FR-NOTIF-001~005
- **API**: GET /notifications, PUT /notifications/:id/read, PUT /notifications/read-all, GET/PUT /notifications/preferences
- **Model**: Notification, NotificationPreference
- **Rules**: WebSocket 실시간. 이메일: Bull Queue + Redis. @멘션: 댓글 파싱. 알림 설정: 유형별 on/off. 30일 보관.
- **Deps**: PrismaService, WebSocketGateway, EmailService (Bull), UserService
- **AC**: [ ] WebSocket [ ] 이메일 [ ] @멘션 [ ] 설정 [ ] 이력

### Module: Git/CI
- **FR**: FR-GIT-001~005
- **API**: POST /git/webhook, GET/POST/DELETE /git/connections
- **Model**: (Webhook, WebhookDelivery)
- **Rules**: 스마트 커밋: #done, #comment, #time. PR → 이슈 자동 링크. CI/CD → 상태 업데이트 + 결함 생성. Webhook HMAC 검증.
- **Deps**: WorkItemService, WorkflowService, CommentService, DefectService
- **AC**: [ ] OAuth 연동 [ ] 스마트 커밋 [ ] PR 링크 [ ] CI/CD [ ] HMAC 검증

### Module: Auth
- **FR**: FR-AUTH-001~010
- **API**: POST /auth/login, POST /auth/register, GET /auth/verify-email, POST /auth/refresh, POST /auth/logout, GET /auth/me
- **Model**: User, UserIdentity, UserSession, Role, Permission, RolePermission, UserRole, RegistrationRequest, ApprovalAuditLog
- **Rules**: 내부: 회사 도메인 → 자동 승인. 외부: 비회사 → 관리자 승인. Keycloak SSO. 2FA. LDAP. 슈퍼관리자: 시스템 설정, 전체 감사 로그.
- **Deps**: KeycloakService, PrismaService, NotificationService
- **AC**: [ ] 내부 자동 승인 [ ] 외부 승인 대기 [ ] Keycloak SSO [ ] 2FA [ ] LDAP [ ] 슈퍼관리자

### Module: Health
- **FR**: (비기능)
- **API**: GET /health, GET /health/ready
- **Model**: (없음)
- **Rules**: DB, Redis, Meilisearch, Keycloak, MinIO 연결 상태 확인. Docker/Kubernetes liveness probe.
- **Deps**: PrismaService, Redis, Meilisearch, Keycloak, MinIO
- **AC**: [ ] 모든 서비스 상태 확인 [ ] 200/503 응답

---

## 3. 구현 순서 (Dependency Order)

```
Level 0 (의존성 없음): Health, Auth
Level 1 (Auth 의존): Spaces, Users, Roles
Level 2 (Spaces 의존): WorkItems, Documents, Workflows
Level 3 (WorkItems 의존): Requirements, Tests, Traceability
Level 4 (Traceability 의존): Compliance, Baseline, Export
Level 5 (모든 모듈 의존): MCP, Search, Notifications
Level 6 (외부 연동): Git/CI, Stakeholders, Mobile

병렬 구현 가능:
  Stream A: Auth → Spaces → WorkItems → Traceability → Compliance
  Stream B: Requirements → Tests (WorkItems 의존)
  Stream C: Documents (WorkItems 의존)
  Stream D: Workflows (Spaces 의존)
  Stream E: Search + Notifications + Upload (독립)
  Stream F: MCP + Export (모든 모듈 의존)
  Stream G: Stakeholders + Git (Spaces + WorkItems 의존)
```

---

## 4. AI 구현 프롬프트 (모듈별)

### Step 1: 인프라
```
"Docker Compose를 작성해줘. 서비스: PostgreSQL 16, Redis 7, Meilisearch v1.6, MinIO, Keycloak 24, Caddy. OCI 무료 티어 호환. .env에서 환경변수 읽기. Health Check 설정. 볼륨 영속화."
```

### Step 2: Prisma Schema
```
"db/schema/*.sql의 12개 SQL 파일을 Prisma schema.prisma로 변환해줘. 50+ 모델, 관계, 인덱스 포함. PostgreSQL provider. UUID/DateTime 기본값."
```

### Step 3: NestJS 프로젝트
```
"NestJS 프로젝트를 생성하고 다음 모듈 구조를 만들어줘: common (filters, guards, interceptors, decorators), modules (auth, spaces, work-items, documents, requirements, tests, traceability, compliance, workflows, notifications, search, mcp, upload, export, stakeholders, git, health). PrismaService, KeycloakService. ESLint + Prettier + Husky. Health Check + Winston."
```

### Step 4: 모듈 구현 (각 모듈별)
```
"[Module]Service를 구현해줘. Just Enough Spec의 [Module] 섹션 참조.
- CRUD + 비즈니스 로직
- Prisma 쿼리 (include/select 최적화)
- 에러 처리 (ErrorCodes)
- Unit Test (Jest, Mock Prisma)
- API 엔드포인트 (Controller)
- DTO (class-validator)"
```

### Step 5: Frontend
```
"React + Vite 프로젝트를 생성하고 다음을 구현해줘:
- 라우팅 (React Router v6, 중첩 라우팅)
- Keycloak 연동 (keycloak-js)
- Zustand (auth, space, ui)
- API 클라이언트 (axios + interceptor)
- shadcn/ui + Tailwind
- i18n (react-i18next)
- 페이지: Login, Dashboard, Spaces, Issues, Documents, Traceability, Compliance"
```

---

**이 Just Enough Spec을 기반으로 개발을 시작할 수 있습니다. Step 1 (Docker Compose + 인프라)부터 시작하시겠어요?**