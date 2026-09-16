# 财富首页：统一近7日年化 + 最近更新排序 设计文档

> 日期：2026-09-16
> 范围：zhao-wealth 插件（basic 仓库 main 分支）+ C 端财富前端（strapi-wealth 仓库 wealth-line 分支）

## 目标

1. 首页（pages/hall/index）所有年化收益率展示统一为**近7日年化收益率**（主列表卡片、评分榜 Top5、推荐位）。
2. 首页默认排序改为**按最新净值日期降序**（数据最新在前），保留其他排序切换选项。
3. 补充体验优化：下拉刷新、数据更新提示、缺数据降级文案、推荐位同排序口径。

## 现状

- 后端 `product.ts`：
  - `enrichProducts` 已为每个产品查询最新净值（latestNav，含 navDate）、最新年化快照（annual1m/annual7d 等）
  - `sortProducts` 支持 `score` / `annual1m` / `annual7d` / `volatility`，无"最新净值日期"排序
- 后端 `recommend-service.ts`：推荐返回 `annual1y`，无 `annual7d`
- 后端 `scoring-service.ts`：`getScoreLeaderboard` 已补 `latestAnnual1m/3m/6m/1y`、`annual1m`，无 `annual7d`
- 前端 `AnnualCard`：货币类（latestSevenDayAnnual）显示"七日年化"，普通产品显示"近1月年化"（latestAnnual1m）
- 前端 hall 页：榜单显示近1月年化、推荐显示近1年年化、SORT_OPTIONS 默认"综合评分"

## 改动设计

### 后端（basic 仓库 plugins/zhao-wealth/server/src）

**1. product.ts — 最新净值日期排序与透传**
- `enrichProducts` 的 `result[pid]` 增加：
  ```ts
  latestNavDate: latestNav?.navDate ? String(latestNav.navDate).slice(0, 10) : null,
  ```
- `findList` 列表组装 map 增加：`latestNavDate: enrichedMap[product.id]?.latestNavDate ?? null,`
- `sortProducts` switch 新增：
  ```ts
  case 'latestNav':
    sorted.sort((a, b) => {
      const ta = a.latestNavDate ? new Date(a.latestNavDate).getTime() : -Infinity;
      const tb = b.latestNavDate ? new Date(b.latestNavDate).getTime() : -Infinity;
      return tb - ta;
    });
    break;
  ```
- `findList` 响应附加全库最新净值日期（供顶部提示）：
  ```ts
  const latestNavRow = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
    orderBy: { navDate: 'desc' },
  });
  // 返回体增加 latestNavDate: latestNavRow?.navDate ? String(...).slice(0,10) : null
  ```

**2. recommend-service.ts — 推荐补 annual7d**
- 行为推荐源（latestSnapshot 场景）与年化排名源（annual-ranking）均补充 `annual7d: snapshot?.annual7d != null ? Number(snapshot.annual7d) : null`，排序逻辑不变。

**3. scoring-service.ts — 榜单补 latestAnnual7d**
- `getScoreLeaderboard` 为每条榜单记录补充 `latestAnnual7d`（年化快照查询中取 `annual7d`，与既有 `latestAnnual1m` 同源）。

### 前端（strapi-wealth 仓库）

**1. components/annual-card.vue — 统一 7 日年化**
- `displayAnnual` 改为：`props.product.latestAnnual7d ?? props.product.annual7d ?? null`
- 年化标签统一"近7日年化"；移除 `isMoney`/`isShort`/`estimate-tag` 分支逻辑
- 缺数据（null）时显示灰色"数据积累中"，不显示百分比
- 保留单位净值/净值日期副行（latestNav.unitNav / latestNav.navDate）

**2. pages/hall/index.vue — 首页整合**
- `SORT_OPTIONS` 首位插入 `{ key: 'latestNav', label: '最近更新' }`；默认 `sortIndex = 0`（最近更新）
- 榜单年化：`latestAnnual7d ?? annual7d`，标签"近7日年化"
- 推荐位年化：`annual7d`，标签"近7日年化"
- 顶部"数据更新至 {{ latestNavDate }}"提示（取列表接口新字段，空则隐藏）
- 下拉刷新：页面 `onPullDownRefresh` 重新 `load()`，pages.json 中 hall 页开启 `enablePullDownRefresh: true`

### 测试（TDD）

**product-sort.test.ts 新增用例**
- `latestNav` 排序：按最新净值日期降序，无净值产品排末尾（mock 数据：产品A 日期 09-15、产品B 09-10、产品C 无净值 → 断言 [A, B, C] 且 C 排最后）

### 构建与部署

1. 后端：`npm test -- --no-coverage` 全量通过 → `npm run build` 重建 dist → `rg -l "latestNavDate" dist/server` 自检 → 提交（dist + server）→ push main
2. 部署 joho：git pull + dist 自检 + pm2 restart + `curl localhost:1337/api/zhao-wealth/v1/wealth/compare/trend` 401 验证（路由存活）
3. 前端：push wealth-line → `npm run build:h5` → `deploy-wealth.ps1` → 线上 index.html hash 对比

## 风险与说明

- 货币理财 `latestAnnual7d` 已有值（task 2/3 已实现货币理财年化快照，如宁银最新 annualYield=1.69），统一展示口径无缺口
- 新产品/数据不足时 `latestAnnual7d` 为 null → 前端"数据积累中"，与详情页口径一致
- `latestNavDate` 取 `navDate.slice(0,10)` 为展示用日期（navDate 存储为 UTC 16:00 = 北京时间次日 00:00，展示层沿用既有惯例，不在此次调整）
- 推荐位只补字段不改排序（推荐位排序仍按行为/年化排名逻辑），"推荐位同排序"指展示口径（7日年化），非排序逻辑
