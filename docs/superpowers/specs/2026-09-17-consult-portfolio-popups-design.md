# 产品详情页「预约咨询」「加入组合方案」修复设计

日期：2026-09-17
状态：已批准

## 背景与目标

修复 C 端财富产品详情页（`/pages/detail/index`）两个功能的缺陷：

1. **预约咨询弹窗**：三 Tab（电话/微信/留言）结构不合理；服务人电话强制展示号码；未登录无法查看联系方式；留言预留电话不校验格式；「网名」文案笔误。
2. **加入组合方案弹窗**：只能新建方案，不能加入已有组合；同一产品反复点击堆积同名方案；后端组合方案 detail/update/delete 存在 IDOR 越权（不校验 userId 归属）。

## 需求

### A. 预约咨询弹窗重构

- 三 Tab 改两 Tab：
  - **联系 Tab（默认）**：展示服务人信息——昵称、网点、**网点电话（不显示号码，按钮点击直接拨打）**、企业微信/个人微信二维码（长按识别）+ 微信号（点击复制）。无表单、无必填项。未配置联系方式时显示「联系方式配置中，请使用留言咨询」。
  - **留言 Tab**：称呼（选填）、留言内容（必填）、预留联系方式（选填——选「电话」时校验 `/^1\d{10}$/`，邮箱/微信不校验）。
- 免登录：未登录点「预约咨询」直接打开弹窗（联系 Tab 可直接查看电话/微信）；提交留言时若未登录 → 提示「请先登录」并跳转登录。
- 文案：「网名」→「称呼」；移除原电话 Tab 的「咨询方式（线上/网点/电话）」选择器。
- 联系 Tab 无提交按钮（仅「取消」）；留言 Tab 显示「取消 + 提交留言」。

### B. 加入组合方案弹窗重构

- 打开弹窗时拉取「我的组合」列表（需登录，`onAddToPortfolio` 已校验）。
- 弹窗分区：
  - **加入已有组合**：单选我的组合列表（有组合时显示）。选中即加入该组合；若产品已在组合中 → toast「该产品已在组合中」，不重复添加。
  - **新建方案**：方案名称默认「方案一 / 方案二 / …」（按已有组合数量 +1 递增，可修改），假设金额选填。
- 提交逻辑：
  - 选中已有组合 → `updatePortfolioPlan(id, { products: [...原products, 当前产品] })`，新产品 `allocationRatio=1`、`addedDate=今天`。
  - 未选中 → `createPortfolioPlan({ planName, planType:'custom', products:[{...当前产品}], totalAmount })`。
- 成功后跳转组合详情页（保留现有行为）。

### C. 后端安全与校验修复（zhao-wealth）

1. **修复 IDOR 越权**：portfolio 服务层 `getPlanDetail(planId, userId)` / `updatePlan(planId, userId, data)` / `deletePlan(planId, userId)` 改为按 `{ id, userId }` 联合查询校验归属，非本人返回 404（不泄露存在性）；控制器透传 userId。
2. `createPlan` 校验 products 为非空数组（空 → 400「请至少选择一个产品」）；`normalizeProducts` 校验每个 `productId` 存在且 `allocationRatio` 为 0-1 数值。
3. `createBooking` 留言渠道 `contactType=phone` 时校验 `/^1\d{10}$/`（400「手机号格式不正确」）。

## 数据流

- 联系 Tab：`GET /zhao-wealth/v1/wealth/consult/config`（公开，分级匹配服务人）→ 渲染服务人卡片/拨打按钮/二维码。拨号走 `uni.makePhoneCall`。
- 留言提交：`POST /zhao-wealth/v1/wealth/consultations`（sso-authenticated，userId 取自 token）→ 返回咨询记录。
- 组合弹窗：`GET /zhao-wealth/v1/wealth/portfolio-plans`（我的组合）→ 单选加入 `PUT /zhao-wealth/v1/wealth/portfolio-plans/:id`（传完整 products 数组）；新建 `POST /zhao-wealth/v1/wealth/portfolio-plans`。

## 错误处理

- 服务人未配置：联系 Tab 显示占位提示；城市匹配不到时回落全局默认。
- 组合加入已在组合的产品：前端 toast 拦截，不调接口。
- 越权访问他人组合：404（后端不泄露存在性）。
- 留言预留电话格式错误：前端 toast + 后端 400 双保险。

## 测试

- 单测（basic 插件）：
  - portfolio：本人可查/更新/删除；他人 404；products 空数组 400。
  - consultation：留言预留电话格式校验（合法通过/非法 400）。
- 前端手动验证：两弹窗交互、免登录查看联系、拨号、复制微信号、组合单选/新建、重复加入拦截、未登录提交留言跳登录。

## 范围

- `basic`（zhao-wealth）：portfolio-service.ts、consultation-service.ts、对应控制器、单测，重建 dist + 部署 joho。
- `strapi-wealth`（C 端 wealth-line）：pages/detail/index.vue 两弹窗重构，部署。
- 不涉及管理端（web）。
