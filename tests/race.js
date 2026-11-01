// Headless test of the Formula E (race shape) page with a stubbed window.claude and an in-memory sheet.
// Never touches a real Google Sheet. Run: node tests/race.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const pageHtml = fs.readFileSync(path.join(DIR, 'apps/race/index.html'), 'utf8');

/* ---------- seed sheet ---------- */
const RES_HEAD = ['id', 'season', 'raceId', 'driver', 'team', 'qualiPos', 'grid', 'finish', 'status', 'pole', 'fastestLap', 'pointsAdj', 'notes', 'updatedAt', 'groupFastest'];
const RACE_HEAD = ['id', 'season', 'round', 'date', 'country', 'flag', 'city', 'circuit', 'name', 'heat', 'status', 'notes'];
const drivers = [['EVA', 'Mitch Evans', '🇳🇿', 'New Zealand'], ['CAS', 'Nick Cassidy', '🇳🇿', 'New Zealand'], ['WEH', 'Pascal Wehrlein', '🇩🇪', 'Germany'],
  ['DAC', 'Antonio Felix da Costa', '🇵🇹', 'Portugal'], ['ROW', 'Oliver Rowland', '🇬🇧', 'United Kingdom'], ['BIR', 'Sam Bird', '🇬🇧', 'United Kingdom'], ['MUE', 'Maximilian Guenther', '🇩🇪', 'Germany']];
const teamOf = { 2324: { EVA: 'Jaguar', CAS: 'Jaguar', WEH: 'Porsche', DAC: 'Porsche', ROW: 'Nissan', BIR: 'Envision' }, 1920: { EVA: 'Jaguar', CAS: 'Jaguar', WEH: 'Porsche', DAC: 'Porsche', ROW: 'Nissan', BIR: 'Virgin' } };
const races = [];
const results = [];
function addRace(season, tag, n, date, flag, city, circuit, name) { races.push([`${tag}-R0${n}`, season, n, date, '', flag, city, circuit, name, '', '', '']); }
// res: [driver, finish, extras]   extras: {status, pole, fl, grp, adj}
function addResults(tag, season, n, list) {
  list.forEach(([d, fin, x = {}]) => results.push([`${tag}-R0${n}-${d}`, season, `${tag}-R0${n}`, d, teamOf[tag][d], '', '', fin, x.status || '', x.pole ? 'Y' : '', x.fl ? 'Y' : '', x.adj ?? '', '', '', x.grp ? 'Y' : '']));
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
addResults('2324', '2023/24', 1, [['EVA', 1, { pole: 1 }], ['CAS', 2, { fl: 1 }], ['BIR', 3], ['WEH', 4], ['DAC', 5], ['ROW', 6]]);
addResults('2324', '2023/24', 2, [['WEH', 1], ['EVA', 2], ['DAC', 3], ['BIR', 4], ['ROW', 5], ['CAS', 6]]);
addResults('2324', '2023/24', 3, [['ROW', 1], ['BIR', 2], ['CAS', 3], ['EVA', 4], ['WEH', 5], ['DAC', 6]]);

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
    ['2026/27', 'ROW', 'Nissan', 22, '', 1, ''], ['2026/27', 'MUE', 'Nissan', 22, 2, '', ''], ['2026/27', 'BIR', 'Envision', 4, '', '', 'Rounds 1,2,3; Entrant: Envision Racing · Jaguar I-TYPE 7'],
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
  check('three race cards, not run yet', (await page.$$eval('.rc', c => c.length)) === 3 && (await page.textContent('.rc[data-id="2627-R01"] .rc-msg')) === 'Not run yet');
  check('Details start collapsed and no entry controls are in the DOM', (await page.getAttribute('.rc[data-id="2627-R01"] [data-act="toggle"]', 'aria-expanded')) === 'false' && (await page.$$eval('.ent', e => e.length)) === 0);
  check('dates read 10 Dec 26', /10 Dec 26/.test(await page.textContent('.rc[data-id="2627-R01"] .rc-meta')));
  await page.click('#strip .rchip[data-race="2627-R02"]');
  check('tapping a chip opens that card', (await page.getAttribute('.rc[data-id="2627-R02"] [data-act="toggle"]', 'aria-expanded')) === 'true');
  await page.click('.rc[data-id="2627-R02"] [data-act="toggle"]');

  // (3) tap entry: qualifying order, then race order
  const R = '.rc[data-id="2627-R01"]';
  await page.click(`${R} [data-act="toggle"]`);
  check('entry offers the six drivers entered for round 1 (ROW yes, MUE not yet)', (await page.$$eval(`${R} .ur`, u => u.map(x => x.dataset.code))).sort().join() === 'BIR,CAS,DAC,EVA,ROW,WEH');
  check('Save is disabled until something changes', await page.isDisabled(`${R} [data-act="save"]`));
  await page.click(`${R} [data-act="mode"][data-mode="quali"]`);
  for (const c of ['EVA', 'CAS', 'WEH', 'DAC', 'ROW', 'BIR']) await page.click(`${R} .chipb[data-code="${c}"]`);
  check('pole follows the first qualifier automatically', (await page.getAttribute(`${R} .pr[data-code="EVA"] [data-act="pole"]`, 'aria-pressed')) === 'true');
  await page.click(`${R} [data-act="mode"][data-mode="race"]`);
  for (const c of ['CAS', 'EVA', 'WEH', 'DAC', 'ROW']) await page.click(`${R} .ur[data-code="${c}"] [data-act="place"]`);
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

  // edit race dialog
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
  check('add race appends one row with the next id 2627-R04', w5.length === 1 && w5[0][0] === 'append_values' && JSON.parse(w5[0][2])[0][0] === "'2627-R04" && (await page.$$eval('.rc', c => c.length)) === 4);

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

  // past season: standings, manufacturers, grid cells
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.selectOption('#seasonSel', '2023/24');
  await page.click('#tab-races');
  check('past season shows the read-only chip', await page.isVisible('#roChip'));
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

  // history
  await page.click('#tab-history');
  const hist = await page.$$eval('#hGrid .hc', c => c.map(x => x.dataset.season + '|' + x.textContent.replace(/\s+/g, ' ')));
  check('history: completed seasons newest first with champions', hist.length === 2 && hist[0].startsWith('2023/24') && /Mitch Evans/.test(hist[0]) && /Jaguar/.test(hist[0]) && /Manufacturers Jaguar · 106/.test(hist[0]) && hist[1].startsWith('2019/20'), hist);
  check('history footnote about original season tabs', /original season tabs stay in the sheet untouched/.test(await page.textContent('#p-history')));
  await page.click('#hGrid .hc[data-season="2019/20"]');
  check('tapping a season opens its standings', (await page.inputValue('#seasonSel')) === '2019/20' && (await page.getAttribute('#tab-standings', 'aria-selected')) === 'true');
  check('tab and season are remembered in localStorage', await page.evaluate(() => localStorage.getItem('race_tab') === 'standings' && localStorage.getItem('race_season') === '2019/20'));

  const real = errors.filter(e => !/ERR_|Failed to load resource|net::|fonts\.g|accounts\.google/i.test(e));
  check('no page errors', real.length === 0, real);
  const failed = checks.filter(c => !c[1]);
  console.log(failed.length ? 'FAILED: ' + failed.map(c => c[0]).join('; ') : `ALL ${checks.length} CHECKS PASSED`);
  await browser.close();
  if (failed.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
