# 系列报名规则细分（含积分计费） · 设计文档

- 日期：2026-08-21
- 关联：线上线下活动闭环 → 活动运营 → **系列报名规则细分**
- 仓库：basic（后端）· shao（C端）· web（管理端）
- 参考：`2026-08-21-activity-series-schedule-design.md`（系列/排期基础）、`2026-08-21-activity-waitlist-design.md`（候补）、`2026-20-activity-signup-checkin-design.md`（报名/签到）

## 1. 背景与目标

活动系列已支持排期批量/惰性生成场次，但 `generateSchedule` 每次只套用固定默认（`capacity=100`、空签到/报名窗口、无费用），系列下各场次规则无法按片差异化，也缺少"报名费"能力。

本轮落地：
1. **系列级默认报名/签到规则**：`defaultRules` 作为生成场次的规则模板。
2. **场次级覆盖**：每场显式落字段，可单场差异化签到/名额/费用。
3. **积分报名费**：场次可设积分价，支持 `signup`（报名预扣）/ `checkin`（签到时收）两种计费点，配套签名、取消退款。

**核心指标**：系列运营可按场次设置差异化报名策略，且引入轻量积分付费能力，不用外部支付即可验证"付费报名→到场核销→扣费"闭环。

## 2. 约束

- 复用现有 `plugin::zhao-point` 积分体系（`deductPoints`/`addPoints`/`earnPoints`）与 `activity.*` 服务分层。
- 不引入新 dependency（2G 服务器安装依赖易 OOM）。
- 报名名额仍用「带条件自增占位」防超卖，不引锁；计费失败需回滚占位，保证名额与扣费强一致。
- 幂等：扣费、退款、签到收费均需幂等，防重复扣/退。
- 严格遵循 Strapi schema/命名/安全规范。

## 3. 数据模型

### 3.1 `plugin::zhao-point.activity-series` 加 `defaultRules`（JSON）

作为排期生成场次的默认规则模板，字段与 activity 对应规则同名：

```json
"defaultRules": {
  "type": "json"
}
```

示例结构：

```json
{
  "capacity": 100,
  "signupOpenDays": 7,
  "checkinMode": "both",
  "geoEnforced": false,
  "geoRadiusM": 500,
  "pointsCost": 0,
  "feeCollectAt": "signup"
}
```

语义：
- `capacity`：每场默认名额（缺省沿用现有默认 100）。
- `signupOpenDays`：每场相对 `startTime` 提前 N 天开放报名（`signupStart = startTime - N天`）；`0`/缺省表示报名即时开放。
- `checkinMode` / `geoEnforced` / `geoRadiusM`：默认签到策略与地理强控。
- `pointsCost`：默认积分报名价（0=免费）。
- `feeCollectAt`：默认计费点（`signup`|`checkin`）。

### 3.2 `plugin::zhao-point.activity` 加两个字段

```json
"pointsCost": { "type": "integer", "default": 0 },
"feeCollectAt": { "type": "enumeration", "enum": ["signup", "checkin"], "default": "signup" }
```

- `pointsCost`：场次积分报名价，`0`=免费场。
- `feeCollectAt`：本场计费点。
  - `signup`：报名时预扣（默认）。
  - `checkin`：签到时收取，报名/转正不扣。

**注意**：见 §4，`activity` 在生成场次时继承 `defaultRules` 落成显式字段；两种计费点下 `signupStart`/`signupEnd` 的语义需特别处理（`signupOpenDays` 仅为生成 时的预设，运行期窗口仍以写死的 `signupStart`/`signupEnd` 为准）。

## 4. 后端逻辑（`plugin::zhao-point/services/activity` 与 `series-service`）

### 4.1 系列排期继承默认规则（`series-service.generateSchedule`）

生成场次时，把 `series.defaultRules` 落到每个新 activity 显式字段（缺省值由 defaultRules 或既有默认兜底）：

```ts
const dr = series.defaultRules || {};
data = {
  // ...既有 title/description/venue/startTime/endTime/status/belongsToSeries
  capacity: dr.capacity ?? 100,
  checkinMode: dr.checkinMode ?? "both",
  geoEnforced: dr.geoEnforced ?? false,
  geoRadiusM: dr.geoRadiusM ?? 500,
  pointsCost: dr.pointsCost ?? 0,
  feeCollectAt: dr.feeCollectAt ?? "signup",
  signupStart: dr.signupOpenDays ? new Date(startDate.getTime() - dr.signupOpenDays*24*3600*1000).toISOString() : null,
};
```

