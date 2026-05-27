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
      className="h-16 border-b flex items-center gap-4 px-4 flex-shrink-0 z-10"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {/* Menu toggle (mobile) */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-lg"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Menu size={20} />
      </button>

      {/* Search bar */}
      <button
        onClick={onCommandPalette}
        className="flex items-center gap-2 flex-1 max-w-md px-3 py-2 rounded-lg border text-sm transition-colors"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        <Search size={15} />
        <span>Cari ingatan... </span>
        <kbd className="ml-auto text-xs px-1.5 py-0.5 rounded border hidden sm:inline-flex items-center"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}>
          ⌘K
        </kbd>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Online status */}
        {!online && (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
            style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--error)' }}>
            <WifiOff size={12} />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}
        {online && (
          <div className="p-1.5 rounded-full" style={{ color: 'var(--text-muted)' }} title="Online">
            <Wifi size={16} />
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
