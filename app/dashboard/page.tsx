import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const modules = [
  { href: '/career-profile', icon: '📄', title: '職涯資料庫', desc: '管理履歷、技能標籤與工作日誌', color: 'bg-blue-50' },
  { href: '/career-match', icon: '🎯', title: '職缺配對', desc: '搜尋職缺、查看匹配分數、追蹤應徵進度', color: 'bg-green-50' },
  { href: '/career-growth', icon: '🌱', title: '職涯成長', desc: '技能落差分析、學習路徑與 AI 教練', color: 'bg-emerald-50' },
  { href: '/interview-prep', icon: '💼', title: '面試準備', desc: '模擬面試、STAR 故事庫與行為題庫', color: 'bg-purple-50' },
  { href: '/career-intelligence', icon: '📈', title: '職涯情報', desc: '薪資行情、產業趨勢與求職儀表板', color: 'bg-orange-50' },
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const name = session?.user?.name ?? '求職者'

  return (
    <div className="p-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">你好，{name} 👋</h1>
        <p className="mt-1 text-gray-600">歡迎回到 AI Career OS，今天要從哪裡開始？</p>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: '上傳履歷', value: '0', unit: '份' },
          { label: '儲存職缺', value: '0', unit: '筆' },
          { label: '練習題目', value: '0', unit: '題' },
          { label: '本週活躍', value: '今日', unit: '' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stat.value}
                <span className="text-sm text-gray-500">{stat.unit}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modules */}
      <h2 className="mb-4 text-base font-semibold text-gray-900">功能模組</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex items-start gap-4 py-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${m.color}`}>
                  {m.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{m.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{m.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">💡 開始建議</h3>
        <p className="text-sm text-blue-700">
          第一步建議先到「職涯資料庫」上傳你的履歷，AI 會自動解析並給出改善建議與 ATS 評分。
        </p>
        <Link href="/career-profile" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
          上傳履歷 →
        </Link>
      </div>
    </div>
  )
}
