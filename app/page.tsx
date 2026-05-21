import Link from 'next/link'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: '📄',
    title: '職涯資料庫',
    desc: 'AI 解析履歷、ATS 評分、技能標籤自動擷取',
  },
  {
    icon: '🎯',
    title: '智能職缺配對',
    desc: '整合台灣主要求職平台，精準媒合你的技能',
  },
  {
    icon: '🌱',
    title: '技能落差分析',
    desc: '找出技能缺口，規劃個人化學習路徑',
  },
  {
    icon: '💼',
    title: '模擬面試',
    desc: 'AI 生成面試題目，即時評分與改善建議',
  },
  {
    icon: '📈',
    title: '職涯情報',
    desc: '台灣薪資行情、產業趨勢、求職活動分析',
  },
  {
    icon: '🤖',
    title: 'AI 職涯教練',
    desc: '24 小時對話式教練，協助你做每一個職涯決策',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
              A
            </div>
            <span className="font-semibold text-gray-900">AI Career OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-gray-900">
              登入
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              免費開始使用
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            🇹🇼 專為台灣求職者設計
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            讓 AI 成為你的
            <br />
            <span className="text-blue-600">職涯最強後盾</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            從履歷優化、職缺配對、面試準備到薪資分析，
            <br className="hidden sm:block" />
            AI Career OS 用人工智慧陪你走過每一個求職關卡。
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="w-full rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              立即免費使用 →
            </Link>
            <Link
              href="/career-profile"
              className="w-full rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              上傳履歷試試看
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50 px-6 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { num: '5 大', label: '核心功能模組' },
            { num: 'AI', label: 'Gemini 2.0 驅動' },
            { num: '104', label: '台灣職缺整合' },
            { num: '繁中', label: '介面與 AI 回應' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-blue-600">{s.num}</div>
              <div className="text-sm text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">五大核心功能</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-2xl font-bold text-white">準備好改變你的職涯了嗎？</h2>
          <p className="mb-8 text-blue-100">免費使用，無需信用卡。立即開始你的 AI 職涯旅程。</p>
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-600 hover:bg-blue-50"
          >
            免費開始使用 →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center">
        <p className="text-sm text-gray-500">
          © 2026 AI Career OS｜台灣職涯作業系統｜
          <span className="ml-1 text-xs">Powered by Google Gemini &amp; OpenAI</span>
        </p>
      </footer>
    </div>
  )
}
