# 货币型产品收益数据采集链路修复 设计文档

**日期**：2026-09-14
**状态**：待用户审阅
**范围**：仅采集链路（不涉及产品类型标注、监察页展示——展示规则由用户另行确认）

---

## 1. 背景与问题

幸福99（产品3，杭银理财货币型产品）在监察页显示"最新净值 1.0000、年化 0.00%"，被判定为"错误金融数据"。

排查结论：
- 杭银官网数据源对货币型产品发布的 `unit_net_value` 恒为 `1.0`（行业惯例），真实收益体现在 `ten_thousand_income`（万份收益）与 `seven_days_annualized_rate`（七日年化）
- 采集器 `hzbank-collector.collectNavData` 已正确提取这两个字段（生产实测：2026-09-13 万份收益 0.4876、七日年化 0.0188）
- **根因**：生产走 Redis 队列路径（`collect-single` → `processNavData`），该路径保存净值时**丢弃收益字段且从不写入 `wealth_money_incomes` 表**（该表已建但全空）。收益数据从未入库

## 2. 目标

修复队列采集路径，让货币型产品的万份收益/七日年化正确写入 `wealth_money_incomes`，并补采幸福99 历史收益数据。

## 3. 方案

参照同步降级路径 `collectNavSync`（`controllers/collect.ts` 已实现的收益写库逻辑），在队列路径 `processNavData`（`jobs/collect-job.ts`）中补齐收益写库。

### 3.1 修改 `jobs/collect-job.ts` 的 `processNavData`

对每条净值记录：
1. 拆分收益字段：`const { tenThousandIncome, sevenDayAnnualized, ...navOnly } = nav`
2. 净值保存逻辑不变（insert / skip / update，按"日期+净值"双条件）
3. 若 `tenThousandIncome != null || sevenDayAnnualized != null`：
   - 按 `product + incomeDate`（=navDate）查 `wealth-money-income`
   - 存在 → 更新 `tenThousandIncome` / `sevenDayAnnual` / `dataSource`
   - 不存在 → 创建
4. `dataSource` 统一 `'crawler'`

### 3.2 收益写库与净值保存的解耦

- 收益 upsert 独立于净值的 insert/update/skip 判定：同一日期净值跳过（同值）时，收益仍执行 upsert（覆盖收益更正场景）
- `insertCount` / `updateCount` 仍只统计净值维度，收益更新不影响这两个计数

### 3.3 补采历史数据

部署后触发一次产品3 采集（复用修复后的采集链路），验证 `wealth_money_incomes` 写入 17 条（2026-08-27 ~ 09-13）。

## 4. 测试

`__tests__/collect-job.test.ts` 新增用例：
1. 新日期：净值插入 + 收益创建（income 表 create 一次）
2. 同日期同净值：净值跳过 + 收益 upsert（income 表 update）
3. 同日期不同净值：净值更新 + 收益 upsert
4. 无收益字段（`tenThousandIncome`/`sevenDayAnnualized` 均为 null）：不写 income 表
5. `insertCount`/`updateCount` 仅统计净值维度

## 5. 不做（明确排除）

- 产品类型 `bank-wealth` → `money-fund` 标注（另行确认）
- 监察页/详情页货币型展示口径（展示规则由用户另行确认）
- C 端展示改动

## 6. 部署

- 插件 `npm run build` 重建 dist → git commit + push（遵守插件 dist 部署铁律）
- joho `git pull` + `pm2 restart strapi`
- 触发产品3 采集，验证 money_incomes 数据落库
