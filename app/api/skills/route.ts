import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'

interface SkillIn { name: string; category: string }

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const skills = await prisma.skill.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ skills: skills.map((s) => ({ name: s.name, category: s.category ?? '專業技能' })) })
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error
  const userId = session!.user.id as string

  const { skills } = await req.json() as { skills: SkillIn[] }

  try {
    await prisma.$transaction([
      prisma.skill.deleteMany({ where: { userId } }),
      prisma.skill.createMany({
        data: skills.map((s) => ({ userId, name: s.name, category: s.category })),
      }),
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/skills PUT]', err)
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}
