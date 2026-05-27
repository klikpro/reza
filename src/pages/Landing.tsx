import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { createWakeWordProvider } from '@/services/wakeWordService'
import { createRoundRobinSTT } from '@/services/sttService'
import { createRoundRobinTTS } from '@/services/ttsService'
import { answerQuery } from '@/services/aiService'
import { useBrandingStore } from '@/store/useBrandingStore'
import { Mic, MicOff, LogIn, Lock, ChevronRight, Shield, Zap, Brain } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

type Phase = 'idle' | 'wake' | 'listening' | 'processing' | 'speaking'

// ── Elegant HUD ring data ──────────────────────────────────
const RINGS = [
  { r: 52,  w: 0.8, dashArr: 4,  dashGap: 6,  speed: 0.18,  opacity: 0.25 },
  { r: 80,  w: 1.2, dashArr: 8,  dashGap: 4,  speed: -0.12, opacity: 0.35 },
  { r: 114, w: 0.6, dashArr: 2,  dashGap: 10, speed: 0.22,  opacity: 0.20 },
  { r: 148, w: 1.5, dashArr: 16, dashGap: 6,  speed: -0.08, opacity: 0.45 },
  { r: 185, w: 0.8, dashArr: 3,  dashGap: 8,  speed: 0.15,  opacity: 0.18 },
  { r: 220, w: 1.0, dashArr: 24, dashGap: 8,  speed: -0.10, opacity: 0.30 },
  { r: 260, w: 0.5, dashArr: 1,  dashGap: 12, speed: 0.20,  opacity: 0.12 },
]

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
  const [micAllowed, setMicAllowed] = useState(false)
  const wakeRef = useRef<ReturnType<typeof createWakeWordProvider> | null>(null)
  const sttRef = useRef<ReturnType<typeof createRoundRobinSTT> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const siteName = branding?.site_name || 'KlikPro RME'
  const accentColor = branding?.accent_color || '#0ea5e9'

  // ── Mic access ────────────────────────────────────────────
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
      setMicAllowed(true)
    } catch { /* fallback */ }
  }, [])

  // ── Canvas HUD renderer ───────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    if (canvas.width !== W * DPR || canvas.height !== H * DPR) {
      canvas.width = W * DPR
      canvas.height = H * DPR
      ctx.scale(DPR, DPR)
    }

    const cx = W / 2
    const cy = H / 2
    const t = Date.now() / 1000

    ctx.clearRect(0, 0, W, H)

    // Get audio or simulate
    let dataArray: Uint8Array
    let avg = 0.15 + 0.08 * Math.sin(t * 1.4)
    if (analyserRef.current) {
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(buf)
      dataArray = buf
      avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255
    } else {
      dataArray = new Uint8Array(256).map((_, i) =>
        Math.floor(60 * Math.abs(Math.sin(t * 1.2 + i * 0.12)))
      )
    }

    const isActive = phase === 'listening' || phase === 'speaking'
    const pulse = 1 + avg * (isActive ? 0.06 : 0.02)

    // ── Subtle outer ambient glow ──────────────────────────
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55)
    glow.addColorStop(0, `rgba(14,165,233,${0.04 + avg * 0.04})`)
    glow.addColorStop(0.6, `rgba(14,165,233,0.02)`)
    glow.addColorStop(1, 'rgba(14,165,233,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    // ── Dashed / segmented rings ───────────────────────────
    RINGS.forEach(({ r, w, dashArr, dashGap, speed, opacity }) => {
      const rot = t * speed
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.arc(0, 0, r * pulse, 0, Math.PI * 2)
      const alpha = opacity + avg * 0.15
      ctx.strokeStyle = `rgba(14,165,233,${Math.min(alpha, 0.7)})`
      ctx.lineWidth = w
      ctx.setLineDash([dashArr, dashGap])
      ctx.stroke()
      ctx.restore()
    })

    // ── Frequency bars (radial, elegant thin lines) ────────
    const barCount = Math.min(dataArray.length, 96)
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
      const val = dataArray[i] / 255
      const innerR = 88 * pulse
      const maxBar = isActive ? 48 : 22
      const outerR = innerR + val * maxBar
      const x1 = cx + Math.cos(angle) * innerR
      const y1 = cy + Math.sin(angle) * innerR
      const x2 = cx + Math.cos(angle) * outerR
      const y2 = cy + Math.sin(angle) * outerR
      const alpha = 0.25 + val * (isActive ? 0.7 : 0.4)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgba(14,165,233,${alpha})`
      ctx.lineWidth = 1.2
      ctx.setLineDash([])
      ctx.stroke()
    }

    // ── Crosshair ticks (cardinal) ─────────────────────────
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const r1 = 148 * pulse
      const r2 = r1 + 18
      const x1 = cx + Math.cos(angle) * r1
      const y1 = cy + Math.sin(angle) * r1
      const x2 = cx + Math.cos(angle) * r2
      const y2 = cy + Math.sin(angle) * r2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgba(14,165,233,0.55)`
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.stroke()
    }

    // ── Rotating scanner arc ───────────────────────────────
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(t * 0.35)
    const scanGrad = ctx.createConicalGradient
      ? (ctx as any).createConicalGradient(0, 0, 0)
      : null
    if (!scanGrad) {
      // Fallback: arc with gradient alpha
      const arcR = 148 * pulse
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, arcR, -0.2, 0.9)
      ctx.closePath()
      ctx.fillStyle = `rgba(14,165,233,${0.04 + avg * 0.04})`
      ctx.fill()
    }
    ctx.restore()

    // ── Inner core – clean white circle ───────────────────
    // Outer glow ring
    const coreGlow = ctx.createRadialGradient(cx, cy, 18, cx, cy, 44 * pulse)
    coreGlow.addColorStop(0, `rgba(14,165,233,${0.12 + avg * 0.15})`)
    coreGlow.addColorStop(1, 'rgba(14,165,233,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, 44 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = coreGlow
    ctx.fill()

    // White core circle
    ctx.beginPath()
    ctx.arc(cx, cy, 26 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${0.92 + avg * 0.06})`
    ctx.shadowColor = 'rgba(14,165,233,0.4)'
    ctx.shadowBlur = 20
    ctx.fill()
    ctx.shadowBlur = 0

    // Core ring border
    ctx.beginPath()
    ctx.arc(cx, cy, 26 * pulse, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(14,165,233,${0.5 + avg * 0.4})`
    ctx.lineWidth = 1.2
    ctx.setLineDash([])
    ctx.stroke()

    // ── Corner bracket HUD decorations ────────────────────
    const brackets = [
      [cx - 290, cy - 290, 1, 1],
      [cx + 290, cy - 290, -1, 1],
      [cx - 290, cy + 290, 1, -1],
      [cx + 290, cy + 290, -1, -1],
    ]
    brackets.forEach(([bx, by, sx, sy]) => {
      const len = 18
      const a = 0.15 + avg * 0.1
      ctx.strokeStyle = `rgba(14,165,233,${a})`
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(bx + sx * len, by)
      ctx.lineTo(bx, by)
      ctx.lineTo(bx, by + sy * len)
      ctx.stroke()
    })

    // ── Phase state overlay text ───────────────────────────
    if (phase === 'wake') {
      ctx.font = '500 11px "DM Mono", monospace'
      ctx.fillStyle = `rgba(14,165,233,0.7)`
      ctx.textAlign = 'center'
      ctx.fillText('WAKE WORD DETECTED', cx, cy + 72)
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [phase])

  useEffect(() => {
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  // ── Wake word listener ────────────────────────────────────
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
  }, [user, settings?.wake_word_provider, settings?.wake_word_custom])

  const startListening = useCallback(async () => {
    if (!settings) return
    setPhase('listening')
    setTranscript('')
    setAnswer('')
    if (!micAllowed) await startVisualizer()

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
  }, [settings, user, memories, micAllowed, startVisualizer])

  const handleMicClick = () => {
    if (!user) { navigate('/login'); return }
    if (phase === 'listening') return
    startListening()
  }

  const wakeWord = settings?.wake_word_custom || 'hey memory'

  const phaseLabel: Record<Phase, string> = {
    idle: wakeActive ? `Ucapkan  "${wakeWord}"` : 'Siap menerima perintah',
    wake: 'Wake word terdeteksi',
    listening: 'Mendengarkan...',
    processing: 'Memproses...',
    speaking: 'Menjawab...',
  }

  const phaseColor: Record<Phase, string> = {
    idle: '#94a3b8',
    wake: accentColor,
    listening: accentColor,
    processing: '#f59e0b',
    speaking: '#10b981',
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: '#f8fafc' }}
    >
      {/* ── Subtle grid background ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Top gradient bar ── */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.4), transparent)' }}
      />

      {/* ── Header ── */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-20">
        {/* Logo + name */}
        <div className="flex items-center gap-3">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="logo" className="w-7 h-7 object-contain" />
          ) : (
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}
            >
              <Brain size={14} className="text-white" />
            </div>
          )}
          <span
            className="font-bold tracking-tight text-base"
            style={{ color: '#0f172a', fontFamily: '"DM Sans", sans-serif', letterSpacing: '-0.02em' }}
          >
            {siteName}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium tracking-widest"
            style={{ background: 'rgba(14,165,233,0.08)', color: accentColor, fontFamily: '"DM Mono", monospace' }}
          >
            HUD
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                color: '#fff',
                fontFamily: '"DM Sans", sans-serif',
                boxShadow: '0 2px 12px rgba(14,165,233,0.25)',
              }}
            >
              Dashboard <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                color: '#fff',
                fontFamily: '"DM Sans", sans-serif',
                boxShadow: '0 2px 12px rgba(14,165,233,0.25)',
              }}
            >
              <LogIn size={13} /> Masuk
            </button>
          )}
        </nav>
      </header>

      {/* ── Main HUD canvas area ── */}
      <div className="relative flex items-center justify-center" style={{ width: 600, height: 600 }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />

        {/* Center mic button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.button
            onClick={handleMicClick}
            title={user ? 'Klik untuk bicara' : 'Login untuk menggunakan fitur ini'}
            className="relative flex items-center justify-center rounded-full cursor-pointer"
            style={{
              width: 52,
              height: 52,
              background: user
                ? 'linear-gradient(135deg, #0ea5e9, #38bdf8)'
                : 'rgba(148,163,184,0.2)',
              boxShadow: user ? '0 4px 24px rgba(14,165,233,0.35)' : 'none',
            }}
            whileHover={user ? { scale: 1.08 } : {}}
            whileTap={user ? { scale: 0.94 } : {}}
            animate={phase === 'listening' ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ repeat: phase === 'listening' ? Infinity : 0, duration: 0.9 }}
          >
            {user
              ? phase === 'listening'
                ? <MicOff size={20} className="text-white" />
                : <Mic size={20} className="text-white" />
              : <Lock size={18} style={{ color: '#94a3b8' }} />
            }
            {phase === 'listening' && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: '1.5px solid rgba(14,165,233,0.5)' }}
                animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Status label ── */}
      <motion.div
        className="mt-2 flex flex-col items-center gap-1 z-10"
        key={phase}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <motion.span
            className="rounded-full"
            style={{
              width: 6, height: 6,
              background: phaseColor[phase],
              boxShadow: `0 0 6px ${phaseColor[phase]}`,
            }}
            animate={phase !== 'idle'
              ? { opacity: [1, 0.3, 1] }
              : { opacity: 1 }}
            transition={{ repeat: phase !== 'idle' ? Infinity : 0, duration: 1 }}
          />
          <span
            className="text-sm font-medium tracking-wide"
            style={{
              color: phaseColor[phase],
              fontFamily: '"DM Mono", monospace',
              fontSize: 12,
              letterSpacing: '0.06em',
            }}
          >
            {phaseLabel[phase].toUpperCase()}
          </span>
        </div>

        {transcript && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs mt-1 max-w-xs text-center"
            style={{ color: '#64748b', fontFamily: '"DM Sans", sans-serif' }}
          >
            "{transcript}"
          </motion.p>
        )}
      </motion.div>

      {/* ── Answer card ── */}
      <AnimatePresence>
        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="mt-6 max-w-md w-full mx-6 z-10"
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(14,165,233,0.15)',
              borderRadius: 16,
              padding: '18px 22px',
              boxShadow: '0 4px 32px rgba(14,165,233,0.08), 0 1px 0 rgba(255,255,255,0.8) inset',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={13} style={{ color: accentColor }} />
              <span
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: accentColor, fontFamily: '"DM Mono", monospace' }}
              >
                Respons
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#1e293b', fontFamily: '"DM Sans", sans-serif' }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom HUD info bar ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-4 z-10"
        style={{ borderTop: '1px solid rgba(14,165,233,0.08)' }}
      >
        <div className="flex items-center gap-4">
          <HUDStat icon={<Shield size={11} />} label="STATUS" value={user ? 'AUTHENTICATED' : 'GUEST'} active={!!user} />
          <HUDStat icon={<Zap size={11} />} label="WAKE" value={wakeActive ? wakeWord.toUpperCase() : 'INACTIVE'} active={wakeActive} />
        </div>

        {!user && (
          <p className="text-xs flex items-center gap-1" style={{ color: '#94a3b8', fontFamily: '"DM Mono", monospace', fontSize: 10 }}>
            <Lock size={9} />
            LOGIN UNTUK FITUR PENUH
          </p>
        )}
      </div>

      {/* ── Bottom gradient ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)' }}
      />
    </div>
  )
}

// ── Small HUD stat component ──────────────────────────────────
function HUDStat({ icon, label, value, active }: {
  icon: React.ReactNode
  label: string
  value: string
  active: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: active ? '#0ea5e9' : '#94a3b8' }}>{icon}</span>
      <span
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.08em',
          color: '#94a3b8',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.06em',
          color: active ? '#0ea5e9' : '#64748b',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}
