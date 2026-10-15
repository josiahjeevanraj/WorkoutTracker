-- GPS tracks for outdoor runs, kept out of the workout history blob because
-- they're large (about one point per second). One row per run session.
create table public.run_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  session_id text not null,
  -- [[lat, lng, msSinceStart, gpsAltitude|null, segment], ...]
  points jsonb not null,
  -- elevation profile from a DEM lookup: [[distanceKm, metres], ...]
  profile jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);

alter table public.run_tracks enable row level security;

create policy "Users manage their own run tracks"
  on public.run_tracks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
