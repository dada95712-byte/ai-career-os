-- AlterTable
ALTER TABLE "profile_education" ADD COLUMN     "schoolNameEn" TEXT;

-- AlterTable
ALTER TABLE "profile_experience" ADD COLUMN     "companyEn" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "profile_internship" ADD COLUMN     "companyEn" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "profile_project" ADD COLUMN     "projectNameEn" TEXT,
ADD COLUMN     "roleEn" TEXT;
