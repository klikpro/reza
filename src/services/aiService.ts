import { supabase } from '@/lib/supabase'
import type { UserSettings, Memory, MemorySearchResult, AIAnswer } from '@/types'

export async function generateEmbedding(text: string, settings: UserSettings): Promise<number[] | null> {
  if (!settings.ai_enabled || !settings.ai_api_key) return null

  try {
    const model = settings.embedding_provider === 'openai-large'
      ? 'text-embedding-3-large'
      : 'text-embedding-3-small'

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.ai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text, model }),
    })

    const data = await res.json()
    return data.data?.[0]?.embedding || null
  } catch {
    return null
  }
}

export async function semanticSearch(
  query: string,
  userId: string,
  settings: UserSettings
): Promise<MemorySearchResult[]> {
  const embedding = await generateEmbedding(query, settings)
  if (!embedding) return []

  const { data, error } = await supabase.rpc('match_memories', {
    query_embedding: embedding,
    match_threshold: settings.similarity_threshold || 0.7,
    match_count: settings.max_memories_retrieve || 5,
    p_user_id: userId,
  })

  if (error) return []
  return (data as MemorySearchResult[]) || []
}

export async function keywordSearch(
  query: string,
  userId: string
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .textSearch('content', query, { type: 'websearch' })
    .limit(10)

  if (error) {
    // Fallback: ilike search
    const { data: fallback } = await supabase
      .from('memories')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .ilike('content', `%${query}%`)
      .limit(10)
    return (fallback as Memory[]) || []
  }

  return (data as Memory[]) || []
}

export async function synthesizeAnswer(
  query: string,
  memories: Memory[],
  settings: UserSettings
): Promise<string> {
  if (!settings.ai_enabled || !settings.ai_api_key) {
    return memories.map(m => m.content).join('\n\n')
  }

  const context = memories
    .map((m, i) => `[Memory ${i + 1}]: ${m.content}`)
    .join('\n\n')

  const systemPrompt = settings.system_prompt ||
    'Kamu adalah asisten memori pribadi. Jawab pertanyaan berdasarkan memories yang diberikan. Jawab dalam bahasa yang sama dengan pertanyaan. Jika tidak ada informasi relevan, katakan "Tidak ada ingatan tentang itu."'

  const modelMap: Record<string, string> = {
    'openai-gpt4o': 'gpt-4o',
    'openai-gpt4o-mini': 'gpt-4o-mini',
    'google-gemini': 'gemini-1.5-flash',
  }

  const model = modelMap[settings.ai_provider] || 'gpt-4o-mini'

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.ai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context memories:\n\n${context}\n\nPertanyaan: ${query}` },
        ],
        max_tokens: 500,
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'Tidak dapat menghasilkan jawaban.'
  } catch {
    return memories.map(m => m.content).join('\n\n') || 'Tidak ada ingatan tentang itu.'
  }
}

export async function answerQuery(
  query: string,
  userId: string,
  settings: UserSettings,
  allMemories: Memory[]
): Promise<AIAnswer> {
  let sourceMemories: Memory[] = []

  if (settings.ai_enabled) {
    const results = await semanticSearch(query, userId, settings)
    sourceMemories = results
      .map(r => allMemories.find(m => m.id === r.id))
      .filter(Boolean) as Memory[]
  } else {
    sourceMemories = await keywordSearch(query, userId)
  }

  if (sourceMemories.length === 0) {
    return {
      answer: 'Tidak ada ingatan tentang itu.',
      sources: [],
      query,
    }
  }

  const answer = await synthesizeAnswer(query, sourceMemories, settings)

  return {
    answer,
    sources: sourceMemories,
    query,
  }
}
