-- 기존 DB에 channels 테이블 추가 (이미 categories, channel_assignments가 있는 경우)
-- Supabase SQL Editor에서 실행하세요.

create table if not exists channels (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  channel_id text not null,
  title text not null default '',
  thumbnail_url text not null default '',
  created_at timestamptz default now(),
  unique(user_email, channel_id)
);

create index if not exists idx_channels_user on channels(user_email);

alter table channels enable row level security;

create policy "Service role full access on channels"
  on channels for all
  using (true)
  with check (true);
