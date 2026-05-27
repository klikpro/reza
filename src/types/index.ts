export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  created_at: string
  memory_count?: number
}

export interface Memory {
  id: string
  user_id: string
  content: string
  summary?: string
  embedding?: number[]
  category_id?: string
  tags: string[]
  source: 'voice' | 'text' | 'import'
  audio_url?: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface UserSettings {
  user_id: string
  theme: ThemeName
  stt_provider: STTProvider
  stt_api_key?: string
  stt_keys?: string        // JSON: Record<STTProvider, string[]>
  stt_language?: string
  stt_model?: string
  wake_word_provider: WakeWordProvider
  wake_word_key?: string
  wake_word_custom: string
  wake_word_sensitivity: number
  tts_provider: TTSProvider
  tts_api_key?: string
  tts_keys?: string        // JSON: Record<TTSProvider, string[]>
  tts_voice_id?: string
  tts_rate?: number
  tts_pitch?: number
  tts_volume?: number
  tts_model?: string
  ai_enabled: boolean
  ai_provider: AIProvider
  ai_api_key?: string
  ai_keys?: string         // JSON: Record<AIProvider, string[]>
  embedding_provider?: EmbeddingProvider
  embedding_api_key?: string
  similarity_threshold: number
  max_memories_retrieve: number
  system_prompt?: string
  default_view: 'grid' | 'list' | 'timeline'
  sidebar_mode: 'expanded' | 'collapsed' | 'auto'
  font_size: 'small' | 'medium' | 'large'
  animation: 'full' | 'reduced' | 'none'
  language: 'id' | 'en'
  updated_at: string
}

// Multi-key map helper
export type ProviderKeys = Record<string, string[]>

export type ThemeName =
  | 'bright-glass'
  | 'dark-minimal'
  | 'dark-glassmorphism'
  | 'light-clean'
  | 'light-paper'
  | 'cyberpunk'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'nord'
  | 'dracula'
  | 'solarized'
  | 'monochrome'
  | 'rose-gold'
  | 'terminal'

export type STTProvider =
  | 'web-speech-api'
  | 'openai-whisper'
  | 'groq-whisper'
  | 'deepgram'
  | 'assemblyai'
  | 'azure-speech'
  | 'google-cloud-stt'
  | 'elevenlabs-stt'
  | 'rev-ai'

export type WakeWordProvider =
  | 'none'
  | 'porcupine'
  | 'browser-keyword'
  | 'hotkey'

export type TTSProvider =
  | 'web-speech-synthesis'
  | 'elevenlabs'
  | 'openai-tts'
  | 'google-cloud-tts'
  | 'azure-tts'
  | 'amazon-polly'
  | 'playht'
  | 'murf'
  | 'cartesia'
  | 'deepgram-tts'
  | 'none'

export type AIProvider =
  | 'openai-gpt4o'
  | 'openai-gpt4o-mini'
  | 'openai-gpt4-turbo'
  | 'openai-o1-mini'
  | 'anthropic-claude-opus'
  | 'anthropic-claude-sonnet'
  | 'anthropic-claude-haiku'
  | 'google-gemini-pro'
  | 'google-gemini-flash'
  | 'google-gemini-nano'
  | 'groq-llama3'
  | 'groq-mixtral'
  | 'groq-gemma'
  | 'mistral-large'
  | 'mistral-medium'
  | 'cohere-command-r'
  | 'deepseek-chat'
  | 'perplexity'
  | 'together-ai'
  | 'ollama'

export type EmbeddingProvider =
  | 'openai-small'
  | 'openai-large'
  | 'cohere'
  | 'huggingface'
  | 'voyage'

export type VoiceState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'wake_detected'
  | 'listening_query'
  | 'speaking'
  | 'error'

export interface MemorySearchResult {
  id: string
  content: string
  summary?: string
  similarity: number
}

export interface AIAnswer {
  answer: string
  sources: Memory[]
  query: string
}
