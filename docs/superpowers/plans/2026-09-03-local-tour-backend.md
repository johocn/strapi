# 在地·剧本游 · MVP 后端基座 —— 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有「活动」闭环上落地剧本游后端口径——给 `activity` 加旅游字段、新增 `tour-story` 剧目内容类型、提供打卡/答题/终章兑奖接口并复用积分与核销（新增逻辑全部放进现有 activity 服务+控制器，DRY）。

**Architecture:** 方案 A（扩展活动）。新增 1 个轻量 content-type `tour-story`（剧目配置），扩展 `activity`（tourMode/itinerary/story 关联）与 `activity-signup`（tourProgress 进度）字段；剧本进度与兑奖接口挂在现有 `plugin::zhao-point.activity` 服务/控制器，复用其 `getUserId`（SSO 桥接）、`resolveUserChannelId`、`earnPointsSafe`、`wrap`，不新建额外服务/控制器。到站打卡=幂等写 `tourProgress.stations`

**Tech Stack:** Strapi 4 插件 `zhao-point`（后端）。前端 C 端剧本层与运营端配置属**后续独立计划**，本计划只做后端基座（含 API 契约），保证可独立构建验证。

**部署纪律（铁律）:** `server/src` 改动后必须本地 `npm run build` 重建 dist，随源码一起 commit + push，再走部署脚本并重启；构建/自检用 `rg` 在 `plugins/zhao-point/dist/server/index.mjs` 里 grep 新标识（如 `tourCheckinStation`），无命中=未重建，禁止部署。2G 服务器严禁在线构建。

---
### Task 1: 扩展 activity schema（旅游字段）

**Files:**
- Modify: `plugins/zhao-point/server/src/content-types/activity/schema.json`（attributes 末尾、`customPromoActive` 之后）

- [ ] **Step 1: 在 attributes 末尾追加三个旅游字段**

仿照现有属性格式，在 `customPromoActive`（末行）后追加：

```json
  "tourMode": { "type": "boolean", "default": false },
    "itinerary": { "type": "json" },
    "story": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.tour-story", "inversedBy": "activities" }
```

注意：新增关系字段 `story` 的目标内容类型 `tour-story` 尚未创建，若先启动会校验失败，因此必须先完成 Task 2 注册后再重启。

- [ ] **Step 2: 无测试 → 结构校验（依赖 Task 2 完成后）**
最终校验放到 Task 7 构建/重启阶段统一做。

### Task 2: 新建 tour-story content-type（剧目配置）

**Files:**
- Create: `plugins/zhao-point/server/src/content-types/tour-story/schema.json`
- Modify: `plugins/zhao-point/server/src/content-types/index.ts`

- [ ] **Step 1: 创建 schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "tour_stories",
  "info": { "singularName": "tour-story", "pluralName": "tour-stories", "displayName": "Tour Story", "description": "在地剧本游·剧目（线路剧本）" },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "title": { "type": "string", "required": true },
    "lineTitle": { "type": "string" },
    "backdrop": { "type": "text", "description": "剧目背景/剧情引子" },
    "roles": { "type": "json", "description": "[{id,name,desc}] 可选角色" },
    "mainPuzzle": { "type": "text", "description": "主线谜题说明" },
    "answer": { "type": "string", "description": "谜底（MVP 明文；如需安全可改存哈希+比哈希）" },
    "hint": { "type": "text" },
    "stationPoints": { "type": "integer", "default": 10 },
    "mainPoints": { "type": "integer", "default": 50 },
    "finalePoints": { "type": "integer", "default": 100 },
    "guideName": { "type": "string" },
    "activities": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-point.activity", "mappedBy": "story" }
  }
}
```

- [ ] **Step 2: 在 content-types/index.ts 登记**

在 activities import 区前追加 import，并在 export default 对象里追加键：

```ts
import tourStory from "./tour-story/schema.json";
```
```ts
  "activity-share-visit": { schema: activityShareVisit },
```
之后（任意位置，配平对象即可）加：
```ts
  "tour-story": { schema: tourStory },
```

### Task 3: 扩展 activity-signup schema（剧本进度）

**Files:**
- Modify: `plugins/zhao-point/server/src/content-types/activity-signup/schema.json`

- [ ] **Step 1: 追加 tourProgress 字段**

在 `preQuestionnaireData`（末行）后追加：

```json
    "tourProgress": { "type": "json", "description": "剧本游进度 {stations:[order],mainSolved,mainSolvedAt,finaleClaimed,claimedAt}" }
