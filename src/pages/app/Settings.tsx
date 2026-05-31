import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useBrandingStore } from '@/store/useBrandingStore'
import { toast } from '@/components/ui/Toaster'
import type { UserSettings, ProviderKeys, WakeWordResponseMode } from '@/types'
import { Eye, EyeOff, Mic, Volume2, Brain, User, Info, Image, Radio, Bell, Clock, Zap, Languages } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ProviderKeyManager from '@/components/ui/ProviderKeyManager'
import type { ProviderDef } from '@/components/ui/ProviderKeyManager'

const AI_PROVIDERS: ProviderDef[] = [
  { id: 'openai-gpt4o', emoji: '🤖', label: 'OpenAI GPT-4o', description: 'Model terbaik OpenAI, multimodal', keyPlaceholder: 'sk-...' },
  { id: 'openai-gpt4o-mini', emoji: '🤖', label: 'OpenAI GPT-4o Mini', description: 'Lebih cepat & murah', keyPlaceholder: 'sk-...' },
  { id: 'openai-gpt4-turbo', emoji: '🤖', label: 'OpenAI GPT-4 Turbo', description: 'Konteks panjang 128K', keyPlaceholder: 'sk-...' },
  { id: 'openai-o1-mini', emoji: '🧠', label: 'OpenAI o1 Mini', description: 'Model reasoning terbaru', keyPlaceholder: 'sk-...' },
  { id: 'anthropic-claude-opus', emoji: '🔮', label: 'Anthropic Claude Opus', description: 'Model terkuat Anthropic', keyPlaceholder: 'sk-ant-...' },
  { id: 'anthropic-claude-sonnet', emoji: '🔮', label: 'Anthropic Claude Sonnet', description: 'Keseimbangan kecepatan & kualitas', keyPlaceholder: 'sk-ant-...' },
  { id: 'anthropic-claude-haiku', emoji: '🔮', label: 'Anthropic Claude Haiku', description: 'Paling cepat dari Anthropic', keyPlaceholder: 'sk-ant-...' },
  { id: 'google-gemini-pro', emoji: '🔷', label: 'Google Gemini 1.5 Pro', description: 'Konteks hingga 2 juta token', keyPlaceholder: 'AIza...' },
  { id: 'google-gemini-flash', emoji: '🔷', label: 'Google Gemini 1.5 Flash', description: 'Cepat & efisien dari Google', keyPlaceholder: 'AIza...' },
  { id: 'groq-llama3', emoji: '⚡', label: 'Groq LLaMA 3.1 70B', description: 'Inferensi super cepat, tier gratis', keyPlaceholder: 'gsk_...' },
  { id: 'groq-mixtral', emoji: '⚡', label: 'Groq Mixtral 8x7B', description: 'MoE model via Groq', keyPlaceholder: 'gsk_...' },
  { id: 'mistral-large', emoji: '🌀', label: 'Mistral Large', description: 'Model unggulan Mistral AI', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'deepseek-chat', emoji: '🐋', label: 'DeepSeek Chat', description: 'Model open-source terbaik China', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'perplexity', emoji: '🔍', label: 'Perplexity AI', description: 'AI dengan akses internet realtime', keyPlaceholder: 'pplx-...' },
  { id: 'together-ai', emoji: '🤝', label: 'Together AI', description: '50+ model open-source terpusat', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'ollama', emoji: '🦙', label: 'Ollama (Lokal)', description: 'Jalankan LLM di perangkat sendiri', freeKey: true },
]

const STT_PROVIDERS: ProviderDef[] = [
  { id: 'web-speech-api', emoji: '🌐', label: 'Web Speech API', description: 'Built-in browser, gratis tanpa key', freeKey: true },
  { id: 'openai-whisper', emoji: '🤖', label: 'OpenAI Whisper', description: 'Akurasi tinggi, multi bahasa', keyPlaceholder: 'sk-...' },
  { id: 'groq-whisper', emoji: '⚡', label: 'Groq Whisper', description: 'Whisper via Groq, sangat cepat', keyPlaceholder: 'gsk_...' },
  { id: 'deepgram', emoji: '🎙️', label: 'Deepgram', description: 'Real-time STT berkecepatan tinggi', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'assemblyai', emoji: '📝', label: 'AssemblyAI', description: 'STT + analisis audio canggih', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'azure-speech', emoji: '☁️', label: 'Azure Speech', description: 'Microsoft Azure Cognitive Services', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'google-cloud-stt', emoji: '🔵', label: 'Google Cloud STT', description: 'Google Speech-to-Text API', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'elevenlabs-stt', emoji: '🎵', label: 'ElevenLabs STT', description: 'STT dari ElevenLabs', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'rev-ai', emoji: '📻', label: 'Rev AI', description: 'STT akurasi tinggi dari Rev', keyPlaceholder: 'Masukkan API Key...' },
]

