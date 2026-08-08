import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

interface JournalEntryIn {
  id: string
  title: string
  company: string
  jobTitle?: string
  date: string
  template: 'star' | 'free' | 'ai'
  situation?: string
  task?: string
  action?: string
  result?: string
  content?: string
  tags: string[]
  images: unknown[]
}

function toEntry(e: {
  id: string; title: string; company: string | null; jobTitle: string | null; date: Date
  template: string; situation: string | null; task: string | null; action: string | null
  result: string | null; content: string | null; tags: unknown; images: unknown; createdAt: Date
}) {
  return {
    id: e.id, title: e.title, company: e.company ?? '', jobTitle: e.jobTitle ?? '',
    date: e.date.toISOString().slice(0, 10),
    template: e.template as 'star' | 'free' | 'ai',
    situation: e.situation ?? '', task: e.task ?? '', action: e.action ?? '', result: e.result ?? '',
    content: e.content ?? '',
    tags: (e.tags as string[] | null) ?? [],
    images: (e.images as unknown[] | null) ?? [],
    createdAt: e.createdAt.toISOString(),
  }
}

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const entries = await prisma.workJournal.findMany({ where: { userId }, orderBy: { date: 'desc' } })
  return NextResponse.json({ entries: entries.map(toEntry) })
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const { entries } = await req.json() as { entries: JournalEntryIn[] }

  const owned = await prisma.workJournal.findMany({ where: { userId }, select: { id: true } })
  const ownedIds = new Set(owned.map((e) => e.id))
  const keepIds = entries.map((e) => e.id).filter((id) => ownedIds.has(id))

  try {
    await prisma.$transaction([
      prisma.workJournal.deleteMany({ where: { userId, id: { notIn: keepIds } } }),
      ...entries.map((e) => {
        const fields = {
          title: e.title, company: e.company || null, jobTitle: e.jobTitle || null,
          date: new Date(e.date), template: e.template,
          situation: e.situation || null, task: e.task || null, action: e.action || null, result: e.result || null,
          content: e.content || null,
          tags: (e.tags ?? []) as Prisma.InputJsonValue, images: (e.images ?? []) as Prisma.InputJsonValue,
        }
        return ownedIds.has(e.id)
          ? prisma.workJournal.update({ where: { id: e.id }, data: fields })
          : prisma.workJournal.create({ data: { userId, ...fields } })
      }),
    ])

    const fresh = await prisma.workJournal.findMany({ where: { userId }, orderBy: { date: 'desc' } })
    return NextResponse.json({ entries: fresh.map(toEntry) })
  } catch (err) {
    console.error('[api/work-journal PUT]', err)
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}
