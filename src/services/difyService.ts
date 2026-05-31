/**
 * difyService.ts
 * Mengirim teks ke Dify workflow/chatbot dan mengembalikan jawaban teks.
 *
 * Alur:
 *   Suara  →  STT (sttService)  →  difyQuery()  →  TTS (ttsService)
 *
 * Dua mode Dify yang didukung:
 *   1. "chat"     – /v1/chat-messages  (conversational, ada conversation_id)
 *   2. "workflow" – /v1/workflows/run  (satu-tembak, tanpa history)
 */

export interface DifyConfig {
  /** URL dasar Dify, contoh: https://api.dify.ai atau self-hosted URL */
  baseUrl: string
  /** API Key aplikasi Dify (App Secret Key) */
  apiKey: string
  /** Mode interaksi: 'chat' | 'workflow' */
  mode: 'chat' | 'workflow'
  /** User identifier – boleh bebas, misal user ID dari auth */
  userId?: string
}

export interface DifyResponse {
  answer: string
  /** conversation_id dikembalikan oleh mode 'chat', simpan untuk giliran berikutnya */
  conversationId?: string
  /** metadata tambahan dari Dify (opsional) */
  metadata?: Record<string, unknown>
}

// ── Helper: normalisasi baseUrl ────────────────────────────────────────────
function normalizeUrl(base: string): string {
  return base.replace(/\/+$/, '') // hapus trailing slash
}

// ── Mode: Chat (/v1/chat-messages) ────────────────────────────────────────
async function difyChat(
  query: string,
  config: DifyConfig,
  conversationId?: string
): Promise<DifyResponse> {
  const url = `${normalizeUrl(config.baseUrl)}/v1/chat-messages`

  const body: Record<string, unknown> = {
    inputs: {},
    query,
    response_mode: 'blocking', // gunakan 'streaming' jika ingin streaming
    user: config.userId || 'user',
  }
  if (conversationId) body.conversation_id = conversationId

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Dify Chat API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return {
    answer: data.answer || data.message || 'Tidak ada jawaban dari Dify.',
    conversationId: data.conversation_id,
    metadata: data.metadata,
  }
}

// ── Mode: Workflow (/v1/workflows/run) ────────────────────────────────────
async function difyWorkflow(
  query: string,
  config: DifyConfig
): Promise<DifyResponse> {
  const url = `${normalizeUrl(config.baseUrl)}/v1/workflows/run`

  const body = {
    inputs: { query }, // sesuaikan nama variabel input sesuai workflow Anda
    response_mode: 'blocking',
    user: config.userId || 'user',
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Dify Workflow API error ${res.status}: ${errText}`)
  }

  const data = await res.json()

  // Output workflow bisa ada di data.data.outputs atau data.outputs
  const outputs = data.data?.outputs || data.outputs || {}
  const answer =
    outputs.answer ||
    outputs.text ||
    outputs.result ||
    outputs.output ||
    (typeof outputs === 'string' ? outputs : null) ||
    JSON.stringify(outputs) ||
    'Tidak ada output dari workflow Dify.'

  return {
    answer,
    metadata: data.data?.metadata || data.metadata,
  }
}

// ── Fungsi utama ───────────────────────────────────────────────────────────
/**
 * Kirim query teks ke Dify dan dapatkan jawaban teks.
 *
 * @param query          Teks pertanyaan dari pengguna
 * @param config         Konfigurasi Dify
 * @param conversationId (opsional) Untuk mode 'chat', teruskan ID dari respons sebelumnya
 */
export async function difyQuery(
  query: string,
  config: DifyConfig,
  conversationId?: string
): Promise<DifyResponse> {
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('Dify belum dikonfigurasi. Silakan isi URL dan API Key di Pengaturan.')
  }

  if (config.mode === 'workflow') {
    return difyWorkflow(query, config)
  }
  return difyChat(query, config, conversationId)
}

// ── Builder dari UserSettings ──────────────────────────────────────────────
import type { UserSettings } from '@/types'

export function buildDifyConfig(settings: UserSettings, userId?: string): DifyConfig | null {
  if (!settings.dify_enabled || !settings.dify_base_url || !settings.dify_api_key) {
    return null
  }
  return {
    baseUrl: settings.dify_base_url,
    apiKey: settings.dify_api_key,
    mode: settings.dify_mode || 'chat',
    userId,
  }
}
