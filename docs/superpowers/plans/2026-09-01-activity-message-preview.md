# 活动留言可见性 + 预览对齐 + 联系方式配置 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 C 端活动详情页留言后可在弹层内看到留言/回复并带未读角标；运营端预览与 C 端 detail.vue 对齐；运营端活动级联系方式全字段可配并同步 AI 契约。

**Architecture:** 三处独立改动、无跨服务依赖：(A) C 端 `detail.vue` 弹层线程化 + 悬浮留言按钮 + 未读角标，抽 `message-dialog.vue`；(B) 运营端 `promo.vue` 预览对齐 C 端组件树；(C) 运营端活动级联系方式表单追加字段 + `promo-import.js` AI 契约同步。后端已就绪（`listMyMessages` 返回 `id/nickname`），无需新增接口。

**Tech Stack:** uni-app Vue3 (script setup / TS)，两端均走 `npm run build:h5` 构建产物部署。无单测框架，验证以构建成功 + 前端手工核对为准。

**设计文档：** `docs/superpowers/specs/2026-09-01-activity-message-preview-design.md`

---

### 构成说明（字段契约）
`promoContact` 统一结构：`{ phone, wechat:{ id, qrcode }, wechatServiceUrl, card:{ name,title,company,phone,wechat }, notice }`。
C 端消费点：`promo-contact.vue` 读 `wechat/phone/card/notice`；`float-contact.vue` 读 `wechat.qrcode` / `wechatServiceUrl`（或 `config.wechatServiceUrl`）确定客服或二维码。

---

## Task 1: 运营端 AI 契约同步（promo-import.js）

**Files:**
- Modify: `e:\code\web\src\pages\activity\promo-import.js:322`

- [ ] **Step 1: 更新 promoContact 输出契约行**

将第 322 行：
```js
'- promoContact(object) {phone,wechat,note} 禁止编造电话与微信号：无法确定时填 "请运营替换"',
```
替换为：
```js
'- promoContact(object) {phone,wechat:{id,qrcode},card,notice} 禁止编造电话与微信号：phone/wechat.id 沿用已有值，无法确定时填 "请运营替换"',
'  - qrcode / wechatServiceUrl / card 均为运营在管理端填写，AI 不生成任何二维码、客服链接或名片真值（避免编造无效链接）；仅可生成 notice 提示文案',
```

- [ ] **Step 2: 校验修改落点**

Run: `grep -n "promoContact(object)" e:\code\web\src\pages\activity\promo-import.js`
Expected: 打印已更新后的该行，含 `{phone,wechat:{id,qrcode},card,notice}`。

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/activity/promo-import.js
git commit -m "feat(web): AItips 同步 promoContact 契约，AI 不编造二维码/客服链接"
```
> 注：web 仓库独立与否以实际 `git rev-parse --show-toplevel` 为准；若 web 是独立仓，在 `e:\code\web` 内提交。

---

## Task 2: 运营端活动级联系方式追加字段

**Files:**
- Modify: `e:\code\web\src\pages\activity\promo.vue:206-220`（联系方式表单）

- [ ] **Step 1: 扩展联系方式表单字段配置**

将 `e:\code\web\src\pages\activity\promo.vue` 中「联系方式」`<template v-if="form.promoContact">…</template>` 块（约 214-218 行）替换为：
```vue
<template v-if="form.promoContact">
  <input type="text" v-model="form.promoContact.wechat.id" placeholder="微信号" class="form-input" />
  <input type="text" v-model="form.promoContact.wechatServiceUrl" placeholder="公众号客服链接（可选）" class="form-input" />
  <view class="form-label">微信客服二维码（可选）</view>
  <view class="media-select" @click="openPromoQrcodePicker">
    <image v-if="promoQrcodeUrl" :src="promoQrcodeUrl" mode="aspectFill" class="media-preview" />
    <text v-else class="media-placeholder">点击上传二维码</text>
    <text v-if="promoQrcodeUrl" class="media-remove" @click.stop="removePromoQrcode">✕</text>
  </view>
  <input type="text" v-model="form.promoContact.phone" placeholder="联系电话" class="form-input" />
  <input type="text" v-model="form.promoContact.notice" placeholder="提示文案（如：无法报名请加顾问微信）" class="form-input" />
  <view class="form-label">咨询名片（可选：姓名 / 职位 / 公司 / 电话 / 微信号）</view>
  <view class="card-fields" v-if="form.promoContact.card">
    <input type="text" v-model="form.promoContact.card.name" placeholder="姓名" class="form-input" />
    <input type="text" v-model="form.promoContact.card.title" placeholder="职位" class="form-input" />
    <input type="text" v-model="form.promoContact.card.company" placeholder="公司" class="form-input" />
    <input type="text" v-model="form.promoContact.card.phone" placeholder="名片电话" class="form-input" />
    <input type="text" v-model="form.promoContact.card.wechat" placeholder="名片微信号" class="form-input" />
  </view>
  <view class="card-toggle" @click="togglePromoCard">
    <text>{{ form.promoContact.card ? '收起名片编辑' : '添加名片' }}</text>
  </view>
