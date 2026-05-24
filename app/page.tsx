import Link from 'next/link'

const FEATURES = [
  { emoji: '📄', title: 'Resume Lab',       sub: 'AI 解析履歷 · ATS 評分 · 關鍵字優化', color: 'bg-terra-50  border-terra-100' },
  { emoji: '🎯', title: 'Job Pipeline',     sub: '台灣職缺整合 · AI 匹配分析 · Kanban',  color: 'bg-sage-50   border-sage-100' },
  { emoji: '🌱', title: 'Skill Map',        sub: '技能落差分析 · 學習路徑 · AI 教練',    color: 'bg-honey-50  border-honey-100' },
  { emoji: '💬', title: 'Interview Prep',   sub: 'AI 模擬面試 · STAR 評分 · 行為題庫',  color: 'bg-clay-100  border-warm-200' },
  { emoji: '📊', title: 'Analytics',        sub: '薪資行情 · 產業趨勢 · 求職儀表板',    color: 'bg-cream-200 border-warm-200' },
  { emoji: '🤖', title: 'AI Career Coach',  sub: '24hr 對話教練 · 個人化職涯建議',      color: 'bg-terra-50  border-terra-100' },
]

const TESTIMONIALS = [
  { text: '上傳履歷後 AI 給的建議非常具體，我照著改之後回覆率提高了很多。', name: 'Joyce C.', role: '前端工程師 · 台北' },
  { text: '模擬面試功能真的讓我練習了很多次，實際面試時不再緊張了。', name: 'David L.', role: '產品經理 · 新竹' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-100">

      {/* Header */}
      <header className="sticky top-0 z-40 glass-warm border-b border-warm-200 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-terra-500 text-white text-[11px] font-bold shadow-[var(--shadow-warm-sm)]">AI</div>
            <span className="font-semibold text-ink-900 tracking-tight">Career OS</span>
            <span className="hidden text-xs text-ink-300 sm:block">· 台灣職涯系統</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin" className="text-sm text-ink-400 hover:text-ink-700 transition-colors">登入</Link>
            <Link href="/onboarding" className="rounded-lg bg-terra-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)]">
              免費開始
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-5 text-4xl font-bold leading-snug tracking-tight text-ink-900 sm:text-5xl">
            讓 AI 成為你的
            <br />
            <span className="text-terra-500">職涯成長夥伴</span>
          </h1>
          <p className="mb-10 text-base text-ink-400 max-w-lg mx-auto leading-relaxed">
            從履歷優化、職缺配對、面試準備到薪資分析——<br className="hidden sm:block"/>
            一個溫暖的 AI 平台，陪你走過每個求職關卡。
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/onboarding"
              className="w-full sm:w-auto rounded-xl bg-terra-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-md)]">
              免費開始使用 →
            </Link>
            <Link href="/dashboard"
              className="w-full sm:w-auto rounded-xl border border-warm-300 bg-white px-8 py-3.5 text-base font-semibold text-ink-600 hover:bg-cream-200 hover:border-warm-400 transition-all shadow-[var(--shadow-warm-xs)]">
              進入 Dashboard
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-300">無需信用卡 · 基本功能永久免費</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-ink-900 tracking-tight">六大 AI 職涯工具</h2>
          <p className="mb-12 text-center text-sm text-ink-400">從求職準備到薪資分析，全程陪伴你的職涯旅程</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}
                className={`rounded-2xl border p-5 ${f.color} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-warm-md)]`}>
                <div className="mb-3 text-2xl">{f.emoji}</div>
                <h3 className="mb-1 font-semibold text-ink-800">{f.title}</h3>
                <p className="text-xs text-ink-400 leading-relaxed">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white border-y border-warm-200 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-xl font-bold text-ink-900">真實用戶回饋</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl border border-warm-200 bg-cream-50 p-5 border-l-terra">
                <p className="text-sm text-ink-600 leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-terra-100 flex items-center justify-center text-xs font-semibold text-terra-600">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-700">{t.name}</p>
                    <p className="text-[10px] text-ink-300">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <div className="rounded-3xl border border-terra-100 bg-terra-50 p-12">
            <div className="mb-4 text-4xl">🌱</div>
            <h2 className="mb-3 text-xl font-bold text-ink-900">準備好開始你的職涯旅程了嗎？</h2>
            <p className="mb-8 text-sm text-ink-400 leading-relaxed">3 分鐘完成設定，立即獲得 AI 個人化職涯建議</p>
            <Link href="/onboarding"
              className="inline-block rounded-xl bg-terra-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-md)]">
              免費開始使用
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-200 px-6 py-8 text-center">
        <p className="text-xs text-ink-300">
          © 2026 AI Career OS · 台灣職涯作業系統 · Powered by Google Gemini &amp; OpenAI
        </p>
      </footer>
    </div>
  )
}
