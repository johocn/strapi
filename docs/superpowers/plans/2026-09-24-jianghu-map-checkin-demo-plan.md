# 江湖录 Demo A「古风地图打卡册」实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `e:\code\jianghu-client\demo` 新建一个独立可删的 Vue3 H5 demo，跑通「地图 → 点位 → 互动 → 落章 → 图鉴 → 解锁下一段路」完整闭环。

**Architecture:** 三层严格分离。`src/shared/` 是纯 TS、零依赖、框架无关的数据与规则层（types / content / engine / rules / persist），可被 vitest 直接单测，日后可原样搬进小游戏；`src/platform/` 是平台能力出口（当前 H5 localStorage，日后换 wx）；`src/views/album/` 是表现层，只读 `shared/` 导出的纯函数结果，改状态只能通过 `engine` 导出的函数。地图用 SVG 代码绘制，零美术素材依赖。

**Tech Stack:** Vue 3.4、TypeScript 5.5、Vite 5、Vitest 2、vue-tsc 2。无运行时第三方依赖（仅 vue）。

**Spec:** `docs/superpowers/specs/2026-09-24-jianghu-map-checkin-demo-design.md`

---

## 执行前置约束（务必先读）

1. **`e:\code\jianghu-client` 不是独立 git 仓库**，它属于 `e:\code` 仓库（`git rev-parse --show-toplevel` = `E:/code`）。
2. `e:\code` 工作区**存在大量与本任务无关的未提交改动**。提交时**只 `git add` 本计划列出的具体文件**，**严禁 `git add -A` / `git add .`**。
3. 本仓库约定：**未经用户明确同意不执行 `git commit`**。每个 Task 末尾的提交步骤，执行前必须先向用户确认；用户未确认时跳过该步，继续下一个 Task。
4. `demo/` 目录当前不存在，本计划所有文件均为新建。
5. 旧代码 `jianghu-client/shells`、`core`、`content` **一律不改动、不 import**。

## 文件结构（锁定分解）

| 文件 | 职责 |
|---|---|
| `demo/package.json` | 独立包定义与脚本 |
| `demo/vite.config.ts` | vite + vue 插件 + vitest include |
| `demo/tsconfig.json` | strict TS 配置 |
| `demo/index.html` | H5 入口 |
| `demo/.gitignore` | 忽略 `node_modules/` `dist/` |
| `demo/src/env.d.ts` | `vite/client` 类型引用 |
| `demo/src/style.css` | 全局重置与宣纸底色 |
| `demo/src/main.ts` | 挂载 AlbumApp |
| `demo/src/shared/types.ts` | 全部类型契约（唯一真源） |
| `demo/src/shared/content.ts` | 占位剧情数据（2 路段 / 6 点位 / 6 见闻录） |
| `demo/src/shared/engine.ts` | `createState` / `applyEffects` / `checkAnswer` / `markVisited` |
| `demo/src/shared/rules.ts` | `sectionUnlocked` / `pointState` / `albumGaps` / `progress` |
| `demo/src/shared/persist.ts` | 存档读写，只依赖注入的 `StorageLike` |
| `demo/src/platform/storage.ts` | H5 localStorage 实现 |
| `demo/src/platform/index.ts` | 平台出口（唯一替换点） |
| `demo/src/views/album/AlbumApp.vue` | 表现层壳：持有状态、调度、HUD |
| `demo/src/views/album/MapCanvas.vue` | SVG 古风地图 + 点位印章三态 |
| `demo/src/views/album/PointCard.vue` | 底部点位卡片 + 旁白逐行渐显 + 判定调度 |
| `demo/src/views/album/StampBurst.vue` | 落章飞行动画 |
| `demo/src/views/album/AlbumPanel.vue` | 见闻录 / 行脚印两页签 |
| `demo/src/views/album/interacts/ChoiceBox.vue` | 选择互动 |
| `demo/src/views/album/interacts/ComposeBox.vue` | 接句拼词互动 |
| `demo/src/views/album/interacts/OrderBox.vue` | 上下调序互动 |
| `demo/tests/content.test.ts` | 内容自洽性测试 |
| `demo/tests/rules.test.ts` | 规则纯函数测试 |
| `demo/tests/engine.test.ts` | 引擎测试（含幂等性） |
| `demo/tests/persist.test.ts` | 存档测试（内存 StorageLike） |

**边界铁律（违反即返工）**
- `src/shared/**` 禁止 `import` 任何 Vue API、禁止访问 `window` / `document` / `localStorage`。
- `src/views/**` 禁止直接赋值修改 `GameState` 的字段，只能把 `engine` 导出的函数返回值整体赋回。
- `src/shared/**` 禁止 `import` `src/views/**` 或 `src/platform/**`。

---

### Task 1: demo 包骨架

**Files:**
- Create: `e:\code\jianghu-client\demo\package.json`
- Create: `e:\code\jianghu-client\demo\vite.config.ts`
- Create: `e:\code\jianghu-client\demo\tsconfig.json`
- Create: `e:\code\jianghu-client\demo\index.html`
- Create: `e:\code\jianghu-client\demo\.gitignore`
- Create: `e:\code\jianghu-client\demo\src\env.d.ts`
- Create: `e:\code\jianghu-client\demo\src\style.css`
- Create: `e:\code\jianghu-client\demo\src\main.ts`
- Create: `e:\code\jianghu-client\demo\src\views\album\AlbumApp.vue`（临时占位，Task 11 覆盖）

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "@jianghu/demo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "typecheck": "vue-tsc --noEmit",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "vue-tsc": "^2.1.0"
  }
}
```

- [ ] **Step 2: 创建 `vite.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "./",
  build: { outDir: "dist", emptyOutDir: true },
  test: { include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 3: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "tests/**/*.ts"]
}
```

- [ ] **Step 4: 创建 `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>江湖录 · 行脚图（Demo A）</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 `.gitignore`**

```
node_modules/
dist/
```

（根 `.gitignore` 只忽略 `node_modules`，不忽略 `dist`，故此处必须显式声明。）

- [ ] **Step 6: 创建 `src/env.d.ts`**

```ts
/// <reference types="vite/client" />
```

（不要写 `declare module "*.vue"` 垫片——vue-tsc 会原生解析 `.vue` 并给出组件 props 类型，垫片会把它降级成 `any`。）

- [ ] **Step 7: 创建 `src/style.css`**

```css
* { box-sizing: border-box; }

html,
body,
#app { height: 100%; margin: 0; }

body {
  background: #efe8db;
  color: #3b342c;
  font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

button {
  font: inherit;
  color: inherit;
  cursor: pointer;
}
```

- [ ] **Step 8: 创建 `src/main.ts`**

```ts
import { createApp } from "vue";
import AlbumApp from "./views/album/AlbumApp.vue";
import "./style.css";

createApp(AlbumApp).mount("#app");
```

- [ ] **Step 9: 创建临时占位 `src/views/album/AlbumApp.vue`**

```vue
<template>
  <div class="placeholder">江湖录 Demo A · 骨架就位</div>
</template>

<style scoped>
.placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 20px;
  letter-spacing: 4px;
}
</style>
```

- [ ] **Step 10: 安装依赖**

Run: `npm install`（cwd = `e:\code\jianghu-client\demo`）
Expected: 生成 `node_modules/` 与 `package-lock.json`，无 ERESOLVE 报错。

- [ ] **Step 11: 验证骨架能构建**

Run: `npm run build`（cwd = `e:\code\jianghu-client\demo`）
Expected: `vue-tsc --noEmit` 无报错；`dist/index.html` 与 `dist/assets/*.js` 生成。

- [ ] **Step 12: 提交（需用户确认）**

```bash
git add jianghu-client/demo/package.json jianghu-client/demo/package-lock.json jianghu-client/demo/vite.config.ts jianghu-client/demo/tsconfig.json jianghu-client/demo/index.html jianghu-client/demo/.gitignore jianghu-client/demo/src/env.d.ts jianghu-client/demo/src/style.css jianghu-client/demo/src/main.ts jianghu-client/demo/src/views/album/AlbumApp.vue
git commit -m "chore(demo): 新建江湖录 A 版 demo 包骨架（vue3 + vite + vitest）"
```

---

### Task 2: 类型契约 `shared/types.ts`

**Files:**
- Create: `e:\code\jianghu-client\demo\src\shared\types.ts`

- [ ] **Step 1: 创建 `types.ts`（完整内容）**

