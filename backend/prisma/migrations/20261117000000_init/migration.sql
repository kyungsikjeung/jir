-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "logoUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "title" TEXT,
    "department" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUid" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "spaceId" TEXT,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "spaceType" TEXT NOT NULL DEFAULT 'software',
    "iconUrl" TEXT,
    "aspiceLevel" TEXT NOT NULL DEFAULT '2',
    "automotiveDomain" TEXT,
    "processProfile" TEXT NOT NULL DEFAULT 'default',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_members" (
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "addedById" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_members_pkey" PRIMARY KEY ("spaceId","userId")
);

-- CreateTable
CREATE TABLE "space_settings" (
    "spaceId" TEXT NOT NULL,
    "defaultPageTemplateId" TEXT,
    "allowAnonymousView" BOOLEAN NOT NULL DEFAULT false,
    "requireApprovalForRelease" BOOLEAN NOT NULL DEFAULT true,
    "minApprovers" INTEGER NOT NULL DEFAULT 1,
    "autoSuspectLinks" BOOLEAN NOT NULL DEFAULT true,
    "requireTraceForRelease" BOOLEAN NOT NULL DEFAULT true,
    "notificationChannels" JSONB NOT NULL DEFAULT '["in_app", "email"]',
    "aspiceLevel" TEXT NOT NULL DEFAULT '2',
    "requireEvidenceForAll" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_settings_pkey" PRIMARY KEY ("spaceId")
);

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leadUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "releaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unreleased',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_item_types" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "hierarchyLevel" INTEGER NOT NULL DEFAULT 0,
    "isSubtask" BOOLEAN NOT NULL DEFAULT false,
    "aspiceProcess" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigneeId" TEXT,
    "reporterId" TEXT,
    "parentId" TEXT,
    "epicId" TEXT,
    "workflowStateId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "body" JSONB,
    "bodyText" TEXT,
    "labels" TEXT[],
    "aspiceProcess" TEXT,
    "asilLevel" TEXT,
    "estimatedHours" DECIMAL(10,2),
    "actualHours" DECIMAL(10,2),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "storyPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_item_links" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_item_versions" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT,
    "body" JSONB,
    "bodyText" TEXT,
    "changedById" TEXT,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_item_watchers" (
    "workItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_item_watchers_pkey" PRIMARY KEY ("workItemId","userId")
);

-- CreateTable
CREATE TABLE "pages" (
    "workItemId" TEXT NOT NULL,
    "parentPageId" TEXT,
    "templateId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isHomepage" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("workItemId")
);

-- CreateTable
CREATE TABLE "page_templates" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "body" JSONB,
    "category" TEXT,
    "aspiceProcess" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "anchor" JSONB,
    "isInline" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reactions" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("commentId","userId","emoji")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "thumbnailPath" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "workItemId" TEXT NOT NULL,
    "reqType" TEXT NOT NULL,
    "asilLevel" TEXT,
    "safetyRelated" BOOLEAN NOT NULL DEFAULT false,
    "rationale" TEXT,
    "acceptanceCriteria" TEXT,
    "verificationMethod" TEXT,
    "derivedFromId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "baselineId" TEXT,
    "externalId" TEXT,
    "externalSource" TEXT,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("workItemId")
);

-- CreateTable
CREATE TABLE "requirement_attributes" (
    "requirementId" TEXT NOT NULL,
    "attrKey" TEXT NOT NULL,
    "attrValue" TEXT,

    CONSTRAINT "requirement_attributes_pkey" PRIMARY KEY ("requirementId","attrKey")
);

-- CreateTable
CREATE TABLE "requirement_relations" (
    "id" TEXT NOT NULL,
    "fromReqId" TEXT NOT NULL,
    "toReqId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "workItemId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "preconditions" TEXT,
    "postconditions" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "automationFramework" TEXT,
    "testEnvironment" TEXT,
    "estimatedDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("workItemId")
);

-- CreateTable
CREATE TABLE "test_suites" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_suites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_suite_cases" (
    "suiteId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "test_suite_cases_pkey" PRIMARY KEY ("suiteId","testCaseId")
);

