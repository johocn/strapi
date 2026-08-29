# 渠道邀请码注册「关闭每用户单建渠道」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过环境变量开关关闭「渠道邀请码注册新用户时每用户单建渠道」，关闭后新用户改为加入上级渠道成为成员；开启时恢复原行为，功能不删除。

**Architecture:** 在 zhao-channel 插件 `channel.register()` 增加 `opts?: { newUser?: boolean }` 入参。当 `opts.newUser === true && process.env.CHANNEL_AUTO_CREATE_CHANNEL !== "true"` 时走「加入上级渠道」分支（建用户 → 复用 `channel-member.joinByInvite` 加入上级渠道 + 分销绑定，不建渠道）；否则完全走原逻辑。`registerPublic` controller 传 `{ newUser: true }`，`register`（my/channel/register）不传、不受影响。

**Tech Stack:** Strapi v5（zhao-channel 插件）、TypeScript、Jest（tests/jest.config.js）、PostgreSQL（测试库 strapi_test）。

**关键标注（开关）**：环境变量 `CHANNEL_AUTO_CREATE_CHANNEL`
- `true` = 开启「每用户单建渠道」（原行为）
- `false`/未设置 = 关闭（加入上级渠道）
- 再次开启：`.env` 设 `CHANNEL_AUTO_CREATE_CHANNEL=true` → `pm2 restart`，无需重建部署

---

## 文件结构

- Modify: `e:\code\basic\plugins\zhao-channel\server\src\services\channel.ts` — `register()` 加 opts 入参 + 分支 + 新增 `registerAsMember()` 方法
- Modify: `e:\code\basic\plugins\zhao-channel\server\src\controllers\channel.ts` — `registerPublic` 传 `{ newUser: true }`
- Test: `e:\code\basic\plugins\zhao-channel\tests\channel.test.ts` — 新增 3 组测试
- Docs: `e:\code\basic\plugins\zhao-channel\docs\Channel手册.md`、`e:\code\basic\plugins\zhao-channel\docs\backend-invite.md` — 标注开关

测试前置条件：本地 PostgreSQL 存在 `strapi_test` 库（tests/helpers/strapi-setup.ts 默认 127.0.0.1:5432，user=postgres，password=admin）。测试命令统一在 `e:\code\basic\plugins\zhao-channel` 目录执行：`npx jest --config tests/jest.config.js --runInBand <file>`。

---

### Task 1: 编写关闭模式（加入上级渠道）测试并确认失败

**Files:**
- Modify: `e:\code\basic\plugins\zhao-channel\tests\channel.test.ts`

- [ ] **Step 1: 在 channel.test.ts 中「register(data) — 通过邀请码注册子渠道」describe 之后追加以下测试**

```ts
describe("register(...,{newUser:true}) — 关闭模式：加入上级渠道（开关未开启）", () => {
  test("应加入上级渠道成为成员，且不新建渠道", async () => {
    delete process.env.CHANNEL_AUTO_CREATE_CHANNEL;
    const strapi = getStrapi();
    const channelService = strapi.plugin("zhao-channel").service("channel");
    const parentCode = fixtures.channels[0].code; // AGENT001
    const parentId = fixtures.channels[0].id;
    const beforeCount = await strapi.db.query("plugin::zhao-channel.channel").count({});
    const stamp = Date.now();
    const result = await channelService.register(
      {
        code: parentCode,
        name: "加入渠道用户",
        email: `join${stamp}@channel-test.com`,
        username: `joinuser${stamp}`,
        password: "Test@12345",
      },
      { newUser: true }
    );
    expect(result.user).toBeTruthy();
    expect(result.user.id).toBeGreaterThan(0);
    expect(result.joinedChannel).toBeTruthy();
    expect(result.joinedChannel.id).toBe(parentId);
    // 未新建渠道
    const afterCount = await strapi.db.query("plugin::zhao-channel.channel").count({});
    expect(afterCount).toBe(beforeCount);
    // 已作为 member 加入上级渠道
    const member = await strapi.db.query("plugin::zhao-channel.channel-member").findOne({
      where: { channel: parentId, user: result.user.id },
    });
    expect(member).toBeTruthy();
    expect(member.role).toBe("member");
  });

  test("关闭模式下缺省 email/username/password 应报错", async () => {
    delete process.env.CHANNEL_AUTO_CREATE_CHANNEL;
    const strapi = getStrapi();
    const channelService = strapi.plugin("zhao-channel").service("channel");
    await expect(
      channelService.register({ code: fixtures.channels[0].code, name: "无凭证" }, { newUser: true })
    ).rejects.toThrow("新用户注册必须提供 email/username/password");
  });
});
```

- [ ] **Step 2: 运行测试确认失败（register 目前忽略第二个参数，走原逻辑建渠道，第一个用例断言失败）**

