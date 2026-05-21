import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') ?? ''
  const location = searchParams.get('location') ?? '台北市'

  if (!query) return NextResponse.json({ error: '請輸入搜尋關鍵字' }, { status: 400 })

  const jsearchKey = process.env.JSEARCH_API_KEY
  const serperKey = process.env.SERPER_API_KEY

  if (jsearchKey) {
    try {
      const params = new URLSearchParams({
        query: `${query} ${location} site:104.com.tw OR site:cake.me`,
        page: '1',
        num_pages: '1',
        country: 'tw',
        date_posted: 'month',
      })
      const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: {
          'X-RapidAPI-Key': jsearchKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      })
      const data = await res.json()
      const jobs = (data.data ?? []).map((j: Record<string, unknown>, i: number) => ({
        id: `jsearch-${i}`,
        title: j.job_title ?? '',
        company: j.employer_name ?? '',
        location: (j.job_city as string) ?? location,
        description: (j.job_description as string)?.slice(0, 500) ?? '',
        url: j.job_apply_link ?? '',
        platform: j.job_publisher ?? '104',
        salaryMin: j.job_min_salary ? Number(j.job_min_salary) : undefined,
        salaryMax: j.job_max_salary ? Number(j.job_max_salary) : undefined,
      }))
      return NextResponse.json({ jobs })
    } catch (err) {
      console.warn('JSearch failed:', err)
    }
  }

  if (serperKey) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `${query} 工作 ${location} site:104.com.tw`, num: 10 }),
      })
      const data = await res.json()
      const jobs = (data.organic ?? []).map((r: Record<string, unknown>, i: number) => ({
        id: `serper-${i}`,
        title: (r.title as string)?.replace(' - 104人力銀行', '') ?? query,
        company: (r.snippet as string)?.split('·')[0]?.trim() ?? '台灣企業',
        location,
        description: r.snippet ?? '',
        url: r.link ?? '',
        platform: '104',
      }))
      return NextResponse.json({ jobs })
    } catch (err) {
      console.warn('Serper failed:', err)
    }
  }

  // Mock fallback for demo
  const mockJobs = [
    { id: 'mock-1', title: `${query}`, company: '台灣科技公司', location, description: `誠徵${query}，有競爭力薪資，彈性工時。歡迎應屆畢業生及有經驗者應徵。`, platform: '104', salaryMin: 50000, salaryMax: 80000 },
    { id: 'mock-2', title: `資深${query}`, company: '國際企業台灣分公司', location, description: `3年以上相關經驗，英文流利，具備跨團隊合作能力。`, platform: 'Cake.me', salaryMin: 70000, salaryMax: 100000 },
    { id: 'mock-3', title: `${query}（新創）`, company: '台灣新創', location, description: `新創環境，快速成長，有機會參與重要決策。`, platform: 'Yourator', salaryMin: 55000, salaryMax: 75000 },
  ]
  return NextResponse.json({ jobs: mockJobs, note: '目前為示範資料，請設定 JSEARCH_API_KEY 或 SERPER_API_KEY 啟用真實職缺搜尋' })
}
