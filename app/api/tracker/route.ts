import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

interface ApplicationIn {
  id: string
  jobTitle: string
  company: string
  industry?: string
  location?: string
  status: string
  sourcePlatform?: string
  sourceUrl?: string
  salaryMin?: number
  salaryMax?: number
  matchScore?: number
  matchedSkills?: string[]
  missingSkills?: string[]
  matchAnalysis?: unknown
  jdFullText?: string
  deadline?: string
  appliedAt?: string
  hrScreenAt?: string
  managerInterviewAt?: string
  gmInterviewAt?: string
  offerAt?: string
  interviewNotes?: unknown[]
  attachments?: unknown[]
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
  linked_resume_id?: string
}

function toDate(s?: string | null) { return s ? new Date(s) : null }
function toStr(d: Date | null) { return d ? d.toISOString() : undefined }

function toApplication(a: {
  id: string; jobTitle: string; company: string; industry: string | null; location: string | null
  status: string; sourcePlatform: string | null; sourceUrl: string | null
  salaryMin: number | null; salaryMax: number | null; matchScore: number | null
  matchedSkills: unknown; missingSkills: unknown; matchAnalysis: unknown; jdFullText: string | null
  deadline: Date | null; appliedAt: Date | null; hrScreenAt: Date | null
  managerInterviewAt: Date | null; gmInterviewAt: Date | null; offerAt: Date | null
  interviewNotes: unknown; attachments: unknown
  contactName: string | null; contactEmail: string | null; contactPhone: string | null
  notes: string | null; linkedResumeId: string | null; createdAt: Date
}) {
  return {
    id: a.id, jobTitle: a.jobTitle, company: a.company,
    industry: a.industry ?? undefined, location: a.location ?? undefined,
    status: a.status,
    sourcePlatform: a.sourcePlatform ?? undefined, sourceUrl: a.sourceUrl ?? undefined,
    salaryMin: a.salaryMin ?? undefined, salaryMax: a.salaryMax ?? undefined,
    matchScore: a.matchScore ?? undefined,
    matchedSkills: (a.matchedSkills as string[] | null) ?? undefined,
    missingSkills: (a.missingSkills as string[] | null) ?? undefined,
    matchAnalysis: a.matchAnalysis ?? undefined,
    jdFullText: a.jdFullText ?? undefined,
    deadline: toStr(a.deadline), appliedAt: toStr(a.appliedAt),
    hrScreenAt: toStr(a.hrScreenAt), managerInterviewAt: toStr(a.managerInterviewAt),
    gmInterviewAt: toStr(a.gmInterviewAt), offerAt: toStr(a.offerAt),
    interviewNotes: (a.interviewNotes as unknown[] | null) ?? [],
    attachments: (a.attachments as unknown[] | null) ?? [],
    contactName: a.contactName ?? undefined, contactEmail: a.contactEmail ?? undefined,
    contactPhone: a.contactPhone ?? undefined, notes: a.notes ?? undefined,
    linked_resume_id: a.linkedResumeId ?? undefined,
    createdAt: a.createdAt.toISOString(),
  }
}

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const apps = await prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ applications: apps.map(toApplication) })
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const { applications } = await req.json() as { applications: ApplicationIn[] }

  const owned = await prisma.jobApplication.findMany({ where: { userId }, select: { id: true } })
  const ownedIds = new Set(owned.map((a) => a.id))
  const keepIds = applications.map((a) => a.id).filter((id) => ownedIds.has(id))

  try {
    await prisma.$transaction([
      prisma.jobApplication.deleteMany({ where: { userId, id: { notIn: keepIds } } }),
      ...applications.map((a) => {
        const fields = {
          jobTitle: a.jobTitle, company: a.company, industry: a.industry ?? null, location: a.location ?? null,
          status: a.status,
          sourcePlatform: a.sourcePlatform ?? null, sourceUrl: a.sourceUrl ?? null,
          salaryMin: a.salaryMin ?? null, salaryMax: a.salaryMax ?? null,
          matchScore: a.matchScore ?? null,
          matchedSkills: (a.matchedSkills as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
          missingSkills: (a.missingSkills as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
          matchAnalysis: (a.matchAnalysis as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
          jdFullText: a.jdFullText ?? null,
          deadline: toDate(a.deadline), appliedAt: toDate(a.appliedAt),
          hrScreenAt: toDate(a.hrScreenAt), managerInterviewAt: toDate(a.managerInterviewAt),
          gmInterviewAt: toDate(a.gmInterviewAt), offerAt: toDate(a.offerAt),
          interviewNotes: (a.interviewNotes ?? []) as Prisma.InputJsonValue,
          attachments: (a.attachments ?? []) as Prisma.InputJsonValue,
          contactName: a.contactName ?? null, contactEmail: a.contactEmail ?? null, contactPhone: a.contactPhone ?? null,
          notes: a.notes ?? null, linkedResumeId: a.linked_resume_id ?? null,
        }
        return ownedIds.has(a.id)
          ? prisma.jobApplication.update({ where: { id: a.id }, data: fields })
          : prisma.jobApplication.create({ data: { userId, ...fields } })
      }),
    ])

    const fresh = await prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ applications: fresh.map(toApplication) })
  } catch (err) {
    console.error('[api/tracker PUT]', err)
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}
