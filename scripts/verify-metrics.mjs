import { Client } from 'pg';

const client = new Client({
  host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin',
});
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
await client.connect();

const PID = 3;

// 全部净值（升序）
const navs = await q(`
  SELECT n."nav_date", n."unit_nav" FROM "wealth_navs" n
  JOIN "wealth_navs_product_lnk" l ON l."wealth_nav_id" = n.id
  WHERE l."wealth_product_id" = $1 ORDER BY n."nav_date" ASC`, [PID]);

const toStr = (d) => (d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10));

function calcVolatility(windowNavs) {
  if (windowNavs.length < 2) return null;
  const sorted = [...windowNavs].sort((a,b) => new Date(a.nav_date) - new Date(b.nav_date));
  const returns = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i-1].unit_nav);
    const curr = Number(sorted[i].unit_nav);
    if (isNaN(prev) || isNaN(curr) || prev <= 0) return null;
    returns.push(curr/prev - 1);
  }
  const mean = returns.reduce((s,r)=>s+r,0)/returns.length;
  const variance = returns.reduce((s,r)=>s+Math.pow(r-mean,2),0)/(returns.length-1);
  return Math.sqrt(variance) * Math.sqrt(250);
}

function calcMaxDrawdown(windowNavs) {
  if (windowNavs.length < 2) return null;
  const sorted = [...windowNavs].sort((a,b) => new Date(a.nav_date) - new Date(b.nav_date));
  let peak = Number(sorted[0].unit_nav);
  let maxDD = 0;
  for (const n of sorted) {
    const v = Number(n.unit_nav);
    if (isNaN(v)) continue;
    if (v > peak) peak = v;
    if (peak > 0) maxDD = Math.max(maxDD, (peak - v)/peak);
  }
  return -maxDD;
}

// 各周期窗口（以最新净值日 2026-08-12 为结束）
const last = navs[navs.length - 1];
const endTime = new Date(last.nav_date).getTime();
const periods = { '近1月(m1)': 30, '近3月(m3)': 90, '近半年(m6)': 180, '近1年(y1)': 365 };

console.log(`最新净值日: ${toStr(last.nav_date)}`);
for (const [label, days] of Object.entries(periods)) {
  const cutoff = new Date(endTime - days * 86400000);
  const window = navs.filter(n => new Date(n.nav_date).getTime() >= cutoff.getTime());
  const vol = calcVolatility(window);
  const dd = calcMaxDrawdown(window);
  const ann = window.length >= 2
    ? Math.pow(Number(window[window.length-1].unit_nav)/Number(window[0].unit_nav), 365/days) - 1
    : null;
  console.log(`${label} (${days}天): 数据点=${window.length}, 波动率=${vol===null?'null':(vol*100).toFixed(6)}%, 最大回撤=${dd===null?'null':(dd*100).toFixed(6)}%, 年化=${ann===null?'null':(ann*100).toFixed(4)}%`);
}

// 对照：m1 用 30 个自然日窗口内实际起止日期
const cutoff30 = new Date(endTime - 30*86400000);
const w30 = navs.filter(n => new Date(n.nav_date).getTime() >= cutoff30.getTime());
console.log('\nm1 窗口起止:', toStr(w30[0]?.nav_date), '~', toStr(w30[w30.length-1]?.nav_date));

await client.end();
