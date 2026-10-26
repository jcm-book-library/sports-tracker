// Headless test of the World Cup page (apps/tournament) with a stubbed window.claude and an in-memory sheet.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const page_html = fs.readFileSync(path.join(DIR, 'apps/tournament/index.html'), 'utf8');

const dd = n => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const H = ['id','tournament','stage','round','pool','date','kickoff','home','away','homeSlot','awaySlot','homeScore','awayScore','homeTries','awayTries','homeSinBins','awaySinBins','homeSendOffs','awaySendOffs','goldenPoint','venue','attendance','referee','status','notes','updatedAt'];
const R1 = { M01: [18, 12, 3, 2], M02: [24, 20, 4, 3], M03: [30, 10, 5, 2], M04: [22, 22, 4, 4], M05: [40, 6, 7, 1] };
const fx = [
  ['M01','Pool',1,'A',dd(-12),'20:05','AUS','NZL'],['M02','Pool',1,'BC',dd(-11),'17:45','SAM','FRA'],['M03','Pool',1,'BC',dd(-10),'15:25','PNG','LEB'],
  ['M04','Pool',1,'BC',dd(-10),'20:05','ENG','TGA'],['M05','Pool',1,'A',dd(-9),'16:05','FIJ','COK'],['M06','Pool',2,'BC',dd(1),'20:05','TGA','LEB'],
  ['M07','Pool',2,'BC',dd(2),'15:25','PNG','SAM'],['M08','Pool',2,'BC',dd(2),'17:35','ENG','FRA'],['M09','Pool',2,'A',dd(3),'17:05','NZL','COK'],
  ['M10','Pool',2,'A',dd(3),'20:05','AUS','FIJ'],['M11','Pool',3,'BC',dd(8),'20:05','ENG','PNG'],['M12','Pool',3,'A',dd(9),'15:45','NZL','FIJ'],
  ['M13','Pool',3,'A',dd(9),'20:05','AUS','COK'],['M14','Pool',3,'BC',dd(10),'17:50','LEB','FRA'],['M15','Pool',3,'BC',dd(10),'20:05','TGA','SAM'],
  ['M16','SF','','',dd(17),'20:05','','','A2','BC1'],['M17','SF','','',dd(18),'20:05','','','A1','BC2'],['M18','Final','','',dd(25),'19:35','','','W-M16','W-M17']
].map(([id,stage,round,pool,date,kick,home,away,hs='',as='']) => { const sc = R1[id] || []; return [id,'2026',stage,round,pool,date,kick,home,away,hs,as,sc[0] ?? '',sc[1] ?? '',sc[2] ?? '',sc[3] ?? '','','','','','','Venue '+id,'','','','','']; });
const SHEET = {
  'App Settings': [['key','value'],['competition','Rugby League World Cup'],['tournament','2026'],['pointsWin','2'],['pointsDraw','1'],['pointsLoss','0'],['tiebreakers','pointsDiff,pointsFor,h2hPoints'],['tables','A=Pool A;BC=Pools B & C'],['qualifiers','2'],['poolRounds','3']],
  'Teams': [['code','name','short','pool','flag','colour1','colour2','nickname','comp'],['AUS','Australia','Australia','A','🇦🇺','#00843D','#FFCD00'],['NZL','New Zealand','New Zealand','A','🇳🇿','#111','#fff'],['FIJ','Fiji','Fiji','A','🇫🇯','#fff','#68BBE3'],['COK','Cook Islands','Cook Islands','A','🇨🇰','#00A651','#fff'],
    ['ENG','England','England','B','🏴','#fff','#CE1124'],['LEB','Lebanon','Lebanon','B','🇱🇧','#ED1C24','#00A651'],['SAM','Samoa','Samoa','B','🇼🇸','#002B7F','#fff'],['FRA','France','France','C','🇫🇷','#fff','#002395'],['PNG','Papua New Guinea','Papua New Guinea','C','🇵🇬','#CE1126','#FCD116'],['TGA','Tonga','Tonga','C','🇹🇴','#C10000','#fff'],
    ['AUS','Australia','Australia','A','🇦🇺','#00843D','#FFCD00','','W'],['SAM','Samoa','Samoa','A','🇼🇸','#002B7F','#fff','','W'],['NZL','New Zealand','New Zealand','B','🇳🇿','#111','#fff','','W'],['FIJ','Fiji','Fiji','B','🇫🇯','#fff','#68BBE3','','W']],
  'Venues': [['venue','city'],['Allianz Stadium','Sydney']],
  'Competitions': [['comp','name','short','tables','qualifiers','poolRounds','tiebreakers'],['M',"Men's World Cup",'Men','A=Pool A;BC=Pools B & C','2','3','pointsDiff,pointsFor,h2hPoints'],['W',"Women's World Cup",'Women','A=Group A;B=Group B','2','3','pointsDiff,pointsFor,h2hPoints']],
  'Matches': [[...H, 'comp'], ...fx, ['W01','2026','Pool','1','A',dd(1),'20:05','AUS','SAM','','','','','','','','','','','','CommBank Stadium','','','','','','W'], ['W04','2026','Pool','1','B',dd(2),'13:50','NZL','FIJ','','','','','','','','','','','','McDonald Jones Stadium','','','','','','W']]
};
const stub = `<script>
const SHEET = ${JSON.stringify(SHEET)};
window.__SHEET = SHEET; window.__CALLS = [];
const col = s => s.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
function parse(range) {
  const m = range.match(/^'?(.+?)'?!([A-Z]+)(\\d+)(?::([A-Z]+)(\\d+))?$/);
  return { tab: m[1], c1: col(m[2]), r1: +m[3] - 1, c2: m[4] ? col(m[4]) : col(m[2]), r2: m[5] ? +m[5] - 1 : +m[3] - 1 };
}
const store = v => typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
const mcp = { async callTool(server, tool, input) {
  window.__CALLS.push([tool, input.range || '', JSON.stringify(input.values || '')]);
  const p = parse(input.range), t = SHEET[p.tab];
  if (tool === 'get_values') { const out = []; for (let r = p.r1; r <= Math.min(p.r2, t.length - 1); r++) { const row = (t[r] || []).slice(p.c1, p.c2 + 1).map(v => v == null ? '' : String(v)); while (row.length && row[row.length - 1] === '') row.pop(); out.push(row); } return { payload: { values: out } }; }
  if (tool === 'append_values') { input.values.forEach(v => t.push(v.map(store))); return { payload: {} }; }
  if (tool === 'update_values') { input.values.forEach((row, i) => { const r = p.r1 + i; t[r] = t[r] || []; row.forEach((v, j) => { t[r][p.c1 + j] = store(v); }); }); return { payload: {} }; }
} };
window.claude = { use: async name => name === 'mcp' ? mcp : null };
</script>`;
fs.writeFileSync(path.join(__dirname, 'page-wc.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${stub}</head><body>${page_html}</body></html>`);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const netNoise = t => /Failed to load resource|net::ERR|fonts\.g|cdnjs|ERR_/i.test(t);
  page.on('console', m => { if (m.type() === 'error' && !netNoise(m.text())) errors.push('console: ' + m.text()); });
  const fails = [];
  const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok && !detail ? '' : ' ' + (detail ?? ''))); if (!ok) fails.push(name); };
  await page.goto('file://' + path.join(__dirname, 'page-wc.html'));
  await page.waitForFunction(() => document.getElementById('status').dataset.state === 'live');
  const roundText = () => page.$eval('#roundSel', s => s.options[s.selectedIndex].text);
  const rs = await roundText();
  console.log('round shown:', rs);
  check('opens on round of next unplayed game (Round 2)', /^Round 2/.test(rs), rs);
  // score font + two-digit fit (desktop and phone)
  const fit = async w => {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(100);
    return page.$eval('.fx .score input', i => { const v = i.value; i.value = '88'; const r = { sw: i.scrollWidth, cw: i.clientWidth, w: i.offsetWidth, ff: getComputedStyle(i).fontFamily, fw: getComputedStyle(i).fontWeight }; i.value = v; return r; });
  };
  for (const w of [1280, 390]) { const f = await fit(w); check(`"88" fits score input at ${w}px`, f.sw <= f.cw, JSON.stringify(f)); if (w === 1280) check('score input is 64px wide and Nunito 700', f.w === 64 && /Nunito/.test(f.ff) && f.fw === '700', JSON.stringify(f)); else check('phone score input is 58px wide', f.w === 58, f.w); }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(__dirname, 'wc-matchday-desktop.png'), fullPage: true });
  const save = async (id, vals) => {
    for (const [f, v] of Object.entries(vals)) {
      const sel = `.fx[data-id="${id}"] [data-f="${f}"]`;
      if (f === 'goldenPoint') await page.selectOption(sel, v); else await page.fill(sel, String(v));
    }
    await page.click(`.fx[data-id="${id}"] [data-act="save"]`);
    await page.waitForFunction(id => { const c = document.querySelector(`.fx[data-id="${id}"]`); return c && !c.hasAttribute('data-dirty'); }, id);
  };
  const xs = sel => page.$$eval(sel + ' table.t', ts => ts.map(t => [...t.querySelectorAll('thead th')].map(h => Math.round(h.getBoundingClientRect().left * 10) / 10)));
  const aligned = (name, tables) => { const ok = tables.length >= 2 && tables.every(t => t.length === tables[0].length && t.every((x, i) => Math.abs(x - tables[0][i]) <= 0.5)); check(name, ok, JSON.stringify(tables)); };
  const results = { 2: { M06: [34, 4, 6, 1], M07: [16, 18, 3, 3], M08: [28, 14, 5, 2], M09: [44, 0, 8, 0], M10: [26, 10, 4, 2] },
    3: { M11: [20, 16, 3, 3], M12: [24, 6, 4, 1], M13: [50, 0, 9, 0], M14: [12, 30, 2, 5], M15: [20, 24, 3, 4] } };
  for (const r of [2, 3]) {
    await page.selectOption('#roundSel', String(r));
    for (const [id, [h, a, ht, at]] of Object.entries(results[r])) await save(id, { homeScore: h, awayScore: a, homeTries: ht, awayTries: at, attendance: 20000, homeSinBins: id === 'M01' ? 1 : '', referee: 'Ref ' + r });
  }
  await page.click('#tab-matchday'); await page.waitForTimeout(100);
  aligned('men mini tables align (1280)', await xs('#miniTables'));
  await page.click('#tab-pools'); await page.waitForTimeout(150);
  const champBg = () => page.$eval('#bracket .champbox', e => getComputedStyle(e).backgroundColor + '|' + getComputedStyle(e).color + '|' + getComputedStyle(e.querySelector('.eyebrow')).color);
  check('champions box cyan before final', (await champBg()).startsWith('rgb(0, 225, 230)|rgb(6, 22, 51)|rgb(6, 22, 51)'), await champBg());
  aligned('men pool tables align (1280)', await xs('#poolTables'));
  for (const t of await page.$$eval('#poolTables .panel', ps => ps.map(p => p.querySelector('h2').textContent + ': ' + [...p.querySelectorAll('tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).join(' / '))))
    console.log(t);
  console.log('bracket:', (await page.textContent('#bracket')).replace(/\s+/g, ' ').trim());
  await page.screenshot({ path: path.join(__dirname, 'wc-pools-desktop.png'), fullPage: true });
  await page.click('#tab-matchday');
  await page.selectOption('#roundSel', 'SF');
  console.log('SF cards:', await page.$$eval('.fx .fx-main', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim())));
  // a drawn knockout is refused
  await page.fill('.fx[data-id="M16"] [data-f="homeScore"]', '18'); await page.fill('.fx[data-id="M16"] [data-f="awayScore"]', '18');
  await page.click('.fx[data-id="M16"] [data-act="save"]');
  console.log('draw refused:', await page.textContent('#notice'));
  await save('M16', { homeScore: 19, awayScore: 18, goldenPoint: 'Y' });
  await save('M17', { homeScore: 30, awayScore: 8 });
  console.log('SF rows in sheet:', JSON.stringify(await page.evaluate(() => window.__SHEET.Matches.filter(r => r[2] === 'SF').map(r => r.slice(7, 13).concat(r[19])))));
  await page.selectOption('#roundSel', 'Final');
  await save('M18', { homeScore: 14, awayScore: 22, attendance: 52000 });
  console.log('final row:', JSON.stringify(await page.evaluate(() => window.__SHEET.Matches.find(r => r[0] === 'M18').slice(7, 13))));
  await page.click('#tab-pools'); await page.waitForTimeout(150);
  console.log('bracket after:', (await page.textContent('#bracket')).replace(/\s+/g, ' ').trim());
  check('champions box cyan after final', (await champBg()).startsWith('rgb(0, 225, 230)|rgb(6, 22, 51)|rgb(6, 22, 51)'), await champBg());
  await page.screenshot({ path: path.join(__dirname, 'wc-pools-desktop.png'), fullPage: true });
  await page.click('#tab-results'); await page.waitForTimeout(150);
  console.log('results first:', (await page.$$eval('#results .line', ls => ls.slice(0, 3).map(l => l.innerText.replace(/\s+/g, ' ').trim()))));
  await page.click('#tab-stats'); await page.waitForTimeout(300);
  console.log('tiles:', (await page.$$eval('.stat', s => s.map(x => x.innerText.replace(/\s+/g, ' ').trim()))));
  await page.screenshot({ path: path.join(__dirname, 'wc-stats-desktop.png'), fullPage: true });
  await page.locator('#poolTables').count();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of ['matchday', 'pools', 'results', 'stats']) {
    await page.click('#tab-' + tab); await page.waitForTimeout(200);
    console.log(`phone ${tab} overflow px:`, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }
  await page.click('#tab-matchday'); await page.selectOption('#roundSel', '3'); await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(__dirname, 'wc-matchday-phone.png'), fullPage: true });
  await page.click('#tab-pools'); await page.click('#poolTables tr[data-team="ENG"]');
  console.log('team dialog:', (await page.textContent('#teamBody')).replace(/\s+/g, ' ').trim().slice(0, 200));
  await page.setViewportSize({ width: 1280, height: 900 }); await page.keyboard.press('Escape');
  await page.click('#compSwitch [data-comp="W"]'); await page.click('#tab-matchday'); await page.waitForTimeout(150);
  console.log('women header:', await page.textContent('#compLine'), '| round:', await page.$eval('#roundSel', s => s.options[s.selectedIndex].text));
  await save('W01', { homeScore: 32, awayScore: 4, homeTries: 6, awayTries: 1 });
  console.log('women W01 row:', JSON.stringify(await page.evaluate(() => window.__SHEET.Matches.find(r => r[0] === 'W01').slice(7, 15))));
  console.log('women tables:', await page.$$eval('#miniTables .panel', ps => ps.map(p => p.querySelector('h2').textContent + ': ' + [...p.querySelectorAll('tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).join(' / '))));
  aligned('women mini tables align (1280)', await xs('#miniTables'));
  await page.screenshot({ path: path.join(__dirname, 'wc-women-desktop.png') });
  await page.click('#tab-pools'); await page.waitForTimeout(150);
  aligned('women pool tables align (1280)', await xs('#poolTables'));
  const wp = await xs('#poolTables');
  await page.click('#tab-pools');
  // men pool tables vs women pool tables, and phone alignment
  for (const w of [390]) {
    await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(150);
    aligned(`women pool tables align (${w})`, await xs('#poolTables'));
    await page.click('#tab-matchday'); await page.waitForTimeout(100);
    aligned(`women mini tables align (${w})`, await xs('#miniTables'));
    await page.click('#compSwitch [data-comp="M"]'); await page.waitForTimeout(100);
    aligned(`men mini tables align (${w})`, await xs('#miniTables'));
    await page.click('#tab-pools'); await page.waitForTimeout(100);
    aligned(`men pool tables align (${w})`, await xs('#poolTables'));
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  // overflow sweep: every tab, both competitions, three widths
  for (const comp of ['M', 'W']) for (const w of [360, 390, 1280]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.click(`#compSwitch [data-comp="${comp}"]`);
    for (const tab of ['matchday', 'pools', 'results', 'stats']) {
      await page.click('#tab-' + tab); await page.waitForTimeout(120);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`no horizontal overflow ${comp} ${tab} ${w}px`, o <= 0, o);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click('#compSwitch [data-comp="M"]'); await page.click('#tab-matchday');
  await page.click('#compSwitch [data-comp="M"]'); await page.waitForTimeout(100);
  console.log('men Pool A after switching back:', await page.$eval('#miniTables .panel', p => p.innerText.replace(/\s+/g, ' ').slice(0, 80)));
  console.log('errors:', errors.length ? errors : 'none');
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails.length ? `FAILED: ${fails.length} check(s): ${fails.join('; ')}` : 'ALL CHECKS PASSED');
  if (fails.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
