import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'WorkLog — 求職工具・工作記錄・面試準備',
  description: '一站式求職工具：履歷優化、求職追蹤、面試練習、技能地圖，讓你的求職準備更有系統。',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="zh-TW" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream-100 font-sans text-ink-900">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
