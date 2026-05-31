import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Brain, Volume2, Search, MessageSquare, RefreshCw, Save } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useVoiceStore } from '@/store/useVoiceStore'
import { WebSpeechSTT } from '@/services/sttService'
import { createTTSProvider } from '@/services/ttsService'
import { answerQuery } from '@/services/aiService'
import { difyQuery, buildDifyConfig } from '@/services/difyService'
import { createWakeWordProvider } from '@/services/wakeWordService'
import type { Memory } from '@/types'
import { toast } from '@/components/ui/Toaster'

type Phase = 'idle' | 'listening' | 'processing' | 'answer' | 'error'

export default function Ask() {
  const { user } = useAuthStore()
  const { memories, addMemory } = useMemoryStore()
  const { settings } = useSettingsStore()
  const { setVoiceState, setWakeWordActive, wakeWordActive } = useVoiceStore()

  const [phase, setPhase] = useState<Phase>('idle')
  const [query, setQuery] = useState('')
  const [textQuery, setTextQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Memory[]>([])
  const [difyConversationId, setDifyConversationId] = useState<string | undefined>(undefined)
  const [speaking, setSpeaking] = useState(false)
  const [wakeDetected, setWakeDetected] = useState(false)
  const [wakeProvider, setWakeProvider] = useState<ReturnType<typeof createWakeWordProvider> | null>(null)

  // Start/stop wake word listener
  useEffect(() => {
    if (!settings) return

    if (wakeWordActive && settings.wake_word_provider !== 'none') {
      const provider = createWakeWordProvider(settings)
      setWakeProvider(provider)
      const ok = provider.start(() => {
        setWakeDetected(true)
        setTimeout(() => setWakeDetected(false), 2000)

        // Bunyikan greeting dari settings sebelum mulai listening
        const mode = settings.wake_word_response_mode || 'greeting+chime'
        const greeting = settings.wake_word_greeting || 'Halo! Ada yang bisa saya bantu?'
        const lang = settings.wake_word_language || 'id-ID'
        const useChime = settings.wake_word_listening_sound !== false

        // Chime
        if ((mode === 'chime' || mode === 'greeting+chime') && useChime) {
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(880, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
            gain.gain.setValueAtTime(0.4, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
            osc.onended = () => ctx.close()
          } catch {}
        }

        // Greeting TTS — tunggu chime selesai dulu
        const greetingDelay = (mode === 'greeting+chime' && useChime) ? 450 : 0
        if (mode === 'greeting' || mode === 'greeting+chime') {
          setTimeout(() => {
            window.speechSynthesis.cancel()
            const utt = new SpeechSynthesisUtterance(greeting)
            utt.lang = lang; utt.rate = 1.0; utt.pitch = 1.1; utt.volume = 0.9
            window.speechSynthesis.speak(utt)
          }, greetingDelay)
        }

        // Mulai listening setelah greeting selesai (estimasi durasi greeting)
        const listeningDelay = mode === 'silent' ? 0
          : mode === 'chime' ? 500
          : greeting.length * 60 + greetingDelay  // ~60ms per karakter
        setTimeout(() => startListening(), listeningDelay)
      })
      if (!ok) toast('Wake word tidak dapat diaktifkan', 'error')
    } else {
      wakeProvider?.stop()
      setWakeProvider(null)
    }

    return () => { wakeProvider?.stop() }
  }, [wakeWordActive, settings?.wake_word_provider, settings?.wake_word_response_mode, settings?.wake_word_greeting])

  const startListening = useCallback(async () => {
    setPhase('listening')
    setQuery('')

    const stt = new WebSpeechSTT(settings?.stt_language || 'id-ID')
    let finalText = ''

    stt.start(
      (result) => {
        if (result.isFinal) {
          finalText += result.transcript + ' '
          setQuery(finalText)
        } else {
          setQuery(finalText + result.transcript)
        }
      },
      (err) => { setPhase('error'); toast(err, 'error') }
    )

    // Auto-stop after 8 seconds of silence detection or manual stop
    setTimeout(async () => {
      stt.stop()
      if (finalText.trim()) {
        await handleSearch(finalText.trim())
      } else {
        setPhase('idle')
      }
    }, 8000)
  }, [settings])

  const handleSearch = async (q: string) => {
    if (!user || !q.trim()) return
    setPhase('processing')
    setQuery(q)

    try {
      let answerText = ''
      let resultSources: Memory[] = []

      // Coba Dify dulu jika diaktifkan
      const difyConfig = settings ? buildDifyConfig(settings, user.id) : null
      if (difyConfig) {
        const difyResult = await difyQuery(q, difyConfig, difyConversationId)
        answerText = difyResult.answer
        if (difyResult.conversationId) setDifyConversationId(difyResult.conversationId)
      } else {
        // Fallback ke aiService (memory search + LLM)
        const result = await answerQuery(q, user.id, settings!, memories)
        answerText = result.answer
        resultSources = result.sources
      }

      setAnswer(answerText)
      setSources(resultSources)
      setPhase('answer')

      // TTS
      if (settings && settings.tts_provider !== 'none') {
        setSpeaking(true)
        const tts = createTTSProvider(settings)
        await tts.speak(answerText)
        setSpeaking(false)
      }
    } catch (err) {
      console.error('handleSearch error:', err)
      setPhase('error')
      toast(err instanceof Error ? err.message : 'Gagal memproses pertanyaan', 'error')
    }
  }

  const handleTextSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textQuery.trim()) return
    await handleSearch(textQuery)
  }

  const handleSaveConversation = async () => {
    if (!user || !answer) return
    await addMemory({
      user_id: user.id,
      content: `Q: ${query}\nA: ${answer}`,
      tags: ['percakapan', 'tanya-jawab'],
      source: 'text',
      is_pinned: false,
    })
    toast('✓ Percakapan disimpan sebagai ingatan', 'success')
  }

  const phaseConfig = {
    idle: { label: 'Siap', color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
    listening: { label: 'Mendengarkan...', color: 'var(--accent)', bg: 'rgba(124,92,252,0.08)' },
    processing: { label: 'Mencari ingatan...', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
    answer: { label: 'Jawaban ditemukan', color: 'var(--success)', bg: 'rgba(74,222,128,0.08)' },
    error: { label: 'Terjadi kesalahan', color: 'var(--error)', bg: 'rgba(248,113,113,0.08)' },
  }

  const pc = phaseConfig[phase]

  return (
    <div className="p-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Mode Tanya Jawab</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Tanyakan apa saja tentang ingatan Anda. AI akan mencari dan merangkum jawabannya.
        </p>
      </div>

      {/* Wake word toggle */}
      {settings?.wake_word_provider !== 'none' && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Wake Word Listener</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Ucapkan "{settings?.wake_word_custom || 'hey memory'}" untuk memulai
            </p>
          </div>
          <button
            onClick={() => setWakeWordActive(!wakeWordActive)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: wakeWordActive ? 'var(--accent)' : 'var(--bg-tertiary)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: wakeWordActive ? 'translateX(24px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      )}

      {/* Status visual */}
      <div
        className="rounded-2xl p-8 mb-6 text-center relative overflow-hidden transition-all"
        style={{ background: pc.bg, border: `1px solid ${pc.color}30` }}
      >
        {/* Animated rings when listening */}
        {phase === 'listening' && (
          <>
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-2xl border"
                style={{ borderColor: 'var(--accent)' }}
                animate={{ scale: 1 + i * 0.08, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
              />
            ))}
          </>
        )}

        <div className="relative z-10">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: `${pc.color}20` }}
          >
            {phase === 'idle' && <Brain size={32} style={{ color: pc.color }} />}
            {phase === 'listening' && (
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                <Mic size={32} style={{ color: pc.color }} />
              </motion.div>
            )}
            {phase === 'processing' && (
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: pc.color }} />
            )}
            {phase === 'answer' && <Volume2 size={32} style={{ color: pc.color }} />}
            {phase === 'error' && <span className="text-3xl">⚠️</span>}
          </div>

          <p className="font-semibold" style={{ color: pc.color }}>{pc.label}</p>

          {query && (
            <p className="mt-3 text-sm italic px-4" style={{ color: 'var(--text-secondary)' }}>
              "{query}"
            </p>
          )}

          {wakeDetected && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 text-sm font-bold"
              style={{ color: 'var(--accent)' }}
            >
              🔵 Wake word terdeteksi!
            </motion.p>
          )}
        </div>
      </div>

      {/* Manual voice button */}
      <div className="flex gap-3 mb-6">
        <motion.button
          onClick={() => phase === 'idle' || phase === 'answer' ? startListening() : undefined}
          disabled={phase === 'processing' || phase === 'listening'}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white transition-all"
          style={{
            background: phase === 'listening'
              ? 'linear-gradient(135deg, #ef4444, #f97316)'
              : 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            boxShadow: '0 0 20px rgba(124,92,252,0.3)',
            opacity: phase === 'processing' ? 0.5 : 1,
          }}
        >
          <Mic size={20} />
          {phase === 'listening' ? 'Mendengarkan (8 detik)...' : 'Tanya dengan Suara'}
        </motion.button>
      </div>

      {/* Text search */}
      <form onSubmit={handleTextSearch} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={textQuery}
            onChange={e => setTextQuery(e.target.value)}
            placeholder="Atau ketik pertanyaan di sini..."
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={!textQuery.trim() || phase === 'processing'}
            className="btn-primary px-5"
          >
            <Search size={16} />
          </button>
        </div>
      </form>

      {/* Answer */}
      <AnimatePresence>
        {phase === 'answer' && answer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            {/* Answer card */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Jawaban</h3>
                {speaking && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent)' }}>
                    <Volume2 size={12} />
                    <span>Membaca...</span>
                  </div>
                )}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{answer}</p>
            </div>

            {/* Sources */}
            {sources.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                  Sumber ({sources.length} ingatan):
                </p>
                <div className="space-y-2">
                  {sources.slice(0, 3).map(m => (
                    <div key={m.id} className="card p-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {m.content.slice(0, 120)}...
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleSaveConversation} className="btn-secondary text-sm flex-1">
                <Save size={14} /> Simpan sebagai Ingatan
              </button>
              <button onClick={() => { setPhase('idle'); setAnswer(''); setQuery(''); setDifyConversationId(undefined) }} className="btn-secondary text-sm">
                <RefreshCw size={14} /> Tanya Lagi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hints */}
      <div className="mt-8 rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Contoh pertanyaan:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Apa nama dokter yang aku temui minggu lalu?',
            'Di mana aku menaruh kunci cadangan?',
            'Apa yang aku beli kemarin?',
            'Siapa yang aku hubungi untuk plumber?',
          ].map(hint => (
            <button
              key={hint}
              onClick={() => { setTextQuery(hint); handleSearch(hint) }}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
