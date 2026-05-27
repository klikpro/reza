import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Check, X, MessageSquare, Tag, Power } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toaster'

interface Template {
  id?: string
  question_label: string
  trigger_keywords: string[]
  answer: string
  category?: string
  is_active: boolean
  created_at?: string
}

const EMPTY: Omit<Template, 'id' | 'created_at'> = {
  question_label: '', trigger_keywords: [], answer: '', category: '', is_active: true,
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    setLoading(true)
    const { data } = await supabase.from('conversation_templates').select('*').order('created_at', { ascending: false })
    setTemplates((data as Template[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const reset = () => { setForm({ ...EMPTY }); setEditingId(null); setShowForm(false); setKeyInput('') }

  const handleSave = async () => {
    if (!form.question_label.trim() || !form.answer.trim()) { toast('Label dan jawaban wajib diisi', 'error'); return }
    setSaving(true)
    if (editingId) {
      await supabase.from('conversation_templates').update(form).eq('id', editingId)
      toast('Template diperbarui', 'success')
    } else {
      await supabase.from('conversation_templates').insert([form])
      toast('✓ Template ditambahkan', 'success')
    }
    setSaving(false)
    reset()
    fetch()
  }

  const handleEdit = (t: Template) => {
    setForm({ question_label: t.question_label, trigger_keywords: t.trigger_keywords, answer: t.answer, category: t.category || '', is_active: t.is_active })
    setEditingId(t.id!)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus template ini?')) return
    await supabase.from('conversation_templates').delete().eq('id', id)
    setTemplates(ts => ts.filter(t => t.id !== id))
    toast('Template dihapus', 'info')
  }

  const toggleActive = async (t: Template) => {
    await supabase.from('conversation_templates').update({ is_active: !t.is_active }).eq('id', t.id!)
    setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
  }

  const addKeyword = () => {
    const k = keyInput.trim().toLowerCase()
    if (k && !form.trigger_keywords.includes(k)) {
      setForm(f => ({ ...f, trigger_keywords: [...f.trigger_keywords, k] }))
      setKeyInput('')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Template Percakapan</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Jawaban otomatis untuk pertanyaan pengunjung berdasarkan kata kunci
          </p>
        </div>
        <button onClick={() => { reset(); setShowForm(true) }} className="btn-primary">
          <Plus size={16} /> Tambah Template
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 overflow-hidden">
            <div className="card p-6 space-y-4">
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Template' : 'Template Baru'}
              </h3>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Label Pertanyaan</label>
                <input className="input-field" value={form.question_label}
                  onChange={e => setForm(f => ({ ...f, question_label: e.target.value }))}
                  placeholder='Contoh: "Jam berapa buka?"' />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Kata Kunci Pemicu <span style={{ color: 'var(--text-muted)' }}>(kata yang memicu jawaban ini)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.trigger_keywords.map(k => (
                    <span key={k} className="badge flex items-center gap-1">
                      <Tag size={10} /> {k}
                      <button onClick={() => setForm(f => ({ ...f, trigger_keywords: f.trigger_keywords.filter(x => x !== k) }))}>×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="input-field flex-1" value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    placeholder="Ketik kata kunci + Enter (misal: buka, jam, open)" />
                  <button onClick={addKeyword} className="btn-secondary text-sm px-3">Tambah</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Jawaban</label>
                <textarea className="input-field resize-none" rows={4} value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  placeholder="Jawaban yang akan diberikan kepada pengunjung..." />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Kategori (opsional)</label>
                <input className="input-field" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Contoh: Jam Operasional, Harga, Kontak" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ background: form.is_active ? 'var(--accent)' : 'var(--bg-tertiary)' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: form.is_active ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                  Aktif
                </label>
                <div className="flex gap-3">
                  <button onClick={reset} className="btn-secondary text-sm">Batal</button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                    {editingId ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card p-4 space-y-2"><div className="skeleton h-5 w-1/3" /><div className="skeleton h-4 w-3/4" /></div>)}
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-16 text-center">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Belum ada template</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Buat template untuk menjawab pertanyaan umum pengunjung</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {templates.map(t => (
              <motion.div key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="card p-5 group" style={{ opacity: t.is_active ? 1 : 0.5 }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.question_label}</h3>
                      {t.category && <span className="badge text-xs">{t.category}</span>}
                      {!t.is_active && <span className="badge text-xs" style={{ color: 'var(--text-muted)' }}>Nonaktif</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {t.trigger_keywords.map(k => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(124,92,252,0.1)', color: 'var(--accent)', border: '1px solid rgba(124,92,252,0.2)' }}>
                          {k}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.answer}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => toggleActive(t)} title={t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className="p-2 rounded-lg" style={{ color: t.is_active ? 'var(--success)' : 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Power size={14} />
                    </button>
                    <button onClick={() => handleEdit(t)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(t.id!)} className="p-2 rounded-lg" style={{ color: 'var(--error)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
