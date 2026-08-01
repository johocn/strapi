# 使用手册重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 4 个使用手册（website/admin/shao-catalog/user-guide）从单文件按章节拆分为独立文件，同步更新 viewer.vue 导航系统，优化视觉风格。

**Architecture:** 保持 viewer.vue 的 `v-html` 渲染模式不变，将 155KB 单文件按章节拆分为 15-25KB 独立文件，viewer.vue 增加悬浮目录按钮和底部导航栏，实现章节间无缝跳转。admin 手册删除与 website 手册重叠的内容（第 7 章网站内容管理 + 第 14 章官网中心学习路径）。

**Tech Stack:** UniApp (Vue3), Strapi 5, Markdown, HTML, CSS

---

### Task 1: 重构 website/ HTML 文件（内容不变，拆分为 9 个文件）

**Files:**
- Create: `docs/manual/website/index.html`（导航首页，替换原文件）
- Create: `docs/manual/website/ch1-overview.html`
- Create: `docs/manual/website/ch2-article.html`
- Create: `docs/manual/website/ch3-product.html`
- Create: `docs/manual/website/ch4-case.html`
- Create: `docs/manual/website/ch5-tutorial.html`
- Create: `docs/manual/website/ch6-faq.html`
- Create: `docs/manual/website/ch7-compliance.html`
- Create: `docs/manual/website/ch8-cases.html`
- Source: `docs/manual/website/index.html`（旧文件，155KB）

- [ ] **Step 1: 读取当前 website/index.html 全文，按章节标记位置**

```bash
# 读取原文件，确认章节边界标记
# 章节边界为: <!-- ==================== 第X章 ... ==================== -->
# 共 8 章 + 封面 + 目录
```

- [ ] **Step 2: 创建导航首页 index.html**

```html
<!-- 官网使用手册 — 导航首页 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

<div class="cover">
  <h1>官网使用手册</h1>
  <p class="subtitle">GEO/SEO 内容发布全景指南 — 从字段填写到流量闭环</p>
  <div class="meta">
    <span>版本 v2.0</span>
    <span>更新日期 2026-07-31</span>
    <span>适用系统 zhao-website 插件</span>
  </div>
</div>

<!-- 内容类型卡片入口 -->
<h2>内容类型</h2>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch1-overview.html')">
  <div class="nav-card-title">系统总览</div>
  <div class="nav-card-desc">GEO 体系定位、内容类型矩阵、发布闭环机制、联动逻辑</div>
  <div class="nav-card-tags">
    <span class="tag tag-blue">基础</span>
    <span class="tag tag-green">GEO</span>
  </div>
</div>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch2-article.html')">
  <div class="nav-card-title">资讯文章</div>
  <div class="nav-card-desc">知识播种 + 长尾流量入口，字段四件套详解</div>
  <div class="nav-card-tags">
    <span class="tag tag-blue">内容类型</span>
    <span class="tag tag-green">GEO</span>
  </div>
</div>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch3-product.html')">
  <div class="nav-card-title">产品/方案</div>
  <div class="nav-card-desc">事实锚点 + 转化着陆，产品描述规范与结构化数据</div>
  <div class="nav-card-tags">
    <span class="tag tag-blue">内容类型</span>
    <span class="tag tag-green">GEO</span>
  </div>
</div>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch4-case.html')">
  <div class="nav-card-title">落地案例</div>
  <div class="nav-card-desc">社会证明与可信度背书，案例结构规范</div>
  <div class="nav-card-tags">
    <span class="tag tag-purple">案例</span>
  </div>
</div>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch5-tutorial.html')">
  <div class="nav-card-title">教程/操作指南</div>
  <div class="nav-card-desc">HowTo 知识图谱与视频搜索，步骤结构规范</div>
  <div class="nav-card-tags">
    <span class="tag tag-blue">内容类型</span>
    <span class="tag tag-orange">SEO</span>
  </div>
</div>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch6-faq.html')">
  <div class="nav-card-title">常见问答</div>
  <div class="nav-card-desc">直接匹配 AI 问答查询，FAQPage 结构化数据</div>
  <div class="nav-card-tags">
    <span class="tag tag-blue">内容类型</span>
    <span class="tag tag-green">GEO</span>
  </div>
</div>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch7-compliance.html')">
  <div class="nav-card-title">合规公示</div>
  <div class="nav-card-desc">法律合规信号与信任建设</div>
  <div class="nav-card-tags">
    <span class="tag tag-orange">合规</span>
  </div>
</div>

<h2>行业示范案例</h2>

<div class="nav-card" onclick="window._goDoc && window._goDoc('website/ch8-cases.html')">
  <div class="nav-card-title">5 大行业案例详解</div>
  <div class="nav-card-desc">SaaS · 医疗器械 · 教育培训 · 工业制造 · 电商平台</div>
  <div class="nav-card-tags">
    <span class="tag tag-purple">案例</span>
  </div>
</div>
```

