-- CreateEnum
CREATE TYPE "PlacementMode" AS ENUM ('BLACK_ONLY', 'WHITE_ONLY', 'ALTERNATE');

-- CreateEnum
CREATE TYPE "FirstPlayer" AS ENUM ('BLACK', 'WHITE');

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN "boardData" JSONB,
ADD COLUMN "answerMoves" JSONB,
ADD COLUMN "placementMode" "PlacementMode",
ADD COLUMN "firstPlayer" "FirstPlayer";
