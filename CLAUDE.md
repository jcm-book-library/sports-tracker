# Notes for Claude

**Read the house rules first:** [HOUSE-RULES.md](https://github.com/jcm-book-library/control-room/blob/main/HOUSE-RULES.md) in `control-room` (plain text: https://raw.githubusercontent.com/jcm-book-library/control-room/main/HOUSE-RULES.md). They cover Google Sheet safety, branches and pull requests into `main`, using cheaper models to save usage credits, and the build template. The notes below are this repo's own; where they are more specific, they win. The project charter is `project.json`.

Personal sports tracker for one user (no coding experience, ADHD: put their action items first, keep steps short). See README.md for layout, sheet tabs and safety rules.

## Every new competition build: remind the user about logos

Club, league and team logos are kept privately in the user's Google Drive, never in this repo (it is public, and the Pages site is public). When building or extending any competition, end the reply with a reminder to add its logos, unless the table below already says they're done:

- Drive folder **Sports Tracker Logos**, with subfolders as in the table. Logos belong to clubs, not competitions: a subfolder can be a shared pool used by several competitions (e.g. `england-football` serves the Premier League, Championship, League One, League Two and the cups, so promotion and relegation never mean moving files).
- Small, fixed competitions: one file per team, named by the team code the app uses (`MCY.png`, `AUS.png`); the competition's own logo is `league.png`.
- Shared pools: files named by club slug, lowercase with dashes (`burnley.png`, `man-city.png`), because 3-letter codes clash across 90+ clubs. Each competition's Teams tab gets a `logo` column holding the slug. A rebranded crest is saved as `burnley-2024.png` and that season's Teams tab points at it, so older seasons keep the old crest. Competition logos sit in the pool too (`premier-league.png`, `fa-cup.png`).
- PNG with a transparent background, 256px or larger, or SVG.
- Once a folder is filled, ask for the folder link and wire the app to it (logos load only after Google sign-in; the colour dots or flags stay as the fallback, and nothing breaks if a file is missing).

| Competition | Drive subfolder | Logos |
|---|---|---|
| A-League Men | `a-league` (folder id `1XQnuJ0VcjqrCoDRR3_lkkQtDQ7uA5BMB`) | Done, wired up. Files are named by club (`Melbourne City.png`); the Teams tab's `logo` column holds each file name and App Settings `logoFolder` holds the folder id |
| Rugby League World Cup 2026 (men's and women's) | `world-cup` | Not yet (flags already built in; logos optional) |
| Formula E | `formula-e` | Not yet |
| Cricket (BBL and Tests) | `cricket` | Not yet |
| English football (Premier League down to League Two, cups) | `england-football` (shared pool) | Not yet (planned for August 2027) |

Add a row for each new competition and update it when the user says a folder is done.

Google accounts: the logo folders and sports sheets belong to the owner's main Google account. The Google Drive connector in Claude is signed in as the owner's second Google account, so each logo folder must be shared with that second account (Editor) before Claude or the claude.ai artifacts can read it. The GitHub Pages apps read Drive with the user's own Google sign-in (drive.readonly scope).

## Matchday card convention (all competitions)

The owner keeps adding detail to each sport, so every matchday/round card follows one pattern:

- **Always visible:** the teams, the score, the half-time pair, the date/time/venue line, and the footer (Edit fixture left, result or status centre, Save result right).
- **Folded under a centred "Details" toggle:** everything else (cards, attendance, referee, tries, kicking, discipline, extra time and so on). New fields go in there.
- Warnings about hidden fields (for example "breakdown adds to 18, score is 20") stay visible outside the fold, and the toggle shows a dot when there are unsaved changes inside it.
- Which cards are open is remembered while the page is open (`state.open`), so saving never snaps them shut.
- Keep layouts symmetrical (home left, away right, labels centred) and test at 360px, 390px and 1280px with no sideways scrolling.

## Shipping changes

`main` is the live GitHub Pages site. Work on a branch, run `python3 tools/build_pages.py` after any app change, and open a pull request into `main` for the user to merge.
