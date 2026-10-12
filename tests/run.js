// Headless test of the Sports Tracker page with a stubbed window.claude and an in-memory sheet.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const page_html = fs.readFileSync(path.join(DIR, 'apps/team-match/index.html'), 'utf8');

const stub = `
<script>
const SHEET = {
  'App Settings': [['key','value'],['competition','A-League Men'],['season','2026/27'],['pointsWin','3'],['pointsDraw','1'],['pointsLoss','0'],['regularRounds','28'],['tiebreakers','goalDiff,goalsFor,wins,h2hPoints,h2hGoalDiff'],['finalsTeams','6']],
  'Teams': [['code','name','short','colour1','colour2','homeVenue','active'],
    ['ADE','Adelaide United','Adelaide','#D71920','#1B2A4A','Coopers Stadium','Y'],['AUC','Auckland FC','Auckland','#1E3A8A','#FFFFFF','Go Media Stadium','Y'],
    ['BRI','Brisbane Roar','Brisbane','#F26522','#1A1A1A','Suncorp Stadium','Y'],['CCM','Central Coast Mariners','Central Coast','#FFD100','#002B5C','Industree Group Stadium','Y'],
    ['MAC','Macarthur FC','Macarthur','#1A1A1A','#C5A253','Campbelltown Stadium','Y'],['MCY','Melbourne City','Melbourne City','#6CABDD','#1C2C5B','AAMI Park','Y'],
    ['MVC','Melbourne Victory','Melbourne Victory','#002A5C','#FFFFFF','AAMI Park','Y'],['NEW','Newcastle Jets','Newcastle','#F2A900','#003A70','McDonald Jones Stadium','Y'],
    ['PER','Perth Glory','Perth','#4B2A7B','#F37021','HBF Park','Y'],['SYD','Sydney FC','Sydney FC','#4B9CD3','#1C2C5B','Allianz Stadium','Y'],
    ['WEL','Wellington Phoenix','Wellington','#FFD700','#1A1A1A','Sky Stadium','Y'],['WSW','Western Sydney Wanderers','Western Sydney','#C8102E','#1A1A1A','CommBank Stadium','Y']],
  'Venues': [['venue','city'],['Allianz Stadium','Sydney'],['AAMI Park','Melbourne']],
  'Matches': [['id','season','round','stage','date','kickoff','home','away','homeGoals','awayGoals','homeReds','awayReds','venue','attendance','extraTime','homePens','awayPens','notes','updatedAt','playedRound']],
  '2025/26': [[],['2025/26','','','','','','PTS','+/-','P','W','L','D','F','A'],['1','','Newcastle Jets','','','','48','17','26','15','8','3'],['2','','Adelaide United','','','','43','10','26','12','7','7']]
};
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
  console.log('empty round shows:', (await page.textContent('#fixtures')).trim().slice(0, 40));

  // paste round 1 (6 games) + one bad line first to check validation
  await page.click('#pasteBtn');
  await page.fill('#pText', '2026-10-16, 19:35, SYD, WSW\n17/10/2026, 17:00, Melbourne City, Melbourne Victory\n2026-10-17, 19:35, AUC, WEL\n2026-10-18, 15:00, CCM, NEW\n2026-10-18, 17:30, ADE, PER\n2026-10-18, 19:45, BRI, Nowhere FC');
  console.log('bad line disables save:', await page.isDisabled('#pSave'));
  await page.fill('#pText', '2026-10-16, 19:35, SYD, WSW\n17/10/2026, 17:00, Melbourne City, Melbourne Victory\n2026-10-17, 19:35, AUC, WEL\n2026-10-18, 15:00, CCM, NEW\n2026-10-18, 17:30, ADE, PER\n2026-10-18, 19:45, BRI, MAC');
  console.log('save label:', await page.textContent('#pSave'));
  await page.click('#pSave');
  await page.waitForFunction(() => document.querySelectorAll('.fx').length === 6);
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
  await page.selectOption('#roundSel', '1');
  console.log('round 1 moved tag:', await page.$$eval('.moved', els => els.map(e => e.textContent)));
  console.log('after edit venue cell:', (await page.evaluate(() => window.__SHEET.Matches[1][12])));

  for (const tab of ['ladder', 'results', 'stats', 'history']) {
    await page.click(`#tab-${tab}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, `${tab}-desktop.png`), fullPage: true });
  }
  console.log('history rows:', await page.$$eval('#histTable tbody tr', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').trim())));
  await page.click('#summaryBtn');
  console.log('summary first lines:\n' + (await page.$eval('#summaryBox', b => b.value)).split('\n').slice(0, 3).map(l => '  ' + l.split('\t').slice(0, 18).join('|')).join('\n'));

  // phone width
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#tab-matchday');
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('phone horizontal overflow px:', overflow);
  await page.screenshot({ path: path.join(__dirname, 'matchday-phone.png'), fullPage: true });
  await page.click('#tab-ladder'); await page.waitForTimeout(200);
  console.log('phone ladder overflow px:', await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await page.screenshot({ path: path.join(__dirname, 'ladder-phone.png'), fullPage: true });

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
