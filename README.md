# Sports Tracker

Personal sports results tracker. Each competition has its own Google Sheet, which holds the data. A web app is used for entry, ladders and stats.

## Layout

| Path | What it is |
|---|---|
| `apps/hub/index.html` | Home page listing every competition (on now, coming up, finished). New competitions are added to its `COMPS` list. |
| `apps/team-match/index.html` | App source for team-v-team competitions (pilot: A-League Men 2026/27). Published as a private claude.ai artifact. |
| `apps/tournament/index.html` | App source for pool-and-knockout tournaments (Rugby League World Cup 2026, men's and women's). Published as a private claude.ai artifact. |
| `index.html`, `a-league/`, `world-cup/` | GitHub Pages copies, built by `python3 tools/build_pages.py`. Don't edit them directly. Outside claude.ai the apps sign in to Google with your OAuth Client ID. |
| `docs/START-HERE.md`, `docs/handoff-*.md` | The map for new sessions, and what each competition's last session knew. |
| `manifest.webmanifest`, `*/manifest.webmanifest`, `icons/` | Let a phone save the hub, or any single app, to its home screen. |

## Branches

`main` is the live site (GitHub Pages publishes from it). Work happens on a separate branch and reaches `main` through a pull request, so the site on your phone only changes when a pull request is merged.

Planned shapes: `team-match` (football, rugby league, AFL, NFL…), `race` (F1 and other motorsport), `cricket` (limited overs and WTC). A new competition in an existing shape needs a sheet with the tabs below and its own App Settings, not new code.

## Sheet tabs (per competition)

- `Matches`: one row per game. `id | season | round | stage | date | kickoff | home | away | homeGoals | awayGoals | homeReds | awayReds | venue | attendance | extraTime | homePens | awayPens | notes | updatedAt | playedRound | status | homeHT | awayHT | homeScorers | awayScorers`. `stage` is `Regular`, `EF`, `SF1`, `SF2` or `GF`. `id` (M0001…) is permanent and matches the official match number; never renumber it. `round` is the matchday a game belongs to; `playedRound` is filled in only when a game is moved, with the round it is played alongside (the app shows it under both). `homeHT`/`awayHT` are half-time goals. `homeScorers`/`awayScorers` hold the goal scorers as one line of text, e.g. `B. Borrello 43'; L. Gillion 45+2'; N. Milanović 50' (pen)`: paste them one per line into the Details box on a match card (names with or without minutes; `(pen)` and `(OG)` are understood; an own goal is listed under the team it counted for). Players are matched by name (accents ignored, full names and initials treated alike), so there is no player list.
- Postponements: `status = Postponed` holds a game on its matchday with no valid date (the old date stays in `date`, and `notes` records it). The app lists these in a "Waiting for a new date" tray; setting the new date clears the status and suggests `playedRound` from the dates of the other rounds' games.
- `Teams`: `code | name | short | colour1 | colour2 | homeVenue | active`.
- `Venues`: `venue | city`.
- `App Settings`: `key | value` — points per result, tiebreak order, rounds, finals teams and format, season.
- Season tabs (`2018/19`…`2026/27`) are the original hand-built ladders; the app only reads them (History tab).

## Sheet safety

- New fixtures are appended with the next id, re-read from the sheet just before writing.
- Saving a result finds the row by id (exactly one match required) and writes only the cells that changed, plus `updatedAt`.
- Numbers go in as numbers, dates as yyyy-mm-dd, text with a leading `'`. Nothing is ever deleted or rewritten in bulk.

## A-League rules used

- 3 / 1 / 0 points. Level on points: goal difference, goals scored, wins, head-to-head points, head-to-head goal difference. (The official list continues with fair play, away and home goal measures and drawing lots; those are handled by hand if ever needed.)
- Finals: top six. Elimination finals 3v6 and 4v5; two-legged semi-finals (1st v the lower-ranked EF winner, 2nd v the other) on aggregate; grand final hosted by the higher seed.

## Testing

`node tests/run.js` loads the app with a stubbed `window.claude` and an in-memory sheet, pastes a round of fixtures, saves results, and checks the writes, ladder, tabs and phone layout. Needs Playwright (Chromium at `/opt/pw-browsers/chromium`). Screenshots and the generated page land in `tests/` and are git-ignored.

## Race shape (Formula E first, then F1 and other motorsport)

`apps/race/index.html` is the app source; `formula-e/index.html` is the GitHub Pages copy. The sheet id is not in the code: the app asks for the sheet link on first use and keeps it in the browser (`race_settings`). Everything competition-specific (points, bonuses, team and manufacturer rules) comes from the sheet, so F1 can reuse the app with its own sheet.

Sheet: the Formula E tracker. The original season tabs (`14/15` … `27`) and `Records` are left as they are; the app does not touch them.

