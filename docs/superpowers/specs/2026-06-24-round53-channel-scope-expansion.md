# 第 53 轮：渠道范围过滤扩展 + R52 遗留修复

## 背景

第 52 轮在 zhao-common 实现了渠道过滤基线，但审计发现：
1. R52 遗留 4 个 Bug（类型不匹配、createThird 越权、回退路径、浅合并）
2. 业务插件（zhao-point/zhao-channel/zhao-course/zhao-quiz）渠道过滤大面积空白

本轮目标：抽取通用工具 + 修复 R52 Bug + 改造 zhao-point/zhao-channel。zhao-course/zhao-quiz 留下一轮。

## 任务 1：通用渠道过滤工具

### 改造点

扩展 [channel-scope.service.ts](file:///e:/code/basic/plugins/zhao-auth/server/src/services/channel-scope.service.ts)，新增两个纯函数方法：

```typescript
// 构造 filters 中的 channel 过滤条件
// field: 关系字段名（"channel" 单数 / "channels" 复数）
// all=true 或无 scope → 返回 null（不过滤）
// all=false 且 channelIds=[] → 返回永假条件（查不到记录）
// all=false 且 channelIds 非空 → 返回 { [field]: { id: { $in: channelIds } } }
buildChannelFilter(scope: ChannelScope | undefined, field: string): Record<string, any> | null

// 校验单条记录的 channel 关系是否在 scope 内
// field: 关系字段名；record[field] 可能是对象、数组或 null
// all=true 或无 scope → 放行
// 记录无 channel 关联 → 放行（兼容旧数据）
// 记录 channel.id 在 channelIds 内 → 放行；否则抛 403
assertRecordInScope(scope: ChannelScope | undefined, record: any, field: string): void
```

### 设计要点

- `channelIds` 是 `number[]`，过滤用 `id`（数字主键），不用 `documentId`（字符串）
- `assertRecordInScope` 处理 manyToOne（对象）和 manyToMany（数组）两种关系
- 纯函数，不依赖 strapi 实例，避免循环依赖

### 调用方式

各插件控制器：
```typescript
const scope = ctx.state?.channelScope;
const filter = strapi.plugin("zhao-auth").service("channel-scope").buildChannelFilter(scope, "channel");
if (filter) Object.assign(filters, filter);
// 或 detail 校验：
strapi.plugin("zhao-auth").service("channel-scope").assertRecordInScope(scope, record, "channel");
```

## 任务 2：修复 R52 遗留 Bug

### P0：assertThirdPartyInScope 类型不匹配

**现状**：[config.ts:33](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts#L33) `c.documentId ?? c.id` 取 documentId（字符串），与 `scope.channelIds`（number[]）比较永远 false。

**修复**：改用通用工具 `assertRecordInScope`，通过 site.channels 间接校验。删除 `assertThirdPartyInScope` 和 `buildSiteChannelFilter` 本地实现，统一用通用工具。

### P1：createThird 缺渠道校验

**修复**：`createThird` 读取 `body.site`，查询该 site 的 channels，与 channelScope 求交集，无交集抛 403。

### P2：record.site.id 回退路径

**修复**：通用工具 `assertRecordInScope` 内部不依赖 documentId，直接用 `id`，无回退路径问题。

### P3：filters.site 浅合并

**决策**：保持浅合并。用户叠加 channel 子过滤属 YAGNI，不实现。

## 任务 3：zhao-point 渠道过滤

### 改造范围

| 内容类型 | 关系字段 | 改造方法 |
|---|---|---|
| point-record | `channel` (manyToOne) | findRecords/findOneRecord/adminAdjust/batchAdjust |
| point-redemption | `channel` (manyToOne) | findRedemptions/findOneRedemption/updateRedemption |
| point-product | `channel` (manyToOne) | findProducts/findOneProduct/create/update/delete/adjustStock |
| pickup-location | `channels` (manyToMany) | findPickupLocations/findOnePickupLocation |
| channel-verification | `channel` (manyToOne) | findVerifications/findOneVerification |

### 改造模式

- list 类：`buildChannelFilter(scope, "channel")` 注入 filters
- detail/update/delete：查记录后 `assertRecordInScope(scope, record, "channel")`
- create：校验 `body.channel` 是否在 scope 内（需查 channel.documentId → id）

### 不改造

- point-config/point-type/rule-template：全局配置，非渠道维度
- sign-in-record：无 channel 字段（签到按用户，不按渠道）
- point.earn/point.deduct：积分增减内部接口，由调用方保证渠道

## 任务 4：zhao-channel 渠道过滤

### 改造范围

| 内容类型 | 关系字段 | 改造方法 |
|---|---|---|
| channel | 自身 id | find/adminFind/adminFindOne/adminGetChildren/adminGetHierarchy |
| channel-member | `channel` (manyToOne) | find/findOne/create/update/delete |
| user-invite | `inviteChannel` (manyToOne) | find/findOne |

### 特殊处理：channel 自身过滤

channel 内容类型过滤自身，`buildChannelFilter` 需支持 `field: "id"`：
```typescript
// scope.all=false 时返回 { id: { $in: channelIds } }
```

### 改造模式

- channel.find/adminFind：service.find 接收 channelScope，非 admin 仅返回 channelIds 范围内的渠道
- channel.adminFindOne/adminUpdate/adminDelete：校验 params.documentId 对应的 channel.id 是否在 scope 内
- channel-member/user-invite：用 `buildChannelFilter(scope, "channel"/"inviteChannel")` 过滤

## 风险点

1. **channel 自身过滤循环依赖**：channel-scope.service 内部调用 channel-permission.getUserAllChannels，若 channel.find 再调用 channel-scope 过滤，可能循环。需确认 channel-scope.buildChannelFilter 是纯函数，不调用 resolve。
2. **create 操作的 channel 校验**：body.channel 通常是 documentId，需先查 channel.id 再校验。增加一次查询。
3. **zhao-point 改造量大**：5 个内容类型 × 多个方法，需逐个改造，单轮可能较重。

## 验证

- 通用工具：单元测试 buildChannelFilter/assertRecordInScope 各种 scope 场景
- R52 修复：非 admin 用户调用 getThirdOne 正常返回（不再 403）；createThird 到无权 site 返回 403
- zhao-point：非 admin 调用 findRecords 仅返回其渠道的积分流水
- zhao-channel：非 admin 调用 adminFind 仅返回其渠道树

## 不在本轮范围

- zhao-course user-course-auth 过滤
- zhao-quiz quiz-record/quiz-exam-attempt 间接过滤（需通过 course 三跳关联）
- zhao-tag（无 HTTP 接口）
