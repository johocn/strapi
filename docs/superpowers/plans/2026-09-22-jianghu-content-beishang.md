# 「游吉林市北上」C 端 · content 正剧初版（北上剧目 2 场景打通）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 写一份可玩的正剧初版北上剧目，打通「松花江渡口 → 龙潭山」两个场景（主线剧情 + 取物/探听/登山支线 + 跨场景跳转），并为 core 引擎新增 `loadScene` 跨场景装载能力，最后接进 H5 壳可实际游玩。

**Architecture:** 剧本以「纯数据 TS 模块」承载（与现有 `demoScene.ts` 的 `Scene` 类型一致，等同于 JSON 结构）。core `Engine` 新增可选场景解析器 `resolveScene` 与公开方法 `loadScene(next)`：选项 `goto:"=sceneid"` 时经解析器找到场景并装载（替换 scene、state.sceneId、program=next.entry、发射 scene 指令、跑 entry）。内容放在独立 `content/` 包，H5 通过相对路径消费；`content` 自身用 vitest 做结构 lint（options goto 目标、`=场景` 目标、条件引用一致性），对照 spec §9「脚本做结构 lint」。

**Tech Stack:** 纯 TS（core 同栈）+ Vitest。core 现有引擎（本计划 Task 1 做增强）。H5 壳（Vue3+Vite）仅改一处接线。

**项目位置:**
- core: `e:\code\jianghu-client\core\`
- content: `e:\code\jianghu-client\content\`（新包，纯数据 + lint）
- h5: `e:\code\jianghu-client\shells\h5\`

---

## 文件结构

```
e:\code\jianghu-client\
├─ core\
│  └─ src\engine\engine.ts        # 改：loadScene + resolveScene
│  └─ tests\engine-scene.test.ts  # 新：跨场景装载测试
├─ content\                       # 新包
│  ├─ package.json                # vitest
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  └─ src\northward.ts            # 北上剧目数据：wudai + longtan，导 scenes/startSceneId
│  └─ tests\content-lint.test.ts  # 结构 lint
└─ shells\h5\
   └─ src\engine\useGame.ts       # 改：接 content，弃 demoScene
   └─ src\scenes\demoScene.ts     # 删（死代码）
