import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Memory } from '@/types'

interface MemoryState {
  memories: Memory[]
  loading: boolean
  error: string | null
  searchQuery: string
  filterCategory: string | null
  filterTags: string[]
  filterSource: string | null
  viewMode: 'grid' | 'list' | 'timeline'
  sortBy: 'newest' | 'oldest' | 'relevance'
  selectedIds: string[]

  fetchMemories: (userId: string) => Promise<void>
  addMemory: (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) => Promise<Memory | null>
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  togglePin: (id: string, isPinned: boolean) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>
  bulkAssignCategory: (ids: string[], categoryId: string) => Promise<void>
  setSearchQuery: (q: string) => void
  setFilterCategory: (id: string | null) => void
  setFilterTags: (tags: string[]) => void
  setFilterSource: (s: string | null) => void
  setViewMode: (m: 'grid' | 'list' | 'timeline') => void
  setSortBy: (s: 'newest' | 'oldest' | 'relevance') => void
  toggleSelect: (id: string) => void
  clearSelection: () => void
  selectAll: () => void
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  loading: false,
  error: null,
  searchQuery: '',
  filterCategory: null,
  filterTags: [],
  filterSource: null,
  viewMode: 'grid',
  sortBy: 'newest',
  selectedIds: [],

  fetchMemories: async (userId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('memories')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ memories: (data as Memory[]) || [], loading: false })
    }
  },

  addMemory: async (memory) => {
    const { data, error } = await supabase
      .from('memories')
      .insert([memory])
      .select('*, category:categories(*)')
      .single()

    if (error || !data) return null
    const newMemory = data as Memory
    set(state => ({ memories: [newMemory, ...state.memories] }))
    return newMemory
  },

  updateMemory: async (id, updates) => {
    const { data, error } = await supabase
      .from('memories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single()

    if (!error && data) {
      set(state => ({
        memories: state.memories.map(m => m.id === id ? data as Memory : m),
      }))
    }
  },

  deleteMemory: async (id) => {
    await supabase.from('memories').delete().eq('id', id)
    set(state => ({ memories: state.memories.filter(m => m.id !== id) }))
  },

  togglePin: async (id, isPinned) => {
    await get().updateMemory(id, { is_pinned: isPinned })
  },

  bulkDelete: async (ids) => {
    await supabase.from('memories').delete().in('id', ids)
    set(state => ({
      memories: state.memories.filter(m => !ids.includes(m.id)),
      selectedIds: [],
    }))
  },

  bulkAssignCategory: async (ids, categoryId) => {
    await supabase.from('memories').update({ category_id: categoryId }).in('id', ids)
    set(state => ({
      memories: state.memories.map(m =>
        ids.includes(m.id) ? { ...m, category_id: categoryId } : m
      ),
      selectedIds: [],
    }))
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterCategory: (id) => set({ filterCategory: id }),
  setFilterTags: (tags) => set({ filterTags: tags }),
  setFilterSource: (s) => set({ filterSource: s }),
  setViewMode: (m) => set({ viewMode: m }),
  setSortBy: (s) => set({ sortBy: s }),

  toggleSelect: (id) => set(state => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(i => i !== id)
      : [...state.selectedIds, id],
  })),

  clearSelection: () => set({ selectedIds: [] }),
  selectAll: () => set(state => ({ selectedIds: state.memories.map(m => m.id) })),
}))
