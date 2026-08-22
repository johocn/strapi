# 阶段 A：活动前「标签分类 + 列表发现」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为线下活动增加分类（category）与标签（tags），C 端活动列表支持分类筛选与标题搜索，前台首页提供活动列表入口，实现活动「被发现」。

**Architecture:** 后端在 `zhao-point` 的 `activity` content-type 增加 `category`(string) 与 `tags`(json 字符串数组) 两个轻量字段；公开 `GET /activities` 显式映射 `category`/`search` 入参到 Strapi filters 进行服务端过滤，新增公开 `GET /activities/categories` 返回去重分类列表；web 活动表单加 category(tags) 录入；shao 活动列表页加分类 chips + 搜索框，首页提供跳转列表入口。不引入新依赖。

**Tech Stack:** Strapi v5 (documents query)、uni-app (shao)、uni-app admin (web)。

**文件结构：**
- `basic/plugins/zhao-point/server/src/content-types/activity/schema.json` — 加 category/tags 字段
- `basic/plugins/zhao-point/server/src/controllers/activity.ts` — list 过滤 + categories 聚合
- `basic/plugins/zhao-point/server/src/routes/content-api.ts` — 注册 categories 路由（在 `/:documentId` 前）
- `web/src/pages/activity/form.vue` — 录入 category/tags
- `web/src/api/...`（活动 admin API）— 不变（submitData 透传字段即可）
- `shao/services/api.ts` — 新增 getActivityCategories
- `shao/pages/activity/list.vue` — 分类 chips + 搜索框
- `shao/pages/index/index.vue` — 活动列表入口

---

### Task 1: 后端 activity schema 增加 category/tags

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`

- [ ] **Step 1: 在 `type` 字段后追加 category 与 tags 两个字段**

在 `activity/schema.json` 的 `"type": { "type": "string", "default": "其他" },` 之后插入：

```json
    "category": { "type": "string", "default": "" },
    "tags": { "type": "json" },
```

- [ ] **Step 2: 重建插件 dist 使新字段生效**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: 构建成功（如出现 types dts 报错属正常，不影响运行时产物，可忽略）。

- [ ] **Step 3: 提交**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/types/generated/contentTypes.d.ts
git -C e:\code\basic commit -m "feat(zhao-point): activity 增加 category/tags 字段"
```

---

### Task 2: 后端 list 支持分类/搜索过滤 + 公开 categories 聚合接口

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\activity.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: 修改公开 `list` 控制器，显式映射 category/search**

将 `controllers/activity.ts` 的 `list` 方法体（当前第 44-59 行，含 `const { page = "1", pageSize = "20", ...rest } = ctx.query;`）替换为：

```ts
  // GET /activities
  async list(ctx: any) {
    try {
      const { page = "1", pageSize = "20", category, search, ...rest } = ctx.query;
      const filters: any = { status: { $notIn: ["draft", "archived"] } };
      if (category) filters.category = { $eq: category };
      if (search) filters.title = { $contains: search };
      const result = await strapi.documents(ACTIVITY_UID).findMany({
        ...rest,
        filters,
        populate: "*",
        sort: "startTime:desc",
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize) },
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /activities/categories
  async categories(ctx: any) {
    try {
      const rows = await strapi.db.query(ACTIVITY_UID).findMany({
        select: ["category"],
        where: { status: { $notIn: ["draft", "archived"] } },
      });
      const set = new Set<string>();
      for (const r of rows) if (r.category) set.add(r.category);
      ctx.body = wrap(Array.from(set).sort((a, b) => a.localeCompare(b, "zh")));
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

> 注：`list` 的 `$notIn: ["draft","archived"]` 与 spec 阶段 C 已预设的公开口径保持一致——即使阶段 C 未在本阶段实施，此处直接写成不变量，避免阶段 C 时重复改。公开列表不展示 archived（归入 C 后生效），ended 仍可见。`activity.list` 信号量下新加的 `archived` 状态仅在阶段 C 真被赋值时才会被过滤，当前所有存量活动 status 均不含 archived，无破坏。

- [ ] **Step 2: 注册 categories 公开路由（必须在 `/:documentId` 之前）**

在 `routes/content-api.ts` 中，将 `publicRoute("GET", "/activities", "activity.list"),` 之后、`publicRoute("GET", "/activities/calendar", "calendar.month"),` 之前插入：

```ts
    publicRoute("GET", "/activities/categories", "activity.categories"),
