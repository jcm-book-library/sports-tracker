# NRL and NRLW: plan (draft, 28 Nov 2026)

Category 1 (see START-HERE). The owner enters every stat by hand; nothing is imported except the draw. Building starts once Big Bash is live; the season opens on 28 Feb 2027 (Las Vegas: Eels v Titans, Storm v Wests Tigers). Perth Bears join, so 18 teams.

## Decided

- One app for NRL and NRLW, with a switch like the World Cup's Men/Women. Each competition has its own **level** setting, so NRLW can show fewer fields (Category 1 or 2) without a second app. NRLW starts in June or July.
- **Supabase**, schema `nrl` (new apps start on Supabase; Big Bash proved the pattern).
- Owner enters the stats. "Main stats, not all."
- Draw: Wikipedia once the full draw is on the 2027 season page, or the fixture source used before the apps (to confirm which; fixturedownload.com is blocked here and would need adding to the allowed domains).

## Proposed fields (owner to tick)

**Every match, always visible:** teams, score, half-time, date, time, venue.

**Details: match facts (Category 2 level, also NRLW):**
- Try scorers and goal kickers as one line per side, read with the A-League scorer reader (`Walsh 2/4`, `Tabuai-Fidow 2`).
- Field goals (1 and 2 point), golden point.
- Sin bins and send-offs (player and minute), HIA and injury notes.
- Referee, crowd.

**Details: team stats (Category 1, NRL):** one number per side.
- Possession %, completion (completed / sets), run metres, post-contact metres
- Line breaks, tackle breaks, offloads
- Tackles, missed tackles, errors, penalties conceded, set restarts
- Kick metres, forced drop-outs, 40/20s
- Captain's challenges (won / used)

**Player stats (heavy, not recommended yet):** per-player tackles and metres need a player list, which breaks the names-only rule. Add later only if the team stats aren't enough.

## Stats pages (ideas)

- Ladder with points difference, for/against, home/away and form.
- Top try scorers and point scorers, goal kicking %, who scores first, points by half.
- Team averages from the team stats (completion, metres, errors), with rank, and a compare view for two teams.
- Discipline table (sin bins, send-offs, penalties).

## Questions for the owner

1. Tick the team stats you want (or cross out the ones you don't).
2. Player stats: skip for now?
3. Which fixture source did we use before the apps?
4. History: last few seasons from Wikipedia (results and ladders only), or start clean in 2027?
