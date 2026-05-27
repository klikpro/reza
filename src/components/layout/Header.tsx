import { Menu, Search, Bell, Wifi, WifiOff } from 'lucide-react'
import { useState, useEffect } from 'react'

interface HeaderProps {
  onMenuToggle: () => void
  onCommandPalette: () => void
}

export default function Header({ onMenuToggle, onCommandPalette }: HeaderProps) {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header
      className="h-12 border-b flex items-center gap-3 px-4 flex-shrink-0 z-10"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(6,182,212,0.12)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Menu toggle (mobile) */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-1.5 rounded-lg transition-colors hover:bg-white/80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Menu size={18} />
      </button>

      {/* Search bar */}
      <button
        onClick={onCommandPalette}
        className="flex items-center gap-2 flex-1 max-w-sm px-3 py-1.5 rounded-xl border text-sm transition-all hover:border-cyan-300 hover:shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
          borderColor: 'rgba(6,182,212,0.18)',
          color: 'var(--text-muted)',
        }}
      >
        <Search size={13} style={{ color: 'var(--accent)' }} />
        <span className="text-xs">Cari ingatan...</span>
        <kbd
          className="ml-auto text-xs px-1.5 py-0.5 rounded-md border hidden sm:inline-flex items-center"
          style={{ borderColor: 'rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.06)', color: 'var(--accent)', fontSize: 10 }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Online status */}
        {!online && (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>
            <WifiOff size={11} />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}
        {online && (
          <div className="p-1.5 rounded-full" style={{ color: 'rgba(16,185,129,0.7)' }} title="Online">
            <Wifi size={14} />
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative p-1.5 rounded-lg transition-colors hover:bg-white/80"
          style={{ color: 'var(--text-muted)' }}
        >
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}