```

**恒定类型契约（跨任务、勿改名）：**
- core `Engine` 构造签名：`new Engine(scene)` 不变；新增可选第二参 `new Engine(scene, { resolveScene?: (id:string)=>Scene|undefined })`。
- 新增公开方法 `Engine.loadScene(next: Scene): void`。
- 选项 `goto` 约定不变：`goto "=场景id"` = 跨场景；其他 = 当前行为程序作用域内的 behavior id。
- content 导出：`export const scenes: Record<string,Scene>`、`export const startSceneId = "wudai"`。
- content 内跨包引用 core 类型用相对无后缀导入：`import type { Scene } from "../../core/src/index"`。
- H5 `useGame` 仍返回 `{ state, triggerPoint, pick }`。

---

## Task 1: core 增强 —— loadScene 跨场景装载

> 背景：core `Engine.followGoto` 对 `goto:"=id"` 目前只更新 `state.sceneId`，不发射 scene 指令、不载新场景 entry。本任务新增场景解析器 + `loadScene`，让 `=id` 真正切换到另一场景并可继续游玩。`loadScene` 内部走 `emitScene()`（发射 scene 指令 + fx）并跑新场景 entry，与 `start()` 语义一致。

**Files:**
- Modify: `e:\code\jianghu-client\core\src\engine\engine.ts`
- Test: `e:\code\jianghu-client\core\tests\engine-scene.test.ts`

- [ ] **Step 1: 写失败测试（engine-scene.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import { Engine } from "../src/engine/engine";
import type { Scene } from "../src/dsl/types";
import type { RenderCommand } from "../src/render/commands";

const longtan: Scene = {
  id: "longtan", name: "龙潭山", bg: "mountain", fx: "山雾", points: [],
  entry: [{ t: "narration", text: "船抵龙潭山，山道湿滑。" }],
};

const wudai: Scene = {
  id: "wudai", name: "松花江渡口", bg: "riverside", fx: "晨雾", points: [
    { id: "boat", x: 0.7, y: 0.5, icon: "船", on: [
      { t: "dialog", npc: "老船家", text: "开船北上？", options: [
        { label: "随船北上", goto: "=longtan" },
        { label: "再等等", goto: "stay" },
      ] },
      { id: "stay", t: "monologue", text: "（暂候江风。）" },
    ] },
  ],
  entry: [{ t: "narration", text: "渡口晨雾。" }],
};

const scenes: Record<string, Scene> = { wudai, longtan };

function runWithResolver(): { cmds: RenderCommand[]; e: Engine } {
  const cmds: RenderCommand[] = [];
  const e = new Engine(wudai, { resolveScene: (id) => scenes[id] });
  e.onCmd = (c) => cmds.push(c);
  e.start();
  return { cmds, e };
}

describe("engine.loadScene", () => {
  it("选项 goto =id 经 resolveScene 装载新场景并跑 entry", () => {
    const { cmds, e } = runWithResolver();
    e.triggerPoint("boat");
    cmds.length = 0; // 只留切场景指令
    e.choose("随船北上");
    expect(e.state.sceneId).toBe("longtan");
    // 发射新场景 scene 指令
    const sceneCmd = cmds.find((c) => c.t === "scene") as { scene: Scene } | undefined;
    expect(sceneCmd?.scene.id).toBe("longtan");
    // 跑新场景 entry（含 scene 的 fx + entry narration）
    expect(cmds.some((c) => c.t === "narration" && (c as { text: string }).text.includes("龙潭山"))).toBe(true);
  });

  it("loadScene 后 getPendingOptions 清空，可在新场景继续触发", () => {
    const { e } = runWithResolver();
    e.triggerPoint("boat");
    e.choose("随船北上");
    expect(e.getPendingOptions()).toEqual([]);
  });

  it("无解析器的 =id 仅更新 sceneId，不抛错不崩溃", () => {
    const cmds: RenderCommand[] = [];
    const e = new Engine(wudai);
    e.onCmd = (c) => cmds.push(c);
    e.start();
    e.triggerPoint("boat");
    expect(() => e.choose("随船北上")).not.toThrow();
    expect(e.state.sceneId).toBe("longtan"); // 兜底仅改名
    expect(cmds.some((c) => c.t === "scene")).toBe(false); // 不发射新场景
  });

  it("直接调用 loadScene 合法切换到任意场景", () => {
    const { cmds, e } = runWithResolver();
    cmds.length = 0;
    e.loadScene(longtan);
    expect(e.state.sceneId).toBe("longtan");
    expect(cmds.some((c) => c.t === "scene" && (c as { scene: Scene }).scene.id === "longtan")).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run（`core` 下）: `npx vitest run tests/engine-scene.test.ts`
Expected: FAIL（Engine 无 `resolveScene` 第二参 / `loadScene` 成员，TS 报错）。

- [ ] **Step 3: 实现（engine.ts 增强）**

在类内新增构造第二参、`resolveScene` 字段、公开 `loadScene`，并把 `followGoto` 的 `=` 分支改成经解析器装载：

```ts
export class Engine {
  onCmd: (cmd: RenderCommand) => void = () => {};
  onPick: () => string = () => "";
  readonly state: GameState;
  private scene: Scene;
  private program: Behavior[] = [];
  private resolveScene?: (id: string) => Scene | undefined;

  constructor(scene: Scene, opts: { resolveScene?: (id: string) => Scene | undefined } = {}) {
    this.scene = scene;
    this.resolveScene = opts.resolveScene;
    this.state = createState(scene.id);
  }

  /** 切换到新场景：替换 scene + 装载 entry，发射 scene 指令。可在壳层直接调用。 */
  loadScene(next: Scene): void {
    this.scene = next;
    this.state.sceneId = next.id;
    this.program = next.entry;
    this.lastOptions = [];
    this.emitScene();
    this.runBehaviors(this.program);
  }
  // …（其余方法不变）

