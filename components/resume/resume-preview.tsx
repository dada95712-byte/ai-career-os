'use client'

import { forwardRef, type Ref } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export type SectionId = 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'languages' | 'conferences' | 'activities'
export type TemplateId = 'classic' | 'modern' | 'minimal' | 'professional' | 'creative'

export interface PreviewData {
  name: string; jobTitle: string
  email: string; phone: string; location: string
  linkedin: string; website: string
  summary: string; summaryType: string
  skills: string[]
  experiences: { company: string; title: string; description: string; startDate: string; endDate: string; current: boolean }[]
  education: { school: string; major: string; degree: string; startDate: string; endDate: string }[]
  languages: { id: string; name: string; level: string }[]
  conferences: { id: string; name: string; organizer: string; date: string; role: string; description: string }[]
  activities: { id: string; name: string; organization: string; date: string; role: string; description: string }[]
  lang: 'zh' | 'en'
  sectionOrder: SectionId[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SECTION_TITLE: Record<'zh' | 'en', Partial<Record<SectionId, string>>> = {
  zh: { summary: '個人摘要', experience: '工作經歷', education: '學歷', skills: '技能', languages: '語言', conferences: '會議', activities: '活動' },
  en: { summary: 'Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills', languages: 'Languages', conferences: 'Conferences', activities: 'Activities' },
}

function secTitle(data: PreviewData, id: SectionId): string {
  if (id === 'summary') return data.summaryType || (SECTION_TITLE[data.lang].summary ?? '個人摘要')
  return SECTION_TITLE[data.lang][id] ?? id
}

function dateRange(s: string, e: string, current: boolean, lang: 'zh' | 'en') {
  return [s, current ? (lang === 'zh' ? '至今' : 'Present') : e].filter(Boolean).join(' – ')
}

const FONT = '"Noto Sans TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif'
const SIDEBAR_SECTIONS: SectionId[] = ['skills', 'languages']

// ── Section renderers (shared across templates via style injection) ─────────────

interface SS { /* section styling */ hdr: React.CSSProperties; company: React.CSSProperties; role: React.CSSProperties; body: React.CSSProperties; date: React.CSSProperties }

function renderSectionBody(id: SectionId, data: PreviewData, ss: SS): React.ReactNode {
  const lang = data.lang
  switch (id) {
    case 'summary':
      return data.summary ? <p style={{ ...ss.body, margin: 0 }}>{data.summary}</p> : null
    case 'experience':
      return data.experiences.filter(e => e.company || e.title).map((exp, i) => (
        <div key={i} style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={ss.company}>{exp.company}</span>
            <span style={ss.date}>{dateRange(exp.startDate, exp.endDate, exp.current, lang)}</span>
          </div>
          {exp.title && <p style={{ ...ss.role, margin: '2px 0 4px' }}>{exp.title}</p>}
          {exp.description && <p style={{ ...ss.body, lineHeight: 1.65, whiteSpace: 'pre-line', marginTop: '3px', marginBottom: 0 }}>{exp.description}</p>}
        </div>
      ))
    case 'education':
      return data.education.filter(e => e.school).map((edu, i) => (
        <div key={i} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={ss.company}>{edu.school}</span>
            <span style={ss.date}>{dateRange(edu.startDate, edu.endDate, false, lang)}</span>
          </div>
          {(edu.degree || edu.major) && <p style={{ ...ss.body, margin: '2px 0 0' }}>{[edu.degree, edu.major].filter(Boolean).join(', ')}</p>}
        </div>
      ))
    case 'skills':
      return data.skills.filter(Boolean).length > 0
        ? <p style={{ ...ss.body, margin: 0 }}>{data.skills.filter(Boolean).join('  ·  ')}</p>
        : null
    case 'languages':
      return data.languages.filter(l => l.name).map((l, i) => (
        <p key={i} style={{ ...ss.body, margin: '2px 0' }}>{l.name}{l.level ? ` — ${l.level}` : ''}</p>
      ))
    case 'conferences':
      return (data.conferences ?? []).filter(c => c.name).map((c, i) => (
        <div key={i} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={ss.company}>{c.name}</span>
            <span style={ss.date}>{c.date}</span>
          </div>
          {(c.role || c.organizer) && <p style={{ ...ss.role, margin: '2px 0 4px' }}>{[c.role, c.organizer].filter(Boolean).join(' · ')}</p>}
          {c.description && <p style={{ ...ss.body, margin: 0 }}>{c.description}</p>}
        </div>
      ))
    case 'activities':
      return (data.activities ?? []).filter(a => a.name).map((a, i) => (
        <div key={i} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={ss.company}>{a.name}</span>
            <span style={ss.date}>{a.date}</span>
          </div>
          {(a.role || a.organization) && <p style={{ ...ss.role, margin: '2px 0 4px' }}>{[a.role, a.organization].filter(Boolean).join(' · ')}</p>}
          {a.description && <p style={{ ...ss.body, margin: 0 }}>{a.description}</p>}
        </div>
      ))
    default: return null
  }
}

function isSectionEmpty(id: SectionId, data: PreviewData): boolean {
  switch (id) {
    case 'summary':     return !data.summary
    case 'experience':  return !data.experiences.some(e => e.company || e.title)
    case 'education':   return !data.education.some(e => e.school)
    case 'skills':      return data.skills.filter(Boolean).length === 0
    case 'languages':   return !data.languages.some(l => l.name)
    case 'conferences': return !(data.conferences ?? []).some(c => c.name)
    case 'activities':  return !(data.activities ?? []).some(a => a.name)
    default: return true
  }
}

// ── Classic Template ───────────────────────────────────────────────────────────

const CLASSIC_SS: SS = {
  hdr:     { fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#555', borderBottom: '1px solid #d4d4d4', paddingBottom: '4px', margin: '0 0 10px' },
  company: { fontSize: '13px', fontWeight: 600, color: '#111' },
  role:    { fontSize: '11px', fontStyle: 'italic', color: '#555' },
  body:    { fontSize: '11px', color: '#444', lineHeight: 1.7 },
  date:    { fontSize: '9.5px', color: '#999' },
}

function ClassicTemplate({ data, pdfRef }: { data: PreviewData; pdfRef: Ref<HTMLDivElement> }) {
  const contact = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean)
  const body = data.sectionOrder.filter(id => id !== 'personal')
  return (
    <div ref={pdfRef} style={{ width: '794px', minHeight: '1122px', backgroundColor: '#fff', padding: '60px 64px', boxSizing: 'border-box', fontFamily: FONT }}>
      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111', margin: 0 }}>{data.name || '您的姓名'}</h1>
        {data.jobTitle && <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>{data.jobTitle}</p>}
        {contact.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '10px', fontSize: '10px', color: '#888' }}>
            {contact.map((v, i) => <span key={i}>{i > 0 ? <span style={{ margin: '0 3px' }}>·</span> : null}{v}</span>)}
          </div>
        )}
      </div>
      <hr style={{ border: 'none', borderTop: '1.5px solid #ccc', margin: '0 0 22px' }} />
      {body.filter(id => !isSectionEmpty(id, data)).map(id => (
        <div key={id} style={{ marginBottom: '20px' }}>
          <h2 style={CLASSIC_SS.hdr as React.CSSProperties}>{secTitle(data, id)}</h2>
          {renderSectionBody(id, data, CLASSIC_SS)}
        </div>
      ))}
    </div>
  )
}