```

说明：报名兴趣标签不需要新列——`interestTags` 由 C 端随 `formData` 提交即落库（signup=用户×活动，`activity_signups.formData` 已存在），后端主流程不改。

### Task 4: activity.service.ts 增加剧本游方法

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`

前置确认（可信）：文件顶部已有常量 `ACTIVITY_UID`、`SIGNS_UID`；模块级已有 `earnPointsSafe(strapi,userId,action,points,remark,userChannelId?)`、`resolveUserChannelId(strapi,userId)`、`class`/`wrap` 不在本文件（wrap 在 controller）。新增方法用模块级 helper + 追加进 `return { ... }` 对象。

- [ ] **Step 1: 新增 TourError + 查找工具（模块级，放在文件内其它 helper 附近）**

```ts
/** 剧本游业务错误（controller 捕获 e.code 转 400） */
class TourError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// 取用户在指定活动（且打通旅游模式）active 报名记录，含剧目
async function findTourSignup(strapi: any, userId: number, documentId: string) {
  const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId, populate: ["story"] });
  if (!act || !act.tourMode) throw new TourError("NOT_TOUR", "该活动不是剧本游");
  const signup = await strapi.db.query(SIGNS_UID).findOne({
    where: { activity: act.id, user: userId, status: "active" },
  });
  return { act, signup };
}
```

- [ ] **Step 2: 新增四个剧本游方法（模块级函数）**

```ts
// 剧本主视角：剧目信息 + 该用户进度
async function tourStory(args: { documentId: string; userId: number }) {
  const { act, signup } = await findTourSignup(strapi, args.userId, args.documentId);
  if (!signup) throw new TourError("NOT_SIGNED", "请先报名");
  const s = act.story || {};
  return {
    tourMode: true,
    title: act.title,
    backdrop: s.backdrop || "",
    roles: Array.isArray(s.roles) ? s.roles : [],
    itinerary: Array.isArray(act.itinerary) ? act.itinerary : [],
    mainPuzzle: s.mainPuzzle || "",
    hint: s.hint || "",
    stationPoints: s.stationPoints ?? 10,
    mainPoints: s.mainPoints ?? 50,
    finalePoints: s.finalePoints ?? 100,
    guideName: s.guideName || "",
    progress: signup.tourProgress || null,
  };
}

// 到站打卡：幂等，发站点头积分
async function tourCheckinStation(args: { documentId: string; userId: number; stationOrder: any }) {
  const order = Number(args.stationOrder);
  const { act, signup } = await findTourSignup(strapi, args.userId, args.documentId);
  if (!signup) throw new TourError("NOT_SIGNED", "请先报名");
  const station = (Array.isArray(act.itinerary) ? act.itinerary : []).find((it: any) => Number(it.order) === order);
  if (!station) throw new TourError("BAD_STATION", "站点不存在");
  const prev = signup.tourProgress && typeof signup.tourProgress === "object" ? signup.tourProgress : {};
  const stations: number[] = Array.isArray(prev.stations) ? prev.stations : [];
  if (stations.includes(order)) return { already: true, progress: { ...prev, stations } };
  stations.push(order);
  const next = { ...prev, stations };
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { tourProgress: next } });
  const userChannelId = await resolveUserChannelId(strapi, args.userId);
  await earnPointsSafe(strapi, args.userId, "tour_checkin", act.story?.stationPoints ?? 10, `剧本打卡·${station.name || `第${order}站`}`, userChannelId);
  return { already: false, progress: next };
}

// 主线谜底答题：答对发主线积分；幂等
async function tourAnswerMain(args: { documentId: string; userId: number; answer?: any }) {
  const { act, signup } = await findTourSignup(strapi, args.userId, args.documentId);
  if (!signup) throw new TourError("NOT_SIGNED", "请先报名");
  const expected = ((act.story?.answer || "") as string).toString().trim().toLowerCase();
  const given = ((args.answer as string) || "").toString().trim().toLowerCase();
  const prev = signup.tourProgress && typeof signup.tourProgress === "object" ? signup.tourProgress : {};
  if (prev.mainSolved) return { correct: true, already: true, progress: prev };
  if (expected && given !== expected) return { correct: false, already: false, progress: prev };
  const next = { ...prev, mainSolved: true, mainSolvedAt: new Date().toISOString() };
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { tourProgress: next } });
  const userChannelId = await resolveUserChannelId(strapi, args.userId);
  await earnPointsSafe(strapi, args.userId, "tour_main", act.story?.mainPoints ?? 50, "剧本谜底破解", userChannelId);
  return { correct: true, already: false, progress: next };
}

// 选择角色：落 progress.role（幂等，可改）
async function tourChooseRole(args: { documentId: string; userId: number; role?: any }) {
  const { act, signup } = await findTourSignup(strapi, args.userId, args.documentId);
  if (!signup) throw new TourError("NOT_SIGNED", "请先报名");
  const role = typeof args.role === "string" ? args.role : "";
  const prev = signup.tourProgress && typeof signup.tourProgress === "object" ? signup.tourProgress : {};
  const next = { ...prev, role };
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { tourProgress: next } });
  return { progress: next };
}

// 终章兑奖：需集齐站点 + 主线已破，发终章积分一次
async function tourClaimFinale(args: { documentId: string; userId: number }) {
  const { act, signup } = await findTourSignup(strapi, args.userId, args.documentId);
  if (!signup) throw new TourError("NOT_SIGNED", "请先报名");
  const prev = signup.tourProgress && typeof signup.tourProgress === "object" ? signup.tourProgress : {};
  const stations: number[] = Array.isArray(prev.stations) ? prev.stations : [];
  const total = Array.isArray(act.itinerary) ? act.itinerary.length : 0;
  if (total > 0 && stations.length < total) throw new TourError("STATIONS_INCOMPLETE", "站点未完，无法兑终章奖");
  if (!prev.mainSolved) throw new TourError("MAIN_UNSOLVED", "主线谜底未破解");
  if (prev.finaleClaimed) return { already: true, progress: prev };
  const next = { ...prev, finaleClaimed: true, claimedAt: new Date().toISOString() };
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { tourProgress: next } });
  const userChannelId = await resolveUserChannelId(strapi, args.userId);
  await earnPointsSafe(strapi, args.userId, "tour_finale", act.story?.finalePoints ?? 100, "剧本终章兑奖", userChannelId);
  return { already: false, progress: next };
}
```

