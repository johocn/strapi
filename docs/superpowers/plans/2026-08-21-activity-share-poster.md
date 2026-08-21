# 活动分享海报 + 裂变 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在活动详情页提供「分享海报」能力：生成带邀请二维码的活动海报图（保存/预览）+ 复用微信 JS-SDK 配置好友/朋友圈分享，新用户扫码打开详情页后自动落入分享者名下，实现裂变闭环。

**Architecture:** 纯前端实现，后端零改动、零新增依赖。新增 `utils/activity-poster.ts` 纯函数负责 canvas 海报绘制；`detail.vue` 增加海报弹层与「分享海报」入口；二维码内容用 `appendInviteCode(location.href, getInviteCode())` 拼出；微信分享复用现有 `setPageShare`。裂变闭环、客户归属完全复用现有 `handleInviteLink` → `bindInviteCodesAfterLogin` → `useInviteCode` 链路。

**Tech Stack:** uni-app H5（shao）、Vue3 `<script setup>` + TS、UQRCode（已有）、canvas 2D。

**前置前提：**
- 现有复用文件（已核实，勿改动）：
  - `utils/invite.ts`：`getInviteCode()`、`appendInviteCode` 由 `getSharePath` 内部逻辑体现；**复用 `getInviteCode()` 即可，链接拼装在本计划内自行实现**（`getSharePath` 目标 `/pages/...`，而海报需当前 `activity/detail` 全 URL，故直接拼，不调 getSharePath）
  - `utils/wx-jssdk.ts`：`setPageShare({ title, desc, imgUrl, pageUrl })`，会自动携带邀请码并接后端签名接口
  - UQRCode 实例化画法见 `detail.vue generateQrcode()`（199-176行）
- 品牌主色渐变：`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`（detail.vue 现有 action-btn.primary）

---

### Task 1: 新增 `utils/activity-poster.ts` 海报绘制纯函数

**Files:**
- Create: `e:\code\shao\utils\activity-poster.ts`
- Modify: `e:\code\shao\utils\index.ts`（导出，若该文件存在则新增一行；不存在则跳过）

本任务只交付**纯绘制函数**，不接触业务，可独立验证。

- [ ] **Step 1: 创建海报绘制模块**