-- CreateTable
CREATE TABLE "test_runs" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "testSuiteId" TEXT,
    "environment" TEXT,
    "buildVersion" TEXT,
    "baselineId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "assignedToId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "actualResult" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "defectId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_coverage" (
    "testCaseId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "coverageType" TEXT NOT NULL DEFAULT 'verifies',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_coverage_pkey" PRIMARY KEY ("testCaseId","requirementId")
);

-- CreateTable
CREATE TABLE "defects" (
    "workItemId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "defectType" TEXT,
    "foundInVersion" TEXT,
    "foundInEnvironment" TEXT,
    "fixedInVersion" TEXT,
    "rootCause" TEXT,
    "reproductionSteps" TEXT,
    "timeToFixHours" DECIMAL(10,2),
    "safetyImpact" BOOLEAN NOT NULL DEFAULT false,
    "asilLevel" TEXT,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("workItemId")
);

-- CreateTable
CREATE TABLE "trace_links" (
    "id" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baselineId" TEXT,
    "isSuspect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "trace_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspect_links" (
    "id" TEXT NOT NULL,
    "traceLinkId" TEXT NOT NULL,
    "reason" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,

    CONSTRAINT "suspect_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_matrix_snapshots" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "baselineId" TEXT,
    "name" TEXT NOT NULL,
    "matrixData" JSONB NOT NULL,
    "totalRequirements" INTEGER NOT NULL DEFAULT 0,
    "coveredRequirements" INTEGER NOT NULL DEFAULT 0,
    "coveragePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trace_matrix_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_reports" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "baselineId" TEXT,
    "reportType" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "coveredItems" INTEGER NOT NULL,
    "coveragePercent" DECIMAL(5,2) NOT NULL,
    "uncoveredItems" JSONB NOT NULL DEFAULT '[]',
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baselines" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT,
    "baselineType" TEXT NOT NULL DEFAULT 'release',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "snapshotData" JSONB,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baseline_items" (
    "baselineId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemVersion" INTEGER,

    CONSTRAINT "baseline_items_pkey" PRIMARY KEY ("baselineId","itemType","itemId")
);

-- CreateTable
CREATE TABLE "configuration_items" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "ciType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "currentVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "linkedWorkItems" TEXT[],
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuration_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "workItemId" TEXT NOT NULL,
    "crType" TEXT NOT NULL DEFAULT 'standard',
    "impactAnalysis" TEXT,
    "affectedItems" TEXT[],
    "estimatedEffort" INTEGER,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("workItemId")
);

-- CreateTable
CREATE TABLE "change_baseline_impact" (
    "changeRequestId" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "impactLevel" TEXT NOT NULL DEFAULT 'medium',

    CONSTRAINT "change_baseline_impact_pkey" PRIMARY KEY ("changeRequestId","baselineId")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT,
    "releaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'planned',
    "baselineId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "aspiceProcess" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_states" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workflow_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fromStateId" TEXT,
    "toStateId" TEXT NOT NULL,
    "conditionType" TEXT,
    "conditionConfig" JSONB NOT NULL DEFAULT '{}',
    "postActions" JSONB NOT NULL DEFAULT '[]',
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transition_history" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "transitionId" TEXT,
    "fromStateId" TEXT,
    "toStateId" TEXT,
    "performedById" TEXT,
    "comment" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transition_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reviewType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "moderatorId" TEXT,
    "aspiceProcess" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_participants" (
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reviewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decisionAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "review_participants_pkey" PRIMARY KEY ("reviewId","userId")
);

-- CreateTable
CREATE TABLE "review_findings" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "status" TEXT NOT NULL DEFAULT 'open',
    "location" JSONB,
    "defectId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "review_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "signature" TEXT,
    "signatureMethod" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electronic_signatures" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signatureType" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "isEvidence" BOOLEAN NOT NULL DEFAULT true,
    "evidenceTag" TEXT,
    "comment" TEXT,

    CONSTRAINT "electronic_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "diff" JSONB,
    "actorId" TEXT,
    "actorIp" TEXT,
    "actorUserAgent" TEXT,
    "sessionId" TEXT,
    "isEvidence" BOOLEAN NOT NULL DEFAULT false,
    "evidenceTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_links" (
    "id" TEXT NOT NULL,
    "auditLogId" TEXT NOT NULL,
    "aspiceProcess" TEXT NOT NULL,
    "aspiceClause" TEXT,
    "workItemId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTitle" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId","notificationType","channel")
);

