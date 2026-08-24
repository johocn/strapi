# 活动报名奖励「附加条件」模型细化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将活动报名奖励的解锁判定统一为「附加条件 condition（无条件/微信授权/留联系方式/回答调查问卷）」模型，并在 web 管理端提供 rewardConfig 配置 UI。

**Architecture:** 后端 `zhao-point` 的 `isRewardUnlocked` 由 `loginRequired(bool)+channel(string)` 改为按 `condition` 枚举判定（含旧字段归一化）；C 端 `shao/pages/activity/detail.vue` 解锁过滤同步改 `condition`；web 运营端 `web/src/pages/activity/form.vue` 新增「报名奖励配置」区块。不新增 content-type，不新增 dependencies。

**Tech Stack:** Strapi 5（zhao-point 插件）、uni-app（shao C 端 / web 运营端）、Node acceptance script（pg 直连 + REST）。

**Spec:** `basic/docs/superpowers/specs/2026-08-23-activity-register-reward-design.md`

---

### Task 1: 后端解锁判定改为 condition（zhao-point）

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/activity.ts:17-23`

- [ ] **Step 1: 替换解锁判定 helper**

将现有 `isRewardUnlocked`（第 17-23 行）替换为下方代码（新增 `resolveCondition` 归一化 + 按 condition 判定）：

```ts
/** 归一化奖励附加条件：优先 condition；兼容旧 loginRequired/channel */
function resolveCondition(r: any): string {
  if (r?.condition) return r.condition;
  if (r?.loginRequired) return "wechat_auth";
  if (r?.channel) return r.channel; // contact | survey
  return "none";
}

/** 奖励解锁判定：按附加条件 condition 判定；none=恒真, wechat_auth=loginAuth, contact/survey=对应通道已填 */
function isRewardUnlocked(r: any, loginAuth: boolean, channels: Record<string, boolean>): boolean {
  if (!r || typeof r !== "object") return false;
  const c = resolveCondition(r);
  if (c === "wechat_auth") return loginAuth;
  if (c === "contact" || c === "survey") return !!channels[c];
  return true; // none / 未识别视为无条件
}
```

- [ ] **Step 2: 核对 signup 中解锁判定的调用点无需改动**

`signup` 内（第 224-244 行）已通过 `rewardConfig.infoChannels` 填充 `channels[contact/survey]`，`isRewardUnlocked(r, loginAuth, channels)` 调用方式不变，`autoChosen`/`multiIds`/`chosenRewards` 逻辑均兼容 `condition`。无需改动。

- [ ] **Step 3: 重建插件 dist**

```bash
cd e:/code/basic/plugins/zhao-point && npm run build
```

Expected: 编译成功，`dist/server/services/activity.js` 已更新。

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic && git add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist && git commit -m "feat(zhao-point): 活动奖励解锁判定改为 condition 附加条件模型"
```

---

### Task 2: C 端解锁过滤改 condition（shao detail.vue）

**Files:**
- Modify: `shao/pages/activity/detail.vue:356-364`

- [ ] **Step 1: 替换 unlockedRewards 过滤逻辑**

将现有 `unlockedRewards` computed（第 356-364 行，使用 `r.loginRequired` + `r.channel`）替换为：

```ts
/** 当前用户已解锁的奖励（按附加条件 condition + loginAuth + 已填信息通道过滤） */
const unlockedRewards = computed(() => {
  const rewards = Array.isArray(rewardCfg.value?.rewards) ? rewardCfg.value.rewards : []
  return rewards.filter((r: any) => {
    if (!r?.id) return false
    // 附加条件归一化：condition 优先，兼容旧 loginRequired/channel
    const c = r.condition || (r.loginRequired ? 'wechat_auth' : (r.channel || 'none'))
    if (c === 'wechat_auth') return loginAuth.value
    if (c === 'contact' || c === 'survey') return channelFilledValue(c)
    return true // none 无条件
  })
})
```

- [ ] **Step 2: 核对其余引用**

`channelFilledValue(channel)`（第 368-375 行）与 `nextInfoStep`（第 408-413 行）已按 channel 判定，无需改动。`guideStep` 的 `login`/`info`/`reward`/`confirm` 四步流程不变，静默用户因 `loginAuth=false` 且无通道填写，仅 `condition=none` 奖励可见。

