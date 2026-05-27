import type { UserSettings } from '@/types'

export interface STTResult { transcript: string; isFinal: boolean }
export type OnTranscriptCallback = (r: STTResult) => void
export type OnErrorCallback = (e: string) => void

type SpeechRecognitionCtor = new () => InstanceType<typeof SpeechRecognition>
function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  return ((window.SpeechRecognition || window.webkitSpeechRecognition) as SpeechRecognitionCtor) || null
}

// ── Web Speech API ──────────────────────────────────────────
export class WebSpeechSTT {
  private recognition: InstanceType<typeof SpeechRecognition> | null = null
  constructor(private language = 'id-ID') {}

  start(onT: OnTranscriptCallback, onE: OnErrorCallback): boolean {
    const SR = getSR()
    if (!SR) { onE('Web Speech API tidak didukung.'); return false }
    this.recognition = new SR()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = this.language
    this.recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      if (interim) onT({ transcript: interim, isFinal: false })
      if (final) onT({ transcript: final, isFinal: true })
    }
    this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => onE(e.error)
    try { this.recognition.start(); return true } catch { return false }
  }
  stop() { try { this.recognition?.stop() } catch {}; this.recognition = null }
}

// ── OpenAI Whisper ──────────────────────────────────────────
export class OpenAIWhisperSTT {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private onT: OnTranscriptCallback | null = null
  private onE: OnErrorCallback | null = null
  constructor(private apiKey: string) {}

  async start(onT: OnTranscriptCallback, onE: OnErrorCallback): Promise<boolean> {
    this.onT = onT; this.onE = onE; this.chunks = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(stream)
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data) }
      this.mediaRecorder.start(1000)
      return true
    } catch { onE('Tidak bisa akses mikrofon'); return false }
  }

  async stop(): Promise<void> {
    return new Promise(resolve => {
      if (!this.mediaRecorder) { resolve(); return }
      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('file', blob, 'audio.webm')
        fd.append('model', 'whisper-1')
        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}` }, body: fd,
          })
          const d = await res.json()
          if (d.text) this.onT?.({ transcript: d.text, isFinal: true })
          else this.onE?.('Whisper: tidak ada transcript')
        } catch { this.onE?.('Whisper API error') }
        resolve()
      }
      this.mediaRecorder.stop()
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop())
    })
  }
}

// ── Round-robin STT chain ───────────────────────────────────
export class RoundRobinSTT {
  private providers: Array<{ name: string; instance: WebSpeechSTT | OpenAIWhisperSTT }>
  private index: number

  constructor(providers: Array<{ name: string; instance: WebSpeechSTT | OpenAIWhisperSTT }>, startIndex = 0) {
    this.providers = providers
    this.index = startIndex % Math.max(providers.length, 1)
  }

  start(onT: OnTranscriptCallback, onE: OnErrorCallback): boolean {
    if (this.providers.length === 0) { onE('Tidak ada STT provider dikonfigurasi'); return false }
    const tried = new Set<number>()
    const tryNext = (): boolean => {
      if (tried.size >= this.providers.length) { onE('Semua STT provider gagal'); return false }
      tried.add(this.index)
      const p = this.providers[this.index]
      const ok = p.instance.start(
        onT,
        (err) => {
          console.warn(`STT ${p.name} error:`, err)
          this.index = (this.index + 1) % this.providers.length
          tryNext()
        }
      )
      if (!ok) {
        this.index = (this.index + 1) % this.providers.length
        return tryNext()
      }
      return true
    }
    return tryNext()
  }

  stop() {
    this.providers.forEach(p => {
      try { (p.instance as WebSpeechSTT).stop?.() } catch {}
    })
  }
}

export function createRoundRobinSTT(settings: UserSettings): RoundRobinSTT {
  const providers: Array<{ name: string; instance: WebSpeechSTT | OpenAIWhisperSTT }> = []

  // Always include Web Speech API
  providers.push({ name: 'web-speech', instance: new WebSpeechSTT(settings.stt_language || 'id-ID') })

  // If Whisper key configured, add it
  if (settings.stt_api_key && settings.stt_provider === 'openai-whisper') {
    providers.push({ name: 'whisper', instance: new OpenAIWhisperSTT(settings.stt_api_key) })
  }

  return new RoundRobinSTT(providers)
}

// Legacy export for compatibility
export function createSTTProvider(settings: UserSettings) {
  return createRoundRobinSTT(settings)
}
