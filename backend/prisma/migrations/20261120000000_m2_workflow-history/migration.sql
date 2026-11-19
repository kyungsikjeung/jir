-- AlterTable
ALTER TABLE "workflow_transition_history" ADD COLUMN IF NOT EXISTS "transitionId" TEXT;

-- AlterTable
ALTER TABLE "workflow_transition_history" ADD COLUMN IF NOT EXISTS "fromStateId" TEXT;
