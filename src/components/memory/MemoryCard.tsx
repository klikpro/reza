import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Edit2, Trash2, Volume2, Copy, Tag, Pin, MoreHorizontal, Check } from 'lucide-react'
import type { Memory } from '@/types'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { formatRelativeTime, truncateText } from '@/lib/utils'
import { createTTSProvider } from '@/services/ttsService'
import { toast } from '@/components/ui/Toaster'

interface MemoryCardProps {
  memory: Memory
  onEdit?: (memory: Memory) => void
  onDetail?: (memory: Memory) => void
}

export default function MemoryCard({ memory, onEdit, onDetail }: MemoryCardProps) {
  const { deleteMemory, togglePin } = useMemoryStore()
  const { settings } = useSettingsStore()
  const [showMenu, setShowMenu] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDelete = async () => {
    if (confirm('Hapus ingatan ini?')) {
      await deleteMemory(memory.id)
      toast('Ingatan dihapus', 'info')
    }
  }

  const handlePin = async () => {
    await togglePin(memory.id, !memory.is_pinned)
    toast(memory.is_pinned ? 'Pin dilepas' : '📌 Disematkan', 'success')
  }

  const handleSpeak = async () => {
    if (!settings) return
    setSpeaking(true)
    try {
      const tts = createTTSProvider(settings)
      await tts.speak(memory.content)
    } catch { toast('Gagal memutar suara', 'error') }
    setSpeaking(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(memory.content)
    setCopied(true)
    toast('Disalin ke clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card p-4 group relative cursor-pointer"
      style={{
        borderColor: memory.is_pinned ? 'var(--accent)' : undefined,
        boxShadow: memory.is_pinned ? '0 0 0 1px var(--accent), 0 4px 16px rgba(124,92,252,0.15)' : undefined,
      }}
      onClick={() => onDetail?.(memory)}
    >
      {/* Pinned badge */}
      {memory.is_pinned && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(124,92,252,0.15)', color: 'var(--accent)' }}>
          <Pin size={10} />
        </div>
      )}

      {/* Category badge */}
      {memory.category && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">{memory.category.icon}</span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: `${memory.category.color}20`,
              color: memory.category.color,
              border: `1px solid ${memory.category.color}40`,
            }}
          >
            {memory.category.name}
          </span>
        </div>
      )}

      {/* Content */}
      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
        {truncateText(memory.content, 180)}
      </p>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {memory.tags.slice(0, 3).map(tag => (
            <span key={tag} className="badge text-xs">
              <Tag size={9} />
              {tag}
            </span>
          ))}
          {memory.tags.length > 3 && (
            <span className="badge text-xs">+{memory.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatRelativeTime(memory.created_at)}
          </span>
          {memory.source === 'voice' && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              🎤
            </span>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <ActionButton onClick={handlePin} title={memory.is_pinned ? 'Lepas pin' : 'Sematkan'}>
            <Pin size={13} style={{ color: memory.is_pinned ? 'var(--accent)' : undefined }} />
          </ActionButton>
          <ActionButton onClick={handleSpeak} title="Baca keras">
            <Volume2 size={13} style={{ color: speaking ? 'var(--accent)' : undefined }} />
          </ActionButton>
          <ActionButton onClick={handleCopy} title="Salin">
            {copied ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
          </ActionButton>
          <ActionButton onClick={() => onEdit?.(memory)} title="Edit">
            <Edit2 size={13} />
          </ActionButton>
          <ActionButton onClick={handleDelete} title="Hapus" danger>
            <Trash2 size={13} />
          </ActionButton>
        </div>
      </div>
    </motion.div>
  )
}

function ActionButton({
  children, onClick, title, danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: danger ? 'var(--error)' : 'var(--text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}
