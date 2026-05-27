import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Pause, Play, X, Save, AlertCircle } from 'lucide-react'
import { useVoiceStore } from '@/store/useVoiceStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { WebSpeechSTT } from '@/services/sttService'
import { generateEmbedding } from '@/services/aiService'
import { toast } from '@/components/ui/Toaster'

interface Props {
  open: boolean
  onClose: () => void
}

export default function VoiceRecorderModal({ open, onClose }: Props) {
  const { voiceState, transcript, interimTranscript, audioLevel, recordingDuration,
    setVoiceState, setTranscript, setInterimTranscript, setAudioLevel, setRecordingDuration,
    setError, reset } = useVoiceStore()
  const { addMemory } = useMemoryStore()
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()

  const sttRef = useRef<WebSpeechSTT | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [saving, setSaving] = useState(false)
  const [fullTranscript, setFullTranscript] = useState('')

  const stopAll = useCallback(() => {
    sttRef.current?.stop()
    sttRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    reset()
    setFullTranscript('')
    setVoiceState('recording')

    // Get mic stream for visualizer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      drawWaveform()
    } catch { /* mic access denied */ }

    // STT
    const lang = settings?.stt_language || 'id-ID'
    sttRef.current = new WebSpeechSTT(lang)
    let accumulated = ''

    const ok = sttRef.current.start(
      (result) => {
        if (result.isFinal) {
          accumulated += result.transcript + ' '
          setFullTranscript(accumulated)
          setTranscript(accumulated)
          setInterimTranscript('')
        } else {
          setInterimTranscript(result.transcript)
        }
      },
      (err) => {
        setError(err)
        setVoiceState('error')
      }
    )

    if (!ok) {
      setError('Web Speech API tidak tersedia. Pastikan Anda menggunakan Chrome/Edge.')
      setVoiceState('error')
      return
    }

    // Timer
    let secs = 0
    timerRef.current = setInterval(() => {
      secs++
      setRecordingDuration(secs)
    }, 1000)
  }, [settings, reset, setVoiceState, setTranscript, setInterimTranscript, setError, setRecordingDuration])

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0
      let avg = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8
        avg += dataArray[i]

        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c5cfc'
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.8
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }

      setAudioLevel(avg / bufferLength / 255)
    }

    draw()
  }, [setAudioLevel])

  const handleStop = useCallback(async () => {
    stopAll()
    setVoiceState('idle')
  }, [stopAll, setVoiceState])

  const handleSave = useCallback(async () => {
    if (!user || !fullTranscript.trim()) return
    setSaving(true)

    let embedding = null
    if (settings?.ai_enabled && settings.ai_api_key) {
      embedding = await generateEmbedding(fullTranscript, settings)
    }

    const memory = await addMemory({
      user_id: user.id,
      content: fullTranscript.trim(),
      tags: [],
      source: 'voice',
      is_pinned: false,
      embedding: embedding || undefined,
    })

    setSaving(false)
    if (memory) {
      toast('✓ Ingatan tersimpan!', 'success')
      reset()
      setFullTranscript('')
      onClose()
    } else {
      toast('Gagal menyimpan ingatan', 'error')
    }
  }, [user, fullTranscript, settings, addMemory, reset, onClose])

  useEffect(() => {
    if (!open) {
      stopAll()
      reset()
      setFullTranscript('')
    }
  }, [open, stopAll, reset])

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: voiceState === 'recording' ? '#ef4444' : 'var(--text-muted)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {voiceState === 'recording' ? 'Merekam...' : 'Perekam Suara'}
              </span>
              {voiceState === 'recording' && (
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>
                  {formatDuration(recordingDuration)}
                </span>
              )}
            </div>
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Waveform Canvas */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', height: 80 }}>
              {voiceState === 'recording' ? (
                <canvas ref={canvasRef} width={400} height={80} className="w-full h-full" />
              ) : (
                <div className="flex items-center justify-center h-full gap-1.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full"
                      style={{
                        height: `${20 + Math.random() * 40}px`,
                        background: 'var(--border)',
                        opacity: 0.5,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Error state */}
            {voiceState === 'error' && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <AlertCircle size={16} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: 'var(--error)' }}>{useVoiceStore.getState().error || 'Terjadi kesalahan'}</p>
              </div>
            )}

            {/* Transcript */}
            <div className="rounded-xl p-4 min-h-[80px]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {fullTranscript || interimTranscript ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {fullTranscript}
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {interimTranscript}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  {voiceState === 'recording'
                    ? 'Bicara sekarang... teks akan muncul di sini'
                    : 'Mulai rekam untuk menyimpan ingatan baru'
                  }
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {voiceState === 'idle' || voiceState === 'error' ? (
                <motion.button
                  onClick={startRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 0 20px rgba(124,92,252,0.4)' }}
                >
                  <Mic size={18} />
                  Mulai Rekam
                </motion.button>
              ) : (
                <>
                  <button
                    onClick={handleStop}
                    className="p-3 rounded-xl border transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    title="Berhenti"
                  >
                    <Square size={18} />
                  </button>

                  {(fullTranscript || interimTranscript) && (
                    <motion.button
                      onClick={handleSave}
                      disabled={saving}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                      style={{ background: 'var(--success)', color: '#000' }}
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : <Save size={16} />}
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </motion.button>
                  )}
                </>
              )}
            </div>

            {/* Hint */}
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Menggunakan Web Speech API · Butuh koneksi internet
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
