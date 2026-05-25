'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useReactToPrint } from 'react-to-print'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Question {
  id: string; question: string; questionEn?: string
  type: 'behavioral' | 'technical' | 'situational' | 'general'
  userAnswer?: string; aiFeedback?: string; aiScore?: number
  strengths?: string[]; suggestions?: string[]; optimizedAnswer?: string
}
interface QAQuestion {
  zh: string; en: string; type: 'behavioral' | 'technical' | 'situational' | 'general'
}
interface SessionQuestion {
  id: string; question: string; questionEn?: string
  type: 'behavioral' | 'technical' | 'situational' | 'general'
  userAnswer?: string; aiScore?: number; aiFeedback?: string
}
interface InterviewSession {
  id: string; jobTitle: string; company?: string; language: string
  questions: SessionQuestion[]; createdAt: string; updatedAt: string
}
interface RealRecord {
  id: string; question: string; answer: string; score?: number; feedback?: string; date: string
}
interface PracticeResult {
  answer: string; score: number
  strengths: string[]; suggestions: string[]; optimizedAnswer: string
}

const TYPE: Record<string, { label: string; labelEn: string; color: 'info' | 'warning' | 'success' | 'default' }> = {
  behavioral:  { label: '行為面試', labelEn: 'Behavioral',  color: 'info' },
  technical:   { label: '技術面試', labelEn: 'Technical',   color: 'warning' },
  situational: { label: '情境題',   labelEn: 'Situational', color: 'success' },
  general:     { label: '一般題',   labelEn: 'General',     color: 'default' },
}

