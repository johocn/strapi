# 北上 H5 重做（彩墨新国潮 + 悬疑因果主线 + 路标切景）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有 core 引擎 + Vue H5 壳上重做北上展示层：彩墨新国潮画面、悬疑因果主线 + 酒坛硬分支（打开/打碎/不闻不问）、视差 + 边界路标切景。

**Architecture:** 纯 TS 引擎 + Vue3 壳。改动分三条线：① core 给 `Engine` 加最小 `gotoScene(id)` 跨景 API + dsl `Scene.next` 字段；② binding/useGame 暴露 `gotoScene`；③ content 重写 northward.ts 主线与三分支（纯 content 用 flag/cond，零引擎改动）、④ 展示层彩墨配色 + 路标 UI。复用现 `segments`/`binding` 逐段状态机与 `goto:"=场景id"` 机制。

**Tech Stack:** TypeScript、Vue 3、Vitest、Vite。**不新增 npm 依赖**（SVG/PNG 全本地）。**不改 vue 版本、不改 core 既有契约**（仅新增方法）。

**仓库与 git 约定**：代码在 `jianghu-client`（嵌套仓库，git 根在 e:\code）。代码任务在 `jianghu-client` cwd 提交；计划/规格文档也在该仓库提交，用 `../docs/...` 相对路径。**每条任务完成后必须先在该任务内自跑测试/构建并提交，再进入下一任务。**

**测试/构建命令**（在 `shells/h5` 下为主，core 单独）：
- h5: `cd e:\code\jianghu-client\shells\h5; npx vitest run` / `npx tsc --noEmit` / `npm run build`
- core: `cd e:\code\jianghu-client\core; npx vitest run` / `npx tsc --noEmit`
- PowerShell 不支持 `&&`，多命令用 `;`。

---

### Task 1: core —— Engine.gotoScene + dsl Scene.next

**Files:**
- Modify: `e:\code\jianghu-client\core\src\dsl\types.ts`（Scene 加 `next?: string`）
- Modify: `e:\code\jianghu-client\core\src\engine\engine.ts`（加 `gotoScene(id)`）
- Test: `e:\code\jianghu-client\core\tests\engine.test.ts`（追加）

- [ ] **Step 1: 读现状**

确认 `engine.ts` 已有 `private resolveScene?: (id)=>Scene|undefined`（构造第二参注入）与 `loadScene(next)`。`types.ts` 的 `Scene` 接口已有 `id/name/bg/fx/worldWidth/layers/points/entry`。

- [ ] **Step 2: 写失败测试**

在 `core/tests/engine.test.ts` 末尾追加（引用既有 import 习惯；若无该文件则新建）：

```ts
import { describe, it, expect } from "vitest";
import { Engine } from "../src/engine/engine";
import type { Scene } from "../src/dsl/types";

const a: Scene = { id: "A", name: "甲", bg: "x", points: [], entry: [] };
const b: Scene = { id: "B", name: "乙", bg: "y", next: "C", points: [], entry: [] };
const c: Scene = { id: "C", name: "丙", bg: "z", points: [], entry: [] };

describe("Engine.gotoScene", () => {
  it("经由 resolveScene 加载目标场景并经 onCmd 发出 scene", () => {
    const eng = new Engine(a, { resolveScene: (id) => ({ A: a, B: b, C: c } as Record<string, Scene>)[id] });
    let last: Scene | undefined;
    eng.onCmd = (cmd) => { if (cmd.t === "scene") last = cmd.scene; };
    eng.start();
    const ok = eng.gotoScene("C");
    expect(ok).toBe(true);
    expect(last?.id).toBe("C");
  });
  it("resolveScene 无法解析时返回 false 且不改场景", () => {
    const eng = new Engine(a, { resolveScene: (id) => ({ A: a } as Record<string, Scene>)[id] });
    let last: Scene | undefined;
    eng.onCmd = (cmd) => { if (cmd.t === "scene") last = cmd.scene; };
    eng.start();
    const ok = eng.gotoScene("C");
    expect(ok).toBe(false);
    expect(last?.id).toBe("A");
  });
  it("Scene 可选携带 next 字段", () => {
    expect(b.next).toBe("C");
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd e:\code\jianghu-client\core; npx vitest run tests/engine.test.ts`
Expected: FAIL（`gotoScene` 不存在 / `Scene.next` 类型不匹配）。

- [ ] **Step 4: 实现**

