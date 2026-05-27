import type { UserSettings } from '@/types'

export interface STTResult {
  transcript: string
  isFinal: boolean
}

export type OnTranscriptCallback = (result: STTResult) => void
export type OnErrorCallback = (error: string) => void

export class WebSpeechSTT {
  private recognition: SpeechRecognition | null = null
  private onTranscript: OnTranscriptCallback | null = null
  private onError: OnErrorCallback | null = null
  private language: string

  constructor(language = 'id-ID') {
    this.language = language
  }

  start(onTranscript: OnTranscriptCallback, onError: OnErrorCallback): boolean {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      onError('Web Speech API tidak didukung di browser ini. Gunakan Chrome atau Edge.')
      return false
    }

    this.onTranscript = onTranscript
    this.onError = onError
    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = this.language

    this.recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      if (interim) onTranscript({ transcript: interim, isFinal: false })
      if (final) onTranscript({ transcript: final, isFinal: true })
    }

    this.recognition.onerror = (event) => {
      onError(`Speech recognition error: ${event.error}`)
    }

    this.recognition.start()
    return true
  }

  stop(): void {
    this.recognition?.stop()
    this.recognition = null
  }
}

export class OpenAIWhisperSTT {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private apiKey: string
  private onTranscript: OnTranscriptCallback | null = null
  private onError: OnErrorCallback | null = null

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async start(onTranscript: OnTranscriptCallback, onError: OnErrorCallback): Promise<boolean> {
    try {
      this.onTranscript = onTranscript
      this.onError = onError
      this.chunks = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(stream)

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data)
      }

      this.mediaRecorder.start(1000)
      return true
    } catch {
      onError('Tidak bisa mengakses mikrofon.')
      return false
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) { resolve(); return }

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'audio.webm')
        formData.append('model', 'whisper-1')

        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.apiKey}` },
            body: formData,
          })
          const data = await res.json()
          if (data.text) {
            this.onTranscript?.({ transcript: data.text, isFinal: true })
          }
        } catch {
          this.onError?.('Whisper API error')
        }
        resolve()
      }

      this.mediaRecorder.stop()
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop())
    })
  }
}

export function createSTTProvider(settings: UserSettings) {
  switch (settings.stt_provider) {
    case 'web-speech-api':
      return new WebSpeechSTT(settings.stt_language || 'id-ID')
    case 'openai-whisper':
      return new OpenAIWhisperSTT(settings.stt_api_key || '')
    default:
      return new WebSpeechSTT(settings.stt_language || 'id-ID')
  }
}
