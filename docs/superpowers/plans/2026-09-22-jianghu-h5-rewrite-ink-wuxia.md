# 北上 H5 展示层重写（水墨古风 + 逐段对话）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 `shells/h5` 展示层为水墨山水古风武侠风格，并实现点击逐段推进的对话系统（无滚动条），同时清除背景单调、物体未实例化、视差不明显三类视觉问题。剧情内容与分支逻辑一律不动。

**Architecture:** 纯 TS 引擎 + Vue3 壳。展示层只读 `GameBinding` 暴露的响应式 `UiState`。本次改动集中在三处：
1. **数据形态**：`core/dsl/types.ts` 增加 `PropShape` 枚举、`InteractPoint.shape`、`SceneLayer.kind:"gradient"|"svg"` + `svg?:string`；`content/northward.ts` 为物体补 `shape` 并把 `layers` 重建为 4 层 SVG 轮廓。
2. **对话状态机**：`binding.ts` 的 `UiState` 增加 `viewIndex`/`segEnds`，新增 `advance()/retreat()/visibleLines()`；`NarrativePanel` 改为按段切片渲染 + 底部小字上/下一段，无滚动条。
3. **视觉实例**：新增 `SceneProp.vue`（按 shape 渲染内联 SVG 水墨线描）、`SceneLayer.vue` 支持 `kind:"svg"` 轮廓层、`SceneBg.vue` 渲染水墨 PNG 底图；全局切古风色彩（宣纸米白/墨/赭石 + 衬线字体）。

**Tech Stack:** TypeScript、Vue 3（composition）、Vitest、Vite。**不新增任何 npm 依赖**（SVG 剪影、PNG 底图全本地）。剧情（`northward.ts` 的分支/goto）不改。

**仓库与 git 约定**：代码任务在 `jianghu-client` 嵌套仓库内 `git add/commit`。计划文档本身在父级：`cd jianghu-client; git add ../docs/superpowers/plans/2026-09-22-jianghu-h5-rewrite-ink-wuxia.md; git commit -m "docs: plan h5 ink-wuxia rewrite"`。

**测试命令**（在 `shells/h5` 下）：
- 单测：`npx vitest run tests/xxx.test.ts -t "关键字"` 或全量 `npm test`
- 类型：`npx tsc --noEmit`
- 构建：`npm run build`

---

### Task 1: core dsl 类型扩展（PropShape / shape / SceneLayer.kind+svg）

**Files:**
- Modify: `e:\code\jianghu-client\core\src\dsl\types.ts`
- Test: `e:\code\jianghu-client\core\src\dsl\types.test.ts`（新建）

- [ ] **Step 1: 写失败测试**

新建 `core/src/dsl/types.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import type { InteractPoint, SceneLayer, PropShape } from "./types";

describe("dsl 扩展类型", () => {
  // 编译期：shape 枚举可被赋值为 clip 值之一
  const jar: InteractPoint = {
    id: "barrel", x: 0.2, y: 0.68, icon: "坛", shape: "jar",
  };
  it("InteractPoint 携带 shape", () => {
    expect(jar.shape).toBe("jar");
    const shapes: PropShape[] = ["jar", "boat", "notice", "boatman", "tarn", "monk", "pine"];
    expect(shapes).toContain(jar.shape);
  });
  it("SceneLayer.kind 支持 gradient 与 svg，svg 携带剪影标记", () => {
    const grad: SceneLayer = { id: "far", depth: 0.04, kind: "gradient", css: "#222" };
    const svgLayer: SceneLayer = { id: "mount", depth: 0.28, kind: "svg", css: "transparent", svg: "<polygon .../>" };
    expect(grad.kind).toBe("gradient");
    expect(svgLayer.kind).toBe("svg");
    expect(svgLayer.svg).toContain("<polygon");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd e:\code\jianghu-client\core && npx vitest run src/dsl/types.test.ts`
Expected: FAIL（`PropShape` 未定义、`InteractPoint.shape`/`SceneLayer.kind` 类型不匹配）。

- [ ] **Step 3: 实现类型扩展**

在 `types.ts`：

- 顶部新增枚举与接口字段：

```ts
/** 场景物体的水墨线描实例类型 */
export type PropShape =
  | "jar"      // 酒坛
  | "boat"     // 船
  | "notice"   // 告示
  | "boatman"  // 老船家
  | "tarn"     // 龙潭
  | "monk"     // 守山僧
  | "pine";    // 雪松
```

- `InteractPoint` 增加字段：

```ts
export interface InteractPoint {
  id: string;
  x: number;   // 0..1 相对坐标
  y: number;
  icon: string;
  shape?: PropShape;  // 物体实例类型；缺省回退纯字符 icon
  on?: Behavior[];    // 触发该点后的行为
}
```

- `SceneLayer.kind` 改为联合类型并加 `svg` 字段：

