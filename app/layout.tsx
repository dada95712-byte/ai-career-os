import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'AI Career OS — 台灣職涯作業系統',
  description: '以 AI 驅動的職涯規劃平台，協助台灣求職者履歷優化、職缺配對、面試準備與薪資查詢。',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="zh-TW" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 font-sans">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