const TTS_PROVIDERS: ProviderDef[] = [
  { id: 'web-speech-synthesis', emoji: '🌐', label: 'Web Speech Synthesis', description: 'Built-in browser, gratis tanpa key', freeKey: true },
  { id: 'elevenlabs', emoji: '🎵', label: 'ElevenLabs', description: 'Suara paling realistis saat ini', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'openai-tts', emoji: '🤖', label: 'OpenAI TTS', description: 'Text-to-speech dari OpenAI', keyPlaceholder: 'sk-...' },
  { id: 'google-cloud-tts', emoji: '🔵', label: 'Google Cloud TTS', description: 'Neural voices dari Google', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'azure-tts', emoji: '☁️', label: 'Azure Neural TTS', description: '400+ neural voices dari Microsoft', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'amazon-polly', emoji: '📦', label: 'Amazon Polly', description: 'TTS dari AWS dengan banyak bahasa', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'playht', emoji: '▶️', label: 'PlayHT', description: 'Voice cloning & realistic TTS', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'cartesia', emoji: '🎭', label: 'Cartesia AI', description: 'Real-time ultra-low latency TTS', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'deepgram-tts', emoji: '🎙️', label: 'Deepgram TTS', description: 'TTS cepat dari Deepgram', keyPlaceholder: 'Masukkan API Key...' },
  { id: 'none', emoji: '🔇', label: 'Silent Mode', description: 'Tidak ada suara output', freeKey: true },
]

// ── Tipe lokal untuk field wake word yang belum ada di UserSettings lama ──
type WakeWordForm = {
  wake_word_response_mode: WakeWordResponseMode
  wake_word_greeting: string
  wake_word_listening_sound: boolean
  wake_word_confirm_sound: boolean
  wake_word_timeout: number
  wake_word_auto_submit: boolean
  wake_word_language: string
}

const WW_DEFAULTS: WakeWordForm = {
  wake_word_response_mode: 'greeting+chime',
  wake_word_greeting: 'Halo! Ada yang bisa saya bantu?',
  wake_word_listening_sound: true,
  wake_word_confirm_sound: true,
  wake_word_timeout: 10,
  wake_word_auto_submit: false,
  wake_word_language: 'id-ID',
}

const TABS = ['Suara', 'Wake Word', 'AI', 'Dify', 'Branding', 'Akun', 'Tentang']