```ts
export interface SceneLayer {
  id: string;
  depth: number;
  kind?: "gradient" | "svg";   // gradient=纯色/渐变，svg=水墨剪影轮廓
  css: string;                 // 该层背景样式（注射/远景的垂直渐暗）
  svg?: string;                // kind="svg" 时，剪影的内联 SVG 元素标记（含 <polygon>/<path>）
  height?: number;             // 可选：层占视口高度比例，默认 1
}
```

> 向后兼容：`kind` 仍可选，旧层仅填 `css`（=gradient 语义）不破坏现状。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd e:\code\jianghu-client\core && npx vitest run src/dsl/types.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd e:\code\jianghu-client
git add core/src/dsl/types.ts core/src/dsl/types.test.ts
git commit -m "feat(core): dsl 增加 PropShape/shape 与 SceneLayer.kind=svg"
```

---

### Task 2: binding 逐段状态机（viewIndex / segEnds / advance / retreat / visibleLines）

段模型：`state.segEnds: number[]` 记录每个**已闭合段**最后一条 line 的下标；闭合点 = 触发 `options` 命令处。`state.viewIndex` 当前显示段（0 基）。`triggerPoint/pick` 后重置到最新段（显示新内容）；`advance/retreat` 相邻翻段。渲染范围由纯函数 `segmentSlice` 计算。

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\engine\binding.ts`
- Create: `e:\code\jianghu-client\shells\h5\src\engine\segments.ts`（纯函数，易单测）
- Modify: `e:\code\jianghu-client\shells\h5\src\engine\useGame.ts`（暴露 advance/retreat/visibleLines）
- Test: `e:\code\jianghu-client\shells\h5\tests\segments.test.ts`（新建）、改造 `tests\binding.test.ts`

- [ ] **Step 1: 写失败测试（segments 纯函数）**

新建 `shells/h5/tests/segments.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import type { Line, UiState } from "../src/engine/binding";
import { segmentSlice, segmentCount, clampView } from "../src/engine/segments";

const L = (text: string): Line => ({ kind: "narration", npc: null, text });

function st(p: Partial<UiState>): UiState {
  return { scene: null, fx: null, lines: [], options: [], viewIndex: 0, segEnds: [], ...p };
}

describe("segmentSlice 段切片", () => {
  it("单段直接全量返回", () => {
    const s = st({ lines: [L("甲"), L("乙")] });
    expect(segmentSlice(s).map((l) => l.text)).toEqual(["甲", "乙"]);
  });
  it("多段按 viewIndex 切分（段界在 options 处闭合）", () => {
    // 段0=[0..1]（闭合于 segEnds[0]=1）；段1=[2..2]（未闭合尾段）
    const s = st({ lines: [L("甲"), L("乙"), L("丙")], segEnds: [1], viewIndex: 1 });
    expect(segmentSlice(s).map((l) => l.text)).toEqual(["丙"]);
    expect(segmentSlice({ ...s, viewIndex: 0 }).map((l) => l.text)).toEqual(["甲", "乙"]);
  });
  it("viewIndex 越界回收拢到有效范围", () => {
    const s = st({ lines: [], segEnds: [], viewIndex: 5 });
    expect(segmentSlice(s)).toEqual([]);
    expect(clampView(5, segmentCount(s))).toBe(0);
  });
});
```

- [ ] **Step 2: 写失败测试（binding 行为）**

在 `tests/binding.test.ts` 追加：

```ts
it("逐段：进一段/退一段/最末仅显示该段/触发点重置到最新段", () => {
  // entry: narration + dialog(options) -> segEnds=[1]（闭合段0）；总段数=1
  const b = new GameBinding(new Engine(scene));
  b.start();
  expect(b.state.viewIndex).toBe(0);
  expect(b.state.segEnds).toEqual([1]);
  expect(segmentSlice(b.state).length).toBe(2); // narration+dialog

  // pick 北上 -> goto go narration "好开船" 追加，未闭合尾段 -> 段1
  b.pick("北上");
  expect(b.state.viewIndex).toBe(0);            // trigger/pick 重置到最新段起点
  expect(segmentSlice(b.state).map((l) => l.text)).toEqual(["好，开船。"]);
  // 段数= 已闭合(1) + 未闭合尾段(1) = 2

  b.retreat();                                  // 退到段0（无更早则夹住）
  expect(segmentSlice(b.state).length).toBe(2); // "渡江？" 段
  b.advance();
  expect(segmentSlice(b.state).map((l) => l.text)).toEqual(["好，开船。"]);
  b.advance();                                  // 已到最末，夹住
  expect(segmentSlice(b.state).map((l) => l.text)).toEqual(["好，开船。"]);
});

it("未命中 label 时选项保留且不该动 viewIndex", () => {
  const b = new GameBinding(new Engine(scene));
  b.start();
  const before = b.state.viewIndex;
  b.pick("不存在");
  expect(b.state.options).toHaveLength(2);
  expect(b.state.viewIndex).toBe(before);
});
```

