# 理财产品净值监察设计（2026-09-14）

## 背景与目标

zhao-wealth 现有 3 款理财产品（青银、渤银、杭银），净值采集与年化/风险指标计算链路已存在，但缺乏**监察视角**：无法一眼看出「净值是否新鲜、年化是否已重算、风险指标是否已覆盖」。

目标：管理端新增**净值监察看板**，每款产品展示：
- 最新净值及日期
- 年化收益及日期
- 风险指标及日期
- 三键手动纠偏：重新采集净值 / 重算年化 / 风险重算

## 数据现状（2026-09-14 查证）

| 产品 | id | 采集源 | 净值条数 | 净值日期范围 | 年化快照 | 风险指标 |
|---|---|---|---|---|---|---|
| 青银理财（Z7003526000385） | 1 | chinawealth | 10 | 08-28 ~ 09-10 | 10 条 | **0 行** |
| 渤银理财 | 2 | cbhb | 241 | 2025-09-15 ~ 09-11 | 241 条 | **0 行** |
| 杭银理财 | 3 | hzbank | 16 | 08-27 ~ 09-12 | 16 条 | **0 行** |

关键发现：
1. **除渤银外，青银、杭银均有净值**（数据量少、更新滞后 2~4 天）。
2. **风险指标表 0 行是必然结果，非故障**：三款产品均为 2026-09-14 上午（06:53~10:21）经管理端采集入库创建（`wealth_products.created_at` 佐证），此前 20:00/20:30 定时任务日志的「0个产品」是因为当时**无产品存在**，`where: { status: true }` 过滤本身正常。今晚 20:00/20:30 定时任务将首次对 3 个产品自动执行，需验证。

## 设计决策（已与用户确认）

- 定位：**状态看板 + 手动纠偏**（不自动触发、不推送告警）
- 数据来源：**实时推导**（零 schema 变更）
- 展示位置：管理端 web **新建「净值监察」页面**
- 状态判定：**双维度**（净值新鲜度 + 年化/风险同步度）

## 后端设计

### 1. 新增 `services/monitor-service.ts`

核心方法 `getProductMonitorList()`：

1. 查询全部产品（populate company），不按 status 过滤（监察需覆盖全部产品）
2. 每产品实时推导三段数据：
   - `latestNav`：wealth-nav 按 navDate 降序取 1 条 → `{ navDate, unitNav, accNav, dataSource }`
   - `latestSnapshot`：wealth-annual-snapshot 按 snapshotDate 降序取 1 条 → `{ snapshotDate, annual1m, annual3m, annual6m, annual1y }`
   - `latestMetrics`：wealth-risk-metric 按 snapshotDate 降序取最新 4 指标 → `{ snapshotDate, volatility, maxDrawdown, sharpe, rankPercentile }`
3. 双维度状态判定：
   - **净值维度（新鲜度）**：最新净值日期距今天数（自然日）> 7 → `danger`；> 3 → `warning`；否则 `ok`（阈值常量 `NAV_STALE_YELLOW_DAYS=3` / `NAV_STALE_RED_DAYS=7`）
   - **年化维度（同步度）**：无快照 → `danger`；快照日期 < 最新净值日期 → `warning`；对齐 → `ok`
   - **风险维度（同步度）**：无指标记录 → `danger`；指标日期 < 最新净值日期 → `warning`；对齐 → `ok`
4. 返回：`{ list, summary }`，summary 为正常/预警/危险计数

### 2. 新增 controller + 路由

- `controllers/monitor.ts`：`list(ctx)` → `GET /v1/admin/monitor/products`
- 四步注册铁律：service → `services/index.ts`；controller → `controllers/index.ts`；route → `routes/admin-api.ts`
- 路由沿用 `adminRoute` 封装（`plugin::zhao-auth.is-authenticated` 策略）

### 3. 自动链路验证（原「前置修复」已排除）

产品今日创建、定时任务今晚首跑，无需代码修复。部署后验证：
- 当晚 20:00 日志应为「3个产品」年化计算、20:30 日志应为「3个产品」风险指标计算
- 次晨确认 `wealth_risk_metrics` 出现数据

## 前端设计

### 新增 `e:\code\web\src\pages\wealth\monitor\index.vue`

- 菜单入口「净值监察」（跟随现有 wealth 页面注册方式）
- 顶部汇总区：正常 / 预警 / 危险计数卡片 + 手动刷新按钮
- 产品监察表（每行）：
  - 产品名称 + 发行机构
  - 最新净值：数值 + 日期 + 状态色点
  - 年化收益：annual1m 值 + 快照日期 + 状态色点
  - 风险指标：波动率 / 最大回撤 / 夏普 + 指标日期 + 状态色点
  - 操作列三按钮（复用现有接口，成功 toast「任务已触发」，刷新查看状态）：
    - 重新采集 → `POST /admin/collect/trigger` `{ productId }`
    - 重算年化 → `POST /admin/recalculate` `{ productId }`
    - 风险重算 → `POST /admin/recalculate-risk-metric` `{ productId, type: 'risk-metric' }`

### API 封装

- 现有 wealth API 文件新增 `getProductMonitor()`（GET `/admin/monitor/products`）

## 测试与部署

1. 本机验证：monitor 接口返回 3 产品、三日期正确、状态判定符合预期
2. 部署链路（按既有铁律）：
   - 插件 `npm run build` 重建 dist → 提交 + push → `deploy.sh`
   - 管理端 web 构建部署
3. 自动链路验证：当晚 20:00/20:30 定时日志「3个产品」
4. 首次上线后：点「风险重算」补齐三款产品风险指标，确认 `wealth_risk_metrics` 出现数据、监察页状态转绿

## 风险点

- 风险指标今晚首跑，若 20:30 计算失败需次日排查（首次运行无历史参照）
- 风险指标全量重算较慢（遍历所有净值日期），三产品数据量小可接受
- 自然日阈值未考虑周末/节假日无净值场景，先以阈值可调 + 展示滞后天数兜底
