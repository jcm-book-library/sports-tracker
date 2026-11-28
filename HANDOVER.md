# Sports Tracker: handover

Last rewritten: 28 Nov 2026. **Rewrite this file at the end of each session; don't add to the bottom.** Keep it under 800 words. Reference material goes in `docs/` (start with `docs/START-HERE.md`).

## Where things stand
- A hub plus three apps are live on GitHub Pages from `main`: **A-League Men** (`apps/team-match`), **Rugby League World Cup** (`apps/tournament`, finished 15 Nov, Australia won both finals) and **Formula E** (`apps/race`, built in separate sessions, season starts 18 Dec; see `docs/handoff-formula-e.md`).
- **Big Bash League** (`apps/cricket`, Pages `cricket/`) is built on branch `claude/zen-curie-wikame`, waiting for its pull request and the owner's Supabase steps. It is the first sports app on **Supabase** (schema `cricket`), not a Sheet. BBL|16 starts 12 Dec. See `docs/handoff-cricket.md`.
- **NRL and NRLW** (2027, opens 28 Feb): plan drafted in `docs/plan-nrl.md`; waiting for the owner to tick the stats.
- The owner's three tracking categories (Cat 1 heavy stats, Cat 2 moderate, Cat 3 results only) are in `docs/START-HERE.md`.
- One Google Sheet per competition. Each app is one file, published as a claude.ai artifact and as a Pages copy built by `tools/build_pages.py`.
- A-League is mid-season and feature-complete for now. Tests pass (A-League 76, World Cup all, Formula E 265) and the build leaves nothing changed.
- Planned: NRL/NRLW, AFL, F1, European football (Aug 2027).

## Done in the last stretch (PRs #1 to #10 and #16; Formula E was other sessions)
- World Cup app (men's and women's), flags as inline images, RLWC colours; A-League recoloured to the A-Leagues look; official club names; club logos from a private Drive folder.
- Feedback round: opens on the current round, rounded score font, symmetrical cards, sticky mini ladder, crowd and home/away tables.
- Half-time scores in both apps; World Cup goal kicking (conversions, penalty goals, 1- and 2-point field goals) with stats; men's results backfilled from Wikipedia.
- A-League goal scorers (paste, preview, checks), top scorers, who scores first, goals by minute.
- Sheet changes, all additive with dated backups: A-League `Matches` gained `homeHT, awayHT, homeScorers, awayScorers`, `Teams.logo`, `App Settings.logoFolder`; World Cup `Matches` gained `comp`, half-time and 16 kicking columns, plus a `Competitions` tab.

## Decisions the owner has made (and why)
- **Women's A-League: shelved (3 Nov).** Not followed closely, too much admin. Don't propose it again.
- **Scorers are text on the match row** (`homeScorers`, `awayScorers`), not a Goals tab: one cell to fix, nothing deleted. Convert later only if they want to pivot in Sheets.
- **Players matched by name** (initial plus surname, accents ignored); no player list. An exceptions tab only if two real players clash.
- **Venue stays visible** on cards (quick glance with the time); everything else sits under Details.
- **World Cup has no scorer lists:** too much detail for a one-off event.
- **Crowd figures are entered by the owner.** austadiums.com was removed from the allowed domains; don't try it.
- **Logos stay private** in Google Drive, never in the repo. Flags are images because Windows can't draw flag emoji.
- `main` is live; every change reaches it by a pull request the owner merges.

## Next steps (in order)
1. Big Bash before 12 Dec: owner runs the Supabase steps in `docs/handoff-cricket.md`, merges the pull request, signs in on the site and presses Load history.
2. NRL: owner ticks the stats in `docs/plan-nrl.md`; then build on Supabase (schema `nrl`) in January.
3. control-room: add `cricket` to `v_schemas` in `supabase/owner-only.sql` and to `plans/SUPABASE.md` (separate session; the schema locks itself already).
4. Owner keeps pasting A-League scorers; fix anything the reader gets wrong.
5. Tidy to `STANDARDS.md` in small pull requests: trim `CLAUDE.md` (limit 400 words), add `audience` and `standards` to `project.json`.
6. AFL, then F1 (reuse the race app); European football from August 2027.

## Gotchas
- A new session sees only merged `main`. The workspace also resets between sessions: re-attach the repo, and reinstall tools (`python3 -m pip install beautifulsoup4`).
- Claude can create a Google Sheet but not write to it. The owner creates a blank sheet and shares it.
- Sandbox blocks CDNs: fetch libraries with `npm pack name@version`. Tests inject a stand-in Chart; check real charts by routing the script to a local copy.
- Wikipedia works through `index.php?action=render` with a User-Agent (wait after a 429). The A-Leagues, Cricinfo and austadiums are blocked.
- Force-push is blocked. If the branch's pull request has merged, restart from `main`; if the remote branch has leftovers, merge them in rather than overwrite.
- Shared files across sessions: `apps/hub/index.html`, `tools/build_pages.py`, `README.md`, `CLAUDE.md`. Change only your own part.

## Open questions for the owner
- Fill the PNG v Fiji half-time in the women's World Cup (PNG 4, Fiji 30, from Wikipedia)? Cosmetic.
- Is the Google Drive API enabled in the Cloud project, so logos load on the website version? Not confirmed.
- NRL: which team stats (list in `docs/plan-nrl.md`), player stats or not, which fixture source was used before the apps, and how much history.

## Files that matter
- `CLAUDE.md`, `docs/START-HERE.md`: rules, repo map, how to add a competition, session prompts.
- `apps/team-match/index.html`, `apps/tournament/index.html`, `apps/hub/index.html`: the apps.
- `tools/build_pages.py`: builds every Pages copy.
- `tests/run.js`, `tests/tournament.js`, `tests/race.js`, `tests/cricket.js`: the test suites.
- `supabase/cricket/01-schema.sql`, `cricket/bbl-seed.json`, `tools/cricket_seed.py`: Big Bash data.

## Start the next session with
> Repo: sports-tracker. Task: [next step]. Read CLAUDE.md and HANDOVER.md first.
