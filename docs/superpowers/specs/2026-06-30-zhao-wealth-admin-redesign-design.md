# zhao-wealth Admin 重构设计

> **状态**：待 review
> **日期**：2026-06-30
> **范围**：`basic/plugins/zhao-wealth/admin/src/` 全面重构 + 配套后端接口扩展

---

## 1. 背景与目标

### 1.1 背景

现有 admin 共 9 个页面，使用 `@strapi/design-system` 手写 Table，存在以下问题：
- HomePage 统计数据为 mock 写死 0
- 表格无分页/搜索/排序，运营体验差
- 模块按"功能罗列"，无运营工作流视角
- 推荐配置独立成表但本质是产品扩展属性，导致运营需跨页面编辑
- CustomerProduct 是统计看板却被归为"配置"，语义混乱
- 缺少业绩归因（4 指标 × 4 周期）可视化，无法支撑财富顾问专业决策

### 1.2 目标

**核心定位**：功能定位清晰，方便组织数据支持财富顾问与财富决策。

**重构目标**：
1. 按运营工作流重组模块，从 9 页面精简为 4 模块
2. 引入 ProTable/ProForm/ECharts，提升开发效率与运营体验
3. 新增指标中心，可视化 4 指标 × 4 周期，支撑顾问向客户解释产品风险收益特征
4. 推荐字段并入产品表单，废弃 recommend-config 独立表
5. 仪表盘承载决策视图（统计 + 客户关注热度 + 异常监控）

### 1.3 非目标

- 不涉及 C 端（uni-app/Next.js）页面改造
- 不实现分渠道推荐、定时上下架、A/B 测试
- 不重写采集器逻辑（cbhb-collector 等保持原样）
- 不新增单元测试与 API 文档

---

## 2. 模块划分

### 2.1 原 9 页面职责分析

| 原页面 | 实际内容 | 数据特征 |
|--------|---------|---------|
| HomePage | 5 个 mock 统计 + 6 个功能入口 | 假数据 |
| CompanyPage | 公司 CRUD（5 字段） | 低频基础数据 |
| ProductPage | 产品列表（无分页搜索） | 核心实体 |
| ProductFormPage | 产品表单 | 核心实体 |
| CollectConfigPage | 采集规则配置 + 触发 | 高频运营操作 |
| NavDataPage | 单产品净值明细 + 补录 + 重算 | 中频，与采集强相关 |
| RecommendPage | 推荐配置 CRUD | 产品扩展属性 |
| CustomerProductPage | 关注热度统计 + 自选记录（只读） | 统计看板，非配置 |

### 2.2 重构后 4 模块

| 模块 | 职责 | 替换原页面 |
|------|------|-----------|
| 仪表盘 | 全局统计 + 客户关注热度 + 异常监控 | HomePage + CustomerProductPage |
| 采集监控 | 采集配置 + 触发 + 净值查看 + 补录 + 重算（Tab 分流） | CollectConfigPage + NavDataPage |
| 指标中心 | 4 指标 × 4 周期可视化 + 同类对比 + 手动重算 | 新增 |
| 产品管理 | 产品 CRUD + 公司管理 Tab + 推荐字段并入表单 | ProductPage + ProductFormPage + CompanyPage + RecommendPage |

### 2.3 合并决策理由

- **采集监控合并**：CollectConfig（怎么采）+ NavData（采到什么+补录）强相关，合并后运营一处完成"配置→触发→查看→补录→重算"闭环
- **CustomerProduct 移入仪表盘**：是 C 端客户行为统计，是顾问决策输入信号，不是配置
- **Company 降为 Tab**：5 字段低频基础数据，独立入口浪费
- **Recommend 并入产品表单**：本质是产品运营字段，独立页面是"为页面而页面"
- **删除配置中心**：原配置中心塞了 Recommend（产品属性）+ CustomerProduct（统计看板），两者都不是配置，强行凑模块定位模糊

---

## 3. 技术栈

### 3.1 选型