const QA_BANK: { category: string; questions: QAQuestion[] }[] = [
  { category: '通用', questions: [
    { zh: '請簡單介紹你自己，以及你為什麼想應徵這個職位。', en: 'Please introduce yourself and explain why you are applying for this position.', type: 'general' },
    { zh: '你最大的優點和缺點各是什麼？', en: 'What are your greatest strengths and weaknesses?', type: 'general' },
    { zh: '五年後你希望在職業上達到什麼目標？', en: 'Where do you see yourself professionally in 5 years?', type: 'situational' },
    { zh: '描述一次你與同事意見不合的處理方式。', en: 'Describe a time you disagreed with a colleague and how you handled it.', type: 'behavioral' },
    { zh: '描述一次你在工作中犯了錯誤的經驗，你如何處理？', en: 'Describe a time you made a mistake at work and how you handled it.', type: 'behavioral' },
    { zh: '如果你的工作量超過負荷，你會如何應對？', en: 'How do you handle it when your workload exceeds your capacity?', type: 'situational' },
    { zh: '描述一次你在沒有明確指示下主動解決問題的經驗。', en: 'Describe a time you proactively solved a problem without clear guidance.', type: 'behavioral' },
    { zh: '你如何在有壓力的情況下保持高效工作？', en: 'How do you stay productive under pressure?', type: 'behavioral' },
    { zh: '描述一次你說服他人接受你的想法的經驗。', en: 'Describe a time you persuaded others to accept your idea.', type: 'behavioral' },
    { zh: '為什麼你想離開現在的工作？', en: 'Why do you want to leave your current job?', type: 'general' },
    { zh: '如果你發現主管做了一個錯誤的決策，你會怎麼處理？', en: 'What would you do if you discovered your manager made an incorrect decision?', type: 'situational' },
    { zh: '描述一次你在團隊合作中遇到困難的經驗，你如何克服？', en: 'Describe a time you faced challenges in teamwork and how you overcame them.', type: 'behavioral' },
    { zh: '你的薪資期望是多少？', en: 'What are your salary expectations?', type: 'general' },
    { zh: '描述一次你快速學習新技能以應對工作需求的經驗。', en: 'Describe a time you quickly learned a new skill to meet job requirements.', type: 'behavioral' },
    { zh: '如果你同時有多個緊急任務，你如何安排優先順序？', en: 'If you have multiple urgent tasks simultaneously, how do you prioritize?', type: 'situational' },
    { zh: '你如何與不同工作風格的同事合作？', en: 'How do you work with colleagues who have different working styles?', type: 'behavioral' },
    { zh: '如果客戶對你的工作不滿意，你會如何應對？', en: 'How would you handle a situation where a client is dissatisfied with your work?', type: 'situational' },
    { zh: '你對我們公司有什麼了解？', en: 'What do you know about our company?', type: 'general' },
    { zh: '描述一次你達成超出預期目標的經驗。', en: 'Describe a time you exceeded your goals.', type: 'behavioral' },
    { zh: '如果你發現同事的工作有問題，你會如何處理？', en: "What would you do if you noticed a problem with a colleague's work?", type: 'situational' },
  ]},
  { category: '工程師', questions: [
    { zh: '請描述一個你解決過的技術難題，你是如何找到解決方案的？', en: 'Describe a technical challenge you solved. How did you find the solution?', type: 'behavioral' },
    { zh: '你如何確保程式碼品質？', en: 'How do you ensure code quality?', type: 'technical' },
    { zh: '描述一次你在 deadline 壓力下完成專案的經驗。', en: 'Describe a time you completed a project under deadline pressure.', type: 'behavioral' },
    { zh: '說說你最熟悉的系統架構設計原則。', en: 'Describe the system architecture principles you are most familiar with.', type: 'technical' },
    { zh: '請解釋你對 RESTful API 設計原則的理解。', en: 'Please explain your understanding of RESTful API design principles.', type: 'technical' },
    { zh: '描述一次你優化了系統效能的經驗，結果是什麼？', en: 'Describe a time you optimized system performance. What were the results?', type: 'behavioral' },
    { zh: '你如何進行程式碼審查（Code Review）？', en: 'How do you conduct code reviews?', type: 'technical' },
    { zh: '如果你接手一個沒有文件的舊系統，你會怎麼做？', en: 'What would you do if you took over a legacy system with no documentation?', type: 'situational' },
    { zh: '解釋你最熟悉的資料結構和演算法，並舉一個應用例子。', en: 'Explain your most familiar data structures and algorithms with an application example.', type: 'technical' },
    { zh: '描述一次你與非技術背景的人溝通技術問題的經驗。', en: 'Describe a time you communicated technical issues to non-technical stakeholders.', type: 'behavioral' },
    { zh: '你是如何保持對最新技術趨勢的了解的？', en: 'How do you stay updated with the latest technology trends?', type: 'technical' },
    { zh: '如果產品上線後發現嚴重 bug，你的處理流程是什麼？', en: 'What is your process if a critical bug is discovered after a product goes live?', type: 'situational' },
    { zh: '解釋你對微服務架構的理解及其優缺點。', en: 'Explain your understanding of microservices architecture and its pros and cons.', type: 'technical' },
    { zh: '描述一次你主導技術重構的經驗，面對了哪些挑戰？', en: 'Describe a time you led a technical refactoring. What challenges did you face?', type: 'behavioral' },
    { zh: '你如何設計一個可擴展的資料庫架構？', en: 'How do you design a scalable database architecture?', type: 'technical' },
    { zh: '如果你與另一位工程師對技術方案有嚴重分歧，你如何處理？', en: 'How do you handle a serious technical disagreement with another engineer?', type: 'situational' },
    { zh: '解釋你對 CI/CD 的理解和實踐。', en: 'Explain your understanding and practice of CI/CD.', type: 'technical' },
    { zh: '描述一次你指導初級工程師的經驗，你採用了什麼方法？', en: 'Describe a time you mentored a junior engineer. What approach did you use?', type: 'behavioral' },
    { zh: '你如何確保系統的資訊安全？', en: 'How do you ensure information security of a system?', type: 'technical' },
    { zh: '如果你被要求在不熟悉的技術棧上開發功能，你會怎麼做？', en: 'What would you do if asked to develop a feature in an unfamiliar tech stack?', type: 'situational' },
  ]},
  { category: '產品經理', questions: [
    { zh: '你如何決定產品功能的優先順序？', en: 'How do you prioritize product features?', type: 'technical' },
    { zh: '描述一個你主導的功能從想法到上線的過程。', en: 'Describe a feature you led from idea to launch.', type: 'behavioral' },
    { zh: '當工程師認為功能無法如期完成，你如何處理？', en: "What do you do when engineers say a feature can't be delivered on time?", type: 'situational' },
    { zh: '指標下滑時你的排查流程是什麼？', en: 'What is your process when key metrics decline?', type: 'technical' },
    { zh: '描述一次你透過數據發現並解決產品問題的經驗。', en: 'Describe a time you discovered and solved a product problem through data.', type: 'behavioral' },
    { zh: '如果用戶的需求與公司策略方向衝突，你如何處理？', en: 'How do you handle conflicts between user needs and company strategy?', type: 'situational' },
    { zh: '你如何定義和衡量產品的成功指標（KPI）？', en: 'How do you define and measure product success metrics (KPIs)?', type: 'technical' },
    { zh: '描述一次你進行用戶研究並影響產品決策的經驗。', en: 'Describe a time user research influenced your product decisions.', type: 'behavioral' },
    { zh: '如果你必須在兩個功能之間做選擇，資源只夠做一個，你如何決策？', en: 'If you must choose between two features with resources for only one, how do you decide?', type: 'situational' },
    { zh: '你如何撰寫一份有效的 PRD（產品需求文件）？', en: 'How do you write an effective PRD (Product Requirements Document)?', type: 'technical' },
    { zh: '描述一次你在沒有完整資訊的情況下做出產品決策的經驗。', en: 'Describe a time you made a product decision with incomplete information.', type: 'behavioral' },
    { zh: '如果市場上出現了強力的競爭對手，你會如何調整產品策略？', en: 'How would you adjust your product strategy if a strong competitor emerged?', type: 'situational' },
    { zh: '描述一次你成功說服工程師或設計師改變方向的經驗。', en: 'Describe a time you successfully persuaded engineers or designers to change direction.', type: 'behavioral' },
    { zh: '你如何進行競品分析？', en: 'How do you conduct competitive analysis?', type: 'technical' },
    { zh: '描述一次產品失敗的經驗，你從中學到了什麼？', en: 'Describe a product failure experience. What did you learn from it?', type: 'behavioral' },
    { zh: '如果用戶反饋和數據給出了相反的信號，你會以哪個為準？', en: 'If user feedback and data give conflicting signals, which do you prioritize?', type: 'situational' },
    { zh: '你如何設計並執行 A/B 測試？', en: 'How do you design and execute A/B tests?', type: 'technical' },
    { zh: '描述一次你在跨部門合作中遇到挑戰的經驗。', en: 'Describe a time you faced challenges in cross-functional collaboration.', type: 'behavioral' },
    { zh: '如果有用戶抱怨某功能難用，但數據顯示這功能使用率很高，你怎麼做？', en: 'If users complain a feature is difficult to use but data shows high usage, what do you do?', type: 'situational' },
    { zh: '你如何管理產品 Roadmap？', en: 'How do you manage a product roadmap?', type: 'technical' },
  ]},
  { category: '行銷', questions: [
    { zh: '描述一次你負責的行銷活動，從規劃到執行的全過程。', en: 'Describe a marketing campaign you managed from planning to execution.', type: 'behavioral' },
    { zh: '你如何衡量一個行銷活動的成效？', en: 'How do you measure the effectiveness of a marketing campaign?', type: 'technical' },
    { zh: '描述一次你在有限預算下達到行銷目標的經驗。', en: 'Describe a time you achieved marketing goals with a limited budget.', type: 'behavioral' },
    { zh: '你如何制定內容行銷策略？', en: 'How do you develop a content marketing strategy?', type: 'technical' },
    { zh: '描述一次你透過數據分析改善行銷結果的經驗。', en: 'Describe a time you improved marketing results through data analysis.', type: 'behavioral' },
    { zh: '如果一個行銷活動的效果不如預期，你會如何應對？', en: 'How would you respond if a marketing campaign underperforms?', type: 'situational' },
    { zh: '你如何分析目標受眾並建立 Persona？', en: 'How do you analyze target audiences and build personas?', type: 'technical' },
    { zh: '描述一次你成功打造品牌知名度的行銷案例。', en: 'Describe a marketing case where you successfully built brand awareness.', type: 'behavioral' },
    { zh: '如果公司品牌發生負面事件，你會如何進行危機公關？', en: 'How would you handle PR crisis if a negative event hit the company brand?', type: 'situational' },
    { zh: '解釋你對 SEO/SEM 的理解和實踐策略。', en: 'Explain your understanding and strategy for SEO/SEM.', type: 'technical' },
    { zh: '描述一次你與設計或產品團隊合作完成行銷項目的經驗。', en: 'Describe a time you collaborated with design or product teams on a marketing project.', type: 'behavioral' },
    { zh: '你如何利用社群媒體制定和執行行銷計畫？', en: 'How do you use social media to develop and execute marketing plans?', type: 'technical' },
    { zh: '描述一次你管理多個行銷渠道的經驗，你如何協調資源？', en: 'Describe a time you managed multiple marketing channels. How did you coordinate resources?', type: 'behavioral' },
    { zh: '如果需要在短時間內推出一個新產品，你的行銷策略是什麼？', en: 'What is your marketing strategy if you need to launch a new product in a short time?', type: 'situational' },
    { zh: '你如何利用數據進行受眾分群和個性化行銷？', en: 'How do you use data for audience segmentation and personalized marketing?', type: 'technical' },
    { zh: '描述一次你主導 KOL 或品牌合作的經驗。', en: 'Describe a time you led a KOL or brand partnership.', type: 'behavioral' },
    { zh: '如果競品推出了比你們更優惠的促銷活動，你會如何回應？', en: 'How would you respond if competitors launched a better promotional campaign than yours?', type: 'situational' },
    { zh: '解釋你對電子郵件行銷最佳實踐的理解。', en: 'Explain your understanding of email marketing best practices.', type: 'technical' },
    { zh: '描述一次你成功留住流失客戶的行銷策略。', en: 'Describe a marketing strategy that successfully retained churning customers.', type: 'behavioral' },
    { zh: '如果公司要進入一個全新市場，你如何規劃行銷策略？', en: 'How would you plan a marketing strategy if the company enters a completely new market?', type: 'situational' },
  ]},
  { category: '業務', questions: [
    { zh: '描述你最成功的一次銷售案例。', en: 'Describe your most successful sales case.', type: 'behavioral' },
    { zh: '你的銷售流程是什麼？', en: 'What is your sales process?', type: 'technical' },
    { zh: '描述一次你面對客戶拒絕後如何轉化成功的經驗。', en: 'Describe a time you turned a client rejection into a successful conversion.', type: 'behavioral' },
    { zh: '如果你的銷售目標遠高於現有客戶能提供的業績，你會怎麼做？', en: 'What would you do if your sales target far exceeds what current clients can provide?', type: 'situational' },
    { zh: '描述一次你管理複雜銷售週期的經驗。', en: 'Describe a time you managed a complex sales cycle.', type: 'behavioral' },
    { zh: '你如何識別並接觸潛在客戶（Lead Generation）？', en: 'How do you identify and approach potential clients (Lead Generation)?', type: 'technical' },
    { zh: '描述一次你與困難客戶建立長期關係的經驗。', en: 'Describe a time you built a long-term relationship with a difficult client.', type: 'behavioral' },
    { zh: '如果客戶要求你提供超出你授權範圍的折扣，你會如何應對？', en: 'How would you handle a client requesting a discount beyond your authorization?', type: 'situational' },
    { zh: '你如何使用 CRM 工具管理客戶關係？', en: 'How do you use CRM tools to manage client relationships?', type: 'technical' },
    { zh: '描述一次你超越銷售配額的經驗，你使用了什麼策略？', en: 'Describe a time you exceeded your sales quota. What strategies did you use?', type: 'behavioral' },
    { zh: '如果你發現客戶可能適合更低價的方案，你會怎麼做？', en: 'What would you do if you realize a client might be better served by a cheaper solution?', type: 'situational' },
    { zh: '你如何進行競品差異化的銷售話術？', en: 'How do you craft sales pitches that differentiate from competitors?', type: 'technical' },
    { zh: '描述一次你在銷售過程中遇到道德兩難的處理方式。', en: 'Describe a time you encountered ethical dilemmas in the sales process.', type: 'behavioral' },
    { zh: '如果你的主要客戶突然說要換競爭對手，你會如何挽留？', en: 'How would you retain a key client who suddenly says they want to switch to a competitor?', type: 'situational' },
    { zh: '解釋你對 B2B 和 B2C 銷售策略差異的理解。', en: 'Explain your understanding of differences between B2B and B2C sales strategies.', type: 'technical' },
    { zh: '描述一次你成功完成大型企業客戶（Key Account）的開發。', en: 'Describe a time you successfully acquired a major enterprise client (Key Account).', type: 'behavioral' },
    { zh: '如果你接管了一個業績不佳的客戶組合，你的第一步是什麼？', en: 'If you take over an underperforming client portfolio, what is your first step?', type: 'situational' },
    { zh: '你如何分析銷售數據來改善業績？', en: 'How do you analyze sales data to improve performance?', type: 'technical' },
    { zh: '描述一次你與跨部門團隊合作完成大型案子的經驗。', en: 'Describe a time you collaborated with cross-functional teams to close a major deal.', type: 'behavioral' },
    { zh: '如果在合約簽署前，客戶對產品提出嚴重質疑，你如何處理？', en: 'How would you handle a client raising serious doubts about your product just before signing a contract?', type: 'situational' },
  ]},
  { category: '人資', questions: [
    { zh: '描述一次你成功招聘到關鍵人才的經驗。', en: 'Describe a time you successfully recruited a key talent.', type: 'behavioral' },
    { zh: '你如何設計一套有效的績效評估系統？', en: 'How do you design an effective performance evaluation system?', type: 'technical' },
    { zh: '描述一次你處理員工衝突的經驗，你是如何解決的？', en: 'Describe a time you handled an employee conflict. How did you resolve it?', type: 'behavioral' },
    { zh: '如果一位高績效員工突然提出辭職，你會如何應對？', en: 'How would you respond if a high-performing employee suddenly submits their resignation?', type: 'situational' },
    { zh: '你如何設計有競爭力的薪資福利方案？', en: 'How do you design a competitive compensation and benefits package?', type: 'technical' },
    { zh: '描述一次你推動公司文化改變的經驗。', en: 'Describe a time you drove a change in company culture.', type: 'behavioral' },
    { zh: '如果你發現某個部門的離職率很高，你會如何排查原因？', en: 'If you discover high turnover in a department, how would you investigate the cause?', type: 'situational' },
    { zh: '你如何設計新員工入職（Onboarding）流程？', en: 'How do you design an effective employee onboarding process?', type: 'technical' },
    { zh: '描述一次你在法規限制下平衡員工權益與公司需求的經驗。', en: 'Describe a time you balanced employee rights and company needs within legal constraints.', type: 'behavioral' },
    { zh: '如果公司要進行大規模裁員，你作為人資會如何規劃和執行？', en: 'If the company needs to conduct large-scale layoffs, how would you plan and execute as HR?', type: 'situational' },
    { zh: '你如何設計員工培訓和職涯發展計畫？', en: 'How do you design employee training and career development plans?', type: 'technical' },
    { zh: '描述一次你主導員工敬業度提升計畫的經驗。', en: 'Describe a time you led an employee engagement improvement initiative.', type: 'behavioral' },
    { zh: '如果有員工舉報職場霸凌，你的調查流程是什麼？', en: 'What is your investigation process if an employee reports workplace bullying?', type: 'situational' },
    { zh: '你如何利用 HR 數據分析改善人力資源決策？', en: 'How do you use people analytics to improve HR decisions?', type: 'technical' },
    { zh: '描述一次你成功改善部門招募時效的經驗。', en: 'Describe a time you successfully improved hiring time-to-fill.', type: 'behavioral' },
    { zh: '如果高管與員工對某項政策有嚴重分歧，你如何從中調解？', en: 'How would you mediate if executives and employees have serious disagreements about a policy?', type: 'situational' },
    { zh: '你如何確保公司招募流程的公平性和多元包容性（DEI）？', en: 'How do you ensure fairness and DEI in the recruitment process?', type: 'technical' },
    { zh: '描述一次你在有限資源下完成大型招募任務的經驗。', en: 'Describe a time you completed a large-scale recruitment task with limited resources.', type: 'behavioral' },
    { zh: '如果有員工投訴薪資不公平，你如何進行調查和處理？', en: 'How would you investigate and handle an employee complaint about pay inequity?', type: 'situational' },
    { zh: '解釋你對勞動法規遵從（Labor Compliance）的理解及其實踐。', en: 'Explain your understanding of labor law compliance and how you practice it.', type: 'technical' },
  ]},
  { category: '財務', questions: [
    { zh: '解釋你對三大財務報表（損益表、資產負債表、現金流量表）的理解和關聯。', en: 'Explain your understanding of the three financial statements and their relationships.', type: 'technical' },
    { zh: '描述一次你發現財務異常並成功排查的經驗。', en: 'Describe a time you identified a financial anomaly and successfully investigated it.', type: 'behavioral' },
    { zh: '你如何進行財務預測和建立財務模型？', en: 'How do you conduct financial forecasting and build financial models?', type: 'technical' },
    { zh: '如果公司現金流突然出現嚴重短缺，你作為財務人員的應對措施是什麼？', en: 'If the company suddenly faces a serious cash flow shortage, what are your measures as a finance professional?', type: 'situational' },
    { zh: '解釋你對 EBITDA 和自由現金流的理解及其意義。', en: 'Explain your understanding of EBITDA and free cash flow and their significance.', type: 'technical' },
    { zh: '描述一次你主導預算規劃並成功控制成本的經驗。', en: 'Describe a time you led budget planning and successfully controlled costs.', type: 'behavioral' },
    { zh: '如果業務部門的預算申請遠超出合理範圍，你如何拒絕並協商？', en: "How would you decline and negotiate if a business department's budget request is far beyond reasonable?", type: 'situational' },
    { zh: '你如何進行企業估值（Valuation）？', en: 'How do you conduct company valuation?', type: 'technical' },
    { zh: '描述一次你協助公司做出重要財務決策的經驗。', en: 'Describe a time you helped the company make an important financial decision.', type: 'behavioral' },
    { zh: '解釋你對稅務規劃和合規的理解。', en: 'Explain your understanding of tax planning and compliance.', type: 'technical' },
    { zh: '如果你發現有部門存在財務舞弊的跡象，你會如何處理？', en: 'How would you handle a situation where you discover signs of financial fraud in a department?', type: 'situational' },
    { zh: '描述一次你向非財務背景的管理層解釋複雜財務概念的經驗。', en: 'Describe a time you explained complex financial concepts to non-financial management.', type: 'behavioral' },
    { zh: '你如何進行資本支出（CapEx）分析和決策？', en: 'How do you analyze and make decisions on capital expenditure (CapEx)?', type: 'technical' },
    { zh: '如果公司計劃進行併購，你在財務盡職調查中的角色和流程是什麼？', en: 'What is your role and process in financial due diligence if the company plans an M&A?', type: 'situational' },
    { zh: '解釋你對 Working Capital Management 的理解和優化策略。', en: 'Explain your understanding of working capital management and optimization strategies.', type: 'technical' },
    { zh: '描述一次你改善公司財務報告流程的經驗。', en: "Describe a time you improved the company's financial reporting process.", type: 'behavioral' },
    { zh: '如果利率大幅上升影響公司融資成本，你有哪些風險管控策略？', en: 'What risk management strategies do you have if interest rates rise significantly affecting financing costs?', type: 'situational' },
    { zh: '你如何設計並監控關鍵財務 KPI？', en: 'How do you design and monitor key financial KPIs?', type: 'technical' },
    { zh: '描述一次你在資金緊張時期協助公司優化現金流的經驗。', en: 'Describe a time you helped the company optimize cash flow during a tight period.', type: 'behavioral' },
    { zh: '如果你的財務分析與業務部門的預估有重大差異，你如何處理？', en: "How would you handle a major discrepancy between your financial analysis and the business team's projections?", type: 'situational' },
  ]},
  { category: '設計', questions: [
    { zh: '請介紹一個你最引以為傲的設計專案，從挑戰到解決方案。', en: 'Please introduce a design project you are most proud of, from challenge to solution.', type: 'behavioral' },
    { zh: '解釋你的設計流程，從研究到最終交付。', en: 'Explain your design process from research to final delivery.', type: 'technical' },
    { zh: '描述一次你收到與自己設計理念截然不同反饋的經驗，你如何應對？', en: 'Describe a time you received feedback completely different from your design philosophy. How did you respond?', type: 'behavioral' },
    { zh: '如果利害關係人要求的設計方向在用戶研究上缺乏依據，你如何說服他們？', en: 'How do you persuade stakeholders if their requested design direction lacks user research support?', type: 'situational' },
    { zh: '你如何進行用戶研究（UX Research）並將發現融入設計？', en: 'How do you conduct UX research and incorporate findings into design?', type: 'technical' },
    { zh: '描述一次你在時間和資源有限的情況下完成設計的經驗。', en: 'Describe a time you completed a design with limited time and resources.', type: 'behavioral' },
    { zh: '解釋你對設計系統（Design System）的理解和建立方法。', en: 'Explain your understanding of design systems and how to build them.', type: 'technical' },
    { zh: '如果工程師告訴你某個設計在技術上難以實現，你會如何處理？', en: 'How would you handle it if an engineer tells you a design is technically difficult to implement?', type: 'situational' },
    { zh: '你如何確保你的設計符合無障礙設計（Accessibility）標準？', en: 'How do you ensure your designs meet accessibility standards?', type: 'technical' },
    { zh: '描述一次你透過設計改善關鍵業務指標的經驗。', en: 'Describe a time your design improved key business metrics.', type: 'behavioral' },
    { zh: '如果你需要在美觀與可用性之間做出取捨，你的考量是什麼？', en: 'What is your consideration when making trade-offs between aesthetics and usability?', type: 'situational' },
    { zh: '你如何進行 Usability Testing 並迭代改善設計？', en: 'How do you conduct usability testing and iteratively improve your design?', type: 'technical' },
    { zh: '描述一次你指導初級設計師或建立設計標準的經驗。', en: 'Describe a time you mentored a junior designer or established design standards.', type: 'behavioral' },
    { zh: '如果不同部門的利害關係人對設計方向有分歧，你如何取得共識？', en: 'How do you reach consensus if stakeholders from different departments disagree on design direction?', type: 'situational' },
    { zh: '解釋你對資訊架構（Information Architecture）的理解及設計原則。', en: 'Explain your understanding of information architecture and design principles.', type: 'technical' },
    { zh: '描述一次你透過設計創新解決用戶痛點的經驗。', en: 'Describe a time you solved user pain points through design innovation.', type: 'behavioral' },
    { zh: '如果產品需要針對不同文化市場進行本地化設計，你會如何規劃？', en: 'How would you plan if the product needs localized design for different cultural markets?', type: 'situational' },
    { zh: '你如何使用數據和分析工具驗證設計決策？', en: 'How do you use data and analytics tools to validate design decisions?', type: 'technical' },
    { zh: '描述一次你在跨職能團隊中如何為設計決策辯護的經驗。', en: 'Describe a time you advocated for a design decision in a cross-functional team.', type: 'behavioral' },
    { zh: '如果公司決定重新設計整個產品界面，你如何規劃和推進這個項目？', en: 'How would you plan and drive a complete product interface redesign?', type: 'situational' },
  ]},
  { category: '客服', questions: [
    { zh: '描述一次你成功化解一位非常憤怒的客戶的經驗。', en: 'Describe a time you successfully de-escalated a very angry customer.', type: 'behavioral' },
    { zh: '你如何在服務多位客戶的同時，確保每位都得到及時且高品質的服務？', en: 'How do you ensure timely and high-quality service for each client while serving multiple customers simultaneously?', type: 'technical' },
    { zh: '描述一次你在無法滿足客戶要求的情況下，仍讓客戶感到滿意的經驗。', en: "Describe a time you made a customer satisfied even when you couldn't meet their demands.", type: 'behavioral' },
    { zh: '如果客戶要求超出公司政策範圍的退款或補償，你如何應對？', en: 'How would you respond if a customer demands a refund or compensation beyond company policy?', type: 'situational' },
    { zh: '你如何記錄和追蹤客戶問題，確保每個問題都能被妥善解決？', en: 'How do you document and track customer issues to ensure each is properly resolved?', type: 'technical' },
    { zh: '描述一次你從客戶反饋中發現產品或服務問題，並推動改善的經驗。', en: 'Describe a time you discovered a product or service problem from customer feedback and drove improvement.', type: 'behavioral' },
    { zh: '如果你無法立即解決客戶的問題，你的處理方式是什麼？', en: "What is your approach if you cannot immediately resolve a customer's problem?", type: 'situational' },
    { zh: '你如何衡量客服品質和客戶滿意度（CSAT/NPS）？', en: 'How do you measure customer service quality and satisfaction (CSAT/NPS)?', type: 'technical' },
    { zh: '描述一次你超越客戶期望，提供卓越服務的經驗。', en: 'Describe a time you exceeded customer expectations and delivered exceptional service.', type: 'behavioral' },
    { zh: '如果你同時接到多個緊急客戶投訴，你如何安排處理順序？', en: 'How do you prioritize multiple urgent customer complaints received simultaneously?', type: 'situational' },
    { zh: '你如何利用知識庫和自助服務工具提升客服效率？', en: 'How do you use knowledge bases and self-service tools to improve customer service efficiency?', type: 'technical' },
    { zh: '描述一次你面對情緒激動的客戶，如何保持冷靜並有效溝通的經驗。', en: 'Describe a time you maintained composure and communicated effectively with an emotionally upset customer.', type: 'behavioral' },
    { zh: '如果客戶在社群媒體上公開抱怨產品，你的處理流程是什麼？', en: 'What is your process if a customer publicly complains about the product on social media?', type: 'situational' },
    { zh: '解釋你對客戶旅程地圖（Customer Journey Map）的理解和應用。', en: 'Explain your understanding and application of customer journey mapping.', type: 'technical' },
    { zh: '描述一次你與產品或工程團隊合作解決系統性客戶問題的經驗。', en: 'Describe a time you worked with product or engineering teams to resolve a systemic customer issue.', type: 'behavioral' },
    { zh: '如果公司政策有明顯不合理之處，導致客戶一再抱怨，你會如何推動改變？', en: 'How would you push for policy changes if unreasonable company policies cause recurring customer complaints?', type: 'situational' },
    { zh: '你如何設計和優化客服流程以減少首次回應時間？', en: 'How do you design and optimize customer service processes to reduce first response time?', type: 'technical' },
    { zh: '描述一次你在高壓、高量的工作環境中保持服務品質的經驗。', en: 'Describe a time you maintained service quality in a high-pressure, high-volume work environment.', type: 'behavioral' },
    { zh: '如果新產品上市後引發大量客戶投訴，你如何組織快速回應？', en: 'How would you organize a rapid response if a new product launch triggers massive customer complaints?', type: 'situational' },
    { zh: '你如何建立和培訓一支高效的客服團隊？', en: 'How do you build and train a high-performing customer service team?', type: 'technical' },
  ]},
]

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }
const scoreCol   = (s: number) => s >= 8 ? 'text-sage-600' : s >= 6 ? 'text-honey-500' : 'text-red-400'
const scoreLabel = (s: number) => s >= 8 ? '表現優異' : s >= 6 ? '表現良好' : s >= 4 ? '尚可改善' : '需要加強'
function scoreStars(score: number) {
  const filled = Math.round(score / 2)
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

type SpeechRecognitionCtor = new () => {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onresult: ((event: Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window { SpeechRecognition: SpeechRecognitionCtor; webkitSpeechRecognition: SpeechRecognitionCtor }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function InterviewPrepPage() {
  const [tab, setTab] = useState<'mock' | 'qa' | 'record'>('mock')

  // Mock interview — session flow
  const [mockStep, setMockStep] = useState<'loading' | 'sessions' | 'setup' | 'list' | 'practice'>('loading')
  const [sessions, setSessions]               = useState<InterviewSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [role, setRole]         = useState('')
  const [company, setCompany]   = useState('')
  const [questionCount, setQuestionCount] = useState<10 | 15 | 20>(15)
  const [questions, setQuestions]     = useState<Question[]>([])
  const [generating, setGenerating]   = useState(false)
  const [selectedQ, setSelectedQ]     = useState<Question | null>(null)
  const [mockPracticeIdx, setMockPracticeIdx] = useState(0)
  const [answer, setAnswer]           = useState('')
  const [answerLang, setAnswerLang]   = useState<'zh' | 'en'>('zh')
  const [evaluating, setEvaluating]   = useState(false)
  const [showEn, setShowEn]           = useState(false)
  const [showMockOptimized, setShowMockOptimized] = useState(false)

  // QA bank
  const [selectedCat, setSelectedCat]   = useState('通用')
  const [practiceIdx, setPracticeIdx]   = useState(0)
  const [practiceAnswer, setPracticeAnswer] = useState('')
  const [practiceResults, setPracticeResults] = useState<Record<string, PracticeResult>>({})
  const [practiceEval, setPracticeEval] = useState(false)
  const [showOptimized, setShowOptimized] = useState(false)
  const [qaBankLang, setQaBankLang] = useState<'zh' | 'en'>('zh')

  // Real interview record
  const [records, setRecords]         = useState<RealRecord[]>([])
  const [recQuestion, setRecQuestion] = useState('')
  const [recAnswer, setRecAnswer]     = useState('')
  const [recEvaluating, setRecEvaluating] = useState(false)

  const printRef     = useRef<HTMLDivElement>(null)
  const mockListRef  = useRef<HTMLDivElement>(null)
  const handlePrint      = useReactToPrint({ contentRef: printRef })
  const handleMockPrint  = useReactToPrint({ contentRef: mockListRef })

  // Voice / speech
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceTarget, setVoiceTarget] = useState<'mock' | 'practice' | 'record'>('mock')
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('interview-records')
    if (saved) setRecords(JSON.parse(saved))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('interview-mock-sessions')
    const parsed: InterviewSession[] = saved ? JSON.parse(saved) : []
    setSessions(parsed)
    setMockStep(parsed.length > 0 ? 'sessions' : 'setup')
  }, [])

  const saveRecords = useCallback((next: RealRecord[]) => {
    setRecords(next)
    localStorage.setItem('interview-records', JSON.stringify(next))
  }, [])

  const saveSessions = useCallback((next: InterviewSession[]) => {
    setSessions(next)
    localStorage.setItem('interview-mock-sessions', JSON.stringify(next))
  }, [])

  // ── Computed (QA bank) ────────────────────────────────────────────────────
  const catQuestions   = QA_BANK.find((c) => c.category === selectedCat)?.questions ?? []
  const practiceQ      = catQuestions[practiceIdx] ?? null
  const practiceResult = practiceQ ? practiceResults[practiceQ.zh] : undefined

  function goToQuestion(idx: number) {
    const q = catQuestions[idx]
    setPracticeIdx(idx)
    setPracticeAnswer(q ? (practiceResults[q.zh]?.answer ?? '') : '')
    setShowOptimized(false)
  }

  // ── Computed (Mock) ───────────────────────────────────────────────────────
  function goToMockQuestion(idx: number) {
    const q = questions[idx]
    if (!q) return
    setMockPracticeIdx(idx)
    setSelectedQ(q)
    setAnswer(q.userAnswer ?? '')
    setShowEn(false)
    setShowMockOptimized(false)
  }

  function saveMockAnswer() {
    if (!selectedQ || !answer.trim()) return
    const rec: RealRecord = {
      id: genId(), question: selectedQ.question, answer,
      score: selectedQ.aiScore, feedback: selectedQ.aiFeedback,
      date: new Date().toISOString(),
    }
    saveRecords([rec, ...records])
  }

  function loadSession(session: InterviewSession) {
    setRole(session.jobTitle)
    setCompany(session.company ?? '')
    setCurrentSessionId(session.id)
    const qs: Question[] = session.questions.map((q) => ({
      id: q.id, question: q.question, questionEn: q.questionEn,
      type: q.type, userAnswer: q.userAnswer, aiScore: q.aiScore, aiFeedback: q.aiFeedback,
    }))
    setQuestions(qs)
    setSelectedQ(null); setAnswer(''); setMockPracticeIdx(0)
    setMockStep('list')
  }

  function restartWithSetup(session: InterviewSession) {
    setRole(session.jobTitle)
    setCompany(session.company ?? '')
    setCurrentSessionId(null)
    setQuestions([]); setSelectedQ(null); setAnswer('')
    setMockStep('setup')
  }

  function deleteSession(id: string) {
    const next = sessions.filter((s) => s.id !== id)
    saveSessions(next)
    if (next.length === 0) setMockStep('setup')
  }

  // ── Voice ──────────────────────────────────────────────────────────────────
  function startVoice(target: typeof voiceTarget) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('你的瀏覽器不支援語音輸入，請使用 Chrome 或 Safari'); return }
    if (voiceActive) { recognitionRef.current?.stop(); setVoiceActive(false); return }
    const r = new SR()
    r.lang = answerLang === 'en' ? 'en-US' : 'zh-TW'
    r.continuous = true; r.interimResults = false
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join('')
      if (target === 'mock') setAnswer((p) => p + t)
      else if (target === 'practice') setPracticeAnswer((p) => p + t)
      else setRecAnswer((p) => p + t)
    }
    r.onerror = () => setVoiceActive(false)
    r.onend   = () => setVoiceActive(false)
    recognitionRef.current = r; r.start()
    setVoiceActive(true); setVoiceTarget(target)
  }

  // ── Mock interview ─────────────────────────────────────────────────────────
  async function generateQuestions() {
    if (!role.trim()) return
    setGenerating(true); setQuestions([]); setSelectedQ(null); setAnswer('')
    setMockStep('list')
    try {
      const res  = await fetch('/api/interview/questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, company, questionCount }),
      })
      const data = await res.json()
      const qs: Question[] = data.questions ?? []
      setQuestions(qs)
      // Save new session
      const newSession: InterviewSession = {
        id: genId(), jobTitle: role, company: company || undefined,
        language: answerLang === 'en' ? 'en-US' : 'zh-TW',
        questions: qs.map((q) => ({ id: q.id, question: q.question, questionEn: q.questionEn, type: q.type })),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      setCurrentSessionId(newSession.id)
      saveSessions([newSession, ...sessions])
    } catch { /* silent */ }
    finally { setGenerating(false) }
  }

  async function evaluate(forPractice = false) {
    const q = forPractice ? (qaBankLang === 'en' ? practiceQ?.en : practiceQ?.zh) : selectedQ?.question
    const a = forPractice ? practiceAnswer : answer
    if (!q || !a?.trim()) return
    if (forPractice) setPracticeEval(true); else setEvaluating(true)
    try {
      const res  = await fetch('/api/interview/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, answer: a }) })
      const data = await res.json()
      if (forPractice && practiceQ) {
        setPracticeResults((prev) => ({
          ...prev,
          [practiceQ.zh]: {
            answer: a, score: data.score ?? 0,
            strengths: Array.isArray(data.strengths) ? data.strengths : [],
            suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
            optimizedAnswer: data.optimizedAnswer ?? data.feedback ?? '',
          },
        }))
      } else {
        const updates = {
          userAnswer: a, aiFeedback: data.feedback ?? '', aiScore: data.score ?? 0,
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          optimizedAnswer: data.optimizedAnswer ?? data.feedback ?? '',
        }
        setQuestions((p) => p.map((qu) => qu.id === selectedQ?.id ? { ...qu, ...updates } : qu))
        setSelectedQ((p) => p && { ...p, ...updates })
        // Persist answer to session
        if (currentSessionId && selectedQ) {
          setSessions((prev) => {
            const next = prev.map((s) => s.id !== currentSessionId ? s : {
              ...s, updatedAt: new Date().toISOString(),
              questions: s.questions.map((sq) => sq.id !== selectedQ.id ? sq : {
                ...sq, userAnswer: a, aiScore: data.score ?? 0, aiFeedback: data.feedback ?? '',
              }),
            })
            localStorage.setItem('interview-mock-sessions', JSON.stringify(next))
            return next
          })
        }
      }
    } catch { /* silent */ }
    finally { if (forPractice) setPracticeEval(false); else setEvaluating(false) }
  }

  // ── Real record ────────────────────────────────────────────────────────────
  async function evaluateRecord() {
    if (!recQuestion.trim() || !recAnswer.trim()) return
    setRecEvaluating(true)
    try {
      const res  = await fetch('/api/interview/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: recQuestion, answer: recAnswer }) })
      const data = await res.json()
      const rec: RealRecord = { id: genId(), question: recQuestion, answer: recAnswer, score: data.score, feedback: data.feedback, date: new Date().toISOString() }
      saveRecords([rec, ...records]); setRecQuestion(''); setRecAnswer('')
    } catch { /* silent */ }
    finally { setRecEvaluating(false) }
  }

  function deleteRecord(id: string) { saveRecords(records.filter((r) => r.id !== id)) }

  // ── Shared UI pieces ──────────────────────────────────────────────────────
  const voiceBtn = (target: typeof voiceTarget) => (
    <button onClick={() => startVoice(target)}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all ${voiceActive && voiceTarget === target ? 'border-red-300 bg-red-50 text-red-500' : 'border-warm-200 bg-cream-200 text-ink-500 hover:border-warm-300'}`}>
      {voiceActive && voiceTarget === target ? '⏹ 停止錄音' : '🎤 語音輸入'}
    </button>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">⬟ Interview Arena</h1>
        <p className="mt-1 text-sm text-ink-500">AI 模擬面試 · 常見題庫 · 實際面試記錄 · PDF 匯出</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-full sm:w-fit shadow-[var(--shadow-warm-xs)] overflow-x-auto">
        {([
          ['mock',   '⬟ 模擬面試'],
          ['qa',     '📋 常見題庫'],
          ['record', '🎙 實際記錄'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setSelectedQ(null); setAnswer('') }}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MOCK INTERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'mock' && (
        <>
          {/* ── Loading ── */}
          {mockStep === 'loading' && (
            <div className="flex items-center justify-center py-20">
              <svg className="h-5 w-5 animate-spin text-terra-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}

          {/* ── Sessions list ── */}
          {mockStep === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink-800">我的模擬面試</h2>
                  <p className="text-xs text-ink-400 mt-0.5">共 {sessions.length} 個面試情境</p>
                </div>
                <button
                  onClick={() => { setRole(''); setCompany(''); setCurrentSessionId(null); setQuestions([]); setMockStep('setup') }}
                  className="flex items-center gap-1.5 rounded-xl bg-terra-500 px-4 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)]">
                  ＋ 新增面試
                </button>
              </div>

              <div className="space-y-3">
                {sessions.map((s) => {
                  const answered = s.questions.filter((q) => q.userAnswer).length
                  const total    = s.questions.length
                  const pct      = total > 0 ? Math.round((answered / total) * 100) : 0
                  return (
                    <Card key={s.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <p className="font-semibold text-ink-800">{s.jobTitle}</p>
                              {s.company && <p className="text-xs text-ink-400">{s.company}</p>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-ink-400 flex-wrap">
                              <span>📋 {total} 道題目</span>
                              <span>📅 {new Date(s.createdAt).toLocaleDateString('zh-TW')}</span>
                              <span className={answered === total && total > 0 ? 'text-sage-600 font-medium' : ''}>
                                {answered === total && total > 0 ? '✓ ' : ''}已完成 {answered}/{total} 題
                              </span>
                            </div>
                            <div className="relative h-1.5 rounded-full bg-cream-200 overflow-hidden w-full max-w-[300px]">
                              <div
                                className={`absolute left-0 top-0 h-full rounded-full transition-all ${pct === 100 ? 'bg-sage-500' : 'bg-terra-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => loadSession(s)}
                              className="rounded-xl border border-terra-300 bg-terra-50 px-3 py-1.5 text-xs font-medium text-terra-600 hover:bg-terra-100 transition-colors whitespace-nowrap">
                              {answered > 0 ? '繼續練習' : '開始練習'}
                            </button>
                            <button
                              onClick={() => restartWithSetup(s)}
                              className="rounded-xl border border-warm-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors whitespace-nowrap">
                              重新開始
                            </button>
                            <button
                              onClick={() => deleteSession(s.id)}
                              className="rounded-xl border border-warm-200 px-2.5 py-1.5 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all whitespace-nowrap">
                              刪除
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Setup form ── */}
          {mockStep === 'setup' && (
            <div className="flex justify-center pt-4">
              <div className="w-full max-w-[600px] space-y-5">
                {sessions.length > 0 && (
                  <button onClick={() => setMockStep('sessions')}
                    className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 transition-colors">
                    ← 返回面試列表
                  </button>
                )}
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-ink-900">設定你的面試情境</h2>
                  <p className="text-sm text-ink-400">AI 將根據職位與題數生成客製化題目</p>
                </div>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Input label="目標職位（必填）" placeholder="例如：資深前端工程師、產品經理" value={role}
                      onChange={(e) => setRole(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && generateQuestions()} />
                    <Input label="公司名稱（選填）" placeholder="例如：LINE、台積電、Shopee" value={company}
                      onChange={(e) => setCompany(e.target.value)} />
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-ink-500">題目數量</label>
                      <div className="flex gap-2">
                        {([
                          [10, '10 題', '快速練習'],
                          [15, '15 題', '標準'],
                          [20, '20 題', '完整練習'],
                        ] as const).map(([n, label, sub]) => (
                          <button key={n} onClick={() => setQuestionCount(n)}
                            className={`flex-1 rounded-xl border py-2.5 text-center transition-all ${questionCount === n ? 'border-terra-400 bg-terra-50 text-terra-700' : 'border-warm-200 bg-white text-ink-500 hover:border-warm-300'}`}>
                            <p className={`text-sm font-semibold ${questionCount === n ? 'text-terra-700' : 'text-ink-700'}`}>{label}</p>
                            <p className="text-[10px] text-ink-400 mt-0.5">{sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-ink-500">回答語言</label>
                      <div className="flex gap-1 rounded-lg border border-warm-200 bg-cream-50 p-0.5 w-fit">
                        {(['zh', 'en'] as const).map((l) => (
                          <button key={l} onClick={() => setAnswerLang(l)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${answerLang === l ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
                            {l === 'zh' ? '中文' : 'English'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button variant="primary" onClick={generateQuestions} loading={generating} disabled={!role.trim()} className="w-full">
                      🤖 AI 生成面試題目
                    </Button>
                    <p className="text-center text-xs text-ink-300">AI 將根據職位與公司背景生成客製化題目</p>
                    <p className="text-center text-[11px] text-ink-400">
                      🎤 題目將根據你的技能庫個人化生成 ·{' '}
                      <Link href="/dashboard/skills" className="text-terra-500 hover:text-terra-600 transition-colors">前往管理技能庫</Link>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Step 2: Question list ── */}
          {mockStep === 'list' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-ink-800">
                    {role} 的面試題目{questions.length > 0 ? `（${questions.length} 題）` : ''}
                  </h2>
                  {company && <p className="text-xs text-ink-400 mt-0.5">{company}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMockStep(sessions.length > 0 ? 'sessions' : 'setup')}
                    className="text-sm text-ink-400 hover:text-ink-700 transition-colors">
                    ← {sessions.length > 0 ? '返回列表' : '重新設定'}
                  </button>
                  <Button variant="outline" size="sm" onClick={generateQuestions} loading={generating}>
                    重新生成
                  </Button>
                </div>
              </div>

              {/* Loading */}
              {generating && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <svg className="h-6 w-6 animate-spin text-terra-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-sm text-ink-400">AI 正在生成面試題目…</p>
                </div>
              )}

              {/* Question cards */}
              {!generating && (
                <div ref={mockListRef} className="space-y-3 print:p-6">
                  {questions.length > 0 && (
                    <p className="text-xs text-ink-400 print:mb-4 hidden print:block">{role}{company ? ` · ${company}` : ''} — 模擬面試題目</p>
                  )}
                  {questions.map((q, i) => (
                    <Card key={q.id} className={q.aiScore !== undefined ? 'border-sage-200' : ''}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          {/* Number circle */}
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${q.aiScore !== undefined ? 'border-sage-300 bg-sage-50 text-sage-600' : 'border-terra-200 bg-terra-50 text-terra-600'}`}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-ink-800 leading-relaxed">{q.question}</p>
                            {q.questionEn && (
                              <p className="text-sm text-ink-400 mt-0.5 italic leading-snug">{q.questionEn}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant={TYPE[q.type]?.color ?? 'default'}>{TYPE[q.type]?.label}</Badge>
                              {q.aiScore !== undefined && (
                                <span className={`text-xs font-semibold ${scoreCol(q.aiScore)}`}>
                                  已練習 {q.aiScore}/10
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Action button */}
                          <button
                            onClick={() => { setSelectedQ(q); setAnswer(q.userAnswer ?? ''); setMockPracticeIdx(i); setMockStep('practice'); setShowEn(false); setShowMockOptimized(false) }}
                            className="print:hidden shrink-0 rounded-xl border border-terra-300 bg-terra-50 px-4 py-2 text-sm font-medium text-terra-600 hover:bg-terra-100 transition-colors whitespace-nowrap">
                            {q.userAnswer ? '重新練習' : '開始練習'}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* PDF export */}
              {!generating && questions.length > 0 && (
                <button onClick={() => handleMockPrint()}
                  className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors">
                  📥 匯出所有題目 PDF
                </button>
              )}
            </div>
          )}

          {/* ── Step 3: Practice ── */}
          {mockStep === 'practice' && selectedQ && (
            <div className="space-y-5 max-w-[800px]">
              {/* Top nav */}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setMockStep('list')}
                  className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 transition-colors">
                  ← 返回題目列表
                </button>
                <span className="ml-auto text-sm text-ink-400">
                  第 {mockPracticeIdx + 1} 題 / 共 {questions.length} 題
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => goToMockQuestion(Math.max(0, mockPracticeIdx - 1))}
                    disabled={mockPracticeIdx === 0}
                    className="rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-xs text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    上一題
                  </button>
                  <button
                    onClick={() => goToMockQuestion(Math.min(questions.length - 1, mockPracticeIdx + 1))}
                    disabled={mockPracticeIdx === questions.length - 1}
                    className="rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-xs text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    下一題
                  </button>
                </div>
              </div>

              {/* Question block */}
              <div className="bg-terra-50 border-l-4 border-terra-400 p-5 rounded-r-xl">
                <Badge variant={TYPE[selectedQ.type]?.color ?? 'default'} className="mb-3">
                  {TYPE[selectedQ.type]?.label} · {TYPE[selectedQ.type]?.labelEn}
                </Badge>
                <p className="text-xl font-semibold text-ink-900 leading-relaxed">{selectedQ.question}</p>
                {selectedQ.questionEn && (
                  <div className="mt-2">
                    <button onClick={() => setShowEn((p) => !p)} className="text-xs text-terra-500 hover:text-terra-700">
                      {showEn ? '▲ 收起英文題目' : '▼ 顯示英文題目'}
                    </button>
                    {showEn && <p className="text-sm text-ink-400 mt-1 italic leading-relaxed">{selectedQ.questionEn}</p>}
                  </div>
                )}
              </div>

              {/* Answer area */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-ink-600">你的回答</label>
                <textarea
                  rows={8}
                  placeholder={answerLang === 'en' ? 'Use STAR method: Situation → Task → Action → Result' : '建議用 STAR 方法：情境 → 任務 → 行動 → 結果'}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full min-h-[200px] rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-y leading-relaxed" />
                <div className="flex items-center gap-3">
                  {voiceBtn('mock')}
                  <button
                    onClick={() => evaluate(false)}
                    disabled={!answer.trim() || evaluating}
                    className="flex items-center gap-2 rounded-xl bg-terra-500 px-5 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-warm-sm)]">
                    {evaluating ? (
                      <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>評分中...</>
                    ) : '✨ AI 評分與建議'}
                  </button>
                </div>
              </div>

              {/* AI feedback */}
              {selectedQ.aiScore !== undefined && (
                <div className="rounded-2xl border border-warm-200 bg-white p-5 space-y-4 shadow-[var(--shadow-warm-xs)]">
                  {/* Score row */}
                  <div className="flex items-center gap-4">
                    <span className={`text-5xl font-bold tabular-nums ${scoreCol(selectedQ.aiScore)}`}>
                      {selectedQ.aiScore}
                    </span>
                    <div>
                      <p className="text-xs text-ink-400 mb-0.5">/ 10 分</p>
                      <p className="text-honey-500 text-lg tracking-wider">{scoreStars(selectedQ.aiScore)}</p>
                    </div>
                    <span className={`ml-auto text-sm font-semibold ${scoreCol(selectedQ.aiScore)}`}>
                      {scoreLabel(selectedQ.aiScore)}
                    </span>
                  </div>

                  {/* Strengths */}
                  {selectedQ.strengths && selectedQ.strengths.length > 0 && (
                    <div className="rounded-xl bg-sage-50 border border-sage-200 p-3">
                      <p className="text-xs font-semibold text-sage-600 mb-2">✓ 優點</p>
                      <ul className="space-y-1.5">
                        {selectedQ.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                            <span className="text-sage-500 shrink-0 mt-0.5">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {selectedQ.suggestions && selectedQ.suggestions.length > 0 && (
                    <div className="rounded-xl bg-terra-50 border border-terra-200 p-3">
                      <p className="text-xs font-semibold text-terra-500 mb-2">→ 改善建議</p>
                      <ul className="space-y-1.5">
                        {selectedQ.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                            <span className="text-terra-500 shrink-0 mt-0.5">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Optimized answer toggle */}
                  {selectedQ.optimizedAnswer && (
                    <>
                      <button
                        onClick={() => setShowMockOptimized((p) => !p)}
                        className="flex items-center justify-center gap-2 w-full rounded-xl border border-terra-200 bg-terra-50 px-4 py-2.5 text-sm font-medium text-terra-600 hover:bg-terra-100 transition-colors">
                        {showMockOptimized ? '▲ 收起 AI 優化版回答' : '查看 AI 優化版回答'}
                      </button>
                      {showMockOptimized && (
                        <div className="rounded-xl border border-terra-200 bg-terra-50 p-4">
                          <p className="text-xs font-semibold text-terra-500 mb-2">AI 建議回答</p>
                          <p className="text-sm text-ink-600 whitespace-pre-line leading-relaxed">{selectedQ.optimizedAnswer}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Save */}
                  <button onClick={saveMockAnswer}
                    className="flex items-center gap-2 rounded-xl border border-warm-200 bg-cream-50 px-4 py-2 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors">
                    💾 儲存此題回答到個人題庫
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          QA BANK
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'qa' && (
        <div className="flex rounded-2xl border border-warm-200 overflow-hidden" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {/* Left: 380px category + question list */}
          <div className="w-[380px] shrink-0 bg-cream-100 border-r border-warm-200 flex flex-col">
            {/* Dropdown */}
            <div className="p-3 border-b border-warm-200">
              <select
                value={selectedCat}
                onChange={(e) => { setSelectedCat(e.target.value); setPracticeIdx(0); setPracticeAnswer(''); setShowOptimized(false) }}
                className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-800 focus:border-terra-400 focus:outline-none appearance-none cursor-pointer"
              >
                {QA_BANK.map((cat) => (
                  <option key={cat.category} value={cat.category}>{cat.category}</option>
                ))}
              </select>
            </div>

            {/* Question list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {catQuestions.map((q, i) => {
                const result   = practiceResults[q.zh]
                const isActive = i === practiceIdx
                const isDone   = !!result
                return (
                  <button key={i} onClick={() => goToQuestion(i)}
                    className={`w-full text-left p-3 transition-all ${
                      isActive
                        ? 'rounded-r-xl border-l-4 border-terra-500 bg-terra-50'
                        : isDone
                          ? 'rounded-xl border border-sage-200 bg-sage-50 hover:border-sage-300'
                          : 'rounded-xl border border-warm-200 bg-white hover:border-warm-400'
                    }`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isActive ? 'bg-terra-500 text-white' : isDone ? 'bg-sage-100 text-sage-600' : 'bg-cream-200 text-ink-400'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-800 leading-snug line-clamp-2">
                          {qaBankLang === 'en' ? q.en : q.zh}
                        </p>
                        {isDone && (
                          <p className="text-xs text-sage-600 mt-0.5 font-medium">✓ {result.score}/10</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: practice panel */}
          <div className="flex-1 min-w-0 bg-white flex flex-col overflow-hidden">
            {practiceQ ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Language toggle + progress count */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex gap-0.5 rounded-lg border border-warm-200 bg-cream-50 p-0.5">
                    {(['zh', 'en'] as const).map((l) => (
                      <button key={l} onClick={() => setQaBankLang(l)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                          qaBankLang === l ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
                        }`}>
                        {l === 'zh' ? '中文題目' : 'English Question'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-ink-400">
                    進度 {catQuestions.filter((q) => practiceResults[q.zh]).length} / {catQuestions.length} 題已完成
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-1.5 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-terra-400 transition-all duration-500"
                    style={{ width: `${(catQuestions.filter((q) => practiceResults[q.zh]).length / catQuestions.length) * 100}%` }}
                  />
                </div>

                {/* Number + type badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-ink-300">#{String(practiceIdx + 1).padStart(2, '0')}</span>
                  <Badge variant={TYPE[practiceQ.type]?.color ?? 'default'}>{TYPE[practiceQ.type]?.label}</Badge>
                  <span className="text-xs text-ink-400">{TYPE[practiceQ.type]?.labelEn}</span>
                </div>

                {/* Question block */}
                <div className="bg-terra-50 border-l-4 border-terra-500 p-5 rounded-r-xl">
                  <p className="text-2xl font-bold text-ink-900 leading-relaxed">
                    {qaBankLang === 'en' ? practiceQ.en : practiceQ.zh}
                  </p>
                  {qaBankLang === 'zh' && (
                    <p className="text-sm text-ink-400 mt-2 italic leading-snug">{practiceQ.en}</p>
                  )}
                </div>

                {/* Answer area */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-ink-600">你的回答</label>
                  <textarea rows={7} value={practiceAnswer} onChange={(e) => setPracticeAnswer(e.target.value)}
                    placeholder={qaBankLang === 'en' ? 'Use STAR method: Situation → Task → Action → Result' : '建議用 STAR 方法：情境 → 任務 → 行動 → 結果'}
                    className="w-full min-h-[180px] rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:ring-2 focus:ring-terra-100 focus:outline-none resize-y leading-relaxed" />
                  <div className="flex items-center gap-3">
                    {voiceBtn('practice')}
                    <button onClick={() => evaluate(true)} disabled={!practiceAnswer.trim() || practiceEval}
                      className="flex items-center gap-2 rounded-xl bg-terra-500 px-5 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-warm-sm)]">
                      {practiceEval ? (
                        <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>評分中...</>
                      ) : '✨ AI 評分'}
                    </button>
                  </div>
                </div>

                {/* AI feedback */}
                {practiceResult && (
                  <div className="rounded-2xl border border-warm-200 bg-white p-5 space-y-4 shadow-[var(--shadow-warm-xs)]">
                    <div className="flex items-center gap-4">
                      <span className={`text-5xl font-bold tabular-nums ${scoreCol(practiceResult.score)}`}>{practiceResult.score}</span>
                      <div>
                        <p className="text-xs text-ink-400 mb-0.5">/ 10 分</p>
                        <p className="text-honey-500 text-lg tracking-wider">{scoreStars(practiceResult.score)}</p>
                      </div>
                      <span className={`ml-auto text-sm font-semibold ${scoreCol(practiceResult.score)}`}>{scoreLabel(practiceResult.score)}</span>
                    </div>
                    {(practiceResult.strengths.length > 0 || practiceResult.suggestions.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {practiceResult.strengths.length > 0 && (
                          <div className="rounded-xl bg-sage-50 border border-sage-200 p-3">
                            <p className="text-xs font-semibold text-sage-600 mb-2">✓ 優點</p>
                            <ul className="space-y-1.5">
                              {practiceResult.strengths.map((s, i) => (
                                <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                                  <span className="text-sage-500 shrink-0 mt-0.5">✓</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {practiceResult.suggestions.length > 0 && (
                          <div className="rounded-xl bg-honey-50 border border-amber-200 p-3">
                            <p className="text-xs font-semibold text-honey-600 mb-2">→ 改善建議</p>
                            <ul className="space-y-1.5">
                              {practiceResult.suggestions.map((s, i) => (
                                <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                                  <span className="text-honey-500 shrink-0 mt-0.5">→</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {practiceResult.optimizedAnswer && (
                      <>
                        <button onClick={() => setShowOptimized((p) => !p)}
                          className="flex items-center justify-center gap-2 w-full rounded-xl border border-terra-200 bg-terra-50 px-4 py-2.5 text-sm font-medium text-terra-600 hover:bg-terra-100 transition-colors">
                          {showOptimized ? '▲ 收起優化版回答' : '✨ 查看優化版回答'}
                        </button>
                        {showOptimized && (
                          <div className="rounded-xl border border-terra-200 bg-terra-50 p-4">
                            <p className="text-xs font-semibold text-terra-500 mb-2">AI 建議回答</p>
                            <p className="text-sm text-ink-600 whitespace-pre-line leading-relaxed">{practiceResult.optimizedAnswer}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="border-t border-warm-200 pt-4 flex items-center justify-between">
                  <button onClick={() => goToQuestion(Math.max(0, practiceIdx - 1))} disabled={practiceIdx === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    ← 上一題
                  </button>
                  <span className="text-xs text-ink-300">{practiceIdx + 1} / {catQuestions.length}</span>
                  <button onClick={() => goToQuestion(Math.min(catQuestions.length - 1, practiceIdx + 1))} disabled={practiceIdx === catQuestions.length - 1}
                    className="flex items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    下一題 →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm text-ink-500">從左側選擇一道題目開始練習</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REAL RECORD
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'record' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>記錄實際面試題目</CardTitle>
                {records.length > 0 && <Button size="sm" variant="outline" onClick={() => handlePrint()}>匯出 PDF</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="面試題目" placeholder="輸入實際被問到的問題..." value={recQuestion} onChange={(e) => setRecQuestion(e.target.value)} />
              <div className="space-y-2">
                <Textarea label="你的回答" placeholder="記錄你當時的回答..." rows={5} value={recAnswer} onChange={(e) => setRecAnswer(e.target.value)} />
                {voiceBtn('record')}
              </div>
              <Button variant="primary" onClick={evaluateRecord} loading={recEvaluating} disabled={!recQuestion.trim() || !recAnswer.trim()}>
                🤖 AI 評分 + 儲存到個人題庫
              </Button>
            </CardContent>
          </Card>

          {records.length > 0 && (
            <div ref={printRef} className="space-y-3 print:p-6">
              <h2 className="text-sm font-semibold text-ink-600 print:text-base print:mb-4">我的面試題庫 ({records.length} 題)</h2>
              {records.map((r) => (
                <Card key={r.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-700">{r.question}</p>
                        <p className="text-xs text-ink-400 mt-0.5">{new Date(r.date).toLocaleDateString('zh-TW')}</p>
                        {r.score !== undefined && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-lg font-bold ${scoreCol(r.score)}`}>{r.score}</span>
                            <span className="text-xs text-ink-400">/ 10</span>
                          </div>
                        )}
                        <p className="mt-2 text-sm text-ink-600 leading-relaxed">{r.answer}</p>
                        {r.feedback && (
                          <div className="mt-3 rounded-xl border border-terra-100 bg-terra-50 p-3">
                            <p className="text-xs font-semibold text-terra-500 mb-1">AI 回饋與優化建議</p>
                            <p className="text-xs text-ink-600 whitespace-pre-line leading-relaxed">{r.feedback}</p>
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteRecord(r.id)} className="print:hidden rounded-lg border border-warm-200 px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all shrink-0">刪除</button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-3">🎙</p>
              <p className="text-sm text-ink-500">記錄你在真實面試中被問到的問題</p>
              <p className="text-xs text-ink-400 mt-1">AI 評分後自動存入個人題庫，可匯出 PDF</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
