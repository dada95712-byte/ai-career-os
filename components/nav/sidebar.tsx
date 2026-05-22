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
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/career-profile',
    label: 'Resume Lab',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    href: '/career-match',
    label: 'Job Pipeline',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
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
    label: 'Interview Arena',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { openPalette } = useCommandPalette()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const initial = (session?.user?.name ?? session?.user?.email ?? '?')[0].toUpperCase()

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand text-white text-xs font-bold shrink-0">
          AI
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100 leading-none">Career OS</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">台灣職涯系統</p>
        </div>
      </div>

      {/* Command palette trigger */}
      <div className="px-3 mb-2">
        <button
          onClick={openPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-colors group"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="flex-1 text-left">搜尋指令...</span>
          <kbd className="rounded border border-zinc-700 px-1 py-0.5 text-[9px] font-mono group-hover:border-zinc-600">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Navigation
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-100',
                  isActive(item.href)
                    ? 'bg-indigo-600/15 text-indigo-400 font-medium border border-indigo-500/20'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                )}
              >
                <span className={cn(
                  'transition-colors',
                  isActive(item.href) ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-400'
                )}>
                  {item.icon}
                </span>
                {item.label}
                {isActive(item.href) && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-800 p-3">
        {session?.user ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-400">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">{session.user.name ?? '使用者'}</p>
              <p className="text-[10px] text-zinc-600 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              title="登出"
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="flex items-center justify-center rounded-lg gradient-brand px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            登入 / 註冊
          </Link>
        )}
      </div>
    </aside>
  )
}
