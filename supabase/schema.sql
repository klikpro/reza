-- ================================================
-- MEMORYVAULT DATABASE SCHEMA v2
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- ================================================
-- 2. TABEL CATEGORIES
-- ================================================
create table if not exists categories (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users not null,
  name       text not null,
  color      text default '#06b6d4',
  icon       text default '📁',
  created_at timestamptz default now()
);

-- ================================================
-- 3. TABEL MEMORIES
-- ================================================
create table if not exists memories (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users not null,
  content     text not null,
  summary     text,
  embedding   vector(1536),
  category_id uuid references categories(id) on delete set null,
  tags        text[] default '{}',
  source      text default 'voice',
  audio_url   text,
  is_pinned   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ================================================
-- 4. TABEL USER SETTINGS
-- ================================================
create table if not exists user_settings (
  user_id               uuid references auth.users primary key,
  theme                 text default 'bright-glass',
  stt_provider          text default 'web-speech-api',
  stt_api_key           text,
  stt_language          text default 'id-ID',
  stt_model             text,
  wake_word_provider    text default 'none',
  wake_word_key         text,
  wake_word_custom      text default 'hey memory',
  wake_word_sensitivity float default 0.5,
  tts_provider          text default 'web-speech-synthesis',
  tts_api_key           text,
  tts_voice_id          text,
  tts_rate              float default 1.0,
  tts_pitch             float default 1.0,
  tts_volume            float default 1.0,
  tts_model             text,
  ai_enabled            boolean default false,
  ai_provider           text default 'openai-gpt4o',
  ai_api_key            text,
  embedding_provider    text default 'openai-small',
  embedding_api_key     text,
  similarity_threshold  float default 0.7,
  max_memories_retrieve int default 5,
  system_prompt         text default 'Kamu adalah asisten memori pribadi. Jawab pertanyaan berdasarkan memories yang diberikan. Jawab dalam bahasa yang sama dengan pertanyaan. Jika tidak ada informasi relevan, katakan "Tidak ada ingatan tentang itu."',
  default_view          text default 'grid',
  sidebar_mode          text default 'expanded',
  font_size             text default 'medium',
  animation             text default 'full',
  language              text default 'id',
  updated_at            timestamptz default now()
);

-- ================================================
-- 5. TABEL SITE SETTINGS (Branding)
-- ================================================
create table if not exists site_settings (
  id           uuid default gen_random_uuid() primary key,
  site_name    text default 'MemoryVault',
  logo_url     text,
  accent_color text default '#06b6d4',
  updated_at   timestamptz default now()
);

-- Insert default row
insert into site_settings (site_name, accent_color)
select 'MemoryVault', '#06b6d4'
where not exists (select 1 from site_settings);

-- ================================================
-- 6. TABEL CONVERSATION TEMPLATES
-- ================================================
create table if not exists conversation_templates (
  id               uuid default gen_random_uuid() primary key,
  question_label   text not null,
  trigger_keywords text[] default '{}',
  answer           text not null,
  category         text,
  is_active        boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ================================================
alter table memories enable row level security;
alter table categories enable row level security;
alter table user_settings enable row level security;
-- site_settings & templates: public read, auth write
alter table site_settings enable row level security;
alter table conversation_templates enable row level security;

-- memories policies
create policy "Users view own memories" on memories for select using (auth.uid() = user_id);
create policy "Users insert own memories" on memories for insert with check (auth.uid() = user_id);
create policy "Users update own memories" on memories for update using (auth.uid() = user_id);
create policy "Users delete own memories" on memories for delete using (auth.uid() = user_id);

-- categories policies
create policy "Users view own categories" on categories for select using (auth.uid() = user_id);
create policy "Users insert own categories" on categories for insert with check (auth.uid() = user_id);
create policy "Users update own categories" on categories for update using (auth.uid() = user_id);
create policy "Users delete own categories" on categories for delete using (auth.uid() = user_id);

-- user_settings policies
create policy "Users manage own settings" on user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- site_settings: anyone can read, only auth can write
create policy "Public read site settings" on site_settings for select using (true);
create policy "Auth write site settings" on site_settings for all using (auth.uid() is not null);

-- conversation_templates: anyone can read active, only auth can write
create policy "Public read active templates" on conversation_templates for select using (true);
create policy "Auth manage templates" on conversation_templates for all using (auth.uid() is not null);

-- ================================================
-- 8. AUTO updated_at TRIGGERS
-- ================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists update_memories_updated_at on memories;
create trigger update_memories_updated_at before update on memories for each row execute function update_updated_at_column();

drop trigger if exists update_user_settings_updated_at on user_settings;
create trigger update_user_settings_updated_at before update on user_settings for each row execute function update_updated_at_column();

drop trigger if exists update_templates_updated_at on conversation_templates;
create trigger update_templates_updated_at before update on conversation_templates for each row execute function update_updated_at_column();

-- ================================================
-- 9. SEMANTIC SEARCH FUNCTION
-- ================================================
create or replace function match_memories(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count     int default 5,
  p_user_id       uuid default null
)
returns table (id uuid, content text, summary text, similarity float)
language sql stable as $$
  select id, content, summary,
    1 - (embedding <=> query_embedding) as similarity
  from memories
  where user_id = p_user_id
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- ================================================
-- SELESAI!
-- Verifikasi: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- ================================================
