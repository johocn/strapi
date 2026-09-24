# Redis 崩溃修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-wealth 插件在 Redis 不可用时 Node 进程崩溃的问题，通过预探测 + 跳过队列初始化实现优雅降级。

**Architecture:** 在 Bull 队列创建前用 ensureRedisAvailable() 预探测，不可用则跳过队列创建；可用则创建队列并设置 maxRetriesPerRequest:1 兜底。setupQueues 异步化，bootstrap await 调用链贯通。

**Tech Stack:** Strapi v5 + TypeScript + Bull + ioredis

**Spec:** `docs/superpowers/specs/2026-06-30-redis-crash-fix-design.md`

---

## Task 1: queue-setup.ts 异步化与预探测

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/queue-setup.ts`

- [ ] **Step 1: 修改 queue-setup.ts 完整改动**

完整替换 `basic/plugins/zhao-wealth/server/src/jobs/queue-setup.ts` 内容为：

```typescript
'use strict';

import Queue from 'bull';
import { markRedisUnavailable, ensureRedisAvailable } from '../utils';

let collectQueue: Queue.Queue | null = null;
let calculateQueue: Queue.Queue | null = null;
let recalculateQueue: Queue.Queue | null = null;
let queueSetupFailed = false;

export async function setupQueues(strapi: any) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // 预探测 Redis 可用性，不可用则直接跳过队列创建（避免 Bull 内部 ioredis 崩溃进程）
  const available = await ensureRedisAvailable();
  if (!available) {
    queueSetupFailed = true;
    markRedisUnavailable();
    strapi.log.warn('[zhao-wealth] Redis 不可用，队列功能降级（API 与手动操作仍可用）');
    return;
  }

  try {
    // Bull 构造参数使用对象形式，maxRetriesPerRequest: 1 作为兜底防护
    collectQueue = new Queue('wealth-collect', { redis: redisUrl, maxRetriesPerRequest: 1 }, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    calculateQueue = new Queue('wealth-calculate', { redis: redisUrl, maxRetriesPerRequest: 1 }, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    recalculateQueue = new Queue('wealth-recalculate', { redis: redisUrl, maxRetriesPerRequest: 1 }, {
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    strapi.log.info('[zhao-wealth] Bull队列初始化完成');
  } catch (error) {
    queueSetupFailed = true;
    markRedisUnavailable();
    strapi.log.warn(`[zhao-wealth] Bull队列初始化失败，队列功能将不可用: ${error.message}`);
  }
}

export function getCollectQueue(): Queue.Queue | null {
  return collectQueue;
}

export function getCalculateQueue(): Queue.Queue | null {
  return calculateQueue;
}

export function getRecalculateQueue(): Queue.Queue | null {
  return recalculateQueue;
}

export function isQueueAvailable(): boolean {
  return !queueSetupFailed && collectQueue !== null;
}
```

**关键改动点**：
1. import 新增 `ensureRedisAvailable`
2. `setupQueues` 改为 `async function`
3. 开头预探测 Redis，不可用则 return（不创建队列）
4. 3 个 `new Queue` 第二参数从 `redisUrl` 字符串改为 `{ redis: redisUrl, maxRetriesPerRequest: 1 }` 对象
5. 其余函数（getCollectQueue 等）保持不变

- [ ] **Step 2: 验证文件无语法错误**

读取修改后的文件，确认：
- import 行正确包含 `ensureRedisAvailable`
- `setupQueues` 前有 `export async function`
- 3 个 `new Queue` 第二参数都是对象形式
- 文件末尾无残留旧代码

---

## Task 2: jobs/index.ts 异步化

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/jobs/index.ts`

- [ ] **Step 1: 修改 jobs/index.ts**

完整替换 `basic/plugins/zhao-wealth/server/src/jobs/index.ts` 内容为：

```typescript
'use strict';

import { setupQueues } from './queue-setup';
import { registerCollectJobs } from './collect-job';
import { registerCalculateJobs } from './calculate-job';
import { registerRiskMetricJobs } from './risk-metric-job';

export default async ({ strapi }) => {
  await setupQueues(strapi);
  registerCollectJobs(strapi);
  registerCalculateJobs(strapi);
  registerRiskMetricJobs(strapi);
};
```

**关键改动点**：
1. 函数声明改为 `async`
2. `setupQueues(strapi)` 改为 `await setupQueues(strapi)`
3. 其余 register 调用保持同步（它们不依赖 Redis）

- [ ] **Step 2: 验证文件无语法错误**

读取修改后的文件，确认：
- `export default async ({ strapi }) =>`
- `await setupQueues(strapi)`

---

## Task 3: bootstrap.ts 异步化

**Files:**
- Modify: `basic/plugins/zhao-wealth/server/src/bootstrap.ts`

- [ ] **Step 1: 修改 bootstrap.ts 函数签名与 jobs 调用**

当前 bootstrap.ts 第 7-10 行：
```typescript
export default ({ strapi }) => {
  // 初始化队列任务
  jobs({ strapi });
```

改为：
```typescript
export default async ({ strapi }) => {
  // 初始化队列任务
  await jobs({ strapi });
```

**仅改 2 处**：
1. `export default ({ strapi }) =>` → `export default async ({ strapi }) =>`
2. `jobs({ strapi });` → `await jobs({ strapi });`

其余代码（Cron 注册等）保持不变。

- [ ] **Step 2: 验证文件无语法错误**

读取修改后的文件，确认：
- `export default async ({ strapi }) =>`
- `await jobs({ strapi });`
- 其余 Cron 代码未变动

---

## Task 4: 启动验证

**Files:**
- 无文件改动，仅运行验证

- [ ] **Step 1: 停止 Redis 服务**

```bash
# 停止本地 Redis（如果在运行）
# Windows: 找到 redis-server 进程并停止
# 或修改 .env 中 REDIS_URL 指向不存在的地址，如 redis://localhost:6399
```

- [ ] **Step 2: 启动 Strapi**

```bash
cd e:\code\basic
npm run develop
```

- [ ] **Step 3: 验证进程不崩溃**

预期日志出现：
```
[zhao-wealth] Redis 不可用，队列功能降级（API 与手动操作仍可用）
[zhao-wealth] 插件已启动
```

**关键验收**：Strapi 进程**不崩溃**，能正常加载到 admin 页面。

- [ ] **Step 4: 验证 API 可用**

打开 Strapi admin，进入 zhao-wealth 插件：
- 仪表盘：能加载（统计接口可能返回空数据，但不报错）
- 产品管理：能查询产品列表
- 指标中心：能查询指标数据
- 采集监控：能查看采集配置列表

- [ ] **Step 5: 验证 Cron 降级**

等待 Cron 触发（或手动调用触发接口），预期日志：
```
[zhao-wealth] 采集队列不可用（Redis 未就绪），跳过
```

**关键验收**：Cron 触发时进程**不崩溃**，仅 warn 日志。

- [ ] **Step 6: 恢复 Redis 后重启验证**

恢复 Redis 服务（或还原 REDIS_URL），重启 Strapi，预期：
```
[zhao-wealth] Bull队列初始化完成
[zhao-wealth] 插件已启动
```

队列功能恢复正常。

---

## Task 5: 提交

**Files:**
- 无新增文件，3 个文件修改

- [ ] **Step 1: git 提交**

```bash
cd e:\code\basic
git add plugins/zhao-wealth/server/src/jobs/queue-setup.ts plugins/zhao-wealth/server/src/jobs/index.ts plugins/zhao-wealth/server/src/bootstrap.ts
git commit -m "fix(wealth): Redis 不可用时进程崩溃 - 预探测+跳过队列初始化

- setupQueues 异步化，预探测 Redis 可用性
- 不可用时跳过 Bull 队列创建，避免内部 ioredis 崩溃进程
- Bull 构造参数增加 maxRetriesPerRequest:1 兜底
- bootstrap await 调用链贯通"
```

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|----------|
| queue-setup.ts 异步化 + 预探测 | Task 1 |
| jobs/index.ts 异步化 | Task 2 |
| bootstrap.ts await | Task 3 |
| 验证进程不崩溃 | Task 4 |
| 验证 API 可用 | Task 4 |
| 验证 Cron 降级 | Task 4 |
| 验证 Redis 恢复 | Task 4 |

### 2. 占位符扫描

- 无 TBD/TODO
- 所有代码块完整可运行
- 3 个文件的改动明确（完整替换或精确 2 行改动）

### 3. 类型/命名一致性

- `ensureRedisAvailable` 在 redis-client.ts 已存在，import 路径 `../utils` 正确
- `markRedisUnavailable` 已 import，保持不变
- `setupQueues` 异步化后，所有调用点（jobs/index.ts）都改为 await
- Bull 构造参数对象形式 `{ redis, maxRetriesPerRequest }` 与 Bull v4 API 一致

### 4. 风险确认

- Strapi v5 bootstrap 支持 async（project_memory 已确认）
- Bull v4 构造参数对象形式受支持（第二参数为 `QueueOptions`，含 `redis` 字段）
- registerCollectJobs 等保持同步调用，不依赖 Redis 连接，无需异步化
