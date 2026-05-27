import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Edit2, Save, Tag, Volume2, Trash2, Pin, Calendar, Mic } from 'lucide-react'
import type { Memory, Category } from '@/types'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { formatRelativeTime } from '@/lib/utils'
import { createTTSProvider } from '@/services/ttsService'
import { toast } from '@/components/ui/Toaster'

interface Props {
  memory: Memory | null
  onClose: () => void
}

export default function MemoryModal({ memory, onClose }: Props) {
  const { updateMemory, deleteMemory, togglePin } = useMemoryStore()
  const { categories } = useCategoryStore()
  const { settings } = useSettingsStore()
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (memory) {
      setContent(memory.content)
      setTags([...memory.tags])
      setCategoryId(memory.category_id || null)
      setEditing(false)
    }
  }, [memory])

  if (!memory) return null

  const handleSave = async () => {
    setSaving(true)
    await updateMemory(memory.id, { content, tags, category_id: categoryId || undefined })
    setSaving(false)
    setEditing(false)
    toast('✓ Ingatan diperbarui', 'success')
  }

  const handleDelete = async () => {
    if (confirm('Hapus ingatan ini?')) {
      await deleteMemory(memory.id)
      toast('Ingatan dihapus', 'info')
      onClose()
    }
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

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl rounded-2xl border overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              {memory.category && (
                <span className="text-xl">{memory.category.icon}</span>
              )}
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Detail Ingatan</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatRelativeTime(memory.created_at)}
                  </span>
                  {memory.source === 'voice' && (
                    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      <Mic size={9} /> Suara
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSpeak} title="Baca keras"
                className="p-2 rounded-lg transition-colors"
                style={{ color: speaking ? 'var(--accent)' : 'var(--text-muted)' }}>
                <Volume2 size={16} />
              </button>
              <button onClick={() => togglePin(memory.id, !memory.is_pinned)} title="Sematkan"
                className="p-2 rounded-lg transition-colors"
                style={{ color: memory.is_pinned ? 'var(--accent)' : 'var(--text-muted)' }}>
                <Pin size={16} />
              </button>
              <button onClick={handleDelete}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--error)' }}>
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Isi Ingatan</label>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'var(--accent)' }}>
                    <Edit2 size={12} /> Edit
                  </button>
                )}
              </div>
              {editing ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={6}
                  className="input-field resize-none"
                  autoFocus
                />
              ) : (
                <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {memory.content}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>Kategori</label>
              <select
                value={categoryId || ''}
                onChange={e => setCategoryId(e.target.value || null)}
                className="input-field"
                disabled={!editing}
              >
                <option value="">Tanpa Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 badge">
                    <Tag size={9} /> {tag}
                    {editing && (
                      <button onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-1 text-xs">×</button>
                    )}
                  </span>
                ))}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                    placeholder="Tambah tag..."
                    className="input-field flex-1"
                  />
                  <button onClick={addTag} className="btn-secondary px-3 text-sm">Tambah</button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {editing && (
            <div className="p-5 border-t flex items-center justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
