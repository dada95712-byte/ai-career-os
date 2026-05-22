import Link from 'next/link'

const FEATURES = [
  { icon: '◈', title: 'Resume Lab',     sub: 'AI 解析 · ATS 評分 · 關鍵字優化',    color: 'from-indigo-500/15' },
  { icon: '◎', title: 'Job Pipeline',   sub: '台灣職缺整合 · 匹配分析 · Kanban',   color: 'from-sky-500/15' },
  { icon: '◈', title: 'Skill Map',      sub: '技能落差 · 學習路徑 · AI 教練',       color: 'from-emerald-500/15' },
  { icon: '⬟', title: 'Interview Arena',sub: 'AI 模擬面試 · STAR 評分 · 題庫',     color: 'from-violet-500/15' },
  { icon: '◉', title: 'Analytics',      sub: '薪資行情 · 產業趨勢 · 儀表板',       color: 'from-amber-500/15' },
  { icon: '🤖', title: 'AI Career Coach',sub: '24hr 對話教練 · 個人化建議',         color: 'from-pink-500/15' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4 sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand text-white text-xs font-bold">AI</div>
            <span className="font-semibold text-zinc-100">Career OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">登入</Link>
            <Link href="/onboarding" className="rounded-lg gradient-brand px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              免費開始
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-28 text-center overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            🇹🇼 專為台灣求職者設計 · Powered by Gemini 2.0
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-6xl">
            你的 AI 職涯
            <br />
            <span className="gradient-text">指揮中心</span>
          </h1>
          <p className="mb-10 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            從履歷解析、智能職缺配對、模擬面試到薪資分析——
            讓 AI 成為你最強的求職夥伴。
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              className="w-full rounded-xl gradient-brand px-8 py-3.5 text-base font-semibold text-white hover:opacity-90 transition-opacity sm:w-auto"
            >
              免費開始使用 →
            </Link>
            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-zinc-700 px-8 py-3.5 text-base font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors sm:w-auto"
            >
              直接進入 Dashboard
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-600">無需信用卡 · 永久免費基本功能</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 px-6 py-10">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {[
            { num: '5',     label: '核心功能模組' },
            { num: 'Gemini',label: '2.0 Flash 驅動' },
            { num: '104',   label: '台灣職缺整合' },
            { num: '繁中',  label: 'AI 原生回應語言' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xl font-bold gradient-text">{s.num}</div>
              <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-zinc-100">全方位職涯工具組</h2>
          <p className="mb-12 text-center text-sm text-zinc-500">六大 AI 功能模組，從求職到升職全程陪伴</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${f.color} to-zinc-900 p-5 hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30`}
              >
                <div className="mb-3 text-2xl text-zinc-400">{f.icon}</div>
                <h3 className="mb-1 font-semibold text-zinc-100">{f.title}</h3>
                <p className="text-xs text-zinc-500">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-zinc-900 p-12 text-center glow-indigo">
          <h2 className="mb-3 text-2xl font-bold text-zinc-50">開始你的 AI 職涯旅程</h2>
          <p className="mb-8 text-sm text-zinc-400">3 分鐘完成設定，立即獲得個人化職涯建議</p>
          <Link
            href="/onboarding"
            className="inline-block rounded-xl gradient-brand px-8 py-3.5 text-base font-semibold text-white hover:opacity-90 transition-opacity"
          >
            立即免費使用 🚀
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8 text-center">
        <p className="text-xs text-zinc-600">
          © 2026 AI Career OS · 台灣職涯系統 · Powered by Google Gemini &amp; OpenAI
        </p>
      </footer>
    </div>
  )
}
