import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { themes, applyTheme } from '@/styles/themes'
import { toast } from '@/components/ui/Toaster'
import type { ThemeName, UserSettings } from '@/types'
import { Eye, EyeOff, Check, Mic, Volume2, Brain, Palette, User, Info } from 'lucide-react'

const TABS = ['Tampilan', 'Suara', 'AI', 'Akun', 'Tentang']

export default function Settings() {
  const { user, signOut } = useAuthStore()
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState<Partial<UserSettings>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchSettings(user.id)
  }, [user])

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const save = async (patch: Partial<UserSettings>) => {
    if (!user) return
    setSaving(true)
    await updateSettings(user.id, { ...form, ...patch })
    setForm(f => ({ ...f, ...patch }))
    setSaving(false)
    toast('✓ Pengaturan disimpan', 'success')
  }

  const toggleKey = (k: string) => setShowKeys(s => ({ ...s, [k]: !s[k] }))

  const inp = (field: keyof UserSettings, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <div className="relative">
        <input
          type={type === 'password' ? (showKeys[field] ? 'text' : 'password') : type}
          value={(form[field] as string) || ''}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          onBlur={() => save({ [field]: form[field] } as Partial<UserSettings>)}
          placeholder={placeholder}
          className="input-field"
          style={{ paddingRight: type === 'password' ? 40 : undefined }}
        />
        {type === 'password' && (
          <button type="button" onClick={() => toggleKey(field)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}>
            {showKeys[field] ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  )

  const sel = (field: keyof UserSettings, label: string, options: [string, string][]) => (
    <div>
      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select className="input-field" value={(form[field] as string) || ''}
        onChange={e => { const v = e.target.value; setForm(f => ({ ...f, [field]: v })); save({ [field]: v } as Partial<UserSettings>) }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )

  const slid = (field: keyof UserSettings, label: string, min: number, max: number, step = 0.1) => (
    <div>
      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}: <span style={{ color: 'var(--accent)' }}>{(form[field] as number) ?? min}</span>
      </label>
      <input type="range" min={min} max={max} step={step}
        value={(form[field] as number) ?? min}
        onChange={e => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) }))}
        onMouseUp={() => save({ [field]: form[field] } as Partial<UserSettings>)}
        className="w-full accent-[var(--accent)]" />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--text-primary)' }}>Pengaturan</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === i ? 'var(--accent)' : 'transparent',
              color: tab === i ? 'white' : 'var(--text-secondary)',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Tampilan */}
      {tab === 0 && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Tema</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {themes.map(t => (
                <button key={t.name} onClick={() => { applyTheme(t.name); save({ theme: t.name }) }}
                  className="rounded-xl border p-3 text-left transition-all"
                  style={{
                    borderColor: form.theme === t.name ? 'var(--accent)' : 'var(--border)',
                    background: form.theme === t.name ? 'rgba(124,92,252,0.08)' : 'var(--bg-card)',
                    boxShadow: form.theme === t.name ? '0 0 0 2px var(--accent)' : undefined,
                  }}>
                  {/* Mini preview */}
                  <div className="rounded-lg h-12 mb-2 overflow-hidden flex gap-1 p-1.5"
                    style={{ background: t.preview.bg }}>
                    <div className="w-5 rounded" style={{ background: t.preview.card }} />
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 rounded-full w-3/4" style={{ background: t.preview.accent }} />
                      <div className="h-1 rounded-full w-1/2" style={{ background: t.preview.text, opacity: 0.5 }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.emoji} {t.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{t.description}</p>
                    </div>
                    {form.theme === t.name && <Check size={12} style={{ color: 'var(--accent)' }} />}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5 space-y-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Layout & Preferensi</h2>
            {sel('default_view', 'Tampilan Default', [['grid', '⊞ Grid'], ['list', '☰ List'], ['timeline', '⏱ Timeline']])}
            {sel('font_size', 'Ukuran Font', [['small', 'Kecil'], ['medium', 'Sedang'], ['large', 'Besar']])}
            {sel('animation', 'Animasi', [['full', 'Penuh'], ['reduced', 'Dikurangi'], ['none', 'Tidak Ada']])}
            {sel('language', 'Bahasa', [['id', '🇮🇩 Bahasa Indonesia'], ['en', '🇺🇸 English']])}
          </section>
        </div>
      )}

      {/* Tab 1: Suara */}
      {tab === 1 && (
        <div className="space-y-6">
          {/* STT */}
          <section className="card p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              <Mic size={18} style={{ color: 'var(--accent)' }} /> Voice Input (STT)
            </h2>
            {sel('stt_provider', 'Provider', [
              ['web-speech-api', '🌐 Web Speech API (Gratis)'],
              ['openai-whisper', '🤖 OpenAI Whisper (Berbayar)'],
              ['deepgram', '🎙 Deepgram (Berbayar)'],
              ['assemblyai', '📝 AssemblyAI (Berbayar)'],
              ['azure-speech', '☁️ Azure Speech (Berbayar)'],
              ['google-cloud-stt', '🔵 Google Cloud STT (Berbayar)'],
            ])}
            {form.stt_provider !== 'web-speech-api' && inp('stt_api_key', 'API Key', 'password', 'Masukkan API Key...')}
            {inp('stt_language', 'Bahasa (BCP-47)', 'text', 'id-ID')}
          </section>

          {/* Wake Word */}
          <section className="card p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              👂 Wake Word
            </h2>
            {sel('wake_word_provider', 'Provider', [
              ['none', '🔇 Tidak Aktif (Manual)'],
              ['browser-keyword', '🌐 Browser Keyword Spotting'],
              ['hotkey', '⌨️ Keyboard Shortcut'],
            ])}
            {form.wake_word_provider === 'browser-keyword' && (
              <>
                {inp('wake_word_custom', 'Kata Kunci', 'text', 'hey memory')}
                {slid('wake_word_sensitivity', 'Sensitivitas', 0, 1)}
              </>
            )}
            {form.wake_word_provider === 'hotkey' && inp('wake_word_key', 'Kombinasi Tombol', 'text', 'ctrl+shift+m')}
          </section>

          {/* TTS */}
          <section className="card p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              <Volume2 size={18} style={{ color: 'var(--accent)' }} /> Text-to-Speech (TTS)
            </h2>
            {sel('tts_provider', 'Provider', [
              ['web-speech-synthesis', '🌐 Web Speech Synthesis (Gratis)'],
              ['elevenlabs', '🎵 ElevenLabs (Berbayar)'],
              ['openai-tts', '🤖 OpenAI TTS (Berbayar)'],
              ['google-cloud-tts', '🔵 Google Cloud TTS (Berbayar)'],
              ['azure-tts', '☁️ Azure Neural TTS (Berbayar)'],
              ['none', '🔇 Tidak Ada (Silent Mode)'],
            ])}
            {form.tts_provider !== 'web-speech-synthesis' && form.tts_provider !== 'none' && (
              inp('tts_api_key', 'API Key', 'password', 'Masukkan API Key...')
            )}
            {inp('tts_voice_id', 'Voice ID / URI', 'text', 'ID suara (opsional)')}
            {slid('tts_rate', 'Kecepatan', 0.5, 2)}
            {slid('tts_pitch', 'Nada (Pitch)', 0, 2)}
            {slid('tts_volume', 'Volume', 0, 1)}
          </section>
        </div>
      )}

      {/* Tab 2: AI */}
      {tab === 2 && (
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  <Brain size={18} style={{ color: 'var(--accent)' }} /> Aktifkan AI
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Semantic search & answer synthesis dengan LLM
                </p>
              </div>
              <button
                onClick={() => save({ ai_enabled: !form.ai_enabled })}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: form.ai_enabled ? 'var(--accent)' : 'var(--bg-tertiary)' }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: form.ai_enabled ? 'translateX(24px)' : 'translateX(0)' }} />
              </button>
            </div>

            {form.ai_enabled && (
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                {sel('ai_provider', 'Answer Synthesis Provider', [
                  ['openai-gpt4o', '🤖 OpenAI GPT-4o (Direkomendasikan)'],
                  ['openai-gpt4o-mini', '🤖 OpenAI GPT-4o Mini (Lebih Murah)'],
                  ['anthropic-claude', '🔮 Anthropic Claude 3 Haiku'],
                  ['google-gemini', '🔷 Google Gemini Flash'],
                  ['groq', '⚡ Groq LLaMA 3 (Gratis tier)'],
                ])}
                {inp('ai_api_key', 'API Key AI', 'password', 'sk-...')}
                {sel('embedding_provider', 'Embedding Provider', [
                  ['openai-small', '🤖 OpenAI text-embedding-3-small (Direkomendasikan)'],
                  ['openai-large', '🤖 OpenAI text-embedding-3-large'],
                  ['cohere', '🟣 Cohere embed-multilingual-v3'],
                ])}
                {slid('similarity_threshold', 'Similarity Threshold', 0.5, 0.95, 0.05)}
                {slid('max_memories_retrieve', 'Maks Memories Diambil', 1, 10, 1)}
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>System Prompt</label>
                  <textarea rows={4} className="input-field resize-none"
                    value={(form.system_prompt as string) || ''}
                    onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                    onBlur={() => save({ system_prompt: form.system_prompt })} />
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 3: Akun */}
      {tab === 3 && (
        <div className="space-y-6">
          <section className="card p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              <User size={18} style={{ color: 'var(--accent)' }} /> Profil
            </h2>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input className="input-field" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nama Lengkap</label>
              <input className="input-field" value={user?.full_name || ''} disabled style={{ opacity: 0.6 }} />
            </div>
          </section>

          <section className="card p-5 border" style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.04)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--error)' }}>⚠️ Danger Zone</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => { if (confirm('Keluar dari MemoryVault?')) signOut() }}
                className="px-4 py-2 rounded-lg text-sm font-semibold border"
                style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
                Keluar (Logout)
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Tab 4: Tentang */}
      {tab === 4 && (
        <div className="card p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            <Info size={18} style={{ color: 'var(--accent)' }} /> Tentang MemoryVault
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Versi 1.0.0</p>
          <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <p>🧠 Personal memory manager berbasis React + Supabase</p>
            <p>🎤 Voice input dengan Web Speech API</p>
            <p>🤖 AI semantic search opsional via OpenAI</p>
            <p>🎨 14 tema visual</p>
          </div>
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Keyboard Shortcuts</p>
            <div className="space-y-2">
              {[['⌘K', 'Buka Command Palette'], ['⌘N', 'Ingatan Baru'], ['⌘M', 'Semua Ingatan']].map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <kbd className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{k}</kbd>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