- [ ] **Step 3: 提取第 1 章内容，创建 ch1-overview.html**

从原文件提取 `<!-- 第一章 系统总览 -->` 到 `<!-- 第二章 资讯文章 -->` 之间的内容，写入 `ch1-overview.html`。

- [ ] **Step 4: 提取第 2 章内容，创建 ch2-article.html**

从原文件提取 `<!-- 第二章 资讯文章 -->` 到 `<!-- 第三章 产品/方案 -->` 之间的内容。

- [ ] **Step 5: 提取第 3-4 章内容，创建 ch3-product.html 和 ch4-case.html**

分别提取第 3 章（产品/方案）和第 4 章（落地案例）的内容。

- [ ] **Step 6: 提取第 5-6 章内容，创建 ch5-tutorial.html 和 ch6-faq.html**

分别提取第 5 章（教程/操作指南）和第 6 章（常见问答）的内容。

- [ ] **Step 7: 提取第 7-8 章内容，创建 ch7-compliance.html 和 ch8-cases.html**

分别提取第 7 章（合规公示）和第 8 章（行业示范案例）的内容。

---

### Task 2: 重构 admin/ MD 文件（删除网站内容章节，按章节拆分）

**Files:**
- Create: `docs/manual/admin/index.md`（导航首页）
- Create: `docs/manual/admin/ch1-overview.md`
- Create: `docs/manual/admin/ch2-login.md`
- Create: `docs/manual/admin/ch3-dashboard.md`
- Create: `docs/manual/admin/ch4-tenant.md`
- Create: `docs/manual/admin/ch5-channel.md`
- Create: `docs/manual/admin/ch6-course.md`
- Create: `docs/manual/admin/ch8-quiz.md`
- Create: `docs/manual/admin/ch9-points.md`
- Create: `docs/manual/admin/ch10-system.md`
- Create: `docs/manual/admin/ch11-media.md`
- Create: `docs/manual/admin/ch12-thirdparty.md`
- Create: `docs/manual/admin/ch13-faq.md`
- Source: `docs/manual/admin/index.md`（旧文件，36KB）

- [ ] **Step 1: 读取当前 admin/index.md 全文**

读取 36KB 的 admin 手册，确认各章节边界。章节边界为 `## N.` 标题。

- [ ] **Step 2: 创建导航首页 index.md**

```markdown
# 后台管理系统使用手册

> 版本：2.0.0 | 基于 UniApp + Strapi | 面向管理员用户 | 详细操作指南

## 目录

- [1. 系统概述](ch1-overview.md)
- [2. 登录与权限](ch2-login.md)
- [3. 仪表盘](ch3-dashboard.md)
- [4. 多租户管理](ch4-tenant.md)
- [5. 渠道管理](ch5-channel.md)
- [6. 课程管理](ch6-course.md)
- [8. 题库管理](ch8-quiz.md)
- [9. 积分管理](ch9-points.md)
- [10. 系统管理](ch10-system.md)
- [11. 媒体管理](ch11-media.md)
- [12. 第三方配置](ch12-thirdparty.md)
- [13. 常见问题](ch13-faq.md)
```

- [ ] **Step 3: 提取第 1 章内容，创建 ch1-overview.md**

从原文件提取 `## 1. 系统概述` 到 `## 2. 登录与权限` 之间的内容（含系统架构、浏览器要求、访问地址、角色权限说明）。

- [ ] **Step 4: 提取第 2-3 章内容，创建 ch2-login.md 和 ch3-dashboard.md**

分别提取第 2 章（登录与权限）和第 3 章（仪表盘），并更新内部链接格式。

- [ ] **Step 5: 提取第 4-6 章内容，创建 ch4-tenant.md、ch5-channel.md、ch6-course.md**

分别提取多租户管理、渠道管理、课程管理，并更新内部链接格式。

- [ ] **Step 6: 提取第 8-12 章内容，创建 ch8-quiz.md ~ ch12-thirdparty.md**

