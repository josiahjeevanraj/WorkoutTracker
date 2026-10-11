create table public.app_data (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_data enable row level security;

create policy "Users manage their own app_data"
  on public.app_data
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
