import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Tag, X, Check, Palette } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import type { Category } from '@/types'
import { toast } from '@/components/ui/Toaster'

const COLORS = ['#7c5cfc', '#60a5fa', '#34d399', '#f97316', '#f43f5e', '#fbbf24', '#a78bfa', '#2dd4bf', '#e879f9', '#fb7185']
const ICONS = ['📁', '🧠', '💡', '❤️', '🎯', '📚', '🎵', '🏠', '💼', '🌟', '🔑', '📝', '🎨', '🛒', '💊', '🏋️', '✈️', '🍕', '💻', '📸']

export default function Categories() {
  const { user } = useAuthStore()
  const { categories, loading, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore()
  const { memories } = useMemoryStore()

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', color: '#7c5cfc', icon: '📁' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchCategories(user.id)
  }, [user])

  const resetForm = () => {
    setForm({ name: '', color: '#7c5cfc', icon: '📁' })
    setShowAdd(false)
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !user) return
    setSaving(true)

    if (editingId) {
      await updateCategory(editingId, form)
      toast('Kategori diperbarui', 'success')
    } else {
      await addCategory({ ...form, user_id: user.id })
      toast('✓ Kategori ditambahkan', 'success')
    }

    setSaving(false)
    resetForm()
  }

  const handleEdit = (cat: Category) => {
    setForm({ name: cat.name, color: cat.color, icon: cat.icon })
    setEditingId(cat.id)
    setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini? Ingatan dalam kategori ini akan kehilangan kategori.')) return
    await deleteCategory(id)
    toast('Kategori dihapus', 'info')
  }

  const getCategoryMemoryCount = (catId: string) =>
    memories.filter(m => m.category_id === catId).length

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Kelola Kategori</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {categories.length} kategori · Organisir ingatan Anda
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', color: '#7c5cfc', icon: '📁' }) }}
          className="btn-primary"
        >
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(showAdd || editingId) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="card p-6">
              <h3 className="font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Kategori' : 'Kategori Baru'}
              </h3>

              {/* Name */}
              <div className="mb-4">
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--text-muted)' }}>Nama Kategori</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama kategori..."
                  className="input-field"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {/* Icon picker */}
              <div className="mb-4">
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--text-muted)' }}>Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      className="w-9 h-9 rounded-lg text-lg transition-all"
                      style={{
                        background: form.icon === icon ? `${form.color}30` : 'var(--bg-tertiary)',
                        border: `2px solid ${form.icon === icon ? form.color : 'transparent'}`,
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div className="mb-5">
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--text-muted)' }}>Warna</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        background: color,
                        transform: form.color === color ? 'scale(1.2)' : 'scale(1)',
                        outline: form.color === color ? `3px solid ${color}` : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mb-5 flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Preview:</span>
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: `${form.color}20`, color: form.color, border: `1px solid ${form.color}40` }}
                >
                  {form.icon} {form.name || 'Nama Kategori'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="btn-primary">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                  {editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
                </button>
                <button onClick={resetForm} className="btn-secondary">Batal</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="skeleton h-5 w-1/2" />
              <div className="skeleton h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="card p-16 text-center">
          <Tag size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Belum ada kategori</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Buat kategori untuk mengorganisir ingatan Anda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {categories.map(cat => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card p-5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${cat.color}20`, border: `1px solid ${cat.color}30` }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {getCategoryMemoryCount(cat.id)} ingatan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(cat)} className="p-2 rounded-lg"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg"
                      style={{ color: 'var(--error)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Color strip */}
                <div className="mt-4 h-1 rounded-full" style={{ background: cat.color, opacity: 0.5 }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
