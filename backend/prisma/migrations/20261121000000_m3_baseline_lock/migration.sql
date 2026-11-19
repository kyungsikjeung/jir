-- AlterTable
ALTER TABLE "baselines" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "baselines" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "baselines" ADD COLUMN "lockedById" TEXT;
ALTER TABLE "baselines" ADD COLUMN "lockReason" TEXT;
