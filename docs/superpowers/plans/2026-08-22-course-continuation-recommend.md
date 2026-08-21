# 课程续学推荐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为已学过课程的用户提供"进阶 / 续学 / 相似"课程推荐，形成个人化续学路径。

**Architecture:** 在 zhao-course 插件新增 `recommend` service（内存打分引擎 `scoreCandidate`）+ `recommend` controller，暴露两个 `/v1` 接口：课程详情续学（公开）与学习中心个人续学清单（登录）。引擎按"序列续学 > 同分类 level 递进 > tags/keywords 重叠"打分，排除已报名与自身，无候选时兜底最新/热门。shao 前端在课程详情页与我的课程两处展示。

**Tech Stack:** Strapi v5（zhao-course 插件）、typeScript service/controller、shao HBuilder uni-app Vue3。

---

### Task 1: 后端 recommend service（引擎 + 两个方法）

**Files:**
- Create: `e:\code\basic\plugins\zhao-course\server\src\services\recommend.ts`
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\index.ts`

- [ ] **Step 1: 新建 `services/recommend.ts`**

```typescript
import type { Core } from "@strapi/strapi";

const COURSE_UID = "plugin::zhao-course.course";
const ENROLL_UID = "plugin::zhao-course.course-enrollment";
const PROGRESS_UID = "plugin::zhao-course.course-progress";

const LEVEL_ORDER: Record<string, number> = {
  introductory: 1,
  foundation: 2,
  advanced: 3,
  professional: 4,
};

const tagIds = (c: any) => (Array.isArray(c?.tags) ? c.tags.map((t: any) => t?.id?.toString?.() ?? String(t)).filter(Boolean) : []);

