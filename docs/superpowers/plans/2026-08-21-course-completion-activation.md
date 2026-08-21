# 课程完课转化归因 + 激活SOP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐课程运营第二环——完课转化归因报表（course.d7 + course.activate 触达后窗口内完课即转化）+ 激活醒学 SOP（每日扫描报名未学用户周期性催学）。

**Architecture:** zhao-course 插件负责完课时间戳（`course-progress.completedAt`）与激活 SOP（新增 `runActivationReminderScan` + `config/cron.ts`，触发 `course.activate` 场景）；zhao-sso 插件负责完课转化统计（`sso-stats.getCourseCompletionStats`）与报表路由；web 运营端新增完课转化页。纯查询统计不落库，催学去重落在 `lastReminderAt`，频控由已有 `sso-quota` 场景冷却兜底。

**Tech Stack:** Strapi v5 插件（zhao-course / zhao-sso）、TypeScript、uni-app（web 运营端）。

**注意三点（贯穿始终）：**
1. 改 zhao-course / zhao-sso 源码后**必须重建插件 dist**：`cd plugins/<name> && npm run build`，否则 dev 加载旧产物（新增 schema 字段/路由/cron 不生效）。
2. 任务收口统一 `git restore dist/` 还原根 app dist + 清理临时脚本。
3. 三仓库分别推送：basic（后端+spec/plan）、web（运营端）、shao 本轮无改动。

---

### Task 1: course-progress schema 增加 completedAt / lastReminderAt

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\content-types\course-progress\schema.json`

- [ ] **Step 1**: 在 `course-progress/schema.json` 的 `attributes`（`lastStudyAt` 之后、闭合 `}` 之前）追加两个 datetime 字段：

```json
    "completedAt": {
      "type": "datetime"
    },
    "lastReminderAt": {
      "type": "datetime"
    }
```

- [ ] **Step 2**: 验证 JSON 合法（可 `node -e "require('e:/code/basic/plugins/zhao-course/server/src/content-types/course-progress/schema.json'); console.log('ok')"`，输出 ok）。

- [ ] **Step 3**: 提交
```bash
git add plugins/zhao-course/server/src/content-types/course-progress/schema.json
git commit -m "feat(course): add completedAt/lastReminderAt to course-progress"
```

---

### Task 2: recalculate 幂等写入 completedAt

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\course-progress.ts:95-117`

- [ ] **Step 1**: 将 `recalculate` 方法体改为（仅更新语句改为幂等写 `completedAt`）：

```ts
  async recalculate(userId: number, courseId: number) {
    const progress = await this.getOrCreate(userId, courseId);

    const completedCount = await strapi.db.query(LESSON_PROGRESS_UID).count({
      where: { user: userId, course: courseId, isCompleted: true },
    });

    const totalLessons = progress.totalLessons || 0;
    const percent = totalLessons > 0 ? Math.min(Math.round((completedCount / totalLessons) * 10000) / 100, 100) : 0;
    const isCompleted = completedCount >= totalLessons && totalLessons > 0;

    const data: any = {
      completedLessons: completedCount,
      progress: percent,
      isCompleted,
      lastStudyAt: new Date(),
    };
    // 首次完课幂等写入 completedAt（已存在时间戳则保持不覆盖）
    if (isCompleted && !progress.completedAt) {
      data.completedAt = new Date();
    }

    await strapi.db.query(UID).update({
      where: { id: progress.id },
      data,
    });

    return { ...progress, completedLessons: completedCount, progress: percent, isCompleted, completedAt: data.completedAt };
  },
```

- [ ] **Step 2**: 提交
```bash
git add plugins/zhao-course/server/src/services/course-progress.ts
git commit -m "feat(course): idempotent write completedAt on first completion"
```

---