Run: `npx jest --config tests/jest.config.js --runInBand channel.test.ts -t "加入上级渠道"`
Expected: FAIL — `expect(afterCount).toBe(beforeCount)` 不通过（实际新建了渠道），且第二个用例抛错不匹配「新用户注册必须提供…」。

---

### Task 2: 实现 register() 分支 + registerAsMember()，测试通过

**Files:**
- Modify: `e:\code\basic\plugins\zhao-channel\server\src\services\channel.ts`

- [ ] **Step 1: 修改 register() 签名并在渠道校验后插入分支**

将现有 `async register(data: {...}) {`（约 455 行）改为：

```ts
  async register(
    data: {
      code: string;
      name: string;
      description?: string;
      channelTier?: string;
      email?: string;
      username?: string;
      password?: string;
    },
    opts?: { newUser?: boolean }
  ) {
    const parentChannel = await strapi.db.query(CHANNEL_UID).findOne({
      where: { code: data.code },
    });
    if (!parentChannel) {
      throwErr("030101", 404, "邀请码不存在或已过期");
    }
    if (!parentChannel.status) {
      throwErr("030104", 403, "渠道已被禁用");
    }

    // ─── 加入上级渠道模式（关闭"每用户单建渠道"，可经 CHANNEL_AUTO_CREATE_CHANNEL=true 恢复原行为） ───
    const autoCreateChannel = process.env.CHANNEL_AUTO_CREATE_CHANNEL === "true";
    if (opts?.newUser === true && !autoCreateChannel) {
      return this.registerAsMember(parentChannel, data);
    }

    // 原逻辑：校验父渠道是否为叶子节点
    if (isLeafTier(parentChannel.channelTier)) {
```

（其余原逻辑不变，从 `if (isLeafTier(...))` 开始接回原有代码。）

- [ ] **Step 2: 在 register() 方法之后（原「获取渠道网络 getNetwork」之前）新增 registerAsMember 方法**

```ts
  /**
   * 加入上级渠道模式：关闭"每用户单建渠道"后，新用户注册改为加入上级渠道成为成员
   * 复用 channel-member.joinByInvite（channel-member role=member + user-invite 分销绑定 + 幂等）
   */
  async registerAsMember(
    parentChannel: any,
    data: { code: string; email?: string; username?: string; password?: string }
  ) {
    if (!data.email || !data.username || !data.password) {
      throwErr("030111", 400, "新用户注册必须提供 email/username/password");
    }

    return strapi.db.transaction(async () => {
      // 用户唯一性预检（与原逻辑一致）
      const existingByEmail = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { email: data.email },
      });
      if (existingByEmail) {
        throwErr("030107", 409, "该邮箱已被注册");
      }
      const existingByUsername = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { username: data.username },
      });
      if (existingByUsername) {
        throwErr("030108", 409, "该用户名已被注册");
      }

      // 创建用户（zhao-auth 保证密码哈希）
      const user = await strapi.plugin("zhao-auth").service("auth").createUser({
        email: data.email,
        username: data.username,
        password: data.password,
      });

      // 加入上级渠道为成员（幂等：已是成员则直接返回）
      const joined = await strapi
        .plugin("zhao-channel")
        .service("channel-member")
        .joinByInvite(user.id, data.code);

      return {
        user: { id: user.id, email: user.email, username: user.username },
        joinedChannel: {
          id: parentChannel.id,
          name: parentChannel.name,
          code: parentChannel.code,
          channelTier: parentChannel.channelTier,
        },
        member: joined,
      };
    });
  },
```

- [ ] **Step 3: 运行 Task 1 的测试确认通过**

Run: `npx jest --config tests/jest.config.js --runInBand channel.test.ts -t "加入上级渠道"`
Expected: PASS（2 个用例均通过）。

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-channel/tests/channel.test.ts plugins/zhao-channel/server/src/services/channel.ts
git commit -m "feat(zhao-channel): 邀请码注册新用户默认改为加入上级渠道，支持 CHANNEL_AUTO_CREATE_CHANNEL 开关"
```

---

### Task 3: 开启模式（恢复原行为）与不传 opts 不受影响测试

**Files:**
- Modify: `e:\code\basic\plugins\zhao-channel\tests\channel.test.ts`

- [ ] **Step 1: 追加以下两组测试（Task 1 两组测试之后）**

```ts
describe("register(...,{newUser:true}) — 开启模式：CHANNEL_AUTO_CREATE_CHANNEL=true 恢复单建渠道", () => {
  test("应新建子渠道（原行为）", async () => {
    process.env.CHANNEL_AUTO_CREATE_CHANNEL = "true";
    try {
      const strapi = getStrapi();
      const channelService = strapi.plugin("zhao-channel").service("channel");
      const stamp = Date.now();
      const result = await channelService.register(
        {
          code: fixtures.channels[0].code,
          name: "开启模式新建渠道",
          channelTier: "agent",
          email: `open${stamp}@channel-test.com`,
          username: `openuser${stamp}`,
          password: "Test@12345",
        },
        { newUser: true }
      );
      expect(result.id).toBeGreaterThan(0); // 返回新建渠道 id
      // 定向校验新建渠道已落库（不用全表精确计数，避免 bootstrap afterCreate 钩子
      // 自动创建个人渠道的竞态导致计数不稳定）
      const created = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: { id: result.id },
      });
      expect(created).toBeTruthy();
      expect(created.code).toBe(result.code);
    } finally {
      delete process.env.CHANNEL_AUTO_CREATE_CHANNEL;
    }
  });
});

