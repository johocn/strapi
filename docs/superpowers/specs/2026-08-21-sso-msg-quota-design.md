# 触达频控（SSO Msg Quota）设计

> 阶段：自动化进阶 · 最小闭环：触达频控（防骚扰）

## 1. 背景与目标

消息中心（zhao-sso）当前仅依赖 `dedupeKey` 幂等去重，**没有按用户维度的频次控制**。活动后运营（复购/挽回/回执）等多场景触达叠加后，可能对同一用户造成"每日轰炸"。本特性引入用户维度的频控：**每日总条数上限 + 每场景冷却间隔**，在实际发送前拦截，保障触达质量、降低退订风险。

## 2. 设计决策（已确认）

| 决策点 | 结论 |
| --- | --- |
| 频控维度 | 用户每日总条数上限 + 每场景冷却间隔 |
| 拦截时机 | `sendJob` 实际发送前（立即/延迟任务统一在发送窗口判定） |
| 超限行为 | job 置终态 `quota_limited`，不调通道、不累加版本计数、cron 不重试 |
| 实现结构 | 独立 `sso-quota` service 封装判定，发送链路统一调用 |
| 配置落点 | 全局默认存 `sso-quota-config`（zhao-sso 侧）；`msg-template` 可覆盖（模板/场景级） |

依赖方向：保持 point → sso 单向依赖，本特性**不**读取 zhao-point 的 point-config。

## 3. 数据模型

### 3.1 新增 `sso-quota-config`（单票 collectionType）

- `maxDailyPerUser`：integer，默认 10（每用户每日最多触达条数）
- `cooldownMinutes`：integer，默认 120（同场景相邻两条消息的最小间隔分钟）

### 3.2 修改 `msg-template`（zhao-sso）

新增两个可选字段（可空，空则回退全局默认）：

- `dailyCap`：integer（覆盖全局每日上限）
- `cooldownMinutes`：integer（覆盖全局冷却）

### 3.3 修改 `msg-job`

`status` 枚举追加 `quota_limited`：

```
["pending", "sending", "sent", "failed", "cancelled", "quota_limited"]
```

被频控拦下的 job 以 `quota_limited` 为终态，`result` 记录 `{ reason: "daily_cap" | "cooldown", scene, config }`。

## 4. 频控判定逻辑（sso-quota service）

```
evaluate({ userId, scene, templateId }) -> { allowed: boolean, reason?: 'daily_cap'|'cooldown', detail? }
```

取值优先级（元数据）：`msg-template.id` 显式覆盖 → `sso-quota-config` 全局默认。

### 每日总条数上限

- 计数：`sso_msg_jobs WHERE user = userId AND status = 'sent' AND sentAt ∈ [今日0点, now]`
- 若 `count >= maxDaily` → 拒 `daily_cap`

### 场景冷却

- 查该用户同 `scene` 最近一条 `status='sent'` 的 `sentAt`
- 若 `now - sentAt < cooldownMinutes` → 拒 `cooldown`

> 边界：每日计数用服务器本地自然日；并发下近似计数视为可接受（MVP 不做严格原子），判定处记录 `strapi.log.warn` 便于排查。

## 5. 接入发送流程（sendJob）

在 `sendJob(jobId)` 实际调用 `channel.send` 之前插入判定：

```
job 存在 → status 终态检查 → template 检查（既有）
→ sso-quota.evaluate({ userId, scene, templateId })
   ├─ allowed → 继续解析 toTarget / 版本内容 / channel.send（既有）
   └─ 拒绝 → update job { status: 'quota_limited', result: { reason, ... } }
             → return getJob(job.id)（不调 channel.send，不累加版本计数）
```

要点：

- 延迟任务（复购/挽回等 `scheduledAt` 次日）在**发送日**由 cron 捞起后仍走 `sendJob`，此刻才判频控，计数为发送日真实数据，最准确。
- 终态 `quota_limited` 不在 `listPendingJobsForSend` 的 `status='pending'` 过滤内，cron 不会反复重试。
- 被拦后不累加 `msg-template-version` 的 `sentCount/successCount`。

## 6. 接口/管理端

MVP **不新增** 管理端看板与 API；配置变更经 CMS 直编 `sso-quota-config` 与 `msg-template` 字段。验收用 DB 直插断言。后续如需看板再排期。

## 7. 验收要点（accept-sso-quota.cjs）

1. 全局默认：构造用户，`sendJob` 达 `maxDailyPerUser` 条后下一条被拦（`quota_limited`/`daily_cap`）
2. 场景冷却：同 `scene` 两次发送间隔 < `cooldownMinutes` → 第二条被拦；换 scene 不受影响
3. 模板覆盖：为指定模板设 `dailyCap` 覆盖全局后按模板值生效
4. 版本计数：被拦 job 不累加 `sentCount`
5. cron：`quota_limited` 不在待发送捞取列表
6. 清理零残留：删除测试用户/job/模板/配置，断言无残留

## 8. 风险与边界

- 每日计数自然日界定、并发近似：记录 warn，MVP 接受
- 超限静默跳过，不额外通知用户（YAGNI）
- `status` 枚举改动需重建插件产物，`stripe` 前端枚举若硬编码需同步（只影响 msg-job 内部，无前端枚举引用）
- 现有 `accept-ab-test.cjs` 等历史验收依赖 status 枚举，新增值向后兼容，不影响既有终态分支