import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Grid, List, Clock, Filter, SortAsc, Download, Upload,
  Trash2, Tag, Check, X, Plus, Brain, ChevronDown
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import MemoryCard from '@/components/memory/MemoryCard'
import MemoryModal from '@/components/memory/MemoryModal'
import type { Memory } from '@/types'
import { exportToJSON, exportToTXT, debounce } from '@/lib/utils'
import { toast } from '@/components/ui/Toaster'

type ViewMode = 'grid' | 'list' | 'timeline'

export default function Memories() {
  const { user } = useAuthStore()
  const {
    memories, loading, fetchMemories,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterTags, setFilterTags,
    filterSource, setFilterSource,
    viewMode, setViewMode,
    sortBy, setSortBy,
    selectedIds, toggleSelect, clearSelection, selectAll, bulkDelete, bulkAssignCategory,
  } = useMemoryStore()
  const { categories } = useCategoryStore()
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  useEffect(() => {
    if (user) fetchMemories(user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Filtered + sorted memories
  const filtered = useMemo(() => {
    let result = [...memories]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        m.content.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q)) ||
        m.summary?.toLowerCase().includes(q)
      )
    }

    if (filterCategory) {
      result = result.filter(m => m.category_id === filterCategory)
    }

    if (filterTags.length > 0) {
      result = result.filter(m => filterTags.every(t => m.tags.includes(t)))
    }

    if (filterSource) {
      result = result.filter(m => m.source === filterSource)
    }

    if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else {
      result.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    return result
  }, [memories, searchQuery, filterCategory, filterTags, filterSource, sortBy])

  const handleBulkDelete = async () => {
    if (!confirm(`Hapus ${selectedIds.length} ingatan?`)) return
    await bulkDelete(selectedIds)
    toast(`${selectedIds.length} ingatan dihapus`, 'success')
  }

  const handleBulkAssign = async () => {
    if (!bulkCategoryId) return
    await bulkAssignCategory(selectedIds, bulkCategoryId)
    toast('Kategori diperbarui', 'success')
  }

  const handleExport = (format: 'json' | 'txt') => {
    const toExport = selectedIds.length > 0
      ? filtered.filter(m => selectedIds.includes(m.id))
      : filtered

    if (format === 'json') {
      exportToJSON(toExport, `memoryvault-${Date.now()}.json`)
    } else {
      exportToTXT(toExport.map(m => m.content), `memoryvault-${Date.now()}.txt`)
    }
    toast('Export berhasil!', 'success')
  }

  const stats = [
    { label: 'Total', value: memories.length },
    { label: 'Ditampilkan', value: filtered.length },
    { label: 'Disematkan', value: memories.filter(m => m.is_pinned).length },
    { label: 'Via Suara', value: memories.filter(m => m.source === 'voice').length },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Kumpulan Ingatan</h1>
        {/* Mini stats */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {stats.map(s => (
            <span key={s.label} className="text-sm" style={{ color: 'var(--text-muted)' }}>
              <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>{s.value}</span> {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari ingatan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        {/* View mode */}
        <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {(['grid', 'list', 'timeline'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="p-2 text-xs transition-colors"
              style={{
                background: viewMode === mode ? 'var(--accent)' : 'transparent',
                color: viewMode === mode ? 'white' : 'var(--text-muted)',
              }}
              title={mode}
            >
              {mode === 'grid' ? <Grid size={15} /> : mode === 'list' ? <List size={15} /> : <Clock size={15} />}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'newest' | 'oldest')}
          className="input-field w-auto text-sm"
          style={{ width: 'auto', minWidth: 120 }}
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="relevance">Relevansi</option>
        </select>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm"
          style={{
            borderColor: showFilters ? 'var(--accent)' : 'var(--border)',
            color: showFilters ? 'var(--accent)' : 'var(--text-secondary)',
            background: showFilters ? 'rgba(124,92,252,0.08)' : 'transparent',
          }}
        >
          <Filter size={14} /> Filter
          {(filterCategory || filterTags.length > 0 || filterSource) && (
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
          )}
        </button>

        {/* Export */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => handleExport('json')} className="btn-secondary text-xs p-2" title="Export JSON">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="card p-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-48">
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Kategori</label>
                <select
                  value={filterCategory || ''}
                  onChange={e => setFilterCategory(e.target.value || null)}
                  className="input-field text-sm"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Sumber</label>
                <select
                  value={filterSource || ''}
                  onChange={e => setFilterSource(e.target.value || null)}
                  className="input-field text-sm"
                >
                  <option value="">Semua Sumber</option>
                  <option value="voice">🎤 Suara</option>
                  <option value="text">⌨️ Teks</option>
                  <option value="import">📁 Import</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setFilterCategory(null); setFilterTags([]); setFilterSource(null) }}
                  className="btn-secondary text-sm flex items-center gap-1.5">
                  <X size={14} /> Reset Filter
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="mb-5 flex flex-wrap items-center gap-3 p-4 rounded-xl border"
            style={{ background: 'rgba(124,92,252,0.08)', borderColor: 'rgba(124,92,252,0.3)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              {selectedIds.length} dipilih
            </span>
            <select
              value={bulkCategoryId}
              onChange={e => setBulkCategoryId(e.target.value)}
              className="input-field text-sm w-auto"
              style={{ minWidth: 140 }}
            >
              <option value="">Pindah ke kategori...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            {bulkCategoryId && (
              <button onClick={handleBulkAssign} className="btn-primary text-xs">
                <Tag size={13} /> Assign
              </button>
            )}
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--error)' }}>
              <Trash2 size={13} /> Hapus
            </button>
            <button onClick={clearSelection} className="btn-secondary text-xs ml-auto">
              <X size={13} /> Batal
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memories Grid/List/Timeline */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-1/3 mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Brain size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Tidak ada ingatan</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Mulai rekam ingatan pertama Anda!'}
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        <TimelineView memories={filtered} onDetail={setSelectedMemory} />
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'flex flex-col gap-3'
        }>
          <AnimatePresence>
            {filtered.map(m => (
              <div key={m.id} className="relative">
                {/* Select checkbox */}
                <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100"
                  style={{ opacity: selectedIds.includes(m.id) ? 1 : undefined }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    className="w-4 h-4 cursor-pointer"
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
                <MemoryCard
                  memory={m}
                  onDetail={setSelectedMemory}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <MemoryModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
    </div>
  )
}

function TimelineView({ memories, onDetail }: { memories: Memory[]; onDetail: (m: Memory) => void }) {
  const grouped: Record<string, Memory[]> = {}
  memories.forEach(m => {
    const date = new Date(m.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(m)
  })

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([date, mems]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{date}</h3>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
          <div className="pl-6 space-y-3">
            {mems.map(m => (
              <MemoryCard key={m.id} memory={m} onDetail={onDetail} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
