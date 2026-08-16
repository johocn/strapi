// 直接写入正确的风险指标和评分数据到数据库（绕过 Strapi 启动冲突）
// 已通过 verify-metrics.mjs 验证了计算逻辑
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1', port: 5432, database: 'strapi', user: 'postgres', password: 'admin',
});

async function q(sql, params = []) {
  return (await client.query(sql, params)).rows;
}

async function main() {
  await client.connect();
  const PID = 3;
  // 使用本地时区日期（避免 toISOString 偏差一天）
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  console.log(`[fix] 产品=${PID}, 日期=${todayStr}`);

  // 1. 获取所有净值用于计算
  const navs = await q(`
    SELECT n."nav_date", n."unit_nav" FROM "wealth_navs" n
    JOIN "wealth_navs_product_lnk" l ON l."wealth_nav_id" = n.id
    WHERE l."wealth_product_id" = $1 ORDER BY n."nav_date" ASC`, [PID]);

  const toMS = (d) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

  // 2. 计算各周期指标
  // 与后端 risk-metric-service 一致：窗口终点 = 快照日期（今日）
  const periods = { m1: 30, m3: 90, m6: 180, y1: 365 };
  const endTime = new Date(todayStr).getTime();

  for (const [period, days] of Object.entries(periods)) {
    const cutoff = new Date(endTime - days * 86400000);
    const window = navs.filter(n => toMS(n.nav_date) >= cutoff.getTime());

    // 波动率
    let volatility = null;
    if (window.length >= 2) {
      const returns = [];
      for (let i = 1; i < window.length; i++) {
        const prev = Number(window[i-1].unit_nav);
        const curr = Number(window[i].unit_nav);
        if (prev > 0) returns.push(curr / prev - 1);
      }
      if (returns.length >= 2) {
        const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
        volatility = Math.sqrt(variance) * Math.sqrt(250);
      }
    }

    // 最大回撤
    let maxDrawdown = 0;
    if (window.length >= 2) {
      let peak = Number(window[0].unit_nav);
      for (const n of window) {
        const v = Number(n.unit_nav);
        if (v > peak) peak = v;
        if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - v) / peak);
      }
    }
    maxDrawdown = -maxDrawdown; // 返回负数

    // 夏普比率（无风险利率 2%）
    const annualReturn = window.length >= 2
      ? Math.pow(Number(window[window.length - 1].unit_nav) / Number(window[0].unit_nav), 365 / days) - 1
      : null;
    const sharpe = (annualReturn !== null && volatility !== null && volatility > 0)
      ? (annualReturn - 0.02) / volatility
      : null;

    console.log(`  ${period} (${days}天): 数据=${window.length}, 波动率=${volatility ? (volatility*100).toFixed(6) : 'null'}%, 回撤=${maxDrawdown ? (maxDrawdown*100).toFixed(6) : '0'}%, 夏普=${sharpe !== null ? sharpe.toFixed(4) : 'null'}, 年化=${annualReturn !== null ? (annualReturn*100).toFixed(4) : 'null'}%`);

    // 删除该产品该周期的旧指标（不限定日期，确保覆盖旧错误数据）
    await q(`DELETE FROM "wealth_risk_metrics" m USING "wealth_risk_metrics_product_lnk" l
      WHERE l."wealth_risk_metric_id" = m.id AND l."wealth_product_id" = $1 AND m.period = $2`, [PID, period]);

    // 写入新指标（波动率、回撤、夏普）
    const metrics = [
      { name: 'volatility', value: volatility },
      { name: 'maxDrawdown', value: maxDrawdown },
      { name: 'sharpe', value: sharpe },
      { name: 'rankPercentile', value: 50 }, // 同类样本不足，给中性分
    ];

    for (const m of metrics) {
      const ins = await q(`INSERT INTO "wealth_risk_metrics" ("snapshot_date", period, "metric_name", "metric_value", created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`, [todayStr, period, m.name, m.value]);

      // 创建关联
      await q(`INSERT INTO "wealth_risk_metrics_product_lnk" ("wealth_risk_metric_id", "wealth_product_id")
        VALUES ($1, $2)`, [ins[0].id, PID]);
    }
  }

  // 3. 计算评分
  const config = {
    scoreWeights: {
      'bank-wealth:daily-open': { returns: 0.70, volatility: 0.20, drawdown: 0.10, peerRank: 0.00 },
    },
    scoreScales: { returnScale: 0.06, volatilityScale: 0.10, drawdownScale: 0.05 },
    starThresholds: { five: 90, four: 75, three: 60, two: 40 },
  };

  const PERIOD_SCORES = ['m1', 'm3', 'm6', 'y1'];
  for (const period of PERIOD_SCORES) {
    const days = periods[period];
    // 取最新年化
    const ann = await q(`
      SELECT s.* FROM "wealth_annual_snapshots" s
      JOIN "wealth_annual_snapshots_product_lnk" l ON l."wealth_annual_snapshot_id" = s.id
      WHERE l."wealth_product_id" = $1 ORDER BY s."snapshot_date" DESC LIMIT 1`, [PID]);

    const fieldMap = { m1: 'annual_1_m', m3: 'annual_3_m', m6: 'annual_6_m', y1: 'annual_1_y' };
    const rawAnnual = ann.length > 0 ? ann[0][fieldMap[period]] : null;
    // 数据不足（该周期年化字段为空，如产品历史不足半年/1年）时跳过评分，避免误算为 0 分
    if (rawAnnual === null || rawAnnual === undefined) {
      console.log(`  [${period}] 数据不足（${fieldMap[period]} 为空），跳过评分`);
      // 清理可能存在的旧评分（避免残留误导数据）
      await q(`DELETE FROM "wealth_score_snapshots" s USING "wealth_score_snapshots_product_lnk" l
        WHERE l."wealth_score_snapshot_id" = s.id AND l."wealth_product_id" = $1 AND s.period = $2`, [PID, period]);
      continue;
    }
    const annualReturn = Number(rawAnnual);

    // 取最新风险指标
    const metrics = await q(`
      SELECT m."metric_name", m."metric_value" FROM "wealth_risk_metrics" m
      JOIN "wealth_risk_metrics_product_lnk" l ON l."wealth_risk_metric_id" = m.id
      WHERE l."wealth_product_id" = $1 AND m.period = $2
      ORDER BY m."snapshot_date" DESC LIMIT 4`, [PID, period]);

    const metricMap = {};
    for (const m of metrics) {
      if (!metricMap[m.metric_name]) metricMap[m.metric_name] = m.metric_value;
    }

    const vol = metricMap['volatility'];
    const dd = metricMap['maxDrawdown'];

    // 绝对标尺评分
    const returnScore = annualReturn !== null && !isNaN(annualReturn)
      ? Math.max(0, Math.min(100, Math.round(annualReturn / config.scoreScales.returnScale * 100)))
      : 50;
    const volatilityScore = vol !== null && !isNaN(vol)
      ? Math.max(0, Math.min(100, Math.round((1 - vol / config.scoreScales.volatilityScale) * 100)))
      : 50;
    const drawdownScore = dd !== null && !isNaN(dd)
      ? Math.max(0, Math.min(100, Math.round((1 + dd / config.scoreScales.drawdownScale) * 100)))
      : 50;

    const weights = config.scoreWeights['bank-wealth:daily-open'];
    const compositeScore = Math.round(
      returnScore * weights.returns +
      volatilityScore * weights.volatility +
      drawdownScore * weights.drawdown +
      50 * weights.peerRank
    );

    // 星级
    const t = config.starThresholds;
    const starRating = compositeScore >= t.five ? 5 : compositeScore >= t.four ? 4 : compositeScore >= t.three ? 3 : compositeScore >= t.two ? 2 : 1;

    console.log(`  [${period}] 收益分=${returnScore}, 波动分=${volatilityScore}, 回撤分=${drawdownScore}, 综合=${compositeScore}, 星级=${starRating}`);

    // 删除该产品该周期的旧评分（不限定日期）
    await q(`DELETE FROM "wealth_score_snapshots" s USING "wealth_score_snapshots_product_lnk" l
      WHERE l."wealth_score_snapshot_id" = s.id AND l."wealth_product_id" = $1 AND s.period = $2`, [PID, period]);

    // 创建新评分
    const ins = await q(`INSERT INTO "wealth_score_snapshots"
      ("snapshot_date", period, "composite_score", "star_rating", "return_score", "volatility_score", "drawdown_score", "peer_rank_score", "weight_profile", created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING id`,
      [todayStr, period, compositeScore, starRating, returnScore, volatilityScore, drawdownScore, 50, 'bank-wealth:daily-open']);

    await q(`INSERT INTO "wealth_score_snapshots_product_lnk" ("wealth_score_snapshot_id", "wealth_product_id")
      VALUES ($1, $2)`, [ins[0].id, PID]);
  }

  console.log('\n[fix] 完成！');
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });