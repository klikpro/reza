import type { UserSettings } from '@/types'

interface TTSProvider { speak(text: string): Promise<void>; stop(): void }

// ── Web Speech Synthesis ────────────────────────────────────
class WebSpeechTTS implements TTSProvider {
  constructor(private s: UserSettings) {}
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = this.s.tts_rate || 1
      u.pitch = this.s.tts_pitch || 1
      u.volume = this.s.tts_volume || 1
      if (this.s.tts_voice_id) {
        const v = window.speechSynthesis.getVoices().find(x => x.voiceURI === this.s.tts_voice_id)
        if (v) u.voice = v
      }
      u.onend = () => resolve()
      u.onerror = (e) => reject(new Error(e.error))
      window.speechSynthesis.speak(u)
    })
  }
  stop() { window.speechSynthesis.cancel() }
}

// ── OpenAI TTS ──────────────────────────────────────────────
class OpenAITTS implements TTSProvider {
  private audio: HTMLAudioElement | null = null
  constructor(private s: UserSettings) {}
  async speak(text: string): Promise<void> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.s.tts_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.s.tts_model || 'tts-1', input: text, voice: this.s.tts_voice_id || 'nova', speed: this.s.tts_rate || 1 }),
    })
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    this.audio = new Audio(url)
    return new Promise((resolve, reject) => {
      this.audio!.onended = () => { URL.revokeObjectURL(url); resolve() }
      this.audio!.onerror = reject
      this.audio!.play()
    })
  }
  stop() { this.audio?.pause(); this.audio = null }
}

// ── ElevenLabs TTS ──────────────────────────────────────────
class ElevenLabsTTS implements TTSProvider {
  private audio: HTMLAudioElement | null = null
  constructor(private s: UserSettings) {}
  async speak(text: string): Promise<void> {
    const voiceId = this.s.tts_voice_id || '21m00Tcm4TlvDq8ikWAM'
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': this.s.tts_api_key || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: this.s.tts_model || 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    })
    if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    this.audio = new Audio(url)
    return new Promise((resolve, reject) => {
      this.audio!.onended = () => { URL.revokeObjectURL(url); resolve() }
      this.audio!.onerror = reject
      this.audio!.play()
    })
  }
  stop() { this.audio?.pause(); this.audio = null }
}

class SilentTTS implements TTSProvider {
  speak(_t: string): Promise<void> { return Promise.resolve() }
  stop() {}
}

// ── Round-robin TTS chain ───────────────────────────────────
export class RoundRobinTTS {
  private providers: Array<{ name: string; instance: TTSProvider }>
  private index: number

  constructor(providers: Array<{ name: string; instance: TTSProvider }>, startIndex = 0) {
    this.providers = providers
    this.index = startIndex % Math.max(providers.length, 1)
  }

  async speak(text: string): Promise<void> {
    if (this.providers.length === 0) return
    const tried = new Set<number>()
    const tryNext = async (): Promise<void> => {
      if (tried.size >= this.providers.length) return
      tried.add(this.index)
      const p = this.providers[this.index]
      try {
        await p.instance.speak(text)
        return
      } catch (err) {
        console.warn(`TTS ${p.name} failed:`, err)
        this.index = (this.index + 1) % this.providers.length
        return tryNext()
      }
    }
    return tryNext()
  }

  stop() { this.providers.forEach(p => p.instance.stop()) }
}

export function createRoundRobinTTS(settings: UserSettings): RoundRobinTTS {
  const providers: Array<{ name: string; instance: TTSProvider }> = []

  if (settings.tts_provider === 'none') {
    providers.push({ name: 'silent', instance: new SilentTTS() })
    return new RoundRobinTTS(providers)
  }

  // Build list dengan provider yang dikonfigurasi di depan, web-speech sebagai fallback terakhir
  if (settings.tts_api_key) {
    if (settings.tts_provider === 'openai-tts') {
      providers.push({ name: 'openai', instance: new OpenAITTS(settings) })
    } else if (settings.tts_provider === 'elevenlabs') {
      providers.push({ name: 'elevenlabs', instance: new ElevenLabsTTS(settings) })
    }
  }

  // Web speech selalu ada sebagai fallback
  providers.push({ name: 'web-speech', instance: new WebSpeechTTS(settings) })

  // Mulai dari index 0 (provider utama, atau web-speech jika tidak ada API key)
  return new RoundRobinTTS(providers, 0)
}

// Legacy
export function createTTSProvider(settings: UserSettings) { return createRoundRobinTTS(settings) }