分别提取题库管理、积分管理、系统管理、媒体管理、第三方配置，并更新内部链接格式。注意：跳过第 7 章（网站内容管理）和第 14 章（官网中心学习路径），这两个章节在 admin 中删除。

- [ ] **Step 7: 提取第 13 章内容，创建 ch13-faq.md**

提取常见问题章节。

---

### Task 3: 重构 shao-catalog/ MD 文件（按章节拆分）

**Files:**
- Create: `docs/manual/shao-catalog/index.md`（导航首页）
- Create: `docs/manual/shao-catalog/ch1-start.md`
- Create: `docs/manual/shao-catalog/ch2-login.md`
- Create: `docs/manual/shao-catalog/ch3-course.md`
- Create: `docs/manual/shao-catalog/ch4-quiz.md`
- Create: `docs/manual/shao-catalog/ch5-redeem.md`
- Create: `docs/manual/shao-catalog/ch6-profile.md`
- Create: `docs/manual/shao-catalog/ch7-invite.md`
- Create: `docs/manual/shao-catalog/ch8-faq.md`
- Source: `docs/manual/shao-catalog/index.md`（旧文件，5.5KB）

- [ ] **Step 1: 读取当前 shao-catalog/index.md 全文**

读取 5.5KB 的 shao-catalog 手册。

- [ ] **Step 2: 创建导航首页 index.md**

```markdown
# 课程学习答题用户使用手册

> 面向 C 端学员 | 覆盖课程学习、答题、积分兑换全流程

## 目录

- [1. 快速开始](ch1-start.md)
- [2. 账号登录与注册](ch2-login.md)
- [3. 课程浏览与学习](ch3-course.md)
- [4. 答题与积分获取](ch4-quiz.md)
- [5. 积分兑换商品](ch5-redeem.md)
- [6. 个人中心与互动](ch6-profile.md)
- [7. 邀请好友赚积分](ch7-invite.md)
- [8. 常见问题](ch8-faq.md)
```

- [ ] **Step 3 ~ 9: 提取各章节内容，创建 ch1-start.md ~ ch8-faq.md**

按章节边界 `## N.` 提取内容，每个章节写入独立文件，并更新内部链接。

---

### Task 4: 重构 user-guide/ MD 文件（按章节拆分）

**Files:**
- Create: `docs/manual/user-guide/index.md`（导航首页）
- Create: `docs/manual/user-guide/ch1-overview.md`
- Create: `docs/manual/user-guide/ch2-category.md`
- Create: `docs/manual/user-guide/ch3-course.md`
- Create: `docs/manual/user-guide/ch4-lesson.md`
- Create: `docs/manual/user-guide/ch5-auth.md`
- Create: `docs/manual/user-guide/ch6-quiz.md`
- Create: `docs/manual/user-guide/ch7-exam.md`
- Create: `docs/manual/user-guide/ch8-record.md`
- Create: `docs/manual/user-guide/ch9-point-rule.md`
- Create: `docs/manual/user-guide/ch10-point-config.md`
- Create: `docs/manual/user-guide/ch11-monitor.md`
- Create: `docs/manual/user-guide/ch12-faq.md`
- Source: `docs/manual/user-guide/index.md`（旧文件，9.5KB）

- [ ] **Step 1: 读取当前 user-guide/index.md 全文**

读取 9.5KB 的 user-guide 手册。

- [ ] **Step 2: 创建导航首页 index.md**

```markdown
# 课程学习答题管理用户手册

> 面向运营 / 内容管理员 | 覆盖课程、课时、题库、考试、积分规则、学习数据全流程配置

## 目录

- [1. 概述](ch1-overview.md)
- [2. 课程分类与标签](ch2-category.md)
- [3. 课程管理](ch3-course.md)
- [4. 课时管理](ch4-lesson.md)
- [5. 用户课程授权](ch5-auth.md)
- [6. 题库管理](ch6-quiz.md)
- [7. 考试管理](ch7-exam.md)
- [8. 答题记录与评分](ch8-record.md)
- [9. 积分规则配置](ch9-point-rule.md)
- [10. 积分全局配置](ch10-point-config.md)
- [11. 学习数据监控](ch11-monitor.md)
- [12. 常见问题](ch12-faq.md)
```

- [ ] **Step 3 ~ 14: 提取各章节内容，创建 ch1-overview.md ~ ch12-faq.md**

