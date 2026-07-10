# zhao-sso 插件功能补全实施计划

**Goal:** 后端补全 9 CT controller/route + SMS 双 provider + 内置回退 policy，前端补全 13 页面 + API 修复

**Architecture:** Strapi 插件 zhao-sso（后端）+ uniapp（前端 e:\code\web）

---

## Phase A：后端补全

### Task A1: 创建 9 个新 controller

**Files:**
- Create: `plugins/zhao-sso/server/src/controllers/token-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/auth-code-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/binding-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/oauth-config-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/role-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/invite-code-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/invite-usage-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/referral-controller.ts`
- Create: `plugins/zhao-sso/server/src/controllers/sms-code-controller.ts`
- Modify: `plugins/zhao-sso/server/src/controllers/index.ts`

- [ ] **Step 1:** 读取现有 `admin-controller.ts` 了解 controller 模式
- [ ] **Step 2:** 创建 9 个 controller（参照 admin-controller.ts 模式，用 strapi.documents 操作对应 CT）
- [ ] **Step 3:** controllers/index.ts 追加 9 个导出
- [ ] **Step 4:** 提交

```bash
cd e:\code\basic
git add plugins/zhao-sso/server/src/controllers/
git commit -m "feat(sso): 新增 9 个 admin controller（token/auth-code/binding/oauth-config/role/invite-code/invite-usage/referral/sms-code）"
```

---

### Task A2: 内置回退 policy

**Files:**
- Create: `plugins/zhao-sso/server/src/policies/fallback-authenticated.ts`
- Create: `plugins/zhao-sso/server/src/policies/fallback-has-permission.ts`
- Modify: `plugins/zhao-sso/server/src/policies/index.ts`

- [ ] **Step 1:** 创建 fallback-authenticated.ts（检查 ctx.state.user，存在放行，否则 401）
- [ ] **Step 2:** 创建 fallback-has-permission.ts（超管放行，其他拒绝）
- [ ] **Step 3:** policies/index.ts 追加 2 个导出
- [ ] **Step 4:** 提交

```bash
cd e:\code\basic
git add plugins/zhao-sso/server/src/policies/
git commit -m "feat(sso): 新增内置回退 policy（fallback-authenticated + fallback-has-permission）"
```

---

### Task A3: 路由注册 + 动态 policy

**Files:**
- Modify: `plugins/zhao-sso/server/src/routes/admin.ts`

- [ ] **Step 1:** 修改 adminRoute 工厂函数为动态检测 zhao-auth
- [ ] **Step 2:** 追加 ~30 条路由（9 个 CT 的 admin 路由）
- [ ] **Step 3:** 提交

```bash
cd e:\code\basic
git add plugins/zhao-sso/server/src/routes/admin.ts
git commit -m "feat(sso): 注册 9 CT admin 路由（30 条）+ 动态 policy 回退"
```

---

### Task A4: SMS provider 实现

**Files:**
- Modify: `plugins/zhao-sso/server/src/services/sso-sms.ts`

- [ ] **Step 1:** 读取现有 sso-sms.ts 了解结构
- [ ] **Step 2:** 实现 sendViaAliyun（dysmsapi.aliyuncs.com，HMAC-SHA1 签名）
- [ ] **Step 3:** 实现 sendViaTencent（sms.tencentcloudapi.com，TC3-HMAC-SHA256 签名）
- [ ] **Step 4:** 修改 sendSmsCode 根据 SMS_PROVIDER 环境变量选择 provider
- [ ] **Step 5:** 提交

```bash
cd e:\code\basic
git add plugins/zhao-sso/server/src/services/sso-sms.ts
git commit -m "feat(sso): 实现阿里云+腾讯云 SMS provider"
```

---

### Task A5: 编译 dist

- [ ] **Step 1:** `cd e:\code\basic && npm run build`
- [ ] **Step 2:** 提交

```bash
cd e:\code\basic
git add dist/ plugins/zhao-sso/dist/
git commit -m "build(sso): 编译 dist 更新"
```

---

## Phase B：前端补全

### Task B1: API 修复 + 扩展