  private followGoto(target: string): void {
    if (target.startsWith("=")) {
      const id = target.slice(1);
      const next = this.resolveScene?.(id);
      if (next) {
        this.loadScene(next);
      } else {
        this.state.sceneId = id; // 兜底：仅更新 sceneId
      }
      return;
    }
    const found = this.program.filter((b) => b.id === target);
    this.runBehaviors(found);
  }
```

> 注意：`loadScene` 中 `this.lastOptions = []` 与 `emitScene`/`runBehaviors` 的顺序——先清选项，再发射 scene（binding handle 在 scene 情况下也会清 options/lines），再跑 entry（可能再产生新选项，覆盖 lastOptions），语义正确。

- [ ] **Step 4: 运行 core 全量测试**

Run（`core` 下）: `npx vitest run`
Expected: 全部 PASS（新增 4 it + 既有 15 it）。

- [ ] **Step 5: 校验 core 编译**

Run（`core` 下）: `npx tsc --noEmit -p tsconfig.json`
Expected: 退出码 0。

- [ ] **Step 6: Commit**

```bash
git add e:/code/jianghu-client/core
git commit -m "feat(core): Engine.loadScene 跨场景装载 + 可选场景解析器"
```

---

## Task 2: content 包脚手架 + 北上剧目数据（苏联初版）

**Files:**
- Create: `e:\code\jianghu-client\content\package.json`
- Create: `e:\code\jianghu-client\content\tsconfig.json`
- Create: `e:\code\jianghu-client\content\vite.config.ts`
- Create: `e:\code\jianghu-client\content\src\northward.ts`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "@jianghu/content",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: 写 vite.config.ts（仅供 vitest 跑 lint）**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] }
});
```

- [ ] **Step 4: 写北上剧目数据 src/northward.ts**

```ts
import type { Scene } from "../../core/src/index";

// —— 场景 1：松花江渡口 ——
export const wudai: Scene = {
  id: "wudai",
  name: "松花江渡口",
  bg: "riverside",
  fx: "晨雾",
  points: [
    {
      id: "barrel", x: 0.2, y: 0.68, icon: "坛",
      on: [
        { t: "narration", text: "江滩芦苇丛里半埋着一只青瓷泥封酒坛，坛身满是潮苔。" },
        { t: "take", item: "酒" },
        { t: "monologue", text: "（你启了封泥，酒香混着江风扑面而来。）" },
      ],
    },
    {
      id: "notice", x: 0.5, y: 0.3, icon: "告",
      on: [
        { t: "narration", text: "渡口木柱钉着一卷泛黄告示：「……龙潭山塌方封路，北上请改走旱道。」落款依稀是官府印。" },
        { t: "setflag", flag: "wanted", value: true },
        { t: "monologue", text: "（封路？你记下了这蹊跷之处。）" },
      ],
    },
    {
      id: "boat", x: 0.76, y: 0.55, icon: "船",
      on: [
        {
          t: "dialog", npc: "老船家", text: "小郎君，可是要摆渡北上？今儿的江水可不小哇。",
          options: [
            { label: "问北上前路", goto: "route" },
            { label: "递上酒水，求开船", goto: "gift", cond: "bag.has(酒)" },
            { label: "提起那张封路告示", goto: "warn" },
            { label: "先不渡了", goto: "stay" },
          ],
        },
        { id: "route", t: "dialog", npc: "老船家", text: "北上顺松花江，先抵龙潭山，再溯江可通塞外。只是山中近日不太平，夜里常有人迷糊失踪。" },
        { id: "warn", t: "dialog", npc: "老船家", text: "那封路是官面文章。龙潭山笑云梯我走了半辈子没塌过——多半是贼人做手脚，断游客的心。" },
        {
          id: "gift", t: "dialog", npc: "老船家", text: "好一坛陈酿！冲你这诚意，老夫今儿闯一回江。坐稳了！",
          options: [
            { label: "随船北上", goto: "=longtan" },
            { label: "酒留下，人明日再走", goto: "stay2" },
          ],
        },
        { id: "stay2", t: "monologue", text: "（你把酒留在船头，望着江水发怔。）" },
        { id: "stay", t: "monologue", text: "（江风寒，暂且立在渡口打探。）" },
      ],
    },
  ],
  entry: [
    { t: "narration", text: "晨雾锁江，松花江水拍打渡口栈桥。北上，就在这一程又一程的舟楫之间。" },
    { t: "dialog", npc: "老船家", text: "客官远来，可是要过江？" },
  ],
};

// —— 场景 2：龙潭山 ——
export const longtan: Scene = {
  id: "longtan",
  name: "龙潭山",
  bg: "mountain",
  fx: "山雾",
  points: [
    {
      id: "tan", x: 0.3, y: 0.35, icon: "潭",
      on: [
        { t: "narration", text: "山腹一泓幽潭，水色青碧、深不见底，四周寒雾缭绕。这便是龙潭。" },
        { t: "take", item: "龙潭水" },
        { t: "monologue", text: "（你掬一捧潭水饮下，甘冽异常，头脑清明了几分。）" },
      ],
    },
    {
      id: "monk", x: 0.7, y: 0.4, icon: "僧",
      on: [
        {
          t: "dialog", npc: "守山僧", text: "施主可是闻了封路告示而来？那是装的——只因山里少了一物，规矩才乱起来。",
          options: [
            { label: "缺了什么？", goto: "what" },
            { label: "那与我有何干", goto: "leave" },
          ],
        },
        { id: "what", t: "dialog", npc: "守山僧", text: "龙潭山巅有株百年雪松，逢仲秋结赤果，保山里平安。昨日信香忽断……若你能替我寻回赤果，我便指你一条北上密道。" },
        { id: "leave", t: "monologue", text: "（你称谢告辞，心中把这桩事记下了。）" },
      ],
    },
    {
      id: "pine", x: 0.55, y: 0.2, icon: "松",
      on: [
        { t: "narration", text: "山巅孤松斜立崖畔，风过枝梢似有幽鸣。未见赤果。" },
        { t: "check", item: "龙潭水" },
        { t: "take", item: "赤果" },
        { t: "narration", text: "你用掬来的潭水浇灌树根，果见一枚赤果坠入掌中，热意灼人。" },
      ],
    },
  ],
  entry: [
    { t: "narration", text: "船抵龙潭山下，山道湿滑、云松蔽日。过了这道山，才是真正的北行之路。" },
    { t: "monologue", text: "（你紧了紧行囊。这段路，是一个人走的。）" },
  ],
};

export const scenes: Record<string, Scene> = { wudai, longtan };
export const startSceneId = "wudai";
```

- [ ] **Step 5: 安装依赖 + 类型校验**

Run（`content` 下）: `npm install`
随后: `npx tsc --noEmit -p tsconfig.json`
Expected: 安装成功、tsc 退出码 0。

- [ ] **Step 6: Commit**

```bash
git add e:/code/jianghu-client/content
git commit -m "feat(content): 北上剧目初版数据（渡口→龙潭山）"
```

---

## Task 3: content 结构 lint（正文校验）

> 对照 spec §9：「content 脚本做结构 lint（参照既有 check.js 章节/引用一致性）」。本 lint 断言：每题行为作用域内选项 `goto`（非 `=`）目标 id 必须存在于同一作用域；`goto:"=场景"` 目标必须存在于 `scenes`；条件表达式引用的 bag/flag 具名项与创作意图一致（本初版仅校验单引号内非空、不引同场景未知键——保持轻量可扩展）。

**Files:**
- Create: `e:\code\jianghu-client\content\tests\content-lint.test.ts`

- [ ] **Step 1: 写失败测试（content-lint.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import { scenes } from "../src/northward";
import type { Scene, Behavior } from "../../core/src/index";

/** 收集某行为程序作用域内所有具名 id */
function collectIds(list: Behavior[], acc: Set<string>): void {
  for (const b of list) {
    if (b.id) acc.add(b.id);
    if (b.options) for (const o of b.options) if (o.goto && !o.goto.startsWith("=")) acc.add(o.goto);
  }
}

/** 遍历某场景全部行为，校验选项 goto 目标一致性 */
function assertSceneConsistent(scene: Scene): void {
  const ids = new Set<string>();
  for (const p of scene.points) if (p.on) collectIds(p.on, ids);
  collectIds(scene.entry, ids);
  for (const p of scene.points) if (p.on) assertProgram(p.on, scene.id, ids);
  assertProgram(scene.entry, scene.id, ids);
}

function assertProgram(list: Behavior[], sceneId: string, known: Set<string>): void {
  for (const b of list) {
    for (const o of b.options ?? []) {
      if (!o.goto) continue;
      if (o.goto.startsWith("=")) {
        const target = o.goto.slice(1);
        expect(scenes[target], `[${sceneId}] 跨场景跳到不存在场景 ${target}`).toBeDefined();
      } else {
        expect(known.has(o.goto), `[${sceneId}] 选项 goto 指向不存在 id：${o.goto}`).toBe(true);
      }
    }
  }
}

describe("content 结构 lint", () => {
  it("存在 start 场景且每个场景 id 唯一", () => {
    const ids = Object.values(scenes).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("所有场景选项 goto 目标一致（行为内 id / 跨场景 = 场景）", () => {
    for (const s of Object.values(scenes)) assertSceneConsistent(s);
  });

  it("条件表达式仅引用已定义物品/flag 语义（非空单参数）", () => {
    for (const s of Object.values(scenes)) {
      for (const p of s.points) if (p.on) assertConds(p.on);
      assertConds(s.entry);
    }
    function assertConds(list: Behavior[]): void {
      for (const b of list) {
        const cond = b.cond;
        if (cond) expect(cond, `[${s.id}] 空/非法条件 ${cond}`).toMatch(/^(flag\([^()]+\)|bag\.has\([^()]+\))$|^\s*$/);
        for (const o of b.options ?? []) {
          if (o.cond) expect(o.cond, `[${s.id}] 空/非法选项条件 ${o.cond}`).toMatch(/^(flag\([^()]+\)|bag\.has\([^()]+\))$|^\s*$/);
        }
      }
    }
  });
});
```

> 说明：`cond` 表达式匹配沿用 core `evalCond` 支持的两种形式 `flag(x)` / `bag.has(x)`；空条件（undefined）不参与。此断言确保剧本不引 core 无法求值的表达式。

- [ ] **Step 2: 运行确认通过**

Run（`content` 下）: `npx vitest run`
Expected: 3 tests PASS（正常数据集下 lint 应通过；若 grep 到你的剧本不一致会失败，反查 Task 2 数据）。

- [ ] **Step 3: Commit**

```bash
git add e:/code/jianghu-client/content
git commit -m "test(content): 剧本结构 lint（引用/跨场景/条件一致性）"
```

---

## Task 4: H5 接线上 content（弃 demoScene）

> 让 H5 壳直接用正剧内容：`useGame` 构造 Engine 时注入 `resolveScene`（映射 scenes），start 场景= `wudai`。删除不再使用的 `demoScene.ts`。

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\engine\useGame.ts`
- Delete: `e:\code\jianghu-client\shells\h5\src\scenes\demoScene.ts`

- [ ] **Step 1: 改写 useGame.ts 接 content**

```ts
import { reactive } from "vue";
import { Engine } from "@core";
import { scenes, startSceneId } from "../../../../content/src/northward";
import { GameBinding, type UiState } from "./binding";

const binding = new GameBinding(
  new Engine(scenes[startSceneId], { resolveScene: (id) => scenes[id] })
);
binding.start();

const state = reactive<UiState>(binding.state);

export function useGame() {
  return {
    state,
    triggerPoint: (id: string) => binding.triggerPoint(id),
    pick: (label: string) => binding.pick(label),
  };
}
```

> 相对路径从 `shells/h5/src/engine/useGame.ts` 上溯 4 层到 `jianghu-client`，再接 `content/src/northward`（无后缀，Bundler resolution 解析 `.ts`）。

- [ ] **Step 2: 删除 demoScene.ts**

```bash
rm e:/code/jianghu-client/shells/h5/src/scenes/demoScene.ts
```

- [ ] **Step 3: 类型校验 + 全量测试**

Run（`shells\h5` 下）: `npx tsc --noEmit -p tsconfig.json`
Expected: 退出码 0。

Run（`shells\h5` 下）: `npx vitest run`
Expected: binding.test 4 it PASS。

- [ ] **Step 4: 构建校验**

Run（`shells\h5` 下）: `npm run build`
Expected: `dist/` 生成，无报错。

- [ ] **Step 5: 冒烟（手动确认可）**

Run（`shells\h5` 下）: `npm run dev`（前台观察启动日志无报错）
Expected: Vite dev server 启动，浏览器打开 `http://localhost:5173` 可玩：点「坛」取酒 → 点「船」talk → 选项「递上酒水求开船」与「问前路」「封路告示」分支 → 选中「随船北上」→ 场景切换至「龙潭山」（场景名/雾效变化）→ 点「潭」取水 → 点「松」用「龙潭水」浇灌得赤果 → 点「僧」触发支线对话。跨场景跳转正确切换 scene（场景标题变为龙潭山）。

- [ ] **Step 6: Commit**

```bash
git add e:/code/jianghu-client/shells/h5
git commit -m "feat(h5): 接入北上正剧内容，移除 demoScene"
```

---

## 自审清单（plan→spec 对照）

- spec §2 叙事面板式场景+对话抽屉 → H5 壳已具备，content 只喂 `Scene` 数据+跨场景，不改壳结构。
- spec §6 脚本 DSL（narration/dialog/options/take/check/setflag/goto=`=场景`） → content 数据覆盖；`goto "=id"` 由 Task 1 `loadScene` 支持。
- spec §9 内容结构 lint → Task 3 `content-lint.test.ts`（引用/跨场景/条件一致性，参照 check.js 思路）。
- spec §5 目录 `jianghu-client/content/` → 新增独立 content 包，纯数据，不含壳逻辑。
- spec §8 坏脚本回退 → core `loadScene` 对无解析器的 `=id` 兜底仅更新 sceneId，不崩溃（Task 1 测试覆盖）。
- 后续子系统：shells/mp、shells/game 各自独立 plan，不在本计划范围；内容为纯数据，后端壳可复用。

**范围取舍说明：** 用户跳过场景数提问，本计划默认 2 场景打通（渡口→龙潭山）以展示跨场景能力并给 core 必要的 `loadScene` 增强；若用户只要 1 场景，Task 1/4 保持不变（`loadScene` 仍可用），仅 Task 2 减少 longtan 数据即可。