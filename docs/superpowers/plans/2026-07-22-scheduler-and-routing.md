# 调度与路由打通 实现计划（子项目 A）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通 zhao-deal + zhao-track 定时调度，让自动同步任务能够被主 cron 触发。

**Architecture:** 给 zhao-deal sync-scheduler 补充 run() 方法，新建 zhao-deal cron 配置（每小时检查），并将 zhao-track + zhao-deal cron 注册到主 config/cron.ts。

**Tech Stack:** Strapi v5, TypeScript, Jest + ts-jest, cron-parser

---

## File Structure

### 新增文件
- `strapi/plugins/zhao-deal/server/src/config/cron.ts` — zhao-deal cron 配置（每小时触发 sync-scheduler.run()）
- `strapi/plugins/zhao-deal/tests/config/cron.test.ts` — zhao-deal cron 配置测试

### 修改文件
- `strapi/plugins/zhao-deal/server/src/services/sync-scheduler.ts` — 补充 run() 方法 + PLATFORM_UID 常量（当前 33 行 → 修改后约 75 行）
- `strapi/plugins/zhao-deal/tests/services/sync-scheduler.test.ts` — 追加 run() 方法的 4 个测试用例
- `strapi/config/cron.ts` — 导入并合并 zhao-track + zhao-deal cron（当前 5 行 → 修改后约 9 行）

### 不涉及
- zhao-track 任何文件（cron 配置和 sync-scheduler 已就绪，只需主 cron 导入）
- zhao-studio 任何文件（C4 不是卡点，推广渠道路由已在 content-api.ts 暴露）
- 平台适配器实现（属于子项目 C）

---

## Task 1: 给 sync-scheduler 补充 run() 方法

