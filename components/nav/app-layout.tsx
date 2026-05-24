'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'

const BOTTOM_NAV = [
  { href: '/dashboard',            icon: '🏠', label: 'Home' },
  { href: '/career-profile',       icon: '📄', label: '履歷' },
  { href: '/career-match',         icon: '🎯', label: '職缺' },
  { href: '/career-growth',        icon: '🌱', label: '技能' },
  { href: '/interview-prep',       icon: '💬', label: '面試' },
  { href: '/career-intelligence',  icon: '📊', label: '分析' },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto bg-cream-50 pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-warm-200 bg-white">
        {BOTTOM_NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-center transition-colors ${
                active ? 'text-terra-600' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`text-[9px] font-medium ${active ? 'text-terra-500' : ''}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
