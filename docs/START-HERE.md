# Sports Tracker: start here

Read this first in any new session. It is the map of the project and the way of working. `CLAUDE.md` holds the standing rules and is loaded automatically; per-competition notes live in `docs/handoff-*.md`.

## What this is

A personal sports results tracker. Each competition has its own Google Sheet (the log: one row per match, race or result, permanent ids). A single-file web app per competition handles entry, tables and stats. The owner has no coding experience and has ADHD: put the actions they need to take first, keep steps short, give options with a recommendation, push back when you disagree.

Live site (GitHub Pages, from `main`): https://jcm-book-library.github.io/sports-tracker/

## Repo map

| Path | What it is |
|---|---|
| `apps/hub/index.html` | Home page. Add each competition to its `COMPS` list (set `href` once the app exists). |
| `apps/team-match/index.html` | Team-v-team competitions. Live: A-League Men. Next: NRL, AFL, European football. |
| `apps/tournament/index.html` | Pool-and-knockout tournaments. Live: Rugby League World Cup (men and women). |
| `apps/race/index.html` | Motorsport. Live: Formula E. Next: F1 (same app, its own sheet). See `docs/handoff-formula-e.md`. |
| `apps/cricket/` (planned) | Tests, BBL, World Test Championship. |
| `tools/build_pages.py` | Builds the GitHub Pages copy of every app. Run it after any app change. |
| `index.html`, `a-league/`, `world-cup/`, `formula-e/` | Built output. Never edit by hand. Each folder has its own `manifest.webmanifest` so it can be saved to a phone home screen. |
| `tests/run.js`, `tests/tournament.js`, `tests/race.js` | Headless Playwright tests with a stubbed `window.claude` and an in-memory sheet. |
| `README.md` | Sheet tab layouts per shape. |
| `docs/` | This guide and the per-competition handoffs. |

Each app is one file with no `<head>`: the same file is published as a private claude.ai artifact and wrapped for GitHub Pages by the build script. Both doors read and write the same Google Sheet.

## The way of working

1. **Read the house rules** (linked from `CLAUDE.md`): sheet safety, branches and pull requests, using cheaper models for build work.
2. **Work on your own branch.** Never commit to `main`. Open a pull request for the owner to merge, and say in plain words what changes on the live site.
3. **Sheet safety:** back up a tab (dated copy) before any column change; find a row by `id` right before writing; write only changed cells; never delete rows; text gets a `'` prefix; dates are `yyyy-mm-dd`. Show the owner the plan before the first write of a session. Stay inside the tabs your app owns.
4. **Look and layout:** dark theme in each competition's own colours (ask the owner for a screenshot of the official site). Symmetrical layouts wherever possible, home on the left and away on the right. Scores in the rounded `Nunito` face. Match cards show only the teams, score and half-time (or the essential result); everything else goes under a centred **Details** toggle.
5. **Test before every publish** at 360px, 390px and 1280px: no sideways scrolling, no page errors. Run `python3 tools/build_pages.py` and the test file for your app.
6. **Logos:** private, in the owner's Google Drive, never in the repo. Remind the owner at the end of each new build (the checklist is in `CLAUDE.md`).
7. **Before ending a session:** update your competition's handoff file (and `CLAUDE.md` if a rule changed), so the next session starts where you stopped.

## Adding a new competition (checklist)