| 层 | 选型 | 理由 |
|----|------|------|
| UI 组件库 | antd 5 | 生产级稳定，运营熟悉风格 |
| 表格 | @ant-design/pro-components (ProTable) | 内置分页/搜索/筛选/列配置 |
| 表单 | ProForm / ModalForm | schema 驱动，减少手写 |
| 图表 | ECharts + echarts-for-react | 国内金融场景事实标准，模板丰富，稳定性碾压 antd-charts |
| 路由 | react-router-dom v6 | Strapi admin 内置 |
| 数据请求 | useFetchClient | 复用 Strapi 鉴权 |
| 状态管理 | 组件内 useState | 不引入 Redux/SWR，避免过度设计 |

### 3.2 样式隔离

Antd 5 与 Strapi Design System 共存会样式冲突。方案：

```tsx
<ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
  {/* 插件内容 */}
</ConfigProvider>
```

- Antd 类名前缀变为 `.zw-btn` `.zw-table`，不污染 Strapi 全局
- 业务自定义样式以 `.zhao-wealth-admin` 容器命名空间开头
- 不引入 Tailwind

### 3.3 依赖

在 `basic/plugins/zhao-wealth/admin` 安装：
- `antd@^5`
- `@ant-design/pro-components`
- `echarts` + `echarts-for-react`
- `@ant-design/icons`

---

## 4. 模块详细设计

### 4.1 仪表盘

**布局**：
```
┌─────────────────────────────────────────────┐
│ 顶部统计卡片（4 个）                          │
│ [产品总数] [采集成功率] [指标覆盖率] [今日异常] │
├─────────────────────────────────────────────┤
│ 左：客户关注热度 Top10（横向条形图）           │
│ 右：采集状态分布（饼图）                      │
├─────────────────────────────────────────────┤
│ 底部：近期异常列表（表格，最近 10 条）         │
└─────────────────────────────────────────────┘
```

**数据来源**：
- 统计卡片：新增 `GET /stats/overview` 聚合接口
- 关注热度：复用 `/customer-products`，前端聚合 Top10
- 采集分布：复用 `/collect-configs`，前端聚合
- 异常列表：新增 `GET /stats/anomalies` 接口

### 4.2 采集监控

**布局（Tab 分流）**：
```
[采集任务] [净值明细] [操作日志]
```

**Tab1 采集任务（ProTable）**：
- 列：产品名/采集方式/URL/状态/最后采集/失败次数
- 操作：编辑配置（ModalForm）/触发采集
- 顶部统计：成功 X / 失败 Y / 待采 Z

**Tab2 净值明细**：
- 顶部产品选择器 + 日期范围筛选
- ProTable：日期/单位净值/累计净值/来源/操作
- 操作：新增净值（ModalForm）/重算年化
- 右侧：净值走势缩略图（ECharts Line）

**Tab3 操作日志**：
- 采集/重算/补录操作流水（ProTable，只读）
- MVP 阶段若无日志表，做空状态

### 4.3 指标中心

**布局**：
```
┌─────────────────────────────────────────────┐
│ 顶部筛选：产品选择 / 周期切换(m1/m3/m6/y1)    │
├─────────────────────────────────────────────┤
│ 指标卡片（4 个）                             │
│ [波动率] [最大回撤] [夏普比率] [同类排名百分位] │
│ 每卡含数值 + 评级标签(优/良/中/差)            │
├─────────────────────────────────────────────┤
│ 左：净值走势 + 回撤区间（ECharts 双轴）       │
│ 右：同类排名对比（横向条形图，本产品高亮）     │
├─────────────────────────────────────────────┤
│ 底部：4 指标历史趋势（多线图，按周期）        │
├─────────────────────────────────────────────┤
│ 底部操作：[手动重算]                          │
└─────────────────────────────────────────────┘
```

**评级规则**（前端常量 `constants/metricRating.ts`）：
- 波动率：<5% 优 / 5-10% 良 / 10-20% 中 / >20% 差
- 最大回撤：>-5% 优 / -5~-10% 良 / -10~-20% 中 / <-20% 差
- 夏普：>1 优 / 0.5-1 良 / 0-0.5 中 / <0 差
- 同类排名：<20% 优 / 20-50% 良 / 50-80% 中 / >80% 差

