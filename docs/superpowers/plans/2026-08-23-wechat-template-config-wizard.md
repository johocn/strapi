# 微信模板通知·配置向导 + 客户端测试发送 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为"零基础客户也能完成微信模板通知配置"提供双端分步配置向导，并补齐模板编辑页「发送测试」与消息任务页「手动发送」入口，部署 joho 后真实微信通道验证。

**Architecture:** 全部复用既有 API（`sendNow`/`listTemplates`/`listUsers`），无新增后端接口。前端 web 运营端（uni-app）增强两个页面 + 一个可复用向导组件（`ConfigWizard.vue`），模板编辑页加发送测试弹窗、消息任务页加手动发送弹窗；后台 admin 插件 `WebchatTab.tsx` 仅加简短指引段落。改 admin 插件 TS 后重建 dist。

**Tech Stack:** Vue3 + uni-app（web 运营端）/ React + Strapi Admin Design System（admin 插件）/ Strapi 5

---

## 文件清单

### web 运营端（E:\code\web）
| 文件 | 操作 |
|------|------|
| `src/components/msg/ConfigWizard.vue` | 新建：微信模板通知配置向导（分步面板） |
| `src/pages/sso/msg-template/list.vue` | 修改：help-banner 替换为 ConfigWizard |
| `src/pages/sso/msg-template/edit.vue` | 修改：底部加「发送测试」按钮 + 弹窗 + 逻辑 |
| `src/api/sso.js` | 修改：新增解析 `.users` 的用户列表函数 |
| `src/pages/sso/msg-job/list.vue` | 修改：顶部加「手动发送」按钮 + 弹窗 + 逻辑 |

### 后端 admin 插件（E:\code\basic）
| 文件 | 操作 |
|------|------|
| `plugins/zhao-sso/admin/src/pages/WebchatTab.tsx` | 修改：`TemplateSection` 加简短配置指引段落 |
| `plugins/zhao-sso/dist` | 重建产物（admin 插件 bundle） |

---

### Task 1: 新建可复用配置向导组件 ConfigWizard.vue

**Files:**
- Create: `E:\code\web\src\components\msg\ConfigWizard.vue`

- [ ] **Step 1: 创建组件目录与文件**

