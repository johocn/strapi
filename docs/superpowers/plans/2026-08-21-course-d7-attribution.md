# 课程 D7 转化归因 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 zhao-sso 增加「课程 D7 转化归因」纯查询报表，衡量 course_d7 触达后窗口内用户再报新课的转化，并在 web 运营端新增看板页。

**Architecture:** 完全镜像既有活动复购归因（`getRepurchaseStats`）：查询 scene=`course.d7` 送达 job，经 sso→upUser 桥接，统计窗口内新建 `course-enrollment`(status=enrolled) 的转化。新增 service 方法 + controller handler + 路由 + web 页面 + 验收脚本，不落库、不新增依赖。

**Tech Stack:** Strapi plugin (zhao-sso / zhao-course / zhao-point)，web HBuilder 前端，cjs 验收脚本。

---

### Task 1: sso-stats 新增 getCourseD7Stats

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\services\sso-stats.ts`

- [ ] **Step 1: 新增常量与取值**
  在文件顶部确认 `SOP_RULE_UID`/`MSG_JOB_UID` 常量已存在，新增课程报名 UID 常量：
  ```ts
  const COURSE_ENROLL_UID = "plugin::zhao-course.course-enrollment";
  ```

- [ ] **Step 2: 新增 getCourseD7Stats 方法（追加到活动归因之后）**
  完全对齐 `getRepurchaseStats`，仅替换 scene=course.d7、归因表为 course-enrollment：
  ```ts
  async getCourseD7Stats(opts: { from?: string; to?: string }) {
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
      where: { scene: "course.d7", status: "sent", sentAt: { $gte: from, $lte: to } },
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
      const cnt = await strapi.db.query(COURSE_ENROLL_UID).count({
        where: { user: userId, status: "enrolled", enrolledAt: { $gt: from2, $lte: to2 } },
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

- [ ] **Step 3: 自查**
  grep 确认无 `console.log`/`DEBUG` 调试残留；确认 `DATE_MS` 在文件顶部已定义。

---

### Task 2: controller + 路由注册

**Files:**
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\controllers\msg-stats.ts`
- Modify: `e:\code\basic\plugins\zhao-sso\server\src\routes\admin.ts`

- [ ] **Step 1: msg-stats 新增 handler**
  在 `repurchaseStats` 后追加：
  ```ts
  async courseD7Stats(ctx: any) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseD7Stats({ from, to });
      ctx.body = { data };
    } catch (e: any) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  ```

- [ ] **Step 2: admin.ts 注册路由**
  在复购路由旁追加：
  ```ts
  adminRoute("GET", "/msg/course-d7-stats", "msg-stats.courseD7Stats", "sso.msg.read"),
  ```

- [ ] **Step 3: 自查**
  确认 handler 名与路由 handler 字符串完全一致；无调试残留。

---

### Task 3: web 前端页面

**Files:**
- Create: `e:\code\web\src\pages\msg\courseD7.vue`

- [ ] **Step 1: 页面实现（镜像 repurchase.vue）**
  顶部日期筛选（from/to）+ 说明“送达的课程 D7 触达后 {{s.windowDays||7}} 天内用户再报名其他课程计为转化” + 送达/转化用户/转化条数/转化率 4 卡片，请求 `/api/zhao-sso/v1/admin/msg/course-d7-stats`。

- [ ] **Step 2: 对照字段**
  按后端 summary 契约（sent/convertedUsers/conversions/conversionRate/windowDays）读取，reject rows 空态为 0。

---

### Task 4: 验收脚本

**Files:**
- Create: `e:\code\basic\scripts\accept-course-d7.cjs`

- [ ] **Step 1: 编写验收脚本（命名规范 scripts/accept-*.cjs）**
  预插 sso users 桥接 + 制造 scene=course.d7 sent job，样本含窗口内转化/窗口外不转化，断言 sent/convertedUsers/conversions/conversionRate；覆盖 from>to 400 与无数据全 0；运行 `npm run dev`（e:\code\basic，端口 1337）实测。

- [ ] **Step 2: 清理零残留**
  脚本结束恢复/删除预插数据，不残留 job 与 enrollment；测试后停 dev，`git restore dist/` 还原编译产物。

---

### Task 5: 三仓库收口推送

- [ ] **Step 1:** `git add` 变更文件（sso-stats.ts、msg-stats.ts、routes/admin.ts、courseD7.vue、accept-course-d7.cjs、spec/plan 文档），commit 到 basic；web 各自 commit。
- [ ] **Step 2:** 推送 basic/web；确认 `origin/main` 无未推送提交。