export default function Settings() {
  const { user, signOut } = useAuthStore()
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const { branding, updateBranding } = useBrandingStore()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState<Partial<UserSettings>>({})
  const [wwForm, setWwForm] = useState<WakeWordForm>(WW_DEFAULTS)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [brandingForm, setBrandingForm] = useState({ site_name: '', accent_color: '#06b6d4', logo_url: '' })
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Multi-key maps
  const parseKeys = (raw?: string): ProviderKeys => { try { return raw ? JSON.parse(raw) : {} } catch { return {} } }
  const aiKeys = parseKeys(form.ai_keys)
  const sttKeys = parseKeys(form.stt_keys)
  const ttsKeys = parseKeys(form.tts_keys)

  const saveAiKeys = (keys: ProviderKeys) => save({ ai_keys: JSON.stringify(keys) })
  const saveSttKeys = (keys: ProviderKeys) => save({ stt_keys: JSON.stringify(keys) })
  const saveTtsKeys = (keys: ProviderKeys) => save({ tts_keys: JSON.stringify(keys) })

  useEffect(() => {
    if (user) fetchSettings(user.id)
  }, [user])

  useEffect(() => {
    if (settings) {
      setForm(settings)
      // Hydrate wwForm dari settings (field-field baru mungkin ada di settings)
      setWwForm({
        wake_word_response_mode: (settings as any).wake_word_response_mode ?? WW_DEFAULTS.wake_word_response_mode,
        wake_word_greeting: (settings as any).wake_word_greeting ?? WW_DEFAULTS.wake_word_greeting,
        wake_word_listening_sound: (settings as any).wake_word_listening_sound ?? WW_DEFAULTS.wake_word_listening_sound,
        wake_word_confirm_sound: (settings as any).wake_word_confirm_sound ?? WW_DEFAULTS.wake_word_confirm_sound,
        wake_word_timeout: (settings as any).wake_word_timeout ?? WW_DEFAULTS.wake_word_timeout,
        wake_word_auto_submit: (settings as any).wake_word_auto_submit ?? WW_DEFAULTS.wake_word_auto_submit,
        wake_word_language: (settings as any).wake_word_language ?? WW_DEFAULTS.wake_word_language,
      })
    }
  }, [settings])

  useEffect(() => {
    if (branding) setBrandingForm({ site_name: branding.site_name || '', accent_color: branding.accent_color || '#06b6d4', logo_url: branding.logo_url || '' })
  }, [branding])

  // Simpan field UserSettings biasa
  const save = async (patch: Partial<UserSettings>) => {
    if (!user) return
    setSaving(true)
    await updateSettings(user.id, { ...form, ...patch })
    setForm(f => ({ ...f, ...patch }))
    setSaving(false)
    toast('✓ Pengaturan disimpan', 'success')
  }

  // Simpan field wake word (gabungkan form + wwForm saat kirim)
  const saveWw = async (patch: Partial<WakeWordForm>) => {
    if (!user) return
    setSaving(true)
    const merged = { ...wwForm, ...patch }
    setWwForm(merged)
    await updateSettings(user.id, { ...form, ...(merged as any) })
    setSaving(false)
    toast('✓ Pengaturan wake word disimpan', 'success')
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

  // Toggle helper untuk wwForm
  const Toggle = ({ field, label, desc }: { field: keyof WakeWordForm; label: string; desc: string }) => (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <button
        onClick={() => saveWw({ [field]: !wwForm[field] } as Partial<WakeWordForm>)}
        className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ background: wwForm[field] ? 'var(--accent)' : 'rgba(100,116,139,0.3)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
          style={{ transform: wwForm[field] ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--text-primary)' }}>Pengaturan</h1>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit max-w-full overflow-x-auto" style={{ background: 'var(--bg-secondary)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{
              background: tab === i ? 'var(--accent)' : 'transparent',
              color: tab === i ? 'white' : 'var(--text-secondary)',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Suara (STT + TTS + Pengaturan Suara) ── */}
      {tab === 0 && (
        <div className="space-y-4">
          <ProviderKeyManager
            title="Voice Input (STT)"
            icon={<Mic size={16} style={{ color: 'var(--accent)' }} />}
            providers={STT_PROVIDERS}
            activeProvider={form.stt_provider || 'web-speech-api'}
            keys={sttKeys}
            onActivate={id => save({ stt_provider: id as any })}
            onKeysChange={saveSttKeys}
          />
          <ProviderKeyManager
            title="Text-to-Speech (TTS)"
            icon={<Volume2 size={16} style={{ color: 'var(--accent)' }} />}
            providers={TTS_PROVIDERS}
            activeProvider={form.tts_provider || 'web-speech-synthesis'}
            keys={ttsKeys}
            onActivate={id => save({ tts_provider: id as any })}
            onKeysChange={saveTtsKeys}
          />
          <section className="card p-4 space-y-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🔊 Pengaturan Suara</h2>
            {inp('stt_language', 'Bahasa STT (BCP-47)', 'text', 'id-ID')}
            {inp('tts_voice_id', 'Voice ID / URI', 'text', 'ID suara (opsional)')}
            {slid('tts_rate', 'Kecepatan', 0.5, 2)}
            {slid('tts_pitch', 'Nada (Pitch)', 0, 2)}
            {slid('tts_volume', 'Volume', 0, 1)}
          </section>
        </div>
      )}

      {/* ── Tab 1: Wake Word ── */}
      {tab === 1 && (
        <div className="space-y-4">

          {/* Kartu 1: Aktivasi */}
          <section className="card p-4 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Radio size={15} style={{ color: 'var(--accent)' }} /> Aktivasi Wake Word
            </h2>
            {sel('wake_word_provider', 'Mode Aktivasi', [
              ['none', '🔇 Tidak Aktif'],
              ['browser-keyword', '🌐 Keyword / Kata Kunci'],
              ['hotkey', '⌨️ Keyboard Shortcut'],
            ])}
            {form.wake_word_provider === 'browser-keyword' && (
              <>
                {inp('wake_word_custom', 'Kata Kunci Wake Word', 'text', 'hey memory')}
                {slid('wake_word_sensitivity', 'Sensitivitas Deteksi', 0, 1)}
              </>
            )}
            {form.wake_word_provider === 'hotkey' && (
              inp('wake_word_key', 'Kombinasi Tombol', 'text', 'ctrl+shift+m')
            )}
          </section>

          {/* Kartu 2: Jawaban & Respons — tampil hanya jika aktif */}
          {form.wake_word_provider !== 'none' && (
            <section className="card p-4 space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Bell size={15} style={{ color: 'var(--accent)' }} /> Jawaban & Respons
              </h2>

              {/* Mode respons — tile picker */}
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--text-muted)' }}>
                  Mode Respons saat Wake Word terdeteksi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['silent',         '🔇', 'Diam saja',       'Tidak ada respons audio'],
                    ['chime',          '🔔', 'Bunyi chime',      'Notifikasi bunyi pendek'],
                    ['greeting',       '💬', 'Ucapan sapaan',    'Mengucapkan teks sapaan via TTS'],
                    ['greeting+chime', '🔔💬', 'Chime + Sapaan', 'Chime lalu ucapan sapaan'],
                  ] as [WakeWordResponseMode, string, string, string][]).map(([v, emoji, title, sub]) => (
                    <button key={v}
                      onClick={() => saveWw({ wake_word_response_mode: v })}
                      className="flex items-start gap-2 p-3 rounded-xl border transition-all text-left"
                      style={{
                        borderColor: wwForm.wake_word_response_mode === v ? 'var(--accent)' : 'var(--border)',
                        background: wwForm.wake_word_response_mode === v ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-secondary)',
                      }}>
                      <span className="text-base mt-0.5 flex-shrink-0">{emoji}</span>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: wwForm.wake_word_response_mode === v ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Teks sapaan — tampil hanya jika mode greeting */}
              {(wwForm.wake_word_response_mode === 'greeting' || wwForm.wake_word_response_mode === 'greeting+chime') && (
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    💬 Teks Sapaan
                  </label>
                  <input
                    type="text"
                    value={wwForm.wake_word_greeting}
                    onChange={e => setWwForm(f => ({ ...f, wake_word_greeting: e.target.value }))}
                    onBlur={() => saveWw({ wake_word_greeting: wwForm.wake_word_greeting })}
                    placeholder="Halo! Ada yang bisa saya bantu?"
                    className="input-field"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Diucapkan oleh TTS saat wake word terdeteksi.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Kartu 3: Pengaturan Lanjutan — tampil hanya jika aktif */}
          {form.wake_word_provider !== 'none' && (
            <section className="card p-4 space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Zap size={15} style={{ color: 'var(--accent)' }} /> Pengaturan Lanjutan
              </h2>

              {/* Bahasa */}
              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Languages size={12} /> Bahasa Mendengarkan
                </label>
                <input
                  type="text"
                  value={wwForm.wake_word_language}
                  onChange={e => setWwForm(f => ({ ...f, wake_word_language: e.target.value }))}
                  onBlur={() => saveWw({ wake_word_language: wwForm.wake_word_language })}
                  placeholder="id-ID"
                  className="input-field"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Kode BCP-47, contoh: id-ID · en-US · ms-MY</p>
              </div>

              {/* Timeout slider */}
              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={12} /> Timeout Mendengarkan:&nbsp;
                  <span style={{ color: 'var(--accent)' }}>{wwForm.wake_word_timeout}s</span>
                </label>
                <input type="range" min={3} max={60} step={1}
                  value={wwForm.wake_word_timeout}
                  onChange={e => setWwForm(f => ({ ...f, wake_word_timeout: parseInt(e.target.value) }))}
                  onMouseUp={() => saveWw({ wake_word_timeout: wwForm.wake_word_timeout })}
                  className="w-full accent-[var(--accent)]" />
                <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <span>3s</span><span>60s</span>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Toggle
                  field="wake_word_listening_sound"
                  label="🎵 Suara saat mulai mendengarkan"
                  desc="Bunyi pendek ketika masuk mode input suara"
                />
                <Toggle
                  field="wake_word_confirm_sound"
                  label="✅ Suara konfirmasi selesai"
                  desc="Bunyi saat input selesai diproses"
                />
                <Toggle
                  field="wake_word_auto_submit"
                  label="⚡ Auto-submit setelah diam"
                  desc="Kirim otomatis jika tidak ada suara sampai timeout"
                />
              </div>
            </section>
          )}

          {/* Kartu 4: Ringkasan konfigurasi */}
          {form.wake_word_provider !== 'none' && (
            <section className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>📋 Ringkasan Konfigurasi Aktif</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>Trigger</span>
                <strong>
                  {form.wake_word_provider === 'browser-keyword'
                    ? `"${form.wake_word_custom || 'hey memory'}"`
                    : form.wake_word_key || 'ctrl+shift+m'}
                </strong>
                <span>Mode respons</span>
                <strong>{wwForm.wake_word_response_mode}</strong>
                {(wwForm.wake_word_response_mode === 'greeting' || wwForm.wake_word_response_mode === 'greeting+chime') && (
                  <>
                    <span>Sapaan</span>
                    <em style={{ color: 'var(--accent)' }}>"{wwForm.wake_word_greeting}"</em>
                  </>
                )}
                <span>Bahasa</span>
                <strong>{wwForm.wake_word_language}</strong>
                <span>Timeout</span>
                <strong>{wwForm.wake_word_timeout}s</strong>
                <span>Auto-submit</span>
                <strong>{wwForm.wake_word_auto_submit ? 'Aktif' : 'Nonaktif'}</strong>
              </div>
            </section>
          )}

          {/* Placeholder jika wake word tidak aktif */}
          {form.wake_word_provider === 'none' && (
            <div className="card p-10 text-center space-y-2">
              <p className="text-3xl">🔇</p>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Wake Word Tidak Aktif</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Pilih mode aktivasi di atas untuk mengatur kata kunci atau shortcut keyboard.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: AI ── */}
      {tab === 2 && (
        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  <Brain size={16} style={{ color: 'var(--accent)' }} /> Aktifkan AI
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Semantic search & answer synthesis dengan LLM</p>
              </div>
              <button onClick={() => save({ ai_enabled: !form.ai_enabled })}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: form.ai_enabled ? 'var(--accent)' : 'rgba(100,116,139,0.3)' }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
                  style={{ transform: form.ai_enabled ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            </div>
          </section>

          {form.ai_enabled && (
            <>
              <ProviderKeyManager
                title="AI Provider & API Keys"
                icon={<Brain size={16} style={{ color: 'var(--accent)' }} />}
                providers={AI_PROVIDERS}
                activeProvider={form.ai_provider || 'openai-gpt4o'}
                keys={aiKeys}
                onActivate={id => save({ ai_provider: id as any })}
                onKeysChange={saveAiKeys}
              />
              <section className="card p-4 space-y-3">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>⚙️ Pengaturan Lanjutan</h2>
                {sel('embedding_provider', 'Embedding Provider', [
                  ['openai-small', '🤖 OpenAI text-embedding-3-small'],
                  ['openai-large', '🤖 OpenAI text-embedding-3-large'],
                  ['cohere', '🟣 Cohere embed-multilingual-v3'],
                  ['huggingface', '🤗 HuggingFace (gratis)'],
                  ['voyage', '🚀 Voyage AI'],
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
              </section>
            </>
          )}
        </div>
      )}

      {/* ── Tab 3: Branding ── */}
      {tab === 3 && (
        <div className="space-y-6">
          <section className="card p-5 space-y-5">
            <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              <Image size={18} style={{ color: 'var(--accent)' }} /> Branding Website
            </h2>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nama Website</label>
              <input className="input-field" value={brandingForm.site_name}
                onChange={e => setBrandingForm(f => ({ ...f, site_name: e.target.value }))}
                onBlur={() => { updateBranding({ site_name: brandingForm.site_name }); toast('✓ Nama disimpan', 'success') }}
                placeholder="MemoryVault" />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Warna Aksen</label>
              <div className="flex items-center gap-3">
                <input type="color" value={brandingForm.accent_color}
                  onChange={e => { setBrandingForm(f => ({ ...f, accent_color: e.target.value })); document.documentElement.style.setProperty('--accent', e.target.value) }}
                  onBlur={() => { updateBranding({ accent_color: brandingForm.accent_color }); toast('✓ Warna disimpan', 'success') }}
                  className="w-12 h-10 rounded-lg cursor-pointer border-0" />
                <div className="flex-1">
                  <input className="input-field" value={brandingForm.accent_color}
                    onChange={e => { setBrandingForm(f => ({ ...f, accent_color: e.target.value })); document.documentElement.style.setProperty('--accent', e.target.value) }}
                    onBlur={() => { updateBranding({ accent_color: brandingForm.accent_color }); toast('✓ Warna disimpan', 'success') }}
                    placeholder="#06b6d4" />
                </div>
                <div className="flex gap-1.5">
                  {['#06b6d4','#8b5cf6','#f97316','#10b981','#f43f5e','#3b82f6'].map(c => (
                    <button key={c} onClick={() => { setBrandingForm(f => ({ ...f, accent_color: c })); document.documentElement.style.setProperty('--accent', c); updateBranding({ accent_color: c }) }}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c, borderColor: brandingForm.accent_color === c ? '#fff' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Logo (Upload Gambar)</label>
              {brandingForm.logo_url && (
                <img src={brandingForm.logo_url} alt="logo" className="w-16 h-16 object-contain rounded-xl mb-3 border" style={{ borderColor: 'var(--border)' }} />
              )}
              <label className="btn-secondary text-sm cursor-pointer">
                {uploadingLogo ? 'Mengupload...' : '📁 Pilih File Logo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setUploadingLogo(true)
                    const ext = file.name.split('.').pop()
                    const path = `logos/logo_${Date.now()}.${ext}`
                    const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: true })
                    if (!error) {
                      const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(path)
                      setBrandingForm(f => ({ ...f, logo_url: publicUrl }))
                      await updateBranding({ logo_url: publicUrl })
                      toast('✓ Logo diperbarui', 'success')
                    } else toast('Gagal upload logo', 'error')
                    setUploadingLogo(false)
                  }} />
              </label>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Preview Nama & Logo:</p>
              <div className="flex items-center gap-2">
                {brandingForm.logo_url
                  ? <img src={brandingForm.logo_url} className="w-8 h-8 rounded-lg object-contain" />
                  : <div className="w-8 h-8 rounded-lg" style={{ background: brandingForm.accent_color }} />}
                <span className="font-black text-xl" style={{ color: brandingForm.accent_color }}>
                  {brandingForm.site_name || 'MemoryVault'}
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 3: Dify ── */}
      {tab === 3 && (
        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  🤖 Integrasi Dify
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Aktifkan untuk mengirim query ke Dify workflow/chatbot sebagai AI engine utama
                </p>
              </div>
              <button
                onClick={() => save({ dify_enabled: !form.dify_enabled })}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: form.dify_enabled ? 'var(--accent)' : 'rgba(100,116,139,0.3)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
                  style={{ transform: form.dify_enabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </section>

          {form.dify_enabled && (
            <>
              <section className="card p-4 space-y-3">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>⚙️ Konfigurasi Dify</h2>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={(form.dify_base_url as string) || ''}
                    onChange={e => setForm(f => ({ ...f, dify_base_url: e.target.value }))}
                    onBlur={() => save({ dify_base_url: form.dify_base_url })}
                    placeholder="https://api.dify.ai"
                    className="input-field"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Untuk self-hosted: http://localhost atau URL server Dify Anda
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    API Key (App Secret Key)
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys['dify_api_key'] ? 'text' : 'password'}
                      value={(form.dify_api_key as string) || ''}
                      onChange={e => setForm(f => ({ ...f, dify_api_key: e.target.value }))}
                      onBlur={() => save({ dify_api_key: form.dify_api_key })}
                      placeholder="app-xxxxxxxxxxxxxxxxxxxx"
                      className="input-field"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleKey('dify_api_key')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showKeys['dify_api_key'] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Dapatkan dari Dify → App → API Access → Secret Key
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Mode</label>
                  <select
                    className="input-field"
                    value={(form.dify_mode as string) || 'chat'}
                    onChange={e => { const v = e.target.value; setForm(f => ({ ...f, dify_mode: v as any })); save({ dify_mode: v as any }) }}
                  >
                    <option value="chat">💬 Chat (percakapan multi-giliran)</option>
                    <option value="workflow">⚡ Workflow (satu-tembak)</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Chat: menyimpan history percakapan. Workflow: setiap pertanyaan berdiri sendiri.
                  </p>
                </div>
              </section>

              {/* Diagram alur */}
              <section className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>📊 Alur Data Aktif</p>
                <div className="flex items-center gap-2 flex-wrap text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    '🎤 Suara',
                    '→',
                    '📝 STT',
                    '→',
                    '🤖 Dify',
                    '→',
                    '📄 Teks',
                    '→',
                    '🔊 TTS',
                  ].map((item, i) => (
                    <span
                      key={i}
                      className={item === '→' ? '' : 'px-2 py-1 rounded-lg'}
                      style={item !== '→' ? { background: 'var(--bg-tertiary)', color: 'var(--accent)', border: '1px solid var(--border)' } : { color: 'var(--text-muted)' }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ⚡ Jika Dify dimatikan, sistem akan fallback ke AI provider yang dikonfigurasi di tab AI.
                </p>
              </section>
            </>
          )}

          {!form.dify_enabled && (
            <div className="card p-10 text-center space-y-2">
              <p className="text-3xl">🤖</p>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Dify Tidak Aktif</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Aktifkan toggle di atas lalu isi URL dan API Key Dify Anda.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Branding ── */}
      {tab === 4 && (
        <div className="space-y-6">
          <section className="card p-5 space-y-5">
            <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              <Image size={18} style={{ color: 'var(--accent)' }} /> Branding Website
            </h2>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nama Website</label>
              <input className="input-field" value={brandingForm.site_name}
                onChange={e => setBrandingForm(f => ({ ...f, site_name: e.target.value }))}
                onBlur={() => { updateBranding({ site_name: brandingForm.site_name }); toast('✓ Nama disimpan', 'success') }}
                placeholder="MemoryVault" />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Warna Aksen</label>
              <div className="flex items-center gap-3">
                <input type="color" value={brandingForm.accent_color}
                  onChange={e => { setBrandingForm(f => ({ ...f, accent_color: e.target.value })); document.documentElement.style.setProperty('--accent', e.target.value) }}
                  onBlur={() => { updateBranding({ accent_color: brandingForm.accent_color }); toast('✓ Warna disimpan', 'success') }}
                  className="w-12 h-10 rounded-lg cursor-pointer border-0" />
                <div className="flex-1">
                  <input className="input-field" value={brandingForm.accent_color}
                    onChange={e => { setBrandingForm(f => ({ ...f, accent_color: e.target.value })); document.documentElement.style.setProperty('--accent', e.target.value) }}
                    onBlur={() => { updateBranding({ accent_color: brandingForm.accent_color }); toast('✓ Warna disimpan', 'success') }}
                    placeholder="#06b6d4" />
                </div>
                <div className="flex gap-1.5">
                  {['#06b6d4','#8b5cf6','#f97316','#10b981','#f43f5e','#3b82f6'].map(c => (
                    <button key={c} onClick={() => { setBrandingForm(f => ({ ...f, accent_color: c })); document.documentElement.style.setProperty('--accent', c); updateBranding({ accent_color: c }) }}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c, borderColor: brandingForm.accent_color === c ? '#fff' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>Logo (Upload Gambar)</label>
              {brandingForm.logo_url && (
                <img src={brandingForm.logo_url} alt="logo" className="w-16 h-16 object-contain rounded-xl mb-3 border" style={{ borderColor: 'var(--border)' }} />
              )}
              <label className="btn-secondary text-sm cursor-pointer">
                {uploadingLogo ? 'Mengupload...' : '📁 Pilih File Logo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setUploadingLogo(true)
                    const ext = file.name.split('.').pop()
                    const path = `logos/logo_${Date.now()}.${ext}`
                    const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: true })
                    if (!error) {
                      const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(path)
                      setBrandingForm(f => ({ ...f, logo_url: publicUrl }))
                      await updateBranding({ logo_url: publicUrl })
                      toast('✓ Logo diperbarui', 'success')
                    } else toast('Gagal upload logo', 'error')
                    setUploadingLogo(false)
                  }} />
              </label>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Preview Nama & Logo:</p>
              <div className="flex items-center gap-2">
                {brandingForm.logo_url
                  ? <img src={brandingForm.logo_url} className="w-8 h-8 rounded-lg object-contain" />
                  : <div className="w-8 h-8 rounded-lg" style={{ background: brandingForm.accent_color }} />}
                <span className="font-black text-xl" style={{ color: brandingForm.accent_color }}>
                  {brandingForm.site_name || 'MemoryVault'}
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 5: Akun ── */}
      {tab === 5 && (
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

      {/* ── Tab 6: Tentang ── */}
      {tab === 6 && (
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
