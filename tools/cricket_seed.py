"""Build cricket/bbl-seed.json: teams, venues, settings, every past BBL match and the BBL|16 fixture.

The app's Setup button loads this file into Supabase once (rows that are already there are skipped).
Run (downloads go in a scratch folder, never in the repo):
  python3 -I tools/cricket_seed.py <cricsheet bbl_json folder> <wiki folder>
The wiki folder holds fixture.json (BBL|16 league fixture), ladders.json (final ladders per season)
and abandoned.json (washed-out games Cricsheet leaves out), parsed from the Wikipedia season pages.

Sources: Cricsheet (cricsheet.org, ODC-BY) for ball-by-ball history, reduced here to one row per match;
Wikipedia for the BBL|16 fixture, the official final ladders and abandoned games.
"""
import glob, json, re, sys, datetime
from pathlib import Path

root = Path(__file__).resolve().parent.parent
cs_dir, wiki = Path(sys.argv[1]), Path(sys.argv[2])

TEAMS = [  # code, name, short, colour1, colour2, home city
    ('STR', 'Adelaide Strikers', 'Strikers', '#0b8fd6', '#0a2a4a', 'Adelaide'),
    ('HEA', 'Brisbane Heat', 'Heat', '#16b3a6', '#0c2f3a', 'Brisbane'),
    ('HUR', 'Hobart Hurricanes', 'Hurricanes', '#6b2c91', '#e8e0f0', 'Hobart'),
    ('REN', 'Melbourne Renegades', 'Renegades', '#e2231a', '#1a1a1a', 'Melbourne'),
    ('STA', 'Melbourne Stars', 'Stars', '#00a651', '#0b2e1a', 'Melbourne'),
    ('SCO', 'Perth Scorchers', 'Scorchers', '#f47a20', '#2a1406', 'Perth'),
    ('SIX', 'Sydney Sixers', 'Sixers', '#e5197e', '#2a0a1a', 'Sydney'),
    ('THU', 'Sydney Thunder', 'Thunder', '#8cc63f', '#1b2a0c', 'Sydney'),
]
CODE = {t[1]: t[0] for t in TEAMS}

# Cricsheet / Wikipedia venue name -> the name the app shows, plus city and country.
VENUES = {
    'Adelaide Oval': ('Adelaide Oval', 'Adelaide'), 'Bellerive Oval': ('Bellerive Oval', 'Hobart'),
    'Brisbane Cricket Ground': ('The Gabba', 'Brisbane'), 'The Gabba': ('The Gabba', 'Brisbane'),
    'Melbourne Cricket Ground': ('Melbourne Cricket Ground', 'Melbourne'), 'Perth Stadium': ('Perth Stadium', 'Perth'),
    'Sydney Cricket Ground': ('Sydney Cricket Ground', 'Sydney'), 'Marvel Stadium': ('Marvel Stadium', 'Melbourne'),
    'Etihad Stadium': ('Marvel Stadium', 'Melbourne'), 'WACA': ('WACA Ground', 'Perth'),
    'Manuka Oval': ('Manuka Oval', 'Canberra'), 'Sydney Showground Stadium': ('Sydney Showground Stadium', 'Sydney'),
    'ENGIE Stadium': ('Sydney Showground Stadium', 'Sydney'), 'Metricon Stadium': ('Carrara Stadium', 'Gold Coast'),
    'Heritage Bank Stadium': ('Carrara Stadium', 'Gold Coast'), 'GMHBA Stadium': ('Kardinia Park', 'Geelong'),
    'ANZ Stadium': ('Stadium Australia', 'Sydney'), 'University of Tasmania Stadium': ('York Park', 'Launceston'),
    'York Park': ('York Park', 'Launceston'), 'International Sports Stadium': ('Coffs Harbour International Stadium', 'Coffs Harbour'),
    'Coffs Harbour International Stadium': ('Coffs Harbour International Stadium', 'Coffs Harbour'),
    'Junction Oval': ('Junction Oval', 'Melbourne'), 'Lavington Sports Oval': ('Lavington Sports Oval', 'Albury'),
    'Ted Summerton Reserve': ('Ted Summerton Reserve', 'Moe'), 'Traeger Park': ('Traeger Park', 'Alice Springs'),
    'North Sydney Oval': ('North Sydney Oval', 'Sydney'), 'Geelong Cricket Ground': ('Geelong Cricket Ground', 'Geelong'),
    'Cazalys Stadium': ('Cazalys Stadium', 'Cairns'), 'M. A. Chidambaram Stadium': ('M. A. Chidambaram Stadium', 'Chennai'),
}
# Grounds that belong to one club, used to guess home and away in Cricsheet history (it doesn't say).
HOME_GROUND = {'Adelaide Oval': 'STR', 'The Gabba': 'HEA', 'Bellerive Oval': 'HUR', 'York Park': 'HUR',
               'Marvel Stadium': 'REN', 'Kardinia Park': 'REN', 'Melbourne Cricket Ground': 'STA', 'Junction Oval': 'REN',
               'Perth Stadium': 'SCO', 'WACA Ground': 'SCO', 'Sydney Cricket Ground': 'SIX',
               'Sydney Showground Stadium': 'THU', 'Stadium Australia': 'THU', 'Manuka Oval': 'THU'}
