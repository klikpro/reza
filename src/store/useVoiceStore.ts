import { create } from 'zustand'
import type { VoiceState } from '@/types'

interface VoiceStoreState {
  voiceState: VoiceState
  transcript: string
  interimTranscript: string
  audioLevel: number
  recordingDuration: number
  wakeWordActive: boolean
  lastAnswer: string
  answerSources: string[]
  error: string | null

  setVoiceState: (s: VoiceState) => void
  setTranscript: (t: string) => void
  setInterimTranscript: (t: string) => void
  setAudioLevel: (l: number) => void
  setRecordingDuration: (d: number) => void
  setWakeWordActive: (a: boolean) => void
  setLastAnswer: (a: string, sources?: string[]) => void
  setError: (e: string | null) => void
  reset: () => void
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  voiceState: 'idle',
  transcript: '',
  interimTranscript: '',
  audioLevel: 0,
  recordingDuration: 0,
  wakeWordActive: false,
  lastAnswer: '',
  answerSources: [],
  error: null,

  setVoiceState: (s) => set({ voiceState: s }),
  setTranscript: (t) => set({ transcript: t }),
  setInterimTranscript: (t) => set({ interimTranscript: t }),
  setAudioLevel: (l) => set({ audioLevel: l }),
  setRecordingDuration: (d) => set({ recordingDuration: d }),
  setWakeWordActive: (a) => set({ wakeWordActive: a }),
  setLastAnswer: (a, sources = []) => set({ lastAnswer: a, answerSources: sources }),
  setError: (e) => set({ error: e }),
  reset: () => set({
    voiceState: 'idle',
    transcript: '',
    interimTranscript: '',
    audioLevel: 0,
    recordingDuration: 0,
    error: null,
  }),
}))
