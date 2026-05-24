'use client'

import { forwardRef } from 'react'

// ── Shared data type passed in from the editor ─────────────────────────────────

export interface PreviewData {
  name: string; jobTitle: string
  email: string; phone: string; location: string
  linkedin: string; website: string; summary: string
  skills: string[]
  experiences: { company: string; title: string; description: string; startDate: string; endDate: string; current: boolean }[]
  education: { school: string; major: string; degree: string; startDate: string; endDate: string }[]
  languages: { id: string; name: string; level: string }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function dateRange(start: string, end: string, current: boolean) {
  const parts = [start, current ? '至今' : end].filter(Boolean)
  return parts.join(' – ')
}

// ── Classic Template ───────────────────────────────────────────────────────────

function ClassicSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{
        fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: '#555',
        borderBottom: '1px solid #d4d4d4', paddingBottom: '4px',
        marginBottom: '10px', margin: '0 0 10px',
      }}>{title}</h2>
      {children}
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export const ResumePreview = forwardRef<HTMLDivElement, { data: PreviewData; template: 'classic' | 'modern' }>(
  ({ data, template }, ref) => {
    const hasExps = data.experiences.some(e => e.company || e.title)
    const hasEdus = data.education.some(e => e.school)
    const hasLangs = data.languages.some(l => l.name)
    const contactParts = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean)

    // ── Modern ───────────────────────────────────────────────────────────────
    if (template === 'modern') {
      return (
        <div ref={ref} style={{
          width: '794px', minHeight: '1122px', backgroundColor: '#fff', display: 'flex',
          fontFamily: '"Noto Sans TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif',
          boxSizing: 'border-box',
        }}>
          {/* Sidebar */}
          <div style={{ width: '256px', backgroundColor: '#292524', padding: '48px 28px', flexShrink: 0, boxSizing: 'border-box' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fafaf9', margin: 0, lineHeight: 1.2 }}>
              {data.name || '您的姓名'}
            </h1>
            {data.jobTitle && (
              <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '6px', margin: '6px 0 0' }}>{data.jobTitle}</p>
            )}

            {/* Contact */}
            {contactParts.length > 0 && (
              <div style={{ marginTop: '28px' }}>
                <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#78716c', marginBottom: '8px', margin: '0 0 8px' }}>聯絡方式</p>
                {contactParts.map((v, i) => (
                  <p key={i} style={{ fontSize: '10px', color: '#a8a29e', margin: '3px 0', wordBreak: 'break-all' }}>{v}</p>
                ))}
              </div>
            )}

            {/* Skills */}
            {data.skills.filter(Boolean).length > 0 && (
              <div style={{ marginTop: '28px' }}>
                <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#78716c', marginBottom: '8px', margin: '0 0 8px' }}>技能</p>
                {data.skills.filter(Boolean).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#b45309', flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', color: '#d6d3d1' }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Languages */}
            {hasLangs && (
              <div style={{ marginTop: '28px' }}>
                <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#78716c', marginBottom: '8px', margin: '0 0 8px' }}>語言</p>
                {data.languages.filter(l => l.name).map((l, i) => (
                  <p key={i} style={{ fontSize: '10px', color: '#a8a29e', margin: '3px 0' }}>
                    {l.name}{l.level ? ` — ${l.level}` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: '48px 40px', boxSizing: 'border-box' }}>
            {data.summary && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1c1917', borderBottom: '2px solid #b45309', paddingBottom: '4px', marginBottom: '10px', margin: '0 0 10px' }}>個人摘要</h2>
                <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.7 }}>{data.summary}</p>
              </div>
            )}
            {hasExps && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1c1917', borderBottom: '2px solid #b45309', paddingBottom: '4px', marginBottom: '12px', margin: '0 0 12px' }}>工作經歷</h2>
                {data.experiences.filter(e => e.company || e.title).map((exp, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{exp.company}</span>
                      <span style={{ fontSize: '9px', color: '#999' }}>{dateRange(exp.startDate, exp.endDate, exp.current)}</span>
                    </div>
                    {exp.title && <p style={{ fontSize: '11px', color: '#b45309', margin: '2px 0', fontWeight: 500 }}>{exp.title}</p>}
                    {exp.description && <p style={{ fontSize: '11px', color: '#444', marginTop: '4px', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{exp.description}</p>}
                  </div>
                ))}
              </div>
            )}
            {hasEdus && (
              <div>
                <h2 style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1c1917', borderBottom: '2px solid #b45309', paddingBottom: '4px', marginBottom: '12px', margin: '0 0 12px' }}>學歷</h2>
                {data.education.filter(e => e.school).map((edu, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{edu.school}</span>
                      <span style={{ fontSize: '9px', color: '#999' }}>{dateRange(edu.startDate, edu.endDate, false)}</span>
                    </div>
                    {(edu.degree || edu.major) && (
                      <p style={{ fontSize: '11px', color: '#555', margin: '2px 0' }}>{[edu.degree, edu.major].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    // ── Classic ───────────────────────────────────────────────────────────────
    return (
      <div ref={ref} style={{
        width: '794px', minHeight: '1122px', backgroundColor: '#ffffff',
        padding: '60px 64px', boxSizing: 'border-box',
        fontFamily: '"Noto Sans TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111', margin: 0, letterSpacing: '-0.3px' }}>
            {data.name || '您的姓名'}
          </h1>
          {data.jobTitle && (
            <p style={{ fontSize: '13px', color: '#666', marginTop: '4px', margin: '4px 0 0' }}>{data.jobTitle}</p>
          )}
          {contactParts.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '10px', fontSize: '10px', color: '#888' }}>
              {contactParts.map((v, i) => (
                <span key={i}>{i > 0 ? <span style={{ margin: '0 3px' }}>·</span> : null}{v}</span>
              ))}
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1.5px solid #ccc', margin: '0 0 22px' }} />

        {data.summary && (
          <ClassicSection title="個人摘要">
            <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.75, margin: 0 }}>{data.summary}</p>
          </ClassicSection>
        )}

        {hasExps && (
          <ClassicSection title="工作經歷">
            {data.experiences.filter(e => e.company || e.title).map((exp, i) => (
              <div key={i} style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{exp.company}</span>
                  <span style={{ fontSize: '9.5px', color: '#999' }}>{dateRange(exp.startDate, exp.endDate, exp.current)}</span>
                </div>
                {exp.title && <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#555', margin: '2px 0 4px' }}>{exp.title}</p>}
                {exp.description && <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>{exp.description}</p>}
              </div>
            ))}
          </ClassicSection>
        )}

        {hasEdus && (
          <ClassicSection title="學歷">
            {data.education.filter(e => e.school).map((edu, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{edu.school}</span>
                  <span style={{ fontSize: '9.5px', color: '#999' }}>{dateRange(edu.startDate, edu.endDate, false)}</span>
                </div>
                {(edu.degree || edu.major) && (
                  <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>{[edu.degree, edu.major].filter(Boolean).join(', ')}</p>
                )}
              </div>
            ))}
          </ClassicSection>
        )}

        {data.skills.filter(Boolean).length > 0 && (
          <ClassicSection title="技能">
            <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.7, margin: 0 }}>{data.skills.filter(Boolean).join('  ·  ')}</p>
          </ClassicSection>
        )}

        {hasLangs && (
          <ClassicSection title="語言">
            {data.languages.filter(l => l.name).map((l, i) => (
              <p key={i} style={{ fontSize: '11px', color: '#444', margin: '2px 0' }}>{l.name}{l.level ? ` — ${l.level}` : ''}</p>
            ))}
          </ClassicSection>
        )}
      </div>
    )
  }
)

ResumePreview.displayName = 'ResumePreview'
