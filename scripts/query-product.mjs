import { Client } from 'pg';

const client = new Client({
  host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin',
});
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
await client.connect();

const PID = 3;

// 产品基本信息
const products = await q(`
  SELECT id, "product_name", "product_type", "operation_mode", "risk_level", "status", "recommend_weight"
  FROM "wealth_products" WHERE id = $1`, [PID]);
console.log('=== 产品信息 ===', JSON.stringify(products[0]));

// 年化快照关联数量
const annCnt = await q(`
  SELECT COUNT(*) AS cnt FROM "wealth_annual_snapshots_product_lnk" WHERE "wealth_product_id" = $1`, [PID]);
console.log('=== 年化快照关联数量 ===', JSON.stringify(annCnt[0]));

// 年化快照记录的 snapshot_date 分布（有多少天有数据）
const annDates = await q(`
  SELECT MIN(s."snapshot_date") AS min_date, MAX(s."snapshot_date") AS max_date, COUNT(*) AS cnt
  FROM "wealth_annual_snapshots" s JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
  WHERE l."wealth_product_id" = $1`, [PID]);
console.log('=== 年化快照日期范围 ===', JSON.stringify(annDates[0]));

// 评分快照全部
const scores = await q(`
  SELECT s.id, s."snapshot_date", s.period, s."composite_score", s."return_score", s."volatility_score", s."drawdown_score", s."weight_profile"
  FROM "wealth_score_snapshots" s JOIN "wealth_score_snapshots_product_lnk" l ON l."wealth_score_snapshot_id" = s.id
  WHERE l."wealth_product_id" = $1 ORDER BY s."snapshot_date" DESC`, [PID]);
console.log('=== 全部评分快照 ===');
scores.forEach((r) => console.log(JSON.stringify(r)));

// 风险指标在 m1 的所有 volatility 记录（验证是否有非0）
const vols = await q(`
  SELECT m."snapshot_date", m."metric_value" FROM "wealth_risk_metrics" m
  JOIN "wealth_risk_metrics_product_lnk" l ON l."wealth_risk_metric_id" = m.id
  WHERE l."wealth_product_id" = $1 AND m.period = 'm1' AND m."metric_name" = 'volatility'
  ORDER BY m."snapshot_date" DESC LIMIT 5`, [PID]);
console.log('=== m1 volatility 记录(最近5) ===');
vols.forEach((r) => console.log(r.snapshot_date.toISOString().slice(0,10), r.metric_value));

await client.end();