STAGE = {'Qualifier': ('Qualifier', 'Q'), 'Knockout': ('Knockout', 'K'), 'Challenger': ('Challenger', 'C'),
         'Final': ('Final', 'F'), 'Eliminator': ('Eliminator', 'E'), 'Semi Final': ('Semi-final', 'SF')}


def venue(raw):
    base = raw.split(',')[0].strip()
    return VENUES.get(base) or VENUES.get(raw.strip()) or (base, None)


def edition(season):
    return int(season[:4]) - 2010


def innings_line(inn):
    runs = wk = balls = 0
    for ov in inn.get('overs', []):
        for d in ov['deliveries']:
            runs += d['runs']['total']
            ex = d.get('extras', {})
            if 'wides' not in ex and 'noballs' not in ex:
                balls += 1
            wk += sum(1 for w in d.get('wickets', []) if w.get('kind') not in ('retired hurt', 'retired not out'))
    return runs, wk, balls


matches, venues_seen = [], {}
for f in sorted(glob.glob(str(cs_dir / '*.json'))):
    d = json.load(open(f)); i = d['info']
    t1, t2 = (CODE[t] for t in i['teams'])
    vname, vcity = venue(i['venue']); venues_seen[vname] = vcity or i.get('city')
    home, away = t1, t2
    g = HOME_GROUND.get(vname)
    if g == t2:
        home, away = t2, t1
    inns = [x for x in d['innings'] if not x.get('super_over')]
    line = {}
    max_overs = None
    for x in inns:
        line[CODE[x['team']]] = innings_line(x)
        if x.get('target', {}).get('overs') and x['target']['overs'] != i.get('overs', 20):
            max_overs = x['target']['overs']
    o = i['outcome']
    if 'winner' in o:
        res = 'home' if CODE[o['winner']] == home else 'away'
    elif o.get('eliminator'):
        res = 'home' if CODE[o['eliminator']] == home else 'away'
    elif o.get('result') == 'no result':
        res = 'nr'
    elif o.get('result') == 'tie':
        res = 'tie'
    else:
        res = None
    stg = i['event'].get('stage')
    stage, suffix = STAGE.get(stg, ('League', None)) if stg else ('League', None)
    toss = i.get('toss', {})
    m = dict(comp='BBL', season=i['season'], stage=stage, date=i['dates'][0], home=home, away=away, venue=vname,
             toss_winner=CODE.get(toss.get('winner')), toss_decision=toss.get('decision'),
             bat_first=CODE[inns[0]['team']] if inns else None,
             result=res, super_over=bool(o.get('eliminator')), method=o.get('method'),
             player_of_match='; '.join(i.get('player_of_match', [])) or None,
             max_overs=max_overs, source='cricsheet', cricsheet_id=Path(f).stem, _suffix=suffix,
             _no=i['event'].get('match_number'))
    for side, code in (('home', home), ('away', away)):
        r = line.get(code)
        m[side + '_runs'], m[side + '_wkts'], m[side + '_balls'] = r if r else (None, None, None)
    matches.append(m)

# Washed-out games Cricsheet leaves out (from the Wikipedia season pages).
MON = {m: n for n, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                                   'September', 'October', 'November', 'December'], 1)}
for a in json.load(open(wiki / 'abandoned.json')):
    if 'Academy' in a['team1'] or a['venue'].startswith('CitiPower'):
        continue  # warm-up games
    parts = a['date'].split()
    yr = int(parts[2]) if len(parts) > 2 else (int(a['season'][:4]) + (1 if MON[parts[1]] < 7 else 0))
    date = f'{yr}-{MON[parts[1]]:02d}-{int(parts[0]):02d}'
    n1, n2 = (re.sub(r'\(H\)', '', x).strip() for x in (a['team1'], a['team2']))
    c1, c2 = CODE[n1], CODE[n2]
    if any(m['date'] == date and {m['home'], m['away']} == {c1, c2} for m in matches):
        continue
    home, away = (c2, c1) if '(H)' in a['team2'] else (c1, c2)
    vname, vcity = venue(re.split(r'Attendance', a['venue'])[0])
    venues_seen[vname] = vcity
    att = re.search(r'Attendance: ([\d,]+)', a['venue'])
    no = re.search(r'Match (\d+)', a['round'])
    matches.append(dict(comp='BBL', season=a['season'], stage='League', date=date, home=home, away=away, venue=vname,
                        result='abandoned' if re.search('(?i)abandon', a['result']) else 'nr',
                        attendance=int(att.group(1).replace(',', '')) if att else None,
                        source='wikipedia', notes=a['result'], _no=int(no.group(1)) if no else None, _suffix=None))

