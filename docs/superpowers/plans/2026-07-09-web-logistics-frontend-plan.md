# web 目录路由修复 + 物流中心前端补全实施计划

**Goal:** 修复 3 个现有路由问题 + 从零补全物流中心前端（API/页面/路由/菜单/featureFlags）

**Architecture:** uniapp 前端项目（e:\code\web），参照 website 中心模式。改动 35 新建 + 4 修改。

**Tech Stack:** uniapp + Vue 3 + uni-app request 工具

---

## 后端权限 key 确认（已核实）

后端 PERMISSION_TREE 中 `menu.logistics-center` 有 **10 个子菜单**：

| 权限 key | 标签 | navigateTo |
|---|---|---|
| `menu.logistics-quote` | 询价管理 | /pages/logistics/quote-request/list |
| `menu.logistics-tracking` | 货物追踪 | /pages/logistics/tracking-shipment/list |
| `menu.logistics-contact` | 联系渠道 | /pages/logistics/contact-matrix/list |
| `menu.logistics-review` | 客户评价 | /pages/logistics/review/list |
| `menu.logistics-subscription` | 通知订阅 | /pages/logistics/subscription/list |
| `menu.logistics-landing` | 落地页 | /pages/logistics/landing-page/list |
| `menu.logistics-funnel` | 转化漏斗 | /pages/logistics/conversion-funnel/list |
| `menu.logistics-order` | 意向订单 | /pages/logistics/intent-order/list |
| `menu.logistics-referral` | 推荐奖励 | /pages/logistics/referral/list |
| `menu.logistics-customer` | 客户档案 | /pages/logistics/customer-profile/list |

---

### Task 1: 修复 3 个现有路由问题

**Files:**
- Modify: `e:\code\web\pages\dashboard\index.vue`（修复 third.account 权限 key）
- Modify: `e:\code\web\src\utils\config-helper.js`（补 website featureFlags）
- Create: `e:\code\web\pages\channel\permissions.vue`（补全渠道权限页）
- Modify: `e:\code\web\pages.json`（注册 channel/permissions 路由）

- [ ] **Step 1: 修复 third.account 权限 key**

在 `e:\code\web\pages\dashboard\index.vue` 中找到 `hasPermission('third.account')`，改为 `hasPermission('third-party-account.read')`。

- [ ] **Step 2: 补全 website featureFlags**

在 `e:\code\web\src\utils\config-helper.js` 的 `getDefaultConfig` 函数中，featureFlags 对象追加 `website: true`。

- [ ] **Step 3: 创建渠道权限管理页**

新建 `e:\code\web\pages\channel\permissions.vue`，参照 `pages/channel/members.vue` 结构，实现用户渠道权限管理（list + assign/revoke）。

- [ ] **Step 4: 注册渠道权限路由**

在 `e:\code\web\pages.json` 中追加：
```json
{
  "path": "pages/channel/permissions",
  "style": { "navigationBarTitleText": "渠道权限" }
}
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\web
git add pages/dashboard/index.vue src/utils/config-helper.js pages/channel/permissions.vue pages.json
git commit -m "fix(web): 修复 third.account 权限 key + website featureFlags + 渠道权限页补全"
```

---

### Task 2: 创建物流 API 模块

**Files:**
- Create: `e:\code\web\src\api\logistics.js`
- Modify: `e:\code\web\src\api\index.js`

- [ ] **Step 1: 创建 logistics.js**

参照 `e:\code\web\src\api\website.js` 的 `createContentApi` 工厂模式，创建 `e:\code\web\src\api\logistics.js`：

- 路径前缀 `/zhao-logistics/v1/admin`
- 16 个 CT 的 CRUD API（quoteRequestApi / quoteFieldRuleApi / quotePriceRuleApi / quotePriceFormulaApi / trackingShipmentApi / trackingNodeApi / trackingProviderApi / contactMatrixApi / reviewApi / subscriptionApi / landingPageApi / conversionFunnelApi / conversionEventApi / intentOrderApi / referralApi / customerProfileApi）
- 自定义操作端点（logisticsActionApi：reviewApprove/reviewReject/reviewReply/orderConvert/profileMerge/funnelStats/referralStats）

- [ ] **Step 2: 在 index.js 导出**

在 `e:\code\web\src\api\index.js` 追加 `export * from './logistics.js'`

- [ ] **Step 3: 提交**

```bash
cd e:\code\web
git add src/api/logistics.js src/api/index.js
git commit -m "feat(web): 新建物流 API 模块（16 CT CRUD + 7 自定义端点）"
```

---

### Task 3: 创建物流页面文件第一批（8 CT × 2 = 16 页面）

**Files:**
- Create: `e:\code\web\pages\logistics\quote-request\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\quote-field-rule\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\quote-price-rule\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\quote-price-formula\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\tracking-shipment\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\tracking-node\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\tracking-provider\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\contact-matrix\{list,edit}.vue`

- [ ] **Step 1: 创建 8 个 CT 的 list + edit 页面**

参照 `e:\code\web\pages\website\article\list.vue` 和 `edit.vue` 的结构：
- list.vue：PageHeader + 搜索栏 + 列表 + 分页 + 新增/编辑/删除按钮
- edit.vue：PageHeader + 表单（按 schema.json 字段）+ 保存/取消
- 每个 CT 引用对应的 API（如 quoteRequestApi）
- 字段表按各 CT 的 schema.json 生成