</template>
```

- [ ] **Step 2: 新增二维码选择 / 名片开关的方法与状态**

在 `e:\code\web\src\pages\activity\promo.vue` 的 `<script setup>`（紧跟 `toggleContactOverride` 附近）新增：
```js
const promoQrcodeUrl = ref('')
const promoQrcodeId = ref('')
const showPromoQrcodePicker = ref(false)

function openPromoQrcodePicker() { showPromoQrcodePicker.value = true }
function removePromoQrcode() {
  promoQrcodeUrl.value = ''
  promoQrcodeId.value = ''
  if (form.value.promoContact) form.value.promoContact.wechat.qrcode = undefined
}
function togglePromoCard() {
  if (!form.value.promoContact) return
  if (form.value.promoContact.card) form.value.promoContact.card = null
  else form.value.promoContact.card = { name: '', title: '', company: '', phone: '', wechat: '' }
}
```
并在模板最外层追加复用 `MediaPicker`（与 site-config.vue 一致）：
```vue
<MediaPicker :visible="showPromoQrcodePicker" @update:visible="showPromoQrcodePicker = $event" @select="onPromoQrcodePicked" />
```
及脚本内：
```js
import MediaPicker from '../../components/MediaPicker.vue'  // 若未导入
function onPromoQrcodePicked(file) {
  success(() => {
    promoQrcodeId.value = file.id
    promoQrcodeUrl.value = file.url
    if (!form.value.promoContact) form.value.promoContact = { wechat: {} }
    form.value.promoContact.wechat.qrcode = file.url
  })
}
```
> `form.promoContact.wechat` 可能未初始化，在第 1 步模板受 `v-if="form.promoContact"` 保护；确保 onSubmit 前按 `promoContact` 统一结构保底（下述 Step 3）。

- [ ] **Step 3: 确保保存结构统一（清空 + 缺失字段保底）**

在 `e:\code\web\src\pages\activity\promo.vue` 提交/保存逻辑（`save` 或 `onSubmit` 中，`promoContact: form.promoContact || null` 之前）加入：
```js
function sanitizePromoContact(c) {
  if (!c) return null
  if (c.wechat && !c.wechat.id && !c.wechat.qrcode) delete c.wechat
  else if (!c.wechat) c.wechat = undefined
  for (const k of ['phone', 'wechatServiceUrl', 'notice']) if (!c[k]) delete c[k]
  if (c.card) {
    const card = c.card
    for (const k of ['name','title','company','phone','wechat']) if (!card[k]) delete card[k]
    if (!Object.keys(card).length) c.card = null
    c.card = (c.card && Object.keys(c.card).length) ? card : undefined
  }
  return (c.phone || c.wechat || c.wechatServiceUrl || c.notice || c.card) ? c : null
}
// 保存处调用：
// promoContact: sanitizePromoContact(form.promoContact)
```

- [ ] **Step 4: 构建校验**

Run: `npm run build:h5`（在 `e:\code\web`）
Expected: 构建成功（`DONE Build complete`），无模板/脚本报错。

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/activity/promo.vue
git commit -m "feat(web): 活动级联系方式追加二维码/客服链接/名片字段"
```

