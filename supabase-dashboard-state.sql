create table public.dashboard_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamp with time zone default now()
);

alter table public.dashboard_states enable row level security;

create policy "Users can read their own dashboard"
on public.dashboard_states
for select
using (auth.uid() = user_id);

create policy "Users can insert their own dashboard"
on public.dashboard_states
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own dashboard"
on public.dashboard_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
