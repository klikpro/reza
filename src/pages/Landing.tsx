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

// ── Orb ring config: radius, dash, speed, base opacity ────
const RINGS = [
  { r: 60,  w: 0.6, dashArr: 3,  dashGap: 8,  speed:  0.14, opacity: 0.18 },
  { r: 95,  w: 1.0, dashArr: 10, dashGap: 5,  speed: -0.09, opacity: 0.28 },
  { r: 135, w: 0.5, dashArr: 2,  dashGap: 12, speed:  0.18, opacity: 0.14 },
  { r: 172, w: 1.2, dashArr: 18, dashGap: 7,  speed: -0.07, opacity: 0.22 },
  { r: 210, w: 0.4, dashArr: 1,  dashGap: 14, speed:  0.11, opacity: 0.09 },
  { r: 248, w: 0.8, dashArr: 22, dashGap: 9,  speed: -0.06, opacity: 0.12 },
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

  // ── Canvas HUD renderer — clean voice orb ───────────────
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

    // ── Audio data ─────────────────────────────────────────
    let freqData: Uint8Array<ArrayBuffer>
    let timeData: Uint8Array<ArrayBuffer>
    let avg = 0.06 + 0.04 * Math.sin(t * 1.2)

    if (analyserRef.current) {
      freqData = new Uint8Array(new ArrayBuffer(analyserRef.current.frequencyBinCount))
      timeData = new Uint8Array(new ArrayBuffer(analyserRef.current.frequencyBinCount))
      analyserRef.current.getByteFrequencyData(freqData)
      analyserRef.current.getByteTimeDomainData(timeData)
      let rms = 0
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128
        rms += v * v
      }
      avg = Math.sqrt(rms / timeData.length)
    } else {
      const fb = new ArrayBuffer(128)
      const tb = new ArrayBuffer(128)
      freqData = new Uint8Array(fb)
      timeData = new Uint8Array(tb)
      for (let i = 0; i < 128; i++) {
        freqData[i] = Math.floor(40 * Math.abs(Math.sin(t * 0.9 + i * 0.15)))
        timeData[i] = 128
      }
    }

    const isActive = phase === 'listening' || phase === 'speaking'
    // smooth pulse: idle breathes softly, active reacts to sound
    const breathe = 1 + 0.025 * Math.sin(t * 1.8)
    const pulse = isActive ? breathe + avg * 0.18 : breathe

    // ── Ambient radial glow (very subtle, grey-blue) ───────
    const ambientR = 280
    const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientR)
    const ambAlpha = 0.04 + avg * 0.06
    ambient.addColorStop(0,   `rgba(120,180,220,${ambAlpha})`)
    ambient.addColorStop(0.5, `rgba(80,120,160,${ambAlpha * 0.4})`)
    ambient.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.fillStyle = ambient
    ctx.fillRect(0, 0, W, H)

    // ── Rotating dashed rings ──────────────────────────────
    ctx.setLineDash([])
    RINGS.forEach(({ r, w, dashArr, dashGap, speed, opacity }) => {
      const rot = t * speed
      const alpha = Math.min(opacity + avg * 0.22, 0.55)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.arc(0, 0, r * pulse, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(160,200,230,${alpha})`
      ctx.lineWidth = w
      ctx.setLineDash([dashArr, dashGap])
      ctx.stroke()
      ctx.restore()
    })
    ctx.setLineDash([])

    // ── Radial frequency bars ──────────────────────────────
    const barCount = 80
    const innerR = 72 * pulse
    const maxBarH = isActive ? 52 : 18
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
      const fi = Math.floor((i / barCount) * freqData.length * 0.65)
      const val = freqData[fi] / 255
      const outerR = innerR + val * maxBarH
      const isMaj = i % 10 === 0
      const baseAlpha = isMaj ? 0.35 : 0.18
      const alpha = Math.min(baseAlpha + val * (isActive ? 0.55 : 0.3), 0.75)
      // colour: white for major, grey-blue for minor
      const rgb = isMaj ? '220,235,245' : '180,210,230'
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR)
      ctx.strokeStyle = `rgba(${rgb},${alpha})`
      ctx.lineWidth = isMaj ? 1.5 : 0.8
      ctx.stroke()
    }

    // ── 72 tick marks at outermost ring ───────────────────
    const tickR = 172 * pulse
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2 - Math.PI / 2
      const isMaj = i % 6 === 0
      const fi = Math.floor((i / 72) * freqData.length * 0.5)
      const fv = freqData[fi] / 255
      const tickLen = (isMaj ? 10 : 5) + (isActive ? fv * 10 : 0)
      const r0 = tickR
      const r1 = tickR - tickLen
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0)
      ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1)
      ctx.strokeStyle = isMaj
        ? `rgba(200,225,245,${0.4 + avg * 0.35})`
        : `rgba(160,185,210,${0.18 + avg * 0.18})`
      ctx.lineWidth = isMaj ? 1.2 : 0.6
      ctx.stroke()
    }

    // ── Wave blob outline (reacts to time-domain data) ─────
    if (isActive && avg > 0.01) {
      const waveR = 76
      const wavePts = 64
      ctx.beginPath()
      for (let i = 0; i <= wavePts; i++) {
        const angle = (i / wavePts) * Math.PI * 2 - Math.PI / 2
        const ti = Math.floor((i / wavePts) * timeData.length)
        const tv = (timeData[ti] - 128) / 128
        const r = waveR * pulse + tv * avg * 22
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = `rgba(180,220,255,${Math.min(avg * 3, 0.45)})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // ── Core sphere glow halo ──────────────────────────────
    const haloR = 58 * pulse
    const halo = ctx.createRadialGradient(cx, cy, haloR * 0.3, cx, cy, haloR)
    halo.addColorStop(0, `rgba(140,195,230,${0.08 + avg * 0.12})`)
    halo.addColorStop(1, 'rgba(100,160,210,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    // ── Core sphere — white with glass sheen ───────────────
    const coreR = 32 * pulse
    // base fill: slightly blue-white
    const coreFill = ctx.createRadialGradient(
      cx - coreR * 0.28, cy - coreR * 0.28, coreR * 0.05,
      cx, cy, coreR
    )
    coreFill.addColorStop(0, `rgba(255,255,255,${0.97 + avg * 0.03})`)
    coreFill.addColorStop(0.55, `rgba(215,235,250,${0.92})`)
    coreFill.addColorStop(1, `rgba(140,185,220,${0.82})`)
    ctx.beginPath()
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
    ctx.fillStyle = coreFill
    ctx.fill()

    // glass sheen top-left
    ctx.beginPath()
    ctx.arc(cx - coreR * 0.18, cy - coreR * 0.18, coreR * 0.38, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,0.38)`
    ctx.fill()

    // outer ring of core
    ctx.beginPath()
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(160,210,240,${0.45 + avg * 0.45})`
    ctx.lineWidth = 1
    ctx.stroke()

    rafRef.current = requestAnimationFrame(draw)
  }, [phase])

  useEffect(() => {
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  // ── Speak helper — langsung TTS tanpa AI ────────────────
  const speak = useCallback(async (text: string) => {
    if (!settings) return
    setPhase('speaking')
    setAnswer(text)
    const tts = createRoundRobinTTS(settings)
    await tts.speak(text)
    setPhase('idle')
    setAnswer('')
  }, [settings])

  // ── Wake word listener ────────────────────────────────────
  useEffect(() => {
    if (!settings || settings.wake_word_provider === 'none') return

    const userName = user?.full_name?.split(' ')[0] || 'Reza'
    const siteName_ = branding?.site_name || 'KlikPro RME'

    const provider = createWakeWordProvider(settings)
    wakeRef.current = provider
    provider.start(async () => {
      setPhase('wake')
      await startVisualizer()
      // Sapa langsung via TTS
      await speak(
        `Halo ${userName}! Saya asisten AI ${siteName_}. ` +
        `Saya siap membantu Anda mengelola rekam medis. ` +
        `Silakan ucapkan perintah Anda setelah ini.`
      )
      // Lanjut listening kalau user sudah login
      if (user) {
        setTimeout(() => startListening(), 400)
      }
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
          <motion.span
            className="rounded-full"
            style={{
              width: 6, height: 6,
              background: phaseColor[phase],
              boxShadow: `0 0 6px ${phaseColor[phase]}`,
            }}
            animate={phase !== 'idle' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={{ repeat: phase !== 'idle' ? Infinity : 0, duration: 1 }}
          />
          <span
            style={{
              color: phaseColor[phase],
              fontFamily: '"DM Mono", monospace',
              fontSize: 12,
              letterSpacing: '0.06em',
              fontWeight: 500,
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
          <p className="flex items-center gap-1" style={{ color: '#94a3b8', fontFamily: '"DM Mono", monospace', fontSize: 10 }}>
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
      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, letterSpacing: '0.08em', color: '#94a3b8' }}>
        {label}
      </span>
      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, letterSpacing: '0.06em', color: active ? '#0ea5e9' : '#64748b', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}
