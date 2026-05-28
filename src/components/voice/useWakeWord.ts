import { useEffect, useRef, useCallback } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useVoiceStore } from '@/store/useVoiceStore'

/**
 * useWakeWord
 * -----------
 * Hook yang dijalankan di AppLayout (level global, selalu aktif).
 * Tugas:
 *  1. Mendengarkan wake word / hotkey sesuai pengaturan pengguna.
 *  2. Saat terdeteksi → jalankan respons audio (chime, sapaan TTS, atau keduanya)
 *     sesuai wake_word_response_mode dari settings.
 *  3. Membuka VoiceRecorderModal via floating mic button.
 */
export function useWakeWord(onWakeDetected: () => void) {
  const { settings } = useSettingsStore()
  const { setVoiceState } = useVoiceStore()

  // Ref agar callback terbaru selalu terbaca tanpa re-subscribe listener
  const settingsRef = useRef(settings)
  const onWakeRef = useRef(onWakeDetected)
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { onWakeRef.current = onWakeDetected }, [onWakeDetected])

  // ── Chime: AudioContext nada pendek ──────────────────────────────────────
  const playChime = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
      osc.onended = () => ctx.close()
    } catch { /* AudioContext tidak tersedia */ }
  }, [])

  // ── Chime konfirmasi: nada naik ──────────────────────────────────────────
  const playConfirmChime = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
      osc.onended = () => ctx.close()
    } catch { /* ignore */ }
  }, [])

  // ── TTS sapaan via Web Speech Synthesis ─────────────────────────────────
  const speakGreeting = useCallback((text: string, lang: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel() // batalkan jika ada yang sedang bicara
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = lang
    utt.rate = 1.0
    utt.pitch = 1.1
    utt.volume = 0.9
    window.speechSynthesis.speak(utt)
  }, [])

  // ── Respons utama saat wake word terdeteksi ──────────────────────────────
  const handleWakeDetected = useCallback(() => {
    const s = settingsRef.current
    if (!s) return

    // Ambil langsung dari settingsRef untuk pastikan nilai terbaru
    const mode = s.wake_word_response_mode || 'greeting+chime'
    const greeting = s.wake_word_greeting || 'Halo! Ada yang bisa saya bantu?'
    const lang = s.wake_word_language || 'id-ID'
    const useChime = s.wake_word_listening_sound !== false // default true

    if (mode === 'chime' || mode === 'greeting+chime') {
      if (useChime) playChime()
    }

    if (mode === 'greeting' || mode === 'greeting+chime') {
      // Tunggu chime selesai baru bicara (~450ms)
      const delay = (mode === 'greeting+chime' && useChime) ? 450 : 0
      setTimeout(() => speakGreeting(greeting, lang), delay)
    }

    // Buka recorder
    setTimeout(() => {
      setVoiceState('wake_detected')
      onWakeRef.current()
    }, mode === 'silent' ? 0 : 100)
  }, [playChime, speakGreeting, setVoiceState])

  // ── Listener: keyboard hotkey ────────────────────────────────────────────
  useEffect(() => {
    if (settings?.wake_word_provider !== 'hotkey') return
    const combo = (settings.wake_word_key ?? 'ctrl+shift+m').toLowerCase()

    const onKeyDown = (e: KeyboardEvent) => {
      const pressed = [
        e.ctrlKey && 'ctrl',
        e.metaKey && 'meta',
        e.shiftKey && 'shift',
        e.altKey && 'alt',
        e.key.toLowerCase(),
      ].filter(Boolean).join('+')

      if (pressed === combo) {
        e.preventDefault()
        handleWakeDetected()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [settings?.wake_word_provider, settings?.wake_word_key, handleWakeDetected])

  // ── Listener: browser keyword via Web Speech API ─────────────────────────
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (settings?.wake_word_provider !== 'browser-keyword') {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const keyword = (settings.wake_word_custom ?? 'hey memory').toLowerCase()
    const lang = settings.wake_word_language ?? 'id-ID'

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang
    recognitionRef.current = recognition

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase()
        if (text.includes(keyword)) {
          handleWakeDetected()
          break
        }
      }
    }

    recognition.onend = () => {
      // Auto-restart agar terus mendengarkan
      try { recognition.start() } catch { /* ignore jika sudah stop */ }
    }

    try { recognition.start() } catch { /* ignore */ }

    return () => {
      recognition.onend = null
      try { recognition.stop() } catch { /* ignore */ }
    }
  }, [
    settings?.wake_word_provider,
    settings?.wake_word_custom,
    settings?.wake_word_language,
    handleWakeDetected,
  ])

  return { playConfirmChime }
}
