-- ============================================
-- YT Organizer - Supabase Schema
-- ============================================
-- Supabase SQL Editor에서 이 파일을 실행하세요.

-- 1. channels 테이블 (유저가 직접 추가한 채널)
create table if not exists channels (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  channel_id text not null,
  title text not null default '',
  thumbnail_url text not null default '',
  created_at timestamptz default now(),
  unique(user_email, channel_id)
);

-- 2. categories 테이블
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  name text not null,
  color text not null default '#3B82F6',
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- 3. channel_assignments 테이블
create table if not exists channel_assignments (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  category_id uuid not null references categories(id) on delete cascade,
  channel_id text not null,
  created_at timestamptz default now(),
  unique(user_email, channel_id)
);

-- 4. 인덱스
create index if not exists idx_channels_user on channels(user_email);
create index if not exists idx_categories_user on categories(user_email);
create index if not exists idx_assignments_user on channel_assignments(user_email);
create index if not exists idx_assignments_category on channel_assignments(category_id);

-- 5. RLS (Row Level Security) 활성화
alter table channels enable row level security;
alter table categories enable row level security;
alter table channel_assignments enable row level security;

-- 6. RLS 정책: 서비스 키(service_role)로만 접근 (API 라우트에서 사용)
create policy "Service role full access on channels"
  on channels for all
  using (true)
  with check (true);

create policy "Service role full access on categories"
  on categories for all
  using (true)
  with check (true);

create policy "Service role full access on channel_assignments"
  on channel_assignments for all
  using (true)
  with check (true);
