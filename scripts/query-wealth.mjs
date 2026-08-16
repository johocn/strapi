import { Client } from 'pg';

const client = new Client({
  host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin',
});
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
await client.connect();

const PID = 3;

// 净值数量与日期范围
const navStat = await q(`
  SELECT COUNT(*) AS cnt, MIN(n."nav_date") AS min_date, MAX(n."nav_date") AS max_date
  FROM "wealth_navs" n JOIN "wealth_navs_product_lnk" l ON l."wealth_nav_id" = n.id
  WHERE l."wealth_product_id" = $1`, [PID]);
console.log('=== 净值统计 ===', JSON.stringify(navStat[0]));

// 净值明细（最近30条）
const navs = await q(`
  SELECT n."nav_date", n."unit_nav", n."acc_nav"
  FROM "wealth_navs" n JOIN "wealth_navs_product_lnk" l ON l."wealth_nav_id" = n.id
  WHERE l."wealth_product_id" = $1 ORDER BY n."nav_date" DESC LIMIT 30`, [PID]);
console.log('\n=== 净值明细(最近30条) ===');
navs.forEach((r) => console.log(r.nav_date.toISOString().slice(0,10), r.unit_nav, r.acc_nav));

// 各周期风险指标的 snapshot_date（确认是否最新）
const metricDates = await q(`
  SELECT m.period, m."metric_name", m."metric_value", m."snapshot_date"
  FROM "wealth_risk_metrics" m JOIN "wealth_risk_metrics_product_lnk" l ON l."wealth_risk_metric_id" = m.id
  WHERE l."wealth_product_id" = $1 ORDER BY m.period, m."metric_name", m."snapshot_date" DESC`, [PID]);
console.log('\n=== 风险指标明细(最新每周期每指标) ===');
const seen = {};
metricDates.forEach((r) => {
  const k = r.period + '|' + r.metric_name;
  if (!seen[k]) { seen[k] = 1; console.log(r.period, r.metric_name, r.metric_value, r.snapshot_date.toISOString().slice(0,10)); }
});

// 评分快照的 snapshot_date 与生成时间
const scores = await q(`
  SELECT s."snapshot_date", s.period, s."composite_score", s."return_score", s."volatility_score", s."drawdown_score", s."weight_profile", s."created_at"
  FROM "wealth_score_snapshots" s JOIN "wealth_score_snapshots_product_lnk" l ON l."wealth_score_snapshot_id" = s.id
  WHERE l."wealth_product_id" = $1 ORDER BY s."snapshot_date" DESC`, [PID]);
console.log('\n=== 评分快照 ===');
scores.forEach((r) => console.log(JSON.stringify(r)));

await client.end();