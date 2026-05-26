-- Migration: add profile section tables + extend Skill table
-- Apply with: npx prisma migrate deploy

-- ── Extend Skill table ────────────────────────────────────────────────────────

ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "journalFrequency" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "journalIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Index for Skill (may already exist; safe to re-run with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "Skill_userId_idx" ON "Skill"("userId");

-- ── Profile section tables ────────────────────────────────────────────────────

-- 1. profile_basic (one per user)
CREATE TABLE "profile_basic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameZh" TEXT,
    "nameEn" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "websiteUrl" TEXT,
    "summaryZh" TEXT,
    "summaryEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_basic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_basic_userId_key" ON "profile_basic"("userId");
CREATE INDEX "profile_basic_userId_idx" ON "profile_basic"("userId");
ALTER TABLE "profile_basic" ADD CONSTRAINT "profile_basic_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. profile_education
CREATE TABLE "profile_education" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "degree" TEXT,
    "major" TEXT,
    "gpa" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_education_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_education_userId_idx" ON "profile_education"("userId");
ALTER TABLE "profile_education" ADD CONSTRAINT "profile_education_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. profile_experience
CREATE TABLE "profile_experience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_experience_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_experience_userId_idx" ON "profile_experience"("userId");
ALTER TABLE "profile_experience" ADD CONSTRAINT "profile_experience_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. profile_internship
CREATE TABLE "profile_internship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_internship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_internship_userId_idx" ON "profile_internship"("userId");
ALTER TABLE "profile_internship" ADD CONSTRAINT "profile_internship_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. profile_project
CREATE TABLE "profile_project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "role" TEXT,
    "url" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_project_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_project_userId_idx" ON "profile_project"("userId");
ALTER TABLE "profile_project" ADD CONSTRAINT "profile_project_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. profile_language
CREATE TABLE "profile_language" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "proficiency" TEXT NOT NULL DEFAULT 'intermediate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_language_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_language_userId_idx" ON "profile_language"("userId");
ALTER TABLE "profile_language" ADD CONSTRAINT "profile_language_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. profile_skill
CREATE TABLE "profile_skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_skill_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_skill_userId_idx" ON "profile_skill"("userId");
ALTER TABLE "profile_skill" ADD CONSTRAINT "profile_skill_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. profile_certificate
CREATE TABLE "profile_certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issueDate" TEXT,
    "expiryDate" TEXT,
    "credentialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_certificate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_certificate_userId_idx" ON "profile_certificate"("userId");
ALTER TABLE "profile_certificate" ADD CONSTRAINT "profile_certificate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. profile_activity
CREATE TABLE "profile_activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_activity_userId_idx" ON "profile_activity"("userId");
ALTER TABLE "profile_activity" ADD CONSTRAINT "profile_activity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. profile_conference
CREATE TABLE "profile_conference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'attendee',
    "date" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_conference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_conference_userId_idx" ON "profile_conference"("userId");
ALTER TABLE "profile_conference" ADD CONSTRAINT "profile_conference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 11. profile_custom
CREATE TABLE "profile_custom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "content" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_custom_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_custom_userId_idx" ON "profile_custom"("userId");
ALTER TABLE "profile_custom" ADD CONSTRAINT "profile_custom_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. profile_attachment
CREATE TABLE "profile_attachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_attachment_userId_idx" ON "profile_attachment"("userId");
ALTER TABLE "profile_attachment" ADD CONSTRAINT "profile_attachment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