> 说明：`scene` fixture 的 entry 为 `take → dialog(带2选项) → go/stay narration`。start 时 handle 收到 narration? 不——entry 首条是 `take`（不出线），随后 `dialog` 推线再 `options` → segEnds=[1]。故段0 = [narration? 没有, dialog]… 实为 lines=[dialog]（一条），segEnds=[0]。上面测试预期依赖真实线数：**以实际为准**，若 entry 的 narration 提前产出（此 fixture 是 take 开头），lines 仅有 dialog 一条 → segEnds=[0]、段0=一条 dialog。请把上例长度断言按运行结果微调为 1（`.length` 用 `segmentSlice(b.state).length`），断言核心是「pick 后 viewIndex 重置指向新段、retreat 回到前段、advance 前进来回、越界夹住」。

- [ ] **Step 3: 跑测试确认失败**

Run: `cd e:\code\jianghu-client\shells\h5 && npx vitest run tests/segments.test.ts tests/binding.test.ts`
Expected: FAIL（`sectionSlice`/`segmentCount`/`clampView` 未定义、`UiState.viewIndex/segEnds` 缺失）。

- [ ] **Step 4: 实现 segments.ts（新建）**

`shells/h5/src/engine/segments.ts`：

```ts
import type { Line, UiState } from "./binding";

/** 段总数 = 已闭合段 + （存在未闭合尾段 ? 1 : 0） */
export function segmentCount(s: Pick<UiState, "lines" | "segEnds">): number {
  const lastEnd = s.segEnds.length ? s.segEnds[s.segEnds.length - 1]! : -1;
  const hasOpen = s.lines.length - 1 > lastEnd;
  return s.segEnds.length + (hasOpen ? 1 : 0);
}

/** 把 viewIndex 夹到 [0, segmentCount-1]；无段时返回 0 */
export function clampView(viewIndex: number, segCount: number): number {
  if (segCount <= 0) return 0;
  return Math.min(Math.max(0, viewIndex), segCount - 1);
}

/** 当前显示段的切片（闭区间 [startIdx, endIdx]） */
export function segmentSlice(s: Pick<UiState, "lines" | "segEnds" | "viewIndex">): Line[] {
  const total = segmentCount(s);
  if (total <= 0 || s.lines.length === 0) return [];
  const vi = clampView(s.viewIndex, total);
  const startIdx = vi === 0 ? 0 : s.segEnds[vi - 1]! + 1;
  const endIdx = vi < s.segEnds.length ? s.segEnds[vi]! : s.lines.length - 1;
  return s.lines.slice(startIdx, endIdx + 1);
}
```

- [ ] **Step 5: 改造 binding.ts**

关键改动（完整保留现有 handle 逻辑，仅增量）：

```ts
export interface UiState {
  scene: Scene | null;
  fx: string | null;
  lines: Line[];
  options: OptionItem[];
  viewIndex: number;   // 当前显示段（0 基）
  segEnds: number[];   // 各已闭合段最后一条 line 的下标
}
```

构造函数默认值同步补 `viewIndex: 0, segEnds: []`。`start()` 不变（走 `scene` 命令重置）。新增方法（插入在 `pick` 之后）：

```ts
  private syncView(): void {
    this.state.viewIndex = clampView(this.state.viewIndex, segmentCount(this.state));
  }

  /** 前进一段（点击正文区） */
  advance(): void {
    this.state.viewIndex = clampView(this.state.viewIndex + 1, segmentCount(this.state));
  }
  /** 回看上一段（底部小字） */
  retreat(): void {
    this.state.viewIndex = clampView(this.state.viewIndex - 1, segmentCount(this.state));
  }
  /** 当前显示段（NarrativePanel 直接渲染） */
  visibleLines(): Line[] {
    return segmentSlice(this.state);
  }
```

`handle` 内：
- `scene` 分支：多加 `this.state.segEnds = []; this.state.viewIndex = 0;`
- 各线命令（narration/dialog/monologue/voiceoff）保持不变。
- `options` 分支：**标记段闭合**后再存选项：

```ts
      case "options":
        if (this.state.lines.length > 0) {
          this.state.segEnds.push(this.state.lines.length - 1); // 本段到此为止
        }
        this.state.options = cmd.options;
        this.optionsEmitted = true;
        this.syncView();
        break;
```

`triggerPoint` 与 `pick` 在响应动作后重置到最新段：
- `triggerPoint`：在 `this.engine.triggerPoint(id)` 之后（同步执行完毕）加 `this.state.viewIndex = Math.max(0, segmentCount(this.state) - 1);`
- `pick`：把返回 `ok` 后清空 options 的逻辑保留，并在 `ok` 时（执行 `choose` 后）设置为最新段：

