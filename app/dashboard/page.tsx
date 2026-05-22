import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { DashboardClient } from './client'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const name = session?.user?.name?.split(' ')[0] ?? '求職者'
  return <DashboardClient name={name} />
}