const kwSet = (c: any) => {
  const kws = Array.isArray(c?.keywords) ? c.keywords : typeof c?.keywords === "object" && c.keywords ? Object.values(c.keywords) : [];
  return new Set(kws.map((k: any) => String(k).toLowerCase()).filter(Boolean));
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 课程详情续学：seed=当前课程 */
  async relatedFor(courseDocumentId: string, limit = 6) {
    const seed = await this.findOneCourse(courseDocumentId);
    if (!seed) return [];
    return this.buildSuggestions([seed], new Set(), limit);
  },

  /** 学习中心个人续学清单：seed=在学课程（progress<100），否则回退最近报名课程 */
  async suggestionsFor(userId: number, limit = 6) {
    const [enrollments, progresses] = await Promise.all([
      strapi.db.query(ENROLL_UID).findMany({ where: { user: userId, status: "enrolled" }, populate: { course: { select: ["documentId"] } }, limit: 300 }),
      strapi.db.query(PROGRESS_UID).findMany({ where: { user: userId }, populate: { course: { select: ["documentId"] } }, limit: 300 }),
    ]);

    const enrolledDocIds = new Set(enrollments.map((e: any) => e.course?.documentId).filter(Boolean));
    const inProgressDocIds = progresses
      .filter((p: any) => Number(p.progress ?? 0) < 100 && p.course?.documentId)
      .map((p: any) => p.course?.documentId);

    const seedDocIds: string[] = inProgressDocIds.slice(0, 20);
    if (!seedDocIds.length) {
      seedDocIds.push(...enrollments.map((e: any) => e.course?.documentId).filter(Boolean).slice(0, 20));
    }
    if (!seedDocIds.length) return this.fallbackCourses(limit, enrolledDocIds);

    const seeds = (await this.findCoursesByIds(seedDocIds)).filter(Boolean);
    if (!seeds.length) return this.fallbackCourses(limit, enrolledDocIds);
    return this.buildSuggestions(seeds, enrolledDocIds, limit);
  },

  /***** 引擎核心 *****/

  async buildSuggestions(seeds: any[], excludeDocIds: Set<string>, limit: number) {
    const candidates = await this.candidatePool(excludeDocIds);
    const best = new Map<string, any>(); // probeDocId -> {cand, score, seedId, sequenceNext}
    for (const cand of candidates) {
      let bestScore = 0;
      let bestSeed: any = null;
      let bestNext = false;
      for (const seed of seeds) {
        if (String(seed.documentId) === String(cand.documentId)) continue;
        const { score, sequenceNext } = this.scoreCandidate(seed, cand);
        if (score > bestScore) { bestScore = score; bestSeed = seed; bestNext = sequenceNext; }
      }
      if (bestScore > 0) best.set(String(cand.documentId), { cand, score: bestScore, seedId: bestSeed?.id, sequenceNext: bestNext });
    }
    let rows = [...best.values()]
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map((r: any) => this.toRow(r.cand, r.score, r.sequenceNext, r.seedId));
    if (!rows.length) rows = this.fallbackCourses(limit, excludeDocIds);
    return rows;
  },

  scoreCandidate(seed: any, cand: any) {
    let score = 0;
    let sequenceNext = false;

    const st = seed.sequenceTag;
    const ct = cand.sequenceTag;
    if (st && ct && String(st.id) === String(ct.id)) {
      const gap = (cand.sequenceNumber || 0) - (seed.sequenceNumber || 0);
      if (seed.enforceSequence && cand.enforceSequence && gap === 1) { score += 300; sequenceNext = true; }
      else if (gap > 0) score += 150;
    }

    const sc = seed.category?.id;
    const cc = cand.category?.id;
    if (sc && cc && String(sc) === String(cc)) {
      const sg = LEVEL_ORDER[seed.level] ?? 2;
      const cg = LEVEL_ORDER[cand.level] ?? 0;
      if (cg > sg) score += 100;
      else if (cg === sg) score += 40;
    }

    const sTags = tagIds(seed);
    const cTags = tagIds(cand);
    score += sTags.filter((t: string) => cTags.includes(t)).length * 10;

    const sKw = kwSet(seed);
    const cKw = kwSet(cand);
    cKw.forEach((k: string) => { if (sKw.has(k)) score += 5; });

    return { score, sequenceNext };
  },

  async candidatePool(excludeDocIds: Set<string>) {
    const all = await strapi.db.query(COURSE_UID).findMany({
      where: { status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
      limit: 500,
    });
    return all.filter((c: any) => !excludeDocIds.has(String(c.documentId)));
  },

  async findOneCourse(documentId: string) {
    return strapi.db.query(COURSE_UID).findOne({
      where: { documentId, status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
    });
  },

  async findCoursesByIds(docIds: string[]) {
    if (!docIds.length) return [];
    return strapi.db.query(COURSE_UID).findMany({
      where: { documentId: { $in: docIds }, status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
    });
  },

  async fallbackCourses(limit: number, excludeDocIds: Set<string>) {
    const all = await strapi.db.query(COURSE_UID).findMany({
      where: { status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
      orderBy: { studentCount: "DESC" },
      limit: 100,
    });
    return all
      .filter((c: any) => !excludeDocIds.has(String(c.documentId)))
      .slice(0, limit)
      .map((c: any) => this.toRow(c, 0, false, null));
  },

  toRow(cand: any, score: number, sequenceNext: boolean, seedId: number | null) {
    return {
      documentId: cand.documentId,
      id: cand.id,
      title: cand.title,
      category: cand.category?.name ?? null,
      cover: cand.cover ?? null,
      price: cand.price ?? 0,
      isFree: cand.isFree ?? true,
      isPaid: cand.isPaid,
      courseType: cand.courseType,
      level: cand.level,
      difficulty: cand.difficulty,
      studentCount: cand.studentCount ?? 0,
      sequenceNext,
      score,
      seedId,
    };
  },
});
```

- [ ] **Step 2: 在 `services/index.ts` 注册**

在 `import accessCode from "./access-code";` 后加：
```typescript
import recommend from "./recommend";
```
在 export default 对象 `"access-code": accessCode,` 后加：
```typescript
recommend,
```

- [ ] **Step 3: 构建校验**

```bash
cd e:\code\basic\plugins\zhao-course && npm run build
```
预期：退出码 0（dts 类型告警可忽略，不影响运行时产物）；确认 `server/dist/services/recommend.js` 生成。

---

### Task 2: 后端 recommend controller + 注册

**Files:**
- Create: `e:\code\basic\plugins\zhao-course\server\src\controllers\recommend.ts`
- Modify: `e:\code\basic\plugins\zhao-course\server\src\controllers\index.ts`

- [ ] **Step 1: 新建 `controllers/recommend.ts`**

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async related(ctx: any) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) { ctx.status = 400; ctx.body = { error: "缺少课程 ID" }; return; }
      const limit = Math.min(Math.max(Number(ctx.query?.limit) || 6, 1), 20);
      const data = await strapi.plugin("zhao-course").service("recommend").relatedFor(documentId, limit);
      ctx.body = { data };
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message };
    }
  },

  async suggestions(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) { ctx.status = 401; ctx.body = { error: "用户未登录" }; return; }
      const limit = Math.min(Math.max(Number(ctx.query?.limit) || 6, 1), 20);
      const data = await strapi.plugin("zhao-course").service("recommend").suggestionsFor(userId, limit);
      ctx.body = { data };
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message };
    }
  },
});
```

- [ ] **Step 2: 在 `controllers/index.ts` 注册**

在 `import accessCode from "./access-code";` 后加：
```typescript
import recommend from "./recommend";
```
在 export default 对象 `"access-code": accessCode,` 后加：
```typescript
recommend,
```

- [ ] **Step 3: 构建校验**

```bash
cd e:\code\basic\plugins\zhao-course && npm run build
```
预期：退出码 0；确认 `server/dist/controllers/recommend.js` 生成。**注意：controllers/index.ts 改动若未入 entry，dev 会崩——本步构建通过即视为已入 entry 生效。**

---

### Task 3: 后端路由注册

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\routes\content-api.ts`

- [ ] **Step 1: 在 content-api.ts 的 routes 数组内新增两条路由**

在"===== 报名相关（C 端用户） =====" 区块上方（`publicChannelScopeRoute("GET", "/courses/:documentId", "course.findOne", ...)` 之后）插入详情续学（公开）：
```typescript
    publicChannelScopeRoute("GET", "/courses/:documentId/related", "recommend.related"),
```
在 `userRoute("GET", "/my/course-auth/:courseDocumentId", "user-course-auth.checkAuth"),` 之后插入学习中心（登录）：
```typescript
    userRoute("GET", "/my/course-suggestions", "recommend.suggestions"),
```

- [ ] **Step 2: 构建校验**

```bash
cd e:\code\basic\plugins\zhao-course && npm run build
```
预期：退出码 0。

---

### Task 4: 重启 dev 并验证路由存在

- [ ] **Step 1: 启动本地 Strapi dev**

```bash
cd e:\code\basic && npm run dev
```
等待 `/_health` 返回 204（轮询确认服务就绪）。

- [ ] **Step 2: 冒烟验证两条路由可命中文档**

```bash
curl -s "http://localhost:1337/zhao-course/v1/courses/<某已发布课程documentId>/related"
```
预期返回 `{"data":[...]}`（可为空数组，不报 404 路由错误）。若返回 404 PolicyError/路由不存在，先 `git restore dist/` 后复检插件 dist 是否重建并重启。

---

### Task 5: shao services/api.ts 新增接口

**Files:**
- Modify: `e:\code\shao\services\api.ts`

- [ ] **Step 1: 在"个性化推荐 API（zhao-sso）"注释区块之前新增两个导出函数**

```ts
// ==================== 课程续学推荐 API（zhao-course） ====================

/** 课程详情续学（公开）：进阶/续学/相似课程 @returns res.data 为课程数组 */
export async function getCourseRelated(documentId: string, limit = 6) {
  return request(`/zhao-course/v1/courses/${documentId}/related?limit=${limit}`)
}

/** 学习中心个人续学清单（需登录）@returns res.data 为课程数组（含 sequenceNext / seedId） */
export async function getMyCourseSuggestions(limit = 6) {
  return request(`/zhao-course/v1/my/course-suggestions?limit=${limit}`)
}
```

- [ ] **Step 2: 校验**

```bash
cd e:\code\shao && npx vue-tsc --noEmit -p tsconfig.json 2>&1 | Select-Object -First 30
```
预期：无新增类型错误（可容忍项目既有的无关告警）。

---

### Task 6: shao 课程详情页续学区块

**Files:**
- Modify: `e:\code\shao\pages\course-detail\course-detail.vue`

- [ ] **Step 1: script 引入与状态**

在 `import { getCourseDetail, getLessonList, getMyLessonProgresses, getPointRecordList, getMyEnrollment, createEnrollment } from '../../services/api'` 末尾追加 `getCourseRelated`：
```ts
import { getCourseDetail, getLessonList, getMyLessonProgresses, getPointRecordList, getMyEnrollment, createEnrollment, getCourseRelated } from '../../services/api'
```
在 `const courseQuizCount = computed(` 附近新增响应式状态与数据字段：
```ts
const relatedCourses = ref<any[]>([])
```
在 `loadCourse()`（onLoad 里 `getCourseDetail(courseId)` 那一段）后续追加：
```ts
function loadRelated(courseId: string) {
  getCourseRelated(courseId).then((res: any) => {
    relatedCourses.value = (res as any)?.data || (res as any) || []
  }).catch(() => { relatedCourses.value = [] })
}
```
并在 onLoad 的 `getCourseDetail(courseId)` 分支里调用 `loadRelated(courseId)`。

- [ ] **Step 2: template 追加区块（`</template>` 结束前）**

```html
    <!-- 进阶课程 / 续学推荐 -->
    <view v-if="relatedCourses.length > 0" class="related-section">
      <view class="related-title">
        <text class="related-title-text">进阶课程 / 继续学习</text>
      </view>
      <scroll-view scroll-x class="related-scroll">
        <view
          v-for="item in relatedCourses"
          :key="item.documentId"
          class="related-card"
          @click="goToCourse(item.documentId)"
        >
          <image v-if="item.cover" :src="item.cover.url || item.coverUrl" mode="aspectFill" class="related-cover" />
          <view v-else class="related-cover placeholder">📖</view>
          <text class="related-name">{{ item.title }}</text>
          <view class="related-meta">
            <text v-if="item.sequenceNext" class="related-badge">进阶续学</text>
            <text v-else-if="item.level" class="related-level">{{ item.level }}</text>
            <text v-if="item.isPaid && item.price > 0" class="related-price">¥{{ item.price }}</text>
            <text v-else-if="item.isFree" class="related-price">免费</text>
          </view>
        </view>
      </scroll-view>
    </view>
```

- [ ] **Step 3: style 追加**

在 `<style lang="scss" scoped>` 内新增 `.related-section / .related-title / .related-scroll / .related-card / .related-cover / .related-name / .related-meta / .related-badge / .related-level / .related-price` 样式与页面既有卡片风格一致（横向滚动卡片，圆角白底）。

- [ ] **Step 4: 类型校验**

```bash
cd e:\code\shao && npx vue-tsc --noEmit -p tsconfig.json 2>&1 | Select-Object -First 30
```
预期：无新增类型错误。

---

### Task 7: shao 我的课程（学习中心）续学清单区块

**Files:**
- Modify: `e:\code\shao\pages\my-course\my-course.vue`

- [ ] **Step 1: script 引入与加载**

将 import 中的 `getMyEnrollments,` 行末尾追加 `getMyCourseSuggestions,`：
```ts
import {
  getMyCourseProgresses,
  getPointBalance,
  getPointStatistics,
  getMyEnrollments,
  getMyCourseSuggestions,
} from '../../services/api'
```
新增响应式状态：
```ts
const suggestions = ref<any[]>([])
```
在 `loadData()` 的 `Promise.all([...])` 之外追加（独立请求，失败不阻断主列表）：
```ts
try {
  const sugRes = await getMyCourseSuggestions()
  suggestions.value = (sugRes as any)?.data || (sugRes as any) || []
} catch (e) { suggestions.value = [] }
```

- [ ] **Step 2: template 追加区块（三 Tab 区块之后、`</template>` 之前）**

```html
    <!-- 我的续学推荐 -->
    <view v-if="suggestions.length > 0" class="section suggest-section">
      <view class="suggest-title">
        <text class="suggest-title-text">我的续学推荐</text>
        <text class="suggest-sub">学完进阶，持续成长</text>
      </view>
      <view class="course-list">
        <view
          v-for="item in suggestions"
          :key="item.documentId"
          class="course-card"
          @click="goToCourse(item.documentId)"
        >
          <view class="course-cover">
            <image v-if="item.cover" :src="item.cover.url || item.coverUrl" mode="aspectFill" />
            <view v-else class="cover-placeholder">🚀</view>
          </view>
          <view class="course-info">
            <text class="course-title">{{ item.title }}</text>
            <view class="pending-meta">
              <text v-if="item.sequenceNext" class="suggest-badge">进阶续学</text>
              <text v-if="item.category" class="enroll-type-tag">{{ item.category }}</text>
            </view>
            <text v-if="item.isPaid && item.price > 0" class="submit-time">价格 ¥{{ item.price }}</text>
            <text v-else-if="item.isFree" class="submit-time">免费课程</text>
          </view>
          <view class="continue-btn"><text>去学习</text></view>
        </view>
      </view>
    </view>
```

- [ ] **Step 3: style 追加 `.suggest-section` 顶部留白、`.suggest-title / .suggest-title-text / .suggest-sub / .suggest-badge`**

- [ ] **Step 4: 类型校验**

```bash
cd e:\code\shao && npx vue-tsc --noEmit -p tsconfig.json 2>&1 | Select-Object -First 30
```
预期：无新增类型错误。

---

### Task 8: 验收脚本 accept-course-recommend.cjs

**Files:**
- Create: `e:\code\basic\scripts\accept-course-recommend.cjs`

- [ ] **Step 1: 编写脚本**

脚本需：等待 `/_health` 204 → 管理员登录取 token → 创建 1 个分类 A、5 门已发布课程（A-cat: 3 门 level=introductory/foundation/advanced 各一；1 门挂 sequenceTag 同标签 sequenceNumber 1/2；另有 1 门 B-cat 低热度用于验证不优先）→ 用 SQL 为一个测试 up-user 预插 enrollment + progress（progress<100，指向 A-cat 的 introductory 课）→ 断言：
1. `GET /zhao-course/v1/courses/<introductory课程documentId>/related` 返回首条为 A-cat 的 foundation（level 递进优先）
2. `GET /v1/my/course-suggestions`（用测试用户 token）返回首条为序列表内下一门（sequenceNext=true）或 A-cat 进阶，且不包含已报名课程
3. 字段契齐全（documentId/title/category/level/price/isFree/sequenceNext/score/seedId）
4. 清理：删除新增课程/分类，`git restore dist/` 不变更源码

参考经验：动态解析 lnk/关系 FK 列名避免主键冲突；测试用户需真实存在并绑定；用 `git restore dist/` 还原根 dist。

- [ ] **Step 2: 运行并按提示修复直到全 PASS**

```bash
cd e:\code\basic && node scripts/accept-course-recommend.cjs
```

---

### Task 9: 三仓库收口 + 记忆更新

- [ ] **Step 1: 停止 dev（如仍运行）并还原根 dist**

```bash
cd e:\code\basic && git restore dist/
```
确认 `git status` 仅含本功能源码改动。

- [ ] **Step 2: 提交与推送 basic**

```bash
git add plugins/zhao-course docs/superpowers/plans/2026-08-22-course-continuation-recommend.md scripts/accept-course-recommend.cjs
git commit -m "feat(course): continuation recommend engine + related/suggestions endpoints"
git push
```
（若插件 dist 有生成产物，需一并 add `plugins/zhao-course/**/dist`）

- [ ] **Step 3: 提交与推送 shao**

```bash
cd e:\code\shao && npm run build:h5 2>&1 | Select-Object -First 20
git add -A && git commit -m "feat(course): continuation recommend blocks (detail + learning center)" && git push
```
注意：shao 是构建物部署，`dist/build/h5` 需随源码提交。

- [ ] **Step 4: 更新记忆** 在 `project_memory.md` 追加本功能收口总结（引擎规则、三仓库 commit、验收 PASS、待办）。

- [ ] **Step 5: 复核三仓库均无未推送提交**