```ts
  pick(label: string): void {
    this.optionsEmitted = false;
    const ok = this.engine.choose(label);
    if (ok) {
      this.state.options = [];
      this.state.viewIndex = Math.max(0, segmentCount(this.state) - 1);
    }
  }
```

> 原 `pick` 用 `if (ok && !this.optionsEmitted) this.state.options=[];`，`goto` 到带选项 dialog 时依赖 `optionsEmitted` 保留新选项 —— 保持该逻辑，勿简单替换。最小改动：保留 `if (ok && !this.optionsEmitted)` 分支，在其后追加 `if (ok) this.state.viewIndex = Math.max(0, segmentCount(this.state) - 1);`。

- [ ] **Step 6: 改造 useGame.ts**

`useGame` 返回增补三个方法：

```ts
export function useGame() {
  return {
    state,
    triggerPoint: (id: string) => binding.triggerPoint(id),
    pick: (label: string) => binding.pick(label),
    advance: () => binding.advance(),
    retreat: () => binding.retreat(),
    visibleLines: () => binding.visibleLines(),
  };
}
```

- [ ] **Step 7: 跑测试确认通过 + 全量回归**

Run: `cd e:\code\jianghu-client\shells\h5 && npm test`
Expected: segments.test + binding.test + 既有 scene/useViewport 测试全 PASS。

- [ ] **Step 8: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/engine/binding.ts shells/h5/src/engine/segments.ts shells/h5/src/engine/useGame.ts shells/h5/tests/segments.test.ts shells/h5/tests/binding.test.ts
git commit -m "feat(h5): binding 逐段对话状态机 advance/retreat/visibleLines"
```

---

### Task 3: SceneProp 内联 SVG 实例 + InteractPoint 渲染 shape

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\components\SceneProp.vue`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\InteractPoint.vue`
- Modify: `e:\code\jianghu-client\shells\h5\src\styles\main.css`（古风色板/衬线/组件基线）

- [ ] **Step 1: 实现 SceneProp.vue（新建）**

按 `shape` 输出对应的水墨线描 SVG。SVG 采用 `viewBox="0 0 96 96"`，统一墨色描边 `#3a322a`、淡赭 `#8a6f4d`，`fill="none"` 线描风。各 shape 一个 `defineComponent`/模板内条件渲染：

```vue
<script setup lang="ts">
import type { PropShape } from "@core";

const props = defineProps<{ shape: PropShape; size?: number }>();
const s = props.size ?? 60;
</script>

<template>
  <svg :viewBox="'0 0 96 96'" :width="s" :height="s" class="scene-prop" aria-hidden="true">
    <!-- 坛 -->
    <g v-if="shape === 'jar'">
      <path d="M30 30 h36 M32 30 c-2 8 -3 12 -2 20 l3 24 c1 4 8 4 22 4 c14 0 21 0 22 -4 l3 -24 c1 -8 0 -12 -2 -20" fill="none"/>
      <ellipse cx="48" cy="30" rx="18" ry="5"/>
      <rect x="42" y="12" width="12" height="8"/>
    </g>
    <!-- 船 -->
    <g v-else-if="shape === 'boat'">
      <path d="M16 66 q32 6 64 0 l-8 10 H24 z" fill="#3a322a" opacity="0.18"/>
      <path d="M14 64 q34 4 68 0 l-10 8 H24 l-6-8 z" fill="none" stroke="#3a322a" stroke-width="2"/>
      <rect x="44" y="38" width="3" height="26"/>
      <path d="M47 40 h26" stroke="#3a322a" stroke-width="2"/>
    </g>
    <!-- 告示 -->
    <g v-else-if="shape === 'notice'">
      <rect x="34" y="30" width="28" height="42" fill="#8a6f4d" opacity="0.55" stroke="#3a322a" stroke-width="2"/>
      <line x1="40" y1="40" x2="56" y2="40" stroke="#3a322a" stroke-width="2"/>
      <line x1="40" y1="48" x2="56" y2="48" stroke="#3a322a" stroke-width="2"/>
      <line x1="40" y1="56" x2="52" y2="56" stroke="#3a322a" stroke-width="2"/>
      <path d="M34 30 l-6 -20 h52 l-6 20" fill="none" stroke="#3a322a" stroke-width="2"/>
    </g>
    <!-- 老船家 -->
    <g v-else-if="shape === 'boatman'">
      <circle cx="48" cy="34" r="9" fill="none" stroke="#3a322a" stroke-width="2"/>
      <path d="M30 84 c0 -22 8 -34 18 -34 c10 0 18 12 18 34" fill="none" stroke="#3a322a" stroke-width="3"/>
      <path d="M38 62 l20 2" stroke="#3a322a" stroke-width="2"/>
    </g>
    <!-- 龙潭 -->
    <g v-else-if="shape === 'tarn'">
      <ellipse cx="48" cy="58" rx="34" ry="16" fill="#2f5148" opacity="0.5"/>
      <path d="M14 58 q17 -12 34 -12 q17 0 34 12" fill="none" stroke="#3a322a" stroke-width="2"/>
      <path d="M26 56 q18 -8 36 -8" stroke="#8a6f4d" stroke-width="1.5"/>
    </g>
    <!-- 守山僧 -->
    <g v-else-if="shape === 'monk'">
      <circle cx="48" cy="30" r="8" fill="none" stroke="#3a322a" stroke-width="2"/>
      <rect x="38" y="36" width="20" height="5" rx="2" fill="none" stroke="#3a322a" stroke-width="2"/>
      <path d="M30 86 c0 -26 8 -38 18 -38 c10 0 18 12 18 38" fill="none" stroke="#3a322a" stroke-width="3"/>
      <circle cx="48" cy="64" r="2" fill="#8a6f4d"/>
    </g>
    <!-- 雪松 -->
    <g v-else-if="shape === 'pine'">
      <path d="M48 12 l14 20 H34 z" fill="#3a322a" opacity="0.5"/>
      <path d="M42 30 l16 22 H26 z" fill="#3a322a" opacity="0.35"/>
      <rect x="46" y="54" width="4" height="22" fill="#3a322a"/>
    </g>
  </svg>
</template>

<style scoped>
.scene-prop { display: block; overflow: visible; filter: drop-shadow(0 1px 2px rgba(40,30,20,0.35)); }
</style>
```

