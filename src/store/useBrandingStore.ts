import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export interface Branding {
  id?: string
  site_name: string
  logo_url?: string
  accent_color: string
  updated_at?: string
}

interface BrandingState {
  branding: Branding | null
  loading: boolean
  fetchBranding: () => Promise<void>
  updateBranding: (updates: Partial<Branding>) => Promise<void>
}

const DEFAULT_BRANDING: Branding = {
  site_name: 'MemoryVault',
  accent_color: '#06b6d4',
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set, get) => ({
      branding: DEFAULT_BRANDING,
      loading: false,

      fetchBranding: async () => {
        set({ loading: true })
        const { data } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single()

        if (data) {
          set({ branding: data as Branding, loading: false })
          // Apply accent color to CSS
          document.documentElement.style.setProperty('--accent', data.accent_color || '#06b6d4')
        } else {
          set({ loading: false })
        }
      },

      updateBranding: async (updates) => {
        const current = get().branding || DEFAULT_BRANDING
        const updated = { ...current, ...updates, updated_at: new Date().toISOString() }
        set({ branding: updated })

        if (updates.accent_color) {
          document.documentElement.style.setProperty('--accent', updates.accent_color)
        }

        await supabase.from('site_settings').upsert([updated])
      },
    }),
    {
      name: 'memoryvault-branding',
      partialize: (s) => ({ branding: s.branding }),
    }
  )
)
