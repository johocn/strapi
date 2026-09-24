# 文字江湖「游吉林市北上」C 端 · core 纯TS引擎 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现平台无关的纯TS剧本引擎（读 JSON 脚本 → 状态机 → 输出 render commands + 事件），零运行时依赖，供 H5/小程序/小游戏三壳复用。

**Architecture:** core 只含「DSL 类型 + 状态 + 引擎解释器 + 渲染指令定义」。引擎消费 `content/` 下的场景 JSON，逐条推进行为节点（behavior），通过回调把 `RenderCommand` 推给壳、把选项连回引擎。壳只消费指令、不碰引擎内部。

**Tech Stack:** TypeScript（strict）、Vitest、Vite（lib 模式）。
**项目位置:** `e:\code\jianghu-client\core\`（独立目录；**不碰 nest、不依赖任何 npm 包** —— 除 dev 依赖 vitest/vite/typescript）。

**参考 spec:** `e:\code\docs\superpowers\specs\2026-09-22-jianghu-cend-components-design.md`

---

## 文件结构

```
e:\code\jianghu-client\core\
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ src\
│  ├─ index.ts              # 公共导出
│  ├─ dsl\types.ts          # JSON 脚本类型（Scene/Behavior/OptionItem）
│  ├─ render\commands.ts    # RenderCommand 联合类型 + 场景快照
│  ├─ state\state.ts        # GameState（flags/vars/bag/history）
│  ├─ engine\engine.ts      # Engine：载入场景、推进节点、产指令
│  └─ engine\cond.ts        # 条件表达式求值（flag/bag.has/clear）
└─ tests\
   ├─ cond.test.ts
   ├─ state.test.ts
   └─ engine.test.ts
```

恒定约定（跨任务共用，勿改名）：
- 类型 `Scene`、`Behavior`、`OptionItem`、`InteractPoint`、`GameState`、`RenderCommand` 且字段名以本计划为准。
- 引擎回调签名：`onCmd(cmd: RenderCommand): void`；
  等待选择：`await engine.choose(engine.getPendingOptions())`。
- 条件函数：`evalCond(cond: string, s: GameState): boolean`。

---

## Task 1: 工程脚手架 + DSL 类型

**Files:**
- Create: `e:\code\jianghu-client\core\package.json`
- Create: `e:\code\jianghu-client\core\tsconfig.json`
- Create: `e:\code\jianghu-client\core\vite.config.ts`
- Create: `e:\code\jianghu-client\core\src\dsl\types.ts`
- Create: `e:\code\jianghu-client\core\src\index.ts`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "@jianghu/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
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
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 写 vite.config.ts（lib 构建，双格式）**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: { entry: resolve(__dirname, "src/index.ts"), formats: ["es", "cjs"] },
    outDir: "dist"
  },
  test: { include: ["tests/**/*.test.ts"] }
});
```

- [ ] **Step 4: 写 DLS 类型（dsl/types.ts）**

```ts
/** 可触发交互点 / 场景行为单元（behavior）的共享定义 */
export type BehaviorType =
  | "narration"   // 旁白
  | "dialog"      // 对话（npc + 可选 options）
  | "monologue"   // 内心独白
  | "voiceoff"    // 画外音
  | "options"     // 显式分支出选项
  | "goto"        // 跳转场景
  | "take"        // 收道具
  | "check"       // 校验道具
  | "setflag"     // 设置状态
  | "fight"       // 战斗（本计划仅占位）
  | "teleport";   // 地图传送（本计划仅占位）

export interface OptionItem {
  label: string;
  goto?: string;      // 跳转到的 behavior id 或场景 entry
  cond?: string;      // 条件表达式，空/缺省视为恒真
}

export interface InteractPoint {
  id: string;
  x: number;   // 0..1 相对坐标
  y: number;
  icon: string;
  on?: Behavior[];   // 触发该点后的行为
}

export interface Behavior {
  id?: string;
  t: BehaviorType;
  text?: string;         // narration/dialog/monologue/voiceoff 用
  npc?: string;          // dialog 说话者
  options?: OptionItem[];// dialog/options 分支
  goto?: string;         // 跳转目标（behavior id | "=场景id"）
  flag?: string;         // setflag 的键
  value?: boolean | string | number;
  item?: string;         // take/check 的物品
  sceneId?: string;      // goto/teleport 的场景 id
  children?: Behavior[]; // 嵌套（本计划可忽略）
  cond?: string;         // 如需节点级条件
}

export interface Scene {
  id: string;
  name: string;
  bg: string;
  fx?: string;
  points: InteractPoint[];
  entry: Behavior[];   // 进入场景的首段剧情
}
```

