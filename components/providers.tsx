'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { CommandPaletteProvider } from '@/contexts/command-palette'
import { CommandPalette, CommandPaletteKeyboardShortcut } from '@/components/command-palette'

export function Providers({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      <CommandPaletteProvider>
        <CommandPaletteKeyboardShortcut />
        <CommandPalette />
        {children}
      </CommandPaletteProvider>
    </SessionProvider>
  )
}
