# AI Career OS — 台灣職涯作業系統

以 AI 驅動的職涯規劃平台，專為台灣求職者設計。

## 功能模組

| 模組 | 路徑 | 功能 |
|------|------|------|
| 職涯資料庫 | `/career-profile` | PDF/DOCX 履歷解析、AI 評分、技能標籤、STAR 轉換 |
| 職缺配對 | `/career-match` | 台灣職缺搜尋、AI 匹配分析、求職 Kanban |
| 職涯成長 | `/career-growth` | 技能落差分析、學習路徑、AI 教練對話 |
| 面試準備 | `/interview-prep` | 模擬面試題生成、AI 答案評分、常見題庫 |
| 職涯情報 | `/career-intelligence` | 薪資行情查詢、產業趨勢、求職儀表板 |

## 技術架構

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS v4
- **Auth**: NextAuth.js v4 (Google OAuth + Email)
- **AI**: OpenRouter（統一入口）— `openrouter/free`（主）/ `meta-llama/llama-3.3-70b-instruct:free`（備援）
- **DB**: PostgreSQL via Prisma 7（schema ready，MVP 可不設定）
- **Deployment**: Vercel

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local` 並填入實際值：

```bash
cp .env.example .env.local
```

必要環境變數：

| 變數 | 說明 | 取得方式 |
|------|------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API（AI 統一入口） | [OpenRouter Keys](https://openrouter.ai/keys) |
| `NEXTAUTH_SECRET` | Session 加密金鑰 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 部署網址 | `http://localhost:3000`（開發） |
| `GOOGLE_CLIENT_ID` | Google OAuth | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | 同上 |
| `DATABASE_URL` | PostgreSQL 連線字串 | Neon.tech 或 Supabase（選填） |
| `JSEARCH_API_KEY` | 職缺搜尋 API | [RapidAPI JSearch](https://rapidapi.com/letscrape-6bfed1765d1a6/api/jsearch) |
| `SERPER_API_KEY` | 職缺搜尋備援 | [Serper.dev](https://serper.dev) |

> `OPENROUTER_API_KEY` 和 `NEXTAUTH_SECRET` 是最低限度必填。
> 不設定 `DATABASE_URL` 可使用（JWT session，不持久化）。

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

### 4. 資料庫設定（選填）

```bash
# 設定 DATABASE_URL 後執行
npx prisma migrate dev --name init
npx prisma generate
```

## 部署到 Vercel

1. Push 到 GitHub
2. 在 Vercel 匯入專案
3. 設定所有環境變數
4. 部署後將 `NEXTAUTH_URL` 更新為實際網址

## AI Failover 機制

```
Request → OpenRouter: openrouter/free → [失敗] → OpenRouter: meta-llama/llama-3.3-70b-instruct:free
```

> 圖片辨識另用 `meta-llama/llama-3.2-11b-vision-instruct:free`。所有模型皆透過同一個 `OPENROUTER_API_KEY` 呼叫（見 `lib/ai-client.ts`）。

## 安全性

- 所有 API Key 透過環境變數注入，禁止 hardcode
- `.env*` 已加入 `.gitignore`
- NextAuth JWT session，7 天有效期
