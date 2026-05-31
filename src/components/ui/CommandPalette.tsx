import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command, BookOpen, Settings, Mic, ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMemoryStore } from '@/store/useMemoryStore'
import { truncateText, formatRelativeTime } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const quickActions = [
  { label: 'Ingatan Baru (via Mic)', icon: Mic, action: 'new-memory', shortcut: '⌘N' },
  { label: 'Semua Ingatan', icon: BookOpen, action: 'memories', shortcut: '⌘M' },
  { label: 'Pengaturan', icon: Settings, action: 'settings', shortcut: '⌘,' },
]

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const { memories, setSearchQuery } = useMemoryStore()
  const navigate = useNavigate()

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) onClose()
        else document.dispatchEvent(new CustomEvent('open-command-palette'))
      }
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset query saat palette ditutup
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  // Search results
  const filteredMemories = query.trim()
    ? memories.filter(m =>
      m.content.toLowerCase().includes(query.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 5)
    : memories.slice(0, 5)

  const handleAction = (action: string) => {
    onClose()
    setQuery('')
    switch (action) {
      case 'new-memory':
        document.getElementById('floating-mic-btn')?.click()
        break
      case 'memories':
        navigate('/app/memories')
        break
      case 'settings':
        navigate('/app/settings')
        break
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              type="text"
              placeholder="Cari ingatan atau aksi..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 py-4 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-primary)' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* Quick Actions */}
            {!query && (
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Aksi Cepat
                </p>
                {quickActions.map(action => (
                  <button
                    key={action.action}
                    onClick={() => handleAction(action.action)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <action.icon size={16} style={{ color: 'var(--accent)' }} />
                    <span className="flex-1 text-left">{action.label}</span>
                    <kbd className="text-xs px-1.5 py-0.5 rounded border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}>
                      {action.shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            )}

            {/* Memory Results */}
            <div className="p-2">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {query ? `Hasil untuk "${query}"` : 'Ingatan Terbaru'}
              </p>
              {filteredMemories.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Tidak ada ingatan ditemukan
                </p>
              ) : (
                filteredMemories.map(memory => (
                  <button
                    key={memory.id}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => {
                      // Set search query di store agar Memories page langsung filter
                      if (query.trim()) setSearchQuery(query.trim())
                      navigate('/app/memories')
                      onClose()
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <BookOpen size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{truncateText(memory.content, 80)}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(memory.created_at)}
                      </p>
                    </div>
                    <ArrowRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t flex items-center gap-4 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <span>↑↓ navigasi</span>
            <span>↵ pilih</span>
            <span>Esc tutup</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
