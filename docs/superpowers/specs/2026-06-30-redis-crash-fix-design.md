# Redis 崩溃修复设计

## 问题

Strapi 启动时，若 Redis 不可用，Node 进程崩溃退出，错误：

```
MaxRetriesPerRequestError: Reached the max retries per request limit (which is 20)
    at Socket.<anonymous> (.../ioredis/built/redis/event_handler.js:207:37)
```

## 根因

**Bull 队列内部独立创建 ioredis 实例，不受 redis-client.ts 降级机制保护。**

调用链：
1. `bootstrap.ts` → `jobs/index.ts` → `queue-setup.ts:setupQueues()`
2. `setupQueues` 内 `new Queue(name, redisUrl, opts)` 同步执行
3. Bull 内部使用 `redisUrl` 创建 ioredis 实例，采用默认 `maxRetriesPerRequest: 20`
4. 该 ioredis 实例与 `utils/redis-client.ts` 创建的是**不同实例**
5. `redis-client.ts` 的 `maxRetriesPerRequest: 1` + `retryStrategy: () => null` 仅保护自己
6. Bull 内部 ioredis 重试 20 次后触发 `MaxRetriesPerRequestError`
7. error 事件**无人监听**（`new Queue` 同步返回，try/catch 捕获不到异步错误）
8. 错误冒泡到 process 顶层 → Node 崩溃

## 修复方案

**预探测 + 跳过队列初始化**：在创建 Bull 队列前，用 `ensureRedisAvailable()` 预探测 Redis 可用性，不可用则直接跳过队列创建，从源头消除 error 事件。

## 修改点

### 1. `server/src/jobs/queue-setup.ts`

- `setupQueues` 改为 `async function`
- 开头调用 `await ensureRedisAvailable()` 预探测
- 不可用则 `markRedisUnavailable()` + 设置 `queueSetupFailed = true` + 日志告警 + return
- 可用则进入 try/catch 创建队列，Bull 构造参数改为对象形式 `{ redis, maxRetriesPerRequest: 1 }` 作为兜底
- 新增 import: `ensureRedisAvailable`

### 2. `server/src/jobs/index.ts`

- `setupQueues(strapi)` 改为 `await setupQueues(strapi)`
- `jobs` 函数改为 `async`

### 3. `server/src/bootstrap.ts`

- `jobs({ strapi })` 改为 `await jobs({ strapi })`
- `bootstrap` 函数改为 `async`（Strapi v5 bootstrap 支持 async）

## 非目标

- 不修改 `redis-client.ts`（已正确实现降级）
- 不引入 `process.on('uncaughtException')` 全局兜底
- 不处理 Redis 中途恢复（运行期间降级后不自动恢复，需重启 Strapi）
- 不修改 Cron 任务代码（已有 `isQueueAvailable()` 检查）

## 验证方式

1. 停止 Redis 服务（或修改 REDIS_URL 指向不存在的地址）
2. 启动 Strapi
3. 预期：日志显示 `[zhao-wealth] Redis 不可用，队列功能降级（API 与手动操作仍可用）`，**进程不崩溃**
4. 调用产品查询 API → 正常响应
5. 调用指标查询 API → 正常响应
6. 触发 Cron（或手动调用触发接口）→ 日志显示 `采集队列不可用（Redis 未就绪），跳过`，**进程不崩溃**

## 风险点

1. 预探测与 Bull 创建之间有毫秒级窗口，极端情况仍可能失败，由 try/catch + `maxRetriesPerRequest: 1` 兜底
2. Strapi v5 bootstrap 支持 async（project_memory 已确认）
3. Bull 构造参数对象形式 `{ redis, maxRetriesPerRequest }` 在 Bull v4 API 中受支持