- [ ] **Step 5: 写 index.ts（暂导出类型，后续任务追加 Engine）**

```ts
export type * from "./dsl/types";
```

- [ ] **Step 6: 校验类型编译**

Run（在 `e:\code\jianghu-client\core`）: `npx tsc --noEmit -p tsconfig.json`
Expected: 退出码 0，无报错。

- [ ] **Step 7: Commit**

```bash
git add e:/code/jianghu-client/core
git commit -m "feat(core): 工程脚手架 + DLS 类型定义"
```

---

## Task 2: GameState 状态

**Files:**
- Create: `e:\code\jianghu-client\core\src\state\state.ts`
- Modify: `e:\code\jianghu-client\core\src\index.ts`
- Test: `e:\code\jianghu-client\core\tests\state.test.ts`

- [ ] **Step 1: 写失败测试（state.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import { createState, applyBehaviorEffects } from "../src/state/state";
import type { Behavior } from "../src/dsl/types";

describe("createState", () => {
  it("初始化空状态", () => {
    const s = createState("wudai");
    expect(s.sceneId).toBe("wudai");
    expect(s.flags).toEqual({});
    expect(s.bag).toEqual([]);
  });
});

describe("applyBehaviorEffects", () => {
  it("setflag 写入 flags", () => {
    const s = createState("wudai");
    applyBehaviorEffects(s, { t: "setflag", flag: "met_boatman", value: true });
    expect(s.flags["met_boatman"]).toBe(true);
  });

  it("take 将物品加入背包（去重）", () => {
    const s = createState("wudai");
    applyBehaviorEffects(s, { t: "take", item: "酒" });
    applyBehaviorEffects(s, { t: "take", item: "酒" });
    expect(s.bag).toEqual(["酒"]);
  });

  it("check 命中失败时不做修改并返回 false", () => {
    const s = createState("wudai");
    const ok = applyBehaviorEffects(s, { t: "check", item: "玉佩" }).ok;
    expect(ok).toBe(false);
    expect(s.bag).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run（`core` 下）: `npx vitest run tests/state.test.ts`
Expected: FAIL（模块或 createState 未定义）。

- [ ] **Step 3: 实现 state.ts**

```ts
import type { Behavior } from "../dsl/types";

export interface GameState {
  sceneId: string;
  flags: Record<string, boolean>;
  vars: Record<string, number>;
  bag: string[];
  history: string[];
}

export function createState(sceneId: string): GameState {
  return { sceneId, flags: {}, vars: {}, bag: [], history: [] };
}

export function applyBehaviorEffects(
  s: GameState,
  b: Behavior
): { ok: boolean } {
  switch (b.t) {
    case "setflag":
      s.flags[b.flag!] = b.value !== false;
      return { ok: true };
    case "take":
      if (b.item && !s.bag.includes(b.item)) s.bag.push(b.item);
      return { ok: true };
    case "check":
      if (b.item && s.bag.includes(b.item)) {
        s.bag = s.bag.filter((it) => it !== b.item); // 消耗道具
        return { ok: true };
      }
      return { ok: false };
    case "goto":
      if (b.sceneId) s.sceneId = b.sceneId;
      return { ok: true };
    default:
      return { ok: true };
  }
}
```

- [ ] **Step 4: 导出并在 index.ts 追加**

```ts
export type * from "./dsl/types";
export { createState, applyBehaviorEffects } from "./state/state";
export type { GameState } from "./state/state";
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run tests/state.test.ts`
Expected: 4 tests PASS。

- [ ] **Step 6: Commit**

```bash
git add e:/code/jianghu-client/core
git commit -m "feat(core): GameState 与行为副作用（flag/道具）"
```

---

## Task 3: 条件表达式求值 evalCond

**Files:**
- Create: `e:\code\jianghu-client\core\src\engine\cond.ts`
- Modify: `e:\code\jianghu-client\core\src\index.ts`
- Test: `e:\code\jianghu-client\core\tests\cond.test.ts`

- [ ] **Step 1: 写失败测试（cond.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import { evalCond } from "../src/engine/cond";
import { createState } from "../src/state/state";

const s = createState("wudai");
s.flags["met_boatman"] = true;
s.bag = ["酒"];

describe("evalCond", () => {
  it("空/缺省为真", () => {
    expect(evalCond("", s)).toBe(true);
    expect(evalCond(undefined as any, s)).toBe(true);
  });
  it("flag(x) / !flag(x)", () => {
    expect(evalCond("flag(met_boatman)", s)).toBe(true);
    expect(evalCond("!flag(met_boatman)", s)).toBe(false);
    expect(evalCond("flag(nothing)", s)).toBe(false);
  });
  it("bag.has(item)", () => {
    expect(evalCond("bag.has(酒)", s)).toBe(true);
    expect(evalCond("bag.has(玉佩)", s)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/cond.test.ts`
Expected: FAIL（evalCond 未定义）。

- [ ] **Step 3: 实现 cond.ts**

```ts
import type { GameState } from "../state/state";

export function evalCond(cond: string | undefined | null, s: GameState): boolean {
  if (!cond || cond.trim() === "") return true;
  const c = cond.trim();
  // 取反
  if (c.startsWith("!")) return !evalCond(c.slice(1), s);

  let m = c.match(/^flag\((.+?)\)$/);
  if (m) return s.flags[m[1]!] === true;

  m = c.match(/^bag\.has\((.+?)\)$/);
  if (m) return s.bag.includes(m[1]!);

  return false; // 未知表达式保守为假
}
```

- [ ] **Step 4: 导出**

```ts
export { evalCond } from "./engine/cond";
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run tests/cond.test.ts`
Expected: 7 tests PASS。

- [ ] **Step 6: Commit**

```bash
git add e:/code/jianghu-client/core
git commit -m "feat(core): 条件表达式求值 flag/bag.has"
```

---

## Task 4: Engine 核心（载入场景 / 推进节点 / 产渲染指令）

**Files:**
- Create: `e:\code\jianghu-client\core\src\render\commands.ts`
- Create: `e:\code\jianghu-client\core\src\engine\engine.ts`
- Modify: `e:\code\jianghu-client\core\src\index.ts`
- Test: `e:\code\jianghu-client\core\tests\engine.test.ts`

- [ ] **Step 1: 写渲染指令 commands.ts**

```ts
import type { OptionItem, Scene } from "../dsl/types";

export type RenderCommand =
  | { t: "narration"; text: string }
  | { t: "dialog"; npc: string; text: string }
  | { t: "monologue"; text: string }
  | { t: "voiceoff"; text: string }
  | { t: "fx"; kind: string }
  | { t: "options"; options: OptionItem[] }
  | { t: "scene"; scene: Scene };
```

- [ ] **Step 2: 写失败测试（engine.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import { Engine } from "../src/engine/engine";
import type { Scene, RenderCommand } from "../src";

const scene: Scene = {
  id: "wudai",
  name: "松花江渡口",
  bg: "wudai_bg",
  fx: "晨雾",
  points: [],
  entry: [
    { t: "narration", text: "雾锁十里长堤。" },
    { t: "dialog", npc: "老船家", text: "小郎君可是要渡江？",
      options: [
        { label: "问路线", goto: "route" },
        { label: "送酒", goto: "gift", cond: "bag.has(酒)" }
      ] },
    { id: "route", t: "narration", text: "顺江南下可至龙潭山。" },
    { id: "gift", t: "narration", text: "船家欣然收酒。" }
  ]
};

async function collect(scene: Scene, pick?: number) {
  const cmds: RenderCommand[] = [];
  const e = new Engine(scene);
  e.onCmd = (c) => cmds.push(c);
  if (pick !== undefined) e.onPick = () => label(e, pick);
  e.start();
  if (pick !== undefined) { await flush(); }
  return { cmds, e };
}
const label = (e: Engine, i: number) => { const o = e.getPendingOptions(); return o[i]?.label ?? ""; };
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe("Engine", () => {
  it("进入场景发出 scene + narration + dialog 指令", async () => {
    const { cmds } = await collect(scene);
    expect(cmds[0]!.t).toBe("scene");
    expect(cmds.some((c) => c.t === "narration" && c.text.includes("雾锁"))).toBe(true);
    const dlg = cmds.find((c) => c.t === "dialog") as any;
    expect(dlg?.npc).toBe("老船家");
  });

  it("无选项时顺序推进到结束", async () => {
    const { cmds } = await collect(scene);
    expect(cmds.length).toBeGreaterThanOrEqual(3);
  });
});
```

> 说明：本测试覆盖「场景载入 + 顺序推进 + 对话/旁白指令」。选项分支与条件的逻辑在 Task 5 单独用更直接的测法补齐，避免异步时序脆弱。

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run tests/engine.test.ts`
Expected: FAIL（Engine 未定义）。

- [ ] **Step 4: 实现 Engine（engine.ts）**

```ts
import type { Behavior, Scene, OptionItem } from "../dsl/types";
import type { RenderCommand } from "../render/commands";
import { createState, applyBehaviorEffects, type GameState } from "../state/state";
import { evalCond } from "./cond";

export class Engine {
  onCmd: (cmd: RenderCommand) => void = () => {};
  onPick: () => string = () => "";
  readonly state: GameState;
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    this.state = createState(scene.id);
  }

  start(): void {
    this.emitScene();
    this.runBehaviors(this.scene.entry);
  }

  getPendingOptions(): OptionItem[] {
    return this.lastOptions;
  }
  private lastOptions: OptionItem[] = [];

  private emitScene(): void {
    this.onCmd({ t: "scene", scene: this.scene });
    if (this.scene.fx) this.onCmd({ t: "fx", kind: this.scene.fx });
  }

  private runBehaviors(list: Behavior[]): void {
    const effects = applyBehaviorEffects;
    for (const b of list) {
      if (b.cond && !evalCond(b.cond, this.state)) continue;
      switch (b.t) {
        case "narration":
          this.onCmd({ t: "narration", text: b.text ?? "" });
          break;
        case "monologue":
          this.onCmd({ t: "monologue", text: b.text ?? "" });
          break;
        case "voiceoff":
          this.onCmd({ t: "voiceoff", text: b.text ?? "" });
          break;
        case "dialog": {
          effects(this.state, { t: "setflag", flag: "seen_" + b.npc, value: true });
          this.onCmd({ t: "dialog", npc: b.npc ?? "", text: b.text ?? "" });
          const opts = (b.options ?? []).filter((o) => evalCond(o.cond, this.state));
          if (opts.length) { this.lastOptions = opts; this.onCmd({ t: "options", options: opts }); }
          break;
        }
        case "options": {
          const opts = (b.options ?? []).filter((o) => evalCond(o.cond, this.state));
          this.lastOptions = opts;
          this.onCmd({ t: "options", options: opts });
          break;
        }
        default:
          effects(this.state, b);
      }
    }
  }

  /** 壳层在选择后调用已实现的子类/包装推进逻辑见 Task 5 */
}
```

> 注意：Engine 仅推送指令并缓存选项，**选择后的分支跳转在 Task 5 实现选择响应**。

- [ ] **Step 5: 导出**

```ts
export { Engine } from "./engine/engine";
export type { RenderCommand } from "./render/commands";
```

- [ ] **Step 6: 运行确认通过**

Run: `npx vitest run tests/engine.test.ts`
Expected: 5 tests PASS。

- [ ] **Step 7: Commit**

```bash
git add e:/code/jianghu-client/core
git commit -m "feat(core): Engine 场景载入/顺序推进/渲染指令"
```

---

## Task 5: 选项选择响应与条件分支（goto）

**Files:**
- Modify: `e:\code\jianghu-client\core\src\engine\engine.ts`
- Test: `e:\code\jianghu-client\core\tests\engine-choices.test.ts`

- [ ] **Step 1: 写失败测试（engine-choices.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import { Engine, type Scene, type RenderCommand } from "../src";

const scene: Scene = {
  id: "wudai", name: "松花江渡口", bg: "b", fx: "晨雾", points: [],
  entry: [
    { t: "take", item: "酒" },
    { t: "options",
      options: [
        { label: "问路线", goto: "route" },
        { label: "送酒", goto: "gift", cond: "bag.has(酒)" }
      ] },
    { id: "route", t: "narration", text: "顺江南下可至龙潭山。" },
    { id: "gift", t: "narration", text: "船家欣然收酒。" }
  ]
};

function runWithPick(pickLabel: string): RenderCommand[] {
  const cmds: RenderCommand[] = [];
  const e = new Engine(scene);
  e.onCmd = (c) => cmds.push(c);
  e.start(); // 同步：场景指令 + narration/options；lastOptions 已被缓存
  e.choose(pickLabel); // 同步：命中 goto → 推进 gift/route
  return cmds;
}

describe("选项分支", () => {
  it("满足条件的「送酒」分支被推进", () => {
    const cmds = runWithPick("送酒");
    expect(cmds.some((c) => c.t === "narration" && c.text.includes("收酒"))).toBe(true);
  });

  it("「问路线」分支被推进到 route", () => {
    const cmds = runWithPick("问路线");
    expect(cmds.some((c) => c.t === "narration" && c.text.includes("龙潭山"))).toBe(true);
  });

  it("不存在的 label 返回 false 且不推进", () => {
    const e = new Engine(scene);
    e.start();
    expect(e.choose("不存在")).toBe(false);
    expect(e.getPendingOptions().length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/engine-choices.test.ts`
Expected: FAIL（Engine 无 choose 方法，类型报错）。

- [ ] **Step 3: 实现 choose + goto 解析（engine.ts 追加）**

在 `Engine` 类内追加：

```ts
choose(label: string): boolean {
  const opt = this.lastOptions.find((o) => o.label === label);
  if (!opt) return false;
  const effects = applyBehaviorEffects;
  // 先执行选项自身副作用预留：属性如 item/flag 可后续扩展
  if (opt.goto) {
    this.followGoto(opt.goto);
  }
  this.lastOptions = [];
  return true;
}

private followGoto(target: string): void {
  if (target.startsWith("=")) {
    // 已支持场景级 goto（占位：仅更新 sceneId，扩展由壳层驱动地图）
    this.state.sceneId = target.slice(1);
    return;
  }
  const found = this.scene.entry.filter((b) => b.id === target);
  this.runBehaviors(found);
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/engine-choices.test.ts tests/engine.test.ts`
Expected: 全部 PASS（选项分支可达、送酒分支文本「收酒」命中）。

- [ ] **Step 5: Commit**

```bash
git add e:/code/jianghu-client/core
git commit -m "feat(core): 选项选择响应与 goto 分支/条件筛选"
```

---

## Task 6: 全量测试 + 自检

- [ ] **Step 1: 运行全部测试**

Run（`core` 下）: `npx vitest run`
Expected: 全部 PASS（state / cond / engine / engine-choices）。

- [ ] **Step 2: 构建校验**

Run: `npm run build`
Expected: `dist/index.js` 与 `dist/index.d.ts` 生成，无报错。

- [ ] **Step 3: 导出面自检（确认 index.ts 含以下）**

```ts
export type * from "./dsl/types";
export { createState, applyBehaviorEffects } from "./state/state";
export { evalCond } from "./engine/cond";
export { Engine } from "./engine/engine";
export type { RenderCommand } from "./render/commands";
```

- [ ] **Step 4: Commit（如未提交）**

```bash
git add e:/code/jianghu-client/core
git commit -m "chore(core): 全量测试与构建自检通过"
```

---

## 自审清单（plan→spec 对照）

- spec §3 组件树 → core 已覆盖 Engine 状态机、blehavior 解释；Scene/InteractPoint 类型在 dsl/types。
- spec §6 DSL 行为单元 `narration/dialog/monologue/voiceoff/options/goto/take/check/setflag/fight/teleport` → BehaviorType 全量定义；take/check/setflag 生效于 state；goto 已可跳转；fight/teleport 明确占位。
- spec §4 零依赖核心 + Vitest → package.json 仅 devDependencies（typescript/vitest）+ config。
- spec §5 目录 core/src/{engine,render,state,dsl} → 全部建立。
- spec §8 错误处理（坏脚本回退）→ 下一步 content 计划承载（本计划 Engine 对未知 cond 保守返回 false，不抛错）。
- 后续子系统（content 剧本 / shells: h5·mp·game）→ 各自独立 plan，不在本计划范围。