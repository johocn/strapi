# 阶段 B：活动后「资料/回放下载」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为线下活动增加回放 URL 与资料附件（assets），C 端活动详情页展示「回放/资料」区段，参与者可查看回放（外联跳转）并下载资料，承接活动后的沉淀内容分发。

**Architecture:** 后端在 `zhao-point` 的 `activity` content-type 增加 `assets`(json) 字段，契约结构固定为 `{ recordingUrl: string, materials: [{ name, url }] }`。公开 `GET /activities/:documentId`（`detail`）已 `populate:"*"`，直接返回该字段，无需后端其他改动（仅 schema 字段）。web 活动表单加 assets 录入与回显；shao 活动详情页渲染「回放/资料」区段。URL 走既有通道，不引入新依赖（媒体类用现有 `buildStreamSrc` 鉴权代理，外链直通）。

**Tech Stack:** Strapi v5 (documents query)、uni-app (shao)、uni-app admin (web)。

**文件结构：**
- `basic/plugins/zhao-point/server/src/content-types/activity/schema.json` — 加 assets 字段 + 重建插件
- `web/src/pages/activity/form.vue` — 录入/回显 assets
- `shao/services/api.ts` — 复用 getActivityDetail（已有返回），无需新增
- `shao/pages/activity/detail.vue` — 「回放/资料」区段

---

### Task 1: 后端 activity schema 增加 assets 字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`

- [ ] **Step 1: 追加 assets 字段**

在 `activity/schema.json` 的 `"tags": { "type": "json" },`（阶段 A 已加）之后追加：

```json
    "assets": { "type": "json" },
```

契约结构（前后端照用）：`{ recordingUrl?: string, materials?: Array<{ name: string, url: string }> }`，缺省为 null。不做服务端强校验，web 表单与 shao 端按此结构读写。

- [ ] **Step 2: 重建插件 dist 使新字段生效**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: 构建成功（types dts 报错若属既有存量可忽略）。

- [ ] **Step 3: 提交（源码 + 插件 dist）**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/dist
git -C e:\code\basic commit -m "feat(zhao-point): activity 增加 assets 字段(回放/资料)"
```

> 说明：公开 `detail` 控制器已 `populate:"*"`，assets 属标量 json 字段无需 populate 配置即可随文档返回，本阶段后端无其他改动。

---

### Task 2: web 活动表单录入/回显 assets

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`

- [ ] **Step 1: form reactive 增加 assets**

在 `form.vue` reactive 对象中（`tags: [],` 之后）追加：

```ts
  assets: { recordingUrl: '', materials: [] },
```

- [ ] **Step 2: loadDetail 回显 assets**

在 `loadDetail` 的 `Object.assign(form, data, {` 内（`tags: ...` 之后）追加：

```ts
      assets: (data.assets && typeof data.assets === 'object') ? {
        recordingUrl: data.assets.recordingUrl || '',
        materials: Array.isArray(data.assets.materials) ? data.assets.materials : [],
      } : { recordingUrl: '', materials: [] },
```

- [ ] **Step 3: submitData 增加 assets（仅在非空时提交）**

在 `handleSubmit` 的 `const submitData = {` 内（`tags: ...` 之后）追加：

```ts
    assets: (form.assets?.recordingUrl || (form.assets?.materials && form.assets.materials.length))
      ? {
        recordingUrl: form.assets?.recordingUrl || undefined,
        materials: Array.isArray(form.assets?.materials) ? form.assets.materials.filter(m => m?.name && m?.url) : undefined,
      }
      : undefined,
```

- [ ] **Step 4: 模板「基本信息」区新增「回放/资料」录入**

在 `form.vue` 模板中，`description` 输入之后（或分类输入之后）插入「回放与资料」录入区（用既有 form-item/label 样式包裹）：

