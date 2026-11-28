// Headless test of the Big Bash League app (apps/cricket/index.html) against an in-memory fake of Supabase.
// Run: node tests/cricket.js   (prints PASS/FAIL lines, exits 1 on any failure)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const APP = fs.readFileSync(path.join(DIR, 'apps/cricket/index.html'), 'utf8');
const SEED_FILE = path.join(DIR, 'cricket/bbl-seed.json');
const SEED = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
const WRAPPED = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${APP}</body></html>`;
fs.writeFileSync(path.join(__dirname, 'cricket-test.html'), WRAPPED);

const BASE = 'https://jcm-book-library.github.io/sports-tracker/cricket/';
const SUPA = 'https://apeflgdzclpxiktaxyfk.supabase.co';
const UNIQUE = { teams: ['comp', 'code'], venues: ['name'], settings: ['key'], ladders: ['comp', 'season', 'team'], matches: ['id'] };
const COLS = {
  teams: 'comp code name short colour1 colour2 home_city logo active notes',
  venues: 'name city country notes',
  settings: 'key value note',
  ladders: 'comp season pos team pld w l t nr bp pts nrr notes',
  matches: 'id comp season match_no stage date start_time home away home_slot away_slot venue toss_winner toss_decision bat_first home_runs home_wkts home_balls away_runs away_wkts away_balls max_overs result super_over method player_of_match attendance status notes source cricsheet_id'
};
const DEFAULTS = { teams: { comp: 'BBL', active: true }, ladders: { comp: 'BBL' }, matches: { comp: 'BBL', stage: 'League', super_over: false } };

// ---------- fake Supabase ----------
class Store {
  constructor() { this.t = { teams: [], venues: [], settings: [], ladders: [], matches: [] }; this.n = 0; this.clock = Date.parse('2026-11-01T00:00:00Z'); this.calls = []; this.nonUniform = 0; this.bigBatch = 0; }
  stamp() { this.clock += 1000; return new Date(this.clock).toISOString(); }
  touch(id) { this.t.matches.find(r => r.id === id).updated_at = this.stamp(); }
  row(id) { return this.t.matches.find(r => r.id === id); }
  insert(table, body) {
    const cols = COLS[table].split(' '), keys = UNIQUE[table];
    const keyOf = r => keys.map(k => r[k]).join('|');
    let added = 0;
    for (const r of body) {
      for (const k of Object.keys(r)) if (!cols.includes(k)) throw new Error(`unknown column ${table}.${k}`);
      const full = { ...(DEFAULTS[table] || {}), ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) };
      for (const c of cols) if (!(c in full)) full[c] = null;
      for (const [k, v] of Object.entries(DEFAULTS[table] || {})) if (full[k] === null) full[k] = v;
      if (this.t[table].some(x => keyOf(x) === keyOf(full))) continue;
      this.t[table].push({ row_id: ++this.n, user_id: 'u1', ...full, updated_at: this.stamp() });
      added++;
    }
    return added;
  }
}
function filterRows(rows, sp) {
  let out = rows;
  for (const [k, v] of sp.entries()) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    const m = /^eq\.(.*)$/.exec(v); if (m) out = out.filter(r => String(r[k]) === m[1]);
  }
  return out;
}
function orderRows(rows, spec) {
  if (!spec) return rows;
  const parts = spec.split(',').map(p => { const [col, ...rest] = p.split('.'); return { col, desc: rest.includes('desc'), nullsFirst: rest.includes('nullsfirst'), nullsLast: rest.includes('nullslast') }; });
  return [...rows].sort((a, b) => { for (const p of parts) {
    const x = a[p.col], y = b[p.col];
    if (x == null || y == null) { if (x == y) continue; const nf = p.nullsFirst || (!p.nullsLast && p.desc); return (x == null) === nf ? -1 : 1; }
    if (x < y) return p.desc ? 1 : -1; if (x > y) return p.desc ? -1 : 1; } return 0; });
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
async function installRoutes(ctx, store) {
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'font/woff2', body: '' }));
  await ctx.route(BASE + '**', r => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith('/bbl-seed.json')) return r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(SEED_FILE) });
    return r.fulfill({ status: 200, contentType: 'text/html', body: WRAPPED });
  });
  await ctx.route(SUPA + '/auth/v1/**', async r => {
    store.calls.push({ kind: 'auth', method: r.request().method(), url: r.request().url() });
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    r.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ access_token: 'x.' + Buffer.from('{"email":"owner@example.com"}').toString('base64') + '.y', refresh_token: 'rt2', expires_in: 3600 }) });
  });
  await ctx.route(SUPA + '/rest/v1/**', async r => {
    const req = r.request(), method = req.method(), u = new URL(req.url()), table = u.pathname.replace('/rest/v1/', '');
    if (method === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const h = req.headers(), prefer = h.prefer || '';
    let body = null; try { body = req.postDataJSON(); } catch (e) {}
    store.calls.push({ kind: 'rest', method, table, url: req.url(), body, prefer, profile: h['accept-profile'], cprofile: h['content-profile'], auth: h.authorization });
    const send = (status, data) => r.fulfill({ status, headers: CORS, contentType: 'application/json', body: data === undefined ? '' : JSON.stringify(data) });
    if (!store.t[table]) return send(404, { message: 'no such table' });
    if (h['accept-profile'] !== 'cricket') return send(406, { message: 'wrong schema' });
    if (!h.authorization || !h.authorization.startsWith('Bearer ')) return send(401, { message: 'no token' });
    try {
      if (method === 'GET') {
        const rows = orderRows(filterRows(store.t[table], u.searchParams), u.searchParams.get('order'));
        const off = +(u.searchParams.get('offset') || 0), lim = +(u.searchParams.get('limit') || 1e9);
        return send(200, rows.slice(off, off + lim));
      }
      if (method === 'POST') {
        if (!Array.isArray(body)) return send(400, { message: 'expected array' });
        if (body.length > 200) store.bigBatch++;
        const k0 = Object.keys(body[0] || {}).sort().join(',');
        if (body.some(x => Object.keys(x).sort().join(',') !== k0)) store.nonUniform++;
        if (body.some(x => 'user_id' in x)) return send(400, { message: 'rows must not carry user_id' });
        const oc = u.searchParams.get('on_conflict');
        if (oc !== ['user_id', ...UNIQUE[table]].join(',').replace('user_id,team', 'user_id,team')) { /* checked loosely below */ }
        if (!/ignore-duplicates/.test(prefer)) return send(409, { message: 'duplicate' });
        store.insert(table, body); return send(201);
      }
      if (method === 'PATCH') {
        const rows = filterRows(store.t[table], u.searchParams);
        if (!u.searchParams.get('id')) return send(400, { message: 'PATCH needs an id filter' });
        rows.forEach(x => { Object.assign(x, body); x.updated_at = store.stamp(); });
        return /return=representation/.test(prefer) ? send(200, rows) : send(204);
      }
      if (method === 'DELETE') return send(403, { message: 'permission denied' });
    } catch (e) { return send(400, { message: String(e.message) }); }
    send(405, { message: 'method' });
  });
}
const session = { at: 'x.' + Buffer.from('{"email":"owner@example.com"}').toString('base64') + '.y', rt: 'rt1', exp: Date.now() + 10 * 24 * 3600 * 1000, email: 'owner@example.com' };

(async () => {
  let browser;
  try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }
  const results = [];
  const check = (name, ok, extra) => { results.push(!!ok); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (!ok && extra !== undefined ? ' ' + JSON.stringify(extra) : '')); };
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); }); };

  // ---- 1. signed out
  {
    const store = new Store(), ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }), page = await ctx.newPage(); watch(page);
    await installRoutes(ctx, store);
    await page.goto(BASE);
    await page.waitForSelector('#signCard:not([hidden])');
    const vis = await page.isVisible('#scEmail'), wrapHidden = !(await page.isVisible('.wrap'));
    check('1 signed out: sign-in card shows, app hidden', vis && wrapHidden);
    check('1 signed out: no data calls', store.calls.filter(c => c.kind === 'rest').length === 0, store.calls);
    await page.click('#scAlt');
    check('1 signed out: password form available', await page.isVisible('#scPw'));
    await ctx.close();
  }

  const store = new Store();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript(s => { try { localStorage.setItem('jcm-sb-session', JSON.stringify(s)); } catch (e) {} }, session);
  await installRoutes(ctx, store);
  const page = await ctx.newPage(); watch(page);
  const text = sel => page.locator(sel).first().innerText();
  const saved = id => page.waitForFunction(i => { const m = document.querySelector(`#fx-${i} [data-role=msg]`); return m && /^(Saved|Result saved)$/.test(m.textContent) && !document.querySelector(`#fx-${i}`).hasAttribute('data-dirty'); }, id);
  const fillInn = async (id, side, w, r, o) => { const k = side === 'home' ? 'h' : 'a'; await page.fill(`#fx-${id} [data-f=${k}w]`, w); await page.fill(`#fx-${id} [data-f=${k}r]`, r); await page.fill(`#fx-${id} [data-f=${k}o]`, o); };
  const openDetails = async id => { if ((await page.getAttribute(`#fx-${id} [data-act=toggle]`, 'aria-expanded')) !== 'true') await page.click(`#fx-${id} [data-act=toggle]`); };
  const patches = () => store.calls.filter(c => c.method === 'PATCH');
  const ladderRow = async code => page.$$eval(`#ladder tr[data-code="${code}"] td`, tds => tds.map(t => t.innerText.replace(/\s+/g, ' ').trim()));
  const tab = async t => { await page.click(`.tab[data-tab=${t}]`); await page.waitForSelector(`#view-${t}:not([hidden])`); };
  const season = async s => { await page.selectOption('#seasonSel', s); };

  // ---- 2. empty DB -> setup
  await page.goto(BASE);
  await page.waitForSelector('#setupBtn:visible');
  check('2 empty DB: shows the load-history panel', true);
  await page.click('#setupBtn');
  await page.waitForFunction(() => /Loaded|missing/.test(document.getElementById('setupMsg').textContent) && document.querySelector('#views') && !document.querySelector('#views').hidden, null, { timeout: 30000 });
  const counts = Object.fromEntries(Object.keys(store.t).map(k => [k, store.t[k].length]));
  const want = Object.fromEntries(Object.keys(store.t).map(k => [k, SEED[k].length]));
  check('2 setup: counts equal the seed', JSON.stringify(counts) === JSON.stringify(want) && counts.matches === 712 && counts.ladders === 120 && counts.teams === 8 && counts.venues === 23, { counts, want });
  check('2 setup: uniform keys, batches of 200 or fewer, no user_id sent', store.nonUniform === 0 && store.bigBatch === 0);
  const sets = store.calls.filter(c => c.method === 'POST');
  check('2 setup: ignore-duplicates + on_conflict on user_id', sets.length > 0 && sets.every(c => /ignore-duplicates/.test(c.prefer) && /on_conflict=user_id/.test(c.url)) && sets.some(c => /on_conflict=user_id%2Ccomp%2Cseason%2Cteam|on_conflict=user_id,comp,season,team/.test(c.url)));
  const msg = await text('#setupMsg');
  check('2 setup: summary message', /Loaded 712 matches, 120 ladder rows/.test(msg), msg);
  check('2 setup: data read with schema cricket', store.calls.filter(c => c.kind === 'rest').every(c => c.profile === 'cricket' || c.method === 'POST' || c.method === 'PATCH'));

  // ---- 3. opens on 2026/27
  await page.waitForSelector('.fx');
  check('3 opens on 2026/27 Matches', (await page.inputValue('#seasonSel')) === '2026/27' && (await page.getAttribute('.tab[data-tab=matches]', 'aria-selected')) === 'true');
  const nCards = await page.$$eval('.fx', e => e.length), nFinals = await page.$$eval('.fx[data-id$="-Q"],.fx[data-id$="-K"],.fx[data-id$="-C"],.fx[data-id$="-F"]', e => e.length);
  check('3 40 league cards + 4 finals', nCards === 44 && nFinals === 4, { nCards, nFinals });
  const first = await text('.fx');
  check('3 first card Renegades v Scorchers at Chennai', first.indexOf('Renegades') >= 0 && first.indexOf('Scorchers') > first.indexOf('Renegades') && /Chidambaram/.test(first) && /Sat 12 Dec 26/i.test(await text('.dh')), first);
  const qText = await text('#fx-BBL16-Q'), cText = await text('#fx-BBL16-C');
  check('3 finals show slot labels', /1st/.test(qText) && /2nd/.test(qText) && /Loser of Qualifier/.test(cText) && /Winner of Knockout/.test(cText) && /Qualifier/i.test(qText));
  check('3 Details start folded; fixture-edit/save buttons present', !(await page.isVisible('#fx-BBL16-01 [data-f=bat]')) && (await page.isVisible('#fx-BBL16-01 [data-act=save]')) && (await page.isVisible('#fx-BBL16-01 [data-act=edit]')));

  // ---- 4. enter a result
  await fillInn('BBL16-01', 'home', '6', '180', '20'); await fillInn('BBL16-01', 'away', '7', '175', '20');
  check('4 Details dot appears only when detail fields change', !(await page.isVisible('#fx-BBL16-01 [data-role=udot]')));
  await openDetails('BBL16-01');
  await page.selectOption('#fx-BBL16-01 [data-f=bat]', 'REN');
  await page.click('#fx-BBL16-01 [data-f=bat]'); // harmless
  check('4 live result line before saving', /Renegades won by 5 runs/.test(await text('#fx-BBL16-01 [data-role=rline]')));
  await page.click('#fx-BBL16-01 [data-act=save]'); await saved('BBL16-01');
  const p1 = patches().filter(c => /id=eq\.BBL16-01/.test(c.url));
  check('4 one PATCH, only changed columns', p1.length === 1 && JSON.stringify(Object.keys(p1[0].body).sort()) === JSON.stringify(['away_balls', 'away_runs', 'away_wkts', 'bat_first', 'home_balls', 'home_runs', 'home_wkts', 'result']), p1.map(c => c.body));
  check('4 PATCH values and return=representation', p1[0] && p1[0].body.result === 'home' && p1[0].body.home_runs === 180 && p1[0].body.home_wkts === 6 && p1[0].body.home_balls === 120 && p1[0].body.away_balls === 120 && /return=representation/.test(p1[0].prefer));
  check('4 card says Renegades won by 5 runs', /Renegades won by 5 runs/.test(await text('#fx-BBL16-01 [data-role=rline]')));
  check('4 Details stay open after saving', await page.isVisible('#fx-BBL16-01 [data-f=bat]'));

  // ---- 5. chase
  await fillInn('BBL16-02', 'home', '8', '150', '20'); await fillInn('BBL16-02', 'away', '4', '151', '18.4');
  await openDetails('BBL16-02'); await page.selectOption('#fx-BBL16-02 [data-f=bat]', 'HEA');
  await page.click('#fx-BBL16-02 [data-act=save]'); await saved('BBL16-02');
  const p2 = patches().filter(c => /id=eq\.BBL16-02/.test(c.url));
  check('5 chase: result away, away_balls 112', p2.length === 1 && p2[0].body.result === 'away' && p2[0].body.away_balls === 112 && p2[0].body.home_balls === 120, p2.map(c => c.body));
  check('5 card says Sixers won by 6 wickets', /Sixers won by 6 wickets/.test(await text('#fx-BBL16-02 [data-role=rline]')));
  check('5 stored row reads 18.4 back', (await page.inputValue('#fx-BBL16-02 [data-f=ao]')) === '18.4');
  await page.fill('#fx-BBL16-06 [data-f=ho]', '18.6');
  check('5 overs 18.6 is rejected (Save disabled, message shown)', (await page.isDisabled('#fx-BBL16-06 [data-act=save]')) && /overs must look like 18\.4/.test(await text('#fx-BBL16-06 [data-role=msg]')));
  await page.fill('#fx-BBL16-06 [data-f=ho]', '');
  await page.fill('#fx-BBL16-06 [data-f=hw]', '11');
  check('5 wickets above 10 are rejected', (await page.isDisabled('#fx-BBL16-06 [data-act=save]')) && /wickets must be 0 to 10/.test(await text('#fx-BBL16-06 [data-role=msg]')));
  await page.fill('#fx-BBL16-06 [data-f=hw]', '');
  check('5 clearing the fields turns Save off again', await page.isDisabled('#fx-BBL16-06 [data-act=save]'));
  await page.fill('#fx-BBL16-06 [data-f=hr]', '10'); await page.fill('#fx-BBL16-06 [data-f=hw]', '1'); await page.fill('#fx-BBL16-06 [data-f=ho]', '5');
  check('5 one innings alone cannot be saved as a result', (await page.isDisabled('#fx-BBL16-06 [data-act=save]')) && /both innings/.test(await text('#fx-BBL16-06 [data-role=msg]')));
  for (const f of ['hr', 'hw', 'ho']) await page.fill(`#fx-BBL16-06 [data-f=${f}]`, '');

  // ---- 6. NRR hand-worked
  // Game 1: REN 180 off 20.0 (9.000 an over) v SCO 175 off 20.0 (8.750): REN +0.250, SCO -0.250.
  // Game 2: HEA 150 off 20.0 (7.500) v SIX 151 off 18.4 (151 / 18.6667 = 8.0893): SIX +0.589, HEA -0.589.
  await tab('ladder');
  const exp6 = { SIX: ['2', '+0.589'], REN: ['2', '+0.250'], SCO: ['0', '-0.250'], HEA: ['0', '-0.589'], STR: ['0', '0.000'], THU: ['0', '0.000'] };
  let ok6 = true; const got6 = {};
  for (const [c, [pts, nrr]] of Object.entries(exp6)) { const r = await ladderRow(c); got6[c] = r; const n = r.length; if (r[n - 2] !== pts || r[n - 1] !== nrr) ok6 = false; }
  const order = await page.$$eval('#ladder tbody tr', r => r.map(x => x.dataset.code));
  check('6 NRR matches the hand-worked example', ok6, got6);
  check('6 ladder order: points, then wins, then NRR', order[0] === 'SIX' && order[1] === 'REN' && order[order.length - 1] === 'HEA' && order[order.length - 2] === 'SCO', order);
  check('6 top 4 marked Qualifier / Knockout', (await page.$$eval('#ladder tr.q', r => r.length)) === 4 && /Qualifier/i.test((await ladderRow('SIX')).join(' ')) && /Knockout/i.test((await ladderRow('STA')).join(' ')));
  check('6 finals bracket shown under the ladder', (await page.$$eval('.finals .tie', e => e.length)) === 4);

  // ---- 7. all-out rule
  await tab('matches');
  await fillInn('BBL16-03', 'home', '10', '100', '15'); await fillInn('BBL16-03', 'away', '2', '101', '12');
  await openDetails('BBL16-03'); await page.selectOption('#fx-BBL16-03 [data-f=bat]', 'THU');
  await page.click('#fx-BBL16-03 [data-act=save]'); await saved('BBL16-03');
  check('7 Strikers won by 8 wickets (chase)', /Strikers won by 8 wickets/.test(await text('#fx-BBL16-03 [data-role=rline]')));
  await tab('ladder');
  // THU all out in 15 overs counts as 20: THU 100/20 - 101/12 = -3.417; STR 101/12 - 100/20 = +3.417 (not +1.750).
  const str = await ladderRow('STR'), thu = await ladderRow('THU');
  check('7 all out counts the full 20 overs', str[str.length - 1] === '+3.417' && thu[thu.length - 1] === '-3.417', { str, thu });

  // ---- 8. no result
  await tab('matches');
  await page.selectOption('#fx-BBL16-04 [data-f=res]', 'nr');
  check('8 live line says No result', /No result/.test(await text('#fx-BBL16-04 [data-role=rline]')));
  await page.click('#fx-BBL16-04 [data-act=save]'); await saved('BBL16-04');
  const p4 = patches().filter(c => /id=eq\.BBL16-04/.test(c.url));
  check('8 PATCH sends only result nr', p4.length === 1 && JSON.stringify(p4[0].body) === '{"result":"nr"}', p4.map(c => c.body));
  await tab('ladder');
  const hur = await ladderRow('HUR'), hea = await ladderRow('HEA');
  // columns: pos, team, P, W, L, NR, Pts, NRR
  check('8 NR gives 1 point each and stays out of NRR', hur.slice(2).join(',') === '1,0,0,1,1,0.000' && hea.slice(2).join(',') === '2,0,1,1,1,-0.589', { hur, hea });

  // ---- 9. conflict
  await tab('matches');
  const before = patches().length;
  store.touch('BBL16-05');
  await page.selectOption('#fx-BBL16-05 [data-f=res]', 'nr');
  await page.click('#fx-BBL16-05 [data-act=save]');
  await page.waitForFunction(() => /changed somewhere else/.test(document.querySelector('#fx-BBL16-05 [data-role=msg]').textContent));
  check('9 conflict: friendly message, no PATCH', patches().length === before && /This match changed somewhere else\. Press Refresh\./.test(await text('#fx-BBL16-05 [data-role=msg]')));
  check('9 conflict: edit kept so nothing is lost', (await page.inputValue('#fx-BBL16-05 [data-f=res]')) === 'nr');
  await page.click('#refreshBtn');
  await page.waitForFunction(() => document.getElementById('statusText').textContent.startsWith('Live'));
  await page.selectOption('#fx-BBL16-05 [data-f=res]', 'nr');
  await page.click('#fx-BBL16-05 [data-act=save]'); await saved('BBL16-05');
  check('9 after Refresh the same edit saves', patches().length === before + 1);

  // ---- finals: resolved names written when saving a final
  {
    // fill the rest of the league quickly through the fake store (as if saved elsewhere), then Refresh
    const lg = store.t.matches.filter(r => r.season === '2026/27' && r.stage === 'League' && !r.result);
    const order8 = ['SCO', 'SIX', 'HUR', 'STA', 'HEA', 'STR', 'REN', 'THU'];
    lg.forEach((r, i) => { const hi = order8.indexOf(r.home), ai = order8.indexOf(r.away); r.result = hi < ai ? 'home' : 'away'; r.home_runs = 150; r.home_wkts = 6; r.home_balls = 120; r.away_runs = 140; r.away_wkts = 8; r.away_balls = 120; if (hi > ai) { r.home_runs = 140; r.away_runs = 150; } r.bat_first = r.home; r.updated_at = store.stamp(); });
    await page.click('#refreshBtn');
    await page.waitForFunction(() => document.getElementById('statusText').textContent.startsWith('Live'));
    const qNow = await text('#fx-BBL16-Q'), kNow = await text('#fx-BBL16-K');
    check('F finals show resolved team names once the league is done', !/1st|2nd/.test(qNow) && /Qualifier/i.test(qNow) && !/3rd|4th/.test(kNow), { qNow, kNow });
    const lad = await page.evaluate(() => ladderOf('2026/27').slice(0, 4).map(r => r.code));
    const qn = await text('#fx-BBL16-Q .fx-main');
    check('F qualifier is 1st v 2nd of the ladder', qn.indexOf(await page.evaluate(c => tn(c), lad[0])) >= 0 && qn.indexOf(await page.evaluate(c => tn(c), lad[1])) >= 0, { lad, qn });
    await fillInn('BBL16-Q', 'home', '5', '170', '20'); await fillInn('BBL16-Q', 'away', '8', '160', '20');
    await openDetails('BBL16-Q'); await page.selectOption('#fx-BBL16-Q [data-f=bat]', lad[0]);
    await page.click('#fx-BBL16-Q [data-act=save]'); await saved('BBL16-Q');
    const pq = patches().filter(c => /id=eq\.BBL16-Q$/.test(c.url));
    check('F saving a final writes home/away codes', pq.length === 1 && pq[0].body.home === lad[0] && pq[0].body.away === lad[1] && pq[0].body.result === 'home', pq.map(c => c.body));
    const cNow = await text('#fx-BBL16-C');
    check('F Challenger shows the Qualifier loser and Knockout slot', cNow.indexOf(await page.evaluate(c => tn(c), lad[1])) >= 0 && /Winner of Knockout/.test(cNow), cNow);
  }

  // ---- fixture edit
  await page.click('#fx-BBL16-07 [data-act=edit]');
  await page.fill('#fxTime', '19:45'); await page.fill('#fxVenue', 'Optus Stadium');
  const nb = patches().length;
  await page.click('#fxSave');
  await page.waitForFunction(() => !document.getElementById('fxDlg').open);
  const pf = patches().slice(nb);
  check('F edit fixture PATCHes only date/time/venue columns that changed', pf.length === 1 && JSON.stringify(Object.keys(pf[0].body).sort()) === '["start_time","venue"]', pf.map(c => c.body));
  check('F edit fixture shows on the card', /7:45pm/.test(await text('#fx-BBL16-07 .fx-info')) && /Optus Stadium/.test(await text('#fx-BBL16-07 .fx-info')));

  // ---- Super Over entry
  await fillInn('BBL16-08', 'home', '5', '160', '20'); await fillInn('BBL16-08', 'away', '7', '160', '20');
  check('S equal runs ask for the Super Over winner', await page.isVisible('#fx-BBL16-08 [data-f=sow]') && /Match tied/.test(await text('#fx-BBL16-08 [data-role=rline]')));
  await page.selectOption('#fx-BBL16-08 [data-f=sow]', 'away');
  check('S Super Over line', /won the Super Over/.test(await text('#fx-BBL16-08 [data-role=rline]')));
  await page.click('#fx-BBL16-08 [data-act=save]'); await saved('BBL16-08');
  const ps = patches().filter(c => /id=eq\.BBL16-08/.test(c.url));
  check('S Super Over saved as result away + super_over true', ps.length === 1 && ps[0].body.result === 'away' && ps[0].body.super_over === true, ps.map(c => c.body));

  // ---- Stats
  await tab('stats');
  const st = await text('#view-stats');
  check('S stats page renders tables', /Team records/.test(st) && /Highest totals/.test(st) && /Biggest wins by runs/.test(st) && /Toss winner won/.test(st));
  await page.click('#view-stats [data-all="1"]');
  const stAll = await text('#view-stats');
  check('S stats all seasons includes older games', /Highest totals/.test(stAll) && (await page.$$eval('#recTable tbody tr', r => r.length)) === 8);
  const pTotal = await page.$$eval('#recTable tbody tr td:nth-child(2)', c => c.reduce((a, x) => a + (+x.textContent), 0));
  check('S all-seasons records cover hundreds of games', pTotal > 1000, pTotal);
  await page.click('#view-stats [data-all="0"]');

  // ---- 10. past season
  await season('2025/26');
  await tab('matches');
  const noSave = await page.$$eval('#matchList [data-act=save], #matchList [data-act=edit], #matchList [data-f=hr]', e => e.length);
  check('10 past season is read-only (no Save/Edit/inputs)', noSave === 0 && (await page.$$eval('#matchList .fx', e => e.length)) === 44);
  check('10 past card shows score and result text', /Scorchers won by 6 wickets/.test(await text('#fx-BBL15-F')) && /4\/133/.test(await text('#fx-BBL15-F')), await text('#fx-BBL15-F'));
  await tab('ladder');
  const r1 = await page.$eval('#ladder tbody tr', r => r.innerText.replace(/\s+/g, ' '));
  check('10 past ladder is the official one: Scorchers 1st on 14', /Scorchers/.test(r1) && /\b14\b/.test(r1) && (await page.$eval('#ladderNote', e => e.textContent)) === 'Official final ladder', r1);
  await tab('history');
  const h25 = await page.$eval('[data-season="2025/26"] [data-k=champ]', e => e.textContent);
  const hru = await page.$eval('[data-season="2025/26"] [data-k=ru]', e => e.textContent);
  const hpr = await page.$eval('[data-season="2025/26"] [data-k=prem]', e => e.textContent);
  check('10 History: 2025/26 champion Perth Scorchers, runner-up Sydney Sixers, minor premier Scorchers', h25 === 'Perth Scorchers' && hru === 'Sydney Sixers' && hpr === 'Perth Scorchers', { h25, hru, hpr });
  check('10 History note about Cricsheet', /History from Cricsheet \(cricsheet\.org\) and Wikipedia/.test(await text('#view-history')));
  await page.click('[data-season="2024/25"]');
  check('10 tapping a season opens its Ladder', (await page.inputValue('#seasonSel')) === '2024/25' && (await page.getAttribute('.tab[data-tab=ladder]', 'aria-selected')) === 'true');

  // ---- 12. widths (before the final error/DELETE checks so everything is covered)
  await season('2026/27'); await tab('matches');
  await openDetails('BBL16-09'); await openDetails('BBL16-F');
  for (const w of [360, 390, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const t of ['matches', 'ladder', 'stats', 'history']) {
      await tab(t);
      const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, bw: document.body.scrollWidth }));
      check(`12 ${w}px ${t}: no sideways scroll`, dims.sw <= dims.iw && dims.bw <= dims.iw, dims);
      if (t === 'matches') await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(__dirname, `cricket-${w}-${t}.png`) });
    }
    // the same on a past-season matches page and with the sign-in card
    await season('2025/26'); await tab('matches');
    const d2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    check(`12 ${w}px past-season matches: no sideways scroll`, d2.sw <= d2.iw, d2);
    await season('2026/27');
  }
  await page.setViewportSize({ width: 390, height: 900 });

  // ---- 11. no DELETE, no errors
  const dels = store.calls.filter(c => c.method === 'DELETE');
  check('11 no DELETE requests ever', dels.length === 0, dels);
  check('11 no page or console errors', errors.length === 0, errors);

  await browser.close();
  const fails = results.filter(x => !x).length;
  console.log(`\n${results.length - fails} passed, ${fails} failed, ${results.length} checks`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
