// Headless test of the World Cup page (apps/tournament) with a stubbed window.claude and an in-memory sheet.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const page_html = fs.readFileSync(path.join(DIR, 'apps/tournament/index.html'), 'utf8');

const dd = n => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const H = ['id','tournament','stage','round','pool','date','kickoff','home','away','homeSlot','awaySlot','homeScore','awayScore','homeTries','awayTries','homeSinBins','awaySinBins','homeSendOffs','awaySendOffs','goldenPoint','venue','attendance','referee','status','notes','updatedAt'];
const XH = ['homeHT','awayHT','homeConv','homeConvAtt','awayConv','awayConvAtt','homePG','homePGAtt','awayPG','awayPGAtt','homeFG1','homeFG1Att','awayFG1','awayFG1Att','homeFG2','homeFG2Att','awayFG2','awayFG2Att'];
// seeded half-time and kicking: HT [home, away]; Conv/PG [[made, att] home, [made, att] away]. M05 has none.
const SEED = { M01: { HT: [10, 6], Conv: [[2, 3], [1, 2]], PG: [[1, 1], [1, 2]] }, M02: { HT: [6, 14], Conv: [[3, 4], [2, 3]], PG: [[1, 1], [2, 3]] },
  M03: { HT: [16, 4], Conv: [[4, 5], [1, 2]], PG: [[1, 2], [0, 0]] }, M04: { HT: [12, 12], Conv: [[3, 4], [2, 4]], PG: [[0, 0], [1, 1]] } };
const seedRow = id => { const x = SEED[id]; if (!x) return []; const o = { homeHT: x.HT[0], awayHT: x.HT[1] };
  ['Conv', 'PG'].forEach(k => ['home', 'away'].forEach((s, i) => { o[s + k] = x[k][i][0]; o[s + k + 'Att'] = x[k][i][1]; })); return XH.map(k => o[k] ?? ''); };
