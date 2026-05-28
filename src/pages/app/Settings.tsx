import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useBrandingStore } from '@/store/useBrandingStore'
import { toast } from '@/components/ui/Toaster'
import type { UserSettings, ProviderKeys } from '@/types'
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

const TABS = ['Suara', 'AI', 'Branding', 'Akun', 'Tentang']

export default function Settings() {
  const { user, signOut } = useAuthStore()
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const { branding, updateBranding } = useBrandingStore()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState<Partial<UserSettings>>({})
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
    if (settings) setForm(settings)
  }, [settings])

  useEffect(() => {
    if (branding) setBrandingForm({ site_name: branding.site_name || '', accent_color: branding.accent_color || '#06b6d4', logo_url: branding.logo_url || '' })
  }, [branding])

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

      {/* Tab 0: Suara */}
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
          <section className="card p-4 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Radio size={15} style={{ color: 'var(--accent)' }} /> Wake Word
            </h2>

            {/* Mode */}
            {sel('wake_word_provider', 'Mode Aktivasi', [
              ['none', '🔇 Tidak Aktif'],
              ['browser-keyword', '🌐 Keyword / Kata Kunci'],
              ['hotkey', '⌨️ Keyboard Shortcut'],
            ])}

            {/* Keyword config */}
            {form.wake_word_provider === 'browser-keyword' && (
              <>
                {inp('wake_word_custom', 'Kata Kunci Wake Word', 'text', 'hey memory')}
                {slid('wake_word_sensitivity', 'Sensitivitas Deteksi', 0, 1)}
              </>
            )}

            {/* Hotkey config */}
            {form.wake_word_provider === 'hotkey' && (
              inp('wake_word_key', 'Kombinasi Tombol', 'text', 'ctrl+shift+m')
            )}

            {/* ── Jawaban / Respons Wake Word ── */}
            {form.wake_word_provider !== 'none' && (
              <>
                <hr style={{ borderColor: 'var(--border)' }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pengaturan Jawaban</h3>

                {/* Response mode */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Bell size={12} className="inline mr-1" /> Mode Respons
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['silent',         '🔇 Diam saja'],
                      ['chime',          '🔔 Bunyi chime'],
                      ['greeting',       '💬 Ucapan sapaan'],
                      ['greeting+chime', '🔔💬 Chime + Sapaan'],
                    ] as [string, string][]).map(([v, l]) => (
                      <button key={v}
                        onClick={() => save({ wake_word_response_mode: v as any })}
                        className="px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left"
                        style={{
                          borderColor: (form as any).wake_word_response_mode === v ? 'var(--accent)' : 'var(--border)',
                          background: (form as any).wake_word_response_mode === v ? 'rgba(var(--accent-rgb,6 182 212)/.12)' : 'transparent',
                          color: (form as any).wake_word_response_mode === v ? 'var(--accent)' : 'var(--text-secondary)',
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Greeting text */}
                {((form as any).wake_word_response_mode === 'greeting' || (form as any).wake_word_response_mode === 'greeting+chime') && (
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      💬 Teks Sapaan
                    </label>
                    <input
                      type="text"
                      value={(form as any).wake_word_greeting || ''}
                      onChange={e => setForm(f => ({ ...f, wake_word_greeting: e.target.value }))}
                      onBlur={() => save({ wake_word_greeting: (form as any).wake_word_greeting } as any)}
                      placeholder="Halo! Ada yang bisa saya bantu?"
                      className="input-field"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Teks ini akan diucapkan via TTS saat wake word terdeteksi.
                    </p>
                  </div>
                )}

                {/* Bahasa wake word */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Languages size={12} className="inline mr-1" /> Bahasa Mendengarkan
                  </label>
                  <input
                    type="text"
                    value={(form as any).wake_word_language || 'id-ID'}
                    onChange={e => setForm(f => ({ ...f, wake_word_language: e.target.value }))}
                    onBlur={() => save({ wake_word_language: (form as any).wake_word_language } as any)}
                    placeholder="id-ID"
                    className="input-field"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Kode BCP-47, contoh: id-ID, en-US, ms-MY
                  </p>
                </div>

                {/* Timeout */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} className="inline mr-1" /> Timeout Mendengarkan:{' '}
                    <span style={{ color: 'var(--accent)' }}>{(form as any).wake_word_timeout ?? 10}s</span>
                  </label>
                  <input type="range" min={3} max={60} step={1}
                    value={(form as any).wake_word_timeout ?? 10}
                    onChange={e => setForm(f => ({ ...f, wake_word_timeout: parseInt(e.target.value) }))}
                    onMouseUp={() => save({ wake_word_timeout: (form as any).wake_word_timeout } as any)}
                    className="w-full accent-[var(--accent)]" />
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <span>3s</span><span>60s</span>
                  </div>
                </div>

                {/* Toggle: suara mendengarkan */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      🎵 Suara saat mulai mendengarkan
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bunyi pendek ketika masuk mode input</p>
                  </div>
                  <button onClick={() => save({ wake_word_listening_sound: !(form as any).wake_word_listening_sound } as any)}
                    className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                    style={{ background: (form as any).wake_word_listening_sound ? 'var(--accent)' : 'rgba(100,116,139,0.3)' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                      style={{ transform: (form as any).wake_word_listening_sound ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>

                {/* Toggle: suara konfirmasi */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      ✅ Suara konfirmasi selesai
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bunyi saat input selesai diproses</p>
                  </div>
                  <button onClick={() => save({ wake_word_confirm_sound: !(form as any).wake_word_confirm_sound } as any)}
                    className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                    style={{ background: (form as any).wake_word_confirm_sound ? 'var(--accent)' : 'rgba(100,116,139,0.3)' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                      style={{ transform: (form as any).wake_word_confirm_sound ? 'translateX(16px)' : 'translateX(0)' }} />
                  </button>
                </div>

                {/* Toggle: auto-submit */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      <Zap size={12} className="inline mr-1" />Auto-submit setelah diam
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kirim otomatis jika tidak ada suara selama timeout</p>
                  </div>
                  <button onClick={() => save({ wake_word_auto_submit: !(form as any).wake_word_auto_submit } as any)}
                    className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                    style={{ background: (form as any).wake_word_auto_submit ? 'var(--accent)' : 'rgba(100,116,139,0.3)' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                      style={{ transform: (form as any).wake_word_auto_submit ? 'translateX(16px)' : 'translateX(0)' }} />
                  </button>
                </div>

                {/* Preview box */}
                <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>📋 Ringkasan Konfigurasi</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Trigger: <strong>{form.wake_word_provider === 'browser-keyword' ? `"${form.wake_word_custom || 'hey memory'}"` : form.wake_word_key || 'ctrl+shift+m'}</strong>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Respons: <strong>{(form as any).wake_word_response_mode || 'greeting+chime'}</strong>
                  </p>
                  {((form as any).wake_word_response_mode === 'greeting' || (form as any).wake_word_response_mode === 'greeting+chime') && (
                    <p className="text-xs italic" style={{ color: 'var(--accent)' }}>
                      "{(form as any).wake_word_greeting || 'Halo! Ada yang bisa saya bantu?'}"
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Timeout: <strong>{(form as any).wake_word_timeout ?? 10}s</strong> ·{' '}
                    Bahasa: <strong>{(form as any).wake_word_language || 'id-ID'}</strong>
                  </p>
                </div>
              </>
            )}
          </section>
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

      {/* Tab 1: AI */}
      {tab === 1 && (
        <div className="space-y-4">
          {/* Toggle */}
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

      {/* Tab 2: Branding */}
      {tab === 2 && (
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
                {/* Quick palette */}
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

            {/* Live preview */}
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
