# 采集链路修复与年化计算健壮性设计

> 日期：2026-09-17
> 范围：zhao-wealth 插件 server 端
> 状态：设计确认，待实施

## 背景与症状

用户反馈：「收到采集没有更新净值、没有重算年化、没有重算风险评估，最后确认定时采集是否生效」。

## 排查结论（生产日志 + 数据库实证，9/17）

| 症状 | 实况 | 定性 |
|------|------|------|
| 定时采集是否生效 | 9/17 18:00:01 触发，8 产品全部采集成功（各新增 1 条净值，即 9/16 T+1 数据） | ✅ 生效 |
| 净值没更新 | 7 产品拿到 9/16 净值；产品1 最新停 9/15（源站滞后）。T+1 导致当天看不到当天净值 | ✅ 正常 |
| 年化没重算 | 9/16 快照全部存在（产品2/4/5/6/7 有值；产品1/3/8 成立不足 30 天全 null 属预期）。日志「0个产品」为锁竞争误报 | ✅ 正常 |
| 风险评估没重算 | 9/16 指标正常（sharpe/rank 有值）。**9/17 被写入 128 条无净值日指标，sharpe/rank 全 null，污染「最新」展示** | ❌ 真 Bug |

生产 bundle（514528 字节）与本地一致，链路代码已部署，排除部署缺失。

## 根因

1. **无净值日指标污染**：`calculate-risk-metric`（20:30 定时）对当日无净值的产品照样写指标。C 端/管理端取最新 snapshotDate 即拿到这组空值。
2. **年化补缺锁竞争误报**：`recalculate-product` 与 `recalculate-risk-metric-product` 是两个独立 Bull worker（每个 `queue.process()` 注册独立 worker，并行执行），同时调 `navCalculator.recalculateMissing` 抢同一把 `wealth:annual-snapshot:{id}` 锁，输家日志「跳过/0个产品」。
3. **短周期年化节假日失真**（本次新增）：
   - `getPreviousTradingDay` 按国家交易日历回溯，但银行理财在**调休工作日实际不发布净值** → prevDate 定位到「日历交易日但无净值」→ 1d/3d/7d 变 null。
   - `HOLIDAYS_2026` 硬编码只到 2026 年，2027 年起法定节假日全部失效。
   - 单日跳变（分红/拆分/错值）会算出极端年化值。

## 设计

### 修复块 1：无净值日跳过风险指标（核心）

**1.1 `calculateAndSaveMetrics` 开头加数据源检查**
- 净值型产品：查当日 `wealth-nav` 有无净值；货币型产品：查当日 `wealth-money-income` 有无万份收益。
- 均无 → 直接 return，不写任何指标记录。
- 生效路径：20:30 定时、采集后补缺、全量重算三路统一。

**1.2 `recalculateMissing` 只扫有数据日**
- missingDates 日期源按产品类型分流：净值型用净值日期集合，货币型用收益日期集合。
- 避免对无数据日重复无效扫描（幂等但省 DB 开销）。

### 修复块 2：货币型快照同类修复

**2.1 `calculateMoneyFundSnapshot` 开头检查当日万份收益**
- 当日无收益 → 返回 null（堵住产品3 那种「9/17 全 null 快照」）。

### 修复块 3：采集后去掉冗余年化触发（锁竞争）

**3.1 `collect-job.ts` 删除 `recalculate-product` 触发**
- `recalculate-risk-metric-product` 内部第一步即 `navCalculator.recalculateMissing(productId)`，年化补缺由它完成，`recalculate-product` 冗余。
- 只保留一行触发，锁竞争与「0个产品」误报日志消失。

### 修复块 4：短周期年化健壮性（1d/3d/7d）

**4.1 `calculateNavSnapshot` 短周期改「自然日回溯 + 最近实际净值日锚定」**

