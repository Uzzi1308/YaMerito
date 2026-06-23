create table public.road_games (
  code text primary key,
  created_by uuid not null references auth.users(id) on delete cascade,
  joined_by uuid references auth.users(id) on delete set null,
  created_name text,
  joined_name text,
  created_at timestamp with time zone default now()
);

create table public.road_spottings (
  id uuid primary key default gen_random_uuid(),
  game_code text not null references public.road_games(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_type text not null check (vehicle_type in ('bocho', 'combi')),
  color text not null,
  created_at timestamp with time zone default now()
);

alter table public.road_games enable row level security;
alter table public.road_spottings enable row level security;

create policy "Players can create road games"
on public.road_games
for insert
with check (auth.uid() = created_by);

create policy "Players can read joined or open road games"
on public.road_games
for select
using (
  auth.uid() = created_by
  or auth.uid() = joined_by
  or joined_by is null
);

create policy "Players can join or update their road game"
on public.road_games
for update
using (
  auth.uid() = created_by
  or auth.uid() = joined_by
  or joined_by is null
)
with check (
  auth.uid() = created_by
  or auth.uid() = joined_by
);

create policy "Players can read road spottings"
on public.road_spottings
for select
using (
  exists (
    select 1
    from public.road_games
    where road_games.code = road_spottings.game_code
    and (road_games.created_by = auth.uid() or road_games.joined_by = auth.uid())
  )
);

create policy "Players can add road spottings"
on public.road_spottings
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.road_games
    where road_games.code = game_code
    and (road_games.created_by = auth.uid() or road_games.joined_by = auth.uid())
  )
);