- [ ] **Step 3: 将这 5 个方法追加进 service 返回对象**

在现有 `return { ... }` 对象内追加（任意一组 key 后，保证对象合法）：
```ts
  tourStory,
  tourChooseRole,
  tourCheckinStation,
  tourAnswerMain,
  tourClaimFinale,
```

### Task 5: 注册剧本游路由（content-api）

**Files:**
- Modify: `plugins/zhao-point/server/src/routes/content-api.ts`

- [ ] **Step 1: 追加 5 条注册用户路由**（在现有 activity 报名相关 userRoute 附近、管理员路由之前）

```ts
    userRoute("GET", "/my/activity/:documentId/tour/story", "activity.tourStory"),
    userRoute("POST", "/my/activity/:documentId/tour/choose-role", "activity.tourChooseRole"),
    userRoute("POST", "/my/activity/:documentId/tour/checkin-station", "activity.tourCheckinStation"),
    userRoute("POST", "/my/activity/:documentId/tour/answer-main", "activity.tourAnswerMain"),
    userRoute("POST", "/my/activity/:documentId/tour/claim-finale", "activity.tourClaimFinale"),
```

### Task 6: 注册 controller actions

**Files:**
- Modify: `plugins/zhao-point/server/src/controllers/activity.ts`

说明：`getUserId(ctx)`、`wrap()` 已在本文件模块或范围内可用。

- [ ] **Step 1: 新增统一 action 工厂**（放在文件内其它 action 附近，模块/闭包内均可）

```ts
  // 剧本游 action 统一处理：SSO 桥接取 user id + 调用 service + 业务错误转 400
  const tourAction = (method: string) => async (ctx: any) => {
    try {
      const userId = await getUserId(ctx);
      const service = strapi.service("plugin::zhao-point.activity");
      const result = await service[method]({ documentId: ctx.params.documentId, userId, ...ctx.request.body });
      return wrap(result);
    } catch (e: any) {
      if (e && e.code) return ctx.badRequest(e.message, { code: e.code });
      throw e;
    }
  };
```

