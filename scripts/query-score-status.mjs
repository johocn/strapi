import { Client } from 'pg';

const client = new Client({
  host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin',
});
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
await client.connect();

// 1. 评分快照
const scores = await q(`
  SELECT s.period, s."snapshot_date", s."composite_score", s."star_rating",
         s."return_score", s."volatility_score", s."drawdown_score", s."peer_rank_score", s."weight_profile"
  FROM "wealth_score_snapshots" s
  JOIN "wealth_score_snapshots_product_lnk" l ON l."wealth_score_snapshot_id" = s.id
  WHERE l."wealth_product_id" = 3 ORDER BY s.period, s."snapshot_date" DESC`);
console.log('=== 评分快照(产品3) ===');
scores.forEach((r) => console.log(JSON.stringify(r)));

// 2. 年化快照数量与日期范围
const ann = await q(`
  SELECT COUNT(*)::int AS cnt, MIN(s."snapshot_date") AS min_d, MAX(s."snapshot_date") AS max_d
  FROM "wealth_annual_snapshots" s
  JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
  WHERE l."wealth_product_id" = 3`);
console.log('\n=== 年化快照(产品3) ===', JSON.stringify(ann[0]));

// 3. 最新一条年化快照的所有年化字段
const latest = await q(`
  SELECT s."snapshot_date", s."annual_1_d", s."annual_3_d", s."annual_7_d", s."annual_2_w",
         s."annual_1_m", s."annual_3_m", s."annual_6_m", s."annual_1_y"
  FROM "wealth_annual_snapshots" s
  JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
  WHERE l."wealth_product_id" = 3 ORDER BY s."snapshot_date" DESC LIMIT 1`);
console.log('\n=== 最新年化快照 ===');
latest.forEach((r) => console.log(JSON.stringify(r)));

// 4. 年化快照每日分布（近10条）
const recent = await q(`
  SELECT s."snapshot_date", s."annual_1_m", s."annual_3_m", s."annual_6_m", s."annual_1_y"
  FROM "wealth_annual_snapshots" s
  JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
  WHERE l."wealth_product_id" = 3 ORDER BY s."snapshot_date" DESC LIMIT 10`);
console.log('\n=== 年化快照近10条 ===');
recent.forEach((r) => console.log(JSON.stringify(r)));

await client.end();