创建 `E:\code\web\src\components\msg\` 目录，新建 `ConfigWizard.vue`。

- [ ] **Step 2: 实现向导面板**

组件为可折叠分步向导（默认展开），包含六步，每步标题可点击展开/收起（手风琴），字段参数说明附所见即所得示例。完整代码如下：

```vue
<template>
  <view class="wizard">
    <view class="wizard-head" @click="collapsed = !collapsed">
      <text class="wizard-title">📘 微信模板通知 · 配置向导</text>
      <text class="wizard-toggle">{{ collapsed ? '展开' : '收起' }}</text>
    </view>

    <view v-show="!collapsed" class="wizard-body">
      <view v-for="(s, si) in steps" :key="si" class="w-step">
        <view class="w-step-head" @click="toggleStep(si)">
          <text class="w-step-no" :class="{ done: open === si }">{{ s.no }}</text>
          <text class="w-step-title">{{ s.title }}</text>
          <text class="w-step-arrow">{{ open === si ? '−' : '＋' }}</text>
        </view>
        <view v-show="open === si" class="w-step-body">
          <text v-for="(line, li) in s.lines" :key="li" class="w-line">{{ line }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const collapsed = ref(false)
const open = ref(0)

const steps = [
  {
    no: '1', title: '前置准备',
    lines: [
      '① 公众号必须为「认证服务号」（需企业资质，未认证无法使用模板消息）。',
      '② 接收人（客户/学员）需已「关注」该公众号。',
      '③ 已在公众号后台开通「模板消息」（广告与服务 → 增值服务 → 模板消息，部分行业需审核）。',
    ],
  },
  {
    no: '2', title: '公众号后台领取模板 ID',
    lines: [
      '① 浏览器打开 mp.weixin.qq.com，登录你的认证服务号。',
      '② 进入 设置与开发 → 更多 → 广告与服务 → 增值服务 → 模板消息。',
      '③ 在「我的模板」选择已有模板，或点「从模板库中添加」按关键词搜索后添加。',
      '④ 记录选中所用模板的「模板 ID」（形如 xxx_AbCd1234……）；模板内容里的 {thing1.DATA} {date2.DATA} 为字段，下一步会用到。',
    ],
  },
  {
    no: '3', title: '在平台配置公众号 AppID / AppSecret',
    lines: [
      '① 公众号后台 设置与开发 → 基本配置，查看「AppID」。',
      '② 点「重置」按钮获取新 AppSecret（仅展示一次，请立即复制，妥善保管）。',
      '③ 将 AppID / AppSecret 填写到平台「SSO 登录 / OAuth 配置」中公众号一处，并保存。',
    ],
  },
  {
    no: '4', title: '新增消息模板（填模板 ID 与字段映射）',
    lines: [
      '① 在本页点「+ 新增模板」。',
      '② 填唯一「模板编码 code」（如 act_confirm，业务逻辑按它引用，保存后不可改）。',
      '③ 「公众号模板ID wxTemplateId」填第 2 步复制的模板 ID（如 xxx_AbCd1234）。',
      '④ 在「参数字段」每行配置：左侧 = 平台传值用参数 key（如 title）；右侧 = 微信字段名（第 2 步模板中的 thing1 / date2，含类型后缀）。',
      '⑤ 开启右上角「启用」开关。',
    ],
  },
  {
    no: '5', title: '发送测试验证（必做）',
    lines: [
      '① 在模板编辑页点「发送测试」。',
      '② 选择一个已关注公众号的测试用户（用微信手机/昵称搜索）。',
      '③ 为每个参数字段填一个测试值（如 title 填“活动报名成功”）。',
      '④ 点「发送」，查看微信是否收到，以及回执 msqId / 失败原因（未关注会提示 43101）。',
      '⚠ 同一用户连续测试会被频控拦截（场景冷却），属正常，隔 1 分钟再试。',
    ],
  },
  {
    no: '6', title: '（可选）接入自动触发',
    lines: [
      '① 到「SOP 自动规则」按 templateCode 引用刚建的模板，设定触发条件。',
      '② 或由业务埋点（如活动报名成功）自动创建消息任务。',
      '③ 到「消息任务」页查看自动下发结果，失败任务可点「重试」。',
    ],
  },
]

function toggleStep(i) { open.value = open.value === i ? -1 : i }
</script>

<style scoped>
.wizard { background: #fff; border-radius: 12rpx; margin-bottom: 20rpx; overflow: hidden; }
.wizard-head { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background: #1677ff; }
.wizard-title { font-size: 30rpx; font-weight: bold; color: #fff; }
.wizard-toggle { font-size: 24rpx; color: #fff; }
.wizard-body { padding: 8rpx 24rpx 24rpx; }
.w-step { border-bottom: 1rpx solid #f0f0f0; padding: 8rpx 0; }
.w-step:last-child { border-bottom: none; }
.w-step-head { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.w-step-no { width: 40rpx; height: 40rpx; line-height: 40rpx; text-align: center; border-radius: 50%; background: #f0f0f0; color: #666; font-size: 24rpx; flex-shrink: 0; }
.w-step-no.done { background: #1677ff; color: #fff; }
.w-step-title { flex: 1; font-size: 28rpx; font-weight: bold; color: #333; }
.w-step-arrow { font-size: 28rpx; color: #999; }
.w-step-body { padding: 8rpx 8rpx 20rpx 56rpx; }
.w-line { display: block; font-size: 26rpx; color: #555; line-height: 1.7; margin-bottom: 8rpx; }
</style>
```

- [ ] **Step 3: 提交**

```bash
cd E:\code\web
git add src/components/msg/ConfigWizard.vue
git commit -m "feat(msg): 新增微信模板通知配置向导组件"
```

---

### Task 2: 消息模板列表页接入向导

**Files:**
- Modify: `E:\code\web\src\pages\sso\msg-template\list.vue`

- [ ] **Step 1: 引入并替换 help-banner**

将模板中第 7-10 行的 `help-banner` 替换为 `<ConfigWizard />`，并在 `<script setup>` 引入组件：

template 替换（第 7-10 行）：
```vue
    <ConfigWizard />
```

script 引入（在第 72 行 `PageHeader` 之后新增）：
```js
import ConfigWizard from '../../../components/msg/ConfigWizard.vue'
```

- [ ] **Step 2: 提交**

```bash
cd E:\code\web
git add src/pages/sso/msg-template/list.vue
git commit -m "feat(msg): 消息模板列表页接入配置向导"
```

---

### Task 3: sso.js 新增用户列表接口（解析 .users）

**Files:**
- Modify: `E:\code\web\src\api\sso.js`

- [ ] **Step 1: 新增用户列表函数**

后端 `GET /zhao-sso/v1/admin/users` 返回 `{users, meta}`，`extractList` 不识此结构，须自定义解析。在 [sso.js](file:///e:/code/web/src/api/sso.js) 用户管理区块（`getSsoUserList` 下方）新增：

```js
// SSO 用户列表（下拉选择用）：后端返回 { users, meta }，extractList 不识别该结构，故单独解析 .users
export function getSsoUserOptions(params = {}) {
  return get(`${ADMIN}/users`, params).then((res) => ({
    list: (res && Array.isArray(res.users)) ? res.users : [],
    meta: (res && res.meta) || {},
  }))
}
```

确认 `get` 已 import（第 1 行已 import，无需改动 import）。

- [ ] **Step 2: 提交**

```bash
cd E:\code\web
git add src/api/sso.js
git commit -m "feat(msg): sso.js 新增用户选项接口(解析 .users)"
```

---

### Task 4: 模板编辑页新增「发送测试」弹窗

**Files:**
- Modify: `E:\code\web\src\pages\sso\msg-template\edit.vue`

- [ ] **Step 1: 在 footer-bar 新增「发送测试」按钮**

在模板第 126-128 行的 footer-bar 内（保存按钮前）新增：

```vue
    <view class="footer-bar">
      <button class="btn-save test" @click="openSendTest" v-if="isEdit && hasPermission('sso.msg.write')" :disabled="sending">{{ sending ? '发送中...' : '发送测试' }}</button>
      <button class="btn-save" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
    </view>
```

样式加 `.btn-save.test { background: #1677ff; margin-bottom: 16rpx; }`。

- [ ] **Step 2: 新增发送测试弹层与相关 state/逻辑**

在 `<template>` 的 AB 对比弹层（第 161 行 `</view>` 前）后新增弹层（放在最后，闭合 `</view>` 内）：

```vue
    <!-- 发送测试弹层 -->
    <view class="send-mask" v-if="sendVisible" @click="sendVisible = false">
      <view class="send-modal" @click.stop>
        <view class="send-modal-header">
          <text class="send-modal-title">发送测试</text>
          <text class="ab-modal-close" @click="sendVisible = false">✕</text>
        </view>

        <view class="form-item">
          <text class="form-label">测试用户 <text class="required">*</text></text>
          <input class="form-input" v-model="sendSearch" placeholder="搜索微信手机号/昵称/邮箱" @confirm="searchUsers" />
          <view class="user-list" v-if="sendUserLists.length">
            <view v-for="u in sendUserLists" :key="u.id" class="user-row" :class="{ active: sendUser && sendUser.id === u.id }" @click="pickUser(u)">
              <text class="user-name">{{ u.username || u.nickname || u.mobile || u.email || '#' + u.id }}</text>
              <text class="user-id">id={{ u.id }}</text>
            </view>
          </view>
          <view v-if="sendUser" class="user-picked">已选: {{ sendUser.username || sendUser.mobile || sendUser.email || ('#' + sendUser.id) }}</view>
        </view>

        <view class="form-item">
          <text class="form-label">参数字段测试值</text>
          <view v-if="sendFields.length === 0" class="send-empty">该模板无参数字段，可直接发送</view>
          <view v-for="(f, i) in sendFields" :key="i" class="form-item">
            <text class="form-label">{{ f.key }} → {{ f.name }}</text>
            <input class="form-input" v-model="sendParams[f.key]" :placeholder="`填 ${f.name} 的测试值`" />
          </view>
        </view>

        <view v-if="sendResult" class="send-result" :class="sendResult.ok ? 'ok' : 'fail'">
          <text>{{ sendResult.ok ? '发送成功 msqId=' + sendResult.msgId : '发送失败: ' + sendResult.reason }}</text>
        </view>

        <view class="send-footer">
          <view class="btn-add" @click="sendVisible = false">取消</view>
          <button class="btn-save small" @click="doSendTest" :disabled="sending">{{ sending ? '发送中...' : '发送' }}</button>
        </view>
      </view>
    </view>
```

- [ ] **Step 3: 新增 script 逻辑**

在 `<script setup>` 的 `handleSave` 之后、`onLoad` 之前新增（保持 `documentId`/`form` 已定义）：

```js
import { ssoMsgJobApi, getSsoUserOptions } from '../../../api/sso.js'

const hasPermission = userStore.hasPermission

// ===== 发送测试 =====
const sendVisible = ref(false)
const sendSearch = ref('')
const sendUserLists = ref([])
const sendUser = ref(null)
const sendFields = ref([])
const sendParams = ref({})
const sendResult = ref(null)
const sending = ref(false)

function openSendTest() {
  if (!documentId.value) return
  sendVisible.value = true
  sendResult.value = null
  sendUser.value = null
  sendUserLists.value = []
  sendFields.value = form.value.wxTemplateFields.filter((f) => f && f.key && f.name).map((f) => ({ key: f.key, name: f.name }))
  sendParams.value = {}
  sendFields.value.forEach((f) => { sendParams.value[f.key] = '' })
}

async function searchUsers() {
  if (!sendSearch.value) return
  try {
    const { list } = await getSsoUserOptions({ search: sendSearch.value, pageSize: 20 })
    sendUserLists.value = list || []
  } catch (e) {
    uni.showToast({ title: '用户查询失败', icon: 'none' })
  }
}

function pickUser(u) {
  sendUser.value = u
  sendUserLists.value = []
}

async function doSendTest() {
  if (!sendUser.value) { uni.showToast({ title: '请选择测试用户', icon: 'none' }); return }
  if (!form.value.code) { uni.showToast({ title: '模板未保存，请先保存再测试', icon: 'none' }); return }
  sending.value = true
  sendResult.value = null
  const params = {}
  sendFields.value.forEach((f) => { if (sendParams.value[f.key] !== '' && sendParams.value[f.key] !== undefined) params[f.key] = sendParams.value[f.key] })
  try {
    const job = await ssoMsgJobApi.sendNow({ user: sendUser.value.id, scene: 'manual', templateCode: form.value.code, params })
    const st = job && job.status
    if (st === 'sent') {
      sendResult.value = { ok: true, msgId: (job && job.wxMsgId) || '' }
    } else {
      const reason = (job && job.result && (job.result.message || job.result.reason || job.result.error)) || JSON.stringify(job && job.result) || st
      sendResult.value = { ok: false, reason: (st === 'quota_limited' ? '频控拦截: ' : '') + reason }
    }
  } catch (e) {
    sendResult.value = { ok: false, reason: (e && (e.message || e.data && e.data.error)) || '发送异常' }
  } finally {
    sending.value = false
  }
}
```

需在顶部引入 `userStore`（本文件当前未引入 `useUserStore`，需新增）：
在 import 区（第 169-170 行）新增：
```js
import { useUserStore } from '../../../store/user.js'
```
并在 `const PROVIDERS = [...]` 前新增：
```js
const userStore = useUserStore()
```

- [ ] **Step 4: 新增样式**

在 `<style scoped>` 末尾追加：

```css
.btn-save.test { background: #1677ff; margin-bottom: 16rpx; }
.send-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.send-modal { width: 88%; max-height: 80vh; background: #fff; border-radius: 16rpx; padding: 28rpx; box-sizing: border-box; overflow-y: auto; }
.send-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.send-modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.user-list { margin-top: 12rpx; border-top: 1rpx solid #f0f0f0; }
.user-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.user-row.active { background: #e6f4ff; }
.user-name { font-size: 26rpx; color: #333; }
.user-id { font-size: 24rpx; color: #999; }
.user-picked { margin-top: 12rpx; font-size: 26rpx; color: #1677ff; }
.send-empty { font-size: 26rpx; color: #999; padding: 20rpx 0; }
.send-result { margin-top: 16rpx; padding: 20rpx; border-radius: 8rpx; font-size: 26rpx; }
.send-result.ok { background: #f0fff4; color: #07c160; }
.send-result.fail { background: #fff0f0; color: #ff4d4f; word-break: break-all; }
.send-footer { display: flex; align-items: center; justify-content: flex-end; gap: 20rpx; margin-top: 24rpx; }
```

- [ ] **Step 5: 校验编译**

确认无未定义引用（`userStore`/`ssoMsgJobApi`/`getSsoUserOptions` 均已引入）。运行 web 前端构建验证：

```bash
cd E:\code\web
npm run build:h5
```

Expected: 构建成功，无 `Can't resolve` / 未定义变量报错。

- [ ] **Step 6: 提交**

```bash
cd E:\code\web
git add src/pages/sso/msg-template/edit.vue
git commit -m "feat(msg): 消息模板编辑页新增发送测试弹窗"
```

---

### Task 5: 消息任务页新增「手动发送」入口

**Files:**
- Modify: `E:\code\web\src\pages\sso\msg-job\list.vue`

- [ ] **Step 1: 在 help-banner 下新增「手动发送」按钮**

在模板第 8 行 `help-banner` 后、第 10 行搜索区前新增：

```vue
    <view class="manual-bar">
      <view class="btn-primary" v-if="hasPermission('sso.msg.write')" @click="openManual">＋ 手动发送</view>
    </view>
```

- [ ] **Step 2: 新增手动发送弹层**

在 `</view>` 闭合前（第 58 行 pagination 后）新增：

```vue
    <!-- 手动发送弹层 -->
    <view class="send-mask" v-if="manualVisible" @click="manualVisible = false">
      <view class="send-modal" @click.stop>
        <view class="send-modal-header">
          <text class="send-modal-title">手动发送</text>
          <text class="ab-modal-close" @click="manualVisible = false">✕</text>
        </view>

        <view class="form-item">
          <text class="form-label">选择模板 <text class="required">*</text></text>
          <picker range-key="name" :range="manualTemplates" @change="pickManualTemplate">
            <view class="form-input picker">{{ manualTemplate ? manualTemplate.code + ' · ' + manualTemplate.name : '点击选择已启用模板' }}</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">目标用户 <text class="required">*</text></text>
          <input class="form-input" v-model="manualSearch" placeholder="搜索微信手机号/昵称/邮箱" @confirm="searchManualUsers" />
          <view class="user-list" v-if="manualUsers.length">
            <view v-for="u in manualUsers" :key="u.id" class="user-row" :class="{ active: manualUser && manualUser.id === u.id }" @click="pickManualUser(u)">
              <text class="user-name">{{ u.username || u.nickname || u.mobile || u.email || '#' + u.id }}</text>
              <text class="user-id">id={{ u.id }}</text>
            </view>
          </view>
          <view v-if="manualUser" class="user-picked">已选: {{ manualUser.username || manualUser.mobile || manualUser.email || ('#' + manualUser.id) }}</view>
        </view>

        <view class="form-item">
          <text class="form-label">参数字段测试值</text>
          <view v-if="manualFields.length === 0" class="send-empty">该模板无参数字段，可直接发送</view>
          <view v-for="(f, i) in manualFields" :key="i" class="form-item">
            <text class="form-label">{{ f.key }} → {{ f.name }}</text>
            <input class="form-input" v-model="manualParams[f.key]" :placeholder="`填 ${f.name} 的测试值`" />
          </view>
        </view>

        <view class="send-footer">
          <view class="btn-add" @click="manualVisible = false">取消</view>
          <button class="btn-save small" @click="doManualSend" :disabled="manualSending">{{ manualSending ? '发送中...' : '发送' }}</button>
        </view>
      </view>
    </view>
```

- [ ] **Step 3: 新增 script 逻辑**

在 `<script setup>` 的 import 区新增，并补充逻辑函数：

```js
import { ssoMsgTemplateApi, ssoMsgJobApi, getSsoUserOptions } from '../../../api/sso.js'

// ===== 手动发送 =====
const manualVisible = ref(false)
const manualTemplates = ref([])
const manualTemplate = ref(null)
const manualFields = ref([])
const manualParams = ref({})
const manualSearch = ref('')
const manualUsers = ref([])
const manualUser = ref(null)
const manualSending = ref(false)

async function openManual() {
  manualVisible.value = true
  manualTemplate.value = null
  manualUser.value = null
  manualUsers.value = []
  manualSearch.value = ''
  manualParams.value = {}
  const { list } = await ssoMsgTemplateApi.list({ page: 1, pageSize: 100 }).catch(() => ({ list: [] }))
  manualTemplates.value = (list || []).filter((t) => t.isEnabled !== false)
}

function pickManualTemplate(e) {
  const t = manualTemplates.value[Number(e.detail.value)]
  if (!t) return
  manualTemplate.value = t
  let fields = t.wxTemplateFields || []
  if (typeof fields === 'string') { try { fields = JSON.parse(fields) } catch { fields = [] } }
  manualFields.value = fields.filter((f) => f && f.key && f.name).map((f) => ({ key: f.key, name: f.name }))
  manualParams.value = {}
  manualFields.value.forEach((f) => { manualParams.value[f.key] = '' })
}

async function searchManualUsers() {
  if (!manualSearch.value) return
  try {
    const { list } = await getSsoUserOptions({ search: manualSearch.value, pageSize: 20 })
    manualUsers.value = list || []
  } catch (e) {
    uni.showToast({ title: '用户查询失败', icon: 'none' })
  }
}

function pickManualUser(u) {
  manualUser.value = u
  manualUsers.value = []
}

async function doManualSend() {
  if (!manualTemplate.value) { uni.showToast({ title: '请选择模板', icon: 'none' }); return }
  if (!manualUser.value) { uni.showToast({ title: '请选择目标用户', icon: 'none' }); return }
  manualSending.value = true
  const params = {}
  manualFields.value.forEach((f) => { if (manualParams.value[f.key] !== '' && manualParams.value[f.key] !== undefined) params[f.key] = manualParams.value[f.key] })
  try {
    const job = await ssoMsgJobApi.sendNow({ user: manualUser.value.id, scene: 'manual', templateCode: manualTemplate.value.code, params })
    const st = job && job.status
    if (st === 'sent') {
      uni.showToast({ title: '发送成功', icon: 'success' })
    } else {
      const reason = (job && job.result && (job.result.message || job.result.reason || job.result.error)) || st
      uni.showToast({ title: (st === 'quota_limited' ? '频控: ' : '失败: ') + reason, icon: 'none' })
    }
    manualVisible.value = false
    loadData(1)
  } catch (e) {
    uni.showToast({ title: '发送失败', icon: 'none' })
  } finally {
    manualSending.value = false
  }
}
```

- [ ] **Step 4: 新增样式**

在 `<style scoped>` 末尾追加：

```css
.manual-bar { margin-bottom: 20rpx; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; display: inline-block; }
.send-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.send-modal { width: 88%; max-height: 80vh; background: #fff; border-radius: 16rpx; padding: 28rpx; box-sizing: border-box; overflow-y: auto; }
.send-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.send-modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.picker { line-height: 76rpx; }
.user-list { margin-top: 12rpx; border-top: 1rpx solid #f0f0f0; }
.user-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.user-row.active { background: #e6f4ff; }
.user-name { font-size: 26rpx; color: #333; }
.user-id { font-size: 24rpx; color: #999; }
.user-picked { margin-top: 12rpx; font-size: 26rpx; color: #1677ff; }
.send-empty { font-size: 26rpx; color: #999; padding: 20rpx 0; }
.send-footer { display: flex; align-items: center; justify-content: flex-end; gap: 20rpx; margin-top: 24rpx; }
```

- [ ] **Step 5: 校验编译并提交**

```bash
cd E:\code\web
npm run build:h5
git add src/pages/sso/msg-job/list.vue
git commit -m "feat(msg): 消息任务页新增手动发送入口"
```

Expected: 构建成功、提交完成。

---

### Task 6: admin 插件 WebchatTab 加简短配置指引

**Files:**
- Modify: `E:\code\basic\plugins\zhao-sso\admin\src\pages\WebchatTab.tsx:667-678`

- [ ] **Step 1: 在 TemplateSection 标题下加指引段落**

将 [WebchatTab.tsx](file:///e:/code/basic/plugins/zhao-sso/admin/src/pages/WebchatTab.tsx#L667-L678) 中第 667-678 行的标题 + 说明块替换为带分步指引的版本：

```tsx
  return (
    <Box>
      <Typography variant="delta" paddingBottom={3}>
        模板消息配置
      </Typography>
      <Box background="neutral100" borderColor="neutral200" borderRadius={4} padding={4} marginBottom={5}>
        <Typography textColor="neutral600" variant="pi" paddingBottom={2}>
          零基础配置指引（完整步骤请在 <strong>web 运营端 → 消息中心 → 消息模板</strong> 查看并完成）：
        </Typography>
        <ol style={{ margin: 0, paddingLeft: 20, color: "#666", fontSize: 12, lineHeight: 1.9 }}>
          <li>公众号须为<strong>认证服务号</strong>，接收人需已关注。</li>
          <li>登录 <strong>mp.weixin.qq.com</strong> → 广告与服务 → 增值服务 → 模板消息，选取模板并复制<strong>模板 ID</strong>。</li>
          <li>在 OAuth 配置填公众号 <strong>AppID / AppSecret</strong>（见本页上方公众号配置）。</li>
          <li>在 web 运营端「消息模板」新增模板，把 <code>wxTemplateId</code> 填为下方列表中的模板 ID，并在 <code>wxTemplateFields</code> 配置字段映射后，点「发送测试」验证。</li>
        </ol>
      </Box>
      <Typography textColor="neutral600" variant="pi" paddingBottom={4}>
        以下为公众号已添加的模板列表（来自 /v1/admin/wx/templates）。
      </Typography>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : items.length === 0 ? (
        <EmptyStateLayout content="暂无模板数据，或公众号未添加模板" />
      ) : (
        <Box background="neutral0" borderRadius={4} shadow="filterShadow">
          <Table colCount={5} rowCount={items.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">模板 ID</Typography></Th>
                <Th><Typography variant="sigma">标题</Typography></Th>
                <Th><Typography variant="sigma">一级行业</Typography></Th>
                <Th><Typography variant="sigma">二级行业</Typography></Th>
                <Th><Typography variant="sigma">内容</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((t: any, idx: number) => (
                <Tr key={t.template_id ?? t.object_id ?? idx}>
                  <Td><Typography>{templateId(t)}</Typography></Td>
                  <Td><Typography>{t.title || "-"}</Typography></Td>
                  <Td><Typography textColor="neutral600">{t.primary_industry || "-"}</Typography></Td>
                  <Td><Typography textColor="neutral600">{t.deputy_industry || "-"}</Typography></Td>
                  <Td>
                    <Typography textColor="neutral600" variant="pi">
                      {(t.content || "").slice(0, 120)}
                      {(t.content || "").length > 120 ? "..." : ""}
                    </Typography>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
```

注：原有 `Box paddingBottom={4}>` 包裹的旧说明文字（"以下为公众号已添加的模板列表..."）在第二步被保留在下表上方，避免重复。

- [ ] **Step 2: 重建 admin 插件 dist**

```bash
cd E:\code\basic\plugins\zhao-sso
npm run build
```

Expected: 构建完成，`dist/admin` 产物更新（admin bundle 不写独立 dist 文件时以 console 输出为准；如无 admin dist 目录则构建命令仅编译校验，改动随源码生效）。

- [ ] **Step 3: 提交**

```bash
cd E:\code\basic
git add plugins/zhao-sso/admin/src/pages/WebchatTab.tsx plugins/zhao-sso/dist
git commit -m "feat(sso): admin WebchatTab 模板配置加零基础配置指引"
```

---

### Task 7: 本地构建验证 + 收口

**Files:**
- `E:\code\web`（前端）
- `E:\code\basic`（后端 admin 插件）

- [ ] **Step 1: web 前端构建**

```bash
cd E:\code\web
npm run build:h5
```

Expected: 构建成功，无报错。

- [ ] **Step 2: 收口（web 仓库）**

检查 `git status`，确认仅新增/修改目标文件；还原任何 dev 期间被改写的 dist/build（若 web dist 被 dev 改写用 `git restore dist/`，若本项目仅提交源码则跳过）。提交全部累积改动。

```bash
cd E:\code\web
git status --short
```

手动确认无临时文件后提交（若 Task 已各自 commit 则本步为最终 status 确认）。

- [ ] **Step 3: 收口（basic 仓库）**

确认 admin 插件改动已提交，`git status` 干净（除非有历史遗留）。

```bash
cd E:\code\basic
git status --short
git restore dist/ 2>/dev/null || true
```

---

### Task 8: 部署到 joho 服务器（真实微信通道验证）

**说明：** 上传部署是人工/SSH 操作，在执行构建并确认无报错后，由我提示你执行后续 SSH 上传与 PM2 重启。以下为部署清单供执行。

**Files:**
- 本地构建产物：`E:\code\web`（h5 构建物）、`E:\code\basic`（zhao-sso 插件 + admin dist）

- [ ] **Step 1: 提示用户执行部署**

构建与本地验收全部完成后，向用户输出部署清单：
- 后端：`e:\code\basic` 的 zhao-sso 插件源码与 `plugins/zhao-sso/dist` admin 产物同步到 joho 服务器，PM2 重启 Strapi。
- web 前端：`e:\code\web` 的 h5 构建物上传到 joho 服务器 web 目录（h.joho.cn），覆盖后刷新。
- 验证：登录 h.joho.cn → 消息中心 → 消息模板，查看向导；新增/编辑模板点「发送测试」，用已关注测试用户发真实消息，确认微信收到且 msqId 回执正常。

- [ ] **Step 2: 告知真实验证前置条件**

再次确认：公众号为认证服务号、已领取模板 ID、接收用户已关注、服务器 IP 已加微信白名单，否则会返回对应错误码（43101 未关注 / 48001 未认证 / 40164 白名单）。

---

## 自审对照

- **Spec 3.1 向导面板** → Task 1（组件）+ Task 2（list 接入）✓
- **Spec 3.2 编辑页发送测试** → Task 4 + Task 3（用户接口）✓
- **Spec 3.3 任务页手动发送** → Task 5 + Task 3 ✓
- **Spec 3.5 admin 指引** → Task 6 ✓
- **Spec 3.6 部署** → Task 8 ✓
- **Spec 6 验收要点** → Task 7（构建）+ Task 8（真实验证）✓
- **Boundary:** `hasPermission('sso.msg.write')` 门控（Task 4/5）✓
- **Quota 风险:** manual scene 冷却 → 弹窗提示 + `quota_limited` 回执展示 ✓