---

## Task 3: 运营端预览对齐（复用 C 端组件树 + 事件/示例）

**Files:**
- Modify: `e:\code\web\src\pages\activity\promo.vue`（预览弹窗 306-341）

- [ ] **Step 1: 预览模板补事件绑定、in-wechat、示例留言与二维码/留言入口**

将 `web/src/pages/activity/promo.vue` 预览弹窗中 `PromoContact`/`FloatContact`/`PromoMessage` 分支（约 324-331 行）替换为：
```vue
<PromoContact
  v-else-if="m.type === 'contact'"
  :contact="form.promoContact || previewSiteContact"
  @open-wechat="previewShowWechat = true"
  @call-phone="previewCallPhone()"
/>
<PromoMessage
  v-else-if="m.type === 'message'"
  :messages="previewMessages"
  :config="m.config"
  :readonly="true"
/>
<FloatContact
  v-else-if="m.type === 'floatContact'"
  :contact="form.promoContact || previewSiteContact"
  :in-wechat="false"
  @open-wechat="previewShowWechat = true"
  @call-phone="previewCallPhone()"
/>
```
并在预览弹窗内部、模块列表之后追加（挂在 `<block v-for>` 之后、`.promo-page` 内）：
```vue
<!-- 预览悬浮留言入口（示例） -->
<view class="preview-float-msg" @click="previewShowMessage = true">
  <text class="preview-msg-badge">1</text>
  <text class="preview-msg-label">留言</text>
</view>
```
以及在预览弹窗整体之后追加两个示例弹层：
```vue
<view class="modal-mask" v-if="previewShowWechat" @click="previewShowWechat = false">
  <view class="preview-modal preview-small" @click.stop>
    <text class="preview-title">联系客服（预览示例）</text>
    <view v-if="previewQrcode" class="preview-qr-box">
      <image :src="previewQrcode" mode="aspectFit" class="preview-qr" />
      <text class="preview-tip">微信环境长按识别，浏览器扫码或复制微信号</text>
    </view>
    <view v-else class="preview-qr-empty">未配置二维码（运营上传后在 C 端展示）</view>
    <view class="signup-btn cancel" @click="previewShowWechat = false"><text>关闭</text></view>
  </view>
</view>
<view class="modal-mask" v-if="previewShowMessage" @click="previewShowMessage = false">
  <view class="preview-modal preview-small" @click.stop>
    <text class="preview-title">留言（预览示例）</text>
    <view class="preview-msg-item">
      <text class="msg-q">问</text><text class="msg-user">示例客户</text>
      <text class="msg-content">请问还有名额吗？</text>
    </view>
    <view class="preview-msg-item preview-msg-reply">
      <text class="msg-a">答</text><text class="msg-user msg-user--admin">管理员</text>
      <text class="msg-content">您好，还有少量名额，欢迎报名。</text>
    </view>
    <view class="signup-btn submit" @click="previewShowMessage = false"><text>关闭</text></view>
  </view>
</view>
```

- [ ] **Step 2: 补充预览状态与方法**

在 `e:\code\web\src\pages\activity\promo.vue` `<script setup>` 新增：
```js
const previewShowWechat = ref(false)
const previewShowMessage = ref(false)
const previewMessages = [
  { id: 1, content: '请问还有名额吗？', status: 'replied', reply: '您好，还有少量名额，欢迎报名。', nickname: '示例客户', repliedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
]
const previewQrcode = (form.value.promoContact?.wechat?.qrcode) || ''
const previewSiteContact = {} // 预览无站点数据时的兜底空对象
function previewCallPhone() { uni.showToast({ title: '预览：运营端拨号不生效', icon: 'none' }) }
```
> `previewSiteContact` 可替换为从公共 config 读到的站点 `promoContact`；若 web 运营端无法直接获取站点配置，保留空对象即可（示例优先展示活动级）。

