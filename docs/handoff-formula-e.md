# Formula E: handoff

Read `docs/START-HERE.md` and `CLAUDE.md` first. This file is where the Formula E work stands.

## Where things stand (1 Nov 2026)

- **App built (Stage 1)**: `apps/race/index.html`, Pages copy `formula-e/`, test `tests/race.js`. Pages: Races, Standings (Drivers / Teams / Manufacturers), Stats (Drivers / Teams), History, with a season switcher (past seasons read-only).
- **Sheet filled for 2026/27** from Wikipedia: 21-round calendar (first race of each double-header is the 30-minute "E-Prix Unleashed"), 19 drivers with numbers (Jaguar's second seat, Lola and the unnamed Porsche customer team still TBA), powertrains, placeholder team colours. Backups of `Races`, `Teams`, `Lineups`, `Seasons` were made first (`… backup 2026-11-01`).
- **New tabs**: `Team Lineage` (team name → line, e.g. Dragon → DS Penske → Fortescue) and `Powertrains` (2023/24 on). **New column**: `Seasons.qualiPoints`. New `Points` system `FEQ`.
- **2026/27 rules**: qualifying points 4-3-2-2-1-1-1-1 plus 1 for pole; fastest lap 1 point, top 10 only; manufacturers count each powertrain's two best cars, re-ranked, race points only.
- **Evans 2024/25 resolved**: R13 pole points not awarded (shortened qualifying), `pointsAdj` -3, total 74 as Wikipedia.
- The owner's hand-built season tabs (`14/15` … `27`) and `Records` are untouched and must stay that way.

## Decisions the owner made

- Full results live inside each race card (Details fold), entered by tapping drivers in order. Paste-in (from a results page) is wanted later; they mostly enter on a laptop.
- Standings as a driver × round grid like their own season tabs; podium colours, P and FL badges.
- Team lineage is wanted for F1 too.
- Everything stays sheet-driven, season to season. At the end of 2026/27 the season should appear in History like the others (it does automatically, since History reads the same tabs).

## Open items

- Check `Team Lineage` (especially Lola as the continuation of Audi/ABT) and the Opel = Stellantis assumption in `Powertrains`.
- Replace placeholder team colours once Gen4 liveries are known; fill the TBA seats in `Lineups` when announced.
- Logos: folder `formula-e` in Drive, then fill `App Settings` `logoFolder` and wire `logoFor()` (empty slot already in the app; model on the A-League logo loader).
- Stage 2: paste-in results, circuit records, team-mate head-to-head, form guide. Then F1 (needs sprint races: likely a session type on `Races`).
- Not yet checked live: points totals in the app against the official season tables (the engine follows the rules above; the previous import was checked by script).