```

> 关键：`GET /activities/categories` 必须注册在 `GET /activities/:documentId` 之前，否则会被 `:documentId` 参数捕获返回 404。

- [ ] **Step 3: 重建插件 dist**

Run: `cd e:\code\basic\plugins\zhao-point && npm run build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git -C e:\code\basic add plugins/zhao-point/server/src/controllers/activity.ts plugins/zhao-point/server/src/routes/content-api.ts
git -C e:\code\basic commit -m "feat(zhao-point): 活动公开列表支持分类/搜索过滤 + categories 聚合接口"
```

---

### Task 3: web 活动表单支持录入 category/tags

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`

- [ ] **Step 1: form reactive 增加 category、tags**

在 `form.vue` 的 `title: '',`（第 403 行）之后增加：

```ts
  category: '',
  tags: [],
```

- [ ] **Step 2: loadDetail Object.assign 补 category/tags 回显**

在 `form.vue` 的 `Object.assign(form, data, {` 内增加一行（放在 `formConfig: data.formConfig || []` 之后、闭合 `})` 之前）：

```ts
      category: data.category || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
```

- [ ] **Step 3: submitData 增加 category/tags**

在 `form.vue` 的 `const submitData = {` 内（`title: form.title,` 之后）增加：

```ts
    category: form.category || undefined,
    tags: Array.isArray(form.tags) && form.tags.length ? form.tags : undefined,
```

- [ ] **Step 4: 模板「基本信息」区新增分类输入框**

在 `form.vue` 模板 `基本信息` section 中，`title` 输入框（`v-model="form.title"` 对应 `<input>`）之后插入一个输入框：

```html
          <input type="text" v-model="form.category" placeholder="活动分类（如 讲座/沙龙/工作坊/其他）" class="form-input" />
```

（tags 的复杂录入可在本最小闭环先留空，不做专门 UI——分类已足够支撑列表发现；tags 仅作数据结构预留。）

- [ ] **Step 5: 构建 h5 产物并提交**

Run: `cd e:\code\web && npm run build:h5`
Expected: 成功。
推送：`git -C e:\code\web add src/pages/activity/form.vue; git -C e:\code\web commit -m "feat(web): 活动表单支持分类category字段"; git -C e:\code\web push`

---

### Task 4: shao API + 活动列表分类筛选与搜索

**Files:**
- Modify: `e:\code\shao\services\api.ts`
- Modify: `e:\code\shao\pages\activity\list.vue`

- [ ] **Step 1: api.ts 增加 getActivityCategories**

在 `api.ts` 的 `getActivityCalendar`（活动日历）函数定义之后追加：

```ts
/** 活动分类列表（公开，去重聚合）@returns res.data 为分类字符串数组 */
export async function getActivityCategories() {
  return request('/zhao-point/v1/activities/categories')
}
```

- [ ] **Step 2: list.vue 增加分类 chips + 搜索框（模板）**

将 `pages/activity/list.vue` 模板中 `<text class="top-title">线下活动</text>`（第 4 行）之后的列表结构改为：在 `<view class="activity-list">`（第 7 行）之前插入分类与搜索条，并把 `listActivities({ pageSize: 50 })` 调用改为带筛选参数：

```html
    <view class="filter-bar">
      <scroll-view scroll-x class="cat-scroll">
        <view
          class="cat-chip"
          :class="{ active: activeCategory === '' }"
          @click="onCategory('')">全部</view>
        <view
          v-for="c in categories"
          :key="c"
          class="cat-chip"
          :class="{ active: activeCategory === c }"
          @click="onCategory(c)">{{ c }}</view>
      </scroll-view>
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        placeholder="搜索活动标题"
        confirm-type="search"
        @confirm="onSearch" />
    </view>
```

