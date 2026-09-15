# 财富产品筛选与趋势对比完善设计

> **日期：** 2026-09-16
> **范围：** zhao-wealth 插件（basic 仓库）+ C 端前端（strapi-wealth 仓库）
> **目标：** 修复客户筛选产品的明确缺陷，新增多产品趋势同图对比，帮助客户筛选产品、分析趋势

## 1. 背景与目标

C 端财富大厅（v.joho.cn/wealth）已具备搜索、筛选（类型/风险/排序/运作模式）、评分榜单、产品详情（年化趋势/净值走势/风险指标/年度收益）、对比（指标表格）。审查发现：

1. **hall 类型筛选缺 `money-wealth`（货币理财）**：`TYPES` 仅有 bank-wealth/stock-fund/bond-fund/mixed-fund/money-fund，幸福99 等货币理财无法按类型筛选（明确缺陷）
2. **排序缺"近7日年化"**：货币理财/货币基金的最直观收益口径是 7 日年化，当前排序只有 score/annual1m/volatility
3. **对比页选品无搜索**：100+ 产品硬翻，体验差
4. **对比页只有指标快照表格**，无多产品趋势同图，客户无法直观对比走势（核心诉求）

## 2. 方案总览

采用**后端统一口径 + 前端同图**方案：

- 缺陷修复 3 项（hall 类型筛选、排序 7 日年化、对比选品搜索）
- 后端新增 `GET /v1/wealth/compare/trend` 接口，统一输出累计收益率对齐序列
- 前端 compare 页新增趋势对比卡片，多产品 SVG 折线同图

## 3. 缺陷修复

### 3.1 hall 类型筛选补货币理财

- 文件：`strapi-wealth/pages/hall/index.vue`
- `TYPES` 追加 `'money-wealth'`，`typeLabels` 追加 `'货币理财'`（排在货币基金之后）
- 后端无需改动（`findList` 已支持 `productType` 过滤）

### 3.2 排序加 7 日年化

- C 端：`SORT_OPTIONS` 加 `{ key: 'annual7d', label: '近7日年化' }`
- 后端：`product.findList` 的 `sortBy` 增加 `annual7d` 分支——按产品最新年化快照的 `annual7d` 字段排序（desc）
- 实现参考现有 `annual1m` 排序逻辑（联表年化快照取最新一条）

### 3.3 对比选品加搜索

- 文件：`strapi-wealth/pages/compare/index.vue`
- 选品弹窗顶部加搜索输入框，防抖调 `getProductList({ productName, page:1, pageSize:100 })` 刷新选品列表

## 4. 趋势对比接口（后端）

### 4.1 接口定义

```
GET /v1/wealth/compare/trend
Content-Auth: plugin::zhao-sso.sso-authenticated
参数：
  productIds: string 逗号分隔的产品 ID（≤3 个）
  period: 'm1' | 'm3' | 'm6' | 'y1'
响应：
{
  "code": 200, "msg": "success",
  "data": {
    "period": "m1",
    "startDate": "2026-08-17",
    "endDate": "2026-09-16",
    "dates": ["2026-08-17", ...],            // 统一日期轴（升序，去重）
    "series": [
      {
        "productId": 5,
        "productName": "...",
        "productType": "bank-wealth",
        "values": [0, 0.12, ...]              // 与 dates 等长，累计收益率 %，缺失前值填充
      }
    ]
  }
}
```

### 4.2 计算口径

1. **区间**：起点 = 今天 − period 自然日（m1=30、m3=90、m6=180、y1=365），终点 = 今天
2. **普通产品（非 money-wealth）**：
   - 取 `wealth_navs` 区间内净值（navDate ∈ [起点, 终点]，升序，limit 2000）
   - 基准 = 区间内**第一条**净值（若起点当日无净值，取区间内最早一条）
   - 每日 `value = (unitNav / 基准 − 1) × 100`
