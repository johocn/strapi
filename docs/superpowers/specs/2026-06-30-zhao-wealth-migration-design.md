# zhao-wealth 插件迁移与修复设计

> 日期：2026-06-30
> 状态：已确认
> 关联：本迁移是 zhao-wealth 风险指标增量设计的前置依赖

## 一、背景

zhao-wealth 是理财基金净值采集与年化分析插件，完整源码位于 `e:\code\plugins\zhao-wealth`，但 basic 项目下 `basic/plugins/zhao-wealth` 仅是空壳（只有空 `index.ts`、`package.json`、`tsconfig.json`）。

需要将完整代码迁移到 basic 内，并同步修复以下已识别问题：

1. content-type schema 仅内联在 index.ts，违反 project_memory 硬约束（必须双写 schema.json + index.ts）
2. bootstrap.ts 缺 Cron 定时任务注册（设计文档要求 8:00/18:00/20:00 三个任务）
3. `services/annual-snapshot.ts` 的 `calculateYearlyReturn` 存在逻辑 bug
4. Bull 队列初始化在 Redis 不可用时会崩溃，需优雅降级
5. 全部 51 处 `strapi.db.query('api::wealth-xxx.wealth-xxx')` 使用了错误的 UID 前缀（Strapi 插件 content-type UID 必须为 `plugin::zhao-wealth.wealth-xxx`，而非 `api::`），会导致所有数据库查询在运行时抛错
6. 未在 basic 项目中注册运行验证

## 二、迁移策略

### 2.1 文件迁移

- 源：`e:\code\plugins\zhao-wealth\`（完整实现，保留作为备份不删）
- 目标：`e:\code\basic\plugins\zhao-wealth\`（覆盖现有空壳）
- 排除：`dist/`、`node_modules/`、`package-lock.json`（在 basic 内重新构建）

### 2.2 依赖安装

- `cd basic/plugins/zhao-wealth && npm install`（安装 axios/cheerio/bull 等运行时依赖）
- 不需要改 basic 根 package.json（zhao-wealth 是独立子包）

## 三、六项关键修复

### 3.1 Fix 1: 拆出 9 个 schema.json 文件

按 project_memory 硬约束：

> Plugin content-type schema MUST be defined in both `server/src/content-types/<name>/schema.json` AND `server/src/index.ts` (if index.ts inlines schema object instead of importing schema.json)

**新增文件**（9 个）：

- `server/src/content-types/wealth-company/schema.json`
- `server/src/content-types/wealth-product/schema.json`
- `server/src/content-types/wealth-collect-config/schema.json`
- `server/src/content-types/wealth-nav/schema.json`
- `server/src/content-types/wealth-money-income/schema.json`
- `server/src/content-types/wealth-annual-snapshot/schema.json`
- `server/src/content-types/wealth-yearly-return/schema.json`
- `server/src/content-types/wealth-customer-product/schema.json`
- `server/src/content-types/wealth-recommend-config/schema.json`

**重写** `server/src/content-types/index.ts`：

```typescript
import wealthCompany from './wealth-company/schema.json';
import wealthProduct from './wealth-product/schema.json';
// ... 其余 7 个
export default {
  'wealth-company': { schema: wealthCompany },
  'wealth-product': { schema: wealthProduct },
  // ... 其余 7 个
};
```

关系 target 保持 `plugin::zhao-wealth.xxx`（已正确，无需修改）。

### 3.2 Fix 2: 补 Cron 定时任务

按设计文档 7.1 节要求，在 `bootstrap.ts` 注册三个 Cron 任务：

| 任务名 | Cron 表达式 | 行为 |
|---|---|---|
| `wealth-trading-day-check` | `0 8 * * *` | 交易日判断（仅日志） |
| `wealth-collect-trigger` | `0 18 * * *` | 交易日采集触发，调用 `queue.add('collect-all')` |
| `wealth-calculate-trigger` | `0 20 * * *` | 交易日年化快照计算，遍历产品 `queue.add('calculate-snapshot')` |

Redis 不可用时：Cron 内部判空队列后跳过，不抛错。

### 3.3 Fix 3: 修复 calculateYearlyReturn bug

**当前 bug**（`server/src/services/annual-snapshot.ts`）：

```typescript
// 取的是产品全部历史首尾净值，而非当年首尾
const yearStartNav = await strapi.db.query('...wealth-nav').findOne({
  where: { product: productId },
  orderBy: { navDate: 'asc' },  // ❌ 全历史首条
});
const yearEndNav = await strapi.db.query('...wealth-nav').findOne({
  where: { product: productId },
  orderBy: { navDate: 'desc' },  // ❌ 全历史末条
});

// 年份校验逻辑反了
if (startYear !== year || endYear !== year) {
  // ❌ 这会拒绝所有完整年度，因为 startYear/endYear 取的是全历史首尾
}
```

**修复方案**：

```typescript
const yearStart = new Date(year, 0, 1);
const yearEnd = new Date(year, 11, 31);

const yearStartNav = await strapi.db.query('...wealth-nav').findOne({
  where: {
    product: productId,
    navDate: { $gte: yearStart, $lte: yearEnd },
  },
  orderBy: { navDate: 'asc' },  // ✅ 当年首条
});

const yearEndNav = await strapi.db.query('...wealth-nav').findOne({
  where: {
    product: productId,
    navDate: { $gte: yearStart, $lte: yearEnd },
  },
  orderBy: { navDate: 'desc' },  // ✅ 当年末条
});

if (!yearStartNav || !yearEndNav) {
  strapi.log.warn(`[zhao-wealth] 产品${productId} ${year}年净值数据不足`);
  return null;
}

