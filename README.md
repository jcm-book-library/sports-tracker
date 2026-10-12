# Sports Tracker

Personal sports results tracker. Each competition has its own Google Sheet, which holds the data. A web app is used for entry, ladders and stats.

## Layout

| Path | What it is |
|---|---|
| `apps/team-match/index.html` | App for team-v-team competitions (pilot: A-League Men 2026/27). Published as a private claude.ai artifact; also runs on GitHub Pages with Google sign-in. |

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