**数据来源**：
- 指标卡片：`GET /risk-metrics/admin/aggregate?productId&period`
- 净值走势：复用 `/products/:id/nav`
- 同类排名：`GET /risk-metrics/admin/peers?period&metricName`
- 历史趋势：`GET /risk-metrics/admin/trend?productId`
- 手动重算：复用现有 `POST /recalculate-risk-metric`

### 4.4 产品管理

**布局**：
```
[产品列表] [理财公司]
```

**Tab1 产品列表（ProTable）**：
- 搜索：产品名/代码
- 筛选：类型/风险/状态/推荐状态
- 列：名称/代码/类型/风险/公司/推荐权重/状态
- 操作：编辑（ModalForm）/删除/查看指标（跳转指标中心）

**Tab2 理财公司（ProTable）**：
- 列：名称/简称/类型/官网/状态
- 操作：新建/编辑/启用停用/删除

**产品编辑（ModalForm）**：
- 基础区：代码/名称/类型/风险/期限/公司/发行日/到期日
- 推荐区（Collapse 折叠，默认收起）：
  - `recommendEnabled`（Switch 启用推荐）
  - `recommendWeight`（InputNumber 推荐权重）
  - `recommendTags`（Select multiple 推荐标签：稳健型/高流动性/新客专享/进取型）
  - `recommendReason`（TextArea 推荐理由，maxLength 200）

---

## 5. 后端变更

### 5.1 Schema 变更

`wealth-product/schema.json` 新增 2 字段：

```json
{
  "recommendEnabled": { "type": "boolean", "default": false },
  "recommendReason": { "type": "text" }
}
```

复用已有字段：`recommendWeight`(integer)、`recommendTags`(json)。

**注意**：Strapi v5 schema 元数据存储在 `strapi_database_schema` 表，新增字段后需删除该表对应记录触发重建，或使用 force migration。

### 5.2 Migration

**路径**：`server/database/migrations/002_add_recommend_fields_to_product.js`

**职责**：
1. 给 `wealth_products` 表新增 `recommend_enabled`(boolean default false)、`recommend_reason`(text) 列
2. 数据迁移：从 `wealth_recommend_configs` 表读取现有推荐配置，回写到对应 product 的 `recommend_enabled`/`recommend_reason`/`recommend_weight`

**约束**（基于 project_memory）：
- migration 脚本签名必须 `up({ db })`，不可写 `up(db)`
- 需检查列是否已存在，保证幂等
- manyToOne 无外键列，本次新增是普通字段，无关系问题

### 5.3 新增接口

#### 5.3.1 仪表盘接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 全局概览 | GET | `/stats/overview` | 返回 productCount/companyCount/collectSuccessRate/riskMetricCoverage/todayAnomaly |
| 异常列表 | GET | `/stats/anomalies` | 返回最近 N 条采集失败 + 指标计算失败记录 |

**实现要点**：
- `collectSuccessRate` = success / (success+failed+pending)
- `riskMetricCoverage` = 有 risk_metric 记录的产品数 / 产品总数
- `anomalies` 查 collect_config where failCount>0 + risk_metric where metricValue is null

#### 5.3.2 指标中心接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 指标聚合 | GET | `/risk-metrics/admin/aggregate` | 按 productId+period 返回 4 指标值 |
| 历史趋势 | GET | `/risk-metrics/admin/trend` | 按 productId 返回 4 指标按日期序列 |
| 同类对比 | GET | `/risk-metrics/admin/peers` | 按 period+metricName 返回同类产品排名 |

**实现要点**：
- `aggregate`：查 wealth_risk_metrics where product+period，按 metricName 透视返回 `{ volatility, maxDrawdown, sharpe, rankPercentile }`
- `trend`：查同产品所有 snapshotDate 的 4 指标，按日期排序
- `peers`：查同 period 同 metricName 的所有产品，按 metricValue 排序，需 join product 表取产品名
- 复用 `risk-metric-service.ts` 计算逻辑，仅查询聚合不重算
- peers 查询命中已有索引 `wealth_risk_metrics_lookup_idx (snapshot_date, period, metric_name)`

### 5.4 路由注册

`routes/admin-api.ts` 新增：

