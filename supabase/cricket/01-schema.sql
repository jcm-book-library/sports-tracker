-- Cricket (Big Bash League first, Tests later) on Supabase: tables, access, Row Level Security.
-- Run once in Supabase: SQL Editor > New query > paste all of this > Run
-- (then "Run and enable RLS" if Supabase shows that warning: it is a false alarm, RLS is on below).
-- Safe to run again: it only creates what is missing and resets the access rules.
--
-- The same pattern as The Brain and The Library: every row carries user_id (filled in from whoever is
-- signed in), RLS lets a signed-in user see and change only their own rows, and signed-out visitors get
-- nothing. If shared.is_owner() exists (control-room supabase/owner-only.sql has been run), every table
-- is also locked to the owner, as that file would do.
--
-- Nothing is ever deleted from the app: it has no delete grant. Fix a row by editing it.

create schema if not exists cricket;

-- Teams: one row per team per competition. code is the short code the app shows (STA, REN ...).
create table if not exists cricket.teams (
  row_id     bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  comp       text not null default 'BBL',
  code       text not null,
  name       text not null,
  short      text,
  colour1    text,
  colour2    text,
  home_city  text,
  logo       text,
  active     boolean not null default true,
  notes      text,
  updated_at timestamptz not null default now(),
  unique (user_id, comp, code)
);

-- Venues: name as the app shows it, plus city and country.
create table if not exists cricket.venues (
  row_id     bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null,
  city       text,
  country    text,
  notes      text,
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Matches: one row per game. id is permanent: BBL16-01 ... BBL16-40, finals BBL16-Q, -K, -C, -F.
-- home_* and away_* are each side's innings: runs, wickets, legal balls faced (18.4 overs = 112).
-- max_overs is the overs per side after any rain cut (blank = the usual 20).
-- result: home, away, tie, nr (no result) or abandoned. Blank = not played yet.
-- Times are Melbourne time (AEDT in summer), as text hh:mm.
create table if not exists cricket.matches (
  row_id          bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  id              text not null,
  comp            text not null default 'BBL',
  season          text not null check (season ~ '^\d{4}(/\d{2})?$'),
  match_no        integer,
  stage           text not null default 'League' check (stage in ('League','Qualifier','Knockout','Challenger','Final','Eliminator','Semi-final','Test')),
  date            date,
  start_time      text check (start_time is null or start_time ~ '^\d{2}:\d{2}$'),
  home            text,
  away            text,
  home_slot       text,
  away_slot       text,
  venue           text,
  toss_winner     text,
  toss_decision   text check (toss_decision is null or toss_decision in ('bat','field')),
  bat_first       text,
  home_runs       integer check (home_runs is null or home_runs >= 0),
  home_wkts       integer check (home_wkts is null or home_wkts between 0 and 10),
  home_balls      integer check (home_balls is null or home_balls >= 0),
  away_runs       integer check (away_runs is null or away_runs >= 0),
  away_wkts       integer check (away_wkts is null or away_wkts between 0 and 10),
  away_balls      integer check (away_balls is null or away_balls >= 0),
  max_overs       numeric check (max_overs is null or max_overs > 0),
  result          text check (result is null or result in ('home','away','tie','nr','abandoned')),
  super_over      boolean not null default false,
  method          text,
  player_of_match text,
  attendance      integer check (attendance is null or attendance >= 0),
  status          text,
  notes           text,
  source          text,
  cricsheet_id    text,
  updated_at      timestamptz not null default now(),
  unique (user_id, id)
);
create index if not exists matches_season_idx on cricket.matches (user_id, comp, season);

-- Final ladders of past seasons, as published (Wikipedia). Read-only history: old seasons had bonus points
-- and Cricsheet is missing a few early games, so these are kept as they were rather than worked out.
-- The current season's ladder is always worked out from matches.
create table if not exists cricket.ladders (
  row_id     bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  comp       text not null default 'BBL',
  season     text not null,
  pos        integer not null,
  team       text not null,
  pld        integer, w integer, l integer, t integer, nr integer, bp integer, pts integer,
  nrr        numeric,
  notes      text,
  updated_at timestamptz not null default now(),
  unique (user_id, comp, season, team)
);

-- App Settings: key | value | note (points per result, finals format, current season ...).
create table if not exists cricket.settings (
  row_id     bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  key        text not null,
  value      text,
  note       text,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- Keep updated_at current on every change.
create or replace function cricket.touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare
  t text;
  locked boolean := to_regprocedure('shared.is_owner()') is not null;
begin
  foreach t in array array['teams','venues','matches','ladders','settings'] loop
    execute format('alter table cricket.%I enable row level security', t);
    execute format('create index if not exists %I on cricket.%I (user_id)', t || '_user_idx', t);
    execute format('drop trigger if exists touch on cricket.%I', t);
    execute format('create trigger touch before update on cricket.%I for each row execute function cricket.touch()', t);
    execute format('drop policy if exists "own rows" on cricket.%I', t);
    execute format('create policy "own rows" on cricket.%I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    -- Owner only (the same restrictive policy control-room supabase/owner-only.sql adds).
    if locked then
      execute format('drop policy if exists "owner only" on cricket.%I', t);
      execute format('create policy "owner only" on cricket.%I as restrictive for all to authenticated
                      using ((select shared.is_owner())) with check ((select shared.is_owner()))', t);
    end if;
    -- Live sync, if Supabase's publication is there.
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime' and schemaname = 'cricket' and tablename = t) then
      execute format('alter publication supabase_realtime add table cricket.%I', t);
    end if;
  end loop;
  if not locked then
    raise notice 'shared.is_owner() not found: run control-room supabase/owner-only.sql with cricket in v_schemas';
  end if;
end $$;

-- Access: signed-in users only (RLS above narrows that to their own rows). No delete.
revoke all on schema cricket from anon, public;
revoke all on all tables in schema cricket from anon, public;
grant usage on schema cricket to authenticated;
revoke delete on all tables in schema cricket from authenticated;
grant select, insert, update on all tables in schema cricket to authenticated;
grant usage, select on all sequences in schema cricket to authenticated;
revoke execute on function cricket.touch() from public, anon, authenticated;

-- Tell the Data API to pick up the new tables.
notify pgrst, 'reload schema';

-- Check: expect one row, tables = 5 and owner_locked = 5 (0 if owner-only.sql was never run).
select (select count(*) from pg_tables where schemaname = 'cricket') as tables,
       (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid
          join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'cricket' and p.polname = 'owner only') as owner_locked;