场次生成后可单场编辑覆盖（管理端表单扩展）。

### 4.2 报名（`activity.signup`）——按计费点分支

沿用现有流程并插入计费。伪代码：

```ts
const feeCollectAt = act.feeCollectAt || "signup";
const cost = act.pointsCost || 0;

// （既有校验：活动 signup_open、窗口内、去重 active/waiting）……

const knex = strapi.db.connection;
const reserved = await knex("activities").where("id", act.id)
  .andWhere("used_capacity", "<", knex.raw("capacity")).increment("used_capacity", 1);

if (reserved === 0) {
  // 满员 → 候补（不占名额、signup 模式也不预扣）
  return { ok: true, waitlisted: true, position };
}

if (feeCollectAt === "signup" && cost > 0) {
  try {
    await strapi.plugin("zhao-point").service("point").deductPoints({
      userId, action: "activity_fee", points: cost, source: "activity",
      method: "activity_signup", remark: `报名活动:${act.title}`, orderId: `act:${act.documentId}`,
    });
  } catch (e) {
    // 扣费失败（余额不足等）→ 回滚名额占位
    await knex("activities").where("id", act.id).decrement("used_capacity", 1);
    return { ok: false, reason: "insufficient_points" };
  }
}

await strapi.db.query(SIGNS_UID).create({ data: { user, activity: act.id, status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0 } });
// （既有：报名积分 activity_signup、预留存授权、SOP 埋点）
return { ok: true };
```

**占位/扣费强一致**：扣费失败必须回滚占位（`decrement used_capacity`），保证不出现"名额被占但未收费"。

**候补→转正（`promoteWaiting`）**：
- 原 `promoteWaiting` 原子占位后直接建 active；本设计下，若 `feeCollectAt === "signup" && cost > 0`，则转正时需先扣费：扣费成功才把该 waiting 转正，并**同时把该 signup 的 `pointsCharged` 更新为 `cost`**（转账时原为 0，必须落账供后续退费）；余额不足则该条跳过（保持 waiting），继续检查下一候补（本轮 `promoted` 计数只算真正转正的）。
- `feeCollectAt === "checkin"` 时转正不扣费（无所谓不足），`pointsCharged` 保持 0。

### 4.3 取消（`activity.cancel`）

沿用现有 `cancel` 分支，仅在 **signup 计费点 + 已缴费（active）** 时退费：

```ts
if (signup.status === "active") {
  const act = await …活动;
  if ((act.feeCollectAt || "signup") === "signup" && signup.pointsCharged > 0) {
    await strapi.plugin("zhao-point").service("point").refundPoints({
      userId, action: "activity_fee_refund", points: signup.pointsCharged, source: "activity",
      method: "activity_cancel", remark: `取消退费:${act.title}`,
      userChannelId: <当前用户渠道>, // 详见下方 createRecord 渠道约束
    });
  }
  // 释放名额 + 递补（既有）
}
```

- 退款用 `pointsCharged`（报名实际扣了多少钱），避免用当前改价后的 `pointsCost` 产生偏差。
- **幂等**：signup 记录新增 `pointsCharged`，cancel 仅在 `pointsCharged>0` 时退一次，天然幂等。
- `checkin` 计费点（报名未扣费 `pointsCharged=0`）无退款动作。
- **准确金额**：点服务现有 `earnPoints` 金额**由规则决定**、无法按实际 `pointsCharged` 精确退回，故点服务需新增 `refundPoints`（见 §4.4）。

### 4.4 点服务新增 `refundPoints`（`plugin::zhao-point/services/point`）

`pointsCharged` 需原样退回，无法复用按规则定款的 `earnPoints`，新增一个直接写 increase 记录的精确退款方法：

```ts
const refundPoints = async ({ userId, action, points, source, method, remark, orderId, userChannelId }) => {
  if (!points || points <= 0) throw new Error("无效退款金额");
  const balance = await getLatestBalance(userId);
  const record = await createRecord(userId, action, points, balance, "increase", {
    source, method, remark, orderId, userChannelId,
  });
  return record;
};
```

**渠道约束**：`createRecord` 强制要求 `channelId` 或 `userChannelId`（否则 POINT_020）。调用方（`activity.cancel`）需传入当前用户渠道——与 `grantPoints` 解析 userChannelId 的方式一致（channel-member 当前渠道，其次直接授权渠道）。`deductPoints` 成功路径的渠道处理对齐 `refundPoints` 的调用方传递，实施时以现网抽查为准（非占位，属实现对齐点）。

