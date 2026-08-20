# 自动化 SOP（消息编排层）设计

> 阶段三：在消息中心（zhao-sso，已具备通道/模板/任务/关注态）之上，抽象通用 SOP 编排层，
> 支持**事件触发 + 定时触发**，覆盖活动报名/未到场回访/课后 7 天三类场景。

## 1. 目标与边界
- 编排层落 zhao-sso（与消息中心同域），业务插件只做"事件埋点"，不关心发送细节。
- 复用已有 `sso_msg_jobs` 与 `sso-msg.buildJob/sendJob`；新增规则表与触发/调度入口。
- 编排=「规则 + 事件/时间 → 生成 msg-job（含 scheduledAt）→ cron 到期发送」。
- 依赖：zhao-point(活动)、zhao-course(课程) 事件埋点；本人不在生产代码写规则文案。

## 2. 数据模型 `sso_sop_rules`（content-type: sop-rule）
| 字段 | 类型 | 说明 |
|---|---|---|
| code | string unique | 规则编码，如 act_confirm / act_before / act_noshow_revisit / course_d7 |
| name | string required | 规则名 |
| source | enumeration | event \| cron \| 默认 event |
| event | string | source=event 时的事件名，如 activity.signup / activity.closed / course.enrolled |
| cronExpression | string | source=cron 时的 cron 表达式 |
| templateCode | string(relation) | 关联 msg-template |
| scene | string required | 生成 job 的 scene |
| delayMinutes | integer default 0 | source=event 且未传 schedules 时的相对延迟 |
| link | string | 跳转链接（支持 {placeholder}） |
| paramsTemplate | json | 从 payload 提取 params 的映射，如 {"eventName":"payload.activity.name"} |
| enabled | boolean default true | 开关 |
| description | text | 说明 |

## 3. 编排服务 `sso-sop`
```ts
// 事件触发：业务埋点统一入口
trigger(event: string, opts: {
  user: number;
  payload?: Record<string, any>;      // 业务上下文
  schedules?: Array<{                  // 可选：业务精确排期覆盖规则
    templateCode: string;
    scene?: string;
    scheduledAt?: string;              // 精确发送时间（如 活动开始前24h）
    delayMinutes?: number;             // 或相对延迟；两者取一
    params?: Record<string, any>;
    link?: string;
    dedupeKey?: string;
  }>;
}): Promise<{ job: any; skipped: boolean }[]>

// cron 调度：扫描到期 pending job 发送（含 next_retry_at 到期）
runDueJobs(limit?): Promise<number>
```

`trigger` 逻辑：
1. source=event && event 匹配 && enabled 的规则（无 schedules 时）→ 每条按 paramsTemplate 提参、delayMinutes 算 scheduledAt、dedupe=`sop:{code}:{user}` 调 buildJob。
2. 有 schedules 时 → 逐条 buildJob（覆盖默认规则）。
3. 返回结果（幂等由 dedupeKey 保证）。

## 4. 定时调度 config/cron.ts（zhao-sso）
- `* * * * *`（每 1 分钟）→ `sso-sop.runDueJobs(50)`，防重入 try/catch。
- `sso-msg.listPendingJobsForSend` 增强：只取 `scheduled_at<=now && (next_retry_at 为空 || <=now)` 的 pending，避免提前发送。

## 5. 场景规则与业务埋点
| 事件 | 触发点(业务插件) | 生成的 job |
|---|---|---|
| activity.signup | zhao-point 报名成功 service | 报名成功(立即) + 活动前提醒(活动开始前24h，业务传 schedules) |
| activity.closed | zhao-point 活动结束时(签到/cron 判定结束对未到场者) | 未到场回访(立即，业务遍历未签到 userId) |
| course.enrolled | zhao-course 购课/报名成功 service | 课后7天SOP(第1/3/7天，业务传 schedules) |

埋点一律 1 行调用：`strapi.plugin("zhao-sso").service("sso-sop").trigger("activity.signup", { user, payload:{activity}, schedules:[...] })`。
业务侧负责算精确 scheduledAt；未关注用户跳过（resolveToTarget 为空则 sendJob 置 failed(no_target)，不重试阻塞）。
新增默认规则在 bootstrap 幂等 upsert（code 维度），运营可后台改 enabled/delay。

## 6. 管理端 API（zhao-sso admin 路由）
- `GET  /sop-rules`、`POST /sop-rules`、`PUT  /sop-rules/:id`、`DELETE /sop-rules/:id`（sso.msg.read / sso.msg.write）
- 后台 UI 后续补（本阶段以 API + seed 规则为准，贴合最小闭环）。

## 7. 风险与约束
- cron 单实例防重复：发送前 checklist status=editing；调度器幂等。
- 依赖现有 msg 通道 mock 开关（MSG_WECHAT_PROVIDER=mock），本地验收零外呼。
- 不新增 dependencies，全部复用现有插件/axios/strapi 原生能力。