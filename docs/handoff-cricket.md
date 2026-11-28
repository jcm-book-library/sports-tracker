# Cricket (Big Bash League): handoff

Read `docs/START-HERE.md` and `CLAUDE.md` first. This file is where the cricket work stands.

## Where things stand (28 Nov 2026)

- **Category 3** (results only, see START-HERE). Tests may be added later as a second competition in the same app (`comp` column); they are not usually tracked.
- **First sports app on Supabase** instead of a Google Sheet (STANDARDS A7: new apps start on Supabase). Schema `cricket` in the shared `jcm-apps` project. No Google Sheet, no claude.ai artifact: the app lives on GitHub Pages only (`cricket/`), source `apps/cricket/index.html`, test `tests/cricket.js`.
- Sign-in is the shared Supabase sign-in (`jcm-sb-session`): signed in to The Brain or The Library in the same browser means signed in here too. Phone home-screen apps sign in once with the password.
- BBL|16 runs 12 Dec 2026 (Renegades v Scorchers in Chennai) to the final on 26 Jan 2027.

## Data

- `supabase/cricket/01-schema.sql`: tables `teams`, `venues`, `matches`, `ladders`, `settings`. Row Level Security (own rows), owner-only lock when `shared.is_owner()` exists, no delete grant. Tested on a local Postgres with a Supabase stand-in (owner, family account, signed out, duplicate ids, check rules).
- `cricket/bbl-seed.json` (built by `tools/cricket_seed.py` from downloads kept outside the repo): 8 teams, 23 venues, settings, 120 official final ladder rows (2011/12 to 2025/26), 712 matches (every Cricsheet BBL match, washed-out games from Wikipedia, and the BBL|16 fixture with finals slots). The app's setup loads it once; rows already there are skipped.
- Match ids: `BBL16-01` … `BBL16-40`, finals `BBL16-Q`, `-K`, `-C`, `-F`. Older seasons number league games by date, so early ids don't always match the official match numbers.
- Scores: runs, wickets and legal balls per side (18.4 overs = 112 balls). `max_overs` only when rain cut the game. `result` is `home`, `away`, `tie`, `nr` or `abandoned`.
- Points: 2 win, 1 no result or abandoned, 0 loss. Ladder order: points, wins, net run rate (all-out sides count the full overs). Finals: Qualifier 1v2, Knockout 3v4, Challenger (loser Q v winner K), Final (winner Q v winner C).
- Home and away in Cricsheet history are guessed from the ground (Cricsheet doesn't say).

## Known gaps

- Cricsheet is missing 14 played games from 2011/12 to 2015/16. From 2016/17 on, every season's W/L/NR matches the official ladder. The History ladders are the official ones, so only all-time stats for those early seasons are a little short.
- 2020/21 and 2021/22 had bonus points; the official ladders show them in a BP column.
- To check: the 2026/27 tie-break order (points, wins, NRR) against the BBL|16 playing conditions.

## Owner steps (Supabase, once)

1. SQL Editor, New query, paste `supabase/cricket/01-schema.sql`, Run. Expect `tables 5, owner_locked 5`.
2. Integrations, Data API, Settings, Exposed schemas: add `cricket`, Save.
3. Open the app on the site, sign in, press **Load BBL data**.
4. Later, in control-room, add `cricket` to `v_schemas` in `supabase/owner-only.sql` so its check list stays complete. The schema already locks itself.

## Next

- Logos: this app has no Google sign-in, so Drive logos would need Supabase Storage or a Google sign-in. Colour dots for now.
- WBBL is not planned. Tests later, if wanted.