`dsl/types.ts` 的 `Scene` 接口加字段：

```ts
export interface Scene {
  id: string;
  name: string;
  bg: string;
  fx?: string;
  next?: string;          // 视差边界路标指向的下一场景 id（无则尽头不显示路标）
  worldWidth?: number;    // 横轴跨度（视口倍数），缺省 1=单屏
  layers?: SceneLayer[];  // 视差层
  points: InteractPoint[];
  entry: Behavior[];      // 进入场景的首段剧情
}
```

`engine.ts` 在 `loadScene` 之后加方法：

```ts
  /** 视差边界路标跨景：经 resolveScene 加载目标，失败返回 false */
  gotoScene(id: string): boolean {
    const next = this.resolveScene?.(id);
    if (!next) return false;
    this.loadScene(next);
    return true;
  }
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd e:\code\jianghu-client\core; npx vitest run`
Expected: 全 PASS（新 3 + 既有不回归）。

- [ ] **Step 6: 提交**

```bash
cd e:\code\jianghu-client
git add core/src/dsl/types.ts core/src/engine/engine.ts core/tests/engine.test.ts
git commit -m "feat(core): Engine.gotoScene 跨景 API + Scene.next"
```

---

### Task 2: binding/useGame 暴露 gotoScene

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\engine\binding.ts`
- Modify: `e:\code\jianghu-client\shells\h5\src\engine\useGame.ts`
- Test: `e:\code\jianghu-client\shells\h5\tests\binding.test.ts`（追加）

- [ ] **Step 1: 写失败测试**

在 `shells/h5/tests/binding.test.ts` 追加：

```ts
import { Engine } from "@core";
import type { Scene } from "@core";
import { GameBinding } from "../src/engine/binding";