- [ ] **Step 3: list.vue script 增加分类/搜索状态与逻辑**

将 `pages/activity/list.vue` 的 `<script setup>` 内 `import { listActivities }` 改为同时引入分类接口，并新增状态与函数：

```ts
import { listActivities, getActivityCategories } from '../../services/api'

const categories = ref<string[]>([])
const activeCategory = ref('')
const keyword = ref('')

function onCategory(c: string) {
  activeCategory.value = c
  loadActivities()
}
function onSearch() {
  loadActivities()
}
```

将 `loadActivities` 改为带筛选：

```ts
async function loadActivities() {
  loading.value = true
  try {
    const res = await listActivities({
      pageSize: 50,
      category: activeCategory.value || undefined,
      search: keyword.value.trim() || undefined,
    })
    const data = (res as any)?.data ?? res
    activities.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('加载活动列表失败', e)
  } finally {
    loading.value = false
  }
}
```

在 `onMounted` 内才并加载分类（分类接口不进概要筛选，避免重复请求失败影响列表）：在 `onMounted(() => { loadActivities() })` 之外另加 `loadCategories()`：

```ts
async function loadCategories() {
  try {
    const res = (await getActivityCategories()) as any
    categories.value = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
  } catch (e) {
    console.error('加载分类失败', e)
  }
}
```

并在 `onMounted` 同时调用：

```ts
onMounted(() => {
  loadActivities()
  loadCategories()
})
```

- [ ] **Step 4: list.vue 增加分类/搜索样式**

在 `pages/activity/list.vue` `<style lang="scss" scoped>` 中追加：

```scss
.filter-bar { margin-bottom: 20rpx; }
.cat-scroll { display: flex; white-space: nowrap; margin-bottom: 16rpx; }
.cat-chip {
  display: inline-block; padding: 10rpx 26rpx; margin-right: 16rpx;
  background: #fff; color: #666; font-size: 26rpx; border-radius: 30rpx;
  &.active { background: #667eea; color: #fff; }
}
.search-input {
  background: #fff; border-radius: 30rpx; padding: 14rpx 24rpx;
  font-size: 26rpx; color: #333;
}
```

- [ ] **Step 5: 提交 shao**

```bash
git -C e:\code\shao add src/services/api.ts src/pages/activity/list.vue
git -C e:\code\shao commit -m "feat(shao): 活动列表分类筛选+标题搜索"
```

---

### Task 5: shao 首页提供活动列表入口

**Files:**
- Modify: `e:\code\shao\pages\index\index.vue`

- [ ] **Step 1: 确认首页有跳转列表入口**

首页已存在「近期活动」区段（`rec-activity`，展示 recommendActivities）。若该区标题「近期活动」旁已有跳转入口（如 `📅 活动日历 »` 跳日历），则在其后追加一个「更多活动 »」跳转活动列表；否则在区段头追加。

- [ ] **Step 2: 新增入口方法**

在 `pages/index/index.vue` `<script setup>` 中新增方法（与现有 `goActivityCalendar` 并列）：

```ts
function goActivityList() {
  uni.navigateTo({ url: '/pages/activity/list' })
}
```

- [ ] **Step 3: 模板追加入口（在 rec-activity-head 内追加）**

将 `rec-activity-head` 的 Calendar 入口行：
```html
<text class="rec-activity-entry" @click="goActivityCalendar">📅 活动日历 »</text>
```
之后追加：
```html
<text class="rec-activity-entry" @click="goActivityList">更多活动 »</text>
```

> 说明：`list.vue` 路由需已在 `pages.json` 注册。若 `pages/activity/list` 未注册（列表页是独立文件但可能未挂路由），需在此任务确认并补注册：检查 `e:\code\shao\pages.json` 是否含 `"path": "pages/activity/list"`，若无则补充（`uni-app` 推荐注册方可 navigateTo）。

- [ ] **Step 4: 构建 h5 并提交**

