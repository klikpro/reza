import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    // Cleanup subscription lama sebelum buat baru
    // Mencegah multiple listener di React StrictMode (useEffect dipanggil 2x di dev)
    const prev = (window as unknown as Record<string, unknown>).__authUnsubscribe
    if (typeof prev === 'function') {
      prev()
      delete (window as unknown as Record<string, unknown>).__authUnsubscribe
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({
        user: {
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
        },
        initialized: true,
      })
    } else {
      set({ initialized: true })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
          },
        })
      } else {
        set({ user: null })
      }
    })

    // Simpan untuk cleanup berikutnya
    ;(window as unknown as Record<string, unknown>).__authUnsubscribe = () => subscription.unsubscribe()
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) return { error: error.message }
    return {}
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    set({ loading: false })
    if (error) return { error: error.message }
    return {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))
