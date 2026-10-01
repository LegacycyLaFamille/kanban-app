
-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('VIEWER', 'EDITOR');

-- AlterTable
ALTER TABLE "ProjectInvitation" ADD COLUMN     "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER';

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER';