- [ ] **Step 2: 改造 InteractPoint.vue 用 shape 渲染实例**

替换字符 icon 渲染：当 `point.shape` 存在渲染 `SceneProp`，否则保留字符回退；保留微浮动晕环：

```vue
<script setup lang="ts">
import type { InteractPoint } from "@core";
import SceneProp from "./SceneProp.vue";

defineProps<{ point: InteractPoint }>();
const emit = defineEmits<{ (e: "click-p", id: string): void }>();
</script>

<template>
  <button
    class="interact-point"
    :style="{ left: point.x * 100 + '%', top: point.y * 100 + '%' }"
    :aria-label="point.icon"
    @click="emit('click-p', point.id)"
  >
    <span class="ip-ring"></span>
    <SceneProp v-if="point.shape" :shape="point.shape" :size="58" />
    <span v-else class="ip-icon">{{ point.icon }}</span>
  </button>
</template>
```

> `@click` 交由父级 `SceneView` 的 `@click-p="triggerPoint"`（已存在，无需改）。`SceneView.vue` 里 `:style` 绑定保留。

- [ ] **Step 3: 古风基线样式 main.css**

替换顶部色板/字体为宣纸米白墨黑赭石 + 衬线栈（保留 `.game` 布局）：

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; }
body {
  font-family: "Songti SC", "STSong", "SimSun", "KaiTi", "楷体", serif;
  background: #efe7d8;          /* 宣纸米白 */
  color: #2d2418;               /* 墨黑 */
  overflow: hidden;
}
button { cursor: pointer; }
.game {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  margin: 0 auto;
  max-width: 480px;
  background: #efe7d8;
}
```

- [ ] **Step 4: 类型 + 构建校验**

Run: `cd e:\code\jianghu-client\shells\h5 && npx tsc --noEmit && npm run build`
Expected: 无 TS 错误，vite build 成功。

- [ ] **Step 5: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/components/SceneProp.vue shells/h5/src/components/InteractPoint.vue shells/h5/src/styles/main.css
git commit -m "feat(h5): SceneProp 水墨线描实例 + InteractPoint 按 shape 渲染 + 古风基线"
```

---

### Task 4: SceneLayer 支持 svg 轮廓层 + content 重建 4 层

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneLayer.vue`
- Modify: `e:\code\jianghu-client\content\src\northward.ts`

- [ ] **Step 1: 改造 SceneLayer.vue 支持 kind="svg"**

当 `layer.kind==="svg"` 时叠加剪影 SVG（`layer.svg` 为内联元素标记），并保留 `layer.css` 作垂直渐暗：

```vue
<script setup lang="ts">
import type { SceneLayer } from "@core";
withDefaults(defineProps<{ layer: SceneLayer; height?: number }>(), { height: 1 });
</script>

<template>
  <div
    class="scene-layer"
    :class="{ 'is-svg': layer.kind === 'svg' }"
    :style="{
      background: layer.css,
      height: (height * 100) + '%',
      willChange: 'transform',
    }"
  >
    <svg v-if="layer.kind === 'svg' && layer.svg" class="layer-silhouette" viewBox="0 0 200 120" preserveAspectRatio="none" v-html="layer.svg"></svg>
  </div>
</template>