**Files:**
- Modify: `strapi/plugins/zhao-deal/server/src/services/sync-scheduler.ts`
- Test: `strapi/plugins/zhao-deal/tests/services/sync-scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

在 `strapi/plugins/zhao-deal/tests/services/sync-scheduler.test.ts` 末尾追加 4 个测试用例（保留现有 3 个 shouldRunNow 测试不变）：

```typescript
  // ========== run() 方法测试 ==========

  it("run() 无平台时返回 processed=0", async () => {
    const mockStrapi = createMockStrapi();
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 0 });
  });

  it("run() shouldRunNow 返回 false 时返回 processed=0", async () => {
    // shouldRunNow 因 syncCron 为空返回 false
    const findMany = jest.fn().mockResolvedValue([
      { code: "taobao", syncCron: "", syncEnabled: true, syncMode: "scheduled" },
    ]);
    const documents = jest.fn().mockImplementation(() => ({ findMany }));
    const mockStrapi = createMockStrapi({ documents });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 0 });
  });

  it("run() shouldRunNow 返回 true 时调用 syncPlatformData 两次并返回 processed=1", async () => {
    // 构造 shouldRunNow 返回 true：lastRun 为 epoch 0，syncCron 设为每分钟
    const now = new Date();
    const epoch = new Date(0);
    const get = jest.fn().mockResolvedValue(epoch.toISOString());
    const set = jest.fn();
    const syncPlatformData = jest.fn()
      .mockResolvedValueOnce({ fetched: 5, created: 3, updated: 2 })
      .mockResolvedValueOnce({ fetched: 10, created: 6, updated: 4 });
    const findManyPlatforms = jest.fn().mockResolvedValue([
      { code: "taobao", syncCron: "* * * * *", syncEnabled: true, syncMode: "scheduled" },
    ]);
    const documents = jest.fn().mockImplementation((uid: string) => ({
      findMany: uid === "plugin::zhao-deal.platform" ? findManyPlatforms : jest.fn().mockResolvedValue([]),
    }));
    const mockStrapi = createMockStrapi({
      documents,
      store: jest.fn().mockReturnValue({ get, set }),
      plugin: jest.fn().mockReturnValue({
        service: (name: string) => name === "sync" ? { syncPlatformData } : null,
      }),
    });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 1 });
    expect(syncPlatformData).toHaveBeenCalledTimes(2);
    expect(syncPlatformData).toHaveBeenNthCalledWith(1, { platformCode: "taobao", type: "coupons" });
    expect(syncPlatformData).toHaveBeenNthCalledWith(2, { platformCode: "taobao", type: "products" });
  });

  it("run() 单平台失败不影响其他平台（错误隔离）", async () => {
    const epoch = new Date(0);
    const get = jest.fn().mockResolvedValue(epoch.toISOString());
    const set = jest.fn();
    const syncPlatformData = jest.fn()
      // 第一个平台 coupons 同步抛错
      .mockRejectedValueOnce(new Error("network error"))
      // 第一个平台 products 同步抛错
      .mockRejectedValueOnce(new Error("network error"))
      // 第二个平台 coupons 同步成功
      .mockResolvedValueOnce({ fetched: 1, created: 1, updated: 0 })
      // 第二个平台 products 同步成功
      .mockResolvedValueOnce({ fetched: 2, created: 2, updated: 0 });
    const findManyPlatforms = jest.fn().mockResolvedValue([
      { code: "taobao", syncCron: "* * * * *", syncEnabled: true, syncMode: "scheduled" },
      { code: "pdd", syncCron: "* * * * *", syncEnabled: true, syncMode: "scheduled" },
    ]);
    const documents = jest.fn().mockImplementation((uid: string) => ({
      findMany: uid === "plugin::zhao-deal.platform" ? findManyPlatforms : jest.fn().mockResolvedValue([]),
    }));
    const mockStrapi = createMockStrapi({
      documents,
      store: jest.fn().mockReturnValue({ get, set }),
      plugin: jest.fn().mockReturnValue({
        service: (name: string) => name === "sync" ? { syncPlatformData } : null,
      }),
    });
    const svc = schedulerFactory({ strapi: mockStrapi as any });
    const result = await svc.run();
    expect(result).toEqual({ processed: 1 });
    expect(syncPlatformData).toHaveBeenCalledTimes(4);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/services/sync-scheduler.test.ts --no-cache`
Expected: FAIL with "svc.run is not a function"

- [ ] **Step 3: Write minimal implementation**

替换 `strapi/plugins/zhao-deal/server/src/services/sync-scheduler.ts` 全部内容为：

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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/services/sync-scheduler.test.ts --no-cache`
Expected: PASS (7 tests, 3 existing + 4 new)

- [ ] **Step 5: Commit**

```bash
cd strapi/plugins/zhao-deal
git add server/src/services/sync-scheduler.ts tests/services/sync-scheduler.test.ts
git commit -m "feat(zhao-deal): add run() method to sync-scheduler for cron triggering"
```

---

## Task 2: 新建 zhao-deal cron 配置

**Files:**
- Create: `strapi/plugins/zhao-deal/server/src/config/cron.ts`
- Test: `strapi/plugins/zhao-deal/tests/config/cron.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-deal/tests/config/cron.test.ts`：

```typescript
import cronConfig from "../../server/src/config/cron";

describe("zhao-deal cron config", () => {
  it("包含 1 个 cron 任务（每小时检查）", () => {
    const keys = Object.keys(cronConfig);
    expect(keys).toHaveLength(1);
    expect(keys).toContain("0 * * * *");
  });

  it("每小时任务调用 sync-scheduler.run", async () => {
    const run = jest.fn().mockResolvedValue({ processed: 0 });
    const strapi: any = {
      plugin: () => ({
        service: (name: string) => name === "sync-scheduler" ? { run } : null,
      }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const task = (cronConfig as any)["0 * * * *"];
    await task({ strapi });
    expect(run).toHaveBeenCalled();
  });

  it("service 不可用时不抛错", async () => {
    const strapi: any = {
      plugin: () => ({ service: () => null }),
      log: { warn: jest.fn(), info: jest.fn() },
    };
    const task = (cronConfig as any)["0 * * * *"];
    await expect(task({ strapi })).resolves.not.toThrow();
  });

  it("run() 抛错时被捕获并 warn（不向上抛）", async () => {
    const run = jest.fn().mockRejectedValue(new Error("db connection lost"));
    const warn = jest.fn();
    const strapi: any = {
      plugin: () => ({
        service: (name: string) => name === "sync-scheduler" ? { run } : null,
      }),
      log: { warn, info: jest.fn() },
    };
    const task = (cronConfig as any)["0 * * * *"];
    await expect(task({ strapi })).resolves.not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/config/cron.test.ts --no-cache`
Expected: FAIL with "Cannot find module '../../server/src/config/cron'"

- [ ] **Step 3: Write minimal implementation**

创建 `strapi/plugins/zhao-deal/server/src/config/cron.ts`：

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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/config/cron.test.ts --no-cache`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd strapi/plugins/zhao-deal
git add server/src/config/cron.ts tests/config/cron.test.ts
git commit -m "feat(zhao-deal): add cron config to trigger sync-scheduler hourly"
```

---

## Task 3: 将 zhao-track + zhao-deal cron 注册到主 config/cron.ts

**Files:**
- Modify: `strapi/config/cron.ts`
- Test: `strapi/plugins/zhao-deal/tests/config/cron-registration.test.ts`

**说明**：主 strapi 项目无 jest 配置，无法在 `strapi/` 根目录运行测试。注册验证测试放在 zhao-deal 的 tests 目录中，通过相对路径 import 主 cron 配置。

- [ ] **Step 1: Write the failing test**

创建 `strapi/plugins/zhao-deal/tests/config/cron-registration.test.ts`：

```typescript
import mainCronConfig from "../../../../config/cron";

describe("主 cron 注册验证", () => {
  it("包含 zhao-logistics 的原有任务（回归）", () => {
    const keys = Object.keys(mainCronConfig);
    // logistics cron 应至少有 1 个任务（不假设具体 key，只验证非空）
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it("包含 zhao-track 的每分钟订单同步任务", () => {
    const keys = Object.keys(mainCronConfig);
    expect(keys).toContain("*/1 * * * *");
  });

  it("包含 zhao-track 的每日 03:00 归因任务", () => {
    const keys = Object.keys(mainCronConfig);
    expect(keys).toContain("0 3 * * *");
  });

  it("包含 zhao-deal 的每小时同步任务", () => {
    const keys = Object.keys(mainCronConfig);
    expect(keys).toContain("0 * * * *");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/config/cron-registration.test.ts --no-cache`
Expected: FAIL with "Expected keys to contain: '*/1 * * * *'"（因为主 cron 当前只导入 logisticsCron）

- [ ] **Step 3: Write minimal implementation**

替换 `strapi/config/cron.ts` 全部内容为：

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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd strapi/plugins/zhao-deal && npx jest tests/config/cron-registration.test.ts --no-cache`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd strapi
git add config/cron.ts plugins/zhao-deal/tests/config/cron-registration.test.ts
git commit -m "feat: register zhao-track + zhao-deal cron into main config"
```

---

## Task 4: 全量回归验证

**Files:** 无（仅运行验证命令）

- [ ] **Step 1: 运行 zhao-deal 全量测试**

Run: `cd strapi/plugins/zhao-deal && npx jest --no-cache --no-coverage`
Expected: 所有测试通过（含原有测试 + 新增 8 个测试：4 个 sync-scheduler.run + 4 个 cron 配置 + 4 个主 cron 注册）

- [ ] **Step 2: 运行 zhao-track 全量测试（回归验证，不应受影响）**

Run: `cd strapi/plugins/zhao-track && npx jest --no-cache --no-coverage`
Expected: 所有测试通过（与本次改动前一致）

- [ ] **Step 3: 运行 4 插件 build 验证**

Run（4 个命令分别执行）：
```
cd strapi/plugins/zhao-deal && npm run build
cd strapi/plugins/zhao-track && npm run build
cd strapi/plugins/zhao-studio && npm run build
cd strapi/plugins/zhao-auth && npm run build
```
Expected: 4 个 build 全部成功

- [ ] **Step 4: 验证主 config/cron.ts 编译通过**

Run: `cd strapi && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误（如果 strapi 根 tsconfig.json 不包含 config/ 目录，跳过此步）

- [ ] **Step 5: 如有失败，修复后重新提交**

如果上述任一验证失败，根据错误信息修复，重新运行验证，验证通过后提交：

```bash
cd strapi
git add -A
git commit -m "fix: regression issues from cron registration"
```

如果全部通过，无需额外提交，本 task 只是验证。

---

## Self-Review

**1. Spec coverage:**

- §2.1 调度结构（zhao-deal cron `0 * * * *` + zhao-track 2 个 cron + logistics 现有）→ Task 3 ✅
- §2.2 sync-scheduler.run() 逻辑（查平台 + shouldRunNow + syncPlatformData×2 + 错误隔离）→ Task 1 ✅
- §2.3 run() 伪代码 → Task 1 Step 3 ✅
- §2.4 PLATFORM_UID 常量 → Task 1 Step 3 ✅
- §3.1 zhao-deal 数据流 → Task 1+2 ✅
- §3.2 zhao-track 数据流（已有，注册即可）→ Task 3 ✅
- §4.1 文件清单 3 个文件 → Task 1+2+3 ✅
- §5.1 新建 zhao-deal cron 配置 → Task 2 ✅
- §5.2 修改 sync-scheduler.ts → Task 1 ✅
- §5.3 修改主 cron 配置 → Task 3 ✅
- §6.1 sync-scheduler run() 单元测试（4 用例）→ Task 1 ✅
- §6.2 cron 配置测试（3 用例）→ Task 2 ✅（实际 4 用例，多了一个"run() 抛错被捕获"测试）
- §6.3 主 cron 注册测试（3 用例）→ Task 3 ✅（实际 4 用例，多了一个"logistics 回归"测试）
- §6.4 回归验证 → Task 4 ✅

**2. Placeholder scan:** 无 TBD/TODO/占位符，所有代码完整 ✅

**3. Type consistency:**
- `run()` 方法签名：`async run()` 返回 `{ processed: number }` — Task 1 实现 + Task 1 测试 + Task 2 cron 调用 一致 ✅
- `syncPlatformData` 参数：`{ platformCode: string, type: "coupons" | "products" }` — Task 1 实现 + Task 1 测试 一致 ✅
- `syncPlatformData` 返回值：`{ fetched, created, updated }` — Task 1 实现（访问 .fetched/.created/.updated）+ Task 1 测试 mock（返回 {fetched, created, updated}）一致 ✅
- cron 回调签名：`async ({ strapi }: { strapi: any }) => void` — Task 2 实现 + Task 2 测试 + Task 3 主 cron 一致 ✅
- PLATFORM_UID：`"plugin::zhao-deal.platform"` — Task 1 实现 + Task 1 测试 mock（documents('plugin::zhao-deal.platform')）一致 ✅
