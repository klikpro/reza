import { supabase } from '@/lib/supabase'
import type { UserSettings, Memory, MemorySearchResult, AIAnswer } from '@/types'

// ── Embedding ───────────────────────────────────────────────
export async function generateEmbedding(text: string, settings: UserSettings): Promise<number[] | null> {
  if (!settings.ai_enabled || !settings.ai_api_key) return null
  const model = settings.embedding_provider === 'openai-large' ? 'text-embedding-3-large' : 'text-embedding-3-small'
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.ai_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text, model }),
    })
    const d = await res.json()
    return d.data?.[0]?.embedding || null
  } catch { return null }
}

// ── Semantic search ─────────────────────────────────────────
export async function semanticSearch(query: string, userId: string, settings: UserSettings): Promise<MemorySearchResult[]> {
  const embedding = await generateEmbedding(query, settings)
  if (!embedding) return []
  const { data } = await supabase.rpc('match_memories', {
    query_embedding: embedding,
    match_threshold: settings.similarity_threshold || 0.7,
    match_count: settings.max_memories_retrieve || 5,
    p_user_id: userId,
  })
  return (data as MemorySearchResult[]) || []
}

// ── Keyword search fallback ──────────────────────────────────
export async function keywordSearch(query: string, userId: string): Promise<Memory[]> {
  const { data } = await supabase
    .from('memories').select('*, category:categories(*)')
    .eq('user_id', userId).ilike('content', `%${query}%`).limit(10)
  return (data as Memory[]) || []
}

// ── Round-robin AI answer synthesis ─────────────────────────
interface AIProviderConfig { name: string; url: string; model: string; apiKey: string }

function buildProviders(settings: UserSettings): AIProviderConfig[] {
  const key = settings.ai_api_key || ''
  const providers: AIProviderConfig[] = []

  const modelMap: Record<string, { url: string; model: string }> = {
    'openai-gpt4o':      { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
    'openai-gpt4o-mini': { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    'groq':              { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama3-8b-8192' },
    'google-gemini':     { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-1.5-flash' },
    'anthropic-claude':  { url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-haiku-20240307' },
  }

  // Add configured provider first
  const primary = modelMap[settings.ai_provider]
  if (primary && key) providers.push({ name: settings.ai_provider, ...primary, apiKey: key })

  // Add all others as fallbacks (round-robin)
  Object.entries(modelMap).forEach(([name, cfg]) => {
    if (name !== settings.ai_provider && key) {
      providers.push({ name, ...cfg, apiKey: key })
    }
  })

  return providers
}

// Round-robin index persisted in module
let aiProviderIndex = 0

async function callAI(prompt: string, systemPrompt: string, providers: AIProviderConfig[]): Promise<string> {
  if (providers.length === 0) return prompt

  const tried = new Set<number>()
  const tryNext = async (): Promise<string> => {
    if (tried.size >= providers.length) return prompt
    const idx = aiProviderIndex % providers.length
    tried.add(idx)
    const p = providers[idx]

    try {
      const res = await fetch(p.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${p.apiKey}`,
          'Content-Type': 'application/json',
          ...(p.name === 'anthropic-claude' ? { 'x-api-key': p.apiKey, 'anthropic-version': '2023-06-01' } : {}),
        },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: 500,
        }),
      })

      if (!res.ok) throw new Error(`${p.name} HTTP ${res.status}`)
      const data = await res.json()
      // Rotate for next call (round-robin)
      aiProviderIndex = (aiProviderIndex + 1) % providers.length
      return data.choices?.[0]?.message?.content || data.content?.[0]?.text || 'Tidak ada jawaban.'
    } catch (err) {
      console.warn(`AI ${p.name} failed:`, err)
      aiProviderIndex = (aiProviderIndex + 1) % providers.length
      return tryNext()
    }
  }

  return tryNext()
}

// ── Template search ──────────────────────────────────────────
async function searchTemplates(query: string): Promise<string | null> {
  const { data } = await supabase
    .from('conversation_templates')
    .select('answer, trigger_keywords')
    .eq('is_active', true)

  if (!data || data.length === 0) return null

  const q = query.toLowerCase()
  for (const tpl of data) {
    const keywords: string[] = tpl.trigger_keywords || []
    if (keywords.some((k: string) => q.includes(k.toLowerCase()))) {
      return tpl.answer
    }
  }
  return null
}

// ── Main answer function ─────────────────────────────────────
export async function answerQuery(
  query: string, userId: string, settings: UserSettings, allMemories: Memory[]
): Promise<AIAnswer> {
  // 1. Check templates first
  const templateAnswer = await searchTemplates(query)
  if (templateAnswer) {
    return { answer: templateAnswer, sources: [], query }
  }

  // 2. Search memories
  let sourceMemories: Memory[] = []
  if (settings.ai_enabled) {
    const results = await semanticSearch(query, userId, settings)
    sourceMemories = results.map(r => allMemories.find(m => m.id === r.id)).filter(Boolean) as Memory[]
  } else {
    sourceMemories = await keywordSearch(query, userId)
  }

  if (sourceMemories.length === 0) {
    return { answer: 'Tidak ada ingatan tentang itu.', sources: [], query }
  }

  // 3. Synthesize answer (round-robin AI)
  const context = sourceMemories.map((m, i) => `[${i + 1}]: ${m.content}`).join('\n')
  const systemPrompt = settings.system_prompt || 'Kamu adalah asisten memori pribadi. Jawab berdasarkan konteks. Jawab dalam bahasa yang sama dengan pertanyaan.'

  let answer: string
  if (settings.ai_enabled && settings.ai_api_key) {
    const providers = buildProviders(settings)
    answer = await callAI(`Konteks:\n${context}\n\nPertanyaan: ${query}`, systemPrompt, providers)
  } else {
    answer = sourceMemories.map(m => m.content).join('\n\n')
  }

  return { answer, sources: sourceMemories, query }
}
