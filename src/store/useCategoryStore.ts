import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

interface CategoryState {
  categories: Category[]
  loading: boolean
  fetchCategories: (userId: string) => Promise<void>
  addCategory: (cat: Omit<Category, 'id' | 'created_at'>) => Promise<Category | null>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,

  fetchCategories: async (userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    // Also get memory counts
    const { data: counts } = await supabase
      .from('memories')
      .select('category_id')
      .eq('user_id', userId)
      .not('category_id', 'is', null)

    const countMap: Record<string, number> = {}
    if (counts) {
      counts.forEach(m => {
        if (m.category_id) {
          countMap[m.category_id] = (countMap[m.category_id] || 0) + 1
        }
      })
    }

    if (!error && data) {
      set({
        categories: data.map(c => ({ ...c, memory_count: countMap[c.id] || 0 })) as Category[],
        loading: false,
      })
    } else {
      set({ loading: false })
    }
  },

  addCategory: async (cat) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([cat])
      .select()
      .single()

    if (error || !data) return null
    const newCat = { ...data, memory_count: 0 } as Category
    set(state => ({ categories: [...state.categories, newCat] }))
    return newCat
  },

  updateCategory: async (id, updates) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      set(state => ({
        categories: state.categories.map(c => c.id === id ? { ...c, ...data } : c),
      }))
    }
  },

  deleteCategory: async (id) => {
    await supabase.from('categories').delete().eq('id', id)
    set(state => ({ categories: state.categories.filter(c => c.id !== id) }))
  },
}))
