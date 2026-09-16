# 任务 2 设计：组合方案配比简化 + 预约咨询重构

**日期:** 2026-09-16
**状态:** 待审阅
**关联计划:** 任务 1 为「财富 4 任务实施计划」（`docs/superpowers/plans/2026-09-16-wealth-4tasks.md`）

## 背景与目标

1. **组合方案配比简化**：当前创建组合方案时每个产品必须设置配比，操作繁琐。目标：默认等权（选产品即加入），保留高级设置可手动调配比。
2. **预约咨询重构**：当前表单仅「姓名 + 电话」，无法满足微信联系与留言需求。目标：三渠道弹窗（电话 / 微信可视化 / 在线留言），留言支持预留联系方式，管理端可回复留言（参考线下活动页留言板 `web/src/pages/activity/messages.vue` 模式）。

## 用户决策记录

- 组合简化程度：**等权默认 + 可选配比**（编辑时可展开高级设置）
- 咨询表单交互：**弹窗内三渠道切换**（Tab）
- 留言匿名：**允许匿名**（网名选填，联系方式至少填一项）
- 微信渠道：**纯二维码展示**（企业微信 + 个人微信二维码图片 + 微信号点击复制），无提交表单

---

## A. 组合方案配比简化

### A1 后端（`plugins/zhao-wealth/server/src/services/portfolio-service.ts`）

- 新增 `normalizeProducts(products: PortfolioProduct[])`：
  - 每个 item 的 `allocationRatio` 缺失（undefined/null/非有限数）时填充 `1`
  - 已有配比保留原值
- `createPlan` / `updatePlan` 入口先调用 `normalizeProducts` 再落库
- `calculatePlanPerformance` **零改动**：现有归一化逻辑（`totalWeight` 求和后加权平均）天然支持等权（ratio=1 时 = 算术平均）
- 兼容：旧方案（已存配比）数据原样，计算不变

### A2 C 端前端（`strapi-wealth`，wealth-line 分支）

- 添加产品弹窗：直接选择产品即加入组合（移除配比输入）
- 方案编辑页：默认展示产品列表；「高级设置」展开后可手动输入各产品配比（%），合计须为 100%
- 详情展示：配比缺失的产品显示「等权」标识

---

## B. 预约咨询重构

### B1 数据模型（`content-types/wealth-consultation/schema.json`）

新增字段（全部可空，Strapi 自动建列，存量数据不受影响）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `submitType` | enum: `phone`/`wechat`/`message` | 提交渠道（必填，default phone） |
| `name` | string（由必填改**选填**） | 网名，留言渠道可匿名 |
| `phone` | string（由必填改**选填**） | 电话渠道的号码 / 留言预留电话 |
| `contactType` | enum: `phone`/`email`/`wechat`，选填 | 预留联系方式类型（留言渠道用） |
| `contactValue` | string，选填 | 预留联系方式值（号码/邮箱/微信号） |
| `wechatType` | enum: `personal`/`enterprise`，选填 | 提交型微信渠道区分（预留，主交互走二维码） |
| `reply` | text，选填 | 管理员回复 |
| `repliedAt` | datetime，选填 | 回复时间 |
| `status` | enum: `pending`/`replied`（default pending） | 留言板状态流转 |

保留字段：`preferredTime`、`preferredChannel`（online/branch/phone，电话渠道咨询偏好）、`product`（关联产品）、`portfolioPlan`（关联组合）、`user`（SSO 用户）。

### B2 微信渠道可视化配置（新增 content-type `wealth-consult-config`）

单条配置（默认插一条），字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `enterpriseWechatQr` | media | 企业微信二维码图片 |
| `personalWechatQr` | media | 个人微信二维码图片 |
| `enterpriseWechatId` | string | 企业微信微信号（复制文案） |
| `personalWechatId` | string | 个人微信微信号（复制文案） |

公开接口 `GET /v1/wealth/consult/config`（auth false，无 SSO 策略）：
- 返回 `{ enterpriseWechatQr, personalWechatQr, enterpriseWechatId, personalWechatId }`
- 二维码 URL 用 Strapi 上传文件 URL（`formats` 取合适尺寸）

### B3 后端 service / controller / 路由

**`consultation-service.ts`**
- `createBooking` 改造（按 submitType 校验）：
  - `phone`：`name` 选填、`phone` 必填（11 位校验）、`preferredChannel` 可选
  - `wechat`（提交型，预留）：`name` 选填、`wechatType` + `contactValue`（微信号）必填
  - `message`：`message` 必填、`contactType` + `contactValue` 至少一项（或二选一留空则默认无联系方式）
  - 统一写入 `submitType`，其余字段按提交内容填充