<style scoped>
.scene-layer { position: absolute; left: 0; right: 0; top: 0; pointer-events: none; overflow: hidden; }
.layer-silhouette { position: absolute; inset: 0; width: 100%; height: 100%; }
</style>
```

- [ ] **Step 2: content northward.ts 重建 layers 为 4 层 + 补 shape 贴点**

**渡口 `layers`**（worldWidth 维持 2）：

```ts
layers: [
  { id: "far",   depth: 0.04, kind: "gradient", css: "linear-gradient(180deg,#3a3a2e 0%,#e8e0cf 100%)" },
  { id: "mount", depth: 0.28, kind: "svg", css: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(90,82,64,0.5) 100%)",
    svg: '<g fill="#7d745f" opacity="0.55"><polygon points="0,120 60,30 120,120"/><polygon points="90,120 150,50 200,120"/></g>' },
  { id: "tree",  depth: 0.6,  kind: "svg", css: "transparent",
    svg: '<g fill="#4a4232"><path d="M20,120 q18,-40 0,-70 q18,30 30,0 q16,40 0,70z" opacity="0.6"/><path d="M150,120 q18,-30 0,-60 q18,24 26,0 q14,36 0,60z" opacity="0.5"/></g>' },
  { id: "near",  depth: 1.0,  kind: "gradient", css: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(64,52,38,0.35) 100%)" },
],
```

**龙潭 `layers`**（worldWidth 维持 3）：

```ts
layers: [
  { id: "far",   depth: 0.04, kind: "gradient", css: "linear-gradient(180deg,#2e3a2a 0%,#e4e0d2 100%)" },
  { id: "mount", depth: 0.28, kind: "svg", css: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(70,84,66,0.5) 100%)",
    svg: '<g fill="#5f6f5a" opacity="0.5"><polygon points="0,120 70,34 140,120"/><polygon points="110,120 175,50 200,120"/></g>' },
  { id: "tree",  depth: 0.6,  kind: "svg", css: "transparent",
    svg: '<g fill="#33391f"><path d="M40,120 q20,-40 0,-80 q22,34 34,0 q20,44 0,80z" opacity="0.6"/><path d="M150,120 q16,-30 0,-56 q18,24 26,0 q16,34 0,56z" opacity="0.5"/></g>' },
  { id: "near",  depth: 1.0,  kind: "gradient", css: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(40,50,32,0.4) 100%)" },
],
```

**物体补 shape 与贴点微调**（分支/goto 一律不动）：
- 渡口 `barrel`：`shape: "jar"`，y 0.68→0.66（半埋滩涂）。
- 渡口 `boat`：`shape: "boat"`，y 0.55→0.62（贴水岸）。
- 渡口 `notice`：`shape: "notice"`，y 0.3→0.34。
- 龙潭 `tan`：`shape: "tarn"`，y 0.35→0.5（水面）。
- 龙潭 `monk`：`shape: "monk"`，y 0.4→0.62。
- 龙潭 `pine`：`shape: "pine"`，y 0.2→0.24（山巅）。

> entry/on 内文字、setflag/take/check、`goto:"=longtan"`、cond 均保持原文不改。

- [ ] **Step 3: 回归测试 + tsc + build**

Run: `cd e:\code\jianghu-client\shells\h5 && npm test && npx tsc --noEmit && npm run build`
Expected: 全 PASS（含 engine_scene.test 跨场景 goto），build 成功。

- [ ] **Step 4: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/components/SceneLayer.vue content/src/northward.ts
git commit -m "feat(h5): SceneLayer svg 轮廓层 + content 4 层视差与 shape 贴点"
```

---

### Task 5: 水墨 PNG 底图 + SceneBg 渲染

**Files:**
- Generate: `e:\code\jianghu-client\shells\h5\src\assets\scenes\wudai.png`、`longtan.png`
- Create: `e:\code\jianghu-client\shells\h5\src\assets\scenes\index.ts`（bg 名→图片 url 映射）
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneBg.vue`

- [ ] **Step 1: 生成两张水墨山水 PNG**

使用 `GenerateImage` 工具，生成两张复古水墨山水（工笔淡彩、宣纸底色、留白、赭石点缀），存为**画布 1024px 之内**的历史存档注意：本步在本地执行即可，直接写 `shells/h5/src/assets/scenes/`，两图长宽比约 4:3，统一暖宣底色以贴合 `#efe7d8`：
- `wudai.png`：松花江渡口 —— 晨雾中的水岸、两三只木船靠岸、对岸远山淡墨、江滩芦苇。
- `longtan.png`：龙潭山 —— 幽深山涧一泓青潭、山巅孤松、云雾缭绕的层峦。
> prompt 用中文：如「国画水墨山水，宣纸米白底，远山淡墨，近景赭石勾线码头木船在岸边，留白，工笔淡彩，横向构图」。

- [ ] **Step 2: 建 assets/scenes/index.ts**

```ts
import wudai from "./wudai.png";
import longtan from "./longtan.png";

export const sceneImages: Record<string, string> = { riverside: wudai, mountain: longtan };
```