const R1 = { M01: [18, 12, 3, 2], M02: [24, 20, 4, 3], M03: [30, 10, 5, 2], M04: [22, 22, 4, 4], M05: [40, 6, 7, 1] };
const fx = [
  ['M01','Pool',1,'A',dd(-12),'20:05','AUS','NZL'],['M02','Pool',1,'BC',dd(-11),'17:45','SAM','FRA'],['M03','Pool',1,'BC',dd(-10),'15:25','PNG','LEB'],
  ['M04','Pool',1,'BC',dd(-10),'20:05','ENG','TGA'],['M05','Pool',1,'A',dd(-9),'16:05','FIJ','COK'],['M06','Pool',2,'BC',dd(1),'20:05','TGA','LEB'],
  ['M07','Pool',2,'BC',dd(2),'15:25','PNG','SAM'],['M08','Pool',2,'BC',dd(2),'17:35','ENG','FRA'],['M09','Pool',2,'A',dd(3),'17:05','NZL','COK'],
  ['M10','Pool',2,'A',dd(3),'20:05','AUS','FIJ'],['M11','Pool',3,'BC',dd(8),'20:05','ENG','PNG'],['M12','Pool',3,'A',dd(9),'15:45','NZL','FIJ'],
  ['M13','Pool',3,'A',dd(9),'20:05','AUS','COK'],['M14','Pool',3,'BC',dd(10),'17:50','LEB','FRA'],['M15','Pool',3,'BC',dd(10),'20:05','TGA','SAM'],
  ['M16','SF','','',dd(17),'20:05','','','A2','BC1'],['M17','SF','','',dd(18),'20:05','','','A1','BC2'],['M18','Final','','',dd(25),'19:35','','','W-M16','W-M17']
].map(([id,stage,round,pool,date,kick,home,away,hs='',as='']) => { const sc = R1[id] || []; return [id,'2026',stage,round,pool,date,kick,home,away,hs,as,sc[0] ?? '',sc[1] ?? '',sc[2] ?? '',sc[3] ?? '','','','','','','Venue '+id,'','','','','', '', ...seedRow(id)]; });
const SHEET = {
  'App Settings': [['key','value'],['competition','Rugby League World Cup'],['tournament','2026'],['pointsWin','2'],['pointsDraw','1'],['pointsLoss','0'],['tiebreakers','pointsDiff,pointsFor,h2hPoints'],['tables','A=Pool A;BC=Pools B & C'],['qualifiers','2'],['poolRounds','3']],
  'Teams': [['code','name','short','pool','flag','colour1','colour2','nickname','comp'],['AUS','Australia','Australia','A','🇦🇺','#00843D','#FFCD00'],['NZL','New Zealand','New Zealand','A','🇳🇿','#111','#fff'],['FIJ','Fiji','Fiji','A','🇫🇯','#fff','#68BBE3'],['COK','Cook Islands','Cook Islands','A','🇨🇰','#00A651','#fff'],
    ['ENG','England','England','B','🏴','#fff','#CE1124'],['LEB','Lebanon','Lebanon','B','🇱🇧','#ED1C24','#00A651'],['SAM','Samoa','Samoa','B','🇼🇸','#002B7F','#fff'],['FRA','France','France','C','🇫🇷','#fff','#002395'],['PNG','Papua New Guinea','Papua New Guinea','C','🇵🇬','#CE1126','#FCD116'],['TGA','Tonga','Tonga','C','🇹🇴','#C10000','#fff'],
    ['AUS','Australia','Australia','A','🇦🇺','#00843D','#FFCD00','','W'],['SAM','Samoa','Samoa','A','🇼🇸','#002B7F','#fff','','W'],['NZL','New Zealand','New Zealand','B','🇳🇿','#111','#fff','','W'],['FIJ','Fiji','Fiji','B','🇫🇯','#fff','#68BBE3','','W']],
  'Venues': [['venue','city'],['Allianz Stadium','Sydney']],
  'Competitions': [['comp','name','short','tables','qualifiers','poolRounds','tiebreakers'],['M',"Men's World Cup",'Men','A=Pool A;BC=Pools B & C','2','3','pointsDiff,pointsFor,h2hPoints'],['W',"Women's World Cup",'Women','A=Group A;B=Group B','2','3','pointsDiff,pointsFor,h2hPoints']],
  'Matches': [[...H, 'comp', ...XH], ...fx, ['W01','2026','Pool','1','A',dd(1),'20:05','AUS','SAM','','','','','','','','','','','','CommBank Stadium','','','','','','W'], ['W04','2026','Pool','1','B',dd(2),'13:50','NZL','FIJ','','','','','','','','','','','','McDonald Jones Stadium','','','','','','W']]
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

let kickTests;
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
  const CORE = ['homeScore', 'awayScore', 'homeHT', 'awayHT'];
  const openMore = async id => { if ((await page.getAttribute(`.fx[data-id="${id}"] .fx-toggle`, 'aria-expanded')) !== 'true') await page.click(`.fx[data-id="${id}"] .fx-toggle`); };
  const save = async (id, vals) => {
    if (Object.keys(vals).some(f => !CORE.includes(f))) await openMore(id);
    for (const [f, v] of Object.entries(vals)) {
      const sel = `.fx[data-id="${id}"] [data-f="${f}"]`;
      if (f === 'goldenPoint') await page.selectOption(sel, v); else await page.fill(sel, String(v));
    }
    await page.click(`.fx[data-id="${id}"] [data-act="save"]`);
    await page.waitForFunction(id => { const c = document.querySelector(`.fx[data-id="${id}"]`); return c && !c.hasAttribute('data-dirty'); }, id);
  };
  const xs = sel => page.$$eval(sel + ' table.t', ts => ts.map(t => [...t.querySelectorAll('thead th')].map(h => Math.round(h.getBoundingClientRect().left * 10) / 10)));
  const aligned = (name, tables) => { const ok = tables.length >= 2 && tables.every(t => t.length === tables[0].length && t.every((x, i) => Math.abs(x - tables[0][i]) <= 0.5)); check(name, ok, JSON.stringify(tables)); };
  kickTests = async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.click('#compSwitch [data-comp="M"]'); await page.click('#tab-matchday'); await page.waitForTimeout(100);
    // 1. the new inputs exist
    await page.selectOption('#roundSel', '1');
    const have = await page.$$eval('.fx[data-id="M01"] [data-f]', is => is.map(i => i.dataset.f));
    check('card has all 18 HT/kicking inputs', XH.every(f => have.includes(f)), XH.filter(f => !have.includes(f)).join(','));
    check('seeded HT/kicking values load into inputs', (await page.inputValue('.fx[data-id="M01"] [data-f="homeHT"]')) === '10' && (await page.inputValue('.fx[data-id="M01"] [data-f="awayConvAtt"]')) === '2');
    check('seeded game with right breakdown shows no warning', (await page.textContent('.fx[data-id="M01"] .fx-warn')).trim() === '');
    // Details: only teams, score and HT show until the toggle is opened
    check('Details start collapsed on every card', await page.$$eval('.fx .fx-toggle', ts => ts.length > 0 && ts.every(t => t.getAttribute('aria-expanded') === 'false' && document.getElementById(t.getAttribute('aria-controls')).hidden)));
    check('only teams, score and HT are visible while collapsed', !(await page.isVisible('.fx[data-id="M01"] [data-f="homeConv"]')) && !(await page.isVisible('.fx[data-id="M01"] [data-f="attendance"]')) && (await page.isVisible('.fx[data-id="M01"] [data-f="homeScore"]')) && (await page.isVisible('.fx[data-id="M01"] [data-f="homeHT"]')));
    await page.click('.fx[data-id="M01"] .fx-toggle');
    check('toggle opens Details and updates aria-expanded', (await page.isVisible('.fx[data-id="M01"] [data-f="homeConv"]')) && (await page.getAttribute('.fx[data-id="M01"] .fx-toggle', 'aria-expanded')) === 'true');
    const labs = await page.$$eval('.fx[data-id="M01"] .sd-lab', ls => ls.map(l => l.textContent.trim()));
    check('scoring block rows in order', JSON.stringify(labs) === JSON.stringify(['Tries', 'Conversions', 'Penalty goals', 'Field goals 1 pt', 'Field goals 2 pt', 'Sin bins', 'Send-offs']), labs.join(','));
    // 2. symmetry: HT pair centred under score boxes, scoring rows mirrored about the card centre
    const sym = await page.evaluate(() => { const c = document.querySelector('.fx[data-id="M01"]'), r = e => e.getBoundingClientRect(), cc = r(c), mid = cc.left + cc.width / 2;
      const ht = [...c.querySelectorAll('.ht input')].map(r), sc = [...c.querySelectorAll('.score input')].map(r);
      const rows = [...c.querySelectorAll('.sd-row')].map(row => { const l = r(row.children[0]), m = r(row.children[1]), q = r(row.children[2]); return Math.abs((m.left + m.width / 2) - mid) + Math.abs((l.left - cc.left) - (cc.right - q.right)); });
      return { htC: (ht[0].left + ht[1].right) / 2 - mid, scC: (sc[0].left + sc[1].right) / 2 - mid, rows: Math.max(...rows), htGap: ht[0].top - sc[0].bottom };
    });
    check('HT pair centred under the score boxes', Math.abs(sym.htC) < 1 && Math.abs(sym.scC) < 1 && sym.htGap > 0, JSON.stringify(sym));
    check('scoring rows mirror about card centre', sym.rows < 1.5, JSON.stringify(sym));
    // 3. saving kicking fields writes ONLY the changed cells (+ updatedAt)
    await page.selectOption('#roundSel', '2');
    const hdr = await page.evaluate(() => window.__SHEET.Matches[0]);
    const rowOf = id => page.evaluate(id => window.__SHEET.Matches.findIndex(r => r[0] === id) + 1, id);
    const m06 = await rowOf('M06'), before = await page.evaluate(() => JSON.stringify(window.__SHEET.Matches));
    const n0 = await page.evaluate(() => window.__CALLS.length);
    await save('M06', { homeHT: 18, awayHT: 4, homeConv: 5, homeConvAtt: 6 });
    const writes = await page.evaluate(n => window.__CALLS.slice(n).filter(c => c[0] === 'update_values').map(c => c[1]), n0);
    const L = k => { let i = hdr.indexOf(k) + 1, s = ''; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
    const want = ['homeHT', 'awayHT', 'homeConv', 'homeConvAtt', 'updatedAt'].map(k => `Matches!${L(k)}${m06}`).sort();
    check('saving kicking fields writes only the changed cells + updatedAt', JSON.stringify([...writes].sort()) === JSON.stringify(want), writes.join(' ') + ' vs ' + want.join(' '));
    const after = await page.evaluate(() => window.__SHEET.Matches), b = JSON.parse(before);
    const diff = []; after.forEach((r, i) => r.forEach((v, j) => { if (v !== (b[i] || [])[j] && !(v === '' && (b[i] || [])[j] == null)) diff.push(`${hdr[j]}@${i + 1}`); }));
    console.log('  diff:', diff.join(','));
    check('sheet differs only in those cells', diff.length >= 4 && diff.every(d => d.endsWith('@' + m06) && /^(homeHT|awayHT|homeConv|homeConvAtt|updatedAt)@/.test(d)), diff.join(','));
    check('written values are numbers', await page.evaluate(m => { const r = window.__SHEET.Matches[m - 1], h = window.__SHEET.Matches[0]; return r[h.indexOf('homeConv')] === 5 && r[h.indexOf('homeHT')] === 18; }, m06));
    // 4. breakdown warnings (they stay visible even while Details are folded away)
    await openMore('M07');
    const warn = () => page.textContent('.fx[data-id="M07"] .fx-warn');
    await page.fill('.fx[data-id="M07"] [data-f="homeConv"]', '1');
    check('wrong breakdown shows mismatch message', /Papua New Guinea breakdown adds to 14, score is 16/.test(await warn()), await warn());
    check('mismatch is soft: save still enabled', !(await page.$eval('.fx[data-id="M07"] [data-act="save"]', b => b.disabled)));
    await page.fill('.fx[data-id="M07"] [data-f="homeConv"]', '2');
    check('right breakdown shows no mismatch', !/breakdown/.test(await warn()), await warn());
    await page.fill('.fx[data-id="M07"] [data-f="homeConvAtt"]', '1');
    check('made > attempts warning', /conversions: 2 made from 1 attempted/.test(await warn()), await warn());
    await page.fill('.fx[data-id="M07"] [data-f="homeHT"]', '20');
    check('HT higher than full time warning', /half-time 20 is higher than full time 16/.test(await warn()), await warn());
    await page.click('.fx[data-id="M07"] .fx-toggle');
    check('warning and unsaved dot stay visible with Details folded', (await page.isVisible('.fx[data-id="M07"] .fx-warn')) && (await page.isVisible('.fx[data-id="M07"] .fx-toggle .dot')) && !(await page.isVisible('.fx[data-id="M07"] [data-f="homeConv"]')));
    await page.click('.fx[data-id="M07"] .fx-toggle');
    check('opened Details stay open across a re-render', await (async () => { await page.selectOption('#roundSel', '1'); await page.selectOption('#roundSel', '2'); return (await page.getAttribute('.fx[data-id="M07"] .fx-toggle', 'aria-expanded')) === 'true' && (await page.isVisible('.fx[data-id="M07"] [data-f="homeConv"]')); })());
    // 5. men's stats
    await page.click('#tab-stats'); await page.waitForTimeout(300);
    check('men stats: from 5 games', /from 5 games$/.test((await page.textContent('#htNote')).trim()), await page.textContent('#htNote'));
    const tiles = await page.$$eval('#htTiles .stat', ss => ss.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    check('men stats: led at HT 4 (won 3, drawn 0, lost 1)', tiles.some(t => /^LED AT HALF-TIME 4 won 3 · drawn 0 · lost 1/i.test(t)), tiles.join(' | '));
    check('men stats: level at HT 1', tiles.some(t => /^LEVEL AT HALF-TIME 1/i.test(t)), tiles.join(' | '));
    check('men stats: comebacks 1', tiles.some(t => /^COMEBACKS 1 /i.test(t)), tiles.join(' | '));
    const all = [...Object.values(SEED), { Conv: [[5, 6], []], PG: [] }];
    let made = 0, att = 0; all.forEach(x => ['Conv', 'PG'].forEach(k => (x[k] || []).forEach(q => { if (q.length) { made += q[0]; att += q[1]; } })));
    const expPct = Math.round(100 * made / att) + '%';
    const kr = await page.$eval('#kickTable', t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent.trim())));
    const totRow = kr[kr.length - 1], aus = kr.find(r => /Australia|AUS/.test(r[0])), fij = kr.find(r => /Fiji|FIJ/.test(r[0]));
    check('kicking total row goals % matches seeded data (' + expPct + ')', totRow[0] === 'All teams' && totRow[5] === expPct, JSON.stringify(totRow));
    check('Australia: conv 2/3, PG 1/1, goals 75%', aus && aus[1] === '2/3' && aus[3] === '1/1' && aus[5] === '75%', JSON.stringify(aus));
    check('team without games shows dashes', fij && fij.slice(1).every(x => x === '–'), JSON.stringify(fij));
    const hr = await page.$eval('#htTable', t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent.trim())));
    const samoa = hr.find(r => /Samoa|SAM/.test(r[0]));
    check('Samoa HT record: trailed 0-... with comeback win', samoa && samoa[3] === '1-0-0' && samoa[4] === '6–14' && samoa[5] === '18–6', JSON.stringify(samoa));
    await page.screenshot({ path: path.join(__dirname, 'wc-kick-stats-desktop.png'), fullPage: true });
    await page.click('#tab-results'); await page.waitForTimeout(150);
    const res = await page.$$eval('#results .line .sub', l => l.map(x => x.textContent));
    check('results show HT and goals summary', res.some(t => t.includes('HT 10–6') && t.includes('goals 3/4 v 2/4')), res.slice(0, 8).join(' | '));
    check('results omit HT/goals when absent', res.some(t => /Venue M05/.test(t) && !/HT|goals/.test(t)), res.join(' | '));
    await page.click('#tab-pools'); await page.click('#poolTables tr[data-team="AUS"]');
    const tb = (await page.textContent('#teamBody')).replace(/\s+/g, ' ');
    check('team pop-up shows HT record and goal kicking', /Half-time record.*Led 1-0-0/.test(tb) && /Goal kicking.*75% \(3\/4\)/.test(tb), tb.slice(0, 300));
    await page.keyboard.press('Escape');
    // 6. layout at three widths
    for (const w of [360, 390, 1280]) {
      await page.setViewportSize({ width: w, height: 844 });
      for (const tab of ['matchday', 'stats']) {
        await page.click('#tab-' + tab); await page.waitForTimeout(150);
        if (tab === 'matchday') await page.selectOption('#roundSel', '1');
        const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(`kick: no page overflow ${tab} ${w}px`, o <= 0, o);
        if (tab === 'matchday') {
          const inner = await page.$$eval('.fx', cs => cs.map(c => [...c.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width > 0 && (e.getBoundingClientRect().right > c.getBoundingClientRect().right + 0.5 || e.getBoundingClientRect().left < c.getBoundingClientRect().left - 0.5)).map(e => e.tagName + '.' + e.className)).flat());
          check(`kick: nothing spills out of fixture cards ${w}px`, inner.length === 0, JSON.stringify(inner.slice(0, 6)));
        } else {
          const tw = await page.$$eval('.table-wrap', ws => ws.filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.id));
          console.log(`  stats tables scrolling inside wrapper at ${w}px:`, tw.join(',') || 'none');
        }
      }
      if (w === 390) { await page.click('#tab-matchday'); await page.selectOption('#roundSel', '1'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(__dirname, 'wc-kick-matchday-phone.png'), fullPage: true }); }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.click('#tab-matchday'); await page.selectOption('#roundSel', '1'); await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(__dirname, 'wc-kick-matchday-desktop.png'), fullPage: true });
  };
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
  await save('W01', { homeHT: 16, awayHT: 0, homeConv: 4, homeConvAtt: 5 });
  await page.click('#tab-stats'); await page.waitForTimeout(200);
  check('women stats: from 1 game', /from 1 game$/.test((await page.textContent('#htNote')).trim()), await page.textContent('#htNote'));
  check('women stats: no comebacks', (await page.$$eval('#htTiles .stat', ss => ss.map(x => x.innerText.replace(/\s+/g, ' ').trim()))).some(t => /^COMEBACKS 0/i.test(t)));
  const wk = await page.$eval('#kickTable', t => [...t.querySelectorAll('tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
  check('women stats: Australia goal kicking 80%', wk.some(r => /^Australia 4\/5 80% 0?.*80%/.test(r) || (/^Australia/.test(r) && r.includes('4/5') && r.includes('80%'))), wk.join(' | '));
  check('women stats: Samoa has dashes only', wk.some(r => /^Samoa( –)+$/.test(r)), wk.join(' | '));
  await page.click('#tab-matchday'); await page.waitForTimeout(100);
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
  await kickTests();
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