```ts
// 全部类型契约的唯一真源。本文件禁止 import 任何东西。
export type PointState = "locked" | "ready" | "done";

export interface ChoiceInteract {
  kind: "choice";
  prompt: string;
  options: { id: string; label: string; correct?: boolean }[];
}

export interface ComposeInteract {
  kind: "compose";
  prompt: string; // 上句
  pool: string[]; // 候选词（含干扰项）
  answer: string[]; // 正确词序
}

export interface OrderInteract {
  kind: "order";
  prompt: string;
  items: { id: string; label: string }[]; // 已打乱的初始顺序
  answer: string[]; // 正确 id 顺序
}

export type Interact = ChoiceInteract | ComposeInteract | OrderInteract;

export interface Effect {
  setFlags?: string[];
  giveItems?: { id: string; name: string }[];
  stampId?: string; // 行脚印
  albumId?: string; // 见闻录条目
  score?: number; // 见闻值
}

export interface GamePoint {
  id: string;
  name: string;
  x: number; // 地图归一化坐标 0..1
  y: number;
  seal: string; // 印章上的单字
  lines: string[]; // 旁白 / 对话（占位）
  interact: Interact;
  effect: Effect;
  sectionId: string; // 归属路段
  requiresFlag?: string; // 前置 flag
  unlockHint?: string; // 被挡时的提示
}

export interface Section {
  id: string;
  name: string;
  requiresStamps: number;
  requiresScore: number;
}

export interface AlbumEntry {
  id: string;
  name: string;
  desc: string;
}

export interface GameState {
  flags: string[];
  bag: { id: string; name: string }[];
  stamps: string[];
  album: string[];
  score: number;
  visited: string[]; // 已读过的点位
}

export interface Progress {
  score: number;
  stamps: number;
  totalStamps: number;
  totalAlbum: number;
}

export interface AlbumGaps {
  got: AlbumEntry[];
  missing: AlbumEntry[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`（cwd = `e:\code\jianghu-client\demo`）
Expected: 无报错（此时 `shared/` 只有类型，无运行时引用）。

---

### Task 3: 占位内容 `shared/content.ts`

**Files:**
- Create: `e:\code\jianghu-client\demo\src\shared\content.ts`
- Test: `e:\code\jianghu-client\demo\tests\content.test.ts`

- [ ] **Step 1: 写失败测试 `tests/content.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { albumEntries, points, sections } from "../src/shared/content";
import { checkAnswer } from "../src/shared/engine";

describe("content 占位数据", () => {
  it("6 个点位、2 个路段、6 条见闻录", () => {
    expect(points).toHaveLength(6);
    expect(sections).toHaveLength(2);
    expect(albumEntries).toHaveLength(6);
  });

  it("点位 id 唯一，且每个点位都有对应见闻录条目", () => {
    const ids = points.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of points) {
      expect(albumEntries.some((a) => a.id === p.effect.albumId)).toBe(true);
    }
  });

  it("每个点位的 sectionId 都存在", () => {
    for (const p of points) {
      expect(sections.some((s) => s.id === p.sectionId)).toBe(true);
    }
  });

  it("每个点位自带的正确答案都能通过 checkAnswer", () => {
    for (const p of points) {
      const interact = p.interact;
      const answer =
        interact.kind === "choice"
          ? interact.options.find((o) => o.correct)?.id
          : interact.answer;
      expect(checkAnswer(interact, answer), `${p.id} 答案自检`).toBe(true);
    }
  });

  it("三种互动各出现两次", () => {
    const kinds = points.map((p) => p.interact.kind);
    expect(kinds.filter((k) => k === "choice")).toHaveLength(2);
    expect(kinds.filter((k) => k === "order")).toHaveLength(2);
    expect(kinds.filter((k) => k === "compose")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: FAIL —— 找不到模块 `../src/shared/content`。

> 注意：本测试文件还依赖 `../src/shared/engine` 的 `checkAnswer`（Task 5 才创建）。
> 因此 **Task 3 只负责创建 `content.ts` 与 `content.test.ts`，不要求此时测试变绿**；
> `content.test.ts` 的验收放在 **Task 5 Step 4** 统一执行。

- [ ] **Step 3: 创建 `src/shared/content.ts`（完整内容）**

```ts
import type { AlbumEntry, GamePoint, Section } from "./types";

export const sections: Section[] = [
  { id: "s1", name: "段一 · 松花江渡口", requiresStamps: 0, requiresScore: 0 },
  { id: "s2", name: "段二 · 龙潭山道", requiresStamps: 3, requiresScore: 30 },
];

export const albumEntries: AlbumEntry[] = [
  { id: "ferry_notice", name: "渡口告示", desc: "墨迹未干的封路榜，印泥比字还新。" },
  { id: "wine_jar", name: "江滩酒坛", desc: "青瓷泥封，坛底拓着一枚多出刻痕的印。" },
  { id: "boatman", name: "老船家", desc: "在渡口撑了半辈子船，认得山里每一道水纹。" },
  { id: "longtan", name: "龙潭", desc: "水色青碧见底，寒雾终年不散。" },
  { id: "monk", name: "守山僧", desc: "守着断了信香的雪松，等一个看得破局的人。" },
  { id: "pine", name: "山巅孤松", desc: "山巅一株孤松，风过时像是在说什么。" },
];

// points 的数组顺序即驿道的行进顺序，MapCanvas 依赖此顺序串路。
export const points: GamePoint[] = [
  {
    id: "ferry_notice",
    name: "渡口告示",
    x: 0.16,
    y: 0.74,
    seal: "渡",
    sectionId: "s1",
    lines: [
      "晨雾锁着江面，渡口木柱上钉着一卷告示。",
      "「龙潭山塌方封路，北上请改走旱道。」",
      "落款墨迹未干，印是新盖的——官府文书断不会如此仓促。",
    ],
    interact: {
      kind: "choice",
      prompt: "这纸告示，你怎么看？",
      options: [
        { id: "o1", label: "像是急着贴上去的，印泥都没干透", correct: true },
        { id: "o2", label: "官府文书向来如此，不必多想" },
        { id: "o3", label: "先撕下来带走再说" },
      ],
    },
    effect: {
      setFlags: ["saw_notice"],
      stampId: "ferry_notice",
      albumId: "ferry_notice",
      score: 10,
    },
  },
  {
    id: "wine_jar",
    name: "江滩酒坛",
    x: 0.3,
    y: 0.62,
    seal: "坛",
    sectionId: "s1",
    lines: [
      "芦苇丛里半埋着一只青瓷酒坛，坛身满是潮苔。",
      "泥封完好，少说沉了三年。",
    ],
    interact: {
      kind: "order",
      prompt: "要取坛里的东西，把开坛的步骤理一理。",
      items: [
        { id: "s3", label: "启封闻香" },
        { id: "s1", label: "拂去坛身潮苔" },
        { id: "s2", label: "敲松封口干泥" },
      ],
      answer: ["s1", "s2", "s3"],
    },
    effect: {
      setFlags: ["jar_done"],
      giveItems: [{ id: "wine", name: "陈酒" }],
      stampId: "wine_jar",
      albumId: "wine_jar",
      score: 10,
    },
  },
  {
    id: "boatman",
    name: "老船家",
    x: 0.44,
    y: 0.76,
    seal: "船",
    sectionId: "s1",
    lines: [
      "老船家蹲在船头补网，抬眼看你。",
      "「江水不小，空手上船我可放不下心——」",
    ],
    interact: {
      kind: "compose",
      prompt: "「江水不小，空手上船我可放不下心——」",
      pool: ["总得", "有个", "由头", "才", "好"],
      answer: ["总得", "有个", "由头"],
    },
    effect: {
      setFlags: ["boat_ready"],
      stampId: "boatman",
      albumId: "boatman",
      score: 10,
    },
  },
  {
    id: "longtan",
    name: "龙潭",
    x: 0.56,
    y: 0.58,
    seal: "潭",
    sectionId: "s1",
    lines: [
      "山腹一泓幽潭，水色青碧，深不见底。",
      "四周寒雾缭绕，潭面静得像一块墨玉。",
    ],
    interact: {
      kind: "choice",
      prompt: "你打算怎么做？",
      options: [
        { id: "o1", label: "掬一捧水饮下", correct: true },
        { id: "o2", label: "投块石头试试深浅" },
        { id: "o3", label: "先退后三步，看清水面" },
      ],
    },
    effect: {
      setFlags: ["saw_longtan"],
      stampId: "longtan",
      albumId: "longtan",
      score: 10,
    },
  },
  {
    id: "monk",
    name: "守山僧",
    x: 0.72,
    y: 0.44,
    seal: "僧",
    sectionId: "s2",
    lines: [
      "松树下立着一位僧人，僧袍上落满松针。",
      "「施主能进得山来，想是有人指点。」",
    ],
    interact: {
      kind: "order",
      prompt: "把守山僧说的线索按先后排好。",
      items: [
        { id: "s2", label: "雪松仲秋结赤果" },
        { id: "s3", label: "前夜信香忽断，赤果被盗" },
        { id: "s1", label: "山下来了一纸封路告示" },
      ],
      answer: ["s1", "s2", "s3"],
    },
    effect: {
      setFlags: ["monk_told"],
      giveItems: [{ id: "red_fruit", name: "赤果" }],
      stampId: "monk",
      albumId: "monk",
      score: 10,
    },
  },
  {
    id: "pine",
    name: "山巅孤松",
    x: 0.86,
    y: 0.26,
    seal: "松",
    sectionId: "s2",
    requiresFlag: "monk_told",
    unlockHint: "守山僧说山巅还有一株孤松，先去问过他",
    lines: [
      "山巅只有一株松，风从北面来，松针齐齐偏向一边。",
      "松根处压着一块旧木牌。",
    ],
    interact: {
      kind: "compose",
      prompt: "木牌上的字缺了一半：「此去____」",
      pool: ["北上", "山高", "水长", "路远"],
      answer: ["北上", "山高"],
    },
    effect: {
      setFlags: ["saw_pine"],
      stampId: "pine",
      albumId: "pine",
      score: 10,
    },
  },
];
```

- [ ] **Step 4: 类型检查**

Run: `npm run typecheck`（cwd = `e:\code\jianghu-client\demo`）
Expected: 无报错。`content.test.ts` 对 `checkAnswer` 的引用在 Task 5 完成后才会通过类型检查，此处报错属预期，忽略。

- [ ] **Step 5: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/shared/types.ts jianghu-client/demo/src/shared/content.ts jianghu-client/demo/tests/content.test.ts
git commit -m "feat(demo): 加 shared 类型契约与占位剧情内容（2 路段/6 点位/6 见闻录）"
```