// ── Modern Template ────────────────────────────────────────────────────────────

const MODERN_SS: SS = {
  hdr:     { fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1c1917', borderBottom: '2px solid #b45309', paddingBottom: '4px', margin: '0 0 12px' },
  company: { fontSize: '13px', fontWeight: 600, color: '#111' },
  role:    { fontSize: '11px', color: '#b45309', fontWeight: 500 },
  body:    { fontSize: '11px', color: '#444', lineHeight: 1.65 },
  date:    { fontSize: '9px', color: '#999' },
}

function ModernTemplate({ data, pdfRef }: { data: PreviewData; pdfRef: Ref<HTMLDivElement> }) {
  const contact = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean)
  const body = data.sectionOrder.filter(id => id !== 'personal' && !SIDEBAR_SECTIONS.includes(id))
  return (
    <div ref={pdfRef} style={{ width: '794px', minHeight: '1122px', backgroundColor: '#fff', display: 'flex', fontFamily: FONT, boxSizing: 'border-box' }}>
      {/* Sidebar */}
      <div style={{ width: '256px', backgroundColor: '#292524', padding: '48px 28px', flexShrink: 0, boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fafaf9', margin: 0, lineHeight: 1.2 }}>{data.name || '您的姓名'}</h1>
        {data.jobTitle && <p style={{ fontSize: '11px', color: '#a8a29e', margin: '6px 0 0' }}>{data.jobTitle}</p>}
        {contact.length > 0 && (
          <div style={{ marginTop: '28px' }}>
            <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#78716c', margin: '0 0 8px' }}>{data.lang === 'zh' ? '聯絡方式' : 'Contact'}</p>
            {contact.map((v, i) => <p key={i} style={{ fontSize: '10px', color: '#a8a29e', margin: '3px 0', wordBreak: 'break-all' }}>{v}</p>)}
          </div>
        )}
        {data.skills.filter(Boolean).length > 0 && (
          <div style={{ marginTop: '28px' }}>
            <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#78716c', margin: '0 0 8px' }}>{secTitle(data, 'skills')}</p>
            {data.skills.filter(Boolean).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#b45309', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: '#d6d3d1' }}>{s}</span>
              </div>
            ))}
          </div>
        )}
        {data.languages.some(l => l.name) && (
          <div style={{ marginTop: '28px' }}>
            <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#78716c', margin: '0 0 8px' }}>{secTitle(data, 'languages')}</p>
            {data.languages.filter(l => l.name).map((l, i) => <p key={i} style={{ fontSize: '10px', color: '#a8a29e', margin: '3px 0' }}>{l.name}{l.level ? ` — ${l.level}` : ''}</p>)}
          </div>
        )}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: '48px 40px', boxSizing: 'border-box' }}>
        {body.filter(id => !isSectionEmpty(id, data)).map(id => (
          <div key={id} style={{ marginBottom: '24px' }}>
            <h2 style={MODERN_SS.hdr as React.CSSProperties}>{secTitle(data, id)}</h2>
            {renderSectionBody(id, data, MODERN_SS)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Minimal Template ───────────────────────────────────────────────────────────

const MINIMAL_SS: SS = {
  hdr:     { fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#111', borderBottom: '0.5px solid #bbb', paddingBottom: '3px', margin: '0 0 10px' },
  company: { fontSize: '12px', fontWeight: 600, color: '#111' },
  role:    { fontSize: '11px', color: '#444' },
  body:    { fontSize: '10.5px', color: '#555', lineHeight: 1.7 },
  date:    { fontSize: '9px', color: '#999' },
}

function MinimalTemplate({ data, pdfRef }: { data: PreviewData; pdfRef: Ref<HTMLDivElement> }) {
  const contact = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean)
  const body = data.sectionOrder.filter(id => id !== 'personal')
  return (
    <div ref={pdfRef} style={{ width: '794px', minHeight: '1122px', backgroundColor: '#fff', padding: '72px 80px', boxSizing: 'border-box', fontFamily: '"Georgia","Times New Roman",serif' }}>
      <h1 style={{ fontSize: '26px', fontWeight: 400, color: '#111', margin: 0, letterSpacing: '-0.2px' }}>{data.name || 'Your Name'}</h1>
      {data.jobTitle && <p style={{ fontSize: '12px', color: '#777', margin: '4px 0 0', fontStyle: 'italic' }}>{data.jobTitle}</p>}
      {contact.length > 0 && (
        <p style={{ fontSize: '9.5px', color: '#999', margin: '8px 0 0' }}>{contact.join('  ·  ')}</p>
      )}
      <div style={{ borderTop: '0.5px solid #ddd', margin: '20px 0' }} />
      {body.filter(id => !isSectionEmpty(id, data)).map(id => (
        <div key={id} style={{ marginBottom: '24px' }}>
          <h2 style={MINIMAL_SS.hdr as React.CSSProperties}>{secTitle(data, id)}</h2>
          {renderSectionBody(id, data, MINIMAL_SS)}
        </div>
      ))}
    </div>
  )
}

// ── Professional Template ──────────────────────────────────────────────────────

const PROF_SS: SS = {
  hdr:     { fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1e3a5f', borderLeft: '3px solid #1e3a5f', paddingLeft: '8px', margin: '0 0 12px' },
  company: { fontSize: '12.5px', fontWeight: 700, color: '#1e3a5f' },
  role:    { fontSize: '11px', color: '#2d5a8e', fontStyle: 'italic' },
  body:    { fontSize: '11px', color: '#333', lineHeight: 1.65 },
  date:    { fontSize: '9px', color: '#888' },
}

function ProfessionalTemplate({ data, pdfRef }: { data: PreviewData; pdfRef: Ref<HTMLDivElement> }) {
  const contact = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean)
  const body = data.sectionOrder.filter(id => id !== 'personal')
  return (
    <div ref={pdfRef} style={{ width: '794px', minHeight: '1122px', backgroundColor: '#fff', boxSizing: 'border-box', fontFamily: FONT }}>
      {/* Navy header bar */}
      <div style={{ backgroundColor: '#1e3a5f', padding: '32px 48px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: 0 }}>{data.name || 'Your Name'}</h1>
        {data.jobTitle && <p style={{ fontSize: '12px', color: '#a8c0d8', margin: '4px 0 0' }}>{data.jobTitle}</p>}
        {contact.length > 0 && (
          <p style={{ fontSize: '9.5px', color: '#8ba5bf', margin: '10px 0 0' }}>{contact.join('  |  ')}</p>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '36px 48px' }}>
        {body.filter(id => !isSectionEmpty(id, data)).map(id => (
          <div key={id} style={{ marginBottom: '22px' }}>
            <h2 style={PROF_SS.hdr as React.CSSProperties}>{secTitle(data, id)}</h2>
            {renderSectionBody(id, data, PROF_SS)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Creative Template ──────────────────────────────────────────────────────────

const CREATIVE_SS: SS = {
  hdr:     { fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c04b2a', borderBottom: '1.5px solid #e07055', paddingBottom: '4px', margin: '0 0 10px' },
  company: { fontSize: '12.5px', fontWeight: 600, color: '#111' },
  role:    { fontSize: '11px', color: '#c04b2a', fontWeight: 500 },
  body:    { fontSize: '11px', color: '#444', lineHeight: 1.65 },
  date:    { fontSize: '9px', color: '#999' },
}

function CreativeTemplate({ data, pdfRef }: { data: PreviewData; pdfRef: Ref<HTMLDivElement> }) {
  const contact = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean)
  const body = data.sectionOrder.filter(id => id !== 'personal' && !SIDEBAR_SECTIONS.includes(id))
  return (
    <div ref={pdfRef} style={{ width: '794px', minHeight: '1122px', backgroundColor: '#fff', display: 'flex', fontFamily: FONT, boxSizing: 'border-box' }}>
      {/* Sidebar */}
      <div style={{ width: '230px', backgroundColor: '#fbf2ee', borderRight: '3px solid #d4562f', padding: '48px 24px', flexShrink: 0, boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#7d2e18', margin: 0, lineHeight: 1.2 }}>{data.name || '您的姓名'}</h1>
        {data.jobTitle && <p style={{ fontSize: '10px', color: '#c04b2a', margin: '6px 0 0' }}>{data.jobTitle}</p>}
        {contact.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c04b2a', margin: '0 0 6px' }}>{data.lang === 'zh' ? '聯絡方式' : 'Contact'}</p>
            {contact.map((v, i) => <p key={i} style={{ fontSize: '9.5px', color: '#666', margin: '3px 0', wordBreak: 'break-all' }}>{v}</p>)}
          </div>
        )}
        {data.skills.filter(Boolean).length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c04b2a', margin: '0 0 6px' }}>{secTitle(data, 'skills')}</p>
            {data.skills.filter(Boolean).map((s, i) => <p key={i} style={{ fontSize: '10px', color: '#444', margin: '3px 0' }}>• {s}</p>)}
          </div>
        )}
        {data.languages.some(l => l.name) && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c04b2a', margin: '0 0 6px' }}>{secTitle(data, 'languages')}</p>
            {data.languages.filter(l => l.name).map((l, i) => <p key={i} style={{ fontSize: '10px', color: '#444', margin: '3px 0' }}>{l.name}{l.level ? ` — ${l.level}` : ''}</p>)}
          </div>
        )}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: '48px 36px', boxSizing: 'border-box' }}>
        {body.filter(id => !isSectionEmpty(id, data)).map(id => (
          <div key={id} style={{ marginBottom: '22px' }}>
            <h2 style={CREATIVE_SS.hdr as React.CSSProperties}>{secTitle(data, id)}</h2>
            {renderSectionBody(id, data, CREATIVE_SS)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export const ResumePreview = forwardRef<HTMLDivElement, { data: PreviewData; template: TemplateId }>(
  ({ data, template }, ref) => {
    if (template === 'modern')       return <ModernTemplate       data={data} pdfRef={ref} />
    if (template === 'minimal')      return <MinimalTemplate      data={data} pdfRef={ref} />
    if (template === 'professional') return <ProfessionalTemplate data={data} pdfRef={ref} />
    if (template === 'creative')     return <CreativeTemplate     data={data} pdfRef={ref} />
    return <ClassicTemplate data={data} pdfRef={ref} />
  }
)

ResumePreview.displayName = 'ResumePreview'