- [ ] **Step 3: 构建 C 端产物并提交**

```bash
cd e:/code/shao && npm run build:h5
```

Expected: `unpackage/dist/build/h5` 更新。随后：

```bash
cd e:/code/shao && git add pages/activity/detail.vue unpackage/dist/build/h5 && git commit -m "feat(shao): 活动奖励解锁过滤改为 condition 附加条件模型"
```

---

### Task 3: web 管理端新增「报名奖励配置」区块（form.vue）

**Files:**
- Modify: `web/src/pages/activity/form.vue`

- [ ] **Step 1: 新增 import**

在第 565 行 `import { getLessonList } from '../../api/course.js'` 处，改为同时引入课程列表：

```js
import { getLessonList, getCourseList } from '../../api/course.js'
```

- [ ] **Step 2: form reactive 增加 rewardConfig 字段**

在第 656 行 `learningPackageLessons: []` 之后追加：

```js
  rewardConfig: null,
```

- [ ] **Step 3: 模板新增「报名奖励配置」区块**

在第 460 行（内容解锁区块 `</view>`）之后、第 462 行「核销与会场定位」之前，插入：

```html
      <view class="form-section">
        <view class="section-title">报名奖励配置</view>
        <view class="form-tip">报名成功后自动发放/解锁奖励；每项奖励可配「附加条件」与「发放方式」，客户可全选或任选权益</view>

        <view class="fee-block">
          <view class="fee-block-header">
            <text class="fee-block-title">奖励开关</text>
          </view>
          <view class="form-item">
            <text class="form-label">启用报名奖励</text>
            <switch :checked="!!form.rewardConfig?.loginEnabled" @change="toggleRewardEnabled" />
          </view>
        </view>

        <template v-if="form.rewardConfig?.loginEnabled">
          <view class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">信息解锁通道</text>
              <text class="fee-block-hint">勾选后，对应表单字段将作为奖励「附加条件」的判定依据</text>
            </view>
            <view class="form-row">
              <view class="form-item half">
                <text class="form-label">留联系方式</text>
                <switch :checked="hasInfoChannel('contact')" @change="toggleInfoChannel('contact')" />
              </view>
              <view class="form-item half">
                <text class="form-label">回答调查问卷</text>
                <switch :checked="hasInfoChannel('survey')" @change="toggleInfoChannel('survey')" />
              </view>
            </view>
          </view>

          <view class="fee-block">
            <view class="fee-block-header">
              <text class="fee-block-title">奖励列表</text>
              <text class="fee-block-hint">基础自动（不进入客户勾选菜单）｜客户自选（全选/任选）</text>
            </view>
            <view v-for="(rw, ri) in form.rewardConfig.rewards" :key="ri" class="reward-block">
              <view class="fee-block-header">
                <text class="fee-block-title">奖励 {{ ri + 1 }} · {{ rewardTypeName(rw.type) }}</text>
                <view class="reward-ops">
                  <text class="btn-link" @click="moveReward(ri, -1)">↑</text>
                  <text class="btn-link" @click="moveReward(ri, 1)">↓</text>
                  <text class="btn-link-danger" @click="removeReward(ri)">删除</text>
                </view>
              </view>
              <view class="form-row">
                <view class="form-item half">
                  <text class="form-label">名称</text>
                  <input v-model="rw.name" class="form-input" placeholder="如 报名积分" />
                </view>
                <view class="form-item half">
                  <text class="form-label">类型</text>
                  <picker mode="selector" :range="rewardTypeLabels" :value="rewardTypeIndex(rw.type)" @change="e => rw.type = rewardTypeValues[Number(e.detail.value)] || 'points'">
                    <view class="picker-value"><text>{{ rewardTypeName(rw.type) }}</text><text class="picker-arrow">▼</text></view>
                  </picker>
                </view>
              </view>
              <view class="form-row">
                <view class="form-item half">
                  <text class="form-label">发放方式</text>
                  <picker mode="selector" :range="['基础自动', '客户自选']" :value="rw.mode === 'multi' ? 1 : 0" @change="e => rw.mode = Number(e.detail.value) === 1 ? 'multi' : 'single'">
                    <view class="picker-value"><text>{{ rw.mode === 'multi' ? '客户自选' : '基础自动' }}</text><text class="picker-arrow">▼</text></view>
                  </picker>
                </view>
                <view class="form-item half">
                  <text class="form-label">附加条件</text>
                  <picker mode="selector" :range="conditionLabels" :value="conditionIndex(rw.condition)" @change="e => rw.condition = conditionValues[Number(e.detail.value)]">
                    <view class="picker-value"><text>{{ conditionLabel(rw.condition) }}</text><text class="picker-arrow">▼</text></view>
                  </picker>
                </view>
              </view>

              <view v-if="rw.type === 'points'" class="form-item">
                <text class="form-label">积分数量</text>
                <input type="number" v-model="rw.amount" class="form-input" placeholder="如 50" />
              </view>

              <view v-else-if="rw.type === 'course_trial'" class="form-item">
                <text class="form-label">试听课程</text>
                <view v-if="rw.courseTitle" class="rel-chip">
                  <text class="rel-chip-name">{{ rw.courseTitle }}</text>
                  <text class="rel-chip-del" @click="rw.courseId = undefined; rw.courseTitle = ''">✕</text>
                </view>
                <view v-else class="link-add" @click="pickCourse(ri)">+ 选择课程</view>
              </view>

              <view v-else-if="rw.type === 'course_outline'" class="form-item">
                <text class="form-label">资料类型</text>
                <picker mode="selector" :range="outlineKindLabels" :value="outlineKindIndex(rw.kind)" @change="e => rw.kind = outlineKindValues[Number(e.detail.value)]">
                  <view class="picker-value"><text>{{ outlineKindLabel(rw.kind) }}</text><text class="picker-arrow">▼</text></view>
                </picker>
                <view v-if="rw.kind === 'article'" class="form-item-inner">
                  <view v-if="rw.articleTitle" class="rel-chip">
                    <text class="rel-chip-name">{{ rw.articleTitle }}</text>
                    <text class="rel-chip-del" @click="rw.articleId = undefined; rw.articleTitle = ''">✕</text>
                  </view>
                  <view v-else class="link-add" @click="pickArticle(ri)">+ 选择文章</view>
                </view>
                <view v-else-if="rw.kind === 'file'" class="form-item-inner">
                  <input v-model="rw.link" class="form-input" placeholder="资料下载链接" />
                </view>
                <view v-else-if="rw.kind === 'lesson'" class="form-item-inner">
                  <view v-if="rw.lessonTitle" class="rel-chip">
                    <text class="rel-chip-name">{{ rw.lessonTitle }}</text>
                    <text class="rel-chip-del" @click="rw.lessonId = undefined; rw.lessonTitle = ''">✕</text>
                  </view>
                  <view v-else class="link-add" @click="pickLesson(ri)">+ 选择课时</view>
                </view>
              </view>

              <view v-else-if="rw.type === 'coupon'" class="form-row">
                <view class="form-item half">
                  <text class="form-label">优惠券 ID</text>
                  <input type="number" v-model="rw.couponId" class="form-input" placeholder="zhao-deal 优惠券 id" />
                </view>
                <view class="form-item half">
                  <text class="form-label">优惠券名称</text>
                  <input v-model="rw.couponName" class="form-input" placeholder="如 满100减20" />
                </view>
              </view>
            </view>
            <view class="link-add" @click="addReward">+ 添加奖励</view>
          </view>
        </template>
      </view>
```

- [ ] **Step 4: script 新增奖励配置逻辑**

在 `normRel`/`relIds` 定义（第 1053-1059 行）之后追加：

```js
// ---- 报名奖励配置 ----
const rewardTypeLabels = ['积分', '课程权益', '资料与文章', '优惠券']
const rewardTypeValues = ['points', 'course_trial', 'course_outline', 'coupon']
const conditionLabels = ['无条件', '微信授权登录', '留联系方式', '回答调查问卷']
const conditionValues = ['none', 'wechat_auth', 'contact', 'survey']
const outlineKindLabels = ['文章', '文件链接', '课时']
const outlineKindValues = ['article', 'file', 'lesson']

function rewardTypeName(t) { const i = rewardTypeValues.indexOf(t); return i >= 0 ? rewardTypeLabels[i] : rewardTypeLabels[0] }
function rewardTypeIndex(t) { const i = rewardTypeValues.indexOf(t); return i >= 0 ? i : 0 }
function conditionLabel(c) { const i = conditionValues.indexOf(c); return i >= 0 ? conditionLabels[i] : conditionLabels[0] }
function conditionIndex(c) { const i = conditionValues.indexOf(c); return i >= 0 ? i : 0 }
function outlineKindLabel(k) { const i = outlineKindValues.indexOf(k); return i >= 0 ? outlineKindLabels[i] : outlineKindLabels[0] }
function outlineKindIndex(k) { const i = outlineKindValues.indexOf(k); return i >= 0 ? i : 0 }

function hasInfoChannel(ch) { return (form.rewardConfig?.infoChannels || []).some(c => c?.channel === ch) }
function toggleInfoChannel(ch) {
  if (!form.rewardConfig) return
  const arr = Array.isArray(form.rewardConfig.infoChannels) ? form.rewardConfig.infoChannels : []
  const i = arr.findIndex(c => c?.channel === ch)
  if (i >= 0) arr.splice(i, 1)
  else arr.push({ channel: ch, label: ch === 'contact' ? '留联系方式' : '回答调查问卷' })
}
function addReward() {
  if (!form.rewardConfig) return
  if (!Array.isArray(form.rewardConfig.rewards)) form.rewardConfig.rewards = []
  form.rewardConfig.rewards.push({ id: `r_${Date.now()}_${form.rewardConfig.rewards.length}`, type: 'points', name: '', mode: 'single', condition: 'none', amount: 50 })
}
function removeReward(ri) { form.rewardConfig.rewards.splice(ri, 1) }
function moveReward(ri, dir) {
  const arr = form.rewardConfig.rewards
  const ni = ri + dir
  if (ni < 0 || ni >= arr.length) return
  const it = arr.splice(ri, 1)[0]
  arr.splice(ni, 0, it)
}
async function pickCourse(ri) {
  uni.showLoading({ title: '加载中...' })
  let list = []
  try {
    const res = await getCourseList({ page: 1, pageSize: 500 })
    list = (res.list || []).map(c => ({ id: c.id, documentId: c.documentId, title: c.title || '' })).filter(c => c.id || c.documentId)
  } catch (e) { list = [] }
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无课程', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map(c => c.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = form.rewardConfig.rewards[ri]
      rw.courseId = it.id ?? it.documentId
      rw.courseTitle = it.title
    }
  })
}
async function pickArticle(ri) {
  uni.showLoading({ title: '加载中...' })
  const list = await ensureRelOptions('article')
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无文章', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map(a => a.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = form.rewardConfig.rewards[ri]
      rw.articleId = it.id ?? it.documentId
      rw.articleTitle = it.title
    }
  })
}
async function pickLesson(ri) {
  uni.showLoading({ title: '加载中...' })
  const list = await ensureRelOptions('lesson')
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无课时', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map(l => l.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = form.rewardConfig.rewards[ri]
      rw.lessonId = it.id ?? it.documentId
      rw.lessonTitle = it.title
    }
  })
}
/** 奖励项加载归一化：condition 优先，兼容旧 loginRequired/channel */
const normReward = (r) => {
  if (!r || typeof r !== 'object') return {}
  return {
    id: r.id || `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: r.type || 'points',
    name: r.name || '',
    mode: r.mode === 'multi' ? 'multi' : 'single',
    condition: r.condition || (r.loginRequired ? 'wechat_auth' : (r.channel || 'none')),
    amount: r.amount,
    courseId: r.courseId, courseTitle: r.courseTitle || '',
    kind: r.kind || 'article',
    articleId: r.articleId, articleTitle: r.articleTitle || '',
    lessonId: r.lessonId, lessonTitle: r.lessonTitle || '',
    link: r.link || '',
    couponId: r.couponId, couponName: r.couponName || '',
  }
}
```

- [ ] **Step 5: loadDetail 回显 rewardConfig**

在第 1128 行 `formConfig: data.formConfig || [],` 之后追加：

```js
      rewardConfig: data.rewardConfig && typeof data.rewardConfig === 'object'
        ? {
            loginEnabled: data.rewardConfig.loginEnabled !== false,
            infoChannels: Array.isArray(data.rewardConfig.infoChannels) ? data.rewardConfig.infoChannels : [],
            rewards: Array.isArray(data.rewardConfig.rewards) ? data.rewardConfig.rewards.map(normReward) : [],
          }
        : { loginEnabled: false, infoChannels: [], rewards: [] },
```

- [ ] **Step 6: handleSubmit 提交 rewardConfig**

在第 1199 行 `learningPackageLessons: relIds(form.learningPackageLessons),` 之后追加：

```js
    rewardConfig: form.rewardConfig && form.rewardConfig.loginEnabled
      ? {
          loginEnabled: true,
          infoChannels: (form.rewardConfig.infoChannels || []).filter(c => c?.channel),
          rewards: (form.rewardConfig.rewards || []).filter(r => r && r.name && r.type).map(r => {
            const base = { id: r.id, type: r.type, name: r.name, mode: r.mode, condition: r.condition }
            if (r.type === 'points') return { ...base, amount: Number(r.amount) || 0 }
            if (r.type === 'course_trial') return { ...base, courseId: r.courseId }
            if (r.type === 'course_outline') {
              if (r.kind === 'article') return { ...base, kind: 'article', articleId: r.articleId }
              if (r.kind === 'file') return { ...base, kind: 'file', link: r.link }
              return { ...base, kind: 'lesson', lessonId: r.lessonId }
            }
            if (r.type === 'coupon') return { ...base, couponId: Number(r.couponId) || 0 }
            return base
          }),
        }
      : undefined,
```

- [ ] **Step 7: CSS 追加样式**

在 `<style lang="scss" scoped>` 末尾追加：

```scss
.reward-block { border: 1rpx solid #f0f0f0; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.reward-ops { display: flex; align-items: center; gap: 16rpx; }
.btn-link { color: #667eea; font-size: 26rpx; padding: 0; line-height: 1; }
.form-item-inner { margin-top: 12rpx; }
```

- [ ] **Step 8: SFC 语法校验**

用编译器或 HBuilderX 校验 `form.vue` 无语法错误；`rewardTypeLabels`/`conditionLabels`/`outlineKindLabels` 等模板引用均已定义。

- [ ] **Step 9: Commit**

```bash
cd e:/code/web && git add src/pages/activity/form.vue && git commit -m "feat(web): 活动编辑新增报名奖励配置区块(rewardConfig)"
```

---

### Task 4: 扩展验收脚本（condition 模型断言）

**Files:**
- Modify: `basic/scripts/accept-activity-reward.cjs`

- [ ] **Step 1: 替换 act1 的 formConfig/rewardConfig（第 147-159 行）**

改为含 contact/survey 双通道 + condition 各值 + 旧字段兼容：

```js
  const formConfig = [
    { key: 'name', label: '姓名', type: 'text' },
    { key: 'phone', label: '手机号', type: 'phone', channel: 'contact' },
    { key: 'exp', label: '期望收获', type: 'textarea', channel: 'survey' },
  ];
  const rewardConfig = {
    loginEnabled: true,
    infoChannels: [
      { channel: 'contact', label: '留联系方式' },
      { channel: 'survey',  label: '回答调查问卷' },
    ],
    rewards: [
      { id: 'r1', type: 'points', name: '报名积分', amount: 50, mode: 'single', condition: 'none' },
      { id: 'r2', type: 'points', name: '问卷奖励积分', amount: 30, mode: 'single', condition: 'survey' },
      { id: 'r3', type: 'course_outline', name: '课前培训大纲', kind: 'article', mode: 'multi', condition: 'contact', link: 'https://example.com/outline' },
      { id: 'r5', type: 'points', name: '授权专属积分', amount: 99, mode: 'single', condition: 'wechat_auth' },
      { id: 'r6', type: 'points', name: '旧格式积分', amount: 7, mode: 'single', loginRequired: true },
    ],
  };
```

- [ ] **Step 2: 新增静默零信息用户 u1s**

在注册 u1/u2（第 173-175 行）之后追加：

```js
  const u1s = await register(nm('u1silent'));
  check('注册用户 u1s(静默零信息) 拿到 token', !!u1s.id && !!u1s.token, `u1s=${u1s.id}`);
```

- [ ] **Step 3: 替换 u1 断言（第 198-210 行）**

u1 填 contact(phone) 不填 survey：解锁 r1(none)、r3(contact multi)，r2(survey)/r5/r6 不解锁：

```js
  // ---------- u1 静默路径(loginAuth=false, 仅填 contact) ----------
  const r1 = await signupAs(u1.token, act1.documentId, { name: '张三', phone: '13800138000' }, ['r3']);
  const d1 = r1.json?.data || {};
  check('u1 signup ok', r1.status === 200 && d1.ok === true, `${r1.status} ${JSON.stringify(r1.json)}`);
  check('u1 loginAuth=false(无绑定)', d1.unlockInfo?.loginAuth === false, JSON.stringify(d1.unlockInfo));
  check('u1 channels.contact=true', d1.unlockInfo?.channels?.contact === true, JSON.stringify(d1.unlockInfo?.channels));
  check('u1 channels.survey=false(未填问卷)', d1.unlockInfo?.channels?.survey === false, JSON.stringify(d1.unlockInfo?.channels));
  check('u1 chosenRewards 含 r1(none自动)与 r3(contact多选)', d1.unlockInfo?.chosenRewards?.includes('r1') && d1.unlockInfo?.chosenRewards?.includes('r3'), JSON.stringify(d1.unlockInfo?.chosenRewards));
  check('u1 不含 r2(survey未解锁)', !d1.unlockInfo?.chosenRewards?.includes('r2'), JSON.stringify(d1.unlockInfo?.chosenRewards));
  check('u1 不含 r5(wechat_auth未解锁)', !d1.unlockInfo?.chosenRewards?.includes('r5'), JSON.stringify(d1.unlockInfo?.chosenRewards));
  check('u1 不含 r6(旧loginRequired未解锁)', !d1.unlockInfo?.chosenRewards?.includes('r6'), JSON.stringify(d1.unlockInfo?.chosenRewards));
  const g1 = d1.granted || [];
  check('u1 granted 含 r1(积分+50)', g1.some((x) => x.id === 'r1' && /积分 \+50/.test(x.message || '')), JSON.stringify(g1));
  check('u1 granted 含 r3(大纲+link)', g1.some((x) => x.id === 'r3' && x.link === 'https://example.com/outline'), JSON.stringify(g1));
  check('u1 granted 不含 r2', !g1.some((x) => x.id === 'r2'), JSON.stringify(g1));
  check('u1 granted 不含 r5', !g1.some((x) => x.id === 'r5'), JSON.stringify(g1));
  check('u1 granted 不含 r6', !g1.some((x) => x.id === 'r6'), JSON.stringify(g1));
  check('u1 activity_reward 积分=50', (await userRewardPoints(u1.id)) === 50, `sum=${await userRewardPoints(u1.id)}`);
```

- [ ] **Step 4: 新增静默零信息断言（仅 condition=none 解锁）**

在 u1 断言后追加：

```js
  // ---------- u1s 静默且不填任何信息：仅 condition=none 奖励解锁 ----------
  const rs = await signupAs(u1s.token, act1.documentId, { name: '孙七' }, []);
  const ds = rs.json?.data || {};
  check('u1s signup ok', rs.status === 200 && ds.ok === true, `${rs.status} ${JSON.stringify(rs.json)}`);
  check('u1s 仅 r1 解锁', ds.unlockInfo?.chosenRewards?.length === 1 && ds.unlockInfo?.chosenRewards?.[0] === 'r1', JSON.stringify(ds.unlockInfo?.chosenRewards));
  const gs = ds.granted || [];
  check('u1s granted 仅含 r1', gs.length === 1 && gs[0].id === 'r1', JSON.stringify(gs));
  check('u1s activity_reward 积分=50', (await userRewardPoints(u1s.id)) === 50, `sum=${await userRewardPoints(u1s.id)}`);
```

- [ ] **Step 5: 替换 u2 断言（第 217-226 行）**

u2 授权登录，填 contact+survey，选 r3：r1/r2/r3/r5/r6 全部解锁：

```js
  // ---------- u2 授权路径(loginAuth=true, 填 contact+survey, 全选多选) ----------
  const r2 = await signupAs(u2.token, act1.documentId, { name: '李四', phone: '13900139000', exp: '想学习' }, ['r3']);
  const d2 = r2.json?.data || {};
  check('u2 signup ok', r2.status === 200 && d2.ok === true, `${r2.status} ${JSON.stringify(r2.json)}`);
  check('u2 loginAuth=true(wechat 绑定)', d2.unlockInfo?.loginAuth === true, JSON.stringify(d2.unlockInfo));
  check('u2 channels.contact/survey=true', d2.unlockInfo?.channels?.contact === true && d2.unlockInfo?.channels?.survey === true, JSON.stringify(d2.unlockInfo?.channels));
  check('u2 chosenRewards 含 r1/r2/r3/r5/r6', ['r1','r2','r3','r5','r6'].every((x) => d2.unlockInfo?.chosenRewards?.includes(x)), JSON.stringify(d2.unlockInfo?.chosenRewards));
  const g2 = d2.granted || [];
  check('u2 granted 含 r1/r2/r5/r6(全自动)', ['r1','r2','r5','r6'].every((x) => g2.some((y) => y.id === x)), JSON.stringify(g2));
  check('u2 granted 含 r3(多选已选)', g2.some((x) => x.id === 'r3'), JSON.stringify(g2));
  check('u2 activity_reward 积分=186(50+30+99+7)', (await userRewardPoints(u2.id)) === 186, `sum=${await userRewardPoints(u2.id)}`);
```

- [ ] **Step 6: 幂等断言中的 u1 积分改为 50（第 213-215 行已含，无需改）**

- [ ] **Step 7: 清理列表追加 u1s（第 259 行 `for (const u of [u1, u2])`）**

改为：

```js
  for (const u of [u1, u1s, u2]) {
```

- [ ] **Step 8: Commit**

```bash
cd e:/code/basic && git add scripts/accept-activity-reward.cjs && git commit -m "test(zhao-point): 验收脚本覆盖 condition 附加条件模型"
```

---

### Task 5: 运行验收

**Files:** 无（运行）

- [ ] **Step 1: 启动本地 Strapi develop**

```bash
cd e:/code/basic && npm run develop
```

Expected: Strapi 在 127.0.0.1:1337 运行（需 PostgreSQL 已启动）。

- [ ] **Step 2: 运行验收脚本**

```bash
cd e:/code/basic && node scripts/accept-activity-reward.cjs
```

Expected: `PASS=… FAIL=0`，覆盖 condition 四值（none/survey/contact/wechat_auth + 旧 loginRequired 兼容）、静默无奖励、multi 全选/任选、幂等、coupon、无 rewardConfig 必填回归、零残留。

- [ ] **Step 3: 若失败，修正后重跑（验收前先确认 zhao-point 已重编译）**

---

### Task 6: 收尾与提交

**Files:** 无（收尾）

- [ ] **Step 1: 停 dev + 还原根 dist**

```bash
# 停掉 Strapi develop 进程
cd e:/code/basic && git restore dist/
```

- [ ] **Step 2: 清理临时诊断脚本（如有）并核对调试残留**

自查 `zhao-point` 源码/脚本无 `DEBUG`/`console.log` 自造标记残留。

- [ ] **Step 3: 提交剩余改动并推送**

```bash
cd e:/code/basic && git add -A && git status && git commit -m "feat(zhao-point): 活动报名奖励 condition 附加条件模型落地" && git push
```

> 服务器部署：后端需重新构建部署 zhao-point dist + pm2 restart；C 端 shao 构建产物随仓库提交；web 运营端按 deploy-h5 流程构建部署。
