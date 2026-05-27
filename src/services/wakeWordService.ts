import type { UserSettings } from '@/types'

export type OnDetectedCallback = () => void

export class BrowserKeywordSpotting {
  private recognition: SpeechRecognition | null = null
  private keyword: string
  private sensitivity: number
  private onDetected: OnDetectedCallback | null = null
  private active = false

  constructor(keyword = 'hey memory', sensitivity = 0.5) {
    this.keyword = keyword.toLowerCase()
    this.sensitivity = sensitivity
  }

  start(onDetected: OnDetectedCallback): boolean {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return false

    this.onDetected = onDetected
    this.active = true
    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase()
        if (text.includes(this.keyword)) {
          this.onDetected?.()
        }
      }
    }

    this.recognition.onend = () => {
      if (this.active) {
        // Restart if still active
        try { this.recognition?.start() } catch {}
      }
    }

    try {
      this.recognition.start()
      return true
    } catch {
      return false
    }
  }

  stop(): void {
    this.active = false
    this.recognition?.abort()
    this.recognition = null
  }

  get isActive(): boolean {
    return this.active
  }
}

export class HotkeyWakeWord {
  private hotkey: string
  private onDetected: OnDetectedCallback | null = null
  private handler: ((e: KeyboardEvent) => void) | null = null

  constructor(hotkey = 'ctrl+shift+m') {
    this.hotkey = hotkey.toLowerCase()
  }

  start(onDetected: OnDetectedCallback): boolean {
    this.onDetected = onDetected
    this.handler = (e: KeyboardEvent) => {
      const combo = [
        e.ctrlKey && 'ctrl',
        e.shiftKey && 'shift',
        e.altKey && 'alt',
        e.key.toLowerCase(),
      ].filter(Boolean).join('+')

      if (combo === this.hotkey) {
        e.preventDefault()
        this.onDetected?.()
      }
    }
    document.addEventListener('keydown', this.handler)
    return true
  }

  stop(): void {
    if (this.handler) {
      document.removeEventListener('keydown', this.handler)
      this.handler = null
    }
  }
}

export class NoWakeWord {
  start(_onDetected: OnDetectedCallback): boolean { return true }
  stop(): void {}
}

export function createWakeWordProvider(settings: UserSettings) {
  switch (settings.wake_word_provider) {
    case 'browser-keyword':
      return new BrowserKeywordSpotting(
        settings.wake_word_custom || 'hey memory',
        settings.wake_word_sensitivity || 0.5
      )
    case 'hotkey':
      return new HotkeyWakeWord(settings.wake_word_key || 'ctrl+shift+m')
    case 'none':
    default:
      return new NoWakeWord()
  }
}