```html
          <view class="section-title">回放与资料</view>
          <input type="text" v-model="form.assets.recordingUrl" placeholder="回放视频链接(URL)" class="form-input" />
          <view v-for="(m, i) in form.assets.materials" :key="i" class="form-row">
            <input type="text" v-model="m.name" placeholder="资料名称" class="form-input form-inline" />
            <input type="text" v-model="m.url" placeholder="资料URL" class="form-input form-inline" />
            <view class="link-del" @click="removeMaterial(i)">删除</view>
          </view>
          <view class="link-add" @click="addMaterial">+ 添加资料</view>
```

- [ ] **Step 5: script 增加 addMaterial/removeMaterial 方法**

```ts
function addMaterial() {
  if (!form.assets.materials) form.assets.materials = []
  form.assets.materials.push({ name: '', url: '' })
}
function removeMaterial(i: number) {
  form.assets.materials.splice(i, 1)
}
```

（`form-inline`/`form-row`/`link-del`/`link-add` 样式复用项目既有通用样式，若不存在则在 style 中补最小样式：`form-row{display:flex;gap:12rpx;align-items:center}`、`form-inline{flex:1}`、`link-del{color:#ff4d4f;font-size:26rpx;padding:0 8rpx}`、`link-add{color:#667eea;font-size:28rpx;margin-top:16rpx;text-align:center}`。）

- [ ] **Step 6: 构建 h5 产物并提交**

Run: `cd e:\code\web && npm run build:h5`
Expected: 成功。
```bash
git -C e:\code\web add src/pages/activity/form.vue
git -C e:\code\web commit -m "feat(web): 活动表单支持回放/资料assets录入"
git -C e:\code\web push
```

---

### Task 3: shao 活动详情页「回放/资料」区段

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`

- [ ] **Step 1: 模板新增回放/资料区段**

在 `e:\code\shao\pages\activity\detail.vue` 中，`<view v-if="activity.description" class="desc">...` 区块之后、分享海报入口之前插入：

```html
      <!-- 回放与资料（活动结束后的沉淀内容） -->
      <view v-if="hasAssets" class="card assets-card">
        <text class="assets-title">回放与资料</text>
        <view v-if="assets.recordingUrl" class="assets-item" @click="openRecording">
          <text class="assets-icon">▶</text>
          <text class="assets-name">活动回放</text>
          <text class="assets-arrow">›</text>
        </view>
        <view
          v-for="m in assets.materials"
          :key="m.name + m.url"
          class="assets-item"
          @click="openMaterial(m)"
        >
          <text class="assets-icon">📄</text>
          <text class="assets-name">{{ m.name }}</text>
          <text class="assets-arrow">›</text>
        </view>
      </view>
```

- [ ] **Step 2: script 增加 assets 逻辑**

在 `<script setup>` 中（`seriesInfo` computed 之后）追加：

```ts
/** 回放/资料 assets（后端 detail 返回的 { recordingUrl, materials }） */
const assets = computed(() => {
  const a = activity.value?.assets
  if (!a || typeof a !== 'object') return { recordingUrl: '', materials: [] }
  return {
    recordingUrl: a.recordingUrl || '',
    materials: Array.isArray(a.materials) ? a.materials : [],
  }
})
const hasAssets = computed(() => Boolean(assets.value.recordingUrl || assets.value.materials.length))

function openUrl(url: string) {
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.showToast({ title: '请在网页端打开', icon: 'none' })
  // #endif
}

