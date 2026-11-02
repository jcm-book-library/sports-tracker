// Headless test of the Formula E (race shape) page with a stubbed window.claude and an in-memory sheet.
// Never touches a real Google Sheet. Run: node tests/race.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const pageHtml = fs.readFileSync(path.join(DIR, 'apps/race/index.html'), 'utf8');

/* ---------- seed sheet ---------- */
const RES_HEAD = ['id', 'season', 'raceId', 'driver', 'team', 'qualiPos', 'grid', 'finish', 'status', 'pole', 'fastestLap', 'pointsAdj', 'notes', 'updatedAt', 'groupFastest', 'lapsDown', 'pitStops', 'outReason', 'penalty', 'penaltyNote', 'investigation'];
const RACE_HEAD = ['id', 'season', 'round', 'date', 'country', 'flag', 'city', 'circuit', 'name', 'heat', 'status', 'notes'];
const drivers = [['EVA', 'Mitch Evans', '🇳🇿', 'New Zealand'], ['CAS', 'Nick Cassidy', '🇳🇿', 'New Zealand'], ['WEH', 'Pascal Wehrlein', '🇩🇪', 'Germany'],
  ['DAC', 'Antonio Felix da Costa', '🇵🇹', 'Portugal'], ['ROW', 'Oliver Rowland', '🇬🇧', 'United Kingdom'], ['BIR', 'Sam Bird', '🇬🇧', 'United Kingdom'], ['MUE', 'Maximilian Guenther', '🇩🇪', 'Germany'],
  ['NEW', 'Nico Newman', '🇦🇺', 'Australia'], ['ZED', 'Zed Zeller', '🇨🇭', 'Switzerland']];
const teamOf = { 2324: { EVA: 'Jaguar', CAS: 'Jaguar', WEH: 'Porsche', DAC: 'Porsche', ROW: 'Nissan', BIR: 'Envision' }, 1920: { EVA: 'Jaguar', CAS: 'Jaguar', WEH: 'Porsche', DAC: 'Porsche', ROW: 'Nissan', BIR: 'Virgin' } };
teamOf[2324].MUE = 'Nissan';
const races = [];
const results = [];
function addRace(season, tag, n, date, flag, city, circuit, name) { races.push([`${tag}-R0${n}`, season, n, date, '', flag, city, circuit, name, '', '', '']); }
// res: [driver, finish, extras]   extras: {status, pole, fl, grp, adj, laps, pits, why, pen, note, inv}
function addResults(tag, season, n, list) {
  list.forEach(([d, fin, x = {}]) => results.push([`${tag}-R0${n}-${d}`, season, `${tag}-R0${n}`, d, teamOf[tag][d], '', '', fin, x.status || '', x.pole ? 'Y' : '', x.fl ? 'Y' : '', x.adj ?? '', '', '', x.grp ? 'Y' : '',
    x.laps ?? '', x.pits ?? '', x.why || '', x.pen || '', x.note || '', x.inv ? 'Y' : '']));
}
[['1920', '2019/20'], ['2324', '2023/24'], ['2627', '2026/27']].forEach(([tag, season], k) => {
  [[1, 'Diriyah', 'Riyadh'], [2, 'Mexico City', 'Mexico City'], [3, 'Monaco', 'Monte Carlo']].forEach(([n, city, circ]) =>
    addRace(season, tag, n, `${season.slice(0, 4)}-0${n + 1}-1${n}`.replace(/^2026-/, '2026-1').replace('2026-12-1', '2026-12-1'), '🏁', city, circ, `${city} E-Prix`));
});
// make the 2026/27 dates sensible (Dec 2026 onwards)
['2627-R01', '2627-R02', '2627-R03'].forEach((id, i) => { races.find(r => r[0] === id)[3] = `2026-12-${10 + i * 7}`; });
// 2019/20: engine edge cases
addResults('1920', '2019/20', 1, [['EVA', 1, { pole: 1, fl: 1 }], ['CAS', 2, { grp: 1 }], ['BIR', 3, { adj: -3 }], ['WEH', 4, { status: 'DSQ' }], ['DAC', 5], ['ROW', 6]]);
addResults('1920', '2019/20', 2, [['EVA', 1], ['CAS', 2], ['BIR', 3], ['WEH', 4], ['ROW', 5], ['DAC', 12, { fl: 1 }]]);
addResults('1920', '2019/20', 3, [['CAS', 1], ['EVA', 2], ['ROW', 3], ['DAC', 4], ['WEH', 5], ['BIR', 6]]);
// 2023/24: manufacturers (BIR's Envision uses Jaguar power)
addResults('2324', '2023/24', 1, [['EVA', 1, { pole: 1, pen: '+5s', note: 'track limits', pits: 1 }], ['CAS', 2, { fl: 1 }], ['BIR', 3], ['WEH', 4], ['DAC', 5], ['ROW', 6]]);
addResults('2324', '2023/24', 2, [['WEH', 1], ['EVA', 2], ['DAC', 3], ['BIR', 4], ['ROW', 5], ['CAS', 6]]);
addResults('2324', '2023/24', 3, [['ROW', 1, { inv: 1, pits: 2 }], ['BIR', 2], ['CAS', 3, { pits: 1 }], ['EVA', 4], ['WEH', 5], ['DAC', 6, { laps: 1 }], ['MUE', '', { status: 'DNF', why: 'Mechanical · lap 12', pits: 0 }]]);

const FE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], FEQ = [4, 3, 2, 2, 1, 1, 1, 1];
const sheet = {
  'App Settings': [['key', 'value', 'what it does'], ['competition', 'Formula E'], ['season', '2026/27'], ['pointsSystem', 'FE'], ['poleBonus', 3], ['fastestLapBonus', 1], ['fastestLapTop10Only', 'Y'],
    ['teamPoints', 'sum'], ['manufacturerRule', 'best2'], ['manufacturersFrom', '2023/24'], ['logoFolder', '']],
  Seasons: [['season', 'poleBonus', 'fastestLapBonus', 'fastestLapTop10Only', 'groupFastestBonus', 'notes', 'qualiPoints'],
    ['2019/20', 3, 1, 'Y', 1, '', ''], ['2023/24', 3, 1, 'Y', '', '', ''], ['2026/27', 3, 1, 'Y', '', 'check regulations', 'FEQ']],
  Points: [['system', 'position', 'points', 'notes'], ...FE.map((p, i) => ['FE', i + 1, p, '']), ...FEQ.map((p, i) => ['FEQ', i + 1, p, ''])],
  Races: [RACE_HEAD, ...races],
  Results: [RES_HEAD, ...results],
  Drivers: [['code', 'name', 'flag', 'nationality', 'active', 'notes'], ...drivers.map(d => [...d, 'Y', ''])],
  Teams: [['team', 'short', 'powertrain', 'colour1', 'colour2', 'active', 'notes'], ['Jaguar', 'Jaguar', 'Jaguar', '#1d1d1d', '#c8a24a', 'Y', ''], ['Envision', 'Envision', 'Jaguar', '#00a651', '', 'Y', ''],
    ['Porsche', 'Porsche', 'Porsche', '#d5001c', '', 'Y', ''], ['Nissan', 'Nissan', 'Nissan', '#c3002f', '', 'Y', '']],
  Lineups: [['season', 'driver', 'team', 'number', 'fromRound', 'toRound', 'notes'],
    ['2026/27', 'EVA', 'Jaguar', 9, '', '', 'Entrant: Jaguar TCS Racing · Jaguar I-TYPE 7'], ['2026/27', 'CAS', 'Jaguar', 37, '', '', ''], ['2026/27', 'WEH', 'Porsche', 94, '', '', ''], ['2026/27', 'DAC', 'Porsche', 13, '', '', ''],
    ['2026/27', 'ROW', 'Nissan', 22, '', 1, ''], ['2026/27', 'MUE', 'Nissan', 22, 2, '', ''], ['2026/27', 'NEW', 'Porsche', 7, '', '', ''], ['2026/27', 'ZED', 'Nissan', 12, '', '', ''], ['2026/27', 'BIR', 'Envision', 4, '', '', 'Rounds 1,2,3; Entrant: Envision Racing · Jaguar I-TYPE 7'],
    ['2023/24', 'BIR', 'Envision', 4, '', '', 'Entrant: Envision Racing · Jaguar I-TYPE 6'], ['2019/20', 'BIR', 'Virgin', 4, '', '', 'Entrant: Envision Virgin Racing · Audi e-tron FE06'],
    ['2023/24', 'EVA', 'Jaguar', 9, '', '', ''], ['2019/20', 'EVA', 'Jaguar', 9, '', '', '']],
  Circuits: [['circuit', 'city', 'country', 'flag', 'type', 'notes'], ['Riyadh', 'Diriyah', 'Saudi Arabia', '🇸🇦', 'Street', ''], ['Mexico City', 'Mexico City', 'Mexico', '🇲🇽', 'Permanent', '']],
  'Team Lineage': [['team', 'lineage', 'fromSeason', 'toSeason', 'notes'], ['Virgin', 'Envision', '2018/19', '2019/20', ''], ['Envision', 'Envision', '2020/21', '', '']],
  Powertrains: [['season', 'team', 'powertrain', 'notes'], ['2023/24', 'Jaguar', 'Jaguar', ''], ['2023/24', 'Envision', 'Jaguar', ''], ['2023/24', 'Porsche', 'Porsche', ''], ['2023/24', 'Nissan', 'Nissan', '']]
};

