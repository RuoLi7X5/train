-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'STUDENTS', 'COMMUNITY');

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'STUDENTS';

-- CreateIndex
CREATE INDEX "Problem_authorId_idx" ON "Problem"("authorId");

-- CreateIndex
CREATE INDEX "Problem_publishAt_idx" ON "Problem"("publishAt");

-- CreateIndex
CREATE INDEX "Problem_date_idx" ON "Problem"("date");

-- CreateIndex
CREATE INDEX "Problem_visibility_idx" ON "Problem"("visibility");

-- CreateIndex
CREATE INDEX "ProblemPush_studentId_status_idx" ON "ProblemPush"("studentId", "status");

-- CreateIndex
CREATE INDEX "ProblemPush_coachId_idx" ON "ProblemPush"("coachId");

-- CreateIndex
CREATE INDEX "ProblemPush_dueAt_idx" ON "ProblemPush"("dueAt");

-- CreateIndex
CREATE INDEX "Submission_userId_problemId_idx" ON "Submission"("userId", "problemId");

-- CreateIndex
CREATE INDEX "Submission_problemId_status_idx" ON "Submission"("problemId", "status");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_coachId_idx" ON "User"("coachId");

-- CreateIndex
CREATE INDEX "User_classId_idx" ON "User"("classId");
