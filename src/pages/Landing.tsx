import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { createWakeWordProvider } from '@/services/wakeWordService'
import { createRoundRobinSTT } from '@/services/sttService'
import { createRoundRobinTTS } from '@/services/ttsService'
import { answerQuery } from '@/services/aiService'
import { useBrandingStore } from '@/store/useBrandingStore'
import { Mic, MicOff, LogIn, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

type Phase = 'idle' | 'wake' | 'listening' | 'processing' | 'speaking'

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const { memories } = useMemoryStore()
  const { branding } = useBrandingStore()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('idle')
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const [wakeActive, setWakeActive] = useState(false)
  const wakeRef = useRef<ReturnType<typeof createWakeWordProvider> | null>(null)
  const sttRef = useRef<ReturnType<typeof createRoundRobinSTT> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const siteName = branding?.site_name || 'MemoryVault'
  const accentColor = branding?.accent_color || '#06b6d4'

  // ── Audio visualizer ──────────────────────────────────────
  const startVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      src.connect(analyser)
      analyserRef.current = analyser
    } catch { /* mic not granted, fallback to idle animation */ }
  }, [])

  const drawJarvis = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const t = Date.now() / 1000

    ctx.clearRect(0, 0, W, H)

    // Background radial glow
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
    bg.addColorStop(0, 'rgba(6,182,212,0.08)')
    bg.addColorStop(0.5, 'rgba(139,92,246,0.04)')
    bg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Get audio data or fake it
    let dataArray: Uint8Array
    let avg = 0.3 + 0.2 * Math.sin(t * 2)
    if (analyserRef.current) {
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(buf)
      dataArray = buf
      avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255
    } else {
      dataArray = new Uint8Array(256).map((_, i) =>
        Math.floor(100 * Math.abs(Math.sin(t * 2 + i * 0.15)))
      )
    }

    const pulse = 1 + avg * 0.4

    // Concentric rings
    const rings = [
      { r: 60, w: 1.5, a: 0.6 },
      { r: 100, w: 1, a: 0.4 },
      { r: 150, w: 2, a: 0.7 },
      { r: 200, w: 1, a: 0.3 },
      { r: 260, w: 1.5, a: 0.5 },
    ]
    rings.forEach(({ r, w, a }) => {
      ctx.beginPath()
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(6,182,212,${a})`
      ctx.lineWidth = w
      ctx.stroke()
    })

    // Rotating dashes on outer ring
    const dashCount = 36
    for (let i = 0; i < dashCount; i++) {
      const angle = (i / dashCount) * Math.PI * 2 + t * 0.5
      const r1 = 270 * pulse
      const r2 = r1 + (i % 3 === 0 ? 14 : 8)
      const x1 = cx + Math.cos(angle) * r1
      const y1 = cy + Math.sin(angle) * r1
      const x2 = cx + Math.cos(angle) * r2
      const y2 = cy + Math.sin(angle) * r2
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(t + i))
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgba(139,92,246,${alpha})`
      ctx.lineWidth = i % 3 === 0 ? 2 : 1
      ctx.stroke()
    }

    // Frequency bars in a circle
    const barCount = Math.min(dataArray.length, 128)
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
      const val = dataArray[i] / 255
      const innerR = 115 * pulse
      const outerR = innerR + val * 90
      const x1 = cx + Math.cos(angle) * innerR
      const y1 = cy + Math.sin(angle) * innerR
      const x2 = cx + Math.cos(angle) * outerR
      const y2 = cy + Math.sin(angle) * outerR
      const h = 180 + (i / barCount) * 120  // cyan → purple hue
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `hsla(${h},90%,70%,${0.5 + val * 0.5})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Inner core glow
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55 * pulse)
    core.addColorStop(0, `rgba(6,182,212,${0.3 + avg * 0.5})`)
    core.addColorStop(0.5, `rgba(139,92,246,${0.2 + avg * 0.3})`)
    core.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, 55 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = core
    ctx.fill()

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 28 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(6,182,212,${0.15 + avg * 0.3})`
    ctx.fill()
    ctx.strokeStyle = 'rgba(6,182,212,0.8)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Floating particles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + t * (0.3 + i * 0.02)
      const r = (180 + i * 6) * pulse + avg * 30
      const px = cx + Math.cos(angle) * r
      const py = cy + Math.sin(angle) * r
      const size = 1.5 + avg * 3
      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${190 + i * 8},90%,75%,${0.4 + avg * 0.6})`
      ctx.fill()
    }

    // Phase text overlay
    if (phase === 'wake') {
      ctx.font = 'bold 14px Inter, sans-serif'
      ctx.fillStyle = 'rgba(6,182,212,0.9)'
      ctx.textAlign = 'center'
      ctx.fillText('WAKE WORD DETECTED', cx, cy + 80)
    }

    rafRef.current = requestAnimationFrame(drawJarvis)
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    drawJarvis()
    return () => cancelAnimationFrame(rafRef.current)
  }, [drawJarvis])

  // ── Wake word on landing (only if logged in + configured) ──
  useEffect(() => {
    if (!user || !settings || settings.wake_word_provider === 'none') return

    const provider = createWakeWordProvider(settings)
    wakeRef.current = provider
    provider.start(async () => {
      setPhase('wake')
      await startVisualizer()
      setTimeout(() => startListening(), 1200)
    })
    setWakeActive(true)

    return () => { provider.stop(); setWakeActive(false) }
  }, [user, settings?.wake_word_provider])

  const startListening = useCallback(async () => {
    if (!settings) return
    setPhase('listening')
    setTranscript('')
    setAnswer('')

    const stt = createRoundRobinSTT(settings)
    sttRef.current = stt
    let final = ''

    stt.start(
      (r) => {
        if (r.isFinal) { final += r.transcript + ' '; setTranscript(final) }
        else setTranscript(final + r.transcript)
      },
      () => {}
    )

    setTimeout(async () => {
      stt.stop()
      if (!final.trim()) { setPhase('idle'); return }
      setPhase('processing')
      if (!user) { setPhase('idle'); return }
      const result = await answerQuery(final.trim(), user.id, settings, memories)
      setAnswer(result.answer)
      setPhase('speaking')
      const tts = createRoundRobinTTS(settings)
      await tts.speak(result.answer)
      setPhase('idle')
    }, 7000)
  }, [settings, user, memories])

  const handleMicClick = () => {
    if (!user) { navigate('/login'); return }
    startListening()
  }

  // resize canvas
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current
      if (!c) return
      c.width = c.offsetWidth * window.devicePixelRatio
      c.height = c.offsetHeight * window.devicePixelRatio
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const phaseLabel: Record<Phase, string> = {
    idle: wakeActive ? `Ucapkan "${settings?.wake_word_custom || 'hey memory'}"` : siteName,
    wake: 'Wake word terdeteksi...',
    listening: 'Mendengarkan...',
    processing: 'Mencari ingatan...',
    speaking: 'Menjawab...',
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #f5f3ff 100%)' }}>

      {/* Top-right login button */}
      <div className="absolute top-6 right-6 z-20">
        {user ? (
          <button onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}>
            Dashboard →
          </button>
        ) : (
          <button onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}>
            <LogIn size={15} /> Login
          </button>
        )}
      </div>

      {/* Site name top-left */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
        {branding?.logo_url && (
          <img src={branding.logo_url} alt="logo" className="w-8 h-8 object-contain rounded-lg" />
        )}
        <span className="font-black text-xl" style={{ color: accentColor }}>{siteName}</span>
      </div>

      {/* Main Jarvis canvas */}
      <div className="relative w-full max-w-2xl aspect-square max-h-[70vh]">
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Center mic button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.button
            onClick={handleMicClick}
            className="pointer-events-auto relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: user
                ? `linear-gradient(135deg, ${accentColor}, #8b5cf6)`
                : 'rgba(156,163,175,0.5)',
              backdropFilter: 'blur(8px)',
            }}
            whileHover={user ? { scale: 1.1 } : {}}
            whileTap={user ? { scale: 0.95 } : {}}
            animate={phase === 'listening' ? { scale: [1, 1.08, 1] } : {}}
            transition={{ repeat: phase === 'listening' ? Infinity : 0, duration: 0.8 }}
            title={user ? 'Mulai bicara' : 'Login untuk menggunakan fitur ini'}
          >
            {user
              ? phase === 'listening' ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />
              : <Lock size={20} className="text-white opacity-70" />
            }
            {phase === 'listening' && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ background: accentColor }} />
            )}
          </motion.button>
        </div>
      </div>

      {/* Status label */}
      <motion.div className="mt-6 text-center px-6 z-10" animate={{ opacity: 1 }}>
        <p className="text-lg font-semibold" style={{ color: accentColor }}>
          {phaseLabel[phase]}
        </p>
        {transcript && (
          <p className="text-sm mt-2 max-w-md mx-auto italic" style={{ color: '#6b7280' }}>
            "{transcript}"
          </p>
        )}
      </motion.div>

      {/* Answer card */}
      <AnimatePresence>
        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 max-w-lg w-full mx-4 p-5 rounded-2xl shadow-xl z-10 text-sm leading-relaxed"
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${accentColor}40`,
              color: '#1e293b',
            }}
          >
            <p className="font-semibold mb-1" style={{ color: accentColor }}>Jawaban:</p>
            {answer}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not logged in hint */}
      {!user && (
        <p className="mt-4 text-xs z-10" style={{ color: '#94a3b8' }}>
          <Lock size={11} className="inline mr-1" />
          Login untuk merekam ingatan dan menggunakan wake word
        </p>
      )}
    </div>
  )
}
