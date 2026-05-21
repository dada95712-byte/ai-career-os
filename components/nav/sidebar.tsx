'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut, useSession } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: '總覽', icon: '📊' },
  { href: '/career-profile', label: '職涯資料', icon: '📄' },
  { href: '/career-match', label: '職缺配對', icon: '🎯' },
  { href: '/career-growth', label: '職涯成長', icon: '🌱' },
  { href: '/interview-prep', label: '面試準備', icon: '💼' },
  { href: '/career-intelligence', label: '職涯分析', icon: '📈' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
          A
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">AI Career OS</p>
          <p className="text-xs text-gray-500">台灣職涯系統</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-100 p-3">
        {session?.user ? (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
              {session.user.name?.[0] ?? session.user.email?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{session.user.name ?? '使用者'}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="登出"
            >
              ↪
            </button>
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            登入
          </Link>
        )}
      </div>
    </aside>
  )
}