const annualReturn = Math.pow(
  yearEndNav.unitNav / yearStartNav.unitNav,
  365 / 365
) - 1;
```

### 3.4 Fix 4: Redis 优雅降级

镜像 `basic/plugins/zhao-channel/server/src/utils/redis.ts` 的成熟模式。

**改写** `server/src/utils/redis-client.ts`：

- 加 `redisAvailable: boolean | null` 标志
- 加 `ensureRedisAvailable(): Promise<boolean>` 函数（ping 失败时设 false 并返回 false）
- `acquireLock` / `releaseLock` 调用前先判 `ensureRedisAvailable()`

**改写** `server/src/jobs/queue-setup.ts`：

- `setupQueues` 包 `try/catch`，失败时 `strapi.log.warn` + 三个队列变量保持 `null`
- `getCollectQueue` / `getCalculateQueue` / `getRecalculateQueue` 返回值改为 `Queue.Queue | null`

**改写** `server/src/jobs/collect-job.ts` 和 `calculate-job.ts`：

- `queue.process(...)` 注册前判空：`if (!queue) return;`
- `queue.add(...)` 调用前判空

**改写** `server/src/controllers/collect.ts`：

- `trigger` 和 `recalculate` 接口在队列不可用时返回：
  ```
  ctx.status = 503;
  ctx.body = errorResponse(503, '采集服务暂不可用（Redis 未就绪）');
  ```

### 3.5 Fix 5: 修复 UID 前缀错误

源码 51 处调用使用了错误的 `api::wealth-xxx.wealth-xxx` UID 前缀，必须批量替换为 `plugin::zhao-wealth.wealth-xxx`。

**受影响文件**（10 个）：

- `server/src/services/recommend-service.ts`（5 处）
- `server/src/services/product.ts`（7 处）
- `server/src/services/annual-snapshot.ts`（10 处）
- `server/src/services/customer-product.ts`（9 处）
- `server/src/services/nav-calculator.ts`（12 处）
- `server/src/controllers/nav.ts`（2 处）
- `server/src/controllers/collect.ts`（2 处）
- `server/src/jobs/collect-job.ts`（4 处）
- `server/src/jobs/calculate-job.ts`（2 处）

**替换规则**（正则）：

```
api::wealth-([a-z-]+)\.wealth-\1   →   plugin::zhao-wealth.wealth-\1
```

**验证**：替换后 `grep -rn "api::wealth" server/src/` 应返回 0 行。

### 3.6 Fix 6: 启动验证

1. 在 basic 项目根目录运行 `npm run dev`
2. 验证启动日志包含：
   - `[zhao-wealth] 插件已注册`
   - `[zhao-wealth] 插件已启动`
   - `[zhao-wealth] Bull队列初始化完成`（Redis 可用时）或 warn 降级日志
3. 验证 9 张数据表自动创建（`wealth_companies`、`wealth_products`、`wealth_navs` 等）
4. 验证路由注册：
   - C 端：`/api/v1/wealth/products` 等 9 条
   - 后台：`/wealth-admin/v1/companies` 等
5. 验证 admin panel 中插件菜单可见

## 四、不做范围（YAGNI 排除）

- ❌ 不重写 `cbhb-collector` 的 CSS selector（占位符，需现场调研渤银理财真实页面结构）
- ❌ 不补单元测试
- ❌ 不补 API 文档（设计文档要求的 3 份 .md）
- ❌ 不主动排查 Strapi v5 兼容性（启动验证阶段自然暴露后再处理）
- ❌ 不改 admin 前端代码
- ❌ 不删除 `e:\code\plugins\zhao-wealth`（保留作为备份）

## 五、风险点与对策

### 5.1 Strapi v5 db.query relation filter 不稳定

project_memory 记录：manyToMany inverse side、`filters.id`、manyToOne `filters.site = { documentId }` 等均有不稳定案例。

**可能受影响接口**：
- `services/recommend-service.ts`：按 channel 查推荐配置、按 product 查最新快照
- `services/customer-product.ts`：按 user 查自选、按 channel 统计

**对策**：启动验证后跑端到端接口测试，发现查询失败即按 project_memory 经验改用 knex 直查。

### 5.2 Schema 与 basic 已有表冲突

basic 之前无 wealth_* 表，理论无冲突。但需启动后查 `strapi_database_schema` 表确认。

### 5.3 Redis 未配置

`basic/.env` 无 `REDIS_URL`。当前 zhao-channel 已默认 `redis://localhost:6379` 并优雅降级。

**对策**：迁移后 zhao-wealth 复用相同默认值。若 basic 部署环境无 Redis，所有依赖队列的功能（采集/重算/Cron）自动降级，但产品 CRUD、净值手动录入、查询等核心功能不受影响。

## 六、验收标准

- [ ] `cd basic && npm run dev` 启动无错误
- [ ] 9 张 wealth_* 表自动创建
- [ ] C 端 9 条路由可访问（401/403 也算可访问）
- [ ] 后台路由可访问
- [ ] Redis 不通时插件不崩溃，日志输出降级 warn
- [ ] Redis 通时 Cron 任务按时触发（手动改时间或调用 `strapi.cron` 验证）
- [ ] `grep -rn "api::wealth" basic/plugins/zhao-wealth/server/src/` 返回 0 行
- [ ] 手动调用一个 db.query 接口（如 `GET /api/v1/wealth/products`）不抛 UID 错误

## 七、与后续增量的关系

本迁移完成并验证通过后，再启动"业绩归因增量"设计（见 `2026-06-30-zhao-wealth-risk-metrics-design.md`）。