- [ ] **Step 3: 校验模板层级（新增弹层放在预览弹窗闭合与根闭合之间）**

Run: `npx vls --noEmit` 或 `npm run build:h5`（在 `e:\code\web`）
Expected: 构建成功，无“多余结束标签 / 组件未发现”错误。

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/activity/promo.vue
git commit -m "feat(web): 预览对齐 C 端 detail，补事件/示例留言/二维码与留言入口占位"
```

---

## Task 4: C 端悬浮留言按钮 + 弹层线程化 + 未读角标（shao）

**Files:**
- Create: `e:\code\shao\components\promo\message-dialog.vue`
- Modify: `e:\code\shao\pages\activity\detail.vue`

- [ ] **Step 1: 新建 message-dialog.vue（线程 + 提交弹层）**

```vue
<template>
  <view class="msg-mask" v-if="visible" @click="close">
    <view class="msg-panel" @click.stop>
      <view class="msg-header">
        <text class="msg-title">留言咨询</text>
        <text class="msg-close" @click="close">✕</text>
      </view>
      <scroll-view scroll-y class="msg-list">
        <view v-if="!messages.length" class="msg-empty">暂无留言，写下你的问题吧</view>
        <view v-for="(m, i) in messages" :key="m.id ?? i" class="msg-item">
          <view class="msg-row">
            <text class="msg-no">#{{ i + 1 }}</text>
            <text class="msg-q">问</text>
            <text class="msg-user">{{ m.nickname || '游客' }}</text>
            <text class="msg-time">{{ formatTime(m.createdAt) }}</text>
          </view>
          <text class="msg-content">{{ m.content }}</text>
          <view v-if="m.status === 'replied' && m.reply" class="msg-reply-box">
            <view class="msg-row">
              <text class="msg-no">&nbsp;</text>
              <text class="msg-a">答</text>
              <text class="msg-user msg-user--admin">管理员</text>
              <text class="msg-time">{{ formatTime(m.repliedAt || m.createdAt) }}</text>
            </view>
            <text class="msg-reply">{{ m.reply }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="msg-input-row">
        <input class="msg-input" v-model="input" :placeholder="placeholder" confirm-type="send" @confirm="submit" />
        <button class="msg-send" :disabled="sending || !input.trim()" @click="submit"><text>发送</text></button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  visible: boolean
  messages: any[]
  placeholder?: string
}>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submit', content: string): void | Promise<void>
}>()

const input = ref('')
const sending = ref(false)