Run: `cd e:\code\shao && npm run build:h5`
Expected: 成功。
```bash
git -C e:\code\shao add src/pages/index/index.vue pages.json dist/build/h5
git -C e:\code\shao commit -m "feat(shao): 首页活动列表入口+dist重建"
```

---

### Task 6: 端到端验收 + 三仓库收口

**Files:**
- Create: `e:\code\basic\scripts\accept-activity-discovery.cjs`

- [ ] **Step 1: 编写验收脚本**

创建 `e:\code\basic\scripts\accept-activity-discovery.cjs`，覆盖（复用既有 accept 脚本的 http/req/qa 结构模式）：
1. 构造 1 个正运营活动 A（category="工作坊", status=signup_open）与之配的 1 个活动 B（category="讲座", status=signup_open）、1 个草稿 C（category="工作坊", status=draft）。用 `strapi.documents`/或直插 `activities` 表建数据（沿用既有脚本 `PREFIX='ad_'`；活动表为 `activities`，直接 INSERT，注意 category/tags 列与 status 枚举）。
2. `GET /zhao-point/v1/activities?category=工作坊` → 只含 A（不含 B、不含草稿 C）。
3. `GET /zhao-point/v1/activities?search=<A 标题片段>` → 只含 A。
4. `GET /zhao-point/v1/activities/categories` → 含 "工作坊"、"讲座"，不含草稿 C 的 category。
5. 组合 `category=工作坊&search=...` 可同时缩小到空集（验证 filter 与搜索叠加）。
6. 清理：删除 `activities` 中 `title LIKE 'ad_%'`（连同关系 lnk，若有活动表关联），断言残留 0。
沿用既有 `scripts/accept-*.cjs` 的 ok/qa/subIds 封装风格，全部断言通过才退出 0。

- [ ] **Step 2: 运行验收脚本**

启动本地 dev（若无则先 `cd e:\code\basic && npm run dev` 或按项目记忆用 pm2/开发态），等待 `/zhao-point/v1/activities` 可返回 200。
Run: `cd e:\code\basic && node scripts/accept-activity-discovery.cjs`
Expected: 全部 PASS，退出码 0，脚本内清理零残留。

- [ ] **Step 3: 提交流程收口**

按项目记忆三仓库映射收口，关键：
- basic：重建插件 dist 后 `git restore dist/`（根 app dist，pathspec `dist/` 不匹配 plugins/*/dist），提交源码 + plugins dist + 脚本。
- web：`npm run build:h5` 后提交 src + `dist/build/h5`（src/pages.json/dashboard/activity/form.vue），并 `git push`。
- shao：`npm run build:h5` 后提交 src + `dist/build/h5`，并 `git push`。
- 各验收子代理任务描述末尾强制「收口前停 dev + `git restore dist/` + 清理临时诊断脚本」。

- [ ] **Step 4: 提交验收脚本并推送三仓库**

```bash
git -C e:\code\basic add scripts/accept-activity-discovery.cjs docs/superpowers/plans/2026-08-22-activity-discovery-plan.md
git -C e:\code\basic commit -m "test: 活动列表发现(分类/搜索/分类聚合)端到端验收脚本"
git -C e:\code\basic push
```

---

## Self-Review

**Spec 覆盖：**
- 分类/搜索：Task 2（后端过滤）+ Task 4（shao UI）、Task 3（web 录入）✓
- categories 聚合接口：Task 2 Step 2（路由）+ Task 4 Step 1（api）✓
- 首页入口：Task 5 ✓
- 公开口径 `$notIn:["draft","archived"]`：Task 2 ✓

**占位扫描：** 无 TBD/TODO；Task 6 的验收脚本明确给出现有 accept 脚本的复刻风格与断言要点，非空占位。任务均可独立实施。

**类型一致性：** `getActivityCategories`、`categories`、`activeCategory`、`keyword`、`category`、`tags` 全链路命名一致；`list` 去参 `category/search` 与 `wrapList` 排除后不影响既有 shao/web 消费（额外 query 参数忽略）。