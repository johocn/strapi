import { Client } from 'pg';

const client = new Client({
  host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin',
});
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
await client.connect();

// 年化快照表的实际列
const cols = await q(`SELECT column_name FROM information_schema.columns WHERE table_name = 'wealth_annual_snapshots' ORDER BY ordinal_position`);
console.log('=== wealth_annual_snapshots 列 ===', cols.map((c) => c.column_name).join(', '));

// 年化快照（最新几条）
const ann = await q(`
  SELECT s.*
  FROM "wealth_annual_snapshots" s JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
  WHERE l."wealth_product_id" = 3 ORDER BY s."snapshot_date" DESC LIMIT 5`);
console.log('\n=== 年化快照(最近5条) ===');
ann.forEach((r) => console.log(JSON.stringify(r)));

// 净值明细
const navs = await q(`
  SELECT n."nav_date", n."unit_nav"
  FROM "wealth_navs" n JOIN "wealth_navs_product_lnk" l ON l."wealth_nav_id" = n.id
  WHERE l."wealth_product_id" = 3 ORDER BY n."nav_date" DESC`);
console.log('\n=== 净值数量 ===', navs.length);
const fmt = (d) => d.toISOString().slice(0, 10);

function annualized(end, start, days) {
  if (!start || !end || days <= 0 || start <= 0) return null;
  return Math.pow(end / start, 365 / days) - 1;
}

const latestNav = navs[0];
if (latestNav) {
  const ranges = { '近1月': 30, '近3月': 90, '近半年': 182, '近1年': 365 };
  console.log('\n=== 实际年化收益率计算 ===');
  for (const [label, days] of Object.entries(ranges)) {
    const target = new Date(latestNav.nav_date);
    target.setDate(target.getDate() - days);
    let startNav = null;
    for (const r of navs) {
      if (r.nav_date <= target) { startNav = r; break; }
    }
    if (startNav) {
      const actualDays = Math.max(1, Math.round((latestNav.nav_date - startNav.nav_date) / 86400000));
      const ar = annualized(Number(latestNav.unit_nav), Number(startNav.unit_nav), actualDays);
      console.log(`${label}(${fmt(startNav.nav_date)} ~ ${fmt(latestNav.nav_date)}, ${actualDays}天): ${(ar * 100).toFixed(4)}%`);
    } else {
      console.log(`${label}: 数据不足，起始日期 ${fmt(target)} 无净值`);
    }
  }
  console.log(`最新净值: ${latestNav.unit_nav} (${fmt(latestNav.nav_date)})`);
}

await client.end();