> Vite 默认支持 png 导入（`vite/client` 类型）。若 TS 报缺类型，确保 `shells/h5/vite-env.d.ts` 含 `/// <reference types="vite/client" />`（无则新建该文件）。

- [ ] **Step 3: 改造 SceneBg.vue**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { sceneImages } from "../assets/scenes/index";

const props = defineProps<{ name: string; bg: string }>();
const src = computed(() => sceneImages[props.bg] ?? "");
</script>

<template>
  <div class="scene-bg">
    <img v-if="src" :src="src" class="bg-img" alt="" />
    <div class="bg-mask"></div>
    <span class="scene-name">{{ name }}</span>
  </div>
</template>

<style scoped>
.scene-bg { position: absolute; inset: 0; overflow: hidden; }
.bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.bg-mask { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(40,30,20,0.12) 0%, rgba(40,30,20,0) 55%, rgba(40,30,20,0.5) 100%); }
.scene-name {
  position: absolute; top: 14px; left: 14px;
  font-size: 20px; letter-spacing: 4px;
  color: #efe7d8; text-shadow: 0 1px 3px rgba(40,30,20,0.9);
}
</style>
```

> `SceneView.vue` 中 `<SceneBg :name="scene.name" :bg="scene.bg" />` 已就位，无需改。

- [ ] **Step 4: 构建校验**

Run: `cd e:\code\jianghu-client\shells\h5 && npx tsc --noEmit && npm run build`
Expected: 无 TS 错误，build 成功且 assets/scenes/*.png 被正确打包（dist/assets 含图片）。

- [ ] **Step 5: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/assets/scenes/ shells/h5/src/components/SceneBg.vue
git commit -m "feat(h5): 水墨山水 PNG 底图 + SceneBg 渲染与墨色叠层"
```

---

### Task 6: NarrativePanel 逐段 UI（无滚动条 + 底部小字回看 + 历史兜底）

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\components\NarrativePanel.vue`
- Modify（可选，仅样式）: `e:\code\jianghu-client\shells\h5\src\components\FlowControl.vue`、`ChoiceGroup.vue`、`DialogSlot.vue`（切古风：宣纸/墨/赭石）

- [ ] **Step 1: 重建 NarrativePanel.vue**

移除 `.lines` 滚动条，改为渲染 `visibleLines()`（当前段切片）+ 整区点击推进 + 底部小字上/下一段；`viewIndex` 到最末且已在末段时停住等选项；选项出现时隐藏底部翻页。

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../engine/useGame";
import { segmentCount } from "../engine/segments";
import DialogSlot from "./DialogSlot.vue";
import ChoiceGroup from "./ChoiceGroup.vue";
import FlowControl from "./FlowControl.vue";

const { state, pick, advance, retreat, visibleLines } = useGame();
const historyOpen = ref(false);
const lines = computed(() => visibleLines());
const totalSegs = computed(() => segmentCount(state));
const atEnd = computed(() => state.viewIndex >= totalSegs.value - 1);
const atTop = computed(() => state.viewIndex <= 0);

function onClickBody(): void {
  if (state.options.length) return;   // 有选项时不误触
  if (!atEnd.value) advance();        // 还有下段则推进
}
</script>

<template>
  <div class="narrative-panel">
    <FlowControl v-model:open="historyOpen" :lines="state.lines" />
    <div v-if="!historyOpen" class="lines" @click="onClickBody">
      <DialogSlot v-for="(l, i) in lines" :key="i" :line="l" :active="i === lines.length - 1" />
      <div v-if="!state.options.length" class="pager">
        <button v-if="!atTop" class="pager-btn" @click.stop="retreat">▲ 上一段</button>
        <button v-else-if="!atEnd" class="pager-btn" @click.stop="advance">▼ 下一段</button>
      </div>
    </div>
    <div v-else class="history">
      <p v-for="(l, i) in state.lines" :key="i">
        {{ l.kind === "dialog" && l.npc ? l.npc + "：" : "" }}{{ l.text }}
      </p>
    </div>
    <ChoiceGroup :options="state.options" @pick="pick" />
  </div>
</template>

<style scoped>
.narrative-panel {
  max-height: 46%;
  padding: 10px 14px 14px;
  background: linear-gradient(to top, rgba(64,52,38,0.96), rgba(90,78,58,0.9));
  border-top: 1px solid rgba(200,170,110,0.5);   /* 细描金线 */
  color: #f2ecd8;
}
.lines { max-height: 190px; overflow: hidden; }   /* 无滚动条 */
.history { max-height: 190px; overflow-y: auto; font-size: 13px; color: #d8cba8; }
.pager { display: flex; justify-content: center; gap: 10px; margin-top: 8px; }
.pager-btn {
  border: 1px solid rgba(200,170,110,0.6);
  background: rgba(40,26,16,0.5);
  color: #f2ecd8; font-size: 12px; padding: 3px 12px; border-radius: 2px;
  letter-spacing: 2px;
}
</style>
```