---

### Task 4: 规则纯函数 `shared/rules.ts`（TDD）

**Files:**
- Create: `e:\code\jianghu-client\demo\tests\rules.test.ts`
- Create: `e:\code\jianghu-client\demo\src\shared\rules.ts`

- [ ] **Step 1: 写失败测试 `tests/rules.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { albumEntries, points, sections } from "../src/shared/content";
import { applyEffects, createState } from "../src/shared/engine";
import { albumGaps, pointState, progress, sectionUnlocked } from "../src/shared/rules";

const s1 = sections[0];
const s2 = sections[1];
const p1 = points[0]; // ferry_notice，段一，无 requiresFlag
const p6 = points[5]; // pine，段二，requiresFlag = monk_told

describe("sectionUnlocked", () => {
  it("段一无门槛，初始即解锁", () => {
    expect(sectionUnlocked(s1, createState())).toBe(true);
  });

  it("段二需 stamps>=3 且 score>=30，两条同时满足才算解锁", () => {
    const base = createState();
    expect(sectionUnlocked(s2, base)).toBe(false);
    expect(sectionUnlocked(s2, { ...base, stamps: ["a", "b", "c"], score: 29 })).toBe(false);
    expect(sectionUnlocked(s2, { ...base, stamps: ["a", "b"], score: 30 })).toBe(false);
    expect(sectionUnlocked(s2, { ...base, stamps: ["a", "b", "c"], score: 30 })).toBe(true);
  });
});

describe("pointState", () => {
  it("已落章 → done", () => {
    const s = applyEffects(createState(), p1.effect);
    expect(pointState(p1, s, s1)).toBe("done");
  });

  it("所在路段未解锁 → locked", () => {
    expect(pointState(p6, createState(), s2)).toBe("locked");
  });

  it("路段已解锁但 requiresFlag 未满足 → locked", () => {
    const s = { ...createState(), stamps: ["a", "b", "c"], score: 30 };
    expect(pointState(p6, s, s2)).toBe("locked");
  });

  it("路段已解锁且 flag 满足 → ready", () => {
    const s = {
      ...createState(),
      stamps: ["a", "b", "c"],
      score: 30,
      flags: ["monk_told"],
    };
    expect(pointState(p6, s, s2)).toBe("ready");
  });

  it("无 requiresFlag 的点位，路段解锁即 ready", () => {
    expect(pointState(p1, createState(), s1)).toBe("ready");
  });

  it("done 优先于路段锁定（已落章不会因路段回锁变 locked）", () => {
    const s = { ...createState(), stamps: [p6.id], score: 0 };
    expect(pointState(p6, s, s2)).toBe("done");
  });
});

describe("albumGaps", () => {
  it("已收集进 got，未收集进 missing，总数为全部条目", () => {
    const s = applyEffects(createState(), p1.effect);
    const { got, missing } = albumGaps(s, albumEntries);
    expect(got.map((e) => e.id)).toEqual([p1.id]);
    expect(missing).toHaveLength(5);
    expect(got.length + missing.length).toBe(albumEntries.length);
  });
});

describe("progress", () => {
  it("返回见闻值、已得印章数、总印章数、总见闻录数", () => {
    const s = applyEffects(createState(), p1.effect);
    expect(progress(s, points.length, albumEntries.length)).toEqual({
      score: 10,
      stamps: 1,
      totalStamps: 6,
      totalAlbum: 6,
    });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: FAIL —— 找不到模块 `../src/shared/rules`。

- [ ] **Step 3: 创建 `src/shared/rules.ts`（完整内容）**

```ts
import type {
  AlbumEntry,
  AlbumGaps,
  GamePoint,
  GameState,
  PointState,
  Progress,
  Section,
} from "./types";

/** 路段解锁：行脚印数与见闻值同时达标 */
export function sectionUnlocked(section: Section, state: GameState): boolean {
  return (
    state.stamps.length >= section.requiresStamps &&
    state.score >= section.requiresScore
  );
}

/**
 * 点位三态。注意：所有点位始终显示在地图上，locked 只是视觉与交互提示不同，
 * 不代表隐藏。done 优先级最高，其次路段锁，再次 flag 锁。
 */
export function pointState(
  point: GamePoint,
  state: GameState,
  section: Section
): PointState {
  if (state.stamps.includes(point.id)) return "done";
  if (!sectionUnlocked(section, state)) return "locked";
  if (point.requiresFlag && !state.flags.includes(point.requiresFlag)) {
    return "locked";
  }
  return "ready";
}

/** 见闻录缺口：已得在前、未得在后，供图鉴册分组展示 */
export function albumGaps(state: GameState, entries: AlbumEntry[]): AlbumGaps {
  const got: AlbumEntry[] = [];
  const missing: AlbumEntry[] = [];
  for (const entry of entries) {
    if (state.album.includes(entry.id)) got.push(entry);
    else missing.push(entry);
  }
  return { got, missing };
}

