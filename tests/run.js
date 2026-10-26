// Headless test of the Sports Tracker page with a stubbed window.claude and an in-memory sheet.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const page_html = fs.readFileSync(path.join(DIR, 'apps/team-match/index.html'), 'utf8');

const loc = off => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const seedRows = [];
// round 1: fully played, 3 weeks ago; round 2: unplayed, starting in 3 days
// half-time values (homeHT, awayHT): S1 comeback by the home side, S2 away led and drew, S3 + S5 level, S4 away led and won, S6 has none
const HT = [[0, 1], [0, 1], [0, 0], [0, 1], [0, 0], ['', '']];
[['SYD','WSW',2,1],['MCY','MVC',1,1],['AUC','WEL',3,0],['CCM','NEW',0,2],['ADE','PER',1,0],['BRI','MAC',2,2]].forEach(([h, a, hg, ag], i) =>
  seedRows.push(['S' + (i + 1), '2026/27', 1, 'Regular', loc(-21 + (i >> 1)), '19:35', h, a, hg, ag, 0, 0, '', 15000 + i * 1000, '', '', '', '', '', '', '', ...HT[i]]));
[['SYD','MCY'],['WSW','MVC'],['AUC','CCM'],['WEL','NEW'],['ADE','BRI'],['PER','MAC']].forEach(([h, a], i) =>
  seedRows.push(['S' + (i + 7), '2026/27', 2, 'Regular', loc(3 + (i >> 1)), '19:35', h, a, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']));
const stub = `
<script>
const SHEET = {
  'App Settings': [['key','value'],['competition','A-League Men'],['season','2026/27'],['pointsWin','3'],['pointsDraw','1'],['pointsLoss','0'],['regularRounds','28'],['tiebreakers','goalDiff,goalsFor,wins,h2hPoints,h2hGoalDiff'],['finalsTeams','6'],['logoFolder','FOLDER1']],
  'Teams': [['code','name','short','colour1','colour2','homeVenue','active','logo'],
    ['ADE','Adelaide United FC','Adelaide United FC','#D71920','#1B2A4A','Coopers Stadium','Y'],['AUC','Auckland FC','Auckland FC','#1E3A8A','#FFFFFF','Go Media Stadium','Y','Auckland.png'],
    ['BRI','Brisbane Roar FC','Brisbane Roar FC','#F26522','#1A1A1A','Suncorp Stadium','Y'],['CCM','Central Coast Mariners FC','Central Coast Mariners FC','#FFD100','#002B5C','Industree Group Stadium','Y'],
    ['MAC','Macarthur FC','Macarthur FC','#1A1A1A','#C5A253','Campbelltown Stadium','Y'],['MCY','Melbourne City FC','Melbourne City FC','#6CABDD','#1C2C5B','AAMI Park','Y'],
    ['MVC','Melbourne Victory','Melbourne Victory','#002A5C','#FFFFFF','AAMI Park','Y'],['NEW','Newcastle Jets FC','Newcastle Jets FC','#F2A900','#003A70','McDonald Jones Stadium','Y'],
    ['PER','Perth Glory FC','Perth Glory FC','#4B2A7B','#F37021','HBF Park','Y'],['SYD','Sydney FC','Sydney FC','#4B9CD3','#1C2C5B','Allianz Stadium','Y','Sydney FC.png'],
    ['WEL','Wellington Phoenix FC','Wellington Phoenix FC','#FFD700','#1A1A1A','Sky Stadium','Y'],['WSW','Western Sydney Wanderers FC','Western Sydney Wanderers FC','#C8102E','#1A1A1A','CommBank Stadium','Y']],
  'Venues': [['venue','city'],['Allianz Stadium','Sydney'],['AAMI Park','Melbourne']],
  'Matches': [['id','season','round','stage','date','kickoff','home','away','homeGoals','awayGoals','homeReds','awayReds','venue','attendance','extraTime','homePens','awayPens','notes','updatedAt','playedRound','status','homeHT','awayHT']],
  '2025/26': [[],['2025/26','','','','','','PTS','+/-','P','W','L','D','F','A'],['1','','Newcastle Jets','','','','48','17','26','15','8','3'],['2','','Adelaide United','','','','43','10','26','12','7','7']]
};
SHEET.Matches.push(...${JSON.stringify(seedRows)});
window.__SHEET = SHEET; window.__CALLS = [];
const col = s => s.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
function parse(range) {
  const m = range.match(/^'?(.+?)'?!([A-Z]+)(\\d+)(?::([A-Z]+)(\\d+))?$/);
  return { tab: m[1].replace(/''/g, "'"), c1: col(m[2]), r1: +m[3] - 1, c2: m[4] ? col(m[4]) : col(m[2]), r2: m[5] ? +m[5] - 1 : +m[3] - 1 };
}
// USER_ENTERED-ish: leading ' keeps text and is dropped
const store = v => typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
const shown = v => typeof v === 'number' && v >= 1000 ? v.toLocaleString('en-US') : String(v);
const mcp = {
  async callTool(server, tool, input) {
    window.__CALLS.push([tool, input.range || '', JSON.stringify(input.values || '')]);
    if (server === 'Google Drive') {
      if (tool === 'search_files') return { payload: { files: [{ id: 'F1', title: 'Sydney FC.png', modifiedTime: '2026-10-17T00:00:00Z' }, { id: 'F2', title: 'Auckland.png', modifiedTime: '2026-10-17T00:00:00Z' }] } };
      if (tool === 'download_file_content') return { payload: { content: 'iVBORw0KGgoAAAANSUhEUgAAAHgAAACMCAYAAAC3Z23dAAABWklEQVR4nO3RMQ0AIADAMJRw418FrkAGyejRf8nGnuvQNV4HYDAGY/CnDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7guAtqc5z7O4XhBgAAAABJRU5ErkJggg==', mimeType: 'image/png', id: input.fileId } };
    }
    await new Promise(r => setTimeout(r, 5));
    if (tool === 'get_spreadsheet') return { payload: { sheets: Object.keys(SHEET).map(title => ({ properties: { title } })) } };
    const p = parse(input.range), t = SHEET[p.tab];
    if (!t) throw { code: 'tool_error', message: 'Unable to parse range: ' + input.range };
    if (tool === 'get_values') {
      const out = [];
      for (let r = p.r1; r <= Math.min(p.r2, t.length - 1); r++) { const row = (t[r] || []).slice(p.c1, p.c2 + 1).map(v => v == null ? '' : shown(v)); while (row.length && row[row.length - 1] === '') row.pop(); out.push(row); }
      while (out.length && !out[out.length - 1].length) out.pop();
      return { payload: { range: input.range, values: out } };
    }
    if (tool === 'append_values') { input.values.forEach(v => t.push(v.map(store))); return { payload: { updates: { updatedRows: input.values.length } } }; }
    if (tool === 'update_values') {
      input.values.forEach((row, i) => { const r = p.r1 + i; t[r] = t[r] || []; row.forEach((v, j) => { t[r][p.c1 + j] = store(v); }); });
      return { payload: { updatedCells: 1 } };
    }
  }
};
// Chart.js comes from a CDN that is blocked in this sandbox: a recording stand-in lets the chart config code run and be checked.
window.__CHARTS = {};
window.addEventListener('DOMContentLoaded', () => { if (!window.Chart) window.Chart = class { constructor(el, cfg) { this.data = cfg.data; this.options = cfg.options; this.type = cfg.type; window.__CHARTS[el.id] = this; } update() {} static getChart(id) { return window.__CHARTS[id]; } }; });
window.claude = { use: async name => name === 'mcp' ? mcp : null };
</script>`;

const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${stub}</head><body>${page_html}</body></html>`;
fs.writeFileSync(path.join(__dirname, 'page.html'), doc);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, 'page.html'));
  await page.waitForFunction(() => document.getElementById('status').dataset.state === 'live', null, { timeout: 15000 });
  console.log('status:', await page.textContent('#statusText'));
  const checks = [];
  const check = (name, ok, extra) => { checks.push([name, !!ok]); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); };
  const ymd = off => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dmy = off => { const [y, m, d] = ymd(off).split('-'); return `${d}/${m}/${y}`; };

  // (1) opens on the round of the next unplayed game (round 1 is fully played, round 2 is upcoming)
  check('opens at round 2', await page.$eval('#roundSel', s => s.value) === '2', await page.$eval('#roundSel', s => s.options[s.selectedIndex].text));
  check('round 2 shows its 6 cards', await page.$$eval('.fx', e => e.length) === 6);
  // (2) mini ladder headers
  const heads = await page.$$eval('#miniLadder thead th', h => h.map(x => x.textContent.trim().toLowerCase()));
  check('mini ladder headers', JSON.stringify(heads) === JSON.stringify(['#', 'club', 'gd', 'pts', 'form']), heads);
  // (3) hover a fixture card -> exactly two ladder rows highlighted
  await page.hover('.fx:nth-child(2)');
  const hl = await page.$$eval('#miniLadder tr.hl', r => r.map(x => x.dataset.team));
  const want = await page.$eval('.fx:nth-child(2)', c => c.dataset.id);
  check('hover highlights two ladder rows', hl.length === 2, hl);
  await page.mouse.move(2, 2);
  check('hover off clears highlight', await page.$$eval('#miniLadder tr.hl', r => r.length) === 0);
  await page.focus('.fx:nth-child(3) input');
  check('focus highlights two rows', await page.$$eval('#miniLadder tr.hl', r => r.length) === 2);
  await page.evaluate(() => document.activeElement.blur());
  await page.mouse.move(2, 2);

  // paste round 1 (6 games) + one bad line first to check validation
  await page.click('#pasteBtn');
  await page.fill('#pRound', '3');
  await page.fill('#pText', `${ymd(10)}, 19:35, SYD, WSW\n${dmy(11)}, 17:00, Melbourne City FC, Melbourne Victory\n${ymd(11)}, 19:35, AUC, WEL\n${ymd(12)}, 15:00, CCM, NEW\n${ymd(12)}, 17:30, ADE, PER\n${ymd(12)}, 19:45, BRI, Nowhere FC`);
  console.log('bad line disables save:', await page.isDisabled('#pSave'));
  await page.fill('#pText', `${ymd(10)}, 19:35, SYD, WSW\n${dmy(11)}, 17:00, Melbourne City FC, Melbourne Victory\n${ymd(11)}, 19:35, AUC, WEL\n${ymd(12)}, 15:00, CCM, NEW\n${ymd(12)}, 17:30, ADE, PER\n${ymd(12)}, 19:45, BRI, MAC`);
  console.log('save label:', await page.textContent('#pSave'));
  await page.click('#pSave');
  await page.waitForFunction(() => document.getElementById('roundSel').value === '3' && document.querySelectorAll('.fx').length === 6);
  console.log('cards:', await page.$$eval('.fx', els => els.length));

  // enter results for 4 games
  const scores = [[2, 1, 28123], [1, 1, 21000], [3, 0, 24500], [0, 2, 9100]];
  const ids = await page.$$eval('.fx', els => els.map(e => e.dataset.id));
  for (let i = 0; i < 4; i++) {
    const id = ids[i];
    await page.fill(`#hg-${id}`, String(scores[i][0]));
    await page.fill(`#ag-${id}`, String(scores[i][1]));
    await page.fill(`#at-${id}`, String(scores[i][2]));
    if (i === 3) await page.fill(`#hr-${id}`, '1');
    await page.click(`.fx[data-id="${id}"] [data-act="save"]`);
    await page.waitForFunction(id => !document.querySelector(`.fx[data-id="${id}"]`).hasAttribute('data-dirty'), id);
  }
  const sheet = await page.evaluate(() => window.__SHEET.Matches);
  console.log('Matches rows:'); sheet.forEach(r => console.log('  ' + JSON.stringify(r)));
  const calls = await page.evaluate(() => window.__CALLS.filter(c => c[0] !== 'get_values'));
  console.log('write calls:'); calls.forEach(c => console.log('  ', c.join(' | ')));
  console.log('mini ladder:', (await page.$$eval('#miniLadder tbody tr', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').trim()))).slice(0, 6));
  console.log('round select label:', await page.$eval('#roundSel', s => s.options[s.selectedIndex].text));
  await page.screenshot({ path: path.join(__dirname, 'matchday-desktop.png'), fullPage: true });

  // half-time inputs: exist on every card, soft validation, and a save writes only the HT cells (+ updatedAt)
  const sid = ids[0];
  check('HT inputs on every card', await page.$$eval('.fx', els => els.every(e => e.querySelector('[data-f="homeHT"]') && e.querySelector('[data-f="awayHT"]'))));
  await page.fill(`#hh-${sid}`, '5'); await page.fill(`#ah-${sid}`, '0');
  const warnTxt = await page.textContent(`.fx[data-id="${sid}"] .fx-msg`);
  check('HT above FT shows a soft warning', /HT is higher than FT/.test(warnTxt) && !(await page.isDisabled(`.fx[data-id="${sid}"] [data-act="save"]`)), warnTxt);
  await page.fill(`#hh-${sid}`, '1');
  check('warning clears when HT is valid', !/higher/.test(await page.textContent(`.fx[data-id="${sid}"] .fx-msg`)));
  const mark = await page.evaluate(() => window.__CALLS.length);
  await page.click(`.fx[data-id="${sid}"] [data-act="save"]`);
  await page.waitForFunction(id => !document.querySelector(`.fx[data-id="${id}"]`).hasAttribute('data-dirty'), sid);
  const wr = await page.evaluate(m => window.__CALLS.slice(m).filter(c => c[0] === 'update_values').map(c => c[1].replace('Matches!', '')), mark);
  const srow = await page.evaluate(id => window.__SHEET.Matches.findIndex(r => r[0] === id) + 1, sid);
  check('saving HT writes only homeHT, awayHT and updatedAt', JSON.stringify(wr.sort()) === JSON.stringify([`S${srow}`, `V${srow}`, `W${srow}`]), wr);
  check('HT cells hold 1 and 0', JSON.stringify(await page.evaluate(id => window.__SHEET.Matches.find(r => r[0] === id).slice(21, 23), sid)) === '[1,0]');

  // edit a fixture: change venue of first
  await page.click(`.fx[data-id="${ids[0]}"] [data-act="edit"]`);
  await page.fill('#fVenue', 'Accor Stadium');
  await page.click('#fxSave');
  await page.waitForFunction(() => !document.getElementById('fxDlg').open);
  // move the last round-1 game to 15 Dec, played with round 9
  await page.click(`.fx[data-id="${ids[5]}"] [data-act="edit"]`);
  await page.fill('#fDate', '2026-12-15'); await page.fill('#fPlayed', '9');
  await page.click('#fxSave');
  await page.waitForFunction(() => !document.getElementById('fxDlg').open);
  console.log('moved row:', JSON.stringify(await page.evaluate(id => window.__SHEET.Matches.find(r => r[0] === id), ids[5])));
  await page.selectOption('#roundSel', '9');
  console.log('round 9 cards:', await page.$$eval('.fx', els => els.map(e => e.innerText.split('\n').slice(0, 3).join(' | '))));
  await page.selectOption('#roundSel', '3');
  console.log('round 3 moved tag:', await page.$$eval('.moved', els => els.map(e => e.textContent)));
  // round 2 fixtures, then postpone a round 1 game and reschedule it into round 2's week
  await page.click('#pasteBtn');
  await page.fill('#pRound', '2');
  await page.fill('#pText', `${ymd(3)}, 20:00, BRI, PER\n${ymd(4)}, 15:00, NEW, MAC`);
  await page.click('#pSave');
  await page.waitForFunction(() => !document.getElementById('pasteDlg').open);
  await page.selectOption('#roundSel', '3');
  await page.click(`.fx[data-id="${ids[4]}"] [data-act="edit"]`);
  await page.click('#fxPost'); await page.click('#fxPost');
  await page.waitForFunction(() => !document.getElementById('fxDlg').open);
  console.log('held tray:', (await page.textContent('#held')).replace(/\s+/g, ' ').trim());
  console.log('postponed cell:', JSON.stringify(await page.evaluate(id => { const r = window.__SHEET.Matches.find(r => r[0] === id); return [r[17], r[20]]; }, ids[4])));
  await page.click(`#held [data-act="edit"]`);
  console.log('dialog title:', await page.textContent('#fxTitle'));
  await page.fill('#fDate', ymd(4)); await page.dispatchEvent('#fDate', 'change');
  console.log('suggested played round:', await page.inputValue('#fPlayed'), '|', await page.textContent('#fxMsg'));
  await page.click('#fxSave');
  await page.waitForFunction(() => !document.getElementById('fxDlg').open);
  console.log('after reschedule:', JSON.stringify(await page.evaluate(id => { const r = window.__SHEET.Matches.find(r => r[0] === id); return [r[4], r[19], r[20]]; }, ids[4])), 'held hidden:', await page.$eval('#held', e => e.hidden));
  console.log('after edit venue cell:', (await page.evaluate(() => window.__SHEET.Matches[1][12])));

  for (const tab of ['ladder', 'results', 'stats', 'history']) {
    await page.click(`#tab-${tab}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, `${tab}-desktop.png`), fullPage: true });
  }
  console.log('history rows:', await page.$$eval('#histTable tbody tr', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').trim())));
  await page.click('#summaryBtn');
  console.log('summary first lines:\n' + (await page.$eval('#summaryBox', b => b.value)).split('\n').slice(0, 3).map(l => '  ' + l.split('\t').slice(0, 18).join('|')).join('\n'));

  // (4) stats tab content
  await page.click('#tab-stats'); await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({
    cr: document.querySelectorAll('#crowdRound tbody tr').length, cc: document.querySelectorAll('#crowdClub tbody tr').length,
    ha: document.querySelectorAll('#homeAway tbody tr').length, canv: document.querySelectorAll('#view-stats canvas').length,
    crH: [...document.querySelectorAll('#crowdRound th')].map(x => x.textContent.trim()), ccH: [...document.querySelectorAll('#crowdClub th')].map(x => x.textContent.trim()),
    haH: [...document.querySelectorAll('#homeAway th')].map(x => x.textContent.trim()), tags: document.querySelectorAll('#view-stats .ctag').length,
    labels: window.Chart ? Chart.getChart('goalsChart').data.labels.length : -1, sc: window.Chart ? Chart.getChart('gameChart').data.datasets.map(d => d.data.length) : []
  }));
  console.log('stats:', JSON.stringify(st));
  check('crowds by round table', st.cr >= 1 && st.crH.join() === 'Round,Games,Total,Average');
  check('crowds by club table', st.cc >= 1 && st.ccH.join() === 'Club,Games,Total,Average');
  check('home and away table', st.ha >= 1 && st.haH.join() === 'Club,Home,Away,P,Pts,GF–GA,P,Pts,GF–GA', st.haH);
  check('two canvases', st.canv === 2);
  check('club tags on stats', st.tags > 0);
  check('goals chart shows every round + finals (32 labels)', st.labels === 32, st.labels);
  const cfg = await page.evaluate(() => {
    const g = Chart.getChart('goalsChart'), d = Chart.getChart('gameChart'), r2 = g.data.datasets[0].data;
    const dot = d.data.datasets[0].data[0], avg = d.data.datasets[1].data[0], tt = d.options.plugins.tooltip.callbacks, xt = d.options.scales.x.ticks.callback;
    return { bar: g.type, bars: g.data.datasets.length, scales: Object.keys(g.options.scales), scales2: Object.keys(d.options.scales), played: r2.filter(v => v != null).length, last: g.data.labels.slice(-4),
      barTip: g.options.plugins.tooltip.callbacks.label({ dataIndex: 0 }), dotTip: tt.label({ dataset: d.data.datasets[0], raw: dot }), avgTip: tt.label({ dataset: d.data.datasets[1], raw: avg }), ticks: [xt(0), xt(5), xt(28), xt(29), xt(32), xt(33), xt(5.5)], jit: d.data.datasets[0].data.map(p => p.x).slice(0, 8) };
  });
  console.log('chart cfg:', JSON.stringify(cfg));
  check('one y-axis per chart', cfg.scales.join() === 'x,y' && cfg.scales2.join() === 'x,y');
  check('chart tooltips', /^Round 1: \d+ goals in 6 games$/.test(cfg.barTip), cfg.barTip);
  await page.screenshot({ path: path.join(__dirname, 'stats-desktop.png'), fullPage: true });
  // half-time: 5 seeded games + the one saved above = 6; led and won = S4 (away) + the saved game
  const hts = await page.evaluate(() => ({ note: document.getElementById('htNote').textContent, tiles: [...document.querySelectorAll('#htTiles .stat')].map(t => [t.querySelector('.eyebrow').textContent, t.querySelector('.num').textContent]), rows: document.querySelectorAll('#htRecord tbody tr').length }));
  console.log('half-time:', JSON.stringify(hts));
  check('half-time summary says from 6 games', /from 6 games/.test(hts.note), hts.note);
  check('half-time led-and-won count', hts.tiles[0][0] === 'Led at HT, won' && hts.tiles[0][1] === '2' && hts.tiles[2][1] === '1' && hts.tiles[3][1] === '2', hts.tiles);
  check('half-time record has 12 club rows', hts.rows === 12, hts.rows);
  await page.click('#tab-results'); await page.waitForTimeout(150);
  const resTxt = await page.textContent('#results');
  check('results show HT', /HT 1–0/.test(resTxt) && /HT 0–1/.test(resTxt), resTxt.match(/HT \d–\d/g));
  await page.click('#tab-stats'); await page.waitForTimeout(150);
  await page.click('#tab-matchday'); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(__dirname, 'matchday-desktop.png'), fullPage: true });

  // (5) no horizontal overflow at 390 and 1280 on Matchday, Ladder, Results, Stats
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const tab of ['matchday', 'ladder', 'results', 'stats']) {
      await page.click(`#tab-${tab}`); await page.waitForTimeout(250);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`no horizontal overflow ${tab} @${w}`, ov <= 0, ov);
      if (tab === 'matchday') {
        const g = await page.evaluate(() => { const c = document.querySelector('.fx:not([data-post])'), r = e => e.getBoundingClientRect(), ht = r(c.querySelector('.fx-ht')), sc = [...c.querySelectorAll('.score input')].map(r), hi = [...c.querySelectorAll('.fx-ht input')].map(r);
          return { dx: Math.abs((ht.left + ht.right) / 2 - (r(c).left + r(c).right) / 2), below: ht.top >= Math.max(...sc.map(x => x.bottom)) - 1, w: hi[0].width, sym: Math.abs((hi[0].left - ht.left) - (ht.right - hi[1].right)) }; });
        check(`HT pair centred, below the score boxes, 40px inputs @${w}`, g.dx <= 1 && g.below && Math.round(g.w) === 40 && g.sym <= 1, g);
        await page.screenshot({ path: path.join(__dirname, w === 390 ? 'ht-matchday-phone.png' : 'ht-matchday-desktop.png'), fullPage: true });
      }
      if (tab === 'stats' && w === 1280) await page.screenshot({ path: path.join(__dirname, 'ht-stats-desktop.png'), fullPage: true });
      if (w === 390 && (tab === 'matchday' || tab === 'stats')) await page.screenshot({ path: path.join(__dirname, `${tab}-phone.png`), fullPage: true });
    }
  }
  check('sticky ladder on desktop', (await (async () => { await page.setViewportSize({ width: 1280, height: 900 }); await page.click('#tab-matchday'); return page.$eval('.md-side', e => getComputedStyle(e).position); })()) === 'sticky');
  check('matchday grid right column 340px', await page.$eval('.md-side', e => Math.round(e.getBoundingClientRect().width)) === 340);

  console.log('logo imgs on page:', await page.$$eval('img.logo', ims => ims.length), '| drive calls:', await page.evaluate(() => window.__CALLS.filter(c => c[0] === 'search_files' || c[0] === 'download_file_content').length));
  const real = errors.filter(e => !/ERR_|Failed to load resource|net::|fonts\.g|cdnjs|accounts\.google/i.test(e));
  check('no page errors', real.length === 0, real);
  console.log('ignored network errors:', errors.length - real.length);
  const failed = checks.filter(c => !c[1]);
  console.log(failed.length ? 'FAILED: ' + failed.map(c => c[0]).join('; ') : `ALL ${checks.length} CHECKS PASSED`);
  await browser.close();
  if (failed.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