function openRecording() {
  if (!assets.value.recordingUrl) return
  openUrl(assets.value.recordingUrl)
}
function openMaterial(m: { name: string; url: string }) {
  if (m?.url) openUrl(m.url)
}
```

> 注：H5 用 `window.open` 外链打开；非 H5（小程序/App）端因无 webview 承载页，直接 showToast「请在网页端打开」，不新增 webview 页面依赖（遵循最小依赖约定）。已确认 `pages.json` 未注册 `pages/webview/webview`，故采用回退方案。

- [ ] **Step 3: 追加样式**

在 `<style lang="scss" scoped>` 中追加：

```scss
.assets-card { padding: 30rpx; }
.assets-title { display: block; font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; }
.assets-item {
  display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
}
.assets-icon { font-size: 30rpx; color: #667eea; }
.assets-name { flex: 1; font-size: 28rpx; color: #333; }
.assets-arrow { font-size: 28rpx; color: #ccc; }
```

- [ ] **Step 4: 构建 h5 并提交**

Run: `cd e:\code\shao && npm run build:h5`
Expected: 成功。
```bash
git -C e:\code\shao add src/pages/activity/detail.vue dist/build/h5
git -C e:\code\shao commit -m "feat(shao): 活动详情回放/资料区段+dist重建"
git -C e:\code\shao push
```

> 注：shao 仓库若实际路径无 `src/` 前缀（services/pages），按实际 git 跟踪路径提交。

---

### Task 4: 端到端验收 + 三仓库收口

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-assets.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-activity-assets.cjs`，复用既有 accept 脚本的 http/req/ok/qa 封装与 `PREFIX='aa_'`。覆盖：
1. 直插 `activities` 表建 1 个活动 A（status='ended'，`assets` 列写入 JSON `{"recordingUrl":"https://example.com/r.mp4","materials":[{"name":"课件","url":"https://example.com/slides.pdf"}]}`，title 含 PREFIX）。注意 `assets` 为 json 列，INSERT 时传字符串化 JSON 或按 pg 列类型处理（jsonb 传 JSON 字符串）。
2. `GET /zhao-point/v1/activities/<A 的 documentId>` → `data.assets.recordingUrl` 正确、`data.assets.materials` 长度 1 且 name/url 正确。
3. 再建活动 B（status='signup_open'，assets 留 NULL）→ detail 返回 `assets` 为 null（或字段缺省处理），断言不因 null 报错。
4. 清理：DELETE activities WHERE title LIKE 'aa_%'（含关系 lnk 若活动表有关联），断言残留 0。
沿用 `scripts/accept-*.cjs` 的 ok/qa/subIds 封装，全部断言通过退出 0。

- [ ] **Step 2: 运行验收脚本**

启动本地 dev（若 1337 未启动，先按项目记忆启动；如遇 PostgreSQL 白名单/端口等无法启动，停下来报告原因，不要盲目重试多次），等待 `/zhao-point/v1/activities` 200。
Run: `cd e:\code\basic && node scripts/accept-activity-assets.cjs`
Expected: 全部 PASS，退出码 0，清理零残留。

- [ ] **Step 3: 三仓库收口**

- basic：完成 commit（源码 + 插件 dist + 验收脚本 + plan 文档），`git restore dist/`（根 app，pathspec 不匹配 plugins/*/dist），`git push origin`。
- web：确认工作区 src + `dist/build/h5` 变更，提交 `git push origin`（web 分支 main）。
- shao：提交 src + `dist/build/h5`，`git push origin`。
- 收口前停 dev、`git restore dist/`（basic 根 app）、清理临时诊断脚本。三仓库最终 `git status --short` 干净。

---

## Self-Review

**Spec 覆盖：**
- 后端 assets 字段：Task 1 ✓（契约 `{recordingUrl, materials[{name,url}]}`）
- detail 返回（populate:"*" 已覆盖）：Task 1 说明 ✓
- web 表单录入+回显：Task 2 ✓
- shao 详情「回放/资料」区段：Task 3 ✓
- 验收：Task 4 ✓

**占位扫描：** 无 TBD/TODO；Task 3 Step 2 对 webview 路由做了「先 Grep 确认、未注册用回退」的明确处理，非空占位。

**类型一致性：** `assets`、`recordingUrl`、`materials`、`name`/`url` 全链路命名一致；`hasAssets`/`openRecording`/`openMaterial`/`openUrl` 引用一致；web `addMaterial`/`removeMaterial` 与模板 v-for 绑定一致。