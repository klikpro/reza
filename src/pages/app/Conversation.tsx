import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { WebSpeechSTT } from '@/services/sttService'
import { createTTSProvider } from '@/services/ttsService'
import { answerQuery } from '@/services/aiService'
import { toast } from '@/components/ui/Toaster'

type Phase = 'idle' | 'listening' | 'processing' | 'speaking'

interface Turn {
  role: 'user' | 'assistant'
  text: string
}

export default function Conversation() {
  const { user } = useAuthStore()
  const { memories } = useMemoryStore()
  const { settings } = useSettingsStore()

  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [turns, setTurns] = useState<Turn[]>([])
  const [interim, setInterim] = useState('')
  const sttRef = useRef<WebSpeechSTT | null>(null)
  const stoppedRef = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)

  // Auto-scroll log ke bawah
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [turns, interim])

  const stopAll = useCallback(() => {
    stoppedRef.current = true
    sttRef.current?.stop()
    window.speechSynthesis?.cancel()
    setActive(false)
    setPhase('idle')
    setInterim('')
  }, [])

  const startListeningLoop = useCallback(async () => {
    if (!user || !settings || stoppedRef.current) return

    setPhase('listening')
    setInterim('')

    const stt = new WebSpeechSTT(settings.stt_language || 'id-ID')
    sttRef.current = stt

    let finalText = ''
    let silenceTimer: ReturnType<typeof setTimeout> | null = null

    const resetSilence = () => {
      if (silenceTimer) clearTimeout(silenceTimer)
      silenceTimer = setTimeout(async () => {
        stt.stop()
        if (stoppedRef.current) return

        if (!finalText.trim()) {
          // Tidak ada input — ulangi listening
          startListeningLoop()
          return
        }

        const question = finalText.trim()
        setInterim('')
        setTurns(prev => [...prev, { role: 'user', text: question }])
        setPhase('processing')

        try {
          const result = await answerQuery(question, user.id, settings, memories)
          if (stoppedRef.current) return

          const answer = result.answer
          setTurns(prev => [...prev, { role: 'assistant', text: answer }])
          setPhase('speaking')

          const tts = createTTSProvider(settings)
          await tts.speak(answer)

          if (!stoppedRef.current) startListeningLoop()
        } catch {
          if (!stoppedRef.current) {
            toast('Gagal mendapatkan jawaban', 'error')
            startListeningLoop()
          }
        }
      }, 2000) // 2 detik diam → proses
    }

    stt.start(
      (result) => {
        if (result.isFinal) {
          finalText += result.transcript + ' '
          setInterim('')
          resetSilence()
        } else {
          setInterim(result.transcript)
          resetSilence()
        }
      },
      (err) => {
        if (!stoppedRef.current) {
          console.warn('STT error:', err)
          setTimeout(() => startListeningLoop(), 1000)
        }
      }
    )
  }, [user, settings, memories])

  const handleStart = useCallback(() => {
    stoppedRef.current = false
    setActive(true)
    setTurns([])

    // Sapa dulu sebelum mulai dengerin
    const greeting = settings?.wake_word_greeting || 'Halo! Silakan bicara, saya siap mendengarkan.'
    if (settings && settings.tts_provider !== 'none') {
      const tts = createTTSProvider(settings)
      setPhase('speaking')
      tts.speak(greeting).then(() => {
        if (!stoppedRef.current) startListeningLoop()
      })
    } else {
      startListeningLoop()
    }

    setTurns([{ role: 'assistant', text: greeting }])
  }, [settings, startListeningLoop])

  const handleStop = useCallback(() => {
    stopAll()
  }, [stopAll])

  // Cleanup saat unmount
  useEffect(() => {
    return () => { stopAll() }
  }, [stopAll])

  const phaseLabel: Record<Phase, string> = {
    idle: 'Percakapan belum dimulai',
    listening: 'Mendengarkan...',
    processing: 'Mencari ingatan...',
    speaking: 'Berbicara...',
  }

  const phaseColor: Record<Phase, string> = {
    idle: 'var(--text-muted)',
    listening: 'var(--accent)',
    processing: '#60a5fa',
    speaking: '#4ade80',
  }

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24 md:pb-6 flex flex-col" style={{ minHeight: '80vh' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          Mode Percakapan
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Bicara langsung — AI akan mendengar, mencari ingatan, lalu menjawab dengan suara.
        </p>
      </div>

      {/* Status orb */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="relative flex items-center justify-center">
          {/* Pulse rings saat listening atau speaking */}
          {(phase === 'listening' || phase === 'speaking') && (
            <>
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border"
                  style={{
                    width: 96 + i * 28,
                    height: 96 + i * 28,
                    borderColor: phaseColor[phase],
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.3 }}
                />
              ))}
            </>
          )}

          {/* Orb utama */}
          <motion.div
            animate={phase === 'listening' ? { scale: [1, 1.07, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 0.9 }}
            className="w-24 h-24 rounded-full flex items-center justify-center z-10"
            style={{
              background: active
                ? `radial-gradient(circle at 40% 35%, ${phaseColor[phase]}80, ${phaseColor[phase]}30)`
                : 'var(--bg-secondary)',
              boxShadow: active ? `0 0 40px ${phaseColor[phase]}50` : 'none',
              border: `2px solid ${phaseColor[phase]}60`,
            }}
          >
            {phase === 'processing' ? (
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: phaseColor[phase] }}
              />
            ) : phase === 'speaking' ? (
              <Volume2 size={32} style={{ color: phaseColor[phase] }} />
            ) : (
              <Mic size={32} style={{ color: phaseColor[phase] }} />
            )}
          </motion.div>
        </div>

        {/* Label status */}
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold"
          style={{ color: phaseColor[phase] }}
        >
          {phaseLabel[phase]}
        </motion.p>

        {/* Interim transcript */}
        <AnimatePresence>
          {interim && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm italic px-4 text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              "{interim}"
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Log percakapan */}
      <div
        ref={logRef}
        className="flex-1 rounded-2xl p-4 mb-6 overflow-y-auto space-y-3"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          minHeight: 200,
          maxHeight: 340,
        }}
      >
        {turns.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
            Tekan Mulai Percakapan lalu bicara...
          </p>
        ) : (
          turns.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {t.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  AI
                </div>
              )}
              <div
                className="max-w-xs px-4 py-2 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: t.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: t.role === 'user' ? 'white' : 'var(--text-primary)',
                  borderRadius: t.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}
              >
                {t.text}
              </div>
              {t.role === 'user' && (
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                >
                  Anda
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Tombol kontrol */}
      <div className="flex gap-4 justify-center">
        {!active ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleStart}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white text-base"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              boxShadow: '0 0 24px rgba(124,92,252,0.4)',
            }}
          >
            <Mic size={22} />
            Mulai Percakapan
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleStop}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white text-base"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              boxShadow: '0 0 24px rgba(239,68,68,0.4)',
            }}
          >
            <PhoneOff size={22} />
            Akhiri Percakapan
          </motion.button>
        )}
      </div>

      {/* Tips */}
      {!active && (
        <div
          className="mt-6 rounded-xl p-4 text-sm"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Cara pakai:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tekan <strong>Mulai Percakapan</strong></li>
            <li>Bicara — AI mendengarkan otomatis</li>
            <li>Diam 2 detik → AI mencari ingatan & menjawab dengan suara</li>
            <li>Setelah AI selesai bicara, Anda bisa langsung bicara lagi</li>
          </ol>
        </div>
      )}
    </div>
  )
}
