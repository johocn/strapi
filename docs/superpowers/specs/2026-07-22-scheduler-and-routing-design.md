# 调度与路由打通设计（子项目 A）

> 日期：2026-07-22
> 状态：待审阅
> 范围：打通 zhao-deal + zhao-track 定时调度，让自动同步任务能够被主 cron 触发

---

## 1. 背景与目标

### 1.1 背景

淘宝客业务流程调研发现两个致命卡点：

1. **C2**：zhao-deal 完全没有 cron 配置文件。`sync-scheduler.ts` 实现了 `shouldRunNow` 和 `getLastRun` 方法，但没有 `run()` 方法，也没有任何 cron 调用它。`syncMode: "scheduled"` 和 `"both"` 的平台永远不会被自动触发，优惠券/产品同步只能靠 admin API 手动触发。

2. **C3**：zhao-track 有 cron 配置（`zhao-track/server/src/config/cron.ts` 定义了 2 个任务：每分钟订单同步 + 每日 03:00 归因），但主 `config/cron.ts` 只导入了 `logisticsCron`，没有导入 zhao-track 的 cron。这两个 cron 永远不会执行。

### 1.2 目标

- 创建 zhao-deal cron 配置，让优惠券/产品同步能被自动触发
- 给 zhao-deal sync-scheduler 补充 `run()` 方法
- 将 zhao-track + zhao-deal cron 注册到主 `config/cron.ts`

### 1.3 业务原则

- **入库类任务**：手动为主，自动为辅。zhao-deal 采用候选机制（fetch → pre-filter → upsertCandidate(pending) → 人工 approve → 入库），自动同步产生的候选需要人工审核，质量控制优先
- **订单回流**：zhao-track 订单直接入库（按 orderId 去重），需要及时性，保持每分钟检查
- **校验类任务**（查询时校验数据准确性）：不在本子项目范围，待真实平台 API 接入后实现

### 1.4 关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| zhao-deal cron 频率 | 每小时检查一次（`0 * * * *`） | 候选机制 + 人工审核，不需要高频；实际触发由 `shouldRunNow(platform.syncCron)` 控制 |
| zhao-deal run() 方法 | 参照 zhao-track order-sync-scheduler.run() 模式 | 保持架构一致，便于维护 |
| zhao-track cron 频率 | 保持原有（每分钟订单同步 + 每日 03:00 归因） | 订单直接入库需要及时性；归因是批量匹配低频即可 |
| 子项目范围 | 仅入库调度，不含校验类定时任务 | 校验依赖真实平台 API（子项目 C） |

---

## 2. 架构

### 2.1 调度结构

```
config/cron.ts（主调度入口）
├── ...logisticsCron（现有，不变）
├── ...zhaoTrackCron（新增导入）
│   ├── */1 * * * *  → order-sync-scheduler.run()（每分钟检查订单同步）
│   └── 0 3 * * *    → attribution.run()（每日 03:00 归因匹配）
└── ...zhaoDealCron（新增导入）
    └── 0 * * * *    → sync-scheduler.run()（每小时检查优惠券/产品同步）
```

### 2.2 zhao-deal sync-scheduler.run() 逻辑