- [ ] **Step 2: FlowControl / ChoiceGroup / DialogSlot 切古风（配色）**

- `FlowControl.vue`：`.fc-btn` 改 `background: rgba(40,26,16,0.5); color:#d8cba8; border:1px solid rgba(200,170,110,0.5);`
- `ChoiceGroup.vue`：`.choice` 改宣纸底墨字：`border:1px solid rgba(200,170,110,0.6); background:rgba(239,231,216,0.96); color:#2d2418;` `.choice:active{background:#d8cba8;}`；首字/间距 `letter-spacing:2px;`
- `DialogSlot.vue`：`.npc-tag` 改 `color:#e8b46a;` `.line-text` 改 `color:#f2ecd8;`
- `NarrativePanel` 的 `.history`/`.choice` 文本色保持墨色系可见性自查。

- [ ] **Step 3: 回归测试 + tsc + build + 冒烟**

Run: `cd e:\code\jianghu-client\shells\h5 && npm test && npx tsc --noEmit && npm run build`
Expected: 全 PASS、无 TS、build 成功。

冒烟：`npm run dev`，打开 `http://localhost:5173`，验证：
- 进渡口：entry 段单屏显示（narration+老船家对话+选项），**无滚动条**。
- 点背景正文：每次点击跳下一段；到底停住。
- 底部「上一段/下一段」可来回翻页回看；选项出现时翻页隐藏。
- 点「坛」(jar 线描) → 收酒 → 点「船」→ 出现「递上酒水，随船北上」→ 跨场景到龙潭山（水墨深山）。
- 龙潭山点「潭」取水 → 点「松」浇松得赤果 → 点「僧」支线；四处物体均为各自 shape 线描实例。
- 拖动场景：远/mount/tree/near 四层错位明显（沿 depth 递减）。
- 左上「历史(N)」兜底弹窗仍可查看全部。

- [ ] **Step 4: 提交**

```bash
cd e:\code\jianghu-client
git add shells/h5/src/components/NarrativePanel.vue shells/h5/src/components/FlowControl.vue shells/h5/src/components/ChoiceGroup.vue shells/h5/src/components/DialogSlot.vue
git commit -m "feat(h5): 逐段对话 UI + 古风配色 + 底部回看"
```

---

### Task 7: 全量收尾与回归

**Files:** 无新增；仅验证。

- [ ] **Step 1: 全量测试**

Run: `cd e:\code\jianghu-client\shells\h5 && npm test && npx tsc --noEmit && npm run build`
Expected: 所有 vitest 通过、无 TS、build 成功。

- [ ] **Step 2: 提交计划与任何遗漏**

```bash
cd e:\code\jianghu-client
git add -A
git status            # 确认只含本方案改动，无越界文件
git commit -m "chore(h5): ink-wuxia rewrite 收尾"
```

> 若计划文档未提交，先：`git add ../docs/superpowers/plans/2026-09-22-jianghu-h5-rewrite-ink-wuxia.md && git commit -m "docs: plan h5 ink-wuxia rewrite"`。

- [ ] **Step 3: 与 spec 复核清单**

逐条核对 spec：
- [ ] 背景水墨 PNG 底图 + SceneBg（Task5）
- [ ] 物体实例化 SceneProp + shape（Task1/3/4）
- [ ] 四层视差 + SceneLayer svg 轮廓（Task1/4）
- [ ] 古风武侠配色 + 衬线字体（Task3/6）
- [ ] 逐段推进 state.viewIndex + advance/retreat（Task2）
- [ ] 无滚动条切片渲染（Task2/6）
- [ ] 底部小字回看 + 历史兜底（Task2/6）
- [ ] 剧情内容与 goto 未改动（Task4 只增 shape/layers）
- [ ] 全测试绿 + vite build 过（Task7）

---

## Self-Review

**Spec 覆盖：** 视觉四项（底图/实例/视差/古风）分落 Task5/3+4/T4+1/T3+6；对话系统（viewIndex/advance/retreat/切片/底部回看/历史兜底）全在 Task2+6；dsl 扩展与 content shape/4 层在 Task1+4。全部对齐。

**占位扫描：** 所有代码步骤含完整实现，svg 剪影为可直接粘贴的 `<path>/<polygon>`。唯一注记是 binding.test 中「段0实际线数按运行结果微调」的说明（因 fixture entry 首条为 `take` 不产线），已给判定准则而非留空。

**类型一致性：** `viewIndex`/`segEnds` 字段、`segmentCount/clampView/segmentSlice` 签名在 Task2 定义且被 Task6 复用；`PropShape` 枚举与 `shape?: PropShape` 贯穿 Task1/4/3；`SceneLayer.kind:"gradient"|"svg"+svg?` 贯穿 Task1/4/5（SceneBg 与层无关，不受影响）。名称统一。