1. Agree the plan with the owner first: which shape, which sheet tabs, which stats, what to gather. Options with a recommendation.
2. **The owner creates a blank Google Sheet and sends the link.** Claude can create files in Drive but cannot write to a sheet it created itself (permission denied), and the sheet must be shared with the account the Google connector is signed in as.
3. Create the tabs and headers (`Matches`/`Races`, `Teams`, `Venues`, `App Settings`, and so on) following `README.md`. Add new columns at the end only.
4. Build the app in `apps/<shape>/index.html`, starting from the closest existing app.
5. Give it its own icon: add a line to `tools/make_icons.py` (2–3 letters, its own colours) and run it. Add it to `tools/build_pages.py` (source, output folder, title, theme colour) and create `<folder>/manifest.webmanifest` (copy `world-cup/manifest.webmanifest`, change the names and colours).
6. Set the competition's `href` in the hub's `COMPS` list.
7. Write or extend the Playwright test; save screenshots to `tests/`.
8. Publish the artifact: first publish with the Google Sheets connector (`get_values`, `append_values`, `update_values`, `get_spreadsheet`), plus Google Drive (`search_files`, `download_file_content`) once logos are wired. Republish later with the artifact's `url`.
9. Open a pull request into `main`. Add a row to the logos table in `CLAUDE.md` and a section to `README.md`.

## Working in several sessions at once

One session per sport or league works well, as long as sessions don't step on each other:

- **Shared files** are `apps/hub/index.html`, `tools/build_pages.py`, `README.md` and `CLAUDE.md`. Change only your own line or section in them.
- **Merge `main` into your branch before opening a pull request**, and keep pull requests small and quick to merge. The owner merges them one at a time.
- **Never edit another competition's app or sheet tabs** from your session. If something shared needs changing, tell the owner.
- A new session sees only what is merged into `main`, so merge handoff and rule changes before starting the next session.

## Environment notes (cloud sessions)

- Network access is limited to the domains the owner has allowed; changes only apply to new sessions. Sites that have worked: Wikipedia (`index.php?action=render` is the reliable endpoint; send a User-Agent and wait after a 429), `upload.wikimedia.org`, cricsheet.org, and the ESPN data hosts. The official league and Cricinfo sites block cloud addresses. The owner removed austadiums.com from the allow list; do not try it.
- CDNs such as jsdelivr are blocked, but npm works: `npm pack <package>@<version>` fetches a library to inline or test with (used for Chart.js and flag images). Charts cannot load in the sandbox; the tests inject a stand-in, and a real-library check can route the script request to a local copy.
- Playwright and Chromium are already installed (`/opt/pw-browsers/chromium`).
- Google Drive and Sheets go through connectors. The Drive connector is signed in as the owner's second Google account, so any private Drive folder must be shared with it (Editor).
- Never put sheet links, email addresses or keys in new public files. Existing apps already contain their own sheet ids; new work should keep ids in the owner's settings where it can.

## Starting a session: copy-and-paste prompts

**A new competition** (replace the bracketed parts):

> Attach the repo `jcm-book-library/sports-tracker`. Read `CLAUDE.md`, `docs/START-HERE.md` and `docs/handoff-[competition].md` first. The sheet is: [paste the Google Sheet link]. I want to build [competition]. Here are my ideas: [ideas]. Show me a plan with options and a recommendation before you build or write to anything.

**A change to an existing app:**

> Attach the repo `jcm-book-library/sports-tracker`. Read `CLAUDE.md` and `docs/START-HERE.md`. The app is [A-League / World Cup] and its sheet is [link]. Change: [what you want]. Discuss first if it touches the sheet.

**A bug:**

> Attach the repo `jcm-book-library/sports-tracker`. Read `CLAUDE.md`. In the [A-League] app, [what you did, what you expected, what happened]. Here is a screenshot: [attach].

## Where each competition stands

| Competition | App | State |
|---|---|---|
| A-League Men 2026/27 | `apps/team-match` | Live: fixtures, ladder, results, stats, half-time scores, goal scorers, club logos from Drive. |
| Rugby League World Cup 2026 | `apps/tournament` | Live: men's and women's, goal kicking, half-time. No scorer lists, by design. Finishes 15 Nov. |
| Formula E | `apps/race` | Built (Stages 1–2): race cards with tap-in and paste entry, tags and penalties, standings grids, stats, compare, history. Season starts 18 Dec 26. See `docs/handoff-formula-e.md`. |
| Cricket, AFL, NRL, F1, European football | | Planned, in that rough order. See the hub for dates. |
