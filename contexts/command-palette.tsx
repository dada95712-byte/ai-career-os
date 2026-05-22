'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface CommandPaletteContextValue {
  open: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: false,
  openPalette: () => {},
  closePalette: () => {},
  togglePalette: () => {},
})

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])
  const togglePalette = useCallback(() => setOpen((v) => !v), [])

  return (
    <CommandPaletteContext.Provider value={{ open, openPalette, closePalette, togglePalette }}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}