```typescript
// 统计
{ method: 'GET', path: '/stats/overview', handler: 'admin-api.statsOverview' },
{ method: 'GET', path: '/stats/anomalies', handler: 'admin-api.statsAnomalies' },

// 指标中心
{ method: 'GET', path: '/risk-metrics/admin/aggregate', handler: 'risk-metric.adminAggregate' },
{ method: 'GET', path: '/risk-metrics/admin/trend', handler: 'risk-metric.adminTrend' },
{ method: 'GET', path: '/risk-metrics/admin/peers', handler: 'risk-metric.adminPeers' },
```

### 5.5 权限

`permissions.ts` 新增 actions：

```typescript
'wealth-stats': { actions: ['overview', 'anomalies'] },
'wealth-risk-metric': { actions: ['aggregate', 'trend', 'peers', 'recalculate'] },
```

### 5.6 废弃处理

- `wealth-recommend-config` 表：**停止读写**，保留数据不删
- 原有 `/recommend-configs` 接口：保留但不被前端调用（向后兼容）
- 原有 RecommendPage：删除文件

### 5.7 文件变更清单

**新增**：
- `server/database/migrations/002_add_recommend_fields_to_product.js`
- `server/src/services/stats-service.ts`
- 扩展 `server/src/services/risk-metric-service.ts`（新增 3 个 admin 查询方法）

**修改**：
- `server/src/content-types/wealth-product/schema.json`（+2 字段）
- `server/src/controllers/admin-api.ts`（+statsOverview/statsAnomalies）
- `server/src/controllers/risk-metric.ts`（+adminAggregate/adminTrend/adminPeers）
- `server/src/routes/admin-api.ts`（+5 路由）
- `server/src/permissions.ts`（+actions）

---

## 6. 前端实施

### 6.1 目录结构

```
admin/src/
├── index.ts                      # 保留（菜单注册）
├── pluginId.ts                   # 保留
├── App.tsx                       # 重写：ConfigProvider + 路由
├── components/
│   ├── Initializer.tsx           # 保留
│   ├── PluginIcon.tsx            # 保留
│   └── Layout/
│       └── PluginLayout.tsx      # 新增：左侧导航 + 内容区
├── pages/
│   ├── Dashboard/
│   │   ├── index.tsx
│   │   ├── StatCards.tsx
│   │   ├── AttentionChart.tsx
│   │   ├── CollectPie.tsx
│   │   └── AnomalyTable.tsx
│   ├── Collect/
│   │   ├── index.tsx             # Tab 容器
│   │   ├── TaskTab.tsx
│   │   ├── NavTab.tsx
│   │   └── LogTab.tsx            # MVP 空状态
│   ├── Metrics/
│   │   ├── index.tsx
│   │   ├── MetricCards.tsx
│   │   ├── NavChart.tsx
│   │   ├── PeerRank.tsx
│   │   └── TrendChart.tsx
│   └── Product/
│       ├── index.tsx             # Tab 容器
│       ├── ProductList.tsx
│       ├── CompanyList.tsx
│       └── ProductForm.tsx       # ModalForm
├── hooks/
│   └── useApi.ts                 # 重写：扩展所有接口
├── constants/
│   ├── enums.ts                  # 产品类型/风险/期限/标签枚举
│   └── metricRating.ts           # 指标评级规则
├── utils/
│   └── getTranslation.ts         # 保留
└── translations/
    ├── en.json                   # 保留
    └── zh-Hans.json              # 保留
```

**删除**：HomePage/CompanyPage/ProductPage/ProductFormPage/CollectConfigPage/NavDataPage/RecommendPage/CustomerProductPage

### 6.2 App.tsx 骨架

```tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Routes, Route } from 'react-router-dom';
import { PluginLayout } from './components/Layout/PluginLayout';
import Dashboard from './pages/Dashboard';
import Collect from './pages/Collect';
import Metrics from './pages/Metrics';
import Product from './pages/Product';

const App = () => (
  <ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="collect" element={<Collect />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="product" element={<Product />} />
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);

export { App };
```

**菜单注册**：单入口 + PluginLayout 内部导航，不污染 Strapi 主侧边栏。

### 6.3 实施顺序（5 阶段）