/** 顶部进度数据 */
export function progress(
  state: GameState,
  totalStamps: number,
  totalAlbum: number
): Progress {
  return {
    score: state.score,
    stamps: state.stamps.length,
    totalStamps,
    totalAlbum,
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: `tests/rules.test.ts` 全绿（content.test.ts 仍失败，因 `engine.ts` 未建，属预期）。

- [ ] **Step 5: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/shared/rules.ts jianghu-client/demo/tests/rules.test.ts
git commit -m "feat(demo): 加 shared/rules 纯函数（sectionUnlocked/pointState/albumGaps/progress）"
```

---

### Task 5: 引擎 `shared/engine.ts`（TDD）

**Files:**
- Create: `e:\code\jianghu-client\demo\tests\engine.test.ts`
- Create: `e:\code\jianghu-client\demo\src\shared\engine.ts`

- [ ] **Step 1: 写失败测试 `tests/engine.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  applyEffects,
  checkAnswer,
  createState,
  markVisited,
} from "../src/shared/engine";
import type {
  ChoiceInteract,
  ComposeInteract,
  OrderInteract,
} from "../src/shared/types";

const choice: ChoiceInteract = {
  kind: "choice",
  prompt: "p",
  options: [
    { id: "a", label: "A", correct: true },
    { id: "b", label: "B" },
  ],
};
const compose: ComposeInteract = {
  kind: "compose",
  prompt: "p",
  pool: ["甲", "乙", "丙"],
  answer: ["甲", "乙"],
};
const order: OrderInteract = {
  kind: "order",
  prompt: "p",
  items: [
    { id: "1", label: "一" },
    { id: "2", label: "二" },
  ],
  answer: ["2", "1"],
};

describe("createState", () => {
  it("初始为空档", () => {
    expect(createState()).toEqual({
      flags: [],
      bag: [],
      stamps: [],
      album: [],
      score: 0,
      visited: [],
    });
  });
});

describe("checkAnswer", () => {
  it("choice：选中 correct 的选项才算对", () => {
    expect(checkAnswer(choice, "a")).toBe(true);
    expect(checkAnswer(choice, "b")).toBe(false);
    expect(checkAnswer(choice, "zzz")).toBe(false);
  });

  it("compose：词序全等才算对", () => {
    expect(checkAnswer(compose, ["甲", "乙"])).toBe(true);
    expect(checkAnswer(compose, ["乙", "甲"])).toBe(false);
    expect(checkAnswer(compose, ["甲"])).toBe(false);
    expect(checkAnswer(compose, ["甲", "乙", "丙"])).toBe(false);
  });

  it("order：id 序全等才算对", () => {
    expect(checkAnswer(order, ["2", "1"])).toBe(true);
    expect(checkAnswer(order, ["1", "2"])).toBe(false);
  });

  it("非法输入不抛异常且判错", () => {
    expect(checkAnswer(compose, null)).toBe(false);
    expect(checkAnswer(order, "2,1")).toBe(false);
    expect(checkAnswer(choice, undefined)).toBe(false);
  });
});

describe("applyEffects", () => {
  it("返回新对象，不修改入参", () => {
    const s = createState();
    const next = applyEffects(s, {
      setFlags: ["f"],
      stampId: "x",
      albumId: "x",
      score: 10,
    });
    expect(next).not.toBe(s);
    expect(s.flags).toEqual([]);
    expect(s.stamps).toEqual([]);
    expect(s.score).toBe(0);
  });

  it("重复应用同一效果幂等（不重复加分/加章/加条目）", () => {
    const fx = { setFlags: ["f"], stampId: "x", albumId: "x", score: 10 };
    const once = applyEffects(createState(), fx);
    const twice = applyEffects(once, fx);
    expect(twice).toEqual(once);
  });

  it("bag 按 id 去重且保留名称", () => {
    const next = applyEffects(createState(), {
      giveItems: [
        { id: "wine", name: "陈酒" },
        { id: "wine", name: "陈酒" },
      ],
    });
    expect(next.bag).toEqual([{ id: "wine", name: "陈酒" }]);
  });

  it("无 stampId 的纯加分效果每次都生效", () => {
    expect(applyEffects(createState(), { score: 5 }).score).toBe(5);
  });

  it("空效果返回等值状态", () => {
    expect(applyEffects(createState(), {})).toEqual(createState());
  });
});

describe("markVisited", () => {
  it("首次加入 visited", () => {
    expect(markVisited(createState(), "p1").visited).toEqual(["p1"]);
  });

  it("重复调用返回原引用（避免无意义重渲染）", () => {
    const a = markVisited(createState(), "p1");
    expect(markVisited(a, "p1")).toBe(a);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: FAIL —— 找不到模块 `../src/shared/engine`。

- [ ] **Step 3: 创建 `src/shared/engine.ts`（完整内容）**

```ts
import type { Effect, GameState, Interact } from "./types";

export function createState(): GameState {
  return { flags: [], bag: [], stamps: [], album: [], score: 0, visited: [] };
}

/**
 * 纯函数：返回新状态，绝不修改入参。
 * 幂等规则：带 stampId 的效果只在「该印章首次获得」时结算 score；
 * 无 stampId 的纯加分效果每次都生效。
 */
export function applyEffects(state: GameState, fx: Effect): GameState {
  const next: GameState = {
    flags: [...state.flags],
    bag: state.bag.map((item) => ({ ...item })),
    stamps: [...state.stamps],
    album: [...state.album],
    score: state.score,
    visited: [...state.visited],
  };

  for (const flag of fx.setFlags ?? []) {
    if (!next.flags.includes(flag)) next.flags.push(flag);
  }

  for (const item of fx.giveItems ?? []) {
    if (!next.bag.some((owned) => owned.id === item.id)) {
      next.bag.push({ ...item });
    }
  }

  const stampIsNew =
    fx.stampId !== undefined && !state.stamps.includes(fx.stampId);
  if (stampIsNew) next.stamps.push(fx.stampId as string);

  if (fx.albumId !== undefined && !next.album.includes(fx.albumId)) {
    next.album.push(fx.albumId);
  }

  if (fx.score !== undefined && (fx.stampId === undefined || stampIsNew)) {
    next.score += fx.score;
  }

  return next;
}

/** 判定三种互动的答案 */
export function checkAnswer(interact: Interact, answer: unknown): boolean {
  if (interact.kind === "choice") {
    if (typeof answer !== "string") return false;
    return interact.options.some((o) => o.id === answer && o.correct === true);
  }

  if (!Array.isArray(answer)) return false;
  const submitted = answer.map((v) => String(v));
  const expected = interact.answer;
  return (
    submitted.length === expected.length &&
    submitted.every((value, i) => value === expected[i])
  );
}

/** 标记点位已读过（用于卡片重看时跳过逐行渐显） */
export function markVisited(state: GameState, pointId: string): GameState {
  if (state.visited.includes(pointId)) return state;
  return { ...state, visited: [...state.visited, pointId] };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: `engine.test.ts` 全绿；`content.test.ts` 也转绿（它依赖 `checkAnswer`）；`rules.test.ts` 全绿。

- [ ] **Step 5: 类型检查**

Run: `npm run typecheck`（cwd = `e:\code\jianghu-client\demo`）
Expected: 无报错。

- [ ] **Step 6: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/shared/engine.ts jianghu-client/demo/tests/engine.test.ts
git commit -m "feat(demo): 加 shared/engine（createState/applyEffects/checkAnswer/markVisited）+ 幂等单测"
```

---

### Task 6: 存档 `shared/persist.ts`（TDD）

**Files:**
- Create: `e:\code\jianghu-client\demo\tests\persist.test.ts`
- Create: `e:\code\jianghu-client\demo\src\shared\persist.ts`

- [ ] **Step 1: 写失败测试 `tests/persist.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { applyEffects, createState } from "../src/shared/engine";
import { SAVE_KEY, clear, load, save } from "../src/shared/persist";
import type { StorageLike } from "../src/shared/types";

function memStorage(
  seed: Record<string, string> = {}
): StorageLike & { map: Record<string, string> } {
  const map: Record<string, string> = { ...seed };
  return {
    map,
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => {
      map[k] = v;
    },
    removeItem: (k) => {
      delete map[k];
    },
  };
}

describe("persist", () => {
  it("空存档 → 新档", () => {
    expect(load(memStorage())).toEqual(createState());
  });

  it("save 后 load 得到同一状态", () => {
    const st = memStorage();
    const s = applyEffects(createState(), {
      stampId: "x",
      albumId: "x",
      score: 10,
    });
    save(st, s);
    expect(load(st)).toEqual(s);
  });

  it("clear 后回到新档", () => {
    const st = memStorage();
    save(st, applyEffects(createState(), { score: 10 }));
    clear(st);
    expect(load(st)).toEqual(createState());
  });

  it("坏 JSON 不抛异常，回落到新档", () => {
    expect(load(memStorage({ [SAVE_KEY]: "{not json" }))).toEqual(createState());
  });

  it("版本不符 → 新档", () => {
    const raw = JSON.stringify({ version: 0, state: createState() });
    expect(load(memStorage({ [SAVE_KEY]: raw }))).toEqual(createState());
  });

  it("字段缺失的存档被补齐为完整状态", () => {
    const raw = JSON.stringify({ version: 1, state: { score: 20 } });
    expect(load(memStorage({ [SAVE_KEY]: raw }))).toEqual({
      ...createState(),
      score: 20,
    });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: FAIL —— 找不到模块 `../src/shared/persist`。

- [ ] **Step 3: 创建 `src/shared/persist.ts`（完整内容）**

```ts
import { createState } from "./engine";
import type { GameState, StorageLike } from "./types";

export const SAVE_KEY = "jianghu_demo_save_v1";
const SAVE_VERSION = 1;

interface SaveData {
  version: number;
  state: GameState;
}

export function save(storage: StorageLike, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, state }));
}

export function load(storage: StorageLike): GameState {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return createState();
  try {
    const parsed = JSON.parse(raw) as Partial<SaveData> | null;
    if (!parsed || parsed.version !== SAVE_VERSION || !parsed.state) {
      return createState();
    }
    return normalize(parsed.state);
  } catch {
    return createState();
  }
}

export function clear(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY);
}

/** 存档来自外部（localStorage），字段可能被手改或来自旧版本，此处补齐兜底 */
function normalize(raw: Partial<GameState>): GameState {
  const base = createState();
  return {
    flags: Array.isArray(raw.flags) ? raw.flags : base.flags,
    bag: Array.isArray(raw.bag) ? raw.bag : base.bag,
    stamps: Array.isArray(raw.stamps) ? raw.stamps : base.stamps,
    album: Array.isArray(raw.album) ? raw.album : base.album,
    score: typeof raw.score === "number" ? raw.score : base.score,
    visited: Array.isArray(raw.visited) ? raw.visited : base.visited,
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: `tests/persist.test.ts` 6 个用例全绿。

- [ ] **Step 5: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/shared/persist.ts jianghu-client/demo/tests/persist.test.ts
git commit -m "feat(demo): 加 shared/persist（注入式 StorageLike，键 jianghu_demo_save_v1）"
```

---

### Task 7: 平台层 `platform/`

**Files:**
- Create: `e:\code\jianghu-client\demo\src\platform\storage.ts`
- Create: `e:\code\jianghu-client\demo\src\platform\index.ts`

- [ ] **Step 1: 创建 `src/platform/storage.ts`**

```ts
import type { StorageLike } from "../shared/types";

export const h5Storage: StorageLike = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};
```

- [ ] **Step 2: 创建 `src/platform/index.ts`**

```ts
import type { StorageLike } from "../shared/types";
import { h5Storage } from "./storage";

/**
 * 平台能力出口：views/ 只从这里取平台能力。
 * 日后接微信小游戏时，仅需把 h5Storage 换成 wx.getStorageSync 的包装。
 */
export const storage: StorageLike = h5Storage;
```

- [ ] **Step 3: 类型检查 + 单测回归**

Run: `npm run typecheck; npm test`（cwd = `e:\code\jianghu-client\demo`）
Expected: 类型无报错；4 个测试文件全绿（此时 content/rules/engine/persist）。

- [ ] **Step 4: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/platform/storage.ts jianghu-client/demo/src/platform/index.ts
git commit -m "feat(demo): 加 platform 层（H5 localStorage 适配，预留小游戏替换点）"
```

---

### Task 8: SVG 古风地图 `MapCanvas.vue`

**Files:**
- Create: `e:\code\jianghu-client\demo\src\views\album\MapCanvas.vue`

- [ ] **Step 1: 创建 `MapCanvas.vue`（完整内容）**

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { GamePoint, PointState } from "../../shared/types";

const props = defineProps<{
  points: { point: GamePoint; state: PointState }[];
  sections: { id: string; unlocked: boolean }[];
}>();

const emit = defineEmits<{ pick: [point: GamePoint] }>();

const W = 1000;
const H = 700;

const px = (x: number) => x * W;
const py = (y: number) => y * H;

/**
 * 每条路段的折线：从上一路段的最后一个点位起笔，串起本路段全部点位，
 * 这样段一与段二之间不会出现断口。依赖 props.points 的行进顺序。
 */
function sectionPath(sectionId: string): string {
  const own = props.points.filter((entry) => entry.point.sectionId === sectionId);
  if (own.length === 0) return "";
  const startIndex = props.points.findIndex(
    (entry) => entry.point.id === own[0].point.id
  );
  const seq = startIndex > 0 ? [props.points[startIndex - 1], ...own] : own;
  return seq
    .map(
      (entry, i) =>
        `${i === 0 ? "M" : "L"} ${px(entry.point.x)} ${py(entry.point.y)}`
    )
    .join(" ");
}

const roads = computed(() =>
  props.sections.map((s) => ({ id: s.id, unlocked: s.unlocked, d: sectionPath(s.id) }))
);
</script>

<template>
  <svg
    class="map"
    :viewBox="`0 0 ${W} ${H}`"
    preserveAspectRatio="xMidYMid slice"
    role="img"
    aria-label="行脚图"
  >
    <!-- 远山三层（由淡到浓） -->
    <path
      class="far far-3"
      d="M0,300 L120,250 L240,296 L360,236 L520,300 L680,244 L840,296 L1000,250 L1000,700 L0,700 Z"
    />
    <path
      class="far far-2"
      d="M0,380 L160,318 L300,372 L470,306 L640,368 L800,312 L1000,372 L1000,700 L0,700 Z"
    />
    <path
      class="far far-1"
      d="M0,470 L180,404 L340,462 L520,392 L700,456 L880,400 L1000,452 L1000,700 L0,700 Z"
    />

    <!-- 河道双线 -->
    <path
      class="river"
      d="M-20,610 C180,560 260,660 460,616 C640,578 760,652 1020,596"
    />
    <path
      class="river river-2"
      d="M-20,632 C180,584 268,682 468,638 C648,600 768,672 1020,618"
    />

    <!-- 驿道：按路段分段着色 -->
    <path
      v-for="road in roads"
      :key="road.id"
      class="road"
      :class="road.unlocked ? 'road-open' : 'road-locked'"
      :d="road.d"
    />

    <!-- 点位印章：三态 -->
    <g
      v-for="entry in props.points"
      :key="entry.point.id"
      class="node"
      :class="`node-${entry.state}`"
      :transform="`translate(${px(entry.point.x)}, ${py(entry.point.y)})`"
      role="button"
      tabindex="0"
      :aria-label="entry.point.name"
      @click="emit('pick', entry.point)"
      @keydown.enter="emit('pick', entry.point)"
    >
      <g class="tilt">
        <circle v-if="entry.state === 'ready'" class="pulse" r="26" />
        <circle class="seal" r="26" />
        <text class="seal-char" dominant-baseline="central">{{ entry.point.seal }}</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.map {
  display: block;
  width: 100%;
  height: 100%;
  background: #f3ede1;
}

.far { stroke: none; }
.far-3 { fill: #dde2da; }
.far-2 { fill: #cdd5ca; }
.far-1 { fill: #bcc7bb; }

.river {
  fill: none;
  stroke: #b9cdcf;
  stroke-width: 26;
  stroke-linecap: round;
  opacity: 0.5;
}
.river-2 {
  stroke-width: 11;
  opacity: 0.32;
}

.road {
  fill: none;
  stroke-width: 4;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.road-open { stroke: #a8896a; opacity: 0.9; }
.road-locked {
  stroke: #a9a29a;
  stroke-dasharray: 10 12;
  opacity: 0.5;
}

.node { cursor: pointer; outline: none; }
.tilt { transform-box: fill-box; transform-origin: center; }
.node-done .tilt { transform: rotate(-6deg); }

.node-locked { opacity: 0.55; }
.node-locked .seal { fill: #d5cfc5; stroke: #9c948a; stroke-width: 2; }
.node-locked .seal-char { fill: #6f6862; }

.node-ready .seal { fill: #fdf8f0; stroke: #b3402f; stroke-width: 3; }
.node-ready .seal-char { fill: #b3402f; }

.node-done .seal { fill: #b3402f; stroke: #8f2f21; stroke-width: 2; }
.node-done .seal-char { fill: #fdf8f0; }

.seal-char {
  font-family: "STKaiti", "KaiTi", "Songti SC", serif;
  font-size: 26px;
  text-anchor: middle;
  pointer-events: none;
}

.pulse {
  fill: none;
  stroke: #b3402f;
  stroke-width: 2;
  transform-box: fill-box;
  transform-origin: center;
  animation: seal-pulse 1.8s ease-out infinite;
}
@keyframes seal-pulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}
</style>
```

- [ ] **Step 2: 临时接线到 AlbumApp 做视觉自检**

把 `src/views/album/AlbumApp.vue` 临时替换为：

```vue
<script setup lang="ts">
import { points, sections } from "../../shared/content";
import { createState } from "../../shared/engine";
import { pointState } from "../../shared/rules";
import MapCanvas from "./MapCanvas.vue";

const state = createState();
const nodes = points.map((point) => ({
  point,
  state: pointState(point, state, sections.find((s) => s.id === point.sectionId)!),
}));
const roads = sections.map((s) => ({ id: s.id, unlocked: s.id === "s1" }));
</script>

<template>
  <div style="height: 100%">
    <MapCanvas :points="nodes" :sections="roads" @pick="() => {}" />
  </div>
</template>
```

- [ ] **Step 3: 起 dev server 并截图自检**

Run: `npm run dev`（cwd = `e:\code\jianghu-client\demo`，后台运行）
Expected: 打开 `http://localhost:5173/`，可见：宣纸底 + 三层远山 + 双线河道 + 段一实线驿道、段二虚灰线 + 4 枚朱红描边脉冲印章（段一）+ 2 枚灰印章（段二，含"松"为灰）。

自查项（逐条确认，不符则回 Step 1 调参数）：
- 远山是否「水墨淡出」而非色块 → 调 `far-*` 的 fill 明度与路径起伏。
- 河道是否自然穿行、不压住印章 → 调河道 `d` 的 C 控制点。
- 印章单字是否垂直居中（`dominant-baseline: central` 生效）。
- 段二虚线是否一眼看出「未通」。

- [ ] **Step 4: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/views/album/MapCanvas.vue
git commit -m "feat(demo): 加 MapCanvas（代码绘制 SVG 古风地图 + 印章三态）"
```

---

### Task 9: 三种互动 + 点位卡片

**Files:**
- Create: `e:\code\jianghu-client\demo\src\views\album\interacts\ChoiceBox.vue`
- Create: `e:\code\jianghu-client\demo\src\views\album\interacts\ComposeBox.vue`
- Create: `e:\code\jianghu-client\demo\src\views\album\interacts\OrderBox.vue`
- Create: `e:\code\jianghu-client\demo\src\views\album\PointCard.vue`

- [ ] **Step 1: 创建 `interacts/ChoiceBox.vue`**

```vue
<script setup lang="ts">
import type { ChoiceInteract } from "../../../shared/types";

const props = defineProps<{ interact: ChoiceInteract }>();
const emit = defineEmits<{ submit: [answer: string] }>();
</script>

<template>
  <div class="box">
    <p class="prompt">{{ props.interact.prompt }}</p>
    <div class="options">
      <button
        v-for="option in props.interact.options"
        :key="option.id"
        type="button"
        class="option"
        @click="emit('submit', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.box { display: grid; gap: 12px; }
.prompt { margin: 0; font-size: 15px; line-height: 1.7; color: #5a5047; }
.options { display: grid; gap: 8px; }
.option {
  padding: 11px 14px;
  border: 1px solid #cbbfa9;
  border-radius: 8px;
  background: #fbf7ee;
  text-align: left;
  font-size: 15px;
  transition: background 0.15s, border-color 0.15s;
}
.option:hover { background: #f4ecdd; border-color: #b3402f; }
</style>
```

- [ ] **Step 2: 创建 `interacts/ComposeBox.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import type { ComposeInteract } from "../../../shared/types";

const props = defineProps<{ interact: ComposeInteract }>();
const emit = defineEmits<{ submit: [answer: string[]] }>();

const picked = ref<number[]>([]);

const available = computed(() =>
  props.interact.pool
    .map((word, index) => ({ word, index }))
    .filter((item) => !picked.value.includes(item.index))
);

const pickedWords = computed(() => picked.value.map((i) => props.interact.pool[i]));

function take(index: number) {
  picked.value = [...picked.value, index];
}

function drop(pos: number) {
  picked.value = picked.value.filter((_, p) => p !== pos);
}

function reset() {
  picked.value = [];
}
</script>

<template>
  <div class="box">
    <p class="prompt">{{ props.interact.prompt }}</p>
    <p class="tip">把下面的话接完。点已拼的词可以撤回。</p>

    <div class="slots">
      <button
        v-for="(word, pos) in pickedWords"
        :key="`${word}-${pos}`"
        type="button"
        class="chip chip-picked"
        @click="drop(pos)"
      >
        {{ word }}
      </button>
      <span v-if="pickedWords.length === 0" class="slot-empty">……</span>
    </div>

    <div class="chips">
      <button
        v-for="item in available"
        :key="item.index"
        type="button"
        class="chip"
        @click="take(item.index)"
      >
        {{ item.word }}
      </button>
    </div>

    <div class="actions">
      <button type="button" class="ghost" @click="reset">重来</button>
      <button
        type="button"
        class="primary"
        :disabled="pickedWords.length === 0"
        @click="emit('submit', pickedWords)"
      >
        落笔
      </button>
    </div>
  </div>
</template>

<style scoped>
.box { display: grid; gap: 10px; }
.prompt { margin: 0; font-size: 15px; line-height: 1.7; color: #5a5047; }
.tip { margin: 0; font-size: 12px; color: #94897b; }
.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 46px;
  padding: 8px 10px;
  border: 1px dashed #cbbfa9;
  border-radius: 8px;
  background: #fbf7ee;
}
.slot-empty { color: #b3a894; font-size: 14px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  padding: 8px 14px;
  border: 1px solid #cbbfa9;
  border-radius: 999px;
  background: #fbf7ee;
  font-size: 15px;
}
.chip:hover { border-color: #b3402f; }
.chip-picked { background: #f3e6dc; border-color: #b3402f; color: #8f2f21; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.primary {
  padding: 9px 22px;
  border: none;
  border-radius: 8px;
  background: #b3402f;
  color: #fdf8f0;
  font-size: 15px;
}
.primary:disabled { opacity: 0.4; cursor: not-allowed; }
.ghost {
  padding: 9px 16px;
  border: 1px solid #cbbfa9;
  border-radius: 8px;
  background: transparent;
  font-size: 15px;
}
</style>
```

- [ ] **Step 3: 创建 `interacts/OrderBox.vue`**

```vue
<script setup lang="ts">
import { ref } from "vue";
import type { OrderInteract } from "../../../shared/types";

const props = defineProps<{ interact: OrderInteract }>();
const emit = defineEmits<{ submit: [answer: string[]] }>();

const order = ref<string[]>(props.interact.items.map((item) => item.id));

function labelOf(id: string): string {
  return props.interact.items.find((item) => item.id === id)?.label ?? id;
}

function move(pos: number, delta: number) {
  const target = pos + delta;
  if (target < 0 || target >= order.value.length) return;
  const next = [...order.value];
  const tmp = next[pos];
  next[pos] = next[target];
  next[target] = tmp;
  order.value = next;
}
</script>

<template>
  <div class="box">
    <p class="prompt">{{ props.interact.prompt }}</p>
    <ul class="rows">
      <li v-for="(id, pos) in order" :key="id" class="row">
        <span class="row-label">{{ labelOf(id) }}</span>
        <span class="row-btns">
          <button
            type="button"
            class="arrow"
            :disabled="pos === 0"
            aria-label="上移"
            @click="move(pos, -1)"
          >
            ▲
          </button>
          <button
            type="button"
            class="arrow"
            :disabled="pos === order.length - 1"
            aria-label="下移"
            @click="move(pos, 1)"
          >
            ▼
          </button>
        </span>
      </li>
    </ul>
    <div class="actions">
      <button type="button" class="primary" @click="emit('submit', order)">定序</button>
    </div>
  </div>
</template>

<style scoped>
.box { display: grid; gap: 10px; }
.prompt { margin: 0; font-size: 15px; line-height: 1.7; color: #5a5047; }
.rows { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid #cbbfa9;
  border-radius: 8px;
  background: #fbf7ee;
}
.row-label { font-size: 15px; }
.row-btns { display: flex; gap: 6px; }
.arrow {
  width: 32px;
  height: 32px;
  border: 1px solid #cbbfa9;
  border-radius: 6px;
  background: #f3ede1;
  font-size: 12px;
  line-height: 1;
}
.arrow:disabled { opacity: 0.35; cursor: not-allowed; }
.actions { display: flex; justify-content: flex-end; }
.primary {
  padding: 9px 22px;
  border: none;
  border-radius: 8px;
  background: #b3402f;
  color: #fdf8f0;
  font-size: 15px;
}
</style>
```

- [ ] **Step 4: 创建 `PointCard.vue`（完整内容）**

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { checkAnswer } from "../../shared/engine";
import type { GamePoint, PointState } from "../../shared/types";
import ChoiceBox from "./interacts/ChoiceBox.vue";
import ComposeBox from "./interacts/ComposeBox.vue";
import OrderBox from "./interacts/OrderBox.vue";

const props = defineProps<{
  point: GamePoint;
  state: PointState;
  visited: boolean;
}>();

const emit = defineEmits<{ close: []; solved: [] }>();

const shown = ref(props.visited ? props.point.lines.length : 0);
const allShown = computed(() => shown.value >= props.point.lines.length);
const solvedLocal = ref(false);
const wrong = ref(false);
const isDone = computed(() => props.state === "done" || solvedLocal.value);

let timers: number[] = [];

onMounted(() => {
  if (props.visited) return;
  props.point.lines.forEach((_, i) => {
    timers.push(
      window.setTimeout(() => {
        shown.value = i + 1;
      }, 500 * (i + 1))
    );
  });
});

onBeforeUnmount(() => {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
});

function skipAll() {
  if (allShown.value) return;
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  shown.value = props.point.lines.length;
}

function onSubmit(answer: unknown) {
  if (!checkAnswer(props.point.interact, answer)) {
    wrong.value = true;
    return;
  }
  wrong.value = false;
  solvedLocal.value = true;
  emit("solved");
}
</script>

<template>
  <div class="card">
    <div class="card-head">
      <span class="card-name">{{ props.point.name }}</span>
      <button class="card-close" type="button" aria-label="关闭" @click="emit('close')">
        ×
      </button>
    </div>

    <div class="card-body">
      <div class="lines" @click="skipAll">
        <p v-for="(line, i) in props.point.lines" v-show="i < shown" :key="i" class="line">
          {{ line }}
        </p>
      </div>

      <div v-if="allShown && !isDone" class="interact">
        <ChoiceBox
          v-if="props.point.interact.kind === 'choice'"
          :interact="props.point.interact"
          @submit="onSubmit"
        />
        <ComposeBox
          v-if="props.point.interact.kind === 'compose'"
          :interact="props.point.interact"
          @submit="onSubmit"
        />
        <OrderBox
          v-if="props.point.interact.kind === 'order'"
          :interact="props.point.interact"
          @submit="onSubmit"
        />
        <p v-if="wrong" class="wrong">不对。再想想。</p>
      </div>

      <div v-if="isDone" class="reward">
        <span class="reward-seal">{{ props.point.seal }}</span>
        <span>已录入见闻录 · 见闻值 +{{ props.point.effect.score ?? 0 }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  max-height: 62vh;
  display: flex;
  flex-direction: column;
  background: #fdfaf3;
  border-top: 1px solid #d8ccb6;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -6px 24px rgba(60, 48, 32, 0.16);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
}
.card-name {
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 19px;
  letter-spacing: 2px;
}
.card-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #94897b;
}

.card-body {
  padding: 0 16px 20px;
  overflow-y: auto;
}

.lines { display: grid; gap: 8px; }
.line {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: #4a4239;
  animation: line-in 0.4s ease-out;
}
@keyframes line-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.interact { margin-top: 16px; }
.wrong {
  margin: 10px 0 0;
  font-size: 13px;
  color: #b3402f;
}

.reward {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #e0cfae;
  border-radius: 10px;
  background: #f7f0e0;
  font-size: 15px;
  color: #8f2f21;
}
.reward-seal {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #b3402f;
  color: #fdf8f0;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 20px;
  transform: rotate(-6deg);
}
</style>
```

- [ ] **Step 5: 类型检查**

Run: `npm run typecheck`（cwd = `e:\code\jianghu-client\demo`）
Expected: 无报错。若 vue-tsc 对 `v-if` 链上的联合类型收窄报错，保持三个独立 `v-if`（本步骤代码已是三个独立 `v-if`，每个各自收窄）即可通过。

- [ ] **Step 6: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/views/album/interacts/ChoiceBox.vue jianghu-client/demo/src/views/album/interacts/ComposeBox.vue jianghu-client/demo/src/views/album/interacts/OrderBox.vue jianghu-client/demo/src/views/album/PointCard.vue
git commit -m "feat(demo): 加三种互动组件与点位卡片（逐行渐显/判定/完成态）"
```

---

### Task 10: 落章动画 + 见闻录册

**Files:**
- Create: `e:\code\jianghu-client\demo\src\views\album\StampBurst.vue`
- Create: `e:\code\jianghu-client\demo\src\views\album\AlbumPanel.vue`

- [ ] **Step 1: 创建 `StampBurst.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ seal: string; x: number; y: number }>();
const emit = defineEmits<{ done: [] }>();

const style = computed(() => ({
  "--tx": `${props.x * 100}%`,
  "--ty": `${props.y * 100}%`,
}));
</script>

<template>
  <div class="burst" aria-hidden="true">
    <div class="flying" :style="style" @animationend="emit('done')">
      {{ props.seal }}
    </div>
  </div>
</template>

<style scoped>
.burst {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  overflow: hidden;
}

.flying {
  position: absolute;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #b3402f;
  color: #fdf8f0;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 26px;
  box-shadow: 0 0 0 3px rgba(179, 64, 47, 0.3);
  animation: seal-fly 600ms cubic-bezier(0.2, 0.85, 0.3, 1) forwards;
}

@keyframes seal-fly {
  0% {
    left: 50%;
    top: 92%;
    transform: translate(-50%, -50%) scale(1.7);
    opacity: 0;
  }
  15% { opacity: 1; }
  75% {
    left: var(--tx);
    top: var(--ty);
    transform: translate(-50%, -50%) scale(1.15) rotate(-4deg);
  }
  100% {
    left: var(--tx);
    top: var(--ty);
    transform: translate(-50%, -50%) scale(1) rotate(-6deg);
    opacity: 1;
  }
}
</style>
```

- [ ] **Step 2: 创建 `AlbumPanel.vue`**

```vue
<script setup lang="ts">
import { ref } from "vue";
import type { AlbumGaps, GamePoint } from "../../shared/types";

const props = defineProps<{
  gaps: AlbumGaps;
  stamps: string[];
  points: GamePoint[];
  bag: { id: string; name: string }[];
}>();

const emit = defineEmits<{ close: [] }>();

const tab = ref<"album" | "stamps">("album");
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <div class="tabs">
        <button
          type="button"
          class="tab"
          :class="{ on: tab === 'album' }"
          @click="tab = 'album'"
        >
          江湖见闻录
        </button>
        <button
          type="button"
          class="tab"
          :class="{ on: tab === 'stamps' }"
          @click="tab = 'stamps'"
        >
          行脚印
        </button>
      </div>
      <button class="close" type="button" aria-label="关闭" @click="emit('close')">×</button>
    </div>

    <div class="panel-body">
      <template v-if="tab === 'album'">
        <p class="group-title">已录 {{ props.gaps.got.length }} 条</p>
        <div class="grid">
          <div v-for="entry in props.gaps.got" :key="entry.id" class="entry entry-got">
            <p class="entry-name">{{ entry.name }}</p>
            <p class="entry-desc">{{ entry.desc }}</p>
          </div>
        </div>

        <p class="group-title">未录 {{ props.gaps.missing.length }} 条</p>
        <div class="grid">
          <div
            v-for="entry in props.gaps.missing"
            :key="entry.id"
            class="entry entry-missing"
          >
            <p class="entry-name">？</p>
            <p class="entry-desc">尚未录入</p>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="stamp-board">
          <div
            v-for="point in props.points"
            :key="point.id"
            class="stamp-slot"
            :class="{ 'stamp-on': props.stamps.includes(point.id) }"
          >
            <span class="stamp-mark">{{ props.stamps.includes(point.id) ? point.seal : "·" }}</span>
            <span class="stamp-name">{{ point.name }}</span>
          </div>
        </div>
        <p class="bag">
          行囊：{{ props.bag.length ? props.bag.map((i) => i.name).join(" · ") : "空空如也" }}
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  background: #fdfaf3;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #e4d9c4;
}
.tabs { display: flex; gap: 8px; }
.tab {
  padding: 7px 16px;
  border: 1px solid #d8ccb6;
  border-radius: 999px;
  background: transparent;
  font-size: 14px;
  color: #6f665c;
}
.tab.on { background: #b3402f; border-color: #b3402f; color: #fdf8f0; }
.close {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: #94897b;
}

.panel-body { flex: 1; overflow-y: auto; padding: 16px; }

.group-title {
  margin: 4px 0 10px;
  font-size: 13px;
  color: #94897b;
  letter-spacing: 1px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}
.entry {
  padding: 12px;
  border-radius: 10px;
  min-height: 92px;
}
.entry-got { background: #f7f0e0; border: 1px solid #e0cfae; }
.entry-missing { background: #f2efe9; border: 1px dashed #c9c0b0; }
.entry-name {
  margin: 0 0 6px;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 17px;
  letter-spacing: 1px;
}
.entry-missing .entry-name { color: #b3a894; }
.entry-desc { margin: 0; font-size: 12px; line-height: 1.7; color: #8a8073; }

.stamp-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 14px;
}
.stamp-slot { display: grid; justify-items: center; gap: 6px; }
.stamp-mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid #c9c0b0;
  color: #b3a894;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 22px;
}
.stamp-on .stamp-mark {
  background: #b3402f;
  border-color: #8f2f21;
  color: #fdf8f0;
  transform: rotate(-6deg);
}
.stamp-name { font-size: 12px; color: #8a8073; }

.bag {
  margin: 24px 0 0;
  padding-top: 14px;
  border-top: 1px solid #e4d9c4;
  font-size: 13px;
  color: #8a8073;
}
</style>
```

- [ ] **Step 3: 类型检查**

Run: `npm run typecheck`（cwd = `e:\code\jianghu-client\demo`）
Expected: 无报错。

- [ ] **Step 4: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/views/album/StampBurst.vue jianghu-client/demo/src/views/album/AlbumPanel.vue
git commit -m "feat(demo): 加落章飞行动画与见闻录册（见闻录/行脚印/行囊）"
```

---

### Task 11: 组装 `AlbumApp.vue`

**Files:**
- Modify: `e:\code\jianghu-client\demo\src\views\album\AlbumApp.vue`（覆盖 Task 8 Step 2 的临时版本）

- [ ] **Step 1: 覆盖 `AlbumApp.vue` 为完整版本**

```vue
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storage } from "../../platform";
import { albumEntries, points, sections } from "../../shared/content";
import { applyEffects, createState, markVisited } from "../../shared/engine";
import { clear, load, save } from "../../shared/persist";
import { albumGaps, pointState, progress, sectionUnlocked } from "../../shared/rules";
import type { GamePoint, GameState } from "../../shared/types";
import AlbumPanel from "./AlbumPanel.vue";
import MapCanvas from "./MapCanvas.vue";
import PointCard from "./PointCard.vue";
import StampBurst from "./StampBurst.vue";

const state = ref<GameState>(load(storage));
watch(state, (value) => save(storage, value), { deep: true });

const sectionsById: Record<string, (typeof sections)[number]> = Object.fromEntries(
  sections.map((s) => [s.id, s])
);

const nodes = computed(() =>
  points.map((point) => ({
    point,
    state: pointState(point, state.value, sectionsById[point.sectionId]),
  }))
);

const roads = computed(() =>
  sections.map((s) => ({ id: s.id, unlocked: sectionUnlocked(s, state.value) }))
);

const prog = computed(() => progress(state.value, points.length, albumEntries.length));
const gaps = computed(() => albumGaps(state.value, albumEntries));
const scorePercent = computed(() => {
  const full = prog.value.totalStamps * 10;
  return full === 0 ? 0 : Math.min(100, Math.round((prog.value.score / full) * 100));
});
const nextLockedSection = computed(() =>
  sections.find((s) => !sectionUnlocked(s, state.value))
);

const active = ref<GamePoint | null>(null);
const hint = ref("");
const albumOpen = ref(false);
const burst = ref<{ seal: string; x: number; y: number } | null>(null);

function pick(point: GamePoint) {
  const ps = pointState(point, state.value, sectionsById[point.sectionId]);
  if (ps === "locked") {
    hint.value = point.unlockHint ?? "此路暂不可通行";
    return;
  }
  hint.value = "";
  albumOpen.value = false;
  active.value = point;
}

function closeCard() {
  if (active.value) state.value = markVisited(state.value, active.value.id);
  active.value = null;
}

function onSolved() {
  const point = active.value;
  if (!point) return;
  state.value = applyEffects(state.value, point.effect);
  burst.value = { seal: point.seal, x: point.x, y: point.y };
}

function restart() {
  if (!window.confirm("重开会清空行脚印与见闻录，确定吗？")) return;
  clear(storage);
  state.value = createState();
  active.value = null;
  albumOpen.value = false;
  burst.value = null;
  hint.value = "";
}
</script>

<template>
  <div class="app">
    <header class="hud">
      <div class="hud-main">
        <span class="hud-title">江湖录 · 行脚图</span>
        <div class="bar">
          <div class="bar-fill" :style="{ width: `${scorePercent}%` }"></div>
        </div>
      </div>
      <div class="hud-side">
        <span class="hud-stat">行脚印 {{ prog.stamps }}/{{ prog.totalStamps }}</span>
        <button class="hud-btn" type="button" @click="albumOpen = true">见闻录</button>
        <button class="hud-btn" type="button" @click="restart">重开</button>
      </div>
    </header>

    <p v-if="nextLockedSection" class="gate">
      {{ nextLockedSection.name }} 解锁需：行脚印
      {{ prog.stamps }}/{{ nextLockedSection.requiresStamps }} · 见闻值
      {{ prog.score }}/{{ nextLockedSection.requiresScore }}
    </p>

    <main class="stage">
      <MapCanvas :points="nodes" :sections="roads" @pick="pick" />
      <Transition name="fade">
        <p v-if="hint" class="hint" @click="hint = ''">{{ hint }}</p>
      </Transition>
      <StampBurst
        v-if="burst"
        :seal="burst.seal"
        :x="burst.x"
        :y="burst.y"
        @done="burst = null"
      />
    </main>

    <Transition name="rise">
      <PointCard
        v-if="active"
        :key="active.id"
        :point="active"
        :state="pointState(active, state, sectionsById[active.sectionId])"
        :visited="state.visited.includes(active.id)"
        @close="closeCard"
        @solved="onSolved"
      />
    </Transition>

    <Transition name="fade">
      <AlbumPanel
        v-if="albumOpen"
        :gaps="gaps"
        :stamps="state.stamps"
        :points="points"
        :bag="state.bag"
        @close="albumOpen = false"
      />
    </Transition>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: #f6f0e4;
  border-bottom: 1px solid #e0d5c0;
}
.hud-main { flex: 1; min-width: 0; }
.hud-title {
  display: block;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 17px;
  letter-spacing: 3px;
  margin-bottom: 6px;
}
.bar {
  height: 6px;
  border-radius: 999px;
  background: #e4dac6;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: #b3402f;
  transition: width 0.4s ease-out;
}
.hud-side { display: flex; align-items: center; gap: 8px; }
.hud-stat { font-size: 13px; color: #6f665c; white-space: nowrap; }
.hud-btn {
  padding: 6px 12px;
  border: 1px solid #cbbfa9;
  border-radius: 999px;
  background: #fdfaf3;
  font-size: 13px;
}

.gate {
  margin: 0;
  padding: 7px 14px;
  font-size: 12px;
  color: #8a6b4f;
  background: #f7f0e0;
  border-bottom: 1px solid #e6d9c0;
}

.stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

.hint {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  margin: 0;
  max-width: 84%;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(59, 52, 44, 0.88);
  color: #f6f0e4;
  font-size: 13px;
  line-height: 1.6;
  cursor: pointer;
}

.rise-enter-active,
.rise-leave-active { transition: transform 0.28s ease-out; }
.rise-enter-from,
.rise-leave-to { transform: translateY(100%); }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease-out; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: 类型检查 + 单测 + 构建**

Run: `npm run typecheck; npm test; npm run build`（cwd = `e:\code\jianghu-client\demo`）
Expected: 三项全部通过；`dist/` 产物生成。

- [ ] **Step 3: 提交（需用户确认）**

```bash
git add jianghu-client/demo/src/views/album/AlbumApp.vue
git commit -m "feat(demo): 组装 AlbumApp（HUD 进度/解锁门槛提示/卡片调度/落章/图鉴/重开）"
```

---

### Task 12: 冒烟验收 + 截图自检

**Files:** 无新增（纯验收）

- [ ] **Step 1: 起 dev server**

Run: `npm run dev`（cwd = `e:\code\jianghu-client\demo`，后台运行）
Expected: 服务起在 `http://localhost:5173/`。

- [ ] **Step 2: 走完整闭环，逐节点截图**

按顺序操作并截图（用浏览器工具或 Playwright）：

1. 初始地图：确认段一 4 枚朱红脉冲印章、段二 2 枚灰印章、段二虚灰线、顶部「行脚印 0/6」、门槛提示「段二 · 龙潭山道 解锁需：行脚印 0/3 · 见闻值 0/30」。
2. 点「渡口告示」：卡片升起 → 三行旁白逐行渐显 → 出现三选项。**截图**。
3. 点错误选项：出现「不对。再想想。」且不落章、见闻值不变。**截图**。
4. 点正确选项：卡片出现「已录入见闻录 · 见闻值 +10」，同时印章从卡片顶部飞向地图「渡」点位并落定。**在飞行中截 1 张 + 落定后截 1 张**。
5. 关闭卡片 → 地图「渡」变朱红实底微倾；顶部变「行脚印 1/6」、进度条 1/6。**截图**。
6. 点「江滩酒坛」做 order 互动：用 ▲▼ 调序 → 点「定序」。**截图**（调序中 + 落章后各 1 张）。
7. 点「老船家」做 compose 互动：拼词 → 撤回一次 → 重拼 → 点「落笔」。**截图**。
8. 点「龙潭」做 choice → 答对。此时行脚印 4/6、见闻值 40。
9. 检查地图：段二驿道转为实线，两枚灰印章变朱红描边脉冲。**截图**。
10. 点「山巅孤松」（此时段二已解锁但 `requiresFlag: monk_told` 未满足）：底部应出现提示气泡「守山僧说山巅还有一株孤松，先去问过他」。**截图**。
11. 点「守山僧」做 order → 答对 → 再点「山巅孤松」做 compose → 答对。行脚印 6/6。**截图**。
12. 点顶部「见闻录」：见闻录页签「已录 6 条」「未录 0 条」；切「行脚印」页签看到 6 枚朱红印章 + 行囊「陈酒 · 赤果」。**两个页签各截 1 张**。
13. 刷新页面：进度与地图状态保持（localStorage 生效）。**截图**。
14. 点「重开」并确认：回到初始态（行脚印 0/6、全部灰/红描边复位）。**截图**。
15. 重新打开一个已 done 的点位：只显示旁白（**整段直接显示，无逐行渐显**）+ 完成态，不重复给奖励。**截图**。

- [ ] **Step 3: 逐条自查并记录问题**

对每张截图核对：
- 视觉：印章三态是否一眼可辨；远山是否水墨感而非色块；卡片升起/落章是否顺滑不跳。
- 手感：从点击点位到卡片升起、从答对到落章完成，是否有可感知的卡顿；脉冲环是否过快/过慢。
- 目标感：门槛提示文案是否清楚告知「差多少」；未解锁点位点击是否有明确反馈。
- 形态：整条闭环是否成立（是否有「不知道下一步干什么」的时刻）。

发现的问题**只记 1 个最关键问题 + 1 条改进措施**（用户规则：复盘不冗余）。若视觉/手感有硬伤，回对应 Task 调 CSS 参数后重跑本 Task。

- [ ] **Step 4: 关闭 dev server**

Run: 停止后台 dev 进程。
Expected: 端口 5173 释放。

- [ ] **Step 5: 最终回归**

Run: `npm test; npm run build`（cwd = `e:\code\jianghu-client\demo`）
Expected: 全绿 + 构建成功。

---

## 自检记录（Self-Review）

**1. Spec 覆盖核对**

| Spec 章节 | 落地 Task |
|---|---|
| §3 目录结构 | Task 1–11（另加 `src/style.css`、`demo/.gitignore`，均为必要补充） |
| §4 数据模型 | Task 2（`types.ts` 与 spec 一致，另加 `Progress`/`AlbumGaps`/`StorageLike` 三个派生类型） |
| §5 规则纯函数 | Task 4（`pointState` 增加第三个参数 `section`——spec 写作 `pointState(point, state)`，但判定路段锁必须知道路段门槛，故显式传入，保持纯函数性） |
| §6 引擎 | Task 5（另加 `markVisited`，用于「已读过的点位」这一 spec 字段的落地） |
| §7 存档 | Task 6 + Task 7（键 `jianghu_demo_save_v1`，注入式 `StorageLike`） |
| §8.1 界面分区 | Task 11 |
| §8.2 SVG 地图 | Task 8 |
| §8.3 点位卡片 | Task 9 |
| §8.4 三种互动 | Task 9 |
| §8.5 落章动画 | Task 10（纯 CSS 600ms） |
| §8.6 见闻录册 | Task 10 |
| §9 内容清单 | Task 3（6 点位 / 2 路段 / 6 见闻录；三种互动各 2 个） |
| §10 验收方式 | Task 3–6 单测、Task 11 构建、Task 12 手动冒烟截图 |
| §11 风险：SVG 像示意图 | Task 8 Step 3 单列视觉自查项 |
| §11 风险：文案失真 | Task 12 Step 3 明确区分「形态问题」与「文案问题」 |

**2. 占位符扫描**：计划内无 TBD / TODO / 「类似 Task N」；每个代码步骤均给出完整文件内容。

**3. 类型一致性核对**
- `GameState` 六个字段（flags/bag/stamps/album/score/visited）在 `types.ts`、`createState`、`persist.normalize`、`applyEffects` 四处完全一致。
- `pointState` 签名 `(point, state, section)` 在 `rules.ts`、`MapCanvas`（不直接调用）、`AlbumApp`（3 处调用）、`tests/rules.test.ts` 中一致。
- `progress(state, totalStamps, totalAlbum)` 签名在 `rules.ts`、`AlbumApp`、`tests/rules.test.ts` 中一致。
- `albumGaps(state, entries)` 返回 `AlbumGaps`，`AlbumPanel` 的 prop `gaps: AlbumGaps` 与之匹配。
- 组件 props/emits：`MapCanvas` `{points, sections}` / `pick`；`PointCard` `{point, state, visited}` / `close,solved`；`StampBurst` `{seal, x, y}` / `done`；`AlbumPanel` `{gaps, stamps, points, bag}` / `close`；三个 Box 的 `interact` / `submit` —— 与 Task 11 的模板用法逐一对应。
- `albumId` 与 `AlbumEntry.id` 复用同一 id 空间（均为点位 id），Task 3 的测试对此做了断言。

**4. 已知执行风险**
- `npm install` 需联网拉取 `vue-tsc`；若 `vue-tsc@^2.1.0` 与 `typescript@^5.5.0` 出现 peer 冲突，退路是把 `build` 脚本改回 `vite build`、`typecheck` 改为 `tsc --noEmit`（此时需在 `env.d.ts` 补 `declare module "*.vue"` 垫片）。
- `MapCanvas` 的 `transform-box: fill-box` 在极老浏览器可能不生效，导致 done 印章倾斜失效；退路是改用 `transform` 属性字符串 `rotate(-6)` 写在 `<g class="tilt">` 上。