3. **货币理财（money-wealth）**：
   - 取 `wealth_money_incomes` 区间内收益记录（incomeDate ∈ [起点, 终点]，升序）
   - 从区间内第一条起，`value = Σ(tenThousandIncome / 10000) × 100`（万份收益累计即实际收益）
   - 若区间内无收益记录（新上线产品），返回空曲线
4. **对齐**：
   - `dates` = 所有产品点日期的并集（升序去重）
   - 每个产品按 `dates` 取值，缺失日期用**前值填充**（carry-forward）；日期早于产品首点则补 0
   - 对齐后曲线点数一致，前端按索引等距绘制（与 detail 页 line-chart 一致）

### 4.3 边界处理

- 产品不足 2 个或超过 3 个 → `errorResponse(400, '请选择 2-3 个产品')`
- 产品不存在或下架 → `errorResponse(404, '产品不存在')`
- 全部产品区间内点数 < 2 → 前端提示"数据积累中"，不画图（接口正常返回空 values）
- 净值/收益序列上限 2000 条（y1 场景足够）

## 5. 前端趋势对比

### 5.1 compare 页新增"趋势对比"卡片

- 位置：指标表格卡片之后
- 周期跟随现有 `COMPARE_PERIODS` tab（近1月/近3月/近6月/近1年）
- 交互：点击"开始对比"后并行请求 `compareProducts` + `compareTrend`，两个卡片同时渲染
- 图表：SVG 多折线同图（复用 detail 页 line-chart 绘制思路）：
  - X 轴按索引等距，标注起止日期（与 detail 页一致）
  - Y 轴标注区间最大值/最小值（%）
  - 图例：产品名 + 颜色区分；货币理财曲线用虚线
  - 点位 tooltip 显示日期 + 产品累计收益（点击热区，同 detail 页）
- 无数据提示："数据积累中，暂不展示趋势"

### 5.2 API 层

- `strapi-wealth/services/api.ts` 新增 `compareTrend(productIds, period)`，调 `/v1/wealth/compare/trend`

## 6. 测试

### 6.1 后端单测（zhao-wealth 插件 `__tests__`）

- `compare-trend` 套件：
  1. 普通产品净值归一化：给定净值序列，断言 value 序列 = (nav/首值−1)×100
  2. 货币理财万份收益累计：给定收益序列，断言 value = Σ(万份/10000)×100
  3. 对齐与前值填充：两产品日期不同，断言 dates 并集、缺失前值填充、早于首点补 0
  4. 边界：产品数非法 → 400；无数据 → 空曲线
- 复用现有测试基建（见 `plugins/zhao-wealth/server/__tests__` 既有套件模式）

### 6.2 C 端

- hall/compare 改动为纯展示层，随页面走查验证（无单测基建）

## 7. 部署

1. basic 仓库：zhao-wealth 插件 `npm run build` 重建 dist → 提交 → 推送 main
2. 部署 joho：git pull + dist 自检（grep `compare-trend`/`compareTrend`）+ pm2 restart
3. 部署后接口验证：`curl /api/zhao-wealth/v1/wealth/compare/trend`（需 SSO token，验证 401 非 404）
4. C 端 strapi-wealth：提交 push `wealth-line` 分支 → 部署 v.joho.cn/wealth
5. 线上走查：hall 筛选货币理财、排序 7 日年化、对比页趋势图

## 8. 风险与备注

- **净值稀疏产品**：新上线/采集缺失产品曲线点少，<2 点不展示（与 detail 页一致）
- **口径差异说明**：普通产品为净值涨跌，货币理财为实际收益累计，统一"累计收益率%"后可比；界面图例注明
- **sortBy annual7d**：货币理财 annual7d 有值（年化快照字段齐全），非货币产品该字段可能为空，排序时空值排末尾
- 全部改动不新增依赖，不触碰 vue/deps 版本（遵守 web/shao 目录铁律）
