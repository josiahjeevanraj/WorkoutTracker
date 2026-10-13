-- Per-user feature switches. Features are on by default; a row with
-- enabled = false turns that feature off for that user.
-- Users can read their own flags but not change them (no write policies);
-- manage rows from the Supabase dashboard / SQL editor.
create table public.feature_flags (
  user_id uuid not null references auth.users(id) on delete cascade,
  flag text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, flag)
);

alter table public.feature_flags enable row level security;

create policy "Users read their own feature flags"
  on public.feature_flags
  for select
  to authenticated
  using (auth.uid() = user_id);