### Task 3: sso-stats 新增 getCourseCompletionStats

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-stats.ts`（`getCourseD7Stats` 之后追加方法）
- 复用本文件已定义的常量 `SOP_RULE_UID`、`MSG_JOB_UID`、`COURSE_ENROLL_UID`、`DATE_MS`

- [ ] **Step 1**: 定义 course-progress UID 常量（文件顶部常量区追加一行）：

```ts
const COURSE_PROGRESS_UID = "plugin::zhao-course.course-progress";
```

- [ ] **Step 2**: 在 `getCourseD7Stats` 方法之后（`return getCourseD7Stats,` 之前）追加本方法：

```ts
    /**
     * 完课转化归因：course.d7 + course.activate 触达送达后，窗口内该用户任一挥发完课即计转化。
     * 纯查询不落库。窗口天数取 course.d7 规则 conversionWindowDays，缺省 7。
     */
    async getCourseCompletionStats(opts: { from?: string; to?: string }) {
      const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
      const to = opts.to ? new Date(opts.to) : new Date();
      if (from.getTime() > to.getTime()) {
        const err: any = new Error("from 不能晚于 to");
        err.status = 400;
        throw err;
      }
      const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "course.d7" } });
      const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
      const windowMs = windowDays * DATE_MS;

      const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
        where: { scene: { $in: ["course.d7", "course.activate"] }, status: "sent", sentAt: { $gte: from, $lte: to } },
        populate: { user: { select: ["id"] } },
      });

      const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
      const convertedUserSet = new Set<number>();
      let conversions = 0;

      for (const j of jobs) {
        const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
        if (!ssoUserId) continue;
        const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
        if (!up) continue;
        const userId = up.id;
        const from2 = new Date(j.sentAt);
        const to2 = new Date(from2.getTime() + windowMs);
        // 完课判定：存在 isCompleted 且 completedAt 落在窗口内（completedAt 为空不计）
        const cnt = await strapi.db.query(COURSE_PROGRESS_UID).count({
          where: { user: userId, isCompleted: true, completedAt: { $gt: from2, $lte: to2 } },
        });
        if (cnt > 0) {
          conversions += cnt;
          convertedUserSet.add(userId);
        }
      }
      const sent = jobs.length;
      const convertedUsers = convertedUserSet.size;
      const conversionRate = sent ? Math.round((convertedUsers / sent) * 100) : 0;
      return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
    },
```

- [ ] **Step 3**: 提交
```bash
git add plugins/zhao-sso/server/src/services/sso-stats.ts
git commit -m "feat(sso): course completion conversion statistics"
```

---

### Task 4: 控制器 + 路由注册（msg-stats / admin.ts）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\msg-stats.ts`（`courseD7Stats` 之后追加方法）
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts`（在 `course-d7-stats` 路由后追加）

- [ ] **Step 1**: 在 `msg-stats.ts` 的 `courseD7Stats` 方法之后追加：

```ts
    async courseCompletionStats(ctx: any) {
      const { from, to } = ctx.query || {};
      try {
        const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseCompletionStats({ from, to });
        ctx.body = { data };
      } catch (e: any) {
        ctx.status = e.status || e.cause?.status || 400;
        ctx.body = { error: e.message };
      }
    },
```

- [ ] **Step 2**: 在 `admin.ts` 中找到 `course-d7-stats` 行，在其后追加（确认该路由已按既有 `adminRoute("GET", ..., "msg-stats.xxx", "sso.msg.read")` 模式书写）：

```ts
      adminRoute("GET", "/msg/course-completion-stats", "msg-stats.courseCompletionStats", "sso.msg.read"),
```

- [ ] **Step 3**: 提交
```bash
git add plugins/zhao-sso/server/src/controllers/msg-stats.ts plugins/zhao-sso/server/src/routes/admin.ts
git commit -m "feat(sso): expose course-completion-stats endpoint"
```

---

### Task 5: 重建 zhao-sso 插件 dist + 启动 dev 冒烟

**Files:** 无源码改动（仅构建产物）

- [ ] **Step 1**: 重建 zhao-sso 插件（Task 3/4 的新方法才会被 dev 加载）：
```bash
cd plugins/zhao-sso && npm run build
```

- [ ] **Step 2**: 启动/重启 dev（`cd e:\code\basic && npm run dev`），确认启动日志无 zhao-sso 加载错误。
- [ ] **Step 3**: 无新提交（dist 收口时统一还原）。

---

### Task 6: web 运营端完课转化报表页

**Files:**
- Create: `e:\code\web\src\pages\msg\courseCompletion.vue`
- Modify: `e:\code\web\src\pages.json`（`pages/msg/courseD7` 后追加）

- [ ] **Step 1**: 创建 `courseCompletion.vue`（与 courseD7.vue 结构一致，改标题/文案/接口）：

```vue
<template>
  <view class="wrap">
    <view class="bar">
      <text>从</text><picker mode="date" :value="from" @change="(e)=>from=e.detail.value"><view class="inp">{{from}}</view></picker>
      <text>至</text><picker mode="date" :value="to" @change="(e)=>to=e.detail.value"><view class="inp">{{to}}</view></picker>
      <button size="mini" @click="load">查询</button>
    </view>
    <view class="tip">完课转化：课程复盘(d7)/醒学(activate)触达送达后 <text>{{s.windowDays || 7}}</text> 天内用户任一挥发完课计为转化</view>

    <view class="cards">
      <view class="card"><text>{{s.sent}}</text><text>送达</text></view>
      <view class="card"><text>{{s.convertedUsers}}</text><text>转化用户</text></view>
      <view class="card"><text>{{s.conversions}}</text><text>转化条数</text></view>
      <view class="card"><text>{{s.conversionRate}}%</text><text>转化率</text></view>
    </view>
  </view>