参照 [zhao-track order-sync-scheduler.run()](file:///d:/zhao/strapi/plugins/zhao-track/server/src/services/order-sync-scheduler.ts) 模式：

1. 查询所有 `syncEnabled=true` + `syncMode in ['scheduled','both']` 的平台
2. 对每个平台调 `shouldRunNow(platform.code, platform.syncCron)`
3. 命中则调 `sync.syncPlatformData({ platformCode, type: 'coupons' })` 和 `sync.syncPlatformData({ platformCode, type: 'products' })`
4. 记录日志 + 错误处理（单平台失败不影响其他平台）
5. 返回 `{ processed: number }`

**与 zhao-track 的差异**：
- zhao-track 只同步订单（一种类型），zhao-deal 需同步优惠券 + 产品（两种类型）
- zhao-deal 同步结果是候选（pending），需人工审核；zhao-track 同步结果直接入库

### 2.3 zhao-deal sync-scheduler.run() 伪代码

```typescript
async run() {
  let platforms: any[] = [];
  try {
    platforms = await strapi.documents(PLATFORM_UID).findMany({
      filters: { syncEnabled: true, syncMode: { $in: ["scheduled", "both"] } },
    });
  } catch (err: any) {
    strapi.log.warn(`[zhao-deal sync-scheduler] load platforms failed: ${err.message}`);
    return { processed: 0 };
  }

  let processed = 0;
  for (const platform of platforms) {
    try {
      const should = await this.shouldRunNow(platform.code, platform.syncCron);
      if (!should) continue;

      const syncService = strapi.plugin("zhao-deal").service("sync");
      // 同步优惠券
      const couponStats = await syncService.syncPlatformData({
        platformCode: platform.code, type: "coupons",
      });
      // 同步产品
      const productStats = await syncService.syncPlatformData({
        platformCode: platform.code, type: "products",
      });
      strapi.log.info(
        `[zhao-deal sync-scheduler] ${platform.code}: ` +
        `coupons(fetched=${couponStats.fetched} created=${couponStats.created} updated=${couponStats.updated}) ` +
        `products(fetched=${productStats.fetched} created=${productStats.created} updated=${productStats.updated})`
      );
      processed++;
    } catch (err: any) {
      strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform.code} failed: ${err.message}`);
    }
  }
  return { processed };
}
```

### 2.4 PLATFORM_UID 常量

zhao-deal sync-scheduler 中需要新增 `PLATFORM_UID` 常量：

```typescript
const PLATFORM_UID = "plugin::zhao-deal.platform";
```

（zhao-track order-sync-scheduler 已有 `const PLATFORM_UID = "plugin::zhao-deal.platform"`，参照同一 UID）

---

## 3. 数据流

### 3.1 zhao-deal 自动同步数据流

```
主 cron（每小时 0 * * * *）
  ↓
sync-scheduler.run()
  ↓
查询 syncEnabled + syncMode in ['scheduled','both'] 的平台
  ↓
对每个平台：shouldRunNow(platform.code, platform.syncCron)
  ↓ 命中
sync.syncPlatformData({ platformCode, type: 'coupons' })
sync.syncPlatformData({ platformCode, type: 'products' })
  ↓
adapter.fetchCoupons / adapter.fetchProducts（当前为 stub，返回空列表）
  ↓
pre-filter.filterCoupons / filterProducts（过滤）
  ↓
candidate.upsertCouponCandidate / upsertProductCandidate（写入 pending 候选）
  ↓
等待管理员审核 approve → 入库
```

### 3.2 zhao-track 自动同步数据流（已有，注册到主 cron 即可）

```
主 cron（每分钟 */1 * * * *）
  ↓
order-sync-scheduler.run()
  ↓
查询 syncEnabled + syncMode in ['scheduled','both'] 的平台
  ↓
对每个平台：shouldRunNow(platform.code, platform.syncCron)
  ↓ 命中
order-sync.syncOrders({ platformCode })
  ↓
adapter.fetchOrders（当前为 stub，返回空列表）
  ↓
upsert Order（直接入库，按 orderId 去重）

主 cron（每日 03:00 0 3 * * *）
  ↓
attribution.run()
  ↓
扫描 matchedClick=null 的订单
  ↓
4 级归因匹配（pid_match → click_match → weak_match → fallback_match）
  ↓