按章节边界 `## N.` 提取内容，每个章节写入独立文件，并更新内部链接。

---

### Task 5: 更新 viewer.vue — 添加悬浮目录 + 底部导航

**Files:**
- Modify: `strapi-backend/pages/manual/viewer.vue`

- [ ] **Step 1: 在 viewer.vue 中添加底部导航栏 HTML**

```vue
<!-- 在 </scroll-view> 之前添加底部导航 -->
<view class="doc-nav">
  <view v-if="prevDoc" class="nav-btn prev" @click="goDoc(prevDoc)">
    <text class="nav-arrow">←</text>
    <text class="nav-label">上一章</text>
  </view>
  <view v-if="nextDoc" class="nav-btn next" @click="goDoc(nextDoc)">
    <text class="nav-label">下一章</text>
    <text class="nav-arrow">→</text>
  </view>
</view>
```

- [ ] **Step 2: 添加悬浮目录按钮 HTML**

```vue
<!-- 在 manual-viewer 底部添加，position: absolute -->
<view v-if="!loading && !error" class="toc-float-btn" @click="tocVisible = true">
  <text class="toc-float-icon">≡</text>
</view>

<!-- 目录弹出面板 -->
<view v-if="tocVisible" class="toc-overlay" @click="tocVisible = false">
  <view class="toc-panel" @click.stop>
    <view class="toc-header">
      <text class="toc-title">目录</text>
      <text class="toc-close" @click="tocVisible = false">✕</text>
    </view>
    <scroll-view scroll-y class="toc-list">
      <view
        v-for="(item, i) in tocItems"
        :key="i"
        class="toc-item"
        :class="{ 'toc-item-active': item.active }"
        :style="{ paddingLeft: (item.level - 1) * 16 + 'px' }"
        @click="scrollToAnchor(item.anchor); tocVisible = false"
      >
        <text>{{ item.title }}</text>
      </view>
    </scroll-view>
  </view>
</view>
```

- [ ] **Step 3: 添加悬浮目录的 JS 逻辑**

```javascript
// 在 <script setup> 中添加
const tocVisible = ref(false)
const tocItems = ref([])

// 解析当前文档的标题结构生成目录
function buildToc() {
  if (!content.value) return
  const raw = content.value
  if (currentDoc.value.endsWith('.html')) {
    // HTML 文件：提取 h2/h3 标题
    const items = []
    const h2s = [...raw.matchAll(/<h2[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/g)]
    for (const m of h2s) {
      items.push({ level: 1, anchor: m[1], title: m[2].replace(/<[^>]+>/g, '').trim(), active: false })
    }
    const h3s = [...raw.matchAll(/<h3[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h3>/g)]
    for (const m of h3s) {
      items.push({ level: 2, anchor: m[1], title: m[2].replace(/<[^>]+>/g, '').trim(), active: false })
    }
    tocItems.value = items
  } else {
    // Markdown 文件：提取 ## / ### 标题
    const items = []
    const lines = content.value.split('\n')
    for (const line of lines) {
      const h2 = line.match(/^##\s+(.+)/)
      if (h2) items.push({ level: 1, anchor: slugify(h2[1]), title: h2[1].trim(), active: false })
      const h3 = line.match(/^###\s+(.+)/)
      if (h3) items.push({ level: 2, anchor: slugify(h3[1]), title: h3[1].trim(), active: false })
    }
    tocItems.value = items
  }
}

// 在 loadDoc 完成后调用 buildToc
// 在 loadDoc 函数末尾添加: buildToc()
```

- [ ] **Step 4: 优化底部导航的函数 getIndexOrder**

```javascript
// 更新 getIndexOrder 以支持所有手册的章节顺序
function getIndexOrder() {
  // 从当前文档路径推断手册目录
  const dir = currentDoc.value.split('/')[0] // 'website' | 'admin' | 'shao-catalog' | 'user-guide'
  const indexKey = Object.keys(docs).find(k => k.endsWith(`docs/manual/${dir}/index.md`) || k.endsWith(`docs/manual/${dir}/index.html`))
  if (!indexKey) return []
  const raw = docs[indexKey]
  // 解析 index 文件中的链接获取章节顺序
  const order = []
  // 支持 .md 和 .html 链接
  const re = /\[([^\]]+)\]\(([^)]+\.(?:md|html))\)/g
  let m
  while ((m = re.exec(raw)) !== null) {
    order.push(`${dir}/${m[2]}`)
  }
  // 如果是 HTML 导航卡片，解析 onclick 中的 goDoc 调用
  if (indexKey.endsWith('.html')) {
    const re2 = /window\._goDoc\s*&&\s*window\._goDoc\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    let m2
    while ((m2 = re2.exec(raw)) !== null) {
      order.push(m2[1])
    }
  }
  return order
}
```

