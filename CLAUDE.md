# Notes for Claude

Personal sports tracker for one user (no coding experience, ADHD: put their action items first, keep steps short). See README.md for layout, sheet tabs and safety rules.

## Every new competition build: remind the user about logos

Club, league and team logos are kept privately in the user's Google Drive, never in this repo (it is public, and the Pages site is public). When building or extending any competition, end the reply with a reminder to add its logos, unless the table below already says they're done:

- Drive folder **Sports Tracker Logos**, one subfolder per competition (folder name as in the table).
- One file per team, named by the team code the app uses (`MCY.png`, `AUS.png`); the competition's own logo is `league.png`.
- PNG with a transparent background, 256px or larger, or SVG.
- Once a folder is filled, ask for the folder link and wire the app to it (logos load only after Google sign-in; the colour dots or flags stay as the fallback, and nothing breaks if a file is missing).

| Competition | Drive subfolder | Logos |
|---|---|---|
| A-League Men | `a-league` | Not yet |
| Rugby League World Cup 2026 (men's and women's) | `world-cup` | Not yet (flags already built in; logos optional) |
| Formula E | `formula-e` | Not yet |
| Cricket (BBL and Tests) | `cricket` | Not yet |

Add a row for each new competition and update it when the user says a folder is done.

## Shipping changes

`main` is the live GitHub Pages site. Work on a branch, run `python3 tools/build_pages.py` after any app change, and open a pull request into `main` for the user to merge.
