# 渠道邀请码注册「每用户单建渠道」关闭设计

日期：2026-08-26
状态：待审阅
范围：zhao-channel 插件后端（`register/public` 新用户注册路径）

## 1. 背景与目标

当前 web 运营端注册页（`/pages/register/register`）携带渠道邀请码注册新用户时，调用 `POST /zhao-channel/v1/channel/register/public` → `channel.register()`，会**为每一个新用户单独创建一个子渠道**（创建渠道 + 用户 + channel-member(admin) + user-channel 授权 + user-invite 分销绑定）。

该"每用户一渠道"当前用处不大，目标：用最简单的开关将其关闭，关闭后新用户**加入上级渠道成为成员**（不再单建渠道）；功能不删除，可随时再次开启。

## 2. 开关（标注）

| 项 | 值 |
| --- | --- |
| 环境变量名 | `CHANNEL_AUTO_CREATE_CHANNEL` |
| `true` | 开启"每用户单建渠道"（原行为，默认未设置时视为关闭） |
| `false` / 未设置 | 关闭（新行为：加入上级渠道成为成员） |

**再次开启方法**：在 `.env` 设置 `CHANNEL_AUTO_CREATE_CHANNEL=true` → `pm2 restart`。无需重建/重新部署 dist。

## 3. 改动点（仅后端）

### 3.1 `channel.register()` 增加入参

`e:\code\basic\plugins\zhao-channel\server\src\services\channel.ts`

```ts
async register(data: { ... }, opts?: { newUser?: boolean })
```

- 当 `opts?.newUser === true && process.env.CHANNEL_AUTO_CREATE_CHANNEL !== "true"` 时走「加入上级渠道」分支；否则走原逻辑。
- 原「创建渠道」代码**不删除**，仅分支。

### 3.2 控制器传参

`e:\code\basic\plugins\zhao-channel\server\src\controllers\channel.ts`

- `registerPublic` → `service.register(parsed, { newUser: true })`
- `register`（`my/channel/register`，登录用户建子渠道）→ `service.register(parsed)`，**不受影响**

### 3.3 加入上级渠道分支流程

1. 校验邀请码对应上级渠道（沿用现有：存在、未禁用、非叶子）
2. email / username 唯一性预检（沿用现有，避免孤儿用户）
3. zhao-auth `createUser` 创建用户
4. **复用** `channel-member.joinByInvite(user.id, code)`：加入上级渠道为成员（channel-member role=member + user-invite 分销绑定 + 幂等已有成员判断）
5. 返回 `{ user, joinedChannel }`（响应结构保持稳定）

## 4. 风险点

- 关闭后新用户是上级渠道的 **member** 而非 owner；若后续有报表/统计依赖"每用户一渠道"维度，该维度会缺失（文档标注即可）
- `my/channel/register`（登录用户注册真实子渠道）不受影响，渠道树功能完好
- 需回归验证 `register/public` 在两种模式下均正常（开 / 关各一次）

## 5. 文档标注

- 环境变量名作为"标注"写入 `zhao-channel\docs\Channel手册.md` 与 `zhao-channel\docs\backend-invite.md`（注册流程章节）

## 6. 验收

- [ ] 关闭模式：新用户携带渠道邀请码注册 → 不产生新渠道；新用户成为上级渠道成员（role=member）；分销绑定正常
- [ ] 开启模式（设 `CHANNEL_AUTO_CREATE_CHANNEL=true`）：恢复每用户单建渠道原行为
- [ ] `my/channel/register` 不受开关影响
