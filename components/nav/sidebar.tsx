'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut, useSession } from 'next-auth/react'
import { useCommandPalette } from '@/contexts/command-palette'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    emoji: '🏠',
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
    emoji: '📄',
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
    emoji: '🎯',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: '/career-growth',
    label: 'Skill Map',
    emoji: '🌱',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/interview-prep',
    label: 'Interviews',
    emoji: '💬',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/career-intelligence',
    label: 'Analytics',
    emoji: '📊',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { openPalette } = useCommandPalette()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const initial = (session?.user?.name ?? session?.user?.email ?? '用')[0].toUpperCase()

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-warm-200 bg-cream-100">
      {/* Logo — warm wordmark */}
      <div className="px-5 py-5 border-b border-warm-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-terra-500 text-white text-[11px] font-bold shrink-0 shadow-[var(--shadow-warm-sm)]">
            AI
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 tracking-tight leading-none">Career OS</p>
            <p className="text-[10px] text-ink-300 mt-0.5">台灣職涯系統</p>
          </div>
        </div>
      </div>

      {/* Search trigger — notebook style */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={openPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-warm-200 bg-white px-3 py-2 text-xs text-ink-300 hover:border-warm-300 hover:text-ink-400 transition-all shadow-[var(--shadow-warm-xs)] group"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="flex-1 text-left">搜尋...</span>
          <kbd className="rounded border border-warm-200 px-1.5 py-0.5 text-[9px] font-mono text-ink-200 group-hover:border-warm-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-200">
          功能
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                  isActive(item.href)
                    ? 'bg-terra-50 text-terra-700 font-medium border border-terra-100'
                    : 'text-ink-500 hover:bg-cream-300 hover:text-ink-700'
                )}
              >
                <span className={cn(
                  'transition-colors shrink-0',
                  isActive(item.href) ? 'text-terra-500' : 'text-ink-300 group-hover:text-ink-400'
                )}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive(item.href) && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-terra-400 shrink-0" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Quick links */}
        <div className="mt-4 pt-3 border-t border-warm-100">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-200">
            開始
          </p>
          <Link href="/onboarding" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-400 hover:bg-cream-300 hover:text-ink-700 transition-colors">
            <svg className="h-4 w-4 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            完善資料
          </Link>
        </div>
      </nav>

      {/* User section — warm, minimal */}
      <div className="border-t border-warm-200 p-3">
        {session?.user ? (
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
        )}
      </div>
    </aside>
  )
}
