# 设计文档：C端活动留言可见性 + 运营端预览对齐 + 联系方式配置同步

日期：2026-09-01
涉及工程：`e:\code\shao`（C端）、`e:\code\web`（运营端）、`e:\code\basic`（zhao-point 后端）

## 背景与现状
- **问题1（C端留言看不见）**：留言列表只在 `promoModules` 配置了 `message` 模块时才经 `PromoMessage` 渲染；留言提交弹层是纯提交表单（无留言历史/回复展示）。活动未配 `message` 模块时，客户提交后看不到自己的留言与运营回复。
- **问题2（运营端预览不一致）**：`web/src/pages/activity/promo.vue` 预览中 `PromoContact`/`FloatContact` 未绑定事件、`FloatContact` 未传 `in-wechat`、`PromoMessage` 传空数组 `[]`，与 C 端 `detail.vue`（链接基准页）渲染不一致。
- **联系方式配置缺失**：运营端活动级联系方式仅配 `wechat.id / phone / notice`；站点级已有 `phone / wechat.qrcode / wechatServiceUrl / notice`。悬浮联系方式内容（客服二维码、公众号客服、名片）在活动级配不了。AI 提示词 `promoContact` 契约为 `{phone, wechat, note}`（`note` 字段名与实际 `notice` 不符，缺 qrcode/card/wechatServiceUrl）。

## 目标
1. 客户留言后，能在留言弹层内直接看到自己的留言与运营回复（问/答/编号/昵称/时间）。
2. 新增悬浮留言入口 + 未读回复角标，提示客户有新回复。
3. 运营端预览与 C 端 detail.vue 结构、交互对齐。
4. 运营端活动级联系方式全字段对齐站点级；悬浮联系方式内容可配置；AI 提示词契约同步。

## 一、C端留言可见性（e:\code\shao）
- **留言弹层升级（detail.vue）**：由纯提交表单改为「线程列表 + 提交框」一体。上半区展示我的留言线程（复用 promo-message 的问/答/昵称/时间渲染），下半区输入 + 提交；提交后 `loadMyMessages()` 回流刷新线程。
- **独立悬浮留言按钮（详情页左下角）**：
  - 仅当该客户**有留言**时出现（`loadMyMessages` 非空才显示）。
  - 有未读回复时右上角红点角标显示回复数。
  - 点击打开留言弹层，并清除角标。
  - 放置左下角，避开右侧 `floatContact` 悬浮联系方式，避免 z-index/位置冲突。
- **未读追踪（本地已读）**：
  - 存储 key：`actMsgLastSeen:{ssoUserId}:{activityId}`，值为最近一次查看的 `max(repliedAt)`。
  - 角标数 = 列表中 `status==='replied' && repliedAt > lastSeen` 的条数；`lastSeen` 为空视为全部已回复均未读。
  - 每次进入详情页 `onShow` 拉取留言并重算未读数；打开弹层时更新 `lastSeen`。
- **组件复用**：抽 `message-dialog.vue`（线程+提交弹层）与悬浮留言按钮；C 端 detail.vue 用真实逻辑。

## 二、运营端预览对齐（e:\code\web，以 detail.vue 为基准，结构+交互示例）
改造 `web/src/pages/activity/promo.vue` 预览弹窗，复用与 C 端相同的组件树与事件：
- `PromoContact`/`FloatContact` 绑定事件：点微信→弹二维码示例、点电话→示例提示；`FloatContact` 传 `in-wechat`。
- `PromoMessage` 改用**示例留言数据**（1 问 1 答）而非空 `[]`。
- 引入 `QrContactPopup`（二维码取活动/站点 promoContact，无则占位展示）。
- 引入悬浮留言入口/弹层示例态。
- 仅示例数据，不调真实接口。

## 三、运营端联系方式配置 + 悬浮内容 + AI 提示词同步
- **活动级联系方式表单全字段对齐站点级**（`web/src/pages/activity/promo.vue` 联系方式区）：追加
  - 微信二维码上传（`wechat.qrcode`）
  - 公众号客服链接（`wechatServiceUrl`）
  - 名片（`card`：名称/职位/公司/电话/微信）
  - 提示语（`notice`）
  - 保存结构统一为 `promoContact = { phone, wechat:{id,qrcode}, wechatServiceUrl, card, notice }`，与 C 端 `promo-contact.vue`/`float-contact.vue` 读取一致（空字段清理）。
- **悬浮联系方式内容**由运营端配置驱动：微信环境→公众号客服；非微信→弹客服二维码。预览对齐即展示该配置。
- **AI 提示词同步**（`web/src/pages/activity/promo-import.js` `buildPromoPrompt`）：
  - `promoContact` 契约定为 `{ phone, wechat:{id,qrcode}, card, notice }`，`note→notice` 修正。
  - 明确 `qrcode` / `wechatServiceUrl` / `card` 由运营填写，**AI 不编造**真实链接；AI 仅生成 `notice` 文案，且沿用现有 `phone` / `wechat.id`（不编造）。

## 边界（不做）
- 不做实时 / WebSocket 新回复推送（未读通过在打开页面时 onShow 拉取感知）。
- 预览不调真实数据接口。
- 悬浮留言按钮在未登录或无留言时不出现。
- AI 不生成二维码 / 客服链接 / 名片真值（避免编造无效链接）。

## 组件/文件改动清单
| 工程 | 文件 | 改动 |
|---|---|---|
| shao | `pages/activity/detail.vue` | 悬浮留言按钮 + 留言弹层线程化 + 未读角标 |
| shao | `components/promo/message-dialog.vue`（新） | 线程+提交弹层，C 端与预览共用 |
| shao | `components/promo/qr-contact-popup.vue` | 已有，复用 |
| web | `pages/activity/promo.vue` | 预览对齐 + 活动级联系方式追加字段 |
| web | `pages/activity/promo-import.js` | AI 提示词契约同步（note→notice + 补 qrcode/card/wechatServiceUrl） |
| basic | `plugins/zhao-point/.../activity.ts` | listMyMessages 返回 id/nickname（已完成）；无需新增接口 |

> 注：后端 `listMyMessages`（id+nickname）与本批新增的悬浮留言/未读显示所需字段已就绪；如未读角标需服务端字段，可在实现时通过现有接口 `repliedAt` 计算，无需新增接口。