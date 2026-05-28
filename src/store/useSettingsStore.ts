import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { applyTheme, defaultSettings } from '@/styles/themes'
import type { UserSettings, ThemeName } from '@/types'

interface SettingsState {
  settings: UserSettings | null
  loading: boolean
  fetchSettings: (userId: string) => Promise<void>
  updateSettings: (userId: string, updates: Partial<UserSettings>) => Promise<void>
  setTheme: (theme: ThemeName) => void
}

const createDefaultSettings = (userId: string): UserSettings => ({
  user_id: userId,
  theme: defaultSettings.theme,
  stt_provider: 'web-speech-api',
  stt_language: 'id-ID',
  wake_word_provider: 'none',
  wake_word_custom: defaultSettings.wake_word_custom,
  wake_word_sensitivity: defaultSettings.wake_word_sensitivity,
  wake_word_response_mode: 'greeting+chime',
  wake_word_greeting: 'Halo! Ada yang bisa saya bantu?',
  wake_word_listening_sound: true,
  wake_word_confirm_sound: true,
  wake_word_timeout: 10,
  wake_word_auto_submit: false,
  wake_word_language: 'id-ID',
  tts_provider: 'web-speech-synthesis',
  tts_rate: defaultSettings.tts_rate,
  tts_pitch: defaultSettings.tts_pitch,
  tts_volume: defaultSettings.tts_volume,
  ai_enabled: false,
  ai_provider: 'openai-gpt4o',
  embedding_provider: 'openai-small',
  similarity_threshold: defaultSettings.similarity_threshold,
  max_memories_retrieve: defaultSettings.max_memories_retrieve,
  system_prompt: defaultSettings.system_prompt,
  default_view: defaultSettings.default_view,
  sidebar_mode: defaultSettings.sidebar_mode,
  font_size: defaultSettings.font_size,
  animation: defaultSettings.animation,
  language: defaultSettings.language,
  updated_at: new Date().toISOString(),
})

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: null,
      loading: false,

      fetchSettings: async (userId) => {
        set({ loading: true })
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error || !data) {
          // Create default settings
          const defaults = createDefaultSettings(userId)
          await supabase.from('user_settings').upsert([defaults])
          set({ settings: defaults, loading: false })
          applyTheme(defaults.theme)
        } else {
          set({ settings: data as UserSettings, loading: false })
          applyTheme(data.theme as ThemeName)
        }
      },

      updateSettings: async (userId, updates) => {
        const current = get().settings || createDefaultSettings(userId)
        const updated = { ...current, ...updates, updated_at: new Date().toISOString() }
        set({ settings: updated })

        if (updates.theme) {
          applyTheme(updates.theme)
        }

        await supabase
          .from('user_settings')
          .upsert([{ ...updated, user_id: userId }])
      },

      setTheme: (theme) => {
        set(state => ({
          settings: state.settings ? { ...state.settings, theme } : null,
        }))
        applyTheme(theme)
      },
    }),
    {
      name: 'memoryvault-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
