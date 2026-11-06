-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'MENTOR', 'UNI_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM', 'UNIVERSITY');

-- CreateEnum
CREATE TYPE "MentoringStatus" AS ENUM ('SEARCHING', 'MATCHED', 'IN_ROOM', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "accessCodeHash" TEXT NOT NULL,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 4,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "universityId" TEXT,
    "career" TEXT,
    "cycle" INTEGER,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "darkMode" BOOLEAN,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "creditsMonth" TEXT,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "streakLast" TEXT,
    "premiumSince" TIMESTAMP(3),
    "premiumRenewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📘',
    "syllabus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rubric" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "covered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "steps" TEXT[],
    "done" BOOLEAN[],
    "rubricHint" TEXT NOT NULL,
    "checkQ" TEXT NOT NULL,
    "checkA" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentoring" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "topic" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "offerPrice" INTEGER NOT NULL DEFAULT 0,
    "finalPrice" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "status" "MentoringStatus" NOT NULL DEFAULT 'SEARCHING',
    "offers" JSONB NOT NULL DEFAULT '[]',
    "mentorId" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Mentoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "mentoringId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DEMO',
    "provider" TEXT NOT NULL DEFAULT 'demo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sprint" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "confirms" BOOLEAN NOT NULL,
    "mentionedPay" BOOLEAN NOT NULL,
    "decision" TEXT NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "test" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "result" TEXT NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketLevel" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MarketLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PrototypeTest" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "friction" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "minutes" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PrototypeTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrototypeChange" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "change" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "priority" TEXT NOT NULL,

    CONSTRAINT "PrototypeChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "University_domain_key" ON "University"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Question_userId_createdAt_idx" ON "Question"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_userId_key" ON "Mentor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_number_key" ON "Interview"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Hypothesis_number_key" ON "Hypothesis"("number");

-- CreateIndex
CREATE UNIQUE INDEX "MarketLevel_level_key" ON "MarketLevel"("level");

-- CreateIndex
CREATE UNIQUE INDEX "PrototypeTest_number_key" ON "PrototypeTest"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PrototypeChange_number_key" ON "PrototypeChange"("number");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentoring" ADD CONSTRAINT "Mentoring_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentoring" ADD CONSTRAINT "Mentoring_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentoring" ADD CONSTRAINT "Mentoring_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_mentoringId_fkey" FOREIGN KEY ("mentoringId") REFERENCES "Mentoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