写入 matchedClick + attributionQuality
```

---

## 4. 改动范围

### 4.1 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `strapi/plugins/zhao-deal/server/src/config/cron.ts` | zhao-deal cron 配置（每小时检查同步） |
| 修改 | `strapi/plugins/zhao-deal/server/src/services/sync-scheduler.ts` | 补充 run() 方法 + PLATFORM_UID 常量 |
| 修改 | `strapi/config/cron.ts` | 导入 zhao-track + zhao-deal cron |

### 4.2 不涉及的文件

- zhao-studio routes（C4 已验证不是卡点，推广渠道路由已在 content-api.ts 第 124-147 行暴露）
- 平台适配器实现（C1，属于子项目 C）
- 字段/逻辑修复（C5-C15，属于子项目 B）
- zhao-track cron 配置（已有，无需修改，只需注册到主 cron）
- zhao-track sync-scheduler（已有 run() 方法，无需修改）

---

## 5. 详细实现

### 5.1 新建 zhao-deal cron 配置

文件：`strapi/plugins/zhao-deal/server/src/config/cron.ts`

```typescript
export default {
  // 每小时检查是否到平台 syncCron 触发时间，命中则同步优惠券/产品候选
  "0 * * * *": async ({ strapi }: { strapi: any }) => {
    try {
      await strapi.plugin("zhao-deal").service("sync-scheduler").run();
    } catch (err: any) {
      strapi.log.warn(`[zhao-deal cron] sync-scheduler failed: ${err.message}`);
    }
  },
};
```

### 5.2 修改 sync-scheduler.ts

文件：`strapi/plugins/zhao-deal/server/src/services/sync-scheduler.ts`（当前 33 行）

现有结构：`export default ({ strapi }) => { const getStore = ...; return { shouldRunNow, getLastRun }; }`，两个方法直接定义在 return 对象内。

**改动**：
1. 顶部新增 `PLATFORM_UID` 常量
2. return 对象内新增 `run()` 方法（与 shouldRunNow/getLastRun 同级，能访问闭包 `strapi` 和 `getStore`）
3. `shouldRunNow` 和 `getLastRun` 保持不变

修改后的完整文件：

```typescript
import type { Core } from "@strapi/strapi";
import cronParser from "cron-parser";