</template>

<script>
import { getToken } from '@/utils/auth'
export default {
  data() {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);
    return { from: iso(past), to: iso(now), summary: { sent: 0, convertedUsers: 0, conversions: 0, conversionRate: 0, windowDays: 7 } };
  },
  computed: {
    s() { return this.summary || {}; },
  },
  onShow() { this.load(); },
  methods: {
    async load() {
      const token = getToken();
      const params = [];
      if (this.from) params.push('from=' + encodeURIComponent(this.from));
      if (this.to) params.push('to=' + encodeURIComponent(this.to));
      const qs = params.length ? '?' + params.join('&') : '';
      const res = await new Promise((resolve) => {
        uni.request({
          url: '/api/zhao-sso/v1/admin/msg/course-completion-stats' + qs,
          method: 'GET',
          header: token ? { Authorization: 'Bearer ' + token } : {},
          success: (r) => resolve(r),
          fail: () => resolve({ statusCode: 0, data: {} }),
        });
      });
      const d = res.data && res.data.data;
      if (d) this.summary = d.summary;
    },
  },
};
</script>
```

- [ ] **Step 2**: 在 `pages.json` 的 `pages` 数组中、`pages/msg/courseD7` 项后追加：

```json
      { "path": "pages/msg/courseCompletion", "style": { "navigationBarTitleText": "课程完课转化" } }
```

- [ ] **Step 3**: 提交（web 仓库）
```bash
git add src/pages/msg/courseCompletion.vue src/pages.json
git commit -m "feat(msg): course completion conversion report page"
```

---

### Task 7: course-progress service 新增 runActivationReminderScan

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\course-progress.ts`（`getUserProgresses` 方法之后、文件 end 前追加）

- [ ] **Step 1**: 在 service 返回对象中加入该方法（放在既有方法之间，注意逗号分隔）：

```ts
    /**
     * 激活醒学扫描：报名≥3天、未完成且进度<30%、距上次催学与学习均≥7天的用户，桥接 sso 后触发 course.activate。
     * 仅当真实生成任务(非幂等跳过)才回写 lastReminderAt；无启用规则时整体跳过。
     */
    async runActivationReminderScan() {
      const ENROLL_UID = "plugin::zhao-course.course-enrollment";
      const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
      const remindGap = Date.now() - 7 * 86400000;
      const enrolledSince = new Date(Date.now() - 3 * 86400000);

      const ruleCnt = await strapi.db.query(SOP_RULE_UID).count({
        where: { scene: "course.activate", enabled: true },
      });
      if (!ruleCnt) {
        strapi.log.warn("[course-activation] 无启用 course.activate 规则，跳过扫描");
        return { scanned: 0, reminded: 0 };
      }

      const enrolls = await strapi.db.query(ENROLL_UID).findMany({
        where: { status: "enrolled", enrolledAt: { $lte: enrolledSince } },
        populate: { user: { select: ["id"] }, course: { select: ["title"] } },
      });

      let scanned = 0;
      let reminded = 0;
      for (const e of enrolls) {
        const userId = e.user && typeof e.user === "object" ? e.user.id : e.user;
        const courseId = e.course && typeof e.course === "object" ? e.course.id : e.course;
        if (!userId || !courseId) continue;

        const prog = await strapi.db.query(UID).findOne({ where: { user: userId, course: courseId } });
        if (prog && prog.isCompleted) continue;
        const progress = prog ? Number(prog.progress) || 0 : 0;
        if (prog && progress >= 30) continue;
        const lastStudyOk = !prog?.lastStudyAt || new Date(prog.lastStudyAt).getTime() <= remindGap;
        const lastRemindOk = !prog?.lastReminderAt || new Date(prog.lastReminderAt).getTime() <= remindGap;
        if (!lastStudyOk || !lastRemindOk) continue;

        const sop = strapi.plugin("zhao-sso").service("sso-sop");
        const sso = await sop.resolveSsoUserForUpUser(userId);
        if (!sso) continue;

        const title = e.course && typeof e.course === "object" ? e.course.title || "" : "";
        const results = await sop.trigger("course.activate", {
          user: sso.id,
          payload: { course: { title } },
        });
        // 真实建单判定：buildJob 成功返回 {job, skipped:false}
        const built = (results || []).some((r: any) => r && r.job && !r.skipped);
        if (built && prog) {
          await strapi.db.query(UID).update({
            where: { id: prog.id },
            data: { lastReminderAt: new Date() },
          });
        }
        scanned++;
        if (built) reminded++;
      }
      strapi.log.info(`[course-activation] 扫描完成 scanned=${scanned} reminded=${reminded}`);
      return { scanned, reminded };
    },
```

