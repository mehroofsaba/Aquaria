-- AQUARIA — Supabase schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Species are stored in the app; only per-user progress lives here. RLS keeps every row private.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.discoveries (
  user_id uuid not null references auth.users (id) on delete cascade,
  species_id text not null,
  discovered_at timestamptz not null default now(),
  primary key (user_id, species_id)
);

create table if not exists public.high_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null check (score >= 0),
  round smallint not null default 1,
  world_id text,
  created_at timestamptz not null default now()
);
create index if not exists high_scores_user_score on public.high_scores (user_id, score desc);

create table if not exists public.world_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  world_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, world_id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sound boolean not null default true,
  volume numeric not null default 0.7 check (volume between 0 and 1),
  reduce_motion boolean not null default false,
  quality text not null default 'balanced' check (quality in ('low', 'balanced', 'high')),
  last_world text,
  updated_at timestamptz not null default now()
);

-- Row Level Security: users can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.discoveries enable row level security;
alter table public.high_scores enable row level security;
alter table public.world_unlocks enable row level security;
alter table public.user_settings enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own discoveries" on public.discoveries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own scores" on public.high_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own unlocks" on public.world_unlocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile + default settings when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