- `Races`: `id | season | round | date | country | flag | city | circuit | name | heat | status | notes`. `id` like `2627-R01`. `heat` is 1 or 2 for double-headers (blank for a single race). From 2026/27 the first race of a double-header is the short "E-Prix Unleashed" race, and its `name` says so. `status` is blank, `Postponed` or `Cancelled`.
- `Results`: one row per driver per race. `id | season | raceId | driver | team | qualiPos | grid | finish | status | pole | fastestLap | pointsAdj | notes | updatedAt | groupFastest | lapsDown | pitStops | outReason | penalty | penaltyNote | investigation`. `id` is `raceId-driver` (e.g. `2627-R01-ROW`). `finish` is the classified position; `status` is blank, `DNF`, `DNS`, `DSQ` or `NC`. `pole`, `fastestLap` and `groupFastest` (fastest in a qualifying group, 2019/20–2020/21) are `Y`. `pointsAdj` is only for stewards' deductions or half points. Points are worked out by the app; they are never typed. Added 2026-11-02 (blank for history): `lapsDown` and `pitStops` (numbers), `outReason` for a DNF/DNS/DSQ/NC (e.g. `Mechanical · lap 12`), `penalty` (`+5s`, `Drive-through`…) and `penaltyNote`, and `investigation` (`Y` while the stewards are looking at it). None of these change points: `finish` is always the final, post-penalty position.
- `Drivers`: `code | name | flag | nationality | active | notes`. Codes are permanent (three letters, as on timing screens).
- `Teams` (current season): `team | short | powertrain | colour1 | colour2 | active | notes`. The 2026/27 colours are placeholders until the liveries are known.
- `Lineups`: who drove for whom each season: `season | driver | team | number | fromRound | toRound | notes`. A mid-season swap is a second row with `fromRound`; the app's **Driver change** button writes these for you (closes the regular driver's row, adds the replacement, and for a temporary change a return row). History notes hold the full entrant name (`Entrant: … · car`), which the app shows as a team's previous names.
- `Team Lineage`: `team | lineage | fromSeason | toSeason | notes`. Links every team name to its line's current (or last) name, e.g. Virgin → Envision, Dragon → DS Penske → Fortescue, Venturi → Maserati → Citroën. Used for team history and all-time team stats. Reusable for F1.
- `Powertrains`: `season | team | powertrain | notes`, 2023/24 onwards (the Manufacturers' Trophy era). Citroën, DS and Maserati (and, assumed, Opel) count as Stellantis.
- `Circuits`: `circuit | city | country | flag | type | notes`, reused across seasons for circuit records.
- `Points`: `system | position | points | notes`. `FE` is the race table (25-18-15-12-10-8-6-4-2-1); `FEQ` is qualifying points from 2026/27 (4-3-2-2-1-1-1-1).
- `App Settings`: competition, current season, points system, default bonuses, `teamPoints`, `manufacturerRule` (`best2`: each powertrain's two best-placed cars score, re-ranked, race points only), `manufacturersFrom` (`2023/24`), `logoFolder` (blank until the logos are ready).
- `Seasons`: rules per season, because they changed over the years: `season | poleBonus | fastestLapBonus | fastestLapTop10Only | groupFastestBonus | notes | qualiPoints`. `qualiPoints` names the Points system for qualifying positions (`FEQ` from 2026/27, when pole itself is worth 1).
- History (2014/15–2025/26) was imported from Wikipedia, and every season's points totals were checked against the official standings. Three known adjustments are in `Results` notes, all pole points not awarded in 2024/25: Rowland R8, Cassidy R11 and Evans R13 (qualifying cut short by weather).
- Backups: `Races`, `Teams`, `Lineups`, `Seasons` `backup 2026-11-01` and `Results backup 2026-11-02` (taken before the new columns; the `groupFastest` header was also missing until then). Never write to them.

Test: `node tests/race.js` runs the app against an in-memory sheet and checks the points engine, the manufacturers' rule, saving results, read-only past seasons and phone layout.

## Tournament app (Rugby League World Cup 2026)

`apps/tournament/index.html` is the claude.ai artifact; `world-cup/index.html` is the GitHub Pages copy (built by `tools/build_pages.py`). Sheet: "Rugby League World Cup" (`1AOY5rfdN0xSDgEmVZIQowZjR4XZOIPTgP396U46l3A0`).

The one sheet holds the men's and women's tournaments. Every `Matches` and `Teams` row has a `comp` code (`M` or `W`; blank counts as `M`), and the app has a Men/Women switch.

- `Competitions`: `comp | name | short | tables | qualifiers | poolRounds | tiebreakers | notes`. One row per competition. Its format overrides the defaults in `App Settings`.
- `Matches`: `id | tournament | stage | round | pool | date | kickoff | home | away | homeSlot | awaySlot | homeScore | awayScore | homeTries | awayTries | homeSinBins | awaySinBins | homeSendOffs | awaySendOffs | goldenPoint | venue | attendance | referee | status | notes | updatedAt | comp`. Ids carry the competition letter (`M01`, `W01`) so they stay unique across the sheet. `stage` is `Pool`, `SF` or `Final`. Kick-offs are Melbourne time. Knockout games leave `home`/`away` blank and use slots: `A1` (Pool A winner), `BC2` (Pools B & C runner-up), `W-M16` (winner of M16). When a knockout result is saved, the app writes the teams in too, but only once the games that decide them are finished. Knockout games can't be saved as a draw: enter the score after golden point and set `goldenPoint` to `Y`.
- `Teams`: `code | name | short | pool | flag | colour1 | colour2 | nickname | comp`. The same code (e.g. AUS) appears once per competition.
- `Venues`: `venue | city | country | capacity`.
- `App Settings`: `key | value`. `tables` lists the tables as `A=Pool A;BC=Pools B & C`: the letters are the pools that share a table. Pools B and C are one table because their teams only play the other pool. Also `pointsWin`/`pointsDraw`/`pointsLoss`, `tiebreakers` (`pointsDiff`, `pointsFor`, `tries`, `wins`, `h2hPoints`, `h2hPointsDiff`), `qualifiers` (how many teams per table go through) and `poolRounds`.

Test: `node tests/tournament.js` plays a whole made-up tournament through the page and prints the tables, bracket, sheet writes and phone overflow.
