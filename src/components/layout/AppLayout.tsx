import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import FloatingMicButton from './FloatingMicButton'
import MobileNav from './MobileNav'
import CommandPalette from '@/components/ui/CommandPalette'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto page-enter" style={{ background: 'var(--bg-primary)' }}>
          <Outlet />
        </main>
      </div>

      {/* Floating Mic Button */}
      <FloatingMicButton />

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