function formatTime(t?: string): string {
  if (!t) return ''
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function close() { emit('update:visible', false) }
async function submit() {
  const c = input.value.trim()
  if (!c || sending.value) return
  sending.value = true
  try {
    await emit('submit', c)
    input.value = ''
  } finally {
    sending.value = false
  }
}
</script>

<style lang="scss" scoped>
.msg-mask { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; }
.msg-panel { width: 100%; height: 66vh; background: #fff; border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column; }
.msg-header { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; border-bottom: 1rpx solid #f0f0f0; }
.msg-title { font-size: 32rpx; font-weight: bold; }
.msg-close { font-size: 32rpx; color: #999; padding: 0 8rpx; }
.msg-list { flex: 1; padding: 0 32rpx; }
.msg-empty { padding: 80rpx 0; text-align: center; color: #999; font-size: 26rpx; }
.msg-item { padding: 20rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.msg-row { display: flex; align-items: center; gap: 10rpx; }
.msg-no { font-size: 22rpx; color: #999; }
.msg-q, .msg-a { flex-shrink: 0; min-width: 40rpx; padding: 2rpx 10rpx; border-radius: 8rpx; font-size: 22rpx; text-align: center; }
.msg-q { background: rgba(64,158,255,.12); color: #409eff; }
.msg-a { background: rgba(7,193,96,.14); color: #07c160; }
.msg-user { font-size: 24rpx; color: #333; font-weight: 600; }
.msg-user--admin { color: #07c160; }
.msg-time { margin-left: auto; font-size: 22rpx; color: #999; }
.msg-content { display: block; margin-top: 6rpx; font-size: 27rpx; line-height: 1.6; }
.msg-reply-box { margin-top: 10rpx; padding: 12rpx 16rpx; background: #f6f6f6; border-radius: 12rpx; }
.msg-reply { display: block; margin-top: 6rpx; font-size: 25rpx; color: #07c160; line-height: 1.6; }
.msg-input-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 32rpx; border-top: 1rpx solid #f0f0f0; background: #fff; }
.msg-input { flex: 1; height: 72rpx; padding: 0 24rpx; background: #f5f6f7; border-radius: 36rpx; font-size: 26rpx; }
.msg-send { min-width: 128rpx; height: 72rpx; line-height: 72rpx; padding: 0 32rpx; background: #07c160; color: #fff; font-size: 28rpx; border-radius: 36rpx; }
.msg-send[disabled] { opacity: .5; }
</style>
```

- [ ] **Step 2: detail.vue 悬浮留言按钮（模板）+ 弹层替换**

在 `e:\code\shao\pages\activity\detail.vue` 模板中，模块循环 `<block v-for="m in modules">` 之后、页面根闭合之前追加悬浮留言按钮；并把原有纯提交留言弹层替换为 `message-dialog`：
```vue
<!-- 悬浮留言入口：仅当有留言时显示，未读回复数角标 -->
<view v-if="myMessages.length" class="msg-float-btn" @click="openMessagePanel">
  <text class="msg-float-icon">🗨️</text>
  <text class="msg-float-badge" v-if="unreadReplyCount">{{ unreadReplyCount }}</text>
</view>

<!-- 留言线程 + 提交弹层 -->
<MessageDialog
  v-model:visible="showMessagePanel"
  :messages="myMessages"
  placeholder="写下你的问题，运营会尽快回复"
  @submit="submitActivityMessage"
/>
```
> 删除原 `<view class="signup-actions">…取消/提交留言…</view>` 一体的纯表单弹层，改为上述 `MessageDialog`。

- [ ] **Step 3: import + 状态 + 未读逻辑（detail.vue script）**

新增 import 与状态：
```ts
import MessageDialog from '../../components/promo/message-dialog.vue'
// 已有 showMessagePanel / messageInput / myMessages / messagesLoaded
const unreadReplyCount = ref(0)   // 未读回复数
```
将 `loadMyMessages()` 改为（登录后计算角标；游客静默跳过）：
```ts
async function loadMyMessages() {
  if (!id) return
  try {
    const res = await listMyActivityMessages(id)
    myMessages.value = Array.isArray(res) ? res : (res?.data || [])
    messagesLoaded = true
    calcUnread()
  } catch { /* 静默 */ }
}

/** 未读回复 = replied 且 repliedAt 晚于上次查看时间；进入页面/提交后调用 */
function calcUnread() {
  const key = msgLastSeenKey()
  const lastSeen = uni.getStorageSync(key)
  unreadReplyCount.value = myMessages.value.filter(
    (m: any) => m.status === 'replied' && m.reply && (!lastSeen || new Date(m.repliedAt || m.createdAt).getTime() > Number(lastSeen))
  ).length
}

/** 打开弹层：把未读清零并记录本次查看时间 */
function openMessagePanel() {
  showMessagePanel.value = true
  uni.setStorageSync(msgLastSeenKey(), String(Date.now()))
  unreadReplyCount.value = 0
  loadMyMessages()
}
```
辅助（与 `ssoUserId` 对齐的用户标识，读自本地登录态）：
```ts
function msgLastSeenKey() {
  const uid = (uni.getStorageSync('ssoUser') || {}).ssoUserId || 'guest'
  return `actMsgLastSeen:${uid}:${id}`
}
```
`submitActivityMessage` 提交成功后保留 `loadMyMessages()`，并同步更新 `lastSeen`（提交即已查看自己的留言）：
```ts
async function submitActivityMessage(content: string) {
  const c = (content || '').trim()
  if (!c) { uni.showToast({ title: '请输入留言内容', icon: 'none' }); return }
  try {
    await sendActivityMessage(id, c)
    uni.showToast({ title: '留言已提交，运营将尽快回复', icon: 'none' })
    uni.setStorageSync(msgLastSeenKey(), String(Date.now()))
    unreadReplyCount.value = 0
    await loadMyMessages()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
    throw e   // 让弹层不关闭、不清空输入
  }
}
```

- [ ] **Step 4: onShow 拉取重算（详情页挂载后）**

在 `onLoad`/初始化成功并拿到 `id` 之后调用一次 `loadMyMessages()`（用于首屏计算角标，游客静默）。
```ts
// 在现有 onLoad 中，与其它初始化并列：
await loadMyMessages()
```
> 若原代码仅在 `openMessagePanel` 时加载，则新增首次加载即可满足“有留言才出现按钮”。

- [ ] **Step 5: 悬浮按钮样式（detail.vue style）**

```scss
.msg-float-btn {
  position: fixed; left: 28rpx; bottom: 120rpx; z-index: 60;
  width: 108rpx; height: 108rpx; border-radius: 50%;
  background: var(--c-primary, #07c160); color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba(0,0,0,.2);
}
.msg-float-icon { font-size: 40rpx; }
.msg-float-badge {
  position: absolute; top: -4rpx; right: -4rpx; min-width: 34rpx; height: 34rpx;
  line-height: 34rpx; padding: 0 8rpx; border-radius: 18rpx;
  background: #ff4d4f; color: #fff; font-size: 22rpx; text-align: center;
}
```

- [ ] **Step 6: 构建校验**

Run: `npm run build:h5`（在 `e:\code\shao`）
Expected: 构建成功，无模板/TS 报错。

- [ ] **Step 7: Commit**

```bash
git add shao/components/promo/message-dialog.vue shao/pages/activity/detail.vue
git commit -m "feat(shao): 留言弹层线程化 + 悬浮留言按钮 + 未读回复角标"
```

---

## Task 5: 双端构建 + 发布

**Files:**（无源码改动，仅产物）

- [ ] **Step 1: 确认 C 端 H5 产物**

Run: `ls e:\code\shao\dist\build\h5\index.html`
Expected: 文件存在。

- [ ] **Step 2: 发布 C 端 v.joho.cn**

Run: `powershell -ExecutionPolicy Bypass -File E:\code\shao\deploy-h5.ps1`
Expected: 输出 `SYNC_OK`。

- [ ] **Step 3: 发布运营端 h.joho.cn**

Run: `powershell -ExecutionPolicy Bypass -File E:\code\web\deploy-h5.ps1`
Expected: 输出 `SYNC_OK`。

- [ ] **Step 4: 线上验证清单**

- 活动详情页（C 端）：客提留言后留言弹层内出现该留言（编号/问/昵称/时间）；运营端回复后重进详情感知未读角标数字；打开弹层角标清零。
- 运营端「宣传文案设计」：联系方式区可上传二维码、填公众号客服链接、增删名片、提示文案。
- 运营端预览：点微信弹二维码示例、点电话出提示、留言模块显示示例问/答、出现悬浮留言入口角标占位。
- 若活动 promoModules 含 `message` 模块，弹层与 `PromoMessage` 均展示线程，格式一致。

---

## 自评对照（写作时核对）
- **Spec 覆盖**：留言弹层线程化 ✓Task4；悬浮按钮+未读角标 ✓Task4；预览对齐（事件/in-wechat/示例留言/二维码/入口）✓Task3；活动级联系方式全字段追加 ✓Task2；AI 契约同步（note→notice + 补 qrcode/card/wechatServiceUrl + 不编造）✓Task1。
- **类型一致性**：`promoContact` 结构跨 Task1/2/3 统一为 `{phone, wechat{id,qrcode}, wechatServiceUrl, card, notice}`；C 端读 `wechatServiceUrl`/`wechat.qrcode` 与之匹配。`MessageDialog` 事件 `submit(content)` 与 `submitActivityMessage(content)` 签名一致。
- **占位符**：所有步骤含完整代码与命令，无 TODO。