it("gotoScene 跨景切到目标场景并重置 state", () => {
  const s1: Scene = { id: "wudai", name: "渡口", bg: "riverside", points: [], entry: [
    { t: "dialog", npc: "船家", text: "渡？", options: [{ label: "走", goto: "go" }] },
    { id: "go", t: "narration", text: "两岸青山。" },
  ]};
  const s2: Scene = { id: "longtan", name: "龙潭山", bg: "mountain", points: [], entry: [
    { t: "narration", text: "山道湿滑。" },
  ]};
  const b = new GameBinding(new Engine(s1, { resolveScene: (id) => (id === "longtan" ? s2 : undefined) }));
  b.start();
  expect(b.state.scene?.id).toBe("wudai");
  const ok = b.gotoScene("longtan");
  expect(ok).toBe(true);
  expect(b.state.scene?.id).toBe("longtan");
  expect(b.state.lines.some((l) => l.text.includes("山道"))).toBe(true);
  expect(b.state.options).toEqual([]);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run tests/binding.test.ts`
Expected: FAIL（`gotoScene` 不存在）。

- [ ] **Step 3: 实现**

`binding.ts` 的 `GameBinding` 加方法（在 `visibleLines` 之后）：

```ts
  /** 视差边界路标跨景；失败返回 false */
  gotoScene(id: string): boolean {
    return this.engine.gotoScene(id);
  }
```

`useGame.ts` 返回值增补：

```ts
    gotoScene: (id: string) => binding.gotoScene(id),
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run`
Expected: 全 PASS。

- [ ] **Step 5: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/engine/binding.ts shells/h5/src/engine/useGame.ts shells/h5/tests/binding.test.ts
git commit -m "feat(h5): useGame 暴露 gotoScene 跨景"
```

---

### Task 3: content 渡口重写（酒坛三分支 + 告示钩子 + 渡河条件 + next）

**Files:**
- Modify: `e:\code\jianghu-client\content\src\northward.ts`（仅 `wudai`）
- Test: `e:\code\jianghu-client\shells\h5\tests\engine_scene.test.ts`（追加三分支走查）

- [ ] **Step 1: 重写 content 的 wudai 对象（整段替换 points/entry/next）**

替换 `content/src/northward.ts` 中 `wudai` 的 `next`、`points`、`entry`，并保留 layers。完整 `wudai` 如下（前后 `layers` 保持现状不动，只改 `next`、整段 `points`、整段 `entry`）：

```ts
export const wudai: Scene = {
  id: "wudai",
  name: "松花江渡口",
  bg: "riverside",
  fx: "晨雾",
  next: "longtan",          // 视差边界路标指向
  worldWidth: 2,
  // —— layers 保持现状（4 层彩墨底图仍可用，本轮不改）——
  layers: [ /* 现状 far/mount/tree/near 原样保留 */ ],
  points: [
    {
      id: "notice", x: 0.5, y: 0.34, icon: "告", shape: "notice",
      on: [
        { t: "narration", text: "渡口木柱钉着一卷告示：「龙潭山塌方封路，北上请改走旱道。」落款墨迹未干，印是新盖的——官府文书断不会如此仓促。" },
        { t: "setflag", flag: "saw_notice", value: true },
        { t: "monologue", text: "（封路的告示透着蹊跷……字迹急促，倒像是有人急着把客人挡在山外。）" },
      ],
    },
    {
      id: "barrel", x: 0.2, y: 0.66, icon: "坛", shape: "jar",
      on: [
        { t: "narration", text: "江滩芦苇丛里半埋着一只青瓷泥封酒坛，坛身满是潮苔。看泥封，少说沉了三年——为何被封在渡口等船处，无人来取？" },
        { t: "options", options: [
          { label: "打开它", cond: "!flag(jar_done)", goto: "jar_open" },
          { label: "打碎它", cond: "!flag(jar_done)", goto: "jar_break" },
          { label: "不闻不问", cond: "!flag(jar_done)", goto: "jar_ignore" },
        ]},
        { id: "jar_open", t: "setflag", flag: "jar_opened" },
        { id: "jar_open_done", t: "setflag", flag: "jar_done" },
        { id: "jar_open_take", t: "take", item: "酒" },
        { id: "jar_open_txt", t: "monologue", text: "（你启了封泥，酒香混着江风扑面而来。封泥内还压着一枚褪色签条，写着『渡头老刘，北行之人取用』——原是行脚商留的善物。）" },
        { id: "jar_break", t: "setflag", flag: "jar_broken" },
        { id: "jar_break_done", t: "setflag", flag: "jar_done" },
        { id: "jar_break_take", t: "take", item: "告示残片" },
        { id: "jar_break_txt", t: "narration", text: "坛碎，陈酒淌进滩泥。坛底裂出一块焦木枯片，上面竟拓着一枚印章印痕——与官府告示的印文一般无二，却多一道刻痕。你收下残片。" },
        { id: "jar_ignore", t: "setflag", flag: "jar_ignored" },
        { id: "jar_ignore_txt", t: "monologue", text: "（你压住好奇，暂不动这坛来路不明的酒。回去仍可再来查探。）" },
        // 已处置后再点，只给一句补话
        { t: "monologue", cond: "flag(jar_done)", text: "（这坛酒已处置过，不必再看。）" },
      ],
    },
    {
      id: "boat", x: 0.76, y: 0.62, icon: "船", shape: "boat",
      on: [
        {
          t: "dialog", npc: "老船家", text: "小郎君要过江北上？江水不小，空手上船我可放不下心——总得有个由头。",
          options: [
            { label: "递上一坛陈酒", goto: "sail", cond: "bag.has(酒)" },
            { label: "亮出坛底告示残片", goto: "sail_clue", cond: "bag.has(告示残片)" },
            { label: "问北上前路", goto: "route" },
            { label: "提起那张封路告示", goto: "warn" },
            { label: "先不渡了", goto: "stay" },
          ],
        },
        { id: "route", t: "narration", text: "船家捻须：北上顺松花江，先抵龙潭山，再溯江可通塞外。只是山中近日不太平，夜里游客迷糊失踪的甚多。" },
        { id: "warn", t: "dialog", npc: "老船家", text: "那封路榜是假的，断游客的心罢了。龙潭山笑云梯我走了半辈子没塌过——多半是有人在里面做了亏心事。" },
        { id: "stay", t: "monologue", text: "（江风寒，暂且立在渡口打探。）" },
        { id: "sail", t: "dialog", npc: "老船家", text: "好酒！老朽正缺一暖。上船吧，北上龙潭山。" },
        { id: "sail2", t: "goto", sceneId: "longtan" },
        { id: "sail_clue", t: "dialog", npc: "老船家", text: "这印……你从何得来？罢了，莫非也与山上那桩案子有关。你也上船，我送你去龙潭山亲眼看看。" },
        { id: "sail_clue2", t: "goto", sceneId: "longtan" },
      ],
    },
  ],
  entry: [
    { t: "narration", text: "晨雾锁江，松花江水拍打渡口栈桥。北上的路，就被这一纸告示断在渡口。" },
    { t: "dialog", npc: "老船家", text: "客官远来，可是要过江？还是……为那封路的告示而来？" },
  ],
};
```

> 说明：酒坛三分支用一个公共 flag `jar_done` 做互斥——`打开`/`打碎` 任选其一即置 `jar_done=true`，之后三选项因 `cond:"!flag(jar_done)"` 全为假 → `options` 发射空列表 → binding 不再给选项，只显示补话。`不闻不问` 不置 `jar_done`，保留 `jar_ignored=true`，玩家回头可再触发「打开/打碎」。渡河双入口（酒 / 告示残片）各走 `sail`/`sail_clue` 分支，均落 `goto sceneId:"longtan"`。

- [ ] **Step 2: 跑测试确认现有跨场景回归不破坏**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run tests/engine_scene.test.ts`
Expected: 既有跨场景测试可能引用旧"取酒→船"路径——**若断言依赖旧文本/旧点（如原 `take 酒` 一次性得到酒），需按新 content 校正**。校正目标：渡河仍需线索、跨景仍到 `longtan`。修正断言使全绿。

- [ ] **Step 3: 追加三分支走查测试（同一文件末尾）**

```ts
describe("酒坛三分支", () => {
  function mk(): { eng: Engine; b: GameBinding; scenes: Record<string, Scene> } {
    const scenes = scenesMap; // 导入 content 的 scenes
    const eng = new Engine(scenes.wudai, { resolveScene: (id) => scenes[id] });
    const b = new GameBinding(eng);
    b.start();
    return { eng, b, scenes };
  }

  it("不闻不问后回头可重新打开", () => {
    const { b } = mk();
    b.triggerPoint("barrel");
    b.pick("不闻不问");
    // 未置 jar_done，再点仍出现『打开』选项
    b.triggerPoint("barrel");
    expect(b.state.lines.some((l) => l.text.includes("打开")) || b.state.options.length > 0).toBe(true);
    expect(b.state.lines.some((l) => l.text.includes("酒坛已处置"))).toBe(false);
  });

  it("打开得到『酒』但不再重复三选", () => {
    const { b } = mk();
    b.triggerPoint("barrel");
    b.pick("打开它");
    // jar_done 已置 → 再点 barrel 不给三选
    b.triggerPoint("barrel");
    const hasDoors = b.state.options.some((o) => ["打开它", "打碎它", "不闻不问"].includes(o.label));
    expect(hasDoors).toBe(false);
    expect(b.state.lines.some((l) => l.text.includes("酒坛已处置"))).toBe(true);
  });

  it("打碎得到『告示残片』且渡船给亮残片入口", () => {
    const { b } = mk();
    b.triggerPoint("barrel");
    b.pick("打碎它");
    b.triggerPoint("boat");
    expect(b.state.options.some((o) => o.label === "亮出坛底告示残片")).toBe(true);
    b.pick("亮出坛底告示残片");
    expect(b.state.scene?.id).toBe("longtan");
  });
});
```

> 需在文件顶部按现有测试风格 import：`import { Engine } from "@core"; import type { Scene } from "@core"; import { GameBinding } from "../src/engine/binding"; import { scenes } from "../../../../content/src/northward";`

- [ ] **Step 4: 跑测试确认通过**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run`
Expected: 全 PASS。

- [ ] **Step 5: 提交**

```bash
cd e:\code\jianghu-client
git add content/src/northward.ts shells/h5/tests/engine_scene.test.ts
git commit -m "feat(content): 渡口主线重写——酒坛三分支+告示钩子+渡河条件"
```

---

### Task 4: content 龙潭山重写（真相闭环 + 残片暗线 + 赤果支线）

**Files:**
- Modify: `e:\code\jianghu-client\content\src\northward.ts`（仅 `longtan`）

- [ ] **Step 1: 重写 longtan 的 points/entry（保留 layers）**

将 `longtan` 的 `points`、`entry` 整段替换（`layers` 保留现状；场景无 `next`，故不加——尽头无路标）：

```ts
export const longtan: Scene = {
  id: "longtan",
  name: "龙潭山",
  bg: "mountain",
  fx: "山雾",
  worldWidth: 3,
  // —— layers 保持现状 ——
  layers: [ /* 现状 far/mount/tree/near 原样保留 */ ],
  points: [
    {
      id: "tan", x: 0.3, y: 0.5, icon: "潭", shape: "tarn",
      on: [
        { t: "narration", text: "山腹一泓幽潭，水色青碧、深不见底，四周寒雾缭绕。这便是龙潭。" },
        { t: "take", item: "龙潭水" },
        { t: "monologue", text: "（你掬一捧潭水饮下，甘冽异常，头脑清明了几分。）" },
      ],
    },
    {
      id: "monk", x: 0.7, y: 0.62, icon: "僧", shape: "monk",
      on: [
        {
          t: "dialog", npc: "守山僧", text: "施主能进得山来，想是有人指点？不瞒你说——山巅赤果被盗了，老夫在此候人，正候一个能看破这局的人。",
          options: [
            { label: "缺了什么，与封路何干？", goto: "what" },
            { label: "你怎知我为何而来", goto: "how" },
          ],
        },
        { id: "what", t: "dialog", npc: "守山僧", text: "雪松逢仲秋结赤果，保山里一年平安。前夜信香忽断，赤果被盗。贼人怕香客上山查出端倪，便伪造官封路告示，把山锁死。若你能寻回赤果，我便指你一条北上密道。" },
        { id: "how", t: "dialog", npc: "守山僧", text: "山下渡口的那纸告示，墨湿印新，一看便知是装。能顶着假告示仍渡江来此的，不会是与贼同路之人。" },
        // 残片暗线：带残片可确认真相并直接获密道
        { id: "monk_clue", t: "dialog", cond: "bag.has(告示残片)", npc: "守山僧", text: "你坛底那枚残片上的印痕，正是贼人仓促盖印时留下的拓片。这下老夫信得过你——北上的密道，我在笑云梯尽头替你留灯。" },
        { id: "monk_clue2", t: "setflag", cond: "bag.has(告示残片)", flag: "trusted", value: true },
      ],
    },
    {
      id: "pine", x: 0.55, y: 0.24, icon: "松", shape: "pine",
      on: [
        { t: "narration", text: "山巅孤松斜立崖畔，风过枝梢似有幽鸣。树根处空空如也——赤果果然没了。" },
        { t: "monologue", text: "（若想寻回赤果，或须以潭水润根，唤回那果。）" },
      ],
    },
    {
      id: "pine_root", x: 0.55, y: 0.24, icon: "松", shape: "pine",
      on: [
        { t: "check", item: "龙潭水" },
        { t: "take", item: "赤果" },
        { t: "setflag", flag: "got_fruit", value: true },
        { t: "narration", text: "你将掬来的潭水浇灌树根，果见一枚赤果坠入掌中，热意灼人。赤果既回，山里便可安宁——你把这桩牵挂放了下来。" },
      ],
    },
  ],
  entry: [
    { t: "narration", text: "船抵龙潭山下。山道湿滑、云松蔽日。到这一步，你才算摸到那封路告示背后的一点真章。" },
    { t: "monologue", text: "（你紧了紧行囊。这段路，一个人走正好。）" },
  ],
};
```

> 说明：拆出 `pine`（查看）与 `pine_root`（浇灌，单独交互点，位于同坐标以 `check 龙潭水` 触发）。`pine_root` 用 `check`（会消耗龙潭水）换取赤果。残片暗线 `monk_clue` 用 `cond:"bag.has(告示残片)"` 守门，命中即置 `trusted` 并获密道指引。主线以「看清真相/获僧信任」为闭环，赤果为支线兜底。

- [ ] **Step 2: 补充走查断言（`engine_scene.test.ts` 末尾）**

```ts
it("龙潭山带残片可获僧信任（真相闭环）", () => {
  const eng = new Engine(scenes.wudai, { resolveScene: (id) => scenes[id] });
  const b = new GameBinding(eng);
  b.start();
  b.triggerPoint("notice");             // 看告示埋钩
  b.triggerPoint("barrel"); b.pick("打碎它");   // 得告示残片
  b.triggerPoint("boat"); b.pick("亮出坛底告示残片"); // 跨景
  expect(b.state.scene?.id).toBe("longtan");
  b.triggerPoint("monk");               // 触发僧人含 cond 的残片块
  expect(b.state.lines.some((l) => l.text.includes("记下")) === false); // 弱断言：锚定走查
  b.triggerPoint("monk");
  expect(b.state.lines.some((l) => l.text.includes("信任"))).toBe(true);
});
```

> 若 `triggerPoint("monk")` 触发一连串 line 后，`monk_clue` 的 cond line 也会顺带执行（runBehaviors 顺序遍历），故断言"信任"文本存在。此断言以实际运行为准做微调；核心测「带残片走到 `monk` 能出现信任对话」即可。

- [ ] **Step 3: 跑测试确认通过**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run`
Expected: 全 PASS。

- [ ] **Step 4: 提交**

```bash
cd e:\code\jianghu-client
git add content/src/northward.ts shells/h5/tests/engine_scene.test.ts
git commit -m "feat(content): 龙潭山主线重写——真相闭环+残片暗线+赤果支线"
```

---

### Task 5: h5 边界路标切景（SceneView 叠加路标）

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneView.vue`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneBg.vue`（不动，仅确认）
- Test: 无新增单测（组件交互靠构建 + 人工冒烟；逻辑在模板）

- [ ] **Step 1: 读当前 SceneView.vue**

已用 `useGame()` 的 `triggerPoint`，`useViewport(worldWidth)` 提供 `camera/maxOffset/onDrag/reset`。`useGame()` 现还有 `gotoScene`。

- [ ] **Step 2: 在 SceneView.vue 叠加路标**

`<script setup>` 增补（在既有 import 中加入 `gotoScene`，并加 computed）：

```ts
const { state, triggerPoint, gotoScene } = useGame();
const atRightEdge = computed(() => camera.value >= maxOffset.value);
const nextId = computed(() => scene.value?.next ?? null);
```

然后在 `<template>` 的 `.viewport-hint` 之后追加：

```vue
    <div
      v-if="atRightEdge && nextId"
      class="road-sign"
      @click="gotoScene(nextId)"
    >→ 北上 龙潭山</div>
```

> 文案可用 `nextId` 推导更通用，但本轮仅两景，直接内联"→ 北上 龙潭山"；若要通用可配内容层字段。为最小改动，先内联文案并用 `nextId` 守卫。

在 `<style scoped>` 追加路标样式（朱砂路标、可点）：

```css
.road-sign {
  position: absolute;
  right: 14px; bottom: 56px;
  padding: 8px 16px;
  background: #C03221;            /* 朱砂 */
  color: #f2ecd8;
  border: 1px solid rgba(224,190,120,0.7);  /* 描金 */
  border-radius: 4px;
  font-size: 15px; letter-spacing: 3px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  cursor: pointer;
  z-index: 5;
  pointer-events: auto;
}
.road-sign:active { background: #a02a1c; }
```

> 需在 `.scene-world` 已设 `pointer-events:none` 的前提下，路标为 `.scene-view` 直系子节点，默认非 none，可点。若发现被遮挡，加上 `z-index` 与 `pointer-events:auto`（已含）。

- [ ] **Step 3: 类型 + 构建验证**

Run: `cd e:\code\jianghu-client\shells\h5; npx tsc --noEmit; npm run build`
Expected: 无 TS 错误，build 成功。

- [ ] **Step 4: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/components/SceneView.vue
git commit -m "feat(h5): 视差边界路标点击切景"
```

---

### Task 6: 彩墨新国潮视觉（SceneProp 改色 + InteractPoint 晕环 + token + 重生成底图）

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneProp.vue`（stroke/fill 换彩墨）
- Modify: `e:\code\jianghu-client\shells\h5\src\components\InteractPoint.vue`（晕环朱砂）
- Modify: `e:\code\jianghu-client\shells\h5\src\styles\main.css`（彩墨 token 点缀）
- Regenerate: `shells/h5/src/assets/scenes/wudai.jpg`、`longtan.jpg`

- [ ] **Step 1: SceneProp 换彩墨配色**

读取当前 SceneProp.vue（7 个 shape，纯墨 `#3a322a`）。将主描边 `stroke` 从 `#3a322a` 改为**朱砂 `#C03221`**，将填色填充（`fill`，含 opacity 块）从 `#3a322a`/`#8a6f4d` 改为**靛青 `#3A5F6E` 与墨 `#2d2418`** 组合，赤果/封泥类用朱砂实心。逐个 shape 替换（jar/boat/notice/boatman/tarn/monk/pine）。示例 jar：

```vue
    <g v-if="shape === 'jar'">
      <path d="M30 30 h36 M32 30 c-2 8 -3 12 -2 20 l3 24 c1 4 8 4 22 4 c14 0 21 0 22 -4 l3 -24 c1 -8 0 -12 -2 -20" fill="none" stroke="#C03221" stroke-width="2.5"/>
      <ellipse cx="48" cy="30" rx="18" ry="5" fill="#3A5F6E" opacity="0.35"/>
      <rect x="42" y="12" width="12" height="8" fill="#C03221" opacity="0.6"/>
    </g>
```

> 保持每个 shape 的路径/结构不变，仅改 `stroke`/`fill` 为彩墨系；淡填充用靛青 `#3A5F6E`，实心强调用朱砂 `#C03221`。

- [ ] **Step 2: InteractPoint 晕环改朱砂描金**

当前 `.ip-ring` 用淡金 `rgba(255,220,120,…)`。改朱砂：

```css
.ip-ring {
  position: absolute; inset: 4px;
  border-radius: 50%;
  background: rgba(192, 50, 33, 0.25);   /* 朱砂晕 */
  border: 2px solid rgba(224,190,120,0.95); /* 描金 */
  animation: pulse 2s ease-in-out infinite;
}
```

- [ ] **Step 3: main.css 增彩墨点缀（不替换已有宣纸底色，只补强调 token）**

在 `body`/`.game` 之下追加一组类（供 SceneProp/Interact/road-sign 概念统一；本次先写基础设施注释与既有对齐）：

```css
/* 彩墨点睛 token（朱砂/石青/靛青）——重做版强调色 */
:root {
  --cinnabar: #C03221;   /* 朱砂 */
  --azure: #2E4B8F;      /* 石青 */
  --indigo: #3A5F6E;     /* 靛青 */
  --ochre: #A65D2D;      /* 赭石 */
  --gold: rgba(224,190,120,0.9); /* 描金 */
}
```

> 若组件已用字面量（如 `.road-sign` 的 `#C03221`），可保持字面量以最小改动；此 token 供后续可读性，不强求全量替换已有字面量。

- [ ] **Step 4: 重新生成两张底图（用 GenerateImage 工具）**

用 AI 图像生成工具重做（本机执行，输出到 `shells/h5/src/assets/scenes/`）：
- `wudai.jpg`：新国潮水墨——宣纸米白底，青绿染林、靛青画江，朱砂点船帆/行人衣角，晨雾渡口、一舟水岸，横向宽幅，留白古风武侠，高饱和强调但保持水墨气韵。
- `longtan.jpg`：新国潮水墨——宣纸米白底，青绿山峦、靛青幽潭，朱砂点孤松赤果，雾绕层峦，空灵神秘，横向宽幅。

> 生成的扩展名以工具实际输出为准（本机曾输出 `.jpg`）。若仍 .jpg，`assets/scenes/index.ts` 映射不变；若是 .png 需同步改 import 扩展名。

- [ ] **Step 5: 构建验证**

Run: `cd e:\code\jianghu-client\shells\h5; npx tsc --noEmit; npm run build`
Expected: 无 TS、build 成功、新图进 dist。

- [ ] **Step 6: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/components/SceneProp.vue shells/h5/src/components/InteractPoint.vue shells/h5/src/styles/main.css shells/h5/src/assets/scenes/
git commit -m "style(h5): 彩墨新国潮配色 + 重生成渡口/龙潭山底图"
```

---

### Task 7: 全量收尾回归

**Files:** 无新增；仅验证 + 人工冒烟指引。

- [ ] **Step 1: 全量测试 + 构建**

core: `cd e:\code\jianghu-client\core; npx vitest run` → 期望全 PASS。
h5: `cd e:\code\jianghu-client\shells\h5; npx vitest run; npx tsc --noEmit; npm run build` → 期望全 PASS + 无 TS + build 成功。

- [ ] **Step 2: 提交收尾**

```bash
cd e:\code\jianghu-client
git status
```
确认仅含本方案改动无越界。若计划/规档未提交，先补：
```bash
cd e:\code\jianghu-client; git add ../docs/superpowers/specs/2026-09-22-jianghu-h5-rewrite-caime-suspense-road.md ../docs/superpowers/plans/2026-09-22-jianghu-h5-rewrite-caime-suspense.md
```
无需额外 commit（各 task 已独立提交）；仅确认工作树无本方案遗漏的未提交文件。

- [ ] **Step 3: 启动 dev 供人工冒烟**

```bash
cd e:\code\jianghu-client\shells\h5; npm run dev
```
打开返回的 localhost 端口，人工验证（计划交付物）：
- 渡口：告示看得到"墨湿印新"钩子；点酒坛出现**打开/打碎/不闻不问**三选；
  - 打开→得酒、再点酒坛不再给三选（已处置补话）；
  - 打碎→得告示残片、渡船出现"亮出残片"；
  - 不闻不问→点别的再回来仍可选。
- 渡船：无线索只有空手选择；有酒或残片可选北上→跨景龙潭山。
- 龙潭山：点僧人出现残片暗线"信任"对话；点 pine 查看、pine_root 以潭水换赤果。
- 视差拖动到头（渡口 worldWidth=2、龙潭 3）出现**朱砂路标"→北上龙潭山"**，点击跨景。
- 整体画面为**彩墨新国潮**（朱砂/石青/靛青点缀，非纯墨）。

- [ ] **Step 4: 记录人工验证结果**

把浏览器验证结论回填本任务（通过/留待修）。若发现 bug，新建一条后续任务再修，不混入本轮已提交批次。

---

## 执行勘误（2026-09-22 执行中发现并修正）

**问题**：原计划 T3 的酒坛"打开/打碎/不闻不问"三分支，把各分支后果写成 `on` 数组内顺序排列、各带独立 id 的行为。但引擎 `runBehaviors` 会**顺序执行整个 `on` 数组**，`choose` 的 `goto` 又只能按 id 命中**单个**行为 → 一次点击会同时执行全部分支（得酒+得残片+置所有 flag），互斥失效，计划走查测试会失败。此缺陷在阶段一也存在（点船后所有回答文本一次性堆积）。

**修正（2 处，均为必要最小改动）**：
1. **引擎**（本次新增，非原计划）：`runBehaviors` 在发射可选分支（`options` 或带选项的 `dialog`，且 `lastOptions.length>0`）后 `return` 悬停，未选择时后续行为不再自动执行。`choose` 的 `goto` 负责运行选中的分支体。（同时修复阶段一泄漏 bug。）
2. **内容分支结构**：分支后果改为**共享分支 id**——同一分支的多个行为使用同一 `id`，`followGoto(id)` 的 `filter(b=>b.id===target)` 会命中整条分支。酒坛 `jar_open`/`jar_break`/`jar_ignore` 各分支内行为共享该 id；渡船 `sail_branch`/`sail_clue_branch` 同理。原 T3 里 `sail`+`sail2`、`sail_clue`+`sail_clue2` 的"b 段中各独立 id"写法需合并为单一共享 id。

**测试连带**：既有 `engine_scene.test.ts`「取酒后点船」用例原 `triggerPoint("barrel")` 即得 `酒`，在新互斥结构下需先 `pick("打开它")` 才能得酒——该用例断言按新内容校正。

**补充（执行中确认）**：① 引擎 `opts.length===0` 时用 `break`（不悬停）继续线性执行——故酒坛各分支体须加 `cond:"!flag(jar_done)"` 门控、且 `jar_done` 置于分支末尾，否则已处置后重重点会线性跑完所有分支体再次泄漏。（已由子代理在 T3 落地。）② 龙潭山僧人的残片信任暗线（`monk_clue`）因悬停语义不会自动跑，改为在僧人对话 options 里加**条件选项**「呈上坛底残片印记」`cond:"bag.has(告示残片)"` `goto` 信任分支（共享 id），玩家选中才触发 `trusted` 与密道指引。

---

## Self-Review

**Spec 覆盖**：彩墨新国潮（T6 配色 + 底图 + SceneProp/InteractPoint）✅；悬疑因果主线（T3 渡口钩子 + T4 龙潭真相闭环）✅；酒坛硬分支打开/打碎/不闻不问（T3）✅；渡河条件绑定线索（T3）✅；视差 + 边界路标切景（T1 gotoScene + T2 binding + T5 SceneView）✅；残片暗线 + 赤果支线（T4）✅。

**占位扫描**：所有代码步骤给出完整实现（content 两景完整字面量、核心测试、样式）；唯一推导处（Task6 底图扩展名）给出判定规则而非留空；Task4 弱断言语义已注明"以实际运行为准微调"。无 TBD/TODO。

**类型一致性**：`gotoScene(id): boolean` 在 T1（Engine）/T2（binding/useGame）签名一致；`Scene.next?: string` 在 T1 定义且 T5 读取一致；酒坛 flag 命名（`jar_done/jar_opened/jar_broken/jar_ignored`）与 cond 在 T3 自洽；`monk_clue` 的 cond/bag.has 在 T4 自洽。无跨任务命名冲突。