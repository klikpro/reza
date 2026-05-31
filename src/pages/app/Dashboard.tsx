import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Brain, BookOpen, TrendingUp, Plus, Zap } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import MemoryCard from '@/components/memory/MemoryCard'
import MemoryModal from '@/components/memory/MemoryModal'
import type { Memory } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { memories, fetchMemories, loading } = useMemoryStore()
  const { categories, fetchCategories } = useCategoryStore()
  const { settings, fetchSettings } = useSettingsStore()
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)

  useEffect(() => {
    if (user) {
      fetchMemories(user.id)
      fetchCategories(user.id)
      fetchSettings(user.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const pinnedMemories = memories.filter(m => m.is_pinned)
  const recentMemories = memories.slice(0, 6)

  const thisMonth = memories.filter(m => {
    const d = new Date(m.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat pagi'
    if (h < 17) return 'Selamat siang'
    return 'Selamat malam'
  }

  const stats = [
    { label: 'Total Ingatan', value: memories.length, icon: Brain, color: '#7c5cfc' },
    { label: 'Bulan Ini', value: thisMonth.length, icon: TrendingUp, color: '#60a5fa' },
    { label: 'Kategori', value: categories.length, icon: BookOpen, color: '#34d399' },
    { label: 'Disematkan', value: pinnedMemories.length, icon: Zap, color: '#f97316' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          {greeting()}, {user?.full_name?.split(' ')[0] || 'Pengguna'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Anda memiliki {memories.length} ingatan tersimpan.
          {settings?.ai_enabled && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,92,252,0.15)', color: 'var(--accent)' }}>✨ AI Aktif</span>}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}20` }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {loading ? '—' : stat.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick record CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6 mb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(96,165,250,0.1))', border: '1px solid rgba(124,92,252,0.3)' }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c5cfc, transparent)', transform: 'translate(20%, -20%)' }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Simpan Ingatan Baru
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Klik tombol mic atau tekan tombol di bawah untuk mulai merekam
            </p>
          </div>
          <button
            onClick={() => document.getElementById('floating-mic-btn')?.click()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)', boxShadow: '0 0 20px rgba(124,92,252,0.4)' }}
          >
            <Mic size={18} />
            Rekam
          </button>
        </div>
      </motion.div>

      {/* Pinned memories */}
      {pinnedMemories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            📌 Disematkan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedMemories.slice(0, 3).map(m => (
              <MemoryCard key={m.id} memory={m} onDetail={setSelectedMemory} />
            ))}
          </div>
        </section>
      )}

      {/* Recent memories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            🕒 Terbaru
          </h2>
          <a href="/app/memories" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Lihat semua →
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : recentMemories.length === 0 ? (
          <div className="card p-12 text-center">
            <Brain size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Belum ada ingatan</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Mulai rekam ingatan pertama Anda!</p>
            <button
              onClick={() => document.getElementById('floating-mic-btn')?.click()}
              className="btn-primary mx-auto"
            >
              <Mic size={16} /> Rekam Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentMemories.map(m => (
              <MemoryCard key={m.id} memory={m} onDetail={setSelectedMemory} />
            ))}
          </div>
        )}
      </section>

      <MemoryModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
    </div>
  )
}
