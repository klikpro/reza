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
  dify_enabled: false,
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
          // Merge dengan default agar field baru (wake word, dll) tidak undefined
          // jika kolom belum ada di DB lama / migration belum dijalankan
          const defaults = createDefaultSettings(userId)
          const merged: UserSettings = { ...defaults, ...data } as UserSettings
          set({ settings: merged, loading: false })
          applyTheme((merged.theme ?? defaults.theme) as ThemeName)
        }
      },

      updateSettings: async (userId, updates) => {
        const current = get().settings || createDefaultSettings(userId)
        const updated = { ...current, ...updates, updated_at: new Date().toISOString() }
        set({ settings: updated })

        if (updates.theme) {
          applyTheme(updates.theme)
        }

        // Hanya kirim kolom yang benar-benar ada di tabel user_settings
        // Field seperti stt_keys, ai_keys, tts_keys tidak ada di DB → menyebabkan upsert gagal diam-diam
        const DB_COLUMNS = [
          'user_id', 'theme',
          'stt_provider', 'stt_api_key', 'stt_language', 'stt_model', 'stt_keys',
          'wake_word_provider', 'wake_word_key', 'wake_word_custom', 'wake_word_sensitivity',
          'wake_word_response_mode', 'wake_word_greeting', 'wake_word_listening_sound',
          'wake_word_confirm_sound', 'wake_word_timeout', 'wake_word_auto_submit', 'wake_word_language',
          'tts_provider', 'tts_api_key', 'tts_voice_id', 'tts_rate', 'tts_pitch', 'tts_volume', 'tts_model', 'tts_keys',
          'ai_enabled', 'ai_provider', 'ai_api_key', 'ai_keys',
          'embedding_provider', 'embedding_api_key',
          'similarity_threshold', 'max_memories_retrieve', 'system_prompt',
          'default_view', 'sidebar_mode', 'font_size', 'animation', 'language',
          'dify_enabled', 'dify_base_url', 'dify_api_key', 'dify_mode',
          'updated_at',
        ]
        const payload = Object.fromEntries(
          Object.entries({ ...updated, user_id: userId })
            .filter(([key]) => DB_COLUMNS.includes(key))
        )

        const { error } = await supabase
          .from('user_settings')
          .upsert([payload])

        if (error) {
          console.error('[useSettingsStore] upsert error:', error.message, error.details)
        }
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
      // Sengaja tidak cache settings di localStorage agar selalu ambil dari Supabase
      // Ini mencegah nilai lama (greeting default, dll) override data terbaru dari DB
      partialize: () => ({}),
    }
  )
)
