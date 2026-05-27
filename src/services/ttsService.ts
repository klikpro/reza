import type { UserSettings } from '@/types'

export interface TTSOptions {
  rate?: number
  pitch?: number
  volume?: number
  voiceId?: string
}

export class WebSpeechTTS {
  private utterance: SpeechSynthesisUtterance | null = null
  private settings: UserSettings

  constructor(settings: UserSettings) {
    this.settings = settings
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.speechSynthesis.cancel()
      this.utterance = new SpeechSynthesisUtterance(text)
      this.utterance.rate = this.settings.tts_rate || 1
      this.utterance.pitch = this.settings.tts_pitch || 1
      this.utterance.volume = this.settings.tts_volume || 1

      const voices = window.speechSynthesis.getVoices()
      if (this.settings.tts_voice_id) {
        const voice = voices.find(v => v.voiceURI === this.settings.tts_voice_id)
        if (voice) this.utterance.voice = voice
      }

      this.utterance.onend = () => resolve()
      this.utterance.onerror = (e) => reject(new Error(e.error))
      window.speechSynthesis.speak(this.utterance)
    })
  }

  stop(): void {
    window.speechSynthesis.cancel()
  }

  getVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices()
  }
}

export class OpenAITTS {
  private apiKey: string
  private voice: string
  private model: string
  private speed: number
  private audio: HTMLAudioElement | null = null

  constructor(settings: UserSettings) {
    this.apiKey = settings.tts_api_key || ''
    this.voice = settings.tts_voice_id || 'nova'
    this.model = settings.tts_model || 'tts-1'
    this.speed = settings.tts_rate || 1.0
  }

  async speak(text: string): Promise<void> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        voice: this.voice,
        speed: this.speed,
      }),
    })

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    this.audio = new Audio(url)
    return new Promise((resolve, reject) => {
      this.audio!.onended = () => { URL.revokeObjectURL(url); resolve() }
      this.audio!.onerror = reject
      this.audio!.play()
    })
  }

  stop(): void {
    this.audio?.pause()
    this.audio = null
  }
}

export class ElevenLabsTTS {
  private apiKey: string
  private voiceId: string
  private modelId: string
  private audio: HTMLAudioElement | null = null

  constructor(settings: UserSettings) {
    this.apiKey = settings.tts_api_key || ''
    this.voiceId = settings.tts_voice_id || '21m00Tcm4TlvDq8ikWAM'
    this.modelId = settings.tts_model || 'eleven_multilingual_v2'
  }

  async speak(text: string): Promise<void> {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    this.audio = new Audio(url)
    return new Promise((resolve, reject) => {
      this.audio!.onended = () => { URL.revokeObjectURL(url); resolve() }
      this.audio!.onerror = reject
      this.audio!.play()
    })
  }

  stop(): void {
    this.audio?.pause()
    this.audio = null
  }

  async getVoices(apiKey: string): Promise<Array<{ voice_id: string; name: string }>> {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    })
    const data = await res.json()
    return data.voices || []
  }
}

export class SilentTTS {
  speak(_text: string): Promise<void> {
    return Promise.resolve()
  }
  stop(): void {}
}

export function createTTSProvider(settings: UserSettings) {
  switch (settings.tts_provider) {
    case 'web-speech-synthesis': return new WebSpeechTTS(settings)
    case 'openai-tts': return new OpenAITTS(settings)
    case 'elevenlabs': return new ElevenLabsTTS(settings)
    case 'none': return new SilentTTS()
    default: return new WebSpeechTTS(settings)
  }
}