```ts
/**
 * 活动分享海报绘制（纯函数，不耦合 uni 生命周期）
 * 依赖 UQRCode 生成二维码，canvas 2D 绘制布局。
 */
import UQRCode from 'uqrcodejs'

// 设计稿逻辑尺寸（rpx 视觉稿），实际按 scale 放大输出保证清晰
const DESIGN_W = 750
const DESIGN_H = 1200

// 品牌渐变
const GRAD_START = '#667eea'
const GRAD_END = '#764ba2'

export interface PosterActivity {
  title: string
  startTime?: string
  endTime?: string
  venueName?: string
  tailText?: string
}

/** 生成一张二维码的 dataURL（复用 UQRCode 内存 canvas 画法） */
export function qrcodeDataURL(text: string, size = 320, color = '#000000', bg = '#ffffff'): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const qr = new UQRCode()
  qr.data = text
  qr.size = size
  qr.make()

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  const drawModules = qr.getDrawModules() as Array<{
    type: string
    x: number
    y: number
    width: number
    height: number
    color?: string
  }>
  for (let i = 0; i < drawModules.length; i++) {
    const m = drawModules[i]
    if (m.type === 'tile') {
      ctx.fillStyle = m.color ?? color
      ctx.fillRect(m.x, m.y, m.width, m.height)
    }
  }
  return canvas.toDataURL('image/png')
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

/**
 * 在给定 canvas 上绘制活动海报。
 * @param canvas 目标 canvas（尺寸建议 width=1500,height=2400，即设计稿×2）
 * @param activity 活动信息
 * @param shareUrl 二维码内容（已含 inviteCode）
 * @param decoderHref 可选，H5 端图片跨域时设置 `canvas`；本实现无需
 */
export function drawActivityPoster(
  canvas: HTMLCanvasElement,
  activity: PosterActivity,
  shareUrl: string
): void {
  const W = canvas.width
  const H = canvas.height
  const scale = W / DESIGN_W // 设计稿到实际像素的比例（应≈2）
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 统一坐标系：按设计稿 750×1200 定位，实际乘 scale
  const x = (v: number) => v * scale
  const y = (v: number) => v * scale
  const fs = (px: number) => px * scale

  ctx.clearRect(0, 0, W, H)

  // 背景渐变（品牌垂直渐变）
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, GRAD_START)
  grad.addColorStop(1, GRAD_END)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // 顶部品牌落款
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `bold ${fs(28)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('胜林在线 · 线下活动', W / 2, y(70))

  // 中部活动标题（自动换行，最多 2 行）
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${fs(46)}px sans-serif`
  const title = activity.title || '线下活动'
  const maxWidth = DESIGN_W - 120 // 左右各 60
  const lines = wrapText(ctx, title, x(maxWidth))
  for (let i = 0; i < lines.length && i < 2; i++) {
    ctx.fillText(lines[i], W / 2, y(220) + i * fs(60))
  }

  // 时间行
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `${fs(32)}px sans-serif`
  const timeText = formatTime(activity.startTime) && activity.startTime === activity.endTime
    ? formatTime(activity.startTime)
    : `${formatTime(activity.startTime)} ~ ${formatTime(activity.endTime)}`
  ctx.fillText(timeText, W / 2, y(360))

  // 场地行
  if (activity.venueName) {
    const venue = activity.venueName || '待定场地'
    ctx.fillText(venue, W / 2, y(420))
  }

  // 二维码（白色底卡片 + 稍大二维码）
  const qrSize = 400
  const qrX = (DESIGN_W - qrSize) / 2
  const qrY = 480
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, x(qrX), y(qrY), x(qrSize), x(qrSize), x(24))
  ctx.fill()
  const qrImg = qrcodeDataURL(shareUrl, 400)
  if (qrImg) {
    const img = new Image()
    img.onload = () => {
      const pad = 30 // 白色内边距，二维码比卡片小一点
      ctx.drawImage(img, x(qrX + pad), y(qrY + pad), x(qrSize - pad * 2), x(qrSize - pad * 2))
    }
    img.src = qrImg
  }

  // 底部推荐语
  const tail = activity.tailText || '扫码报名，一起参加！'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = `${fs(30)}px sans-serif`
  ctx.fillText(tail, W / 2, y(1060))
}

/** 文本自动换行，返回不超过 maxWidth 的行数组 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = Array.from(text)
  const lines: string[] = []
  let line = ''
  for (let i = 0; i < chars.length; i++) {
    if (ctx.measureText(line + chars[i]).width > maxWidth) {
      lines.push(line)
      line = chars[i]
    } else {
      line += chars[i]
    }
  }
  if (line) lines.push(line)
  return lines
}

/** 圆角矩形路径 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath()
  ctx.moveTo(x0 + r, y0)
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r)
  ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r)
  ctx.arcTo(x0, y0 + h, x0, y0, r)
  ctx.arcTo(x0, y0, x0 + w, y0, r)
  ctx.closePath()
}
```

- [ ] **Step 2: 编译校验**

本模块用到 `document`、`Image`、`HTMLCanvasElement` 等 DOM 类型。检查 `e:\code\shao` 是否配置 `"dom"` lib（`tsconfig.json` 的 `compilerOptions.lib`）。

```bash
cd e:\code\shao && npx vue-tsc --noEmit utils/activity-poster.ts
```

Expected: 若报 `Cannot find name 'document'/'Image'`，则 `utils` 下其他文件（如 `wx-jssdk.ts` 大量用 `window`）已配置 dom env，若有同类问题给出报错并修复 tsconfig 的 `lib: ["esnext", "dom"]`（须与既有配置一致，勿破坏项目）。

若 `npx vue-tsc` 非本仓命令，退而以项目 `npm run type-check`（若存在）或 `npm run build:h5` 的编译报错来校验。

- [ ] **Step 3: 提交**

```bash
git -C e:\code\shao add utils/activity-poster.ts
git -C e:\code\shao commit -m "feat: 新增活动海报绘制纯函数 activity-poster"
```

---

### Task 2: `detail.vue` 增加「分享海报」入口与海报弹层

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`

在活动卡片后、操作区之前插入海报分享入口；在页面底部新增弹层。

- [ ] **Step 1: 模板加「分享海报」入口**

在 `</view>` 活动卡片（第 29 行 `<view v-if="activity.description"...>` 之后的卡片外、第 31 行到场二维码之前）后新增入口。实际插在「活动介绍」卡片之后、到场二维码卡片之前：

```html
      <!-- 分享海报入口 -->
      <view class="share-entry" @click="showPoster">
        <text class="share-entry-text">📤</text>
        <text>分享海报</text>
      </view>
```

- [ ] **Step 2: 模板加海报弹层**（放在 `</view>` 活动容器之后、`loading-state` 之前，第 63 行前）

```html
    <!-- 分享海报弹层 -->
    <view v-if="posterVisible" class="poster-mask" @click="posterVisible = false">
      <view class="poster-modal" @click.stop>
        <text class="poster-title">活动分享海报</text>
        <image v-if="posterImage" :src="posterImage" class="poster-img" mode="widthFix" />
        <view v-else class="poster-img-placeholder"><text>海报生成中...</text></view>

        <view class="poster-actions">
          <view class="poster-btn primary" @click="savePoster"><text>保存到相册</text></view>
          <view class="poster-btn ghost" @click="wxShare"><text>微信分享</text></view>
        </view>
        <view class="poster-actions">
          <view class="poster-btn plain" @click="posterVisible = false"><text>关闭</text></view>
        </view>
      </view>
    </view>
```

- [ ] **Step 3: script 加 state 与 handlers**

在 `qrcodeUrl` 声明后新增：

```ts
import { drawActivityPoster, qrcodeDataURL } from '../../utils/activity-poster'
import { getInviteCode } from '../../utils/invite'
import { setPageShare } from '../../utils/wx-jssdk'
```

在 script 函数区新增：

```ts
const posterVisible = ref(false)
const posterImage = ref('')

/** 当前详情页完整 URL + 邀请码（H5 才可用，二维码/分享链接共用） */
function buildShareUrl(): string {
  // #ifdef H5
  const base = window.location.href.split('#')[0]
  const invite = getInviteCode()
  const sep = '?'
  return `${base}${sep}inviteCode=${encodeURIComponent(invite)}`
  // #endif
  // #ifndef H5
  return ''
  // #endif
}

/** 打开海报弹层并绘制 */
async function showPoster() {
  const shareUrl = buildShareUrl()
  if (!shareUrl) {
    uni.showToast({ title: '请在H5端使用海报功能', icon: 'none' })
    return
  }
  posterVisible.value = true
  posterImage.value = '' // 先清空，等绘制完成赋值
  await nextTick()
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1500
    canvas.height = 2400
    drawActivityPoster(canvas, activity.value, shareUrl)
    // 二维码是异步 onload 绘制，稍等再导出
    setTimeout(() => {
      posterImage.value = canvas.toDataURL('image/png')
    }, 200)
  } catch (e) {
    console.error('海报生成失败', e)
    uni.showToast({ title: '海报生成失败', icon: 'none' })
  }
}