#### 阶段 1：基础设施
- 安装依赖
- 重写 App.tsx（ConfigProvider 包裹）
- 实现 PluginLayout（4 模块侧边导航）
- 重写 useApi hook（含所有接口定义）
- constants/enums.ts + metricRating.ts
- **验证**：插件能加载，导航切换无报错

#### 阶段 2：产品管理
- ProductList（ProTable + 筛选 + 操作）
- CompanyList（ProTable + CRUD）
- ProductForm（ModalForm，含推荐字段折叠面板）
- **验证**：能 CRUD 产品和公司，能配置推荐字段

#### 阶段 3：采集监控
- TaskTab（采集任务列表 + 编辑配置 + 触发采集）
- NavTab（净值列表 + 补录 + 重算 + 走势图）
- LogTab（MVP 空状态）
- **验证**：能编辑配置、触发采集、补录净值、看重算结果

#### 阶段 4：指标中心
- MetricCards（4 指标卡 + 评级）
- NavChart（净值走势 + 回撤区间）
- PeerRank（同类对比条形图）
- TrendChart（历史趋势多线图）
- 手动重算按钮
- **验证**：选产品+周期，4 图表正确渲染，重算可触发

#### 阶段 5：仪表盘
- StatCards（4 统计卡）
- AttentionChart（关注热度）
- CollectPie（采集分布）
- AnomalyTable（异常列表）
- **验证**：4 区域正确渲染，数据与各模块一致

### 6.4 提交策略

5 个 commit：
1. `feat(wealth-admin): 重构基础设施 - antd+echarts+布局`
2. `feat(wealth-admin): 重构产品管理模块`
3. `feat(wealth-admin): 重构采集监控模块`
4. `feat(wealth-admin): 新增指标中心模块`
5. `feat(wealth-admin): 重构仪表盘模块`

---

## 7. 风险点

| 风险 | 影响 | 应对 |
|------|------|------|
| Strapi v5 schema 重建 | 新增字段后表结构不更新 | 删除 strapi_database_schema 表对应记录或 force migration |
| Strapi admin webpack 联邦模块与 antd 冲突 | 插件加载失败 | 阶段 1 验证，必要时调整 webpack alias |
| ProTable 与 useFetchClient 集成 | 分页/搜索格式不匹配 | 包装 request 函数适配 params + 分页格式 |
| ECharts 实例销毁 | Tab 切换内存泄漏 | echarts-for-react 已处理，Tab 切换时确认 dispose |
| ConfigProvider 嵌套 | prefixCls 不生效 | 阶段 1 验证 Strapi admin 内部 ConfigProvider 嵌套情况 |
| Migration 幂等 | 重复执行报错 | 脚本检查列是否存在 |
| peers 接口性能 | 全表扫描慢 | 命中已有索引，MVP 可接受，后续可加缓存 |
| stats 接口实时性 | 每次全表扫描 | MVP 可接受，后续可加内存缓存或定时预计算 |
| 采集操作日志 Tab 无数据源 | Tab3 空洞 | MVP 空状态，后续补日志表 |

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 4 模块导航正常切换
- [ ] 产品管理：CRUD 产品/公司，推荐字段可配置保存
- [ ] 采集监控：3 Tab 切换，采集配置编辑/触发/净值补录/重算可用
- [ ] 指标中心：选产品+周期，4 图表正确渲染，重算可触发
- [ ] 仪表盘：4 统计卡数据真实，关注热度/采集分布图渲染，异常列表显示

### 8.2 技术验收

- [ ] ConfigProvider 样式隔离生效，不污染 Strapi admin
- [ ] antd 依赖正确打包，无控制台报错
- [ ] Migration 002 执行成功，recommend 字段数据迁移正确
- [ ] 5 个新后端接口返回正确数据
- [ ] 5 个 commit 提交，每个阶段可独立验证

### 8.3 废弃验收

- [ ] wealth-recommend-config 表数据保留不删
- [ ] 原 /recommend-configs 接口保留可访问
- [ ] 原 8 个页面文件已删除

---

## 9. 后续规划（不在本次范围）

- 分渠道推荐（product × channel × user-segment 关联表）
- 采集操作日志表与审计
- stats 接口缓存与预计算
- C 端理财详情页接入指标中心数据