- [ ] **Step 5: 添加悬浮目录的 CSS**

```css
/* 悬浮目录按钮 */
.toc-float-btn {
  position: absolute;
  right: 20rpx;
  bottom: 100rpx;
  width: 88rpx;
  height: 88rpx;
  background: #1a56db;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(26, 86, 219, 0.3);
  z-index: 100;
}
.toc-float-icon { font-size: 40rpx; color: #fff; font-weight: 700; }

/* 目录遮罩层 */
.toc-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.toc-panel {
  width: 100%;
  max-height: 60vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}
.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #e4e7ed;
}
.toc-title { font-size: 32rpx; font-weight: 700; color: #303133; }
.toc-close { font-size: 36rpx; color: #909399; padding: 8rpx; }
.toc-list { flex: 1; padding: 16rpx 0; }
.toc-item {
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  color: #606266;
  border-left: 4rpx solid transparent;
}
.toc-item-active { color: #1a56db; border-left-color: #1a56db; font-weight: 600; }
```

- [ ] **Step 6: 更新内容加载后，将 goDoc 函数暴露到 window 供 HTML 导航卡片调用**

```javascript
// 在 loadDoc 函数末尾添加
onMounted(() => {
  bindClick()
  // 暴露 goDoc 给 HTML 导航卡片使用
  window._goDoc = goDoc
})

onBeforeUnmount(() => {
  const el = contentRef.value?.$el || contentRef.value
  if (el && el.removeEventListener) {
    el.removeEventListener('click', onDocClick)
  }
  // 清理 window 引用
  delete window._goDoc
})
```

---

### Task 6: 清理旧文件并验证

**Files:**
- Delete: `docs/manual/website/index.html`（旧单文件，已被新 index.html + 8 个章节文件替代）
- Delete: `docs/manual/admin/index.md`（旧单文件，已被新 index.md + 12 个章节文件替代）
- Delete: `docs/manual/shao-catalog/index.md`（旧单文件，已被新 index.md + 8 个章节文件替代）
- Delete: `docs/manual/user-guide/index.md`（旧单文件，已被新 index.md + 12 个章节文件替代）

- [ ] **Step 1: 删除旧文件**

```bash
# 旧文件已被新结构替代，确认新文件全部就位后删除
Remove-Item 'd:\zhao\docs\manual\website\index.html'  # 旧单文件
Remove-Item 'd:\zhao\docs\manual\admin\index.md'       # 旧单文件
Remove-Item 'd:\zhao\docs\manual\shao-catalog\index.md' # 旧单文件
Remove-Item 'd:\zhao\docs\manual\user-guide\index.md'  # 旧单文件
```

- [ ] **Step 2: 验证文件总数**

```bash
# 验证 website/ 目录应有 9 个文件
Get-ChildItem 'd:\zhao\docs\manual\website' -File | Measure-Object | % { $_.Count }
# 期望: 9

# 验证 admin/ 目录应有 13 个文件
Get-ChildItem 'd:\zhao\docs\manual\admin' -File | Measure-Object | % { $_.Count }
# 期望: 13

# 验证 shao-catalog/ 目录应有 9 个文件
Get-ChildItem 'd:\zhao\docs\manual\shao-catalog' -File | Measure-Object | % { $_.Count }
# 期望: 9

# 验证 user-guide/ 目录应有 13 个文件
Get-ChildItem 'd:\zhao\docs\manual\user-guide' -File | Measure-Object | % { $_.Count }
# 期望: 13
```

- [ ] **Step 3: 验证 viewer.vue 能正确加载新文件**

确认 `import.meta.glob` 模式 `../../../docs/manual/**/*.{md,html}` 能匹配到所有新文件，特别是 website/ 的新 HTML 文件。

- [ ] **Step 4: 验证 index.vue 入口路径**

确认 `index.vue` 中所有手册的 `indexDoc` 路径指向正确的文件：
- `website/index.html` → 导航首页
- `admin/index.md` → 导航首页
- `shao-catalog/index.md` → 导航首页
- `user-guide/index.md` → 导航首页