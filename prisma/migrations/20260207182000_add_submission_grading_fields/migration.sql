-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "isTimeout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "gradedAt" TIMESTAMP(3),
ADD COLUMN "gradedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