/** 保存海报至相册（H5 走 <a download>） */
function savePoster() {
  if (!posterImage.value) {
    uni.showToast({ title: '海报尚未生成', icon: 'none' })
    return
  }
  // #ifdef H5
  const a = document.createElement('a')
  a.href = posterImage.value
  a.download = `活动海报_${activity.value?.title ?? 'share'}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  uni.showToast({ title: '海报已保存/请查看浏览器下载', icon: 'none' })
  // #endif
  // #ifndef H5
  uni.saveImageToPhotosAlbum({
    filePath: posterImage.value,
    success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
    fail: () => uni.showToast({ title: '保存失败', icon: 'none' }),
  })
  // #endif
}

/** 微信分享：复用现有 setPageShare 配置好友+朋友圈 */
function wxShare() {
  const act = activity.value
  if (!act) return
  setPageShare({
    title: act.title,
    desc: (act.venueName ? `地点：${act.venueName} · ` : '') + '扫码报名！',
    imgUrl: posterImage.value || undefined,
    pageUrl: buildShareUrl(),
  })
  uni.showToast({ title: '微信分享已配置，请在右上角「...」转发', icon: 'none' })
}
```

- [ ] **Step 4: style 加海报样式**

在 `<style>` 末尾追加：

```scss
.share-entry {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 16rpx;
  padding: 26rpx 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 500;
}
.share-entry-text { font-size: 34rpx; }

.poster-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}
.poster-modal {
  width: 100%;
  max-width: 620rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  text-align: center;
}
.poster-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}
.poster-img {
  width: 100%;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}
.poster-img-placeholder {
  height: 300rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 26rpx;
  width: 100%;
  background: #fafafa;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}
.poster-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}
.poster-btn {
  flex: 1;
  text-align: center;
  padding: 22rpx;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 500;

  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }
  &.ghost {
    background: #fff;
    color: #667eea;
    border: 2rpx solid #667eea;
  }
  &.plain {
    background: #f5f5f5;
    color: #666;
  }
}
```

- [ ] **Step 5: 编译校验**

```bash
cd e:\code\shao && npx vue-tsc --noEmit pages/activity/detail.vue
```

Expected: 无 TS 报错（或与改动前一致的既有错误）。`activity.value` 可能为 `ref(null)` 类型导致 `title` 访问报错，需要用已有的 `activity.value?.title` 写法（本实现已用可选链）。若仍报 `possibly null`，保持与文件其余部分一致的访问方式。

- [ ] **Step 6: 提交**

```bash
git -C e:\code\shao add pages/activity/detail.vue
git -C e:\code\shao commit -m "feat: 活动详情页增加分享海报入口与弹层"
```

---

### Task 3: 编译校验 + 清理

- [ ] **Step 1: 全仓 H5 构建校验（关键，确保没破坏现有 build）**

```bash
cd e:\code\shao && npm run build:h5
```

Expected: 构建成功，`dist/build/h5` 产物生成。若构建脚本名不同，用 `package.json` 中实际的 H5 构建命令。

- [ ] **Step 2: 核查未引入无关改动**

```bash
git -C e:\code\shao status --short
```

Expected: 仅出现 `utils/activity-poster.ts`、`pages/activity/detail.vue` 两项改动。若有其他无关改动（如 dist 构建 churn），`git restore dist/` 还原。

- [ ] **Step 3: 提交构建说明（如 dist 属仓库约定则提交，否则还原）**

按记忆「阶段三」仓库约定：web/shao 是 HBuilder 构建产物静态部署，dist 可能需提交。确认现有策略后处理：

```bash
# 若 dist 需提交（和既往提交习惯一致）
git -C e:\code\shao add dist/ utils/activity-poster.ts pages/activity/detail.vue
git -C e:\code\shao commit -m "feat: 活动分享海报（构建产物）"
```

若既往不提交 dist 则跳过本步（还原 dist）。

---

### Task 4: 验收 + 收口

- [ ] **Step 1: 逻辑核对（零后端改动验证）**

逐一确认：
1. `buildShareUrl()` 产出 `window.location.href(去#) + ?inviteCode=SLxxxx` ✓
2. 海报二维码内容 = buildShareUrl（含邀请码），扫码新用户进详情页 URL 带 `inviteCode` ✓
3. `handleInviteLink()`（invite.ts 已存在）会自动 `storeInviteCode` 该码 ✓
4. 登录/注册后 `bindInviteCodesAfterLogin()` → `useInviteCode` → sso 客户归属（复用既有，无需改）✓
5. `setPageShare` 自动带 inviteCode + inviterId（wx-jssdk.ts 内部实现）✓

- [ ] **Step 2: 手动验收（H5 浏览器）**

启动 dev（或打开 `dist/build/h5`）进入任一活动详情页 → 点「分享海报」：
- 弹层出现、海报图渲染（含品牌渐变底、标题、时间、场地、二维码、底部推荐语）
- 海报二维码扫码内容含 `?inviteCode=`（可用扫码工具/控制台确认 shareUrl）
- 「保存到相册」触发浏览器下载 PNG
- 「微信分享」调 `setPageShare`（控制台无报错，右上角分享配置生效，真域名时发起 JSSDK 签名，本地 mock 预埋）

- [ ] **Step 3: 三仓库收口（仅 shao 有改动，basic/web 无）**

```bash
git -C e:\code\shao push
git -C e:\code\shao log --oneline -5
```

确认已推送。basic/web 无本次改动，无需操作。

- [ ] **Step 4: 记忆更新**

在 `project_memory.md` 追加「阶段十一 活动分享海报 + 裂变」条目：落地（utils/activity-poster.ts + detail.vue 海报弹层 + 复用 setPageShare/二维码/邀请码，后端零改动）、复盘（1 问题 + 1 改进）、技术教训。
```
```