-- CreateTable
CREATE TABLE "process_areas" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "parentCode" TEXT,
    "requiredWorkProducts" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "process_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_process_areas" (
    "spaceId" TEXT NOT NULL,
    "processCode" TEXT NOT NULL,
    "isApplicable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "space_process_areas_pkey" PRIMARY KEY ("spaceId","processCode")
);

-- CreateTable
CREATE TABLE "aspice_deliverables" (
    "id" TEXT NOT NULL,
    "processCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "templateId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "aspice_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_deliverables" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "workItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable_versions" (
    "id" TEXT NOT NULL,
    "projectDeliverableId" TEXT NOT NULL,
    "workItemVersionId" TEXT,
    "baselineId" TEXT,
    "versionLabel" TEXT,
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverable_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_assessments" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "processCode" TEXT NOT NULL,
    "capabilityLevel" INTEGER NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL,
    "assessorId" TEXT,
    "evidenceItems" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_checklists" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "processCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "evidenceId" TEXT,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boardType" TEXT NOT NULL,
    "filterJql" TEXT,
    "columnConfig" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "state" TEXT NOT NULL DEFAULT 'future',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_items" (
    "sprintId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT,

    CONSTRAINT "sprint_items_pkey" PRIMARY KEY ("sprintId","workItemId")
);

-- CreateTable
CREATE TABLE "backlog_ranking" (
    "workItemId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_ranking_pkey" PRIMARY KEY ("workItemId")
);

-- CreateTable
CREATE TABLE "stakeholder_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stakeholder_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_organizations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgType" TEXT NOT NULL,
    "domain" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "hasNda" BOOLEAN NOT NULL DEFAULT false,
    "ndaSignedAt" TIMESTAMP(3),
    "ndaDocumentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stakeholder_profiles" (
    "userId" TEXT NOT NULL,
    "stakeholderTypeId" TEXT NOT NULL,
    "externalOrgId" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "allowedSpaces" TEXT[],
    "restrictedSpaces" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stakeholder_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "stakeholder_access_policies" (
    "id" TEXT NOT NULL,
    "stakeholderTypeId" TEXT NOT NULL,
    "orgId" TEXT,
    "scope" TEXT NOT NULL,
    "allowedActions" TEXT[],
    "deniedActions" TEXT[],
    "dataFilter" JSONB NOT NULL DEFAULT '{}',
    "documentAccess" TEXT NOT NULL DEFAULT 'released_only',
    "requireNda" BOOLEAN NOT NULL DEFAULT false,
    "requireApprovalForAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stakeholder_access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_stakeholder_access" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "stakeholderTypeId" TEXT NOT NULL,
    "externalOrgId" TEXT,
    "allowedWorkItemTypes" TEXT[],
    "allowedStatuses" TEXT[],
    "allowedLabels" TEXT[],
    "deniedLabels" TEXT[],
    "dataFilter" JSONB NOT NULL DEFAULT '{}',
    "accessStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessEnd" TIMESTAMP(3),
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "space_stakeholder_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stakeholderTypeId" TEXT,
    "externalOrgId" TEXT,
    "allowedSpaces" TEXT[],
    "dataFilter" JSONB NOT NULL DEFAULT '{}',
    "contractEnd" TIMESTAMP(3),
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedById" TEXT,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "requestedRole" TEXT,
    "reason" TEXT,
    "verificationToken" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "roleId" TEXT,
    "comment" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "clientName" TEXT,
    "clientVersion" TEXT,
    "ipAddress" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "mcp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "spaceId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nda_documents" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nda_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nda_signatures" (
    "id" TEXT NOT NULL,
    "ndaDocumentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalOrgId" TEXT,
    "signature" TEXT NOT NULL,
    "signatureMethod" TEXT NOT NULL,
    "ipAddress" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auditLogId" TEXT,

    CONSTRAINT "nda_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_slugs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "redirectTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_slugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_access_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "spaceKey" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_daily_metrics" (
    "spaceId" TEXT NOT NULL,
    "metricDate" DATE NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "openItems" INTEGER NOT NULL DEFAULT 0,
    "inProgressItems" INTEGER NOT NULL DEFAULT 0,
    "doneItems" INTEGER NOT NULL DEFAULT 0,
    "openDefects" INTEGER NOT NULL DEFAULT 0,
    "criticalDefects" INTEGER NOT NULL DEFAULT 0,
    "traceCoveragePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "suspectLinksCount" INTEGER NOT NULL DEFAULT 0,
    "testPassRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "testExecutionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "space_daily_metrics_pkey" PRIMARY KEY ("spaceId","metricDate")
);

-- CreateTable
CREATE TABLE "project_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "aspiceLevel" TEXT NOT NULL,
    "automotiveDomain" TEXT,
    "processCodes" TEXT[],
    "workflowTemplateIds" TEXT[],
    "pageTemplateIds" TEXT[],
    "defaultRoles" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_template_applied" (
    "spaceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedById" TEXT,

    CONSTRAINT "space_template_applied_pkey" PRIMARY KEY ("spaceId","templateId")
);

-- CreateTable
CREATE TABLE "shared_components" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "componentType" TEXT,
    "version" TEXT,
    "ownerSpaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_usage" (
    "componentId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "usedVersion" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "component_usage_pkey" PRIMARY KEY ("componentId","spaceId")
);

-- CreateTable
CREATE TABLE "role_responsibilities" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "aspiceProcess" TEXT,
    "responsibility" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_project_links" (
    "id" TEXT NOT NULL,
    "fromSpaceId" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toSpaceId" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_project_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_change_history" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "versionFrom" INTEGER NOT NULL,
    "versionTo" INTEGER NOT NULL,
    "changedFields" JSONB,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_providerUid_key" ON "user_identities"("provider", "providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "roles_orgId_name_key" ON "roles"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "spaces_key_key" ON "spaces"("key");

-- CreateIndex
CREATE INDEX "spaces_orgId_idx" ON "spaces"("orgId");

-- CreateIndex
CREATE INDEX "spaces_key_idx" ON "spaces"("key");

-- CreateIndex
CREATE UNIQUE INDEX "components_spaceId_name_key" ON "components"("spaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "labels_spaceId_name_key" ON "labels"("spaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "versions_spaceId_name_key" ON "versions"("spaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "work_item_types_spaceId_name_key" ON "work_item_types"("spaceId", "name");

-- CreateIndex
CREATE INDEX "work_items_spaceId_idx" ON "work_items"("spaceId");

-- CreateIndex
CREATE INDEX "work_items_status_idx" ON "work_items"("status");

-- CreateIndex
CREATE INDEX "work_items_assigneeId_idx" ON "work_items"("assigneeId");

-- CreateIndex
CREATE INDEX "work_items_aspiceProcess_idx" ON "work_items"("aspiceProcess");

-- CreateIndex
CREATE UNIQUE INDEX "work_items_spaceId_key_key" ON "work_items"("spaceId", "key");

-- CreateIndex
CREATE INDEX "work_item_links_fromId_idx" ON "work_item_links"("fromId");

-- CreateIndex
CREATE INDEX "work_item_links_toId_idx" ON "work_item_links"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "work_item_links_fromId_toId_linkType_key" ON "work_item_links"("fromId", "toId", "linkType");

-- CreateIndex
CREATE INDEX "work_item_versions_workItemId_idx" ON "work_item_versions"("workItemId");

-- CreateIndex
CREATE UNIQUE INDEX "work_item_versions_workItemId_version_key" ON "work_item_versions"("workItemId", "version");

-- CreateIndex
CREATE INDEX "comments_targetType_targetId_idx" ON "comments"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "attachments_targetType_targetId_idx" ON "attachments"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_relations_fromReqId_toReqId_relationType_key" ON "requirement_relations"("fromReqId", "toReqId", "relationType");

-- CreateIndex
CREATE INDEX "test_runs_spaceId_idx" ON "test_runs"("spaceId");

-- CreateIndex
CREATE INDEX "test_runs_status_idx" ON "test_runs"("status");

-- CreateIndex
CREATE INDEX "test_results_testRunId_idx" ON "test_results"("testRunId");

-- CreateIndex
CREATE INDEX "test_results_testCaseId_idx" ON "test_results"("testCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "test_results_testRunId_testCaseId_key" ON "test_results"("testRunId", "testCaseId");

-- CreateIndex
CREATE INDEX "trace_links_fromType_fromId_idx" ON "trace_links"("fromType", "fromId");

-- CreateIndex
CREATE INDEX "trace_links_toType_toId_idx" ON "trace_links"("toType", "toId");

-- CreateIndex
CREATE INDEX "trace_links_isSuspect_idx" ON "trace_links"("isSuspect");

-- CreateIndex
CREATE UNIQUE INDEX "trace_links_fromType_fromId_toType_toId_linkType_key" ON "trace_links"("fromType", "fromId", "toType", "toId", "linkType");

-- CreateIndex
CREATE INDEX "baselines_spaceId_idx" ON "baselines"("spaceId");

-- CreateIndex
CREATE INDEX "baselines_status_idx" ON "baselines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "baselines_spaceId_name_key" ON "baselines"("spaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "releases_spaceId_name_key" ON "releases"("spaceId", "name");

-- CreateIndex
CREATE INDEX "workflow_states_workflowId_idx" ON "workflow_states"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_states_workflowId_name_key" ON "workflow_states"("workflowId", "name");

-- CreateIndex
CREATE INDEX "workflow_transitions_workflowId_idx" ON "workflow_transitions"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transitions_workflowId_fromStateId_toStateId_key" ON "workflow_transitions"("workflowId", "fromStateId", "toStateId");

-- CreateIndex
CREATE INDEX "workflow_transition_history_workItemId_idx" ON "workflow_transition_history"("workItemId");

-- CreateIndex
CREATE INDEX "approvals_entityType_entityId_idx" ON "approvals"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_entityType_entityId_approverId_key" ON "approvals"("entityType", "entityId", "approverId");

-- CreateIndex
CREATE UNIQUE INDEX "electronic_signatures_entityType_entityId_signerId_key" ON "electronic_signatures"("entityType", "entityId", "signerId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_isEvidence_idx" ON "audit_logs"("isEvidence");

-- CreateIndex
CREATE INDEX "evidence_links_aspiceProcess_idx" ON "evidence_links"("aspiceProcess");

-- CreateIndex
CREATE INDEX "activity_feed_spaceId_createdAt_idx" ON "activity_feed"("spaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "process_areas_code_key" ON "process_areas"("code");

-- CreateIndex
CREATE UNIQUE INDEX "project_deliverables_spaceId_deliverableId_key" ON "project_deliverables"("spaceId", "deliverableId");

-- CreateIndex
CREATE INDEX "compliance_checklists_spaceId_idx" ON "compliance_checklists"("spaceId");

-- CreateIndex
CREATE INDEX "compliance_checklists_processCode_idx" ON "compliance_checklists"("processCode");

-- CreateIndex
CREATE INDEX "backlog_ranking_spaceId_rank_idx" ON "backlog_ranking"("spaceId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "stakeholder_types_code_key" ON "stakeholder_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stakeholder_access_policies_stakeholderTypeId_orgId_key" ON "stakeholder_access_policies"("stakeholderTypeId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "space_stakeholder_access_spaceId_stakeholderTypeId_external_key" ON "space_stakeholder_access"("spaceId", "stakeholderTypeId", "externalOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_verificationToken_key" ON "registration_requests"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_sessions_sessionToken_key" ON "mcp_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "nda_signatures_ndaDocumentId_userId_key" ON "nda_signatures"("ndaDocumentId", "userId");

-- CreateIndex
CREATE INDEX "url_slugs_entityType_entityId_idx" ON "url_slugs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "url_slugs_entityType_slug_key" ON "url_slugs"("entityType", "slug");

-- CreateIndex
CREATE INDEX "url_access_log_spaceKey_accessedAt_idx" ON "url_access_log"("spaceKey", "accessedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "role_responsibilities_roleId_spaceId_aspiceProcess_key" ON "role_responsibilities"("roleId", "spaceId", "aspiceProcess");
