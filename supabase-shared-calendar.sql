create table public.shared_calendars (
  code text primary key,
  created_by uuid not null references auth.users(id) on delete cascade,
  joined_by uuid references auth.users(id) on delete set null,
  created_name text,
  joined_name text,
  created_at timestamp with time zone default now()
);

create table public.shared_calendar_events (
  id uuid primary key default gen_random_uuid(),
  calendar_code text not null references public.shared_calendars(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null,
  event_date date not null,
  created_at timestamp with time zone default now()
);

alter table public.shared_calendars enable row level security;
alter table public.shared_calendar_events enable row level security;

create policy "Users can create shared calendars"
on public.shared_calendars
for insert
with check (auth.uid() = created_by);

create policy "Users can read joined or open shared calendars"
on public.shared_calendars
for select
using (auth.uid() = created_by or auth.uid() = joined_by or joined_by is null);

create policy "Users can join shared calendars"
on public.shared_calendars
for update
using (auth.uid() = created_by or auth.uid() = joined_by or joined_by is null)
with check (auth.uid() = created_by or auth.uid() = joined_by);

create policy "Calendar players can read events"
on public.shared_calendar_events
for select
using (
  exists (
    select 1 from public.shared_calendars
    where shared_calendars.code = shared_calendar_events.calendar_code
    and (shared_calendars.created_by = auth.uid() or shared_calendars.joined_by = auth.uid())
  )
);

create policy "Calendar players can add events"
on public.shared_calendar_events
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.shared_calendars
    where shared_calendars.code = calendar_code
    and (shared_calendars.created_by = auth.uid() or shared_calendars.joined_by = auth.uid())
  )
);

create policy "Calendar players can delete own events"
on public.shared_calendar_events
for delete
using (auth.uid() = user_id);
