# Sports Tracker

Personal sports results tracker. Each competition has its own Google Sheet, which holds the data. A web app is used for entry, ladders and stats.

## Layout

| Path | What it is |
|---|---|
| `apps/team-match/index.html` | App source for team-v-team competitions (pilot: A-League Men 2026/27). Published as a private claude.ai artifact. |
| `index.html` | GitHub Pages copy of the app, built by `python3 tools/build_pages.py`. Don't edit it directly. Outside claude.ai it signs in to Google with your OAuth Client ID. |
| `manifest.webmanifest`, `icons/` | Let a phone save the Pages site as an app (Add to Home Screen). |

Planned shapes: `team-match` (football, rugby league, AFL, NFL…), `race` (F1 and other motorsport), `cricket` (limited overs and WTC). A new competition in an existing shape needs a sheet with the tabs below and its own App Settings, not new code.

## Sheet tabs (per competition)

- `Matches`: one row per game. `id | season | round | stage | date | kickoff | home | away | homeGoals | awayGoals | homeReds | awayReds | venue | attendance | extraTime | homePens | awayPens | notes | updatedAt | playedRound | status`. `stage` is `Regular`, `EF`, `SF1`, `SF2` or `GF`. `id` (M0001…) is permanent and matches the official match number; never renumber it. `round` is the matchday a game belongs to; `playedRound` is filled in only when a game is moved, with the round it is played alongside (the app shows it under both).
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

Sheet: the Formula E tracker. The original season tabs (`14/15` … `27`) and `Records` are left as they are; the app only reads them.

- `Races`: `id | season | round | date | country | flag | city | circuit | name | heat | status | notes`. `id` like `2627-R01`. `heat` is 1 or 2 for double-headers. `status` is blank, `Postponed` or `Cancelled`.
- `Results`: one row per driver per race. `id | season | raceId | driver | team | qualiPos | grid | finish | status | pole | fastestLap | pointsAdj | notes | updatedAt | groupFastest`. `id` is `raceId-driver` (e.g. `2627-R01-ROW`). `finish` is the classified position; `status` is blank, `DNF`, `DNS`, `DSQ` or `NC`. `pole`, `fastestLap` and `groupFastest` (fastest in a qualifying group, 2019/20–2020/21) are `Y`. `pointsAdj` is only for stewards' deductions or half points. Points are worked out by the app from the `Points` tab and the bonuses in `App Settings`; they are never typed.
- `Drivers`: `code | name | flag | nationality | active | notes`. Codes are permanent (three letters, as on timing screens).
- `Teams`: `team | short | powertrain | colour1 | colour2 | active | notes`. `powertrain` feeds the manufacturers' table.
- `Lineups`: who drove for whom each season: `season | driver | team | number | fromRound | toRound | notes`. A mid-season swap is a second row with `fromRound`.
- `Circuits`: `circuit | city | country | flag | type | notes`, reused across seasons for circuit records.
- `Points`: `system | position | points | notes`.
- `App Settings`: competition, season, points system, pole and fastest-lap bonuses, team and manufacturer rules.
- `Seasons`: bonus rules per season, because they changed over the years: `season | poleBonus | fastestLapBonus | fastestLapTop10Only | groupFastestBonus | notes`.
- History (2014/15–2025/26) was imported from Wikipedia into `Races`, `Results`, `Lineups`, `Drivers` and `Circuits`, and every season's points totals were checked against the official standings. Two known adjustments are in `Results` notes (Rowland 2024/25 R8, Cassidy 2024/25 R11: pole points not awarded). One open mismatch: Mitch Evans 2024/25 works out at 77, while Wikipedia says 74.

## Tournament app (Rugby League World Cup 2026)

`apps/tournament/index.html` is the claude.ai artifact; `world-cup/index.html` is the GitHub Pages copy (built by `tools/build_pages.py`). Sheet: "Rugby League World Cup" (`1AOY5rfdN0xSDgEmVZIQowZjR4XZOIPTgP396U46l3A0`).

- `Matches`: `id | tournament | stage | round | pool | date | kickoff | home | away | homeSlot | awaySlot | homeScore | awayScore | homeTries | awayTries | homeSinBins | awaySinBins | homeSendOffs | awaySendOffs | goldenPoint | venue | attendance | referee | status | notes | updatedAt`. `stage` is `Pool`, `SF` or `Final`. Kick-offs are Melbourne time. Knockout games leave `home`/`away` blank and use slots: `A1` (Pool A winner), `BC2` (Pools B & C runner-up), `W-M16` (winner of M16). When a knockout result is saved, the app writes the teams in too, but only once the games that decide them are finished. Knockout games can't be saved as a draw: enter the score after golden point and set `goldenPoint` to `Y`.
- `Teams`: `code | name | short | pool | flag | colour1 | colour2 | nickname`.
- `Venues`: `venue | city | country | capacity`.
- `App Settings`: `key | value`. `tables` lists the tables as `A=Pool A;BC=Pools B & C`: the letters are the pools that share a table. Pools B and C are one table because their teams only play the other pool. Also `pointsWin`/`pointsDraw`/`pointsLoss`, `tiebreakers` (`pointsDiff`, `pointsFor`, `tries`, `wins`, `h2hPoints`, `h2hPointsDiff`), `qualifiers` (how many teams per table go through) and `poolRounds`.

Test: `node tests/tournament.js` plays a whole made-up tournament through the page and prints the tables, bracket, sheet writes and phone overflow.