- `list` 返回增加 `reply`、`status`、`repliedAt`（C 端展示回复）

**控制器 `consultation.ts` + `routes/admin-api.ts`（新增管理端路由）**
- `GET /v1/admin/consultations`：分页 + 状态筛选（pending/replied/all）+ 渠道筛选（submitType），返回列表含联系方式脱敏？——管理端为内部系统，返回完整联系方式
- `POST /v1/admin/consultations/:id/reply`：body `{ reply }` → 写 `reply` + `repliedAt=now` + `status=replied`
- 控制器新增 `adminList` / `adminReply` 方法

**`routes/content-api.ts`**
- 新增 `GET /v1/wealth/consult/config` → `consultation.consultConfig`（auth false）

### B4 C 端前端（strapi-wealth）

**详情页 / 组合详情页咨询弹窗重构（`pages/detail/index.vue`、`pages/portfolio/detail.vue`）**：

三 Tab（submitType 选择）：
- **电话**：网名（选填）+ 手机号（必填，11 位）+ 咨询偏好（到店/线上）
- **微信**：调 `GET /v1/wealth/consult/config` → 展示企业微信二维码 + 个人微信二维码（图片），各旁附微信号「复制」按钮（`uni.setClipboardData`），引导扫码或复制加好友；无需提交表单（此 Tab 不显示提交按钮，改为「加微信咨询」说明文案）
- **留言**：留言内容（必填，textarea）+ 预留联系方式类型（电话/邮箱/微信 三选一）+ 联系方式值 + 网名（选填）

「我的咨询」列表（已有 `GET /v1/wealth/consultations`）：展示 `status`，已回复时显示管理员 `reply` 内容与时间。

**`services/api.ts`**：新增 `getConsultConfig()`、`createConsultation(data)`（submitType 字段）、`getConsultations()` 返回 reply 透传。

### B5 管理端（web 仓库）

**新页面 `src/pages/activity/consultation-messages.vue`**（参考 `messages.vue` 留言板模式）：
- 列表：渠道标签（电话/微信/留言）、网名、联系方式（号码/邮箱/微信号）、留言内容、产品/组合关联、提交时间、状态（待回复/已回复）
- 筛选：状态（全部/待回复/已回复）、渠道
- 弹层回复（textarea + 提交），回复后状态变已回复
- 分页

**二维码配置区**（可并入同页或独立设置区 `src/pages/activity/consult-config.vue`）：
- 上传企业微信二维码、个人微信二维码（复用活动页图片上传模式）
- 填写企业微信号、个人微信号
- 保存 → 调 `PUT /v1/admin/consult-config`（admin-api 新增：`GET`/`PUT /v1/admin/consult-config`）

**`src/api/`**：新增 consultation API 模块（list/reply/config 读写）。

---

## 兼容与风险

- **Schema 兼容**：全部新增字段可空；`name`/`phone` 必填改选填不影响存量记录
- **旧数据**：存量咨询无 `submitType` → 展示时按「电话」渠道处理（submitType 缺失默认 phone）
- **二维码图片**：管理端上传后经 Strapi upload 存储，URL 直接引用；配置未上传时微信 Tab 显示占位文案「二维码配置中，请使用电话或留言咨询」
- **权限**：admin-api 咨询/配置接口沿用 admin 路由鉴权；C 端 config 接口 auth false（公开）
- **SSO 会话**：C 端咨询提交沿用 `sso-authenticated` 策略，user 关联不变

## 验证

1. 后端单测：`normalizeProducts` 等权填充、createBooking 三渠道校验、admin reply 状态流转
2. 全量测试回归 + 重建 dist + 自检关键字（`normalizeProducts`、`adminReply`、`consult-config`）
3. 部署 joho：git pull + pm2 restart
4. C 端部署 wealth-line → v.joho.cn/wealth
5. 线上验证：
   - 组合方案创建：添加产品无配比输入，创建成功，绩效计算正确（等权）
   - 咨询弹窗三 Tab：电话提交成功；微信 Tab 显示二维码 + 复制微信号；留言提交成功
   - 管理端：留言列表可见，回复后 C 端「我的咨询」显示回复
   - 二维码配置：上传后 C 端微信 Tab 更新
