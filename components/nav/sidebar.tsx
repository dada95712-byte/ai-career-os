'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut, useSession } from 'next-auth/react'
import { useCommandPalette } from '@/contexts/command-palette'

// ── Nav items ─────────────────────────────────────────────────────────────────

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/career-profile',
    label: 'Resume Lab',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/career-match',
    label: 'Job Pipeline',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: '/career-growth',
    label: 'Skill Map',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/interview-prep',
    label: 'Interviews',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/career-intelligence',
    label: 'Analytics',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

// ── Tooltip (fixed-positioned, escapes overflow-hidden) ───────────────────────

function Tip({ label, tipY }: { label: string; tipY: number }) {
  return (
    <div
      style={{ top: tipY, left: 72, transform: 'translateY(-50%)' }}
      className="fixed z-[200] pointer-events-none select-none whitespace-nowrap rounded-md bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
    >
      {label}
    </div>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────

type NavItemData = typeof navItems[0]

function NavItem({ item, active, collapsed }: { item: NavItemData; active: boolean; collapsed: boolean }) {
  const [tipY, setTipY] = useState<number | null>(null)

  return (
    <div
      onMouseEnter={(e) => {
        if (collapsed) setTipY(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)
      }}
      onMouseLeave={() => setTipY(null)}
    >
      <Link
        href={item.href}
        className={cn(
          'group/link flex items-center rounded-lg transition-all duration-150',
          collapsed ? 'justify-center py-2.5 px-0 mx-1' : 'gap-3 px-3 py-2',
          active
            ? 'bg-terra-50 text-terra-700 font-medium border border-terra-100'
            : 'text-ink-500 hover:bg-cream-300 hover:text-ink-700'
        )}
      >
        <span className={cn(
          'shrink-0 transition-colors',
          active ? 'text-terra-500' : 'text-ink-300 group-hover/link:text-ink-400'
        )}>
          {item.icon}
        </span>
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-terra-400 shrink-0" />}
          </>
        )}
      </Link>
      {tipY !== null && <Tip label={item.label} tipY={tipY} />}
    </div>
  )
}

// ── Onboarding link ───────────────────────────────────────────────────────────

function OnboardingLink({ collapsed }: { collapsed: boolean }) {
  const [tipY, setTipY] = useState<number | null>(null)
  const onboardingIcon = (
    <svg className="h-4 w-4 shrink-0 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )

  return (
    <div
      onMouseEnter={(e) => {
        if (collapsed) setTipY(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)
      }}
      onMouseLeave={() => setTipY(null)}
    >
      <Link
        href="/onboarding"
        className={cn(
          'flex items-center rounded-lg text-sm text-ink-400 hover:bg-cream-300 hover:text-ink-700 transition-colors',
          collapsed ? 'justify-center py-2.5 px-0 mx-1' : 'gap-3 px-3 py-2'
        )}
      >
        {onboardingIcon}
        {!collapsed && '完善資料'}
      </Link>
      {tipY !== null && <Tip label="完善資料" tipY={tipY} />}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { openPalette } = useCommandPalette()
  const [collapsed, setCollapsed] = useState(false)
  const [searchTipY, setSearchTipY] = useState<number | null>(null)
  const [userTipY, setUserTipY] = useState<number | null>(null)

  useEffect(() => {
    if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const initial = (session?.user?.name ?? session?.user?.email ?? '用')[0].toUpperCase()

  return (
    <aside
      style={{ width: collapsed ? 64 : 224, transition: 'width 200ms ease' }}
      className="relative flex h-screen shrink-0 flex-col border-r border-warm-200 bg-cream-100 overflow-hidden"
    >
      {/* ── Logo + toggle ── */}
      <div className={cn(
        'flex items-center border-b border-warm-100 shrink-0',
        collapsed ? 'justify-between px-2 py-4' : 'justify-between px-5 py-5'
      )}>
        <div className={cn('flex items-center min-w-0', !collapsed && 'gap-2.5')}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-terra-500 text-white text-[11px] font-bold shrink-0 shadow-[var(--shadow-warm-sm)]">
            AI
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900 tracking-tight leading-none">Career OS</p>
              <p className="text-[10px] text-ink-300 mt-0.5">台灣職涯系統</p>
            </div>
          )}
        </div>
        <button
          onClick={toggle}
          title={collapsed ? '展開側邊欄' : '收合側邊欄'}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warm-200 hover:bg-warm-300 text-ink-500 text-[13px] leading-none transition-colors"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* ── Search ── */}
      <div className={cn('pt-3 pb-1', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          <div
            onMouseEnter={(e) => setSearchTipY(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)}
            onMouseLeave={() => setSearchTipY(null)}
          >
            <button
              onClick={openPalette}
              className="flex w-full items-center justify-center rounded-lg border border-warm-200 bg-white p-2 text-ink-300 hover:border-warm-300 hover:text-ink-400 transition-all shadow-[var(--shadow-warm-xs)]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            {searchTipY !== null && <Tip label="搜尋  ⌘K" tipY={searchTipY} />}
          </div>
        ) : (
          <button
            onClick={openPalette}
            className="flex w-full items-center gap-2 rounded-lg border border-warm-200 bg-white px-3 py-2 text-xs text-ink-300 hover:border-warm-300 hover:text-ink-400 transition-all shadow-[var(--shadow-warm-xs)] group"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="flex-1 text-left">搜尋...</span>
            <kbd className="rounded border border-warm-200 px-1.5 py-0.5 text-[9px] font-mono text-ink-200 group-hover:border-warm-300">⌘K</kbd>
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-200">功能</p>
        )}
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavItem item={item} active={isActive(item.href)} collapsed={collapsed} />
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-3 border-t border-warm-100">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-200">開始</p>
          )}
          <OnboardingLink collapsed={collapsed} />
        </div>
      </nav>

      {/* ── User section ── */}
      <div className="border-t border-warm-200 p-3 shrink-0">
        {collapsed ? (
          <div
            onMouseEnter={(e) => setUserTipY(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)}
            onMouseLeave={() => setUserTipY(null)}
            className="flex justify-center"
          >
            {session?.user ? (
              <button onClick={() => signOut()} title="登出"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-terra-100 text-xs font-semibold text-terra-600 hover:ring-2 hover:ring-terra-300 transition-all">
                {initial}
              </button>
            ) : (
              <Link href="/auth/signin"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-terra-500 text-white text-xs font-bold hover:bg-terra-600 transition-colors">
                人
              </Link>
            )}
            {userTipY !== null && (
              <Tip
                label={session?.user ? (session.user.name ?? session.user.email ?? '使用者') : '登入 / 註冊'}
                tipY={userTipY}
              />
            )}
          </div>
        ) : (
          session?.user ? (
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-cream-200 transition-colors">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-terra-100 text-xs font-semibold text-terra-600">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink-700 truncate">{session.user.name ?? '使用者'}</p>
                <p className="text-[10px] text-ink-300 truncate">{session.user.email}</p>
              </div>
              <button onClick={() => signOut()} title="登出"
                className="text-ink-200 hover:text-ink-400 transition-colors shrink-0">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <Link href="/auth/signin"
              className="flex items-center justify-center rounded-lg bg-terra-500 px-3 py-2 text-xs font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-xs)]">
              登入 / 註冊
            </Link>
          )
        )}
      </div>
    </aside>
  )
}
