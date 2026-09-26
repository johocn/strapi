# 优美惠市集双节促销宣传页 设计

2026-09-26

## 目标

为长春市双阳区「优美惠市集生鲜超市」做一场 10.1—10.8 的中秋国庆双节促销 H5 宣传页：复用现有「活动宣传页」体系落库一条促销类活动记录，C 端页面渲染即可转发；同时修正微信分享卡片的标题与缩略图。

## 现状约束（已核实）

- `plugin::zhao-point.activity` 为 `draftAndPublish: false`，无需处理发布状态；`type` / `category` 是自由字符串，非枚举；`lat` / `lng` 为 float；`status` 枚举为 `draft | signup_open | ongoing | ended | archived`。
- `promoTemplate` 由控制器校验必须落在 `PROMO_TEMPLATES` 内，`sale` 合法；`.promo-sale` 样式真实存在于 `shao/styles/promo-themes.scss:7`（默认 `#e11d48 / #f97316 / #fff7f7 / #ffeef1`），活动级 `promoColors` 会以内联 `--c-*` 变量覆盖。
- `promoDetail()` 返回 `{ activity, modules, contact, rewards, signupStatus }`，**不对 `status` 做过滤**，任意状态的活动都能访问 C 端宣传页。
- 模块白名单前后端一致（16 项）；`normalizePromoModules()` 仅按 `sort` 去重，**允许同类型模块出现多次**。
- 模块 config 读取契约（逐一核实）：

| 模块 | 读取来源 |
|---|---|
| cover | `config.title` / `config.subtitle` / `config.bgImage`；bgImage 回退 `activity.promoAssets[0].url` |
| goods | `config.title` / `config.notice` + `activity.goodsList`；价格由 `goodsPriceText` 渲染 |
| highlights | `config.title` / `config.points`（字符串数组） |
| purpose | `config.title` + `activity.purpose` |
| notice | `config.title` + `activity.description` + `config.html` |
| info | 不读 config，取活动的 `startTime` / `endTime` / `venueName` / `lat` / `lng` |
| contact / floatContact | `page.contact`（来自 `activity.promoContact`），键为 `phone` / `wechat.id` / `wechat.qrcode` / `card.*` / `notice` / `wechatServiceUrl` |

- `goodsPriceText(g)`：`promoPrice == null` 输出空串，`promoPrice = 0` 输出 `¥0`。
- H5 分享现状（`shao/pages/activity/promo.vue:315-320`）：标题硬拼 `${a.title}｜活动宣传`；`desc` 取 `description` 前 60 字；`imgUrl` 传 `undefined`，兜底到租户级分享图。
- 管理端创建活动：`POST /zhao-point/v1/admin/adm/activities`，body 扁平或包一层 `{ data: {...} }` 均可。

## 关键决策

1. **西瓜不进 `goodsList`**：`promoPrice: 0` 会渲染成「¥0」，观感错误；免费西瓜改用 `highlights` 模块独立成块。
2. **活动 `title` 即微信分享标题，封面标题走 cover 的 `config.title`** —— 两者解耦，因此分享改造**无需给活动新增字段**，改一行字符串拼接即可让分享标题原样生效。
3. **`description` 兼作分享描述（前 60 字）与活动说明正文**，一段文案两个出口。
4. **`status` 取 `ongoing`**：C 端无状态过滤，页面立即可访问；10.8 结束后系统按既有 `ensureTransitions → closeActivity` 自动收尾（会生成活动后台账快照与待办，属既有行为，非本次引入）。

## 落库数据

| 字段 | 值 |
|---|---|
| title | `免费领西瓜｜优美惠双节钜惠` |
| type | `促销` |
| category | `生鲜超市` |
| startTime | `2026-10-01T00:00:00+08:00` |
| endTime | `2026-10-08T23:59:59+08:00` |
| venueName | `优美惠市集生鲜超市` |
| lat / lng | `43.635025` / `125.583775` |
| status | `ongoing` |
| promoTemplate | `sale` |
| promoColors | `{ primary: '#EF4444', accent: '#F97316', bg: '#FFF7F5', card: '#FFF1EE', text: '#1F2937', textDim: '#6B7280' }`（行动朱红） |
| promoAssets | `[{ name: '双节主视觉', url: 海报生成并上传后回填, scene: 'cover' }]` |
| promoContact | `{ phone: '18514363399', notice: '招商合作、团购批发请致电', wechat: { id: '', qrcode: '' } }` |
| purpose | `扎根双阳，邻里超市。做有人情味的产品，开最有人情味的超市。` |

`description` 正文：

> 10.1—10.8 双节同庆｜长春双阳优美惠市集生鲜超市。进店免费领西瓜 1/4 份，农夫山泉 1×12 群友价 8.8，1800克心相印 15.9，崂山、青岛小优、燕京啤酒群友价 25。