### 4.5 签到（`activity.checkin`）

- `feeCollectAt === "signup"`：报名时已扣费，签到无需再扣（`pointsGranted`/到场积分照旧）。
- `feeCollectAt === "checkin" && pointsCost > 0`：签到前 `deductPoints(pointsCost, action="activity_fee")`；余额不足则签到失败，返回"积分不足"（`{ ok:false, reason:"insufficient_points" }`），不落 attendance、不发到场积分。扣费成功才建立 attendance 与发积分。

**幂等**：`attendance` 单条已通过"每活动一次"检查（既有），签到收费组合到同一成功事务里，重复请求仍被 `already_checked_in` 拦截。

### 4.6 数据模型补充：`activity-signup` 加 `pointsCharged`（integer，默认 0）

记录报名实际扣费金额，供退款幂等与对账。

## 5. 前端

### web（管理端）
- `activity/form.vue`：新增 `pointsCost`（数字输入，0=免费）、`feeCollectAt`（select：signup/checkin）字段；满化创建/编辑/复制（duplicate 需带上两字段）。
- `series/form.vue`：新增 `defaultRules` 编辑块（capacity / signupOpenDays / checkinMode / geoEnforced / geoRadiusM / pointsCost / feeCollectAt）。
- 报名名单：每人展示报名费与是否已收/退款状态（可选增强；最小闭环可不加）。

### shao（C端）
- `activity/detail.vue`：展示报名价（积分价、计费点标注"报名扣"或"签到扣"）；报名/签到失败时展示 `insufficient_points` 提示。

## 6. 后端接口变更

- 复用既有路由，**无新路由**：
  - 报名 `POST /my/activity/signup`：新增可能返回 `{ ok:false, reason:"insufficient_points" }`。
  - 签到 `POST /my/activity/{id}/checkin`：checkin 计费点新增 `insufficient_points` 返回。
  - 取消 `POST /my/activity/{id}/cancel`：signup 计费点自动退费（接口契约不变）。
- `series-service.generateSchedule` / `duplicate`：继承 `defaultRules` / 复制 `pointsCost`+`feeCollectAt`。

## 7. 积分 action 约定

- `activity_fee`：报名/签到扣费（decrease）。
- `activity_fee_refund`：signup 模式会前取消退费（increase）。
- 均在默认积分规则中登记（无特殊限额；`deductPoints` 以 customPoints 覆盖 rule，故无需强制配置规则，但建议 DB 预置说明文案）。

## 8. 风险与注意点

- **占位/扣费一致**：signup 计费点扣费失败必须回滚占位；转正时扣费失败保持 waiting。
- **窗口语义**：`signupOpenDays` 仅在排期生成时换算成 `signupStart`；运行期以 activity 落库的 `signupStart/signupEnd` 为准，避免歧义。
- **退款对账**：退款以 `pointsCharged` 为准，不随改价漂移。
- **幂等**：扣费/退款/签到收费均在既有占位与 attendance 单条约束内，重放不产生重复扣/退。
- **既有行为兼容**：免费场（pointsCost=0）与 `feeCollectAt` 缺省（signup）下，无扣费、无退款，与现状一致。

## 9. 验收（`scripts/accept-series-rules.cjs`）

1. 建系列并设 `defaultRules`，生成场次后核对每场 `capacity/checkinMode/geo/pointsCost/feeCollectAt/signupStart` 已继承且可覆盖。
2. 免费场报名/签到与现状一致（无扣费）。
3. signup 计费场：报名成功即余额扣 `pointsCost`（`activity_fee` 记录）；余额不足报名被拒且名额回滚（used_capacity 未增）。
4. 收费场满员 → 候补；有人取消后：候补**有积分**转正并扣费 / **积分不足**保持 waiting 不转正。
5. signup 计费场会前取消 → 退 `activity_fee_refund`，名额释放，cardinality 正确。
6. checkin 计费场：报名不扣费；签到时扣费成功才落 attendance 与发积分；余额不足签到失败。
7. 端点/幂等复查：重复报名/取消/签到行为不回退（逐一断言）。

## 10. 分阶段（本期不做）

- 外部在线支付（支付宝/微信）计费
- 退费截止时间（活动开始 N 天前可退）
- 报名费多档/定金/阶梯价