import { Outlet } from 'react-router-dom'
import { useState, useCallback } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import FloatingMicButton from './FloatingMicButton'
import MobileNav from './MobileNav'
import CommandPalette from '@/components/ui/CommandPalette'
import { useWakeWord } from '@/components/voice/useWakeWord'
import { useSettingsStore } from '@/store/useSettingsStore'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { settings } = useSettingsStore()

  // Buka floating mic saat wake word terdeteksi
  const handleWakeDetected = useCallback(() => {
    const btn = document.getElementById('floating-mic-btn')
    btn?.click()
  }, [])

  // Aktifkan wake word listener secara global (hanya jika settings sudah loaded)
  // playConfirmChime tersedia untuk dipakai di VoiceRecorderModal via prop jika diperlukan
  useWakeWord(
    settings ? handleWakeDetected : () => {}
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)', backgroundAttachment: 'fixed' }}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto page-enter" style={{ background: 'transparent' }}>
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
