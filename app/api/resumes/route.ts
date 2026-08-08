import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

interface ResumeEntryIn {
  id: string
  name: string
  language: 'zh' | 'en'
  score: number | null
  atsScore: number | null
  scoredAt: string | null
  isPrimary: boolean
  source: 'upload' | 'template' | 'linkedin' | 'manual'
  data: Record<string, unknown>
  resumeType?: 'profile' | 'jd'
  linkedJobCompany?: string
  linkedJobTitle?: string
  jdMatchHighlights?: string[]
}

function toEntry(r: {
  id: string; title: string; language: string; aiScore: number | null; atsScore: number | null
  scoredAt: Date | null; isPrimary: boolean; source: string | null; contentJson: unknown
  resumeType: string | null; linkedJobCompany: string | null; linkedJobTitle: string | null
  jdMatchHighlights: unknown; createdAt: Date; updatedAt: Date
}) {
  return {
    id: r.id,
    name: r.title,
    language: r.language,
    score: r.aiScore,
    atsScore: r.atsScore,
    scoredAt: r.scoredAt?.toISOString() ?? null,
    isPrimary: r.isPrimary,
    source: r.source ?? 'manual',
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    data: (r.contentJson as Record<string, unknown>) ?? {},
    resumeType: r.resumeType ?? undefined,
    linkedJobCompany: r.linkedJobCompany ?? undefined,
    linkedJobTitle: r.linkedJobTitle ?? undefined,
    jdMatchHighlights: (r.jdMatchHighlights as string[] | null) ?? undefined,
  }
}

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const resumes = await prisma.resume.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({ resumes: resumes.map(toEntry) })
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const { resumes } = await req.json() as { resumes: ResumeEntryIn[] }

  const owned = await prisma.resume.findMany({ where: { userId }, select: { id: true } })
  const ownedIds = new Set(owned.map((r) => r.id))
  const keepIds = resumes.map((r) => r.id).filter((id) => ownedIds.has(id))

  try {
    await prisma.$transaction([
      prisma.resume.deleteMany({ where: { userId, id: { notIn: keepIds } } }),
      ...resumes.map((r) => {
        const fields = {
          title: r.name,
          language: r.language,
          aiScore: r.score,
          atsScore: r.atsScore,
          scoredAt: r.scoredAt ? new Date(r.scoredAt) : null,
          isPrimary: r.isPrimary,
          source: r.source,
          contentJson: r.data as Prisma.InputJsonValue,
          rawText: (r.data?.rawText as string) ?? null,
          resumeType: r.resumeType ?? null,
          linkedJobCompany: r.linkedJobCompany ?? null,
          linkedJobTitle: r.linkedJobTitle ?? null,
          jdMatchHighlights: (r.jdMatchHighlights as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        }
        return ownedIds.has(r.id)
          ? prisma.resume.update({ where: { id: r.id }, data: fields })
          : prisma.resume.create({ data: { userId, ...fields } })
      }),
    ])

    const fresh = await prisma.resume.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } })
    return NextResponse.json({ resumes: fresh.map(toEntry) })
  } catch (err) {
    console.error('[api/resumes PUT]', err)
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}