`goodsList`（`originPrice` 一律不填：原价未提供，页面只显示群友价；`unit` 留空：规格未提供）：

| name | promoPrice |
|---|---|
| 农夫山泉 1×12 | 8.8 |
| 心相印 1800克 | 15.9 |
| 崂山啤酒 | 25 |
| 青岛小优 | 25 |
| 燕京啤酒 | 25 |

## 模块清单（`promoModules`，sort 1—9）

1. **cover** — `title: 中秋好礼相送 · 国庆钜惠狂欢`，`subtitle: 10.1—10.8 双节同庆 · 进店免费领西瓜`，`bgImage` 取海报 url
2. **goods** — `title: 群友价 · 双节钜惠`，`notice: 群友价需出示本页面，限购数量以门店为准`（正文取 `goodsList`）
3. **highlights** — `title: 进店免费领`，`points: ['1/4 份西瓜免费领', '无需消费，到店即可', '每日限量，先到先得']`
4. **purpose** — `title: 我们为什么这么做`（正文取 `purpose` 字段）
5. **notice** — `title: 活动说明`，`html: <p>每人限领 1 份</p><p>不与其他优惠叠加</p><p>数量有限，送完为止</p>`（正文取 `description`）
6. **highlights** — `title: 免费招商 · 10.1—12.31`，`points: ['10.1—12.31 免费招商', '生鲜、熟食、小吃、日用等品类均可', '招商电话 18514363399']`
7. **info** — 无 config，自动渲染活动时间、地点与一键导航
8. **contact** — 无 config，渲染电话 `18514363399` 与备注；无微信二维码，不出微信入口
9. **floatContact** — 无 config，右下角常驻按钮；该组件按 `contact` 的 phone / 微信字段决定展示哪种按钮，落库后核对实际呈现

## C 端改造（shao 仓库，1 个文件）

`pages/activity/promo.vue` 的 `setupPromoShare()`：

- 标题去掉硬拼后缀，直接用 `activity.title`
- `imgUrl` 改为优先取 cover 模块的 `config.bgImage`，回退 `promoAssets[0].url`，经已有的 `resolveMediaUrl` 转为绝对地址；两者都缺时保持 `undefined`（沿用租户兜底）
- `desc` 逻辑不变

`posterConfig`（页面内「分享海报」入口）**不改**：其 `title` / `desc` / `summary` 本就取活动字段，分享标题修正后自动跟随。

## 素材

用用户提供的三张实拍（店招、玻璃门招商贴、帐篷横幅）作为参考图，生成一张写实摄影风格的双节主视觉海报：红底、西瓜与商品堆头、烫金「中秋好礼相送 国庆钜惠狂欢」。生成后上传取 URL，同时用于 `promoAssets[0].url` 与 cover 的 `config.bgImage`。

## 实现步骤

1. **探测鉴权**：用账号 `zhao` 登录取 token，试探 `GET /zhao-point/v1/admin/adm/activities?page=1&pageSize=1`，确认管理端路由走哪套鉴权。
2. **探测上传**：试探图片上传接口（Strapi 自带 `/api/upload` 或插件另有入口），确认能取到可访问 url。
3. **生成并上传海报**，拿到 url。
4. **写落库脚本** `scripts/seed-youmeihui-festival-promo.cjs`：按 `title` 查重，命中则 update、未命中则 create，保证可重复执行；`documentId` 打印输出。
5. **执行脚本**，记录 `documentId`。
6. **改 C 端分享逻辑**（shao）。
7. **验收**（见下）。

步骤 1、2 任一探测失败即停下向用户确认，不自行另造鉴权或上传通道。

## 验收

1. `GET /zhao-point/v1/promo/activity/{documentId}` 返回的 `activity` / `modules` / `contact` 齐备，9 个模块顺序正确、config 无丢失。
2. 浏览器打开 H5 宣传页，逐块核对渲染、行动朱红配色生效、地点与导航坐标正确。
3. 分享卡片：本地无法真机验证，改为校验页面 og/twitter meta 是否注入正确标题与缩略图；真机转发效果由用户确认。
4. 页面内「分享海报」入口能正常出图。

## 不做

- 不给活动新增 `shareTitle` / `shareDesc` / `shareImage` 字段
- 不动 `posterConfig` 与后端 `activity_share` 模板
- 不加报名表单、不配 `formConfig`
- 不改后端 schema、不新增模块类型

## 风险

- 管理端鉴权或上传通道探测失败 → 停下询问，不绕过
- 生成海报的视觉质量需用户确认，不满意可换实拍图兜底
- 商品单位与啤酒规格未提供，落库留空，需后续在后台补