**Files:**
- Modify: `e:\code\web\src\api\sso.js`（追加 9 CT API）
- Modify: `e:\code\web\src\api\config.js`（删除 SSO 相关函数）
- Modify: `e:\code\web\pages\system\tools.vue`（改用 sso.js 导入）

- [ ] **Step 1:** 读取 sso.js 和 config.js 了解现有结构
- [ ] **Step 2:** sso.js 追加 9 个 CT 的 API 封装
- [ ] **Step 3:** config.js 删除 SSO 相关函数
- [ ] **Step 4:** tools.vue 改为从 sso.js 导入 SSO 应用 API
- [ ] **Step 5:** 提交

```bash
cd e:\code
git add web/src/api/sso.js web/src/api/config.js web/pages/system/tools.vue
git commit -m "fix(web): 修复 SSO API 双路径冲突 + 追加 9 CT API 封装"
```

---

### Task B2: 创建 13 个管理页面

**Files:**
- Create: `pages/sso/token/list.vue`
- Create: `pages/sso/auth-code/list.vue`
- Create: `pages/sso/binding/list.vue`
- Create: `pages/sso/oauth-config/list.vue` + `edit.vue`
- Create: `pages/sso/user-role/list.vue` + `edit.vue`
- Create: `pages/sso/invite-code/list.vue` + `edit.vue`
- Create: `pages/sso/invite-usage/list.vue`
- Create: `pages/sso/referral/list.vue`
- Create: `pages/sso/sms-code/list.vue`

- [ ] **Step 1:** 读取各 CT schema.json 获取字段
- [ ] **Step 2:** 读取已有 logistics 或 studio 页面了解 list/edit 模式
- [ ] **Step 3:** 创建 4 个 CRUD CT 的 list + edit（oauth-config/user-role/invite-code）
- [ ] **Step 4:** 创建 6 个只读 CT 的 list（token/auth-code/binding/invite-usage/referral/sms-code）
- [ ] **Step 5:** 提交

```bash
cd e:\code
git add web/pages/sso/
git commit -m "feat(web): 新增 SSO 13 个管理页面（token/auth-code/binding/oauth-config/user-role/invite-code/invite-usage/referral/sms-code）"
```

---

### Task B3: 路由注册 + dashboard 菜单 + featureFlags

**Files:**
- Modify: `e:\code\web\pages.json`（追加 13 条路由）
- Modify: `e:\code\web\pages\dashboard\index.vue`（追加 SSO section 13 菜单项）
- Modify: `e:\code\web\src\utils\config-helper.js`（featureFlags sso: true）

- [ ] **Step 1:** 注册 13 条路由
- [ ] **Step 2:** dashboard 追加 SSO 中心 section（13 菜单项 + ssoEnabled ref）
- [ ] **Step 3:** featureFlags 补 sso: true
- [ ] **Step 4:** 提交

```bash
cd e:\code
git add web/pages.json web/pages/dashboard/index.vue web/src/utils/config-helper.js
git commit -m "feat(web): 注册 SSO 路由 13 条 + dashboard SSO 菜单 13 项 + featureFlags"
```

---

### Task B4: 验证

- [ ] **Step 1:** 验证后端路由数 = 30 条新增
- [ ] **Step 2:** 验证前端页面文件 = 13
- [ ] **Step 3:** 验证菜单项 = 13
- [ ] **Step 4:** 验证 API 无双路径（config.js 无 SSO 函数）
- [ ] **Step 5:** 验证回退 policy 存在
- [ ] **Step 6:** 提交（如有遗漏）

---

## Self-Review

### 依赖顺序
A1 → A2 → A3 → A4 → A5（后端先完成）→ B1 → B2 → B3 → B4

### Spec coverage
| Spec 要求 | Task |
|---|---|
| 9 CT admin controller | A1 |
| 内置回退 policy | A2 |
| 30 条路由 + 动态 policy | A3 |
| SMS 双 provider | A4 |
| 编译 | A5 |
| API 修复 + 扩展 | B1 |
| 13 管理页面 | B2 |
| 路由 + 菜单 + featureFlags | B3 |
| 验证 | B4 |

✅ 全覆盖
