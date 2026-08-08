/*
  Warnings:

  - Added the required column `updatedAt` to the `JobApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Resume` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "gmInterviewAt" TIMESTAMP(3),
ADD COLUMN     "hrScreenAt" TIMESTAMP(3),
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "linkedResumeId" TEXT,
ADD COLUMN     "managerInterviewAt" TIMESTAMP(3),
ADD COLUMN     "matchAnalysis" JSONB,
ADD COLUMN     "matchedSkills" JSONB,
ADD COLUMN     "missingSkills" JSONB,
ADD COLUMN     "offerAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "jdMatchHighlights" JSONB,
ADD COLUMN     "linkedJobCompany" TEXT,
ADD COLUMN     "linkedJobTitle" TEXT,
ADD COLUMN     "resumeType" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WorkJournal" ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]';