- [ ] **Step 2**: 提交
```bash
git add plugins/zhao-course/server/src/services/course-progress.ts
git commit -m "feat(course): activation reminder scan"
```

---

### Task 8: zhao-course 新增 cron 定时任务

**Files:**
- Create: `e:\code\basic\plugins\zhao-course\server\src\config\cron.ts`

- [ ] **Step 1**: 创建 `cron.ts`（每日 08:00 扫描；参照 `e:\code\basic\plugins\zhao-sso\server\src\config\cron.ts` 的五字段 cron 写法）：

```ts
export default {
  // 每日扫描报名未学用户，触发课程醒学 course.activate（去重由 lastReminderAt + sso-quota 冷却保证）
  "0 8 * * *": async ({ strapi }: { strapi: any }) => {
    try {
      await strapi.plugin("zhao-course").service("course-progress").runActivationReminderScan();
    } catch (err: any) {
      strapi.log.warn(`[zhao-course cron] activation scan failed: ${err.message}`);
    }
  },
};
```

- [ ] **Step 2**: 返回目录（从 plugins/zhao-course 到 basic 根）并提交
```bash
git add plugins/zhao-course/server/src/config/cron.ts
git commit -m "feat(course): daily activation reminder cron"
```

---

### Task 9: 重建 zhao-course 插件 dist

**Files:** 无源码改动（仅构建产物）

- [ ] **Step 1**:
```bash
cd plugins/zhao-course && npm run build
```

- [ ] **Step 2**: 确认 `plugins/zhao-course/dist` 生成新产物（schema 含 completedAt/lastReminderAt、cron 存在）。无新提交。

---

### Task 10: 验收脚本 accept-course-completion.cjs

**Files:**
- Create: `e:\code\basic\scripts\accept-course-completion.cjs`

- [ ] **Step 1**: 参照既有 `e:\code\basic\scripts\accept-course-d7.cjs` 的登录/直连 strapi 模式，覆盖以下断言的验收脚本（关键断言）：

  - `course-progress` 具备 `completedAt` / `lastReminderAt` 列（建表后存在）。
  - **completedAt 幂等**：预插 progress，首 `isCompleted` 写入后时间戳固定；再次 recalculate 不覆盖。
  - **完课转化**：插 `course.d7` 与 `course.activate` 各 1 条 sent job + 对应 up/sso 用户，窗口内 complete→count=2；窗口外→不计；未绑定 sso→跳过。
  - **接口**：`GET /v1/admin/msg/course-completion-stats` 返回四卡；`from>to` 返回 400。
  - **激活扫描去重**：无启用 `course.activate` 规则时扫描 skipped；有规则未绑定→不建单；命中→触发且写 lastReminderAt；7 天内再扫→不重复（lastReminderAt 拦截）。
  - 最后清理所有预插数据 + `git restore dist/`（若任务脚本改写过根 dist）。

- [ ] **Step 2**: 运行验收：`node scripts/accept-course-completion.cjs`，期望退出码 0、全 PASS。
- [ ] **Step 3**: 提交
```bash
git add scripts/accept-course-completion.cjs
git commit -m "test(course): acceptance for completion activation"
```

---

### Task 11: 三仓库收口推送

**Files:** 无源码改动

- [ ] **Step 1**: 停本机 dev（若在跑）、`git restore dist/` 还原根 app dist、删除期间产生的 `_*.cjs` 临时诊断脚本。
- [ ] **Step 2**: basic 推送（含 spec/plan/全部后端改动）：
```bash
cd e:\code\basic && git add -A && git commit -m "feat(course): completion attribution + activation SOP" ; git push
```
（如无未提交则直接 `git push`）
- [ ] **Step 3**: web 推送：
```bash
cd e:\code\web && git push
```
- [ ] **Step 4**: 复核 basic / web / shao 三仓库均无未推送提交（`git status` 与 `git log origin/main..HEAD` 为空）。
- [ ] **Step 5**: 更新 project_memory.md（阶段十八：完课归因 + 激活SOP 落地；记录 completedAt/lastReminderAt 语义、激活扫描去重规则、重建 dist 教训）。