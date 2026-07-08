# Web Dashboard 官网中心可见性修复与顺序调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 admin 角色登录后 dashboard 看不到"🌐 官网中心"区域的问题（onMounted → onShow），并将官网中心从第 7 位调整到第 1 位（课程中心之前）。

**Architecture:** 单文件 3 处修改：1) import 移除 onMounted 引入 onShow；2) 生命周期钩子 onMounted → onShow；3) 剪切官网中心 section 粘贴到课程中心 section 之前。改完后每次进入 dashboard 都刷新权限，符合 memory 约束。

**Tech Stack:** uni-app + Vue 3 (`<script setup>`)

**Spec:** `docs/superpowers/specs/2026-07-08-web-dashboard-website-visibility-fix.md`

---

## File Structure

**修改：**
- `web/pages/dashboard/index.vue` — 3 处修改：
  - 第 408 行：import 调整
  - 第 500 行：生命周期 onMounted → onShow
  - 第 241-318 行：官网中心 section 移动到第 91 行之前

**关键边界确认（修改前文件）：**
- 第 89-90 行：`</view>` + 空行（stats-grid 闭合）
- 第 91 行：`    <!-- 课程中心 -->`
- 第 240 行：空行
- 第 241 行：`    <!-- 官网中心 -->`
- 第 318 行：`    </view>`（官网中心 section 闭合）
- 第 319 行：空行
- 第 320 行：`    <!-- 系统工具 -->`
- 第 408 行：`import { ref, computed, onMounted } from 'vue'`
- 第 500 行：`onMounted(async () => {`
- 第 516 行：`})`

---

## Task 1: 修复权限刷新机制（onMounted → onShow）

**Files:**
- Modify: `web/pages/dashboard/index.vue:408,500`

- [ ] **Step 1: 修改 import 语句**

Edit `web/pages/dashboard/index.vue`，将第 408 行：

```js
import { ref, computed, onMounted } from 'vue'
```

替换为：

```js
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
```

- [ ] **Step 2: 修改生命周期钩子**

Edit `web/pages/dashboard/index.vue`，将第 500 行：

```js
onMounted(async () => {
```

替换为：

```js
onShow(async () => {
```

注意：函数体内容（第 501-515 行）保持不变，仅修改钩子名称。

- [ ] **Step 3: 验证修改**

Read `web/pages/dashboard/index.vue` 第 407-410 行，确认 import 已包含 `onShow` 且不再有 `onMounted`：

```js
<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../src/store/user.js'
```

Read 第 500 行，确认已改为 `onShow(async () => {`。

- [ ] **Step 4: Commit**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "fix(web): use onShow instead of onMounted to refresh permissions on every dashboard entry"
```

---

## Task 2: 调整官网中心 section 顺序

**Files:**
- Modify: `web/pages/dashboard/index.vue:91,241-318`

- [ ] **Step 1: 剪切官网中心 section**

Edit `web/pages/dashboard/index.vue`，删除第 240-319 行（含前导空行和尾随空行），即以下整块代码：

```

    <!-- 官网中心 -->
    <view class="module-section" v-if="hasPermission('menu.website-center')">
      <view class="section-title">🌐 官网中心</view>
      <view class="module-grid">
        ...（18 个 module-item，第 242-317 行）
      </view>
    </view>

```

具体操作：用 Edit 工具，old_string 为从第 240 行空行开始到第 319 行空行结束的完整内容（含 `<!-- 官网中心 -->` 到 `</view>` 的 section 代码块），new_string 为空字符串（删除）。

**精确匹配：** old_string 应包含以下完整内容（注意首尾各一个空行）：

```

    <!-- 官网中心 -->
    <view class="module-section" v-if="hasPermission('menu.website-center')">
      <view class="section-title">🌐 官网中心</view>
      <view class="module-grid">
        <view class="module-item" v-if="hasPermission('menu.website-seo')" @click="navigateTo('/pages/website/seo-config/edit')">
          <view class="module-icon">🔍</view>
          <view class="module-name">SEO 配置</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-brand')" @click="navigateTo('/pages/website/brand-info/edit')">
          <view class="module-icon">🏷️</view>
          <view class="module-name">品牌信息</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-article')" @click="navigateTo('/pages/website/article/list')">
          <view class="module-icon">📄</view>
          <view class="module-name">资讯文章</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-article-category')" @click="navigateTo('/pages/website/article-category/list')">
          <view class="module-icon">📂</view>
          <view class="module-name">文章分类</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-product')" @click="navigateTo('/pages/website/product/list')">
          <view class="module-icon">📦</view>
          <view class="module-name">产品方案</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-case')" @click="navigateTo('/pages/website/case/list')">
          <view class="module-icon">🏆</view>
          <view class="module-name">落地案例</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-compliance')" @click="navigateTo('/pages/website/compliance/list')">
          <view class="module-icon">📋</view>
          <view class="module-name">合规公示</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-faq')" @click="navigateTo('/pages/website/faq/list')">
          <view class="module-icon">❓</view>
          <view class="module-name">常见问答</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-tutorial')" @click="navigateTo('/pages/website/tutorial/list')">
          <view class="module-icon">📖</view>
          <view class="module-name">教程指南</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-download')" @click="navigateTo('/pages/website/download/list')">
          <view class="module-icon">💾</view>
          <view class="module-name">下载管理</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-lead')" @click="navigateTo('/pages/website/lead/list')">
          <view class="module-icon">📝</view>
          <view class="module-name">线索管理</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-visit-log')" @click="navigateTo('/pages/website/visit-log/list')">
          <view class="module-icon">👁️</view>
          <view class="module-name">访问日志</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-interaction')" @click="navigateTo('/pages/website/interaction/list')">
          <view class="module-icon">💬</view>
          <view class="module-name">互动记录</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-search-log')" @click="navigateTo('/pages/website/search-log/list')">
          <view class="module-icon">🔎</view>
          <view class="module-name">搜索日志</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-knowledge-entity')" @click="navigateTo('/pages/website/knowledge-entity/list')">
          <view class="module-icon">🧠</view>
          <view class="module-name">知识实体</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-knowledge-relation')" @click="navigateTo('/pages/website/knowledge-relation/list')">
          <view class="module-icon">🔗</view>
          <view class="module-name">知识关系</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-ai-summary')" @click="navigateTo('/pages/website/ai-summary/list')">
          <view class="module-icon">✨</view>
          <view class="module-name">AI 摘要</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-first-truth')" @click="navigateTo('/pages/website/first-truth/list')">
          <view class="module-icon">💎</view>
          <view class="module-name">第一真值</view>
        </view>
      </view>
    </view>
```

new_string 为空字符串。

**注意：** 为避免 old_string 不唯一问题（section 闭合 `</view>` 可能重复），old_string 必须从 `    <!-- 官网中心 -->` 注释开始，到本 section 闭合 `    </view>` 结束（第 318 行），不含前后空行。删除后用另一次 Edit 清理多余空行。

- [ ] **Step 2: 在课程中心之前插入官网中心 section**

Edit `web/pages/dashboard/index.vue`，将第 91 行：

```
    <!-- 课程中心 -->
```

替换为：

```
    <!-- 官网中心 -->
    <view class="module-section" v-if="hasPermission('menu.website-center')">
      <view class="section-title">🌐 官网中心</view>
      <view class="module-grid">
        <view class="module-item" v-if="hasPermission('menu.website-seo')" @click="navigateTo('/pages/website/seo-config/edit')">
          <view class="module-icon">🔍</view>
          <view class="module-name">SEO 配置</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-brand')" @click="navigateTo('/pages/website/brand-info/edit')">
          <view class="module-icon">🏷️</view>
          <view class="module-name">品牌信息</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-article')" @click="navigateTo('/pages/website/article/list')">
          <view class="module-icon">📄</view>
          <view class="module-name">资讯文章</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-article-category')" @click="navigateTo('/pages/website/article-category/list')">
          <view class="module-icon">📂</view>
          <view class="module-name">文章分类</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-product')" @click="navigateTo('/pages/website/product/list')">
          <view class="module-icon">📦</view>
          <view class="module-name">产品方案</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-case')" @click="navigateTo('/pages/website/case/list')">
          <view class="module-icon">🏆</view>
          <view class="module-name">落地案例</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-compliance')" @click="navigateTo('/pages/website/compliance/list')">
          <view class="module-icon">📋</view>
          <view class="module-name">合规公示</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-faq')" @click="navigateTo('/pages/website/faq/list')">
          <view class="module-icon">❓</view>
          <view class="module-name">常见问答</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-tutorial')" @click="navigateTo('/pages/website/tutorial/list')">
          <view class="module-icon">📖</view>
          <view class="module-name">教程指南</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-download')" @click="navigateTo('/pages/website/download/list')">
          <view class="module-icon">💾</view>
          <view class="module-name">下载管理</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-lead')" @click="navigateTo('/pages/website/lead/list')">
          <view class="module-icon">📝</view>
          <view class="module-name">线索管理</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-visit-log')" @click="navigateTo('/pages/website/visit-log/list')">
          <view class="module-icon">👁️</view>
          <view class="module-name">访问日志</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-interaction')" @click="navigateTo('/pages/website/interaction/list')">
          <view class="module-icon">💬</view>
          <view class="module-name">互动记录</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-search-log')" @click="navigateTo('/pages/website/search-log/list')">
          <view class="module-icon">🔎</view>
          <view class="module-name">搜索日志</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-knowledge-entity')" @click="navigateTo('/pages/website/knowledge-entity/list')">
          <view class="module-icon">🧠</view>
          <view class="module-name">知识实体</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-knowledge-relation')" @click="navigateTo('/pages/website/knowledge-relation/list')">
          <view class="module-icon">🔗</view>
          <view class="module-name">知识关系</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-ai-summary')" @click="navigateTo('/pages/website/ai-summary/list')">
          <view class="module-icon">✨</view>
          <view class="module-name">AI 摘要</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-first-truth')" @click="navigateTo('/pages/website/first-truth/list')">
          <view class="module-icon">💎</view>
          <view class="module-name">第一真值</view>
        </view>
      </view>
    </view>

    <!-- 课程中心 -->
```

- [ ] **Step 3: 验证顺序**

Run Grep 检查顺序：
```
Grep pattern: "section-title|<!-- .* -->"
path: e:\code\web\pages\dashboard\index.vue
```

Expected output（section 出现顺序）：
1. `<!-- 官网中心 -->`
2. `🌐 官网中心`
3. `<!-- 课程中心 -->`
4. `📚 课程中心`
5. `<!-- 学习数据 -->`
6. ...（其余按原顺序）

官网中心必须在课程中心之前。

- [ ] **Step 4: 验证无重复 section**

Run Grep：
```
Grep pattern: "menu.website-center"
path: e:\code\web\pages\dashboard\index.vue
output_mode: count
```

Expected: `1`（只有一处 `v-if="hasPermission('menu.website-center')"`，不能有重复）

- [ ] **Step 5: Commit**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "feat(web): move website-center section before course-center in dashboard"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Section 2.2 改动 1（权限刷新机制）：Task 1 Step 1-2
- ✅ Section 2.3 改动 2（section 顺序调整）：Task 2 Step 1-2
- ✅ Section 3 验收标准"官网中心显示在课程中心之前"：Task 2 Step 3 验证
- ✅ Section 3 验收标准"从其他页面返回 dashboard，权限重新刷新"：Task 1 改 onShow

**2. Placeholder scan:** 无 TBD/TODO，所有代码完整

**3. Type consistency:**
- import 语句：`onShow` 从 `@dcloudio/uni-app` 引入（与项目其他页面一致，如 website/list.vue 中 `import { onShow } from '@dcloudio/uni-app'`）
- 生命周期函数调用：`onShow(async () => { ... })` 与原 `onMounted(async () => { ... })` 签名一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-08-web-dashboard-website-visibility-fix.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间审查

**2. Inline Execution** - 当前会话批量执行，含 checkpoint 审查