算法（仅 1d/3d/7d，2w 及以上保持 `getPreviousTradingDay` 现状）：
1. 一次查询该产品 `navDate <= snapshotDate` 的净值序列（按日期降序，limit 30）。
2. 对周期 N（1/3/7）：目标日期 `targetDate = snapshotDate - N 自然日`；从序列中取 `navDate <= targetDate` 的最近一条为 prevNav。
3. 实际间隔 `gap = getNaturalDays(prevNav.navDate, snapshotDate)`；年化公式不变（`(curr/prev)^(365/gap) - 1`）。
4. 容差防失真（宽松档，用户确认）：间隔上限 1d≤5、3d≤10、7d≤15 自然日，超出 → 该周期 null（数据太稀疏不硬算）。

预期效果：
- 周末：1d 间隔 3 天正常年化；调休工作日：自动锚到最近实际净值日。
- 国庆/春节长假：1d 锚到节前最后净值日，间隔 9 天左右，年化数值正确不缺失。
- 2027 年起无需维护节假日表（新逻辑不依赖交易日历）。

**4.2 异常年化钳制**
- 钳制阈值 ±100%（-1 ~ +1）。1d/3d/7d 年化超出 → 钳制到边界值，并置该快照 `isEstimate = true`（标记含钳制成分）。
- 防单日跳变（分红/拆分/错值）导致极端值污染榜单与详情页。

**4.3 isEstimate 判定**
- 由 7d 周期实际间隔判定：`gap7 < 7` → true；钳制发生时强制 true。

### 修复块 5：存量脏数据清理（部署后执行，先备份）

```sql
-- 备份
COPY wealth_risk_metrics TO '/tmp/wealth_risk_metrics_20260917_bak.csv' CSV HEADER;
COPY wealth_annual_snapshots TO '/tmp/wealth_annual_snapshots_20260917_bak.csv' CSV HEADER;

-- 清理 9/17 无净值日垃圾指标（当日所有产品均无净值/收益）
DELETE FROM wealth_risk_metrics WHERE snapshot_date = '2026-09-17';
-- 清理 9/17 无收益日货币型全 null 快照（产品3）
DELETE FROM wealth_annual_snapshots WHERE snapshot_date = '2026-09-17' AND annual_1_m IS NULL AND annual_3_m IS NULL AND annual_6_m IS NULL AND annual_1_y IS NULL;
```

C 端自动回落到 9/16 正常指标（sharpe/rank 有值）。

## 测试

| # | 用例 | 断言 |
|---|------|------|
| 1 | 长假场景：净值序列 9/30、10/9，快照日 10/9 | 1d/3d/7d 均非 null，间隔=9 |
| 2 | 调休场景：净值 10/9、10/12，快照日 10/12 | 1d 间隔=3，非 null |
| 3 | 稀疏场景：净值间隔 20 天，快照日有值 | 1d/3d/7d 全 null（超容差） |
| 4 | 跳变场景：1 天净值翻倍 | 年化钳制到 +100%，isEstimate=true |
| 5 | 无净值日指标：当日无净值/收益 | calculateAndSaveMetrics 不写任何记录 |
| 6 | 货币型无收益日快照 | calculateMoneyFundSnapshot 返回 null |
| 7 | 锁竞争：collect-single 成功后触发 | 只触发 recalculate-risk-metric-product，不再触发 recalculate-product |

## 部署

1. `plugins/zhao-wealth/` 下 `npm run build` 重建 dist（**铁律：不重建 dist 功能静默失效**）。
2. git commit + push（basic 仓库）。
3. `deploy.sh` 部署 joho，`pm2 restart strapi`。
4. 执行清理 SQL（先备份）。
5. 验证：`GET /api/zhao-wealth/v1/admin/collect/status`；C 端详情页风险评估回落 9/16；手动触发一次采集确认无「0个产品」误报、9/16 快照/指标不重复写。

## 风险点

- 删除为 DB 直删，先备份 CSV，可回滚。
- 短周期锚定改变 1d/3d/7d 数值口径（间隔从「交易日」变「实际自然日」），对正常日更产品数值不变（间隔=1/3/7），仅节假日/缺失场景由 null 变为有效值或钳制值，属改善。
- 钳制阈值 ±100% 对刚成立产品（1-2 天数据）可能误钳制——成立初期数据不足时各周期多为 null，影响极小；如出现误钳制可单独放宽。