describe("register(data) — 不传 opts（my/channel/register）不受开关影响", () => {
  test("即使开关关闭，不传 opts 仍按原逻辑新建渠道", async () => {
    delete process.env.CHANNEL_AUTO_CREATE_CHANNEL;
    const strapi = getStrapi();
    const channelService = strapi.plugin("zhao-channel").service("channel");
    const result = await channelService.register({
      code: fixtures.channels[0].code,
      name: "登录用户建子渠道",
      channelTier: "agent",
    });
    expect(result.id).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行确认通过**

Run: `npx jest --config tests/jest.config.js --runInBand --testTimeout=300000 channel.test.ts -t "开启模式|不受开关影响"`（Windows PowerShell 下 `|` 需用 `--%` 停止解析，否则被 cmd 当管道）
Expected: PASS（2 个用例均通过）。注意：勿用 `-t "开关|..."`，该正则匹配不到标题含「开启模式」的用例。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-channel/tests/channel.test.ts
git commit -m "test(zhao-channel): 覆盖开启模式与 my/channel/register 不受开关影响"
```

---

### Task 4: 修改 registerPublic controller 传参

**Files:**
- Modify: `e:\code\basic\plugins\zhao-channel\server\src\controllers\channel.ts`

- [ ] **Step 1: registerPublic 调用 service.register 时传 { newUser: true }**

将 controllers/channel.ts 中 `registerPublic`（约 163 行）改为：

```ts
      const service = strapi.plugin("zhao-channel").service("channel");
      const result = await service.register(parsed, { newUser: true });
```

（`register` handler 第 125 行 `service.register(parsed)` 保持不变。）

- [ ] **Step 2: 运行全部 channel 相关测试回归**

Run: `npx jest --config tests/jest.config.js --runInBand channel.test.ts channel-member.test.ts content-api.test.ts`
Expected: PASS（全部用例通过，无回归）。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-channel/server/src/controllers/channel.ts
git commit -m "fix(zhao-channel): registerPublic 新用户注册走加入上级渠道分支"
```

---

### Task 5: 文档标注 + 全量回归

**Files:**
- Modify: `e:\code\basic\plugins\zhao-channel\docs\Channel手册.md`
- Modify: `e:\code\basic\plugins\zhao-channel\docs\backend-invite.md`

- [ ] **Step 1: 在 Channel手册.md「邀请码注册」章节追加开关说明**

在 Channel手册.md 邀请码注册相关章节末尾追加：

```markdown
### 开关：是否为新用户单建渠道

环境变量 `CHANNEL_AUTO_CREATE_CHANNEL`（zhao-channel 后端 .env）：

- 未设置 / `false`（默认）：携带渠道邀请码注册新用户时，**不新建渠道**，新用户直接成为邀请人渠道的成员（role=member），分销关系照常绑定
- `true`：恢复原行为，为每个新用户单独创建子渠道

再次开启方法：`.env` 设置 `CHANNEL_AUTO_CREATE_CHANNEL=true` → `pm2 restart`，无需重建部署。
仅影响 `POST /zhao-channel/v1/channel/register/public`（新用户注册）；`/my/channel/register`（登录用户注册子渠道）不受影响。
```

- [ ] **Step 2: 在 backend-invite.md「渠道邀请码注册」章节追加同样的开关说明（上述内容）**

在 backend-invite.md 对应 register/public 接口说明下方追加相同内容。

- [ ] **Step 3: 运行插件全部测试回归**

Run: `npx jest --config tests/jest.config.js --runInBand`
Expected: PASS（全部测试文件用例通过）。

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-channel/docs/Channel手册.md plugins/zhao-channel/docs/backend-invite.md
git commit -m "docs(zhao-channel): 标注 CHANNEL_AUTO_CREATE_CHANNEL 开关与开启方法"
```

---

## 风险与备注

- 关闭后新用户是上级渠道 **member** 而非 owner；若后续报表/统计依赖「每用户一渠道」维度会缺失（已在文档标注）
- `registerAsMember` 使用 `this` 调用，服务方法按 `service.register(...)` 调用时绑定正确
- 测试依赖本地 `strapi_test` PostgreSQL 库可用；若测试库不可用需先启动本地 Postgres 并创建 `strapi_test` 库
- 生产再次开启：仅改 `.env` + `pm2 restart`，不重建 dist