const PLATFORM_UID = "plugin::zhao-deal.platform";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () => strapi.store({ type: "plugin", name: "zhao-deal" });

  return {
    async shouldRunNow(platformCode: string, syncCron: string): Promise<boolean> {
      if (!syncCron) return false;
      const storeKey = `sync_last_run::${platformCode}`;
      const lastRunStr = await getStore().get({ key: storeKey });
      const lastRun = lastRunStr ? new Date(lastRunStr as string) : new Date(0);

      try {
        const parser = cronParser.parseExpression(syncCron);
        const nextRun = parser.next().toDate();
        const now = new Date();
        if (now >= nextRun && now.getTime() - lastRun.getTime() > 60 * 1000) {
          await getStore().set({ key: storeKey, value: now.toISOString() });
          return true;
        }
      } catch (err: any) {
        strapi.log.warn(`[zhao-deal] 无效 cron 表达式 ${syncCron}: ${err.message}`);
      }
      return false;
    },

    async getLastRun(platformCode: string): Promise<Date | null> {
      const v = await getStore().get({ key: `sync_last_run::${platformCode}` });
      return v ? new Date(v as string) : null;
    },

    /**
     * 扫描所有 syncEnabled + syncMode in ['scheduled','both'] 的平台，
     * 对到期的平台触发优惠券 + 产品同步（候选机制，结果进入 pending 等待人工审核）
     */
    async run() {
      let platforms: any[] = [];
      try {
        platforms = await strapi.documents(PLATFORM_UID).findMany({
          filters: { syncEnabled: true, syncMode: { $in: ["scheduled", "both"] } },
        });
      } catch (err: any) {
        strapi.log.warn(`[zhao-deal sync-scheduler] load platforms failed: ${err.message}`);
        return { processed: 0 };
      }

      let processed = 0;
      for (const platform of platforms) {
        try {
          const should = await this.shouldRunNow(platform.code, platform.syncCron);
          if (!should) continue;

          const syncService = strapi.plugin("zhao-deal").service("sync");
          // 同步优惠券
          const couponStats = await syncService.syncPlatformData({
            platformCode: platform.code, type: "coupons",
          });
          // 同步产品
          const productStats = await syncService.syncPlatformData({
            platformCode: platform.code, type: "products",
          });
          strapi.log.info(
            `[zhao-deal sync-scheduler] ${platform.code}: ` +
            `coupons(fetched=${couponStats.fetched} created=${couponStats.created} updated=${couponStats.updated}) ` +
            `products(fetched=${productStats.fetched} created=${productStats.created} updated=${productStats.updated})`
          );
          processed++;
        } catch (err: any) {
          strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform.code} failed: ${err.message}`);
        }
      }
      return { processed };
    },
  };
};
```

**关键点**：`run()` 内部调用 `this.shouldRunNow(...)` 而非独立函数引用，因为 `shouldRunNow` 是 return 对象的方法。

### 5.3 修改主 cron 配置

文件：`strapi/config/cron.ts`

```typescript
import logisticsCron from "../plugins/zhao-logistics/server/src/config/cron";
import zhaoTrackCron from "../plugins/zhao-track/server/src/config/cron";
import zhaoDealCron from "../plugins/zhao-deal/server/src/config/cron";

export default {
  ...logisticsCron,
  ...zhaoTrackCron,
  ...zhaoDealCron,
};
```

---

## 6. 测试策略

### 6.1 sync-scheduler run() 单元测试

新增测试文件：`strapi/plugins/zhao-deal/tests/services/sync-scheduler.test.ts`

测试用例：
1. `run()` 无平台时返回 `{ processed: 0 }`
2. `run()` 有平台但 shouldRunNow 返回 false 时返回 `{ processed: 0 }`
3. `run()` 有平台且 shouldRunNow 返回 true 时调用 syncPlatformData 两次（coupons + products）并返回 `{ processed: 1 }`
4. `run()` 单平台失败不影响其他平台（错误隔离）

mock 策略：
- mock `strapi.documents(PLATFORM_UID).findMany` 返回平台列表
- mock `strapi.store().get/set` 控制 shouldRunNow 返回值
- mock `strapi.plugin("zhao-deal").service("sync").syncPlatformData` 返回统计对象

### 6.2 cron 配置测试

新增测试文件：`strapi/plugins/zhao-deal/tests/config/cron.test.ts`

测试用例：
1. cron 配置导出对象包含 `0 * * * *` key
2. cron 回调函数调用 `strapi.plugin("zhao-deal").service("sync-scheduler").run()`
3. cron 回调函数捕获错误并 warn（不抛出）

### 6.3 主 cron 注册测试

新建测试文件：`strapi/tests/cron-registration.test.ts`（在 strapi 根目录测试，因为主 `config/cron.ts` 在根目录）

测试用例：
1. 主 `config/cron.ts` 导入后包含 zhao-track 的 `*/1 * * * *` 和 `0 3 * * *` key
2. 主 `config/cron.ts` 导入后包含 zhao-deal 的 `0 * * * *` key
3. 主 `config/cron.ts` 导入后包含 logistics 的原有 key（回归验证）

### 6.4 回归验证

```bash
# zhao-deal 全量测试
cd strapi/plugins/zhao-deal && npx --no-install jest --config tests/jest.config.ts --no-coverage

# zhao-track 全量测试（不应受影响）
cd strapi/plugins/zhao-track && npx --no-install jest --config tests/jest.config.ts --no-coverage

# 4 插件 build 验证
cd strapi/plugins/zhao-deal && npm run build
cd strapi/plugins/zhao-track && npm run build
cd strapi/plugins/zhao-studio && npm run build
cd strapi/plugins/zhao-auth && npm run build
```

---

## 7. 已知限制

- **平台适配器仍为 stub**：当前 4 个平台适配器返回空列表，自动同步触发后不会产生真实候选。待子项目 C 接入真实平台 API 后才有实际数据
- **无校验类定时任务**：查询时校验数据准确性（5 分钟自动校验）不在本子项目范围，待真实平台 API 接入后实现
- **无同步重试机制**：单次同步失败直接记录错误，不重试。后续可补充指数退避重试
- **手动触发仍是主要入口**：自动 cron 是保底机制，管理员主要通过 admin API 手动触发同步（`POST /api/zhao-deal/v1/admin/sync/trigger`）

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| zhao-deal cron 每小时触发可能增加平台 API 调用压力 | 低（实际触发由 shouldRunNow 控制，平台 syncCron 可设为低频） | 平台默认 syncCron 建议设为每天 2-3 次 |
| run() 方法调用 syncPlatformData 两次（coupons + products）可能耗时长 | 中（单平台串行） | 单平台失败不影响其他平台（错误隔离）；后续可改为并行 |
| 主 cron 导入三个插件的 cron 可能 key 冲突 | 低（三个 cron 的 key 不重复） | 测试验证 key 唯一性 |
| zhao-deal config 目录不存在 | 低（新建目录即可） | 实现时创建 `server/src/config/` 目录 |
