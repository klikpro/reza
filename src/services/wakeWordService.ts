import type { UserSettings } from '@/types'

export type OnDetectedCallback = () => void

type SpeechRecognitionCtor = new () => InstanceType<typeof SpeechRecognition>

function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  return (window.SpeechRecognition || window.webkitSpeechRecognition) as SpeechRecognitionCtor || null
}

export class BrowserKeywordSpotting {
  private recognition: InstanceType<typeof SpeechRecognition> | null = null
  private keyword: string
  private onDetected: OnDetectedCallback | null = null
  private active = false
  private cooldown = false

  constructor(keyword = 'hey memory', _sensitivity = 0.5) {
    this.keyword = keyword.toLowerCase().trim()
  }

  private normalize(text: string): string {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private matches(transcript: string): boolean {
    const norm = this.normalize(transcript)
    const kw = this.normalize(this.keyword)
    // exact substring match
    if (norm.includes(kw)) return true
    // fuzzy: split keyword into words, check if all words present
    const kwWords = kw.split(' ')
    return kwWords.every(w => norm.includes(w))
  }

  start(onDetected: OnDetectedCallback): boolean {
    const SR = getSR()
    if (!SR) return false

    this.onDetected = onDetected
    this.active = true
    this.cooldown = false
    this.recognition = new SR()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'id-ID'

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (this.cooldown) return
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (this.matches(text)) {
          this.cooldown = true
          this.onDetected?.()
          // reset cooldown after 3s to allow re-trigger
          setTimeout(() => { this.cooldown = false }, 3000)
          break
        }
      }
    }

    this.recognition.onend = () => {
      if (this.active) {
        try { this.recognition?.start() } catch {}
      }
    }

    try { this.recognition.start(); return true } catch { return false }
  }

  stop(): void {
    this.active = false
    this.cooldown = false
    try { this.recognition?.abort() } catch {}
    this.recognition = null
  }

  get isActive(): boolean { return this.active }
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
      if (combo === this.hotkey) { e.preventDefault(); this.onDetected?.() }
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
  start(_cb: OnDetectedCallback): boolean { return true }
  stop(): void {}
}

export function createWakeWordProvider(settings: UserSettings) {
  switch (settings.wake_word_provider) {
    case 'browser-keyword':
      return new BrowserKeywordSpotting(settings.wake_word_custom || 'hey memory', settings.wake_word_sensitivity || 0.5)
    case 'hotkey':
      return new HotkeyWakeWord(settings.wake_word_key || 'ctrl+shift+m')
    default:
      return new NoWakeWord()
  }
}
