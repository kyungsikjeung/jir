-- CreateTable
CREATE TABLE "template_packages" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "processes" JSONB NOT NULL DEFAULT '[]',
    "workflows" JSONB NOT NULL DEFAULT '[]',
    "fieldDefinitions" JSONB NOT NULL DEFAULT '[]',
    "deliverables" JSONB NOT NULL DEFAULT '[]',
    "rrDefaults" JSONB NOT NULL DEFAULT '[]',
    "wbsSkeleton" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_packageId_version_key" ON "template_versions"("packageId", "version");

-- CreateTable
CREATE TABLE "process_workspaces" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "processCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isApplicable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "process_workspaces_spaceId_processCode_key" ON "process_workspaces"("spaceId", "processCode");

-- CreateIndex
CREATE INDEX "process_workspaces_spaceId_idx" ON "process_workspaces"("spaceId");

-- CreateTable
CREATE TABLE "process_assignments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "process_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "process_assignments_workspaceId_idx" ON "process_assignments"("workspaceId");

-- CreateIndex
CREATE INDEX "process_assignments_userId_idx" ON "process_assignments"("userId");

-- CreateTable
CREATE TABLE "process_access_grants" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'view',
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "process_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "process_access_grants_workspaceId_idx" ON "process_access_grants"("workspaceId");

-- CreateIndex
CREATE INDEX "process_access_grants_userId_idx" ON "process_access_grants"("userId");

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT,
    "typeId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelKo" TEXT,
    "labelEn" TEXT,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "requiredForApproval" BOOLEAN NOT NULL DEFAULT false,
    "validation" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSoftDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_definitions_spaceId_idx" ON "field_definitions"("spaceId");

-- CreateIndex
CREATE INDEX "field_definitions_typeId_idx" ON "field_definitions"("typeId");

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "oldHash" TEXT,
    "newHash" TEXT,
    "chainHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_actorId_idx" ON "audit_events"("actorId");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- AlterTable
ALTER TABLE "work_items" ADD COLUMN "customFields" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "electronic_signatures" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "electronic_signatures" ADD COLUMN "signedVersionId" TEXT;
ALTER TABLE "electronic_signatures" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'valid';
ALTER TABLE "electronic_signatures" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "electronic_signatures" ADD COLUMN "revokedById" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "chainHash" TEXT NOT NULL DEFAULT '';