# Number every season's league games by date (Cricsheet's own numbers where it has them), finals by stage.
out = []
for season in sorted({m['season'] for m in matches}):
    ed = edition(season)
    league = sorted((m for m in matches if m['season'] == season and m['stage'] == 'League'),
                    key=lambda m: (m['date'], m.get('cricsheet_id') or ''))
    for n, m in enumerate(league, 1):
        m['match_no'] = n
        m['id'] = f'BBL{ed:02d}-{n:02d}'
    fin = sorted((m for m in matches if m['season'] == season and m['stage'] != 'League'), key=lambda m: m['date'])
    sf = 0
    for m in fin:
        suf = m['_suffix']
        if suf == 'SF':
            sf += 1; suf = f'SF{sf}'
        m['id'] = f'BBL{ed:02d}-{suf}'
        m['match_no'] = None
    out += league + fin

# BBL|16 (2026/27): the league fixture from Wikipedia, then the four finals with slots.
for x in json.load(open(wiki / 'fixture.json')):
    vname, vcity = venue(x['venue']); venues_seen[vname] = vcity or x['city']
    out.append(dict(id=f"BBL16-{x['no']:02d}", comp='BBL', season='2026/27', match_no=x['no'], stage='League',
                    date=x['date'], start_time=x['start'], home=CODE[x['home']], away=CODE[x['away']], venue=vname,
                    source='wikipedia'))
for suf, stage, date, hs, as_ in [('Q', 'Qualifier', '2027-01-19', '1', '2'), ('K', 'Knockout', '2027-01-20', '3', '4'),
                                  ('C', 'Challenger', '2027-01-23', 'LQ', 'WK'), ('F', 'Final', '2027-01-26', 'WQ', 'WC')]:
    out.append(dict(id=f'BBL16-{suf}', comp='BBL', season='2026/27', stage=stage, date=date, home_slot=hs,
                    away_slot=as_, source='wikipedia'))

for m in out:
    for k in ('_suffix', '_no'):
        m.pop(k, None)
    for k in [k for k, v in m.items() if v is None]:
        del m[k]

COUNTRY = {'Chennai': 'India'}
seed = {
    'version': 1,
    'built': datetime.date.today().isoformat(),
    'sources': 'Cricsheet (cricsheet.org, ODC-BY) and Wikipedia season pages (CC BY-SA)',
    'teams': [dict(comp='BBL', code=c, name=n, short=s, colour1=a, colour2=b, home_city=h) for c, n, s, a, b, h in TEAMS],
    'venues': [dict(name=v, city=c, country=COUNTRY.get(c, 'Australia')) for v, c in sorted(venues_seen.items())],
    'settings': [
        dict(key='season', value='2026/27', note='Current season'),
        dict(key='pointsWin', value='2'), dict(key='pointsNR', value='1', note='No result or abandoned'),
        dict(key='pointsTie', value='1', note='Only if a tie is not settled by a Super Over'),
        dict(key='pointsLoss', value='0'),
        dict(key='finals', value='Q:1v2;K:3v4;C:LQvWK;F:WQvWC', note='Qualifier, Knockout, Challenger, Final (since BBL|12)'),
        dict(key='tiebreakers', value='points,wins,nrr', note='Level on points: more wins, then net run rate'),
        dict(key='overs', value='20'),
    ],
    'ladders': [dict(comp='BBL', season=s, **{k: v for k, v in r.items() if k != 'team'}, team=CODE[r['team']])
                for s, rows in json.load(open(wiki / 'ladders.json')).items() for r in rows],
    'matches': out,
}
dest = root / 'cricket' / 'bbl-seed.json'
dest.parent.mkdir(exist_ok=True)
dest.write_text(json.dumps(seed, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
print('wrote', dest.relative_to(root), len(out), 'matches,', len(seed['ladders']), 'ladder rows,', len(seed['venues']), 'venues')