读取各 CT 的 schema.json 获取字段：
- `e:\code\basic\plugins\zhao-logistics\server\src\content-types\quote-request\schema.json`
- `e:\code\basic\plugins\zhao-logistics\server\src\content-types\quote-field-rule\schema.json`
- ...（8 个 CT）

- [ ] **Step 2: 提交**

```bash
cd e:\code\web
git add pages/logistics/
git commit -m "feat(web): 物流页面第一批（询价/追踪/联系矩阵 8 CT × 2 页面）"
```

---

### Task 4: 创建物流页面文件第二批（8 CT × 2 = 16 页面）

**Files:**
- Create: `e:\code\web\pages\logistics\review\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\subscription\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\landing-page\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\conversion-funnel\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\conversion-event\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\intent-order\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\referral\{list,edit}.vue`
- Create: `e:\code\web\pages\logistics\customer-profile\{list,edit}.vue`

- [ ] **Step 1: 创建 8 个 CT 的 list + edit 页面**

同 Task 3 结构，读取各 CT 的 schema.json 获取字段。

特殊页面：
- review/list.vue：增加 approve/reject/reply 操作按钮（调 logisticsActionApi）
- intent-order/list.vue：增加 convert 操作按钮（调 logisticsActionApi.orderConvert）
- customer-profile/list.vue：增加 merge 操作入口

- [ ] **Step 2: 提交**

```bash
cd e:\code\web
git add pages/logistics/
git commit -m "feat(web): 物流页面第二批（评价/订阅/落地页/漏斗/订单/推荐/客户档案 8 CT × 2 页面）"
```

---

### Task 5: 注册物流路由 + dashboard 菜单 + featureFlags

**Files:**
- Modify: `e:\code\web\pages.json`（追加 32 物流路由）
- Modify: `e:\code\web\pages\dashboard\index.vue`（追加物流中心 section + logisticsEnabled ref）
- Modify: `e:\code\web\src\utils\config-helper.js`（featureFlags 补 logistics: true）

- [ ] **Step 1: 注册 32 条物流路由**

在 `e:\code\web\pages.json` 的 pages 数组中追加 32 条路由（16 CT × list/edit）：
```json
{ "path": "pages/logistics/quote-request/list", "style": { "navigationBarTitleText": "询价单管理" } },
{ "path": "pages/logistics/quote-request/edit", "style": { "navigationBarTitleText": "询价单编辑" } },
...（其余 15 CT 同理）
```

- [ ] **Step 2: 添加物流中心 dashboard 菜单**

在 `e:\code\web\pages\dashboard\index.vue` 的系统设置 section 之前追加物流中心 module-section，含 10 个菜单项（对齐后端 10 个子菜单权限 key）。

同时：
- 添加 `const logisticsEnabled = ref(true)`
- onShow 中追加 `logisticsEnabled.value = config.featureFlags?.logistics !== false`
- import logistics API（如需统计卡数据）

- [ ] **Step 3: 补全 featureFlags**

在 `e:\code\web\src\utils\config-helper.js` 的 `getDefaultConfig` featureFlags 追加 `logistics: true`。

- [ ] **Step 4: 提交**

```bash
cd e:\code\web
git add pages.json pages/dashboard/index.vue src/utils/config-helper.js
git commit -m "feat(web): 注册物流路由 32 条 + dashboard 物流中心菜单 + featureFlags"
```

---

### Task 6: 验证 + 最终提交

- [ ] **Step 1: 验证路由完整性**

检查 pages.json 中物流路由数 = 32，与页面文件数一致。

- [ ] **Step 2: 验证菜单权限 key**

确认 dashboard 中 10 个物流菜单项的 hasPermission key 与后端 PERMISSION_TREE 一致。

- [ ] **Step 3: 验证 API 导出**

确认 `e:\code\web\src\api\index.js` 导出了 logistics.js。

- [ ] **Step 4: 如有遗漏补充并提交**

```bash
cd e:\code\web
git add -A
git commit -m "chore(web): 物流中心前端补全验证通过"
```

---

## Self-Review

### 1. Spec coverage

| Spec 要求 | 对应 Task |
|---|---|
| 修复问题 1（channel/permissions 断链）| Task 1 |
| 修复问题 2（third.account 权限 key）| Task 1 |
| 修复问题 3（website featureFlags）| Task 1 |
| API 模块 logistics.js | Task 2 |
| 16 CT × 2 页面 = 32 文件 | Task 3 + Task 4 |
| pages.json 注册 32 路由 | Task 5 |
| dashboard 物流中心菜单 | Task 5 |
| featureFlags 补 logistics | Task 5 |
| 验证 | Task 6 |

✅ 全覆盖

### 2. Placeholder scan
- 无 TBD/TODO，每个 Task 有明确的文件列表和步骤

### 3. Type consistency
- 页面结构统一参照 website/article
- API 封装统一用 createContentApi 工厂
- 权限 key 对齐后端 PERMISSION_TREE

### 4. 已知限制
- 物流页面无统计卡（dashboard 顶部 stat-card 不增加物流项，避免改动过大）
- review/intent-order/customer-profile 的自定义操作按钮在 list.vue 实现，不单独占页面
