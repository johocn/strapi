import { Client } from 'pg';

const client = new Client({
  host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin',
});
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
await client.connect();

// 年化快照数量与范围
const stat = await q(`
  SELECT COUNT(*) AS cnt, MIN(s."snapshot_date") AS min_d, MAX(s."snapshot_date") AS max_d
  FROM "wealth_annual_snapshots" s JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
  WHERE l."wealth_product_id" = 3`);
console.log('=== 年化快照统计 ===', JSON.stringify(stat[0]));

// 净值数据从哪天开始（决定1个月/3个月/半年/1年图能画多长）
const navRange = await q(`
  SELECT MIN(n."nav_date") AS min_d, MAX(n."nav_date") AS max_d, COUNT(*) AS cnt
  FROM "wealth_navs" n JOIN "wealth_navs_product_lnk" l ON l."wealth_nav_id" = n.id
  WHERE l."wealth_product_id" = 3`);
console.log('=== 净值范围 ===', JSON.stringify(navRange[0]));

// 后端 annual snapshot 的 records 是否包含 d1/w1 等短周期字段（取最新一条）
const last = await q(`
  SELECT s."snapshot_date", s."annual_1_d", s."annual_3_d", s."annual_7_d", s."annual_2_w", s."annual_1_m"
  FROM "wealth_annual_snapshots" s JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
  WHERE l."wealth_product_id" = 3 ORDER BY s."snapshot_date" DESC LIMIT 1`);
console.log('=== 最新年化快照 ===', JSON.stringify(last[0]));

await client.end();