const stub = `
<script>
const SHEET = ${JSON.stringify(sheet)};
window.__SHEET = SHEET; window.__CALLS = [];
const col = s => s.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
function parse(range) {
  const m = range.match(/^'?(.+?)'?!([A-Z]+)(\\d*)(?::([A-Z]+)(\\d*))?$/);
  if (!m) throw { code: 'tool_error', message: 'Unable to parse range: ' + range };
  return { tab: m[1].replace(/''/g, "'"), c1: col(m[2]), r1: m[3] ? +m[3] - 1 : 0, c2: m[4] ? col(m[4]) : col(m[2]), r2: m[5] ? +m[5] - 1 : (m[4] || !m[3] ? Infinity : +m[3] - 1) };
}
const store = v => typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
const mcp = {
  async callTool(server, tool, input) {
    window.__CALLS.push([tool, input.range || '', JSON.stringify(input.values || '')]);
    await new Promise(r => setTimeout(r, 3));
    const p = parse(input.range), t = SHEET[p.tab];
    if (!t) throw { code: 'tool_error', message: 'Unable to parse range: ' + input.range };
    if (tool === 'get_values') {
      const out = [];
      for (let r = p.r1; r <= Math.min(p.r2, t.length - 1); r++) { const row = (t[r] || []).slice(p.c1, p.c2 + 1).map(v => v == null ? '' : String(v)); while (row.length && row[row.length - 1] === '') row.pop(); out.push(row); }
      while (out.length && !out[out.length - 1].length) out.pop();
      return { payload: { range: input.range, values: out } };
    }
    if (tool === 'append_values') { input.values.forEach(v => t.push(v.map(store))); return { payload: { updates: { updatedRows: input.values.length } } }; }
    if (tool === 'update_values') {
      input.values.forEach((row, i) => { const r = p.r1 + i; t[r] = t[r] || []; row.forEach((v, j) => { t[r][p.c1 + j] = store(v); }); });
      return { payload: { updatedCells: 1 } };
    }
    throw { code: 'tool_error', message: 'stub has no ' + tool };
  }
};
window.claude = { use: async name => name === 'mcp' ? mcp : null };
</script>`;
fs.writeFileSync(path.join(__dirname, 'page-race.html'), `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${stub}</head><body>${pageHtml}</body></html>`);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const checks = [];
  const check = (name, ok, extra) => { checks.push([name, !!ok]); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); };
  const newPage = async (withSheet) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|accounts\.google\.com/, r => r.abort());
    if (withSheet) await ctx.addInitScript(() => { try { if (!localStorage.getItem('race_settings')) localStorage.setItem('race_settings', JSON.stringify({ sheetId: 'TESTSHEETID1234567890abcdef' })); } catch (e) {} });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.join(__dirname, 'page-race.html'));
    return page;
  };
  const live = page => page.waitForFunction(() => document.getElementById('status').dataset.state === 'live', null, { timeout: 15000 });
  const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  /* (5) setup card when no sheet id is stored */
  const fresh = await newPage(false);
  await fresh.waitForSelector('#setup:not([hidden])');
  check('setup card shows when no sheet id is stored', await fresh.isVisible('#setup') && !(await fresh.isVisible('#app')) && /Paste your Formula E sheet link/.test(await fresh.textContent('#setup')));
  check('no sheet call before a link is pasted', (await fresh.evaluate(() => window.__CALLS.length)) === 0);
  await fresh.fill('#setupLink', 'not a link'); await fresh.click('#setupGo');
  check('a bad link is refused', /doesn't look like/.test(await fresh.textContent('#setupMsg')));
  await fresh.screenshot({ path: path.join(__dirname, 'race-setup-1280.png') });
  await fresh.setViewportSize({ width: 360, height: 740 });
  check('setup card has no sideways scroll at 360', (await overflow(fresh)) <= 0);
  await fresh.fill('#setupLink', 'https://docs.google.com/spreadsheets/d/TESTSHEETID1234567890abcdef/edit?gid=0#gid=0'); await fresh.click('#setupGo');
  await live(fresh);
  check('link is stored as race_settings.sheetId and the app loads', (await fresh.evaluate(() => JSON.parse(localStorage.getItem('race_settings')).sheetId)) === 'TESTSHEETID1234567890abcdef' && await fresh.isVisible('#app') && !(await fresh.isVisible('#setup')));
  check('reads used the pasted sheet id', await fresh.evaluate(() => window.__CALLS.length > 5));
  await fresh.context().close();

  /* main run */
  const page = await newPage(true);
  await live(page);
  console.log('status:', await page.textContent('#statusText'));

  // (1) points engine
  const eng = await page.evaluate(() => {
    const t = (season, race) => Object.fromEntries(seasonData(season).byRace.get(race).map(r => [r.driver, r.calc]));
    const a = t('2019/20', '1920-R01'), b = t('2019/20', '1920-R02');
    return { r1: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.total])), dsq: a.WEH, fl12: b.DAC, adj: a.BIR, grp: a.CAS,
      quali: resultCalc({ finish: 2, qualiPos: 1, status: '', pole: true, fastestLap: true, groupFastest: false, pointsAdj: 0 }, rulesFor('2026/27')),
      qualiPast: resultCalc({ finish: 2, qualiPos: 1, status: '', pole: false, fastestLap: false, groupFastest: false, pointsAdj: 0 }, rulesFor('2023/24')).total,
      rules: [rulesFor('2019/20').groupBonus, rulesFor('2026/27').qualiPoints, rulesFor('2023/24').qualiPoints, rulesFor('2026/27').fl10],
      tot: Object.fromEntries(seasonData('2019/20').drivers.map(d => [d.code, d.total])) };
  });
  check('pole +3, fastest lap +1, group fastest +1 and an adjustment of -3 add up', eng.r1.EVA === 29 && eng.r1.CAS === 19 && eng.r1.BIR === 12 && eng.r1.DAC === 10 && eng.r1.ROW === 8, eng.r1);
  check('group fastest bonus is 1 in 2019/20', eng.grp.grp === 1 && eng.rules[0] === 1);
  check('pointsAdj -3 is applied', eng.adj.adj === -3 && eng.adj.race === 15);
  check('DSQ scores nothing even with a finish number', eng.dsq.total === 0 && eng.dsq.race === 0);
  check('fastest lap by P12 scores 0 (top-10 rule)', eng.fl12.fl === 0 && eng.fl12.total === 0, eng.fl12);
  check('qualiPoints FEQ: P1 on the grid gives 4 (+3 pole +1 FL +18 race = 26)', eng.quali.quali === 4 && eng.quali.total === 26 && eng.rules[1] === 'FEQ' && eng.rules[2] === '' && eng.qualiPast === 18, eng.quali);
  check('season totals 2019/20 are 72 / 62 / 35 / 33', eng.tot.EVA === 72 && eng.tot.CAS === 62 && eng.tot.BIR === 35 && eng.tot.ROW === 33 && eng.tot.WEH === 22 && eng.tot.DAC === 22, eng.tot);

  // (2) manufacturers on a hand-worked race
  const man = await page.evaluate(() => { const m = seasonData('2023/24').manus; return { totals: Object.fromEntries(m.map(x => [x.name, x.total])), r1: Object.fromEntries(m.map(x => [x.name, x.per['2324-R01']])), r2: Object.fromEntries(m.map(x => [x.name, x.per['2324-R02']])), none: seasonData('2019/20').manus, order: m.map(x => x.name) }; });
  check('race 1: third Jaguar-powered car (Envision) is dropped; Jaguar 43, Porsche 27, Nissan 10', man.r1.Jaguar === 43 && man.r1.Porsche === 27 && man.r1.Nissan === 10, man.r1);
  check('race 2 re-numbering: Porsche 40, Jaguar 30, Nissan 10', man.r2.Porsche === 40 && man.r2.Jaguar === 30 && man.r2.Nissan === 10, man.r2);
  check('season manufacturers 106 / 89 / 45, Jaguar champion', man.totals.Jaguar === 106 && man.totals.Porsche === 89 && man.totals.Nissan === 45 && man.order[0] === 'Jaguar', man.totals);
  check('no manufacturers before manufacturersFrom', man.none === null);
  const cur = await page.evaluate(() => ({ sel: document.getElementById('seasonSel').value, opts: [...document.getElementById('seasonSel').options].map(o => o.value) }));
  check('opens on the current season; seasons newest first', cur.sel === '2026/27' && cur.opts.join() === '2026/27,2023/24,2019/20', cur);

  // Races tab basics
  check('round strip has a chip per race, next race highlighted', (await page.$$eval('#strip .rchip', c => c.length)) === 3 && (await page.$$eval('#strip .rchip[data-next]', c => c.map(x => x.dataset.race))).join() === '2627-R01');
  check('three races, not run yet', (await page.$$eval('#raceList [data-id]', c => c.length)) === 3 && (await page.textContent('.rc[data-id="2627-R01"] .rc-msg')) === 'Not run yet');
  // folding: default state, per card, all, strip chip
  const ids = sel => page.$$eval(sel, c => c.map(x => x.dataset.id).join());
  check('default fold: the next race is open, the other two are one-line rows', (await ids('.rc')) === '2627-R01' && (await ids('.rc-mini')) === '2627-R02,2627-R03');
  const mini2 = (await page.textContent('.rc-mini[data-id="2627-R02"]')).replace(/\s+/g, ' ');
  check('one-line row shows RD, city and the status, with an Open button', /RD2/.test(mini2) && /Mexico City/.test(mini2) && /Not run yet/.test(mini2) && /Open/.test(mini2), mini2);
  check('Collapse all / Expand all sits above the list', (await page.textContent('#foldAll')) === 'Collapse all');
  await page.click('#foldAll');
  check('Collapse all folds every card and the button flips to Expand all', (await page.$$eval('.rc', c => c.length)) === 0 && (await page.$$eval('.rc-mini', c => c.length)) === 3 && (await page.textContent('#foldAll')) === 'Expand all');
  await page.click('#foldAll');
  check('Expand all opens every card again', (await page.$$eval('.rc', c => c.length)) === 3 && (await page.$$eval('.rc-mini', c => c.length)) === 0 && (await page.textContent('#foldAll')) === 'Collapse all');
  check('each open card has a Collapse button at the top', (await page.$$eval('.rc .rc-head [data-act="fold"]', c => c.map(x => x.textContent.trim()).join())) === 'Collapse ▴,Collapse ▴,Collapse ▴');
  await page.click('.rc[data-id="2627-R03"] [data-act="fold"]'); await page.click('.rc[data-id="2627-R02"] [data-act="fold"]');
  check('Collapse on one card folds just that card', (await ids('.rc')) === '2627-R01' && (await ids('.rc-mini')) === '2627-R02,2627-R03');
  await page.click('.rc-mini[data-id="2627-R03"] [data-act="fold"]');
  check('Open on a one-line row unfolds it', (await ids('.rc')) === '2627-R01,2627-R03');
  await page.click('.rc[data-id="2627-R03"] [data-act="fold"]');
  check('Details start collapsed and no entry controls are in the DOM', (await page.getAttribute('.rc[data-id="2627-R01"] [data-act="toggle"]', 'aria-expanded')) === 'false' && (await page.$$eval('.ent', e => e.length)) === 0);
  check('dates read 10 Dec 26', /10 Dec 26/.test(await page.textContent('.rc[data-id="2627-R01"] .rc-meta')));
  await page.click('#strip .rchip[data-race="2627-R02"]');
  check('tapping a chip unfolds and opens that card', (await page.getAttribute('.rc[data-id="2627-R02"] [data-act="toggle"]', 'aria-expanded')) === 'true' && (await ids('.rc-mini')) === '2627-R03');
  await page.click('.rc[data-id="2627-R02"] [data-act="toggle"]');

  // (3) tap entry: qualifying order, then race order
  const R = '.rc[data-id="2627-R01"]';
  await page.click(`${R} [data-act="toggle"]`);
  check('entry offers the eight drivers entered for round 1 (ROW yes, MUE not yet)', (await page.$$eval(`${R} .ur`, u => u.map(x => x.dataset.code))).sort().join() === 'BIR,CAS,DAC,EVA,NEW,ROW,WEH,ZED');
  // chip grouping, round 1: last season's final order (2023/24: EVA 58, WEH 47, BIR 45, ROW 43, CAS 42, DAC 33); no result last season -> last, by car number (NEW 7, ZED 12)
  const urOrder = () => page.$$eval(`${R} .ur`, u => u.map(x => x.dataset.code).join());
  const ordTexts = () => page.$$eval(`${R} .ur .dchip small`, u => u.map(x => x.textContent).join());
  check('round 1 chips follow last season\'s final standings, newcomers last by car number', (await urOrder()) === 'EVA,WEH,BIR,ROW,CAS,DAC,NEW,ZED', await urOrder());
  check('groups of six with small headers (Championship 1–6, then 7–8)', (await page.$$eval(`${R} .ent .grp`, g => g.map(x => x.textContent).join('|'))) === 'Championship 1–6|7–8');
  check('each chip shows flag, code and a 1st/2nd ordinal', (await ordTexts()) === '1st,2nd,3rd,4th,5th,6th,7th,8th' && /🇳🇿\s*EVA/.test(await page.textContent(`${R} .ur[data-code="EVA"] .dchip`)));
  check('the status quick buttons and a More button are still on each unplaced row', (await page.$$eval(`${R} .ur[data-code="DAC"] .sb`, b => b.length)) === 4 && (await page.isVisible(`${R} .ur[data-code="DAC"] [data-act="more"]`)));
  check('Save is disabled until something changes', await page.isDisabled(`${R} [data-act="save"]`));
  await page.click(`${R} [data-act="mode"][data-mode="quali"]`);
  for (const c of ['EVA', 'CAS', 'WEH', 'DAC', 'ROW', 'BIR']) await page.click(`${R} .chipb[data-code="${c}"]`);
  check('pole follows the first qualifier automatically', (await page.getAttribute(`${R} .pr[data-code="EVA"] [data-act="pole"]`, 'aria-pressed')) === 'true');
  await page.click(`${R} [data-act="mode"][data-mode="race"]`);
  for (const c of ['CAS', 'EVA', 'WEH', 'DAC', 'ROW']) await page.click(`${R} .ur[data-code="${c}"] [data-act="place"]`);
  check('placed chips dim (data-used) and stay in place', (await urOrder()) === 'EVA,WEH,BIR,ROW,CAS,DAC,NEW,ZED' && (await page.$$eval(`${R} .ur .dchip[data-used]`, u => u.length)) === 5 && (await page.$(`${R} .ur[data-code="NEW"] .dchip[data-used]`)) === null);
  await page.click(`${R} .ur[data-code="BIR"] [data-act="status"][data-status="DNF"]`);
  await page.click(`${R} .pr[data-code="CAS"] [data-act="fl"]`);
  const pv = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.rc[data-id="2627-R01"] .pr')].map(r => [r.dataset.code, r.querySelector('.pt').textContent])));
  check('live preview: CAS 25 race + 3 quali + 1 FL = 29, EVA 18 + 4 + 3 pole = 25, WEH 15 + 2 = 17', pv.CAS === '29 pts' && pv.EVA === '25 pts' && pv.WEH === '17 pts', pv);
  check('dirty card shows the save button enabled and the dot outside the fold', !(await page.isDisabled(`${R} [data-act="save"]`)) && (await page.getAttribute(R, 'data-dirty')) !== null);
  await page.click(`${R} [data-act="toggle"]`);
  check('folded card keeps the unsaved dot', await page.isVisible(`${R} .rc-toggle .udot`));
  await page.click(`${R} [data-act="toggle"]`);
  const mark1 = await page.evaluate(() => window.__CALLS.length);
  await page.click(`${R} [data-act="save"]`);
  await page.waitForFunction(() => !document.querySelector('.rc[data-id="2627-R01"]').hasAttribute('data-dirty') && /Results entered/.test(document.querySelector('.rc[data-id="2627-R01"] .rc-msg').textContent));
  const w1 = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] !== 'get_values'), mark1);
  check('first save is exactly one append_values call and nothing else', w1.length === 1 && w1[0][0] === 'append_values' && w1[0][1] === 'Results!A1', w1.map(c => c[0] + ' ' + c[1]));
  const rowsAdded = JSON.parse(w1[0][2]);
  const strip = r => r.map(v => typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);
  const byDrv = Object.fromEntries(rowsAdded.map(r => [strip(r)[3], strip(r)]));
  const want = { EVA: ['2627-R01-EVA', '2026/27', '2627-R01', 'EVA', 'Jaguar', 1, '', 2, '', 'Y', '', '', '', null, ''], CAS: ['2627-R01-CAS', '2026/27', '2627-R01', 'CAS', 'Jaguar', 2, '', 1, '', '', 'Y', '', '', null, ''],
    WEH: ['2627-R01-WEH', '2026/27', '2627-R01', 'WEH', 'Porsche', 3, '', 3, '', '', '', '', '', null, ''], DAC: ['2627-R01-DAC', '2026/27', '2627-R01', 'DAC', 'Porsche', 4, '', 4, '', '', '', '', '', null, ''],
    ROW: ['2627-R01-ROW', '2026/27', '2627-R01', 'ROW', 'Nissan', 5, '', 5, '', '', '', '', '', null, ''], BIR: ['2627-R01-BIR', '2026/27', '2627-R01', 'BIR', 'Envision', 6, '', '', 'DNF', '', '', '', '', null, ''] };
  const same = Object.entries(want).every(([d, w]) => byDrv[d] && w.every((v, i) => v === null ? /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(byDrv[d][i]) : byDrv[d][i] === v));
  check('six new rows in header order with team from Lineups, numbers as numbers, text as text', rowsAdded.length === 6 && same, byDrv.BIR);
  check('saving keeps cards where they were (R01 open, R02 open from the chip, R03 folded)', (await ids('.rc')) === '2627-R01,2627-R02' && (await ids('.rc-mini')) === '2627-R03');
  const podium = await page.$$eval(`${R} .pod .nm`, n => n.map(x => x.textContent));
  check('podium shows P2 left, P1 centre, P3 right', podium.join() === 'Mitch Evans,Nick Cassidy,Pascal Wehrlein', podium);
  check('pole and fastest lap line', /Pole: Mitch Evans/.test(await page.textContent(`${R} .rc-pf`)) && /Fastest lap: Nick Cassidy/.test(await page.textContent(`${R} .rc-pf`)));
  const cls = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.rc[data-id="2627-R01"] .t tbody tr')].map(r => [r.children[1].querySelector('.dn').lastChild.textContent.trim(), r.children[5].textContent])));
  check('classification shows points including bonuses (CAS 29)', cls['Nick Cassidy'] === '29' && cls['Mitch Evans'] === '25', cls);
  check('the card stays open after saving', (await page.getAttribute(`${R} [data-act="toggle"]`, 'aria-expanded')) === 'true');
  const rowOf = d => page.evaluate(d => window.__SHEET.Results.findIndex(r => r[0] === '2627-R01-' + d) + 1, d);

  // change one position -> only changed cells
  await page.click(`${R} .pr[data-code="ROW"] [data-act="rm"]`);
  const mark2 = await page.evaluate(() => window.__CALLS.length);
  await page.click(`${R} [data-act="save"]`);
  await page.waitForFunction(() => !document.querySelector('.rc[data-id="2627-R01"]').hasAttribute('data-dirty'));
  const w2 = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] !== 'get_values').map(c => c[0] + ' ' + c[1]), mark2);
  const rr = await rowOf('ROW');
  check('removing one driver writes only that finish cell plus updatedAt', JSON.stringify(w2.sort()) === JSON.stringify([`update_values Results!H${rr}`, `update_values Results!N${rr}`].sort()), w2);
  check('the finish cell is now blank and the row was not deleted', (await page.evaluate(r => window.__SHEET.Results[r - 1][7], rr)) === '' && (await page.evaluate(() => window.__SHEET.Results.filter(r => r[2] === '2627-R01').length)) === 6);
  // placing a DNF driver changes finish and status: one merged range
  await page.click(`${R} .ur[data-code="BIR"] [data-act="place"]`);
  const mark3 = await page.evaluate(() => window.__CALLS.length);
  await page.click(`${R} [data-act="save"]`);
  await page.waitForFunction(() => !document.querySelector('.rc[data-id="2627-R01"]').hasAttribute('data-dirty'));
  const w3 = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] !== 'get_values').map(c => c[0] + ' ' + c[1]), mark3);
  const br = await rowOf('BIR');
  check('contiguous changed cells (finish + status) go in one range', JSON.stringify(w3.sort()) === JSON.stringify([`update_values Results!H${br}:I${br}`, `update_values Results!N${br}`].sort()), w3);
  const allWrites = await page.evaluate(() => [...new Set(window.__CALLS.map(c => c[0]))].sort());
  check('only get_values, append_values and update_values were ever called (no deletes or clears)', allWrites.join() === 'append_values,get_values,update_values', allWrites);


  // round 2: chips follow the standings of the earlier rounds (CAS 29, EVA 25, WEH 17, DAC 14, BIR 11); MUE has no result yet so goes last by car number
  const R2 = '.rc[data-id="2627-R02"]';
  await page.click(`${R2} [data-act="toggle"]`);
  const ur2 = await page.$$eval(`${R2} .ur`, u => u.map(x => x.dataset.code).join());
  check('round 2 chips follow the championship so far; rookies without a result last by car number', ur2 === 'CAS,EVA,WEH,DAC,BIR,NEW,ZED,MUE', ur2);
  check('round 2 groups: Championship 1–6 then 7–8', (await page.$$eval(`${R2} .ent .grp`, g => g.map(x => x.textContent).join('|'))) === 'Championship 1–6|7–8');
  await page.click(`${R2} [data-act="mode"][data-mode="quali"]`);
  check('qualifying order uses the same grouped chips', (await page.$$eval(`${R2} .chips .dchip`, c => c.map(x => x.dataset.code).join())) === 'CAS,EVA,WEH,DAC,BIR,NEW,ZED,MUE' && (await page.$$eval(`${R2} .ent .grp`, g => g.length)) === 2);
  await page.click(`${R2} [data-act="mode"][data-mode="race"]`);
  await page.click(`${R2} [data-act="toggle"]`);

  // More panel: penalty, investigation, laps down, pit stops, out reason
  const rowIdx = d => page.evaluate(d => window.__SHEET.Results.findIndex(r => r[0] === '2627-R01-' + d) + 1, d);
  check('placed rows have a More button; the panel starts closed', (await page.isVisible(`${R} .pr[data-code="CAS"] [data-act="more"]`)) && (await page.$$eval(`${R} .panel`, p => p.length)) === 0);
  await page.click(`${R} .pr[data-code="CAS"] [data-act="more"]`);
  check('More opens a panel with penalty picks, investigation, laps down and pit stops', (await page.$$eval(`${R} .pr[data-code="CAS"] .panel [data-act="pen"]`, b => b.map(x => x.textContent).join())) === '+5s,+10s,Drive-through,Grid drop,Other' && (await page.$$eval(`${R} .pr[data-code="CAS"] .panel .step`, s => s.length)) === 2 && await page.isVisible(`${R} .pr[data-code="CAS"] .panel [data-act="inv"]`));
  await page.click(`${R} .pr[data-code="CAS"] [data-act="pen"][data-v="+5s"]`);
  await page.fill(`${R} .pr[data-code="CAS"] [data-in="penaltyNote"]`, 'track limits');
  check('typing a note keeps focus (no re-render)', await page.evaluate(() => document.activeElement && document.activeElement.dataset.in === 'penaltyNote'));
  await page.click(`${R} .pr[data-code="CAS"] [data-act="inv"]`);
  check('penalty and investigation tags show on the row at once, and Save lights up', /\+5s/.test(await page.textContent(`${R} .pr[data-code="CAS"] .rtg .tag.pen`)) && /track limits/.test(await page.textContent(`${R} .pr[data-code="CAS"] .rtg .why`)) && await page.isVisible(`${R} .pr[data-code="CAS"] .rtg .tag.inv`) && !(await page.isDisabled(`${R} [data-act="save"]`)) && (await page.getAttribute(R, 'data-dirty')) !== null);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="more"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="laps"][data-d="1"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="pits"][data-d="1"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="pits"][data-d="1"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="pits"][data-d="-1"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="pen"][data-v="Other"]`);
  await page.fill(`${R} .pr[data-code="DAC"] [data-in="penalty"]`, 'Stop-go');
  const dacSteps = await page.$$eval(`${R} .pr[data-code="DAC"] .step span`, s => s.map(x => x.textContent).join());   // laps down, pit stops
  check('steppers: laps down 1; pit stops + + - = 1; Other reveals a text field', dacSteps === '1,1' && /Stop-go/.test(await page.textContent(`${R} .pr[data-code="DAC"] .rtg`)) && /\+1 lap/.test(await page.textContent(`${R} .pr[data-code="DAC"] .rtg`)), dacSteps);
  await page.click(`${R} .pr[data-code="BIR"] [data-act="more"]`);
  const birPits = async () => page.textContent(`${R} .pr[data-code="BIR"] [data-fld="pits"] .step span`);
  const b0 = await birPits();
  await page.click(`${R} .pr[data-code="BIR"] [data-act="pits"][data-d="1"]`);
  const b1 = await birPits();
  await page.click(`${R} .pr[data-code="BIR"] [data-act="pits"][data-d="-1"]`);
  const b2 = await birPits();
  await page.click(`${R} .pr[data-code="BIR"] [data-act="pits"][data-d="-1"]`);
  const b3 = await birPits();
  await page.click(`${R} .pr[data-code="BIR"] [data-act="pits"][data-d="1"]`);
  check('pit stops: blank shows a dash, first + gives 1, back to 0 (a real value), then blank again', b0 === '–' && b1 === '1' && b2 === '0' && b3 === '–' && (await birPits()) === '1', [b0, b1, b2, b3]);
  // an unplaced driver who is out: ROW (status buttons stay on the row, and are repeated inside More)
  await page.click(`${R} .ur[data-code="ROW"] [data-act="more"]`);
  await page.click(`${R} .ur[data-code="ROW"] .panel [data-act="status"][data-status="DNF"]`);
  check('status picks are inside the panel for out drivers and the quick button on the row follows', (await page.getAttribute(`${R} .ur[data-code="ROW"] .sts [data-status="DNF"]`, 'aria-pressed')) === 'true' && (await page.$$eval(`${R} .ur[data-code="ROW"] .panel .picks .tb`, b => b.map(x => x.textContent).slice(0, 4).join())) === 'DNF,DNS,DSQ,NC');
  await page.click(`${R} .ur[data-code="ROW"] [data-act="reason"][data-v="Mechanical"]`);
  await page.fill(`${R} .ur[data-code="ROW"] [data-in="outNote"]`, 'lap 12');
  await page.click(`${R} .ur[data-code="ROW"] [data-act="pits"][data-d="1"]`);
  check('reason picks plus a short note are stored as "Mechanical · lap 12"', await page.evaluate(() => { const d = state.drafts['2627-R01']; return d.x.ROW.outReason === 'Mechanical · lap 12'; }) && /Mechanical · lap 12/.test(await page.textContent(`${R} .ur[data-code="ROW"] .rtg`)));
  await page.click(`${R} [data-act="toggle"]`);
  check('the unsaved dot shows on the folded Details toggle', await page.isVisible(`${R} .rc-toggle .udot`));
  await page.click(`${R} [data-act="toggle"]`);
  // Revert and Clear reset the new fields too
  await page.click(`${R} [data-act="clear"]`);
  const blankOnly = x => Object.values(x).every(v => JSON.stringify(v) === JSON.stringify({ penalty: '', penaltyNote: '', lapsDown: 0, pitStops: null, outReason: '', investigation: false }));
  check('Clear empties the new fields as well', (await page.evaluate(() => state.drafts['2627-R01'].x)).constructor === Object && blankOnly(await page.evaluate(() => state.drafts['2627-R01'].x)) && (await page.$$eval(`${R} .rtg`, t => t.every(x => x.textContent.trim() === ''))));
  await page.click(`${R} [data-act="revert"]`);
  check('Revert brings back what is saved: no pending changes', await page.isDisabled(`${R} [data-act="save"]`) && (await page.evaluate(() => JSON.stringify(state.drafts['2627-R01'].x.CAS))) === JSON.stringify({ penalty: '', penaltyNote: '', lapsDown: 0, pitStops: null, outReason: '', investigation: false }));
  // do it again for real and save
  const ensureMore = async row => { if (!(await page.$(`${R} ${row} .panel`))) await page.click(`${R} ${row} [data-act="more"]`); };
  await ensureMore('.pr[data-code="CAS"]'); await ensureMore('.pr[data-code="DAC"]'); await ensureMore('.pr[data-code="BIR"]'); await ensureMore('.ur[data-code="ROW"]');
  await page.click(`${R} .pr[data-code="CAS"] [data-act="pen"][data-v="+5s"]`);
  await page.fill(`${R} .pr[data-code="CAS"] [data-in="penaltyNote"]`, 'track limits');
  await page.click(`${R} .pr[data-code="CAS"] [data-act="inv"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="laps"][data-d="1"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="pits"][data-d="1"]`);
  await page.click(`${R} .pr[data-code="DAC"] [data-act="pen"][data-v="Other"]`);
  await page.fill(`${R} .pr[data-code="DAC"] [data-in="penalty"]`, 'Stop-go');
  await page.click(`${R} .pr[data-code="BIR"] [data-act="pits"][data-d="1"]`);
  await page.click(`${R} .ur[data-code="ROW"] .panel [data-act="status"][data-status="DNF"]`);
  await page.click(`${R} .ur[data-code="ROW"] [data-act="reason"][data-v="Mechanical"]`);
  await page.fill(`${R} .ur[data-code="ROW"] [data-in="outNote"]`, 'lap 12');
  await page.click(`${R} .ur[data-code="ROW"] [data-act="pits"][data-d="1"]`);
  const mark6 = await page.evaluate(() => window.__CALLS.length);
  await page.click(`${R} [data-act="save"]`);
  await page.waitForFunction(() => !document.querySelector('.rc[data-id="2627-R01"]').hasAttribute('data-dirty') && !document.querySelector('.rc[data-id="2627-R01"] [data-act="save"]').textContent.includes('Saving'));
  const w6 = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] !== 'get_values').map(c => c[0] + ' ' + c[1]), mark6);
  const [rCAS, rDAC, rBIR, rROW] = [await rowIdx('CAS'), await rowIdx('DAC'), await rowIdx('BIR'), await rowIdx('ROW')];
  const want6 = [`S${rCAS}:U${rCAS}`, `N${rCAS}`, `P${rDAC}:Q${rDAC}`, `S${rDAC}`, `N${rDAC}`, `Q${rBIR}`, `N${rBIR}`, `I${rROW}`, `Q${rROW}:R${rROW}`, `N${rROW}`].map(r => 'update_values Results!' + r);
  check('More-panel changes write only the changed cells, in the new columns (header names P–U), nothing else', JSON.stringify(w6.sort()) === JSON.stringify(want6.sort()), w6);
  const hdr = await page.evaluate(() => window.__SHEET.Results[0]);
  check('new columns sit at P to U by header name', ['lapsDown', 'pitStops', 'outReason', 'penalty', 'penaltyNote', 'investigation'].map(k => String.fromCharCode(65 + hdr.indexOf(k))).join('') === 'PQRSTU');
  const cell = (r, L) => page.evaluate(([r, L]) => window.__SHEET.Results[r - 1][L.charCodeAt(0) - 65], [r, L]);
  check('values and types: penalty text, note, Y; laps down and pit stops as numbers; reason text', (await cell(rCAS, 'S')) === '+5s' && (await cell(rCAS, 'T')) === 'track limits' && (await cell(rCAS, 'U')) === 'Y' && (await cell(rDAC, 'P')) === 1 && (await cell(rDAC, 'Q')) === 1 && (await cell(rDAC, 'S')) === 'Stop-go' && (await cell(rBIR, 'Q')) === 1 && (await cell(rROW, 'I')) === 'DNF' && (await cell(rROW, 'R')) === 'Mechanical · lap 12', [await cell(rDAC, 'P'), await cell(rBIR, 'Q')]);
  check('cells that were not touched stay blank (CAS has no laps down or pit stops)', !(await cell(rCAS, 'P')) && !(await cell(rCAS, 'Q')) && !(await cell(rCAS, 'R')));
  // investigation banner outside the fold, tags in the classification
  await page.click(`${R} [data-act="toggle"]`);
  check('Under investigation banner is visible with Details closed', (await page.getAttribute(`${R} [data-act="toggle"]`, 'aria-expanded')) === 'false' && /Under investigation: Cassidy\. The result may change\./.test(await page.textContent(`${R} div.inv`)) && await page.isVisible(`${R} div.inv`));
  await page.click(`${R} [data-act="toggle"]`);
  const tagsOf = d => page.evaluate(d => { const row = [...document.querySelectorAll('.rc[data-id="2627-R01"] .t tbody tr')].find(r => r.textContent.includes(d)); return row ? row.querySelector('.tg') ? row.querySelector('.tg').innerHTML : '' : null; }, d);
  const tCAS = await tagsOf('Nick Cassidy'), tDAC = await tagsOf('Antonio'), tROW = await tagsOf('Oliver Rowland');
  check('classification tags: penalty + note, under investigation, +1 lap, DNF + reason', /tag pen">\+5s/.test(tCAS) && /why">track limits/.test(tCAS) && /tag inv">Under investigation/.test(tCAS) && /tag lap">\+1 lap</.test(tDAC) && /tag pen">Stop-go/.test(tDAC) && /tag out">DNF/.test(tROW) && /why">Mechanical · lap 12/.test(tROW), [tCAS, tDAC, tROW]);
  const pits = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.rc[data-id="2627-R01"] .t tbody tr')].map(r => [r.children[1].textContent.slice(0, 12), r.children[4].textContent])));
  check('classification has a Pits column', (await page.$$eval(`${R} .t thead th`, h => h.map(x => x.textContent).join())) === 'Pos,Driver,Team,Quali,Pits,Pts' && Object.values(pits).filter(v => v === '1').length === 3, pits);
  await page.click(`${R} [data-act="fold"]`);
  const miniR1 = (await page.textContent('.rc-mini[data-id="2627-R01"]')).replace(/\s+/g, ' ');
  check('folded one-liner: winner surname and team, and the orange ! for an investigation', /🏆 Cassidy · Jaguar/.test(miniR1) && /!/.test(await page.textContent('.rc-mini[data-id="2627-R01"] .tag.inv')), miniR1);
  await page.click('.rc-mini[data-id="2627-R01"] [data-act="fold"]');
  check('Open brings the card back with Details still open', (await page.getAttribute(`${R} [data-act="toggle"]`, 'aria-expanded')) === 'true');

  // edit race dialog
  await page.click('.rc-mini[data-id="2627-R03"] [data-act="fold"]');
  const RR = '.rc[data-id="2627-R03"]';
  await page.click(`${RR} [data-act="edit"]`);
  await page.fill('#rdDate', '2027-01-30'); await page.fill('#rdCity', 'Jakarta'); await page.fill('#rdCircuit', 'Ancol'); await page.fill('#rdName', 'Jakarta E-Prix');
  const mark4 = await page.evaluate(() => window.__CALLS.length);
  await page.click('#rdSave');
  await page.waitForFunction(() => !document.getElementById('rdDlg').open);
  const w4 = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] !== 'get_values').map(c => c[0] + ' ' + c[1]), mark4);
  const rrow = await page.evaluate(() => window.__SHEET.Races.findIndex(r => r[0] === '2627-R03') + 1);
  check('edit race writes only the changed cells (date; city+circuit+name merged)', JSON.stringify(w4.sort()) === JSON.stringify([`update_values Races!D${rrow}`, `update_values Races!G${rrow}:I${rrow}`].sort()), w4);
  check('card shows the new race details', /30 Jan 27/.test(await page.textContent(`${RR} .rc-meta`)) && /Jakarta/.test(await page.textContent(`${RR} h2`)));
  await page.click('#addRaceBtn'); await page.fill('#rdCity', 'Berlin'); await page.fill('#rdName', 'Berlin E-Prix'); await page.fill('#rdDate', '2027-05-15');
  const mark5 = await page.evaluate(() => window.__CALLS.length);
  await page.click('#rdSave');
  await page.waitForFunction(() => !document.getElementById('rdDlg').open);
  const w5 = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] !== 'get_values'), mark5);
  check('add race appends one row with the next id 2627-R04', w5.length === 1 && w5[0][0] === 'append_values' && JSON.parse(w5[0][2])[0][0] === "'2627-R04" && (await page.$$eval('#raceList [data-id]', c => c.length)) === 4 && (await page.$$eval('.rc[data-id="2627-R04"]', c => c.length)) === 1);

  // (6a) overflow on every tab at three widths, current season
  await page.click(`${R} .pr[data-code="EVA"] [data-act="up"]`).catch(() => {});
  const sizes = [[360, 740], [390, 844], [1280, 900]];
  const grab = async (label, w) => { await page.screenshot({ path: path.join(__dirname, `race-${label}-${w}.png`), fullPage: true }); };
  const stepList = [
    ['races', async () => { await page.click('#tab-races'); }],
    ['standings-drivers', async () => { await page.click('#tab-standings'); await page.click('[data-st="drivers"]'); }],
    ['standings-teams', async () => { await page.click('[data-st="teams"]'); }],
    ['stats-drivers', async () => { await page.click('#tab-stats'); await page.click('[data-sw="drivers"]'); }],
    ['stats-teams', async () => { await page.click('[data-sw="teams"]'); }],
    ['history', async () => { await page.click('#tab-history'); }]
  ];
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    for (const [name, go] of stepList) { await go(); await page.waitForTimeout(80); check(`no sideways scroll: ${name} @${w}`, (await overflow(page)) <= 0, await overflow(page)); await grab(name, w); }
  }

  // folded list (one-liners) at three widths
  await page.click('#tab-races');
  if ((await page.textContent('#foldAll')) === 'Collapse all') await page.click('#foldAll');
  for (const [w, h] of sizes) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(80); check(`no sideways scroll: races folded @${w}`, (await overflow(page)) <= 0, await overflow(page)); await grab('races-folded', w); }
  await page.click('#foldAll');
  check('Expand all brings every card back (cards stay as they were)', (await page.$$eval('.rc', c => c.length)) === 4);

  // past season: standings, manufacturers, grid cells
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.selectOption('#seasonSel', '2023/24');
  await page.click('#tab-races');
  check('past season shows the read-only chip', await page.isVisible('#roChip'));
  check('a past season starts fully folded (there is no next race)', (await page.$$eval('.rc', c => c.length)) === 0 && (await page.$$eval('.rc-mini', c => c.length)) === 3 && (await page.textContent('#foldAll')) === 'Expand all');
  check('past one-liners show the winner, and the investigation !', /Evans/.test(await page.textContent('.rc-mini[data-id="2324-R01"]')) && /!/.test(await page.textContent('.rc-mini[data-id="2324-R03"] .tag.inv')));
  await page.click('#foldAll');
  await page.click('.rc[data-id="2324-R01"] [data-act="toggle"]');
  // (4) no edit/save/entry controls on a past season
  check('past season has no Edit race / Save / entry controls or Add race', (await page.$$eval('[data-act="edit"], [data-act="save"], .ent, [data-act="place"]', e => e.length)) === 0 && !(await page.isVisible('#addRaceBtn')));
  check('past season still shows the podium and classification', (await page.$$eval('.rc[data-id="2324-R01"] .pod', p => p.length)) === 3 && (await page.$$eval('.rc[data-id="2324-R01"] .t tbody tr', p => p.length)) === 6);
  await page.click('#tab-standings'); await page.click('[data-st="drivers"]');
  const grid = await page.evaluate(() => {
    const row = c => document.querySelector(`#stGrid tr[data-drv="${c}"]`), cell = (c, i) => row(c).querySelectorAll('td')[i + 1].firstElementChild;
    return { order: [...document.querySelectorAll('#stGrid tbody tr')].map(r => r.dataset.drv).join(), c1: cell('EVA', 0).className, c3: cell('BIR', 0).className, c4: cell('WEH', 0).className, pole: !!cell('EVA', 0).querySelector('.bp'), fl: !!cell('CAS', 0).querySelector('.bf'), stickyPos: getComputedStyle(row('EVA').querySelector('td')).position, cols: document.querySelectorAll('#stGrid thead th').length };
  });
  check('drivers grid: EVA champion first, gold/bronze/green cells, P and FL badges, sticky left column', grid.order.startsWith('EVA,') && /c1/.test(grid.c1) && /c3/.test(grid.c3) && /cp/.test(grid.c4) && grid.pole && grid.fl && grid.stickyPos === 'sticky' && grid.cols === 4, grid);
  await page.click('[data-sv="pts"]');
  check('points view shows 28 for EVA race 1 (25 + pole 3)', (await page.$eval('#stGrid tr[data-drv="EVA"] td:nth-child(2)', t => t.textContent.replace(/[PFL]+$/, ''))) === '28');
  await page.click('[data-sv="pos"]');
  check('Manufacturers sub-tab exists for 2023/24', await page.isVisible('[data-st="manu"]'));
  await page.click('[data-st="manu"]');
  check('manufacturers grid lists Jaguar first with 106', /Jaguar/.test(await page.textContent('#stGrid tbody tr:first-child')) && /106/.test(await page.textContent('#stGrid tbody tr:first-child')));
  await page.click('[data-st="teams"]');
  check('teams grid: Jaguar 100 first', /Jaguar/.test(await page.textContent('#stGrid tbody tr:first-child')) && /100/.test(await page.textContent('#stGrid tbody tr:first-child .tot')));
  await page.selectOption('#seasonSel', '2019/20');
  check('Manufacturers sub-tab hidden before 2023/24', (await page.$$eval('[data-st="manu"]', e => e.length)) === 0);
  await page.click('[data-st="drivers"]');
  check('DSQ shows as text with the red tint', /DSQ/.test(await page.textContent('#stGrid tr[data-drv="WEH"] td:nth-child(2)')) && /cx/.test(await page.$eval('#stGrid tr[data-drv="WEH"] td:nth-child(2) .cell', c => c.className)));
  await page.selectOption('#seasonSel', '2023/24'); await page.click('#tab-standings');
  await page.click('[data-st="manu"]');
  for (const [w, h] of sizes) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(60); check(`no sideways scroll: standings-manufacturers (2023/24) @${w}`, (await overflow(page)) <= 0); await grab('standings-manu', w);
    await page.click('[data-st="drivers"]'); check(`no sideways scroll: standings-drivers (2023/24) @${w}`, (await overflow(page)) <= 0); await grab('standings-drivers-past', w); await page.click('[data-st="manu"]'); }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.click('#tab-races');
  await page.click('.rc[data-id="2324-R02"] [data-act="toggle"]');
  check('no sideways scroll: past races with Details open @360', (await overflow(page)) <= 0);
  await grab('races-past', 360);
  await page.setViewportSize({ width: 1280, height: 900 });

  // ---------- Compare tab ----------
  await page.setViewportSize({ width: 360, height: 740 });
  const tabBox = await page.$$eval('.tab', ts => ts.map(t => { const r = t.getBoundingClientRect(); return { txt: t.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right), cut: t.scrollWidth > t.clientWidth + 1 }; }));
  check('tabs read Races, Standings, Stats, Compare, History', tabBox.map(t => t.txt).join() === 'Races,Standings,Stats,Compare,History');
  check('the tab bar fits at 360: no label cut off, nothing sideways', tabBox.every(t => !t.cut && t.l >= 0 && t.r <= 360) && (await overflow(page)) <= 0, tabBox);
  await page.setViewportSize({ width: 390, height: 844 });
  check('the tab bar fits at 390 too', (await page.$$eval('.tab', ts => ts.every(t => t.scrollWidth <= t.clientWidth + 1 && t.getBoundingClientRect().right <= 390))));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click('#tab-compare');
  check('Compare season starts on the header season', (await page.inputValue('#cSeason')) === '2023/24' && (await page.$$eval('[data-cw]', b => b.map(x => x.textContent).join())) === 'Drivers,Teams,Manufacturers,Races');
  await page.selectOption('#cSeason', '2019/20');
  const picksNow = () => page.evaluate(() => state.cmp.picks[state.cmp.who].join());
  check('drivers: defaults to the top two of the championship (EVA, CAS)', (await picksNow()) === 'EVA,CAS' && (await page.$$eval('#cPick .pchip', c => c.map(x => x.dataset.pick).join())).startsWith('EVA,CAS,'));
  const rowCells = row => page.$$eval(`table[data-cmp="stats"] tr[data-row="${row}"] td`, t => t.map(x => x.textContent + (x.classList.contains('best') ? '*' : '')).join('|'));
  check('stat table: EVA v CAS, best values highlighted in lime (ties are not)', (await rowCells('S')) === 'Starts|3|3' && (await rowCells('W')) === 'Wins|2*|1' && (await rowCells('P')) === 'Podiums|3|3' && (await rowCells('PP')) === 'Poles|1*|0' && (await rowCells('FL')) === 'Fastest laps|1*|0'
    && (await rowCells('PTS')) === 'Points|72*|62' && (await rowCells('avgFin')) === 'Avg finish|1.3*|1.7' && (await rowCells('avgQ')) === 'Avg quali|–|–' && (await rowCells('best')) === 'Best finish|P1|P1', [await rowCells('W'), await rowCells('avgFin')]);
  const h = k => page.textContent(`[data-h="${k}"]`);
  check('head to head, hand-worked: EVA ahead in 2 of 3, CAS in 1; points 72 v 62', (await h('Finished ahead-a')) === '2' && (await h('Finished ahead-b')) === '1' && (await h('Points in those races-a')) === '72' && (await h('Points in those races-b')) === '62' && /3 races where both started/.test(await page.textContent('[data-h2h-note]')));
  check('head to head says so when no qualifying positions were entered', /No qualifying positions entered/.test(await page.textContent('[data-cmp="h2h"]')));
  const ch = await page.evaluate(() => { const p = [...document.querySelectorAll('#cChart svg path.ln')], hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return { n: p.length, stroke: p.map(x => x.getAttribute('stroke')), lum: p.map(x => { const c = hex(x.getAttribute('stroke')); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }), labels: [...document.querySelectorAll('#cChart svg text')].map(t => t.textContent).join(' '), vb: document.querySelector('#cChart svg').getAttribute('viewBox') }; });
  check('points chart: one line per pick, in different, visible colours', ch.n === 2 && ch.stroke[0] !== ch.stroke[1] && ch.lum.every(l => l > 0.35), ch);
  check('chart has round numbers on the x axis, points on the y axis and a legend', /\b1\b.*\b2\b.*\b3\b/.test(ch.labels) && /\b60\b/.test(ch.labels) && (await page.$$eval('.clegend span', s => s.length)) === 2);
  await page.hover('#cChart .hit');
  check('hover shows round and points for each pick', await page.isVisible('#cChart .ctip') && /Round \d/.test(await page.textContent('#cChart .ctip')) && /Evans/.test(await page.textContent('#cChart .ctip')) && /Cassidy/.test(await page.textContent('#cChart .ctip')));
  await page.click('#cPick [data-pick="BIR"]');
  check('a third pick adds a column and a line; head to head needs exactly two', (await page.$$eval('table[data-cmp="stats"] thead th', t => t.length)) === 4 && (await page.$$eval('#cChart svg path.ln', p => p.length)) === 3 && (await page.$$eval('[data-cmp="h2h"]', e => e.length)) === 0);
  await page.click('#cPick [data-pick="WEH"]');
  check('four is the limit: other chips switch off', (await page.$$eval('#cPick .pchip:disabled', c => c.length)) >= 1 && (await page.$$eval('#cChart svg path.ln', p => p.length)) === 4);
  await page.click('#cPick [data-pick="WEH"]'); await page.click('#cPick [data-pick="BIR"]');
  for (const [w, h] of sizes) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150); check(`no sideways scroll: compare drivers @${w}`, (await overflow(page)) <= 0, await overflow(page)); await grab('compare-drivers', w); }
  const vbw = async () => +(await page.getAttribute('#cChart svg', 'viewBox')).split(' ')[2];
  await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(200); const vb360 = await vbw();
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(200); const vb1280 = await vbw();
  check('the chart scales to its container (viewBox follows the width; readable at 360)', vb360 <= 330 && vb1280 > 600, [vb360, vb1280]);
  // teams
  await page.click('[data-cw="teams"]');
  check('teams: Jaguar v Porsche by default; stat table and head to head on best-placed car', (await picksNow()) === 'Jaguar,Porsche' && (await rowCells('PTS')) === 'Points|134*|44' && (await h('Finished ahead-a')) === '3' && (await h('Finished ahead-b')) === '0', await picksNow());
  check('teams chart: one line per team', (await page.$$eval('#cChart svg path.ln', p => p.length)) === 2);
  for (const [w, hh] of sizes) { await page.setViewportSize({ width: w, height: hh }); await page.waitForTimeout(150); check(`no sideways scroll: compare teams @${w}`, (await overflow(page)) <= 0); await grab('compare-teams', w); }
  await page.setViewportSize({ width: 1280, height: 900 });
  // all-time
  await page.click('[data-cw="drivers"]');
  await page.selectOption('#cSeason', 'all');
  check('all-time drivers: table works, points chart is hidden', (await page.$$eval('table[data-cmp="stats"]', t => t.length)) === 1 && (await page.$$eval('#cChart', c => c.length)) === 0 && /one season at a time/.test(await page.textContent('#cBody')));
  await page.click('[data-cw="manus"]');
  check('manufacturers have no all-time option and fall back to a season', (await page.$$eval('#cSeason option[value="all"]', o => o.length)) === 0 && (await page.inputValue('#cSeason')) !== 'all');
  await page.selectOption('#cSeason', '2023/24');
  check('manufacturers 2023/24: Jaguar 106 v Porsche 89, one line each', (await picksNow()) === 'Jaguar,Porsche' && (await rowCells('PTS')) === 'Points|106*|89' && (await page.$$eval('#cChart svg path.ln', p => p.length)) === 2);
  for (const [w, hh] of sizes) { await page.setViewportSize({ width: w, height: hh }); await page.waitForTimeout(150); check(`no sideways scroll: compare manufacturers @${w}`, (await overflow(page)) <= 0); await grab('compare-manus', w); }
  await page.setViewportSize({ width: 1280, height: 900 });
  // races
  await page.click('[data-cw="races"]');
  check('races: defaults to the last two races of the season, side by side', (await picksNow()) === '2324-R02,2324-R03' && (await page.$$eval('table[data-cmp="races"] thead th', t => t.length)) === 3 && /Mexico City/.test(await page.textContent('table[data-cmp="races"] thead')) && /Monaco/.test(await page.textContent('table[data-cmp="races"] thead')));
  await page.click('#cPick [data-pick="2324-R01"]'); await page.click('#cPick [data-pick="2324-R02"]');
  const rv = async row => page.$$eval(`table[data-cmp="races"] tr[data-row="${row}"] td`, t => t.slice(1).map(x => x.innerText.replace(/\n/g, ' | ')).join(' || '));
  check('races table: podium, pole, fastest lap, classified', (await rv('Podium')) === '1. Evans | 2. Cassidy | 3. Bird || 1. Rowland | 2. Bird | 3. Cassidy' && (await rv('Pole')) === 'Evans || –' && (await rv('Fastest lap')) === 'Cassidy || –' && (await rv('Classified')) === '6 || 6', await rv('Podium'));
  check('races table: DNFs with reasons, penalties, laps down, pit stops, investigations', (await rv('DNFs')) === '0 || 1 | Guenther (Mechanical · lap 12)' && (await rv('Penalties')) === 'Evans +5s || –' && (await rv('Laps down')) === '0 || 1' && (await rv('Pit stops')) === '1 || 3' && (await rv('Investigations')) === '– || Rowland', [await rv('DNFs'), await rv('Pit stops')]);
  const gr = await page.evaluate(() => { const g = document.querySelector('[data-cmp="grid"]'), c = (d, i) => g.querySelector(`tr[data-drv="${d}"]`).querySelectorAll('td')[i + 1].firstElementChild; return { rows: g.querySelectorAll('tbody tr').length, ov: getComputedStyle(g).overflowX, sticky: getComputedStyle(g.querySelector('td.sticky')).position, rowland: c('ROW', 1).className, mue: c('MUE', 1).className + '|' + c('MUE', 1).textContent, evaPen: !!c('EVA', 0).querySelector('.bt'), dacL: c('DAC', 1).querySelector('.bl') && c('DAC', 1).querySelector('.bl').textContent }; });
  check('per-driver grid: 7 drivers, own scroll box, sticky driver column, medal and DNF colours, penalty and laps-down marks', gr.rows === 7 && gr.ov === 'auto' && gr.sticky === 'sticky' && /c1/.test(gr.rowland) && /cx\|DNF/.test(gr.mue) && gr.evaPen && gr.dacL === '+1L', gr);
  await page.selectOption('#cAdd', '1920-R01');
  check('a race from another season can be added (noted as basic data)', (await page.$$eval('table[data-cmp="races"] thead th', t => t.length)) === 4 && /2019\/20/.test(await page.textContent('#cPick [data-pick="1920-R01"]')) && /basic data/.test(await page.textContent('#cBody')));
  for (const [w, hh] of sizes) { await page.setViewportSize({ width: w, height: hh }); await page.waitForTimeout(100); check(`no sideways scroll: compare races @${w}`, (await overflow(page)) <= 0, await overflow(page)); await grab('compare-races', w); }
  await page.click('#cPick [data-pick="1920-R01"]');
  check('removing it again takes it off the table', (await page.$$eval('table[data-cmp="races"] thead th', t => t.length)) === 3);
  await page.setViewportSize({ width: 1280, height: 900 });

  // stats
  await page.click('#tab-stats'); await page.click('[data-sw="drivers"]');
  await page.selectOption('#sScope', 'all');
  const st = await page.evaluate(() => { const h = [...document.querySelectorAll('#sTable thead th')].map(x => x.textContent.replace(/[▼▲]/g, '').trim()); const r = [...document.querySelectorAll('#sTable tbody tr')].find(x => x.dataset.open === 'EVA'); return { h, eva: [...r.children].map(c => c.textContent.trim()) }; });
  check('driver stats columns S W P PP FL DNF Top 10 PTS C', st.h.join() === 'Driver,S,W,P,PP,FL,DNF,Top 10,PTS,C', st.h);
  // all-time includes the 2026/27 race entered earlier in this run (EVA 2nd, pole: 25 pts)
  check('EVA all-time: 7 starts, 3 wins, 6 podiums, 3 poles, 155 pts, 2 titles', st.eva[1] === '7' && st.eva[2] === '3' && st.eva[3] === '6' && st.eva[4] === '3' && st.eva[8] === '155' && st.eva[9] === '2', st.eva);
  await page.click('[data-sort="W"]');
  check('tapping a header sorts by it', (await page.getAttribute('[data-sort="W"]', 'title')) === 'Wins' && (await page.getAttribute('th[aria-sort="descending"]', 'aria-sort')) === 'descending' && (await page.$eval('#sTable tbody tr:first-child', r => r.dataset.open)) === 'EVA');
  await page.click('#sTable tr[data-open="EVA"]');
  check('driver profile lists season by season', await page.isVisible('#pDlg') && (await page.$$eval('#pBody tbody tr', r => r.length)) === 3 && /Mitch Evans/.test(await page.textContent('#pTitle')));
  check('driver profile shows penalties when any were entered (EVA: one)', /Penalties 1/.test(await page.textContent('#pBody [data-extras]')) && !/DNF reasons/.test(await page.textContent('#pBody [data-extras]')));
  await page.click('#pClose');
  await page.click('#sTable tr[data-open="MUE"]');
  check('driver profile shows DNF reasons (MUE: Mechanical 1)', /DNF reasons Mechanical 1/.test(await page.textContent('#pBody [data-extras]')) && !/Penalties/.test(await page.textContent('#pBody [data-extras]')));
  await page.click('#pClose');
  await page.click('#sTable tr[data-open="BIR"]');
  check('driver profile shows nothing extra when nothing was entered (BIR)', (await page.$$eval('#pBody [data-extras]', e => e.length)) === 0);
  await page.click('#pClose');
  await page.selectOption('#sScope', '2019/20');
  check('scope can be one season', (await page.$$eval('#sTable tbody tr', r => r.length)) === 6);
  await page.selectOption('#sScope', 'all');
  await page.click('[data-sw="teams"]');
  const tl = await page.evaluate(() => [...document.querySelectorAll('#sTable tbody tr')].map(r => r.dataset.open + ':' + r.children[1].textContent));
  check('teams by lineage: Virgin and Envision are one line (3 seasons)', tl.includes('Envision:3') && !tl.includes('Virgin:1'), tl);
  await page.click('[data-sg="name"]');
  const tn = await page.evaluate(() => [...document.querySelectorAll('#sTable tbody tr')].map(r => r.dataset.open));
  check('teams by name keeps Virgin separate', tn.includes('Virgin') && tn.includes('Envision'), tn);
  await page.click('[data-sg="lineage"]');
  await page.click('#sTable tr[data-open="Envision"]');
  const prof = await page.textContent('#pBody');
  check('team profile lists previous names (Virgin) and entrants from Lineups notes', /Virgin/.test(prof) && /Envision Virgin Racing/.test(prof) && /Envision Racing/.test(prof) && /Jaguar I-TYPE/.test(prof) === false && /Sam Bird/.test(prof), prof.slice(0, 400));
  await page.click('#pClose');
  await page.click('#sTable tr[data-open="Nissan"]');
  check('team profile shows DNF reasons across seasons (Nissan: Mechanical 2)', /DNF reasons Mechanical 2/.test(await page.textContent('#pBody [data-extras]')));
  await page.click('#pClose');
  await page.click('#sTable tr[data-open="Jaguar"]');
  check('team profile shows penalties (Jaguar: 2)', /Penalties 2/.test(await page.textContent('#pBody [data-extras]')));
  await page.click('#pClose');

  // history
  await page.click('#tab-history');
  const hist = await page.$$eval('#hGrid .hc', c => c.map(x => x.dataset.season + '|' + x.textContent.replace(/\s+/g, ' ')));
  check('history: completed seasons newest first with champions', hist.length === 2 && hist[0].startsWith('2023/24') && /Mitch Evans/.test(hist[0]) && /Jaguar/.test(hist[0]) && /Manufacturers Jaguar · 106/.test(hist[0]) && hist[1].startsWith('2019/20'), hist);
  check('history footnote about original season tabs', /original season tabs stay in the sheet untouched/.test(await page.textContent('#p-history')));
  await page.click('#hGrid .hc[data-season="2019/20"]');
  check('tapping a season opens its standings', (await page.inputValue('#seasonSel')) === '2019/20' && (await page.getAttribute('#tab-standings', 'aria-selected')) === 'true');
  check('tab and season are remembered in localStorage', await page.evaluate(() => localStorage.getItem('race_tab') === 'standings' && localStorage.getItem('race_season') === '2019/20'));

  // ---------- Paste results (R02, current season) ----------
  await page.selectOption('#seasonSel', '2026/27'); await page.click('#tab-races');
  const P2 = '.rc[data-id="2627-R02"]';
  await page.click(`${P2} [data-act="toggle"]`);
  await page.click(`${P2} [data-act="paste"]`);
  const block = ['1 Pascal Wehrlein Porsche 94 45:12.345 25', '2.\tCASSIDY\tJaguar\t37\t+1.2\t18', 'P3 EVA', 'Sam Bird', 'Wehrlen Porsche 13', 'DNF Da Costa', 'DSQ Guenther'].join('\n');
  await page.fill(`${P2} textarea[data-in="paste"]`, block);
  await page.click(`${P2} [data-act="pasteParse"]`);
  const pvl = await page.$$eval(`${P2} .pv li`, l => l.map(x => x.className + ':' + x.textContent.replace(/\s+/g, ' ').trim()));
  check('paste preview reads names, surnames, codes, tab rows, DNF and DSQ lines', pvl.length === 7 && /Pascal Wehrlein/.test(pvl[0]) && /Nick Cassidy/.test(pvl[1]) && /Mitch Evans/.test(pvl[2]) && /Sam Bird/.test(pvl[3]) && /DNF.*Antonio Felix da Costa/.test(pvl[5]) && /DSQ.*Maximilian Guenther/.test(pvl[6]), pvl);
  check('a typo\'d name is listed as "not matched" in red, with a driver dropdown', /^bad:.*not matched: Wehrlen Porsche/.test(pvl[4]) && (await page.$$eval(`${P2} .pv li.bad select`, s => s.length)) === 1);
  for (const [w, hh] of sizes) { await page.setViewportSize({ width: w, height: hh }); await page.waitForTimeout(100); check(`no sideways scroll: paste preview @${w}`, (await overflow(page)) <= 0, await overflow(page)); await grab('paste', w); }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.selectOption(`${P2} .pv li.bad select`, 'NEW');
  const pvl2 = await page.$$eval(`${P2} .pv li`, l => l.map(x => x.querySelector('.pn').textContent).join());
  check('fixing the line with the dropdown places that driver in order', pvl2 === '1,2,3,4,5,DNF,DSQ' && (await page.$$eval(`${P2} .pv li.bad`, l => l.length)) === 0);
  check('nothing is written to the sheet until Save', (await page.evaluate(() => window.__SHEET.Results.filter(r => r[2] === '2627-R02').length)) === 0);
  await page.click(`${P2} [data-act="pasteApply"]`);
  const placed2 = await page.$$eval(`${P2} .pr`, r => r.map(x => x.dataset.code).join());
  const st2 = await page.evaluate(() => Object.assign({}, state.drafts['2627-R02'].status));
  check('Apply sets the race order and the statuses (draft only)', placed2 === 'WEH,CAS,EVA,BIR,NEW' && st2.DAC === 'DNF' && st2.MUE === 'DSQ' && /Nothing is saved until you press Save/.test(await page.textContent(`${P2} [data-paste-msg]`)) && !(await page.isDisabled(`${P2} [data-act="save"]`)));
  // second paste: a line of codes with one unknown, left to be skipped; and qualifying mode
  await page.click(`${P2} [data-act="paste"]`);
  await page.fill(`${P2} textarea[data-in="paste"]`, 'WEH CAS EVA BIR NEW ZZZ');
  await page.click(`${P2} [data-act="pasteParse"]`);
  check('one line of codes: unknown code is shown as not matched, never dropped', /not matched: ZZZ/.test(await page.textContent(`${P2} .pv li.bad`)) && (await page.$$eval(`${P2} .pv li`, l => l.length)) === 6);
  await page.click(`${P2} [data-act="pasteApply"]`);
  check('a skipped line is reported, statuses already set are kept', /1 line skipped/.test(await page.textContent(`${P2} [data-paste-msg]`)) && (await page.$$eval(`${P2} .pr`, r => r.map(x => x.dataset.code).join())) === 'WEH,CAS,EVA,BIR,NEW' && (await page.evaluate(() => state.drafts['2627-R02'].status.DAC)) === 'DNF');
  await page.click(`${P2} [data-act="mode"][data-mode="quali"]`);
  await page.click(`${P2} [data-act="paste"]`);
  await page.fill(`${P2} textarea[data-in="paste"]`, 'EVA CAS WEH');
  await page.click(`${P2} [data-act="pasteParse"]`); await page.click(`${P2} [data-act="pasteApply"]`);
  check('in qualifying mode the paste sets the qualifying order (pole follows the first)', (await page.$$eval(`${P2} .pr`, r => r.map(x => x.dataset.code).join())) === 'EVA,CAS,WEH' && (await page.getAttribute(`${P2} .pr[data-code="EVA"] [data-act="pole"]`, 'aria-pressed')) === 'true');
  await page.click(`${P2} [data-act="mode"][data-mode="race"]`);
  const mark7 = await page.evaluate(() => window.__CALLS.length);
  await page.click(`${P2} [data-act="save"]`);
  await page.waitForFunction(() => !document.querySelector('.rc[data-id="2627-R02"]').hasAttribute('data-dirty'));
  const w7 = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] !== 'get_values'), mark7);
  const r2 = await page.evaluate(() => Object.fromEntries(window.__SHEET.Results.filter(r => r[2] === '2627-R02').map(r => [r[3], { q: r[5], f: r[7], s: r[8], pole: r[9] }])));
  check('Save after a paste is one append of seven rows with order, statuses and pole', w7.length === 1 && w7[0][0] === 'append_values' && JSON.parse(w7[0][2]).length === 7 && r2.WEH.f === 1 && r2.WEH.q === 3 && r2.NEW.f === 5 && r2.DAC.s === 'DNF' && r2.MUE.s === 'DSQ' && r2.EVA.pole === 'Y' && r2.EVA.q === 1, r2);
  check('the saved card shows Wehrlein on top of the podium', /Pascal Wehrlein/.test(await page.textContent(`${P2} .pod.p1`)));

  const real = errors.filter(e => !/ERR_|Failed to load resource|net::|fonts\.g|accounts\.google/i.test(e));
  check('no page errors', real.length === 0, real);
  const failed = checks.filter(c => !c[1]);
  console.log(failed.length ? 'FAILED: ' + failed.map(c => c[0]).join('; ') : `ALL ${checks.length} CHECKS PASSED`);
  await browser.close();
  if (failed.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