- [ ] **Step 2: 在 controller 返回对象里追加 5 个 action**

```ts
    tourStory: tourAction("tourStory"),
    tourChooseRole: tourAction("tourChooseRole"),
    tourCheckinStation: tourAction("tourCheckinStation"),
    tourAnswerMain: tourAction("tourAnswerMain"),
    tourClaimFinale: tourAction("tourClaimFinale"),
```

### Task 7: 构建 + 部署自检（项目铁律）

**Files:**
- Build: `plugins/zhao-point`（node_modules 本地已就绪，2G 服务器禁止在线构建，必须本地构建）

- [ ] **Step 1: 本地重建 dist**

```bash
cd e:\code\basic\plugins\zhao-point && npm run build
```
期望：`vite build` 完成、`dist/server/index.js` 与 `index.mjs` 生成。（zhao-point 构建常有存量 TypeScript 类型告警，属既有问题，不影响产物——以 dist 中存在新标识为准。）

- [ ] **Step 2: 自检产物包含新逻辑（必须命中）**

```bash
cd e:\code\basic && rg -c "tourCheckinStation" plugins/zhao-point/dist/server/index.mjs
```
期望：命中次数 ≥ 1（出现即表示新接口已进 dist）。若为 0=未重建，禁止提交部署，回 Task 4 检查。

- [ ] **Step 3: 端到端一致性自检清单**
- schema 三处（activity/tour-story/activity-signup）已改；
- content-types/index 登记了 `tour-story`；
- routes 5 条、controller 5 个、service 5 个已挂（tourStory/tourChooseRole/tourCheckinStation/tourAnswerMain/tourClaimFinale）。

### Task 8: 提交 + 部署 + 重启 + 结构校验

**Files:**（随上面改动一起提交）
- Modified: `plugins/zhao-point/server/src/content-types/activity/schema.json`, `content-types/activity-signup/schema.json`, `content-types/index.ts`, `routes/content-api.ts`, `controllers/activity.ts`, `services/activity.ts`, `dist/server/index.js`, `dist/server/index.mjs`
- Created: `content-types/tour-story/schema.json`, `dist/server/index.js`, `dist/server/index.mjs`

- [ ] **Step 1: 分两个 commit 提交源码与 dist**

```bash
cd e:\code\basic
git add plugins/zhao-point/server plugins/zhao-point/dist
git commit -m "feat(zhao-point): 剧本游后端基座——activity 旅游字段 + tour-story + 打卡/答题/终章兑奖接口"
git push origin main
```

- [ ] **Step 2: 走部署脚本发布到 joho 并重启（复用无新增依赖路径）**

本地新建 runner（SSH 转义避免直接内联 `$PATH`）：
```bash
#!/bin/bash
set -e
cd /www/apps/strapi || exit 1
export PATH=/home/admin/.nvm/versions/node/v22.23.1/bin:/usr/bin:/bin:$PATH
export PM2_HOME=/home/admin/.pm2
exec bash ./docs/deployment/deploy-zhao-sso.sh
```
scp 到 joho 后执行即可（fast-forward 拉取 + 重启，触发 Strapi schema 自动建列/建表）。

- [ ] **Step 3: 结构校验 schema 生效**
本地 `ssh joho "bash /tmp/verify_tour.sh"`，verify_tour.sh 用 postgres 容器查新表/列：
```bash
#!/bin/bash
DB_PASS=$(grep -E '^DATABASE_PASSWORD=' /www/apps/strapi/.env | cut -d= -f2-)
export PGPASSWORD="$DB_PASS"
echo "tour_stories 表:"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT to_regclass('public.tour_stories');" 2>&1 | head -3
echo "activity_signups.tour_progress 列数(应为1):"
docker exec 1Panel-postgresql-pIe0 psql -U strapi -d strapi -t -A -c "SELECT count(*) FROM information_schema.columns WHERE table_name='activity_signups' AND column_name='tour_progress';" 2>&1 | head -3
```
期望：`tour_stories` 返回不为空；`activity_signups.tour_progress` 列数 = 1（Strapi 启动时自动按其 snake_case 命名，`tourProgress`→`tour_progress`）。若 0 或表缺失，先查 pm2 日志有无 schema 报错再排查。

- [ ] **Step 4: 清理** 删除本地与 joho /tmp 的临时 runner/verify 脚本。