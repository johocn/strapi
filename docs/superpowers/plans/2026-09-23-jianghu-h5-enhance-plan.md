# 江湖录 H5 客户端增强 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 jianghu-client（Vue3 H5 壳 + core DSL 引擎）补齐：场景编码 1/2 + 左右滑动/箭头切换 + 剧情锁门禁 + 三层人性化引导 + 松树浇水可视化 + 治愈系国风背景/物件素材。

**Architecture:** Scene DSL 加 4 个可选字段（index/requiredFlags/unlockHint/introHint），core Engine 注入式加可选 `canAdvance` 门禁钩子（loadScene 返回 boolean），h5 壳层独立实现切换交互、引导组件、CSS 状态切换。美术素材由 AI 生成后替换，缺省时回退现有 SVG/gradient。

**Tech Stack:** Vue 3.4、TypeScript 5.5、Vite 5、Vitest 2、无新增 npm 依赖。

**Spec:** `docs/superpowers/specs/2026-09-23-jianghu-h5-enhance-design.md`

---

### Task 1: Scene DSL 增量（types.ts + 单测）

**Files:**
- Modify: `e:\code\jianghu-client\core\src\dsl\types.ts`
- Modify: `e:\code\jianghu-client\core\tests\types.test.ts`

- [ ] **Step 1: 写失败测试**

在 `core/tests/types.test.ts` 文件末尾追加：

```ts
describe("Scene 增强字段", () => {
  it("Scene 支持 index/requiredFlags/unlockHint/introHint", () => {
    const s = {
      id: "wudai", name: "松花江渡口", bg: "riverside",
      index: 1,
      requiredFlags: ["saw_notice"],
      unlockHint: "先去看看告示牌",
      introHint: "松花江渡口 — 先看看告示牌",
      points: [], entry: [],
    };
    expect(s.index).toBe(1);
    expect(s.requiredFlags).toEqual(["saw_notice"]);
    expect(s.unlockHint).toContain("告示");
    expect(s.introHint).toContain("松花江");
  });
  it("Scene 四个新字段全部可选（缺省不报错）", () => {
    const s = { id: "x", name: "x", bg: "x", points: [], entry: [] };
    expect(s.index).toBeUndefined();
    expect(s.requiredFlags).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\jianghu-client\core; npx vitest run tests/types.test.ts`
Expected: FAIL —— Scene 接口上不存在新字段，TS 类型校验报错。

- [ ] **Step 3: 修改 Scene 接口**

在 `core/src/dsl/types.ts` 的 `export interface Scene` 里，`entry: Behavior[];` 之前追加四行：

```ts
  index?: number;             // 场景顺序号 1,2,3... 缺省时按数组自然序
  requiredFlags?: string[];   // 剧情锁：这些 flag 全部 setflag 过才算「完成」
  unlockHint?: string;        // 门禁被挡时的人性化提示
  introHint?: string;         // L2 场景提要，进入场景后自动 toast
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\jianghu-client\core; npx vitest run tests/types.test.ts`
Expected: 全绿（三个 describe 块全部通过）。

- [ ] **Step 5: 构建核心包**

Run: `cd e:\code\jianghu-client\core; npm run build`
Expected: `dist/` 产物更新，无 TS 错。

- [ ] **Step 6: 提交**

```bash
git add jianghu-client/core/src/dsl/types.ts jianghu-client/core/tests/types.test.ts jianghu-client/core/dist/
git commit -m "feat(core): Scene 加 index/requiredFlags/unlockHint/introHint 四个可选字段"
```

---

### Task 2: Engine 注入式门禁钩子

**目的：** 让所有场景切换路径（路标、剧情 goto、箭头、滑动）统一过门禁，且改动极小。

**Files:**
- Modify: `e:\code\jianghu-client\core\src\engine\engine.ts`
- Test: `e:\code\jianghu-client\core\tests\engine-scene.test.ts`

- [ ] **Step 1: 读现有 engine-scene 测试，了解 gotoScene 现有断言**

Run: `Get-Content "e:\code\jianghu-client\core\tests\engine-scene.test.ts"`（先读再改，避免破坏现有测试）

- [ ] **Step 2: 写失败测试**

在 `engine-scene.test.ts` 末尾追加：

```ts
it("gotoScene 被 canAdvance 钩子拦截时返回 false 且不切场", () => {
  const scenes: Record<string, Scene> = {
    a: { id: "a", name: "A", bg: "x", points: [], entry: [] },
    b: { id: "b", name: "B", bg: "x", points: [], entry: [] },
  };
  let gateCalled = false;
  const eng = new Engine(scenes.a, {
    resolveScene: (id) => scenes[id],
    canAdvance: () => { gateCalled = true; return false; },
  });
  const ok = eng.gotoScene("b");
  expect(ok).toBe(false);
  expect(gateCalled).toBe(true);
  expect((eng as any).state.sceneId).toBe("a"); // 未切场
});

it("canAdvance 返回 true 时正常切场", () => {
  const scenes: Record<string, Scene> = {
    a: { id: "a", name: "A", bg: "x", points: [], entry: [] },
    b: { id: "b", name: "B", bg: "x", points: [], entry: [] },
  };
  const eng = new Engine(scenes.a, {
    resolveScene: (id) => scenes[id],
    canAdvance: () => true,
  });
  const ok = eng.gotoScene("b");
  expect(ok).toBe(true);
  expect((eng as any).state.sceneId).toBe("b");
});
```

- [ ] **Step 3: 运行确认失败**

Run: `cd e:\code\jianghu-client\core; npx vitest run tests/engine-scene.test.ts`
Expected: FAIL —— Engine 构造函数没有 canAdvance 参数。

- [ ] **Step 4: 改 Engine 构造 + loadScene 返回 boolean + gotoScene/followGoto/goto case 统一走 loadScene**

`engine.ts` 改动点：

```ts
// 构造函数 opts 加一个字段
constructor(scene: Scene, opts: {
  resolveScene?: (id: string) => Scene | undefined;
  canAdvance?: (current: Scene, next: Scene) => boolean;  // 新增
} = {}) {
  this.scene = scene;
  this.state = createState(scene.id);
  this.resolveScene = opts.resolveScene;
  this.canAdvance = opts.canAdvance;  // 新增
}
private canAdvance?: (current: Scene, next: Scene) => boolean;  // 新增
```

```ts
// loadScene 改签名：void → boolean，开头插门禁检查
loadScene(next: Scene): boolean {
  if (this.canAdvance && !this.canAdvance(this.scene, next)) return false;
  this.scene = next;
  this.state.sceneId = next.id;
  this.program = next.entry;
  this.lastOptions = [];
  this.emitScene();
  this.runBehaviors(this.program);
  return true;
}
```

```ts
// gotoScene：loadScene 已返回 boolean，直接透传
gotoScene(id: string): boolean {
  const next = this.resolveScene?.(id);
  if (!next) return false;
  return this.loadScene(next);
}
```

```ts
// followGoto 内部：接收 loadScene 返回值
private followGoto(target: string): void {
  if (target.startsWith("=")) {
    const id = target.slice(1);
    const next = this.resolveScene?.(id);
    if (next) {
      this.loadScene(next);  // 门禁拦截时 loadScene 返回 false，自然不切
    } else {
      this.state.sceneId = id;
    }
    return;
  }
  const found = this.program.filter((b) => b.id === target);
  this.runBehaviors(found);
}
```

```ts
// runBehaviors 的 goto case：接收 loadScene 返回值
case "goto": {
  if (b.sceneId) {
    const next = this.resolveScene?.(b.sceneId);
    if (next) {
      this.loadScene(next);  // 同上，门禁拦得住就返回 false 不执行
    } else {
      this.state.sceneId = b.sceneId;
    }
  }
  break;
}
```

注意：`followGoto` 和 `runBehaviors` 原来 `loadScene` 是 void，现在返回 boolean 后原来的调用处只是语义不变（没用到返回值），自然兼容。

- [ ] **Step 5: 运行确认通过**

Run: `cd e:\code\jianghu-client\core; npx vitest run`
Expected: 全绿，新增两个 gate 测试 + 全部原有测试不挂。

- [ ] **Step 6: 构建 + 提交**

Run: `cd e:\code\jianghu-client\core; npm run build`
Expected: dist 更新。

```bash
git add jianghu-client/core/src/engine/engine.ts jianghu-client/core/tests/engine-scene.test.ts jianghu-client/core/dist/
git commit -m "feat(core): Engine loadScene 返回 boolean，注入 canAdvance 可选门禁钩子"
```

---

### Task 3: 门禁纯函数 + Scene 数组化 helper

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\engine\locks.ts`
- Test: `e:\code\jianghu-client\shells\h5\tests\locks.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from "vitest";
import { canAdvance, orderedScenes, getNext, getPrev } from "../src/engine/locks";
import type { Scene } from "@core";

const mk = (id: string, index?: number, requiredFlags?: string[]): Scene => ({
  id, name: id, bg: "x", index, requiredFlags, points: [], entry: [],
});

describe("canAdvance 门禁", () => {
  it("空 requiredFlags → 永远 true", () => {
    expect(canAdvance(mk("a"), {})).toBe(true);
  });
  it("全部 flag 已 set → true", () => {
    expect(canAdvance(mk("a", 1, ["saw_notice"]), { saw_notice: true })).toBe(true);
  });
  it("缺一个 flag → false", () => {
    expect(canAdvance(mk("a", 1, ["saw_notice", "x"]), { saw_notice: true })).toBe(false);
  });
  it("多余 flag 不影响", () => {
    expect(canAdvance(mk("a", 1, ["saw_notice"]), { saw_notice: true, other: true })).toBe(true);
  });
  it("显式 value=false 不算已完成", () => {
    expect(canAdvance(mk("a", 1, ["saw_notice"]), { saw_notice: false })).toBe(false);
  });
});

describe("orderedScenes / getNext / getPrev", () => {
  it("按 index 升序排列，缺 index 排末尾", () => {
    const sc: Record<string, Scene> = { b: mk("b", 2), a: mk("a", 1), c: mk("c") };
    const arr = orderedScenes(sc);
    expect(arr.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
  it("getNext/getPrev 按 index 推导", () => {
    const sc: Record<string, Scene> = { a: mk("a", 1), b: mk("b", 2) };
    expect(getNext(sc, "a")?.id).toBe("b");
    expect(getNext(sc, "b")).toBeNull();
    expect(getPrev(sc, "b")?.id).toBe("a");
    expect(getPrev(sc, "a")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run tests/locks.test.ts`
Expected: FAIL —— 模块不存在。

- [ ] **Step 3: 实现 locks.ts**

```ts
import type { Scene } from "@core";

/** 检查当前场景是否满足所有 requiredFlags 才能前进 */
export function canAdvance(scene: Scene, flags: Record<string, boolean>): boolean {
  if (!scene.requiredFlags || scene.requiredFlags.length === 0) return true;
  return scene.requiredFlags.every((f) => flags[f] === true);
}

/** 按 index 升序排列，缺省 index 排末尾 */
export function orderedScenes(scenes: Record<string, Scene>): Scene[] {
  return Object.values(scenes).sort(
    (a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER)
  );
}

/** 取下一场景（按 index+1），无则 null */
export function getNext(scenes: Record<string, Scene>, currentId: string): Scene | null {
  const arr = orderedScenes(scenes);
  const idx = arr.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx >= arr.length - 1) return null;
  return arr[idx + 1];
}

/** 取上一场景（按 index-1），无则 null */
export function getPrev(scenes: Record<string, Scene>, currentId: string): Scene | null {
  const arr = orderedScenes(scenes);
  const idx = arr.findIndex((s) => s.id === currentId);
  if (idx <= 0) return null;
  return arr[idx - 1];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run tests/locks.test.ts`
Expected: 全绿。

- [ ] **Step 5: 提交**

```bash
git add jianghu-client/shells/h5/src/engine/locks.ts jianghu-client/shells/h5/tests/locks.test.ts
git commit -m "feat(h5): canAdvance 门禁 + orderedScenes/getNext/getPrev 纯函数"
```

---

### Task 4: useGame 接入数组化 + 注入 gate + 导出 scenes + 暴露 flags + toast API

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\engine\useGame.ts`

- [ ] **Step 1: 改 useGame.ts**

完整替换：

```ts
import { reactive } from "vue";
import { Engine } from "@core";
import { scenes, startSceneId } from "../../../../content/src/northward";
import { GameBinding, type UiState } from "./binding";
import { canAdvance } from "./locks";
import type { Scene } from "@core";

const state = reactive<UiState>({ scene: null, fx: null, lines: [], options: [], viewIndex: 0, segEnds: [] });

// 导出给 SceneView 用
export const allScenes: Record<string, Scene> = scenes;

const binding = new GameBinding(
  new Engine(scenes[startSceneId], {
    resolveScene: (id) => scenes[id],
    canAdvance: (current, next) => canAdvance(current, (binding.engine.state.flags)),
  }),
  state
);
binding.start();

// Toast 简单 API（SceneToast.vue 挂载后订阅此 ref）
import { ref } from "vue";
export const toast = ref<{ text: string; position: "top" | "bottom"; duration: number } | null>(null);

export function showToast(text: string, position: "top" | "bottom" = "top", duration = 3000): void {
  toast.value = { text, position, duration };
}

export function useGame() {
  return {
    state,
    triggerPoint: (id: string) => binding.triggerPoint(id),
    pick: (label: string) => binding.pick(label),
    advance: () => binding.advance(),
    retreat: () => binding.retreat(),
    visibleLines: () => binding.visibleLines(),
    gotoScene: (id: string) => binding.gotoScene(id),
    flags: binding.engine.state.flags,       // 新增：供 SceneProp 浇水状态用
  };
}
```

- [ ] **Step 2: 类型检查**

Run: `cd e:\code\jianghu-client\shells\h5; npx tsc --noEmit`
Expected: 无 TS 错。`Engine` 能识别新的 canAdvance 参数（因为 Task 2 已改 core dist）。

- [ ] **Step 3: 运行现有单测回归**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run tests/binding.test.ts tests/engine_scene.test.ts`
Expected: 全绿。

- [ ] **Step 4: 提交**

```bash
git add jianghu-client/shells/h5/src/engine/useGame.ts
git commit -m "feat(h5): useGame 注入 canAdvance gate，导出 allScenes/flags/toast"
```

---

### Task 5: SceneToast.vue（L2/L3 共用）

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\components\SceneToast.vue`

- [ ] **Step 1: 写组件**

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import type { PropType } from "vue";

const props = defineProps<{
  text: string;
  position: "top" | "bottom";
  duration?: number;
}>();
const emit = defineEmits<{ (e: "close"): void }>();

let timer: ReturnType<typeof setTimeout> | null = null;
onMounted(() => {
  timer = setTimeout(() => emit("close"), props.duration ?? 3000);
});
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div class="scene-toast" :class="position" @click="emit('close')">
    <span class="st-text">{{ text }}</span>
    <span class="st-close" @click.stop="emit('close')">×</span>
  </div>
</template>

<style scoped>
.scene-toast {
  position: absolute; left: 50%; transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(20, 14, 8, 0.78);
  color: #f2ecd8; border: 1px solid rgba(224, 190, 120, 0.5);
  border-radius: 4px;
  font-size: 14px; letter-spacing: 1px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  z-index: 40; pointer-events: auto;
  max-width: 80%;
  animation: fadeIn 0.25s ease-out;
}
.scene-toast.top { top: 72px; }
.scene-toast.bottom { bottom: 72px; }
.st-close { margin-left: 12px; cursor: pointer; opacity: 0.7; }
.st-close:hover { opacity: 1; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add jianghu-client/shells/h5/src/components/SceneToast.vue
git commit -m "feat(h5): SceneToast L2/L3 共用顶部/底部提示条"
```

---

### Task 6: GuideOverlay.vue（L1 新手引导）

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\components\GuideOverlay.vue`

- [ ] **Step 1: 写组件**

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";

const emit = defineEmits<{ (e: "done"): void }>();

const steps = [
  { target: '[data-point="notice"]', text: "先点击这张告示牌看看" },
  { target: '[data-point="boat"]',  text: "再和老船家说说话" },
  { target: '.road-sign',           text: "到右边缘，试着点路标切下一个场景" },
];

const idx = ref(0);

function next(): void {
  if (idx.value < steps.length - 1) {
    idx.value++;
  } else {
    skip();
  }
}

function skip(): void {
  try { localStorage.setItem("jianghu_tutorial_done", "true"); } catch { /* ignore */ }
  emit("done");
}

const highlight = ref<{ top: number; left: number; w: number; h: number } | null>(null);

function updateHighlight(): void {
  const sel = steps[idx.value].target;
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) { highlight.value = null; return; }
  const r = el.getBoundingClientRect();
  highlight.value = {
    top: r.top - 8, left: r.left - 8,
    w: r.width + 16, h: r.height + 16,
  };
}

onMounted(() => {
  updateHighlight();
  const ro = new ResizeObserver(updateHighlight);
  ro.observe(document.body);
});
</script>

<template>
  <div class="guide-overlay" @click="next">
    <div v-if="highlight" class="guide-mask">
      <div class="guide-cutout" :style="{
        top: highlight.top + 'px', left: highlight.left + 'px',
        width: highlight.w + 'px', height: highlight.h + 'px',
      }"></div>
    </div>
    <div class="guide-bubble" :style="{
      top: (highlight ? highlight.top - 56 : '40%') + 'px',
      left: (highlight ? highlight.left + highlight.w / 2 : '50%') + 'px',
    }">
      <p class="gb-text">{{ steps[idx].text }}</p>
      <div class="gb-footer">
        <button class="gb-skip" @click.stop="skip">跳过</button>
        <button class="gb-next" @click.stop="next">{{ idx === steps.length - 1 ? '完成' : '下一个' }} ({{ idx + 1 }}/{{ steps.length }})</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guide-overlay {
  position: fixed; inset: 0;
  background: rgba(10, 6, 3, 0.72);
  z-index: 200; pointer-events: auto;
}
.guide-mask { position: absolute; inset: 0; }
.guide-cutout {
  position: fixed;
  background: transparent;
  border: 2px solid #f2ecd8;
  border-radius: 6px;
  box-shadow: 0 0 0 9999px rgba(10, 6, 3, 0.72);
  pointer-events: none;
  transition: all 0.2s ease;
}
.guide-bubble {
  position: fixed; transform: translateX(-50%);
  background: linear-gradient(180deg, #e9dfc8, #d8c9a8);
  color: #3a2e1c; border: 1px solid #b09a68; border-radius: 6px;
  padding: 12px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 200px; max-width: 320px;
  text-align: center;
}
.gb-text { margin: 0 0 10px; font-size: 14px; line-height: 1.6; }
.gb-footer { display: flex; justify-content: space-between; }
.gb-skip {
  background: transparent; border: none; color: #6a5638; cursor: pointer; font-size: 13px;
}
.gb-next {
  background: #C03221; color: #f2ecd8; border: none; border-radius: 3px;
  padding: 5px 12px; font-size: 13px; cursor: pointer;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add jianghu-client/shells/h5/src/components/GuideOverlay.vue
git commit -m "feat(h5): GuideOverlay L1 新手引导遮罩（localStorage 持久化）"
```

---

### Task 7: SceneProp 浇水状态 + InteractPoint 传递 flags

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneProp.vue`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\InteractPoint.vue`（确认 SceneProp 调用处，可能只需加 flags prop 传递）

- [ ] **Step 1: 改 SceneProp.vue — 加 flags prop 和浇水状态**

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { PropShape } from "@core";

const props = defineProps<{
  shape: PropShape;
  size?: number;
  flags?: Record<string, boolean>;   // 新增
}>();
const s = props.size ?? 60;

const isWateredPine = computed(() =>
  props.shape === "pine" && props.flags?.["got_fruit"] === true
);
</script>
```

template 里给 pine 的 `<g>` 加条件 class：

```vue
<!-- 雪松 -->
<g v-else-if="shape === 'pine'" :class="{ watered: isWateredPine }">
  ...原有内容不变...
</g>
```

style 里追加：

```css
.pine.watered svg, :deep(.watered) svg {
  filter: brightness(0.85) saturate(1.4) contrast(1.1);
  transition: filter 0.6s ease;
}
```

- [ ] **Step 2: 读 InteractPoint.vue，确认 SceneProp 调用处传 flags**

Run: `Get-Content "e:\code\jianghu-client\shells\h5\src\components\InteractPoint.vue"`

然后找到 `<SceneProp :shape="..." :size="..." />` 那行，加 `:flags="flags"` prop。InteractPoint.vue 自己也要 defineProps 加 `flags?: Record<string, boolean>`。

- [ ] **Step 3: 提交**

```bash
git add jianghu-client/shells/h5/src/components/SceneProp.vue jianghu-client/shells/h5/src/components/InteractPoint.vue
git commit -m "feat(h5): SceneProp 浇水后 pine 加 CSS filter 湿润感"
```

---

### Task 8: SceneView.vue 大集成（切换箭头 + 滑动阈值 + toast/guide 挂载点 + 浇水 flags 传递）

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneView.vue`
- Test: `e:\code\jianghu-client\shells\h5\tests\useViewport.test.ts`（如有冲突跑回归）

- [ ] **Step 1: 读完整 SceneView.vue 现有实现**

（已读，上文已有）

- [ ] **Step 2: 改 SceneView.vue — 完整差异点列**

**a) import 追加：**
```ts
import { ref, watch, onMounted } from "vue";
import { allScenes, toast, showToast } from "../engine/useGame";
import { canAdvance, getNext, getPrev } from "../engine/locks";
import SceneToast from "./SceneToast.vue";
import GuideOverlay from "./GuideOverlay.vue";
```

**b) useGame 解构追加 flags：**
```ts
const { state, gotoScene, triggerPoint, flags } = useGame();
```

**c) 场景切换函数（取代现有 atRightEdge/nextId + road-sign）：**
```ts
const nextScene = computed(() => getNext(allScenes, scene.value?.id ?? ""));
const prevScene = computed(() => getPrev(allScenes, scene.value?.id ?? ""));

function tryAdvanceNext(): void {
  const cur = scene.value;
  if (!cur) return;
  if (!canAdvance(cur, flags)) {
    showToast(cur.unlockHint ?? "剧情尚未完成", "bottom", 4000);
    return;
  }
  const n = nextScene.value;
  if (n) gotoScene(n.id);
  else showToast("已是最后一个场景", "bottom");
}
function tryAdvancePrev(): void {
  const cur = scene.value;
  if (!cur) return;
  const p = prevScene.value;
  if (p) gotoScene(p.id);
}
```

**d) 触屏滑动阈值切换（onPointerUp 里插）：**
```ts
// 现有 drag 逻辑保留；在 onPointerUp 里加切换判定
const SLIDE_THRESHOLD = 80;
let slideStartX = 0;
function onPointerDown(e: PointerEvent): void {
  if ((e.target as Element)?.closest?.(".interact-point, .road-sign, button, a, .st-arrow")) return;
  slideStartX = e.clientX;
  dragStart.value = e.clientX;
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
}
function onPointerUp(e: PointerEvent): void {
  // 滑动阈值判定（在现有 drag reset 逻辑之前）
  const dx = e.clientX - slideStartX;
  if (Math.abs(dx) >= SLIDE_THRESHOLD) {
    if (dx < 0) tryAdvanceNext();    // 向左滑 → 下一个场景
    else tryAdvancePrev();            // 向右滑 → 上一个场景
  }
  // ... 原有 drag 释放逻辑不变 ...
}
```

**e) 键盘 ← →（onMounted 注册）：**
```ts
onMounted(() => {
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") tryAdvanceNext();
    else if (e.key === "ArrowLeft") tryAdvancePrev();
  });
});
```

**f) L2 introHint watcher：**
```ts
watch(scene, (s, old) => {
  if (s && s.id !== old?.id) {
    reset();
    if (s.introHint) showToast(s.introHint, "top", 3000);
  }
}, { immediate: false });
```

**g) L1 新手引导挂载：**
```ts
const showGuide = ref(false);
onMounted(() => {
  if (typeof localStorage !== "undefined" && !localStorage.getItem("jianghu_tutorial_done")) {
    showGuide.value = true;
  }
});
```

**h) template 里改：**
- 替换原有 `road-sign` 为左右箭头：
```html
<button v-if="prevScene" class="st-arrow st-arrow-prev" @click="tryAdvancePrev" aria-label="上一场景">‹</button>
<button v-if="nextScene" class="st-arrow st-arrow-next" @click="tryAdvanceNext" aria-label="下一场景">›</button>
```
- SceneToast 挂载（订阅 useGame 导出的 toast ref）：
```html
<SceneToast v-if="toast" :text="toast.text" :position="toast.position" :duration="toast.duration" @close="toast = null" />
```
- GuideOverlay 挂载：
```html
<GuideOverlay v-if="showGuide" @done="showGuide = false" />
```
- 传 flags 给 InteractPoint（用于 SceneProp 浇水状态）：
```html
<InteractPoint
  v-if="inVisibleRange(camera, 0.2, sectionIndex(p.x, worldWidth, NUM), NUM, worldWidth)"
  :key="p.id"
  :style="{ zIndex: elemZ(p.z, p.y) }"
  :point="p"
  :flags="flags"
  @click-p="onPoint"
/>
```

**i) style 追加箭头：**
```css
.st-arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 40px; height: 64px;
  background: rgba(10, 6, 3, 0.45); color: #f2ecd8;
  border: 1px solid rgba(224, 190, 120, 0.5); border-radius: 4px;
  font-size: 32px; line-height: 60px; cursor: pointer;
  z-index: 20; pointer-events: auto;
  transition: background 0.2s;
}
.st-arrow:hover { background: rgba(10, 6, 3, 0.75); }
.st-arrow-prev { left: 8px; }
.st-arrow-next { right: 8px; }
```

**j) 删除旧的 `road-sign` 块和对应 style**（已被箭头取代）。

- [ ] **Step 3: 类型检查**

Run: `cd e:\code\jianghu-client\shells\h5; npx tsc --noEmit`
Expected: 无 TS 错。

- [ ] **Step 4: 单测回归**

Run: `cd e:\code\jianghu-client\shells\h5; npx vitest run`
Expected: 全绿。

- [ ] **Step 5: 提交**

```bash
git add jianghu-client/shells/h5/src/components/SceneView.vue
git commit -m "feat(h5): SceneView 场景切换全集成（箭头/滑动/键盘/门禁/toast/guide）"
```

---

### Task 9: northward.ts 数据接入 + 物件 src

**Files:**
- Modify: `e:\code\jianghu-client\content\src\northward.ts`

- [ ] **Step 1: 加 scene 级四个字段**

```diff
 // wudai
 export const wudai: Scene = {
   id: "wudai",
+  index: 1,
   name: "松花江渡口",
+  requiredFlags: ["saw_notice"],
+  unlockHint: "先去看看渡口那张告示牌",
+  introHint: "松花江渡口 — 先看看告示牌和老船家吧",
   bg: "riverside",
   ...
 };

 // longtan
 export const longtan: Scene = {
   id: "longtan",
+  index: 2,
   name: "龙潭山",
+  requiredFlags: ["got_fruit"],
+  unlockHint: "去松树下找找办法，把赤果寻回",
+  introHint: "龙潭山 — 先去潭边掬一捧水，再到松根处看看",
   bg: "mountain",
   ...
 };
```

- [ ] **Step 2: 给五个 InteractPoint 加 src（先留空等素材生成后填）**

```diff
 // notice
 { id: "notice", x: 0.5, y: 0.34, icon: "告", shape: "notice",
+  src: "/assets/props/prop_notice.png", size: 72, z: 10,
   on: [ ... ] },

 // barrel / jar
 { id: "barrel", x: 0.2, y: 0.66, icon: "坛", shape: "jar",
+  src: "/assets/props/prop_jar.png", size: 64, z: 50,
   on: [ ... ] },

 // boat
 { id: "boat", x: 0.76, y: 0.62, icon: "船", shape: "boat",
+  src: "/assets/props/prop_boat.png", size: 104, z: 40,
   on: [ ... ] },

 // tarn
 { id: "tan", x: 0.3, y: 0.5, icon: "潭", shape: "tarn",
+  src: "/assets/props/prop_tarn.png", size: 96, z: 30,
   on: [ ... ] },

 // pine（浇完水后仍走 CSS，src 可选）
 { id: "pine", x: 0.55, y: 0.24, icon: "松", shape: "pine",
+  size: 80, z: 15,
   on: [ ... ] },

 // pine_root（同上）
 { id: "pine_root", x: 0.55, y: 0.24, icon: "松", shape: "pine",
+  size: 80, z: 15,
   on: [ ... ] },
```

- [ ] **Step 3: content-lint 回归**

Run: `cd e:\code\jianghu-client\content; npx vitest run`
Expected: 绿（content-lint 不校验新字段）。

- [ ] **Step 4: 提交**

```bash
git add jianghu-client/content/src/northward.ts
git commit -m "feat(content): northward.ts 接入 index/requiredFlags/unlockHint/introHint + 物件 src"
```

---

### Task 10: 美术素材生成

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\public\assets\scenes\wudai_far.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\scenes\wudai_mount.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\scenes\longtan_far.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\scenes\longtan_mount.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\props\prop_jar.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\props\prop_boat.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\props\prop_notice.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\props\prop_tarn.png`
- Create: `e:\code\jianghu-client\shells\h5\public\assets\props\prop_pine_wet.png`（可选）

- [ ] **Step 1: 生成 4 张背景分层 PNG（2048×1152，治愈系国风插画）**

用 GenerateImage tool，逐张生成：

Prompt 模板：
> 游戏背景图，{描述要点}，治愈系国风插画风格，柔和平涂，低饱和暖色调（米黄/淡青/浅粉/赭石），柔化轮廓，轻雾氛围，纯风景，无人物，无建筑，无文字，无水印，16:9 宽幅构图

| 文件 | 具体 prompt |
|------|------------|
| wudai_far.png | 远景层，淡墨远山横卧天际，江面晨雾飘渺，远处一叶扁舟剪影极小，整体宁静辽阔 |
| wudai_mount.png | 中景层，近处土坡，芦苇荡，半埋的酒坛轮廓，木栈桥伸向江里，江畔枯树，层次感分明 |
| longtan_far.png | 远景层，层峦叠嶂的山脉，山顶云雾缭绕，松枝剪影突出，山谷幽深 |
| longtan_mount.png | 中景层，山间石阶蜿蜒，古寺飞檐一角隐约可见，幽潭水面青碧反光，斜松倚崖 |

- [ ] **Step 2: 生成 5 张物件透明 PNG（256×256，中心对齐，四周留呼吸空间）**

Prompt 模板：
> 游戏物件图标，{描述要点}，治愈系国风插画风格，低饱和暖色调，柔化轮廓，中心对齐，四周留呼吸空间，256×256 透明背景 PNG

| 文件 | 具体 prompt |
|------|------------|
| prop_jar.png | 青瓷酒坛，泥封瓶口，表面附着点点潮苔，古朴质感 |
| prop_boat.png | 乌篷小船，船家侧影，木橹，江南水乡质感 |
| prop_notice.png | 木柱上的告示牌，墨迹新印，红色印章，古朴木纹 |
| prop_tarn.png | 幽深水潭，青碧水面反光，四周寒雾朦胧 |
| prop_pine_wet.png | 湿润的松树根，泥土微湿，针叶带有光泽 |

- [ ] **Step 3: 验证替换效果**

Run: `cd e:\code\jianghu-client\shells\h5; npm run dev`
Expected: localhost:5173 打开，分层视差图换成新生成的 PNG，物件也换成透明 PNG。

- [ ] **Step 4: 全量回归 + 构建**

```bash
cd e:\code\jianghu-client\core; npx vitest run; npm run build
cd e:\code\jianghu-client\content; npx vitest run
cd e:\code\jianghu-client\shells\h5; npx vitest run; npx tsc --noEmit; npm run build
```
Expected: 全绿。

- [ ] **Step 5: 提交素材 + 构建产物**

```bash
git add -A jianghu-client
git commit -m "feat(h5): 替换 4 张治愈系国风分层背景 + 5 张物件 PNG，全量回归通过"
```

---

### Task 11: 冒烟验收清单

- [ ] 桌面端：← → 键盘切换场景流畅
- [ ] 桌面端：点击左右箭头按钮切换
- [ ] 移动端/触屏：向左滑 → 下一场景；向右滑 → 上一场景
- [ ] wudai 未看告示牌时切换到 longtan → 弹 unlockHint
- [ ] 看完告示牌后切换 → 正常切场 + 播 longtan entry 剧情 + 顶栏 introHint toast
- [ ] 浇完松根拿赤果后 pine SVG 出现 CSS filter 湿润效果（亮度降/饱和升）
- [ ] 首次打开（清 localStorage）→ 半透明遮罩 + 高亮圈 + 气泡，走完 3 步或点跳过 → 设置 done
- [ ] 再次打开 → 引导不出现
- [ ] 剧情内 goto（船家对话选北上）→ 同样过门禁
- [ ] 分层背景 PNG 视差错速正常
- [ ] 物件透明 PNG 显示正常，Y 轴遮挡底部在前
- [ ] 全量单测：core 27+、content、h5 全部通过
- [ ] tsc --noEmit：无类型错

---

## 自检

**1. Spec 覆盖：**
- Scene DSL 增量 → T1 ✓
- Engine 门禁钩子 → T2 ✓
- canAdvance + 数组化 → T3 ✓
- useGame 接入 + 注入 gate + flags/toast → T4 ✓
- SceneToast 组件 → T5 ✓
- GuideOverlay → T6 ✓
- SceneProp 浇水状态 → T7 ✓
- SceneView 全集成（箭头/滑动/键盘/门禁/toast/guide）→ T8 ✓
- northward.ts 数据接入 → T9 ✓
- 美术素材 → T10 ✓
- 冒烟验收 → T11 ✓

**2. Placeholder scan：** 无 TBD/TODO，所有代码段完整。物件 src 先指向最终路径（素材生成后自动生效），无需二次改 northward.ts。

**3. 类型一致性：**
- canAdvance 签名 `(scene: Scene, flags: Record<string, boolean>)` ↔ Engine.state.flags 类型 ✓
- Engine opts.canAdvance 签名 `(current: Scene, next: Scene) => boolean` ↔ canAdvance(scene, flags) 两参 ✓
- SceneView.tryAdvanceNext 先 canAdvance → 再 gotoScene → Engine 内部再 canAdvance（双重，但无害，第二次快速返回，第一次已触发 unlockHint）。可接受。
- Scene 新字段在 Task 1 已加到 core/dist，Task 9 content 改动不会报类型错 ✓
- InteractPoint.flags prop → SceneProp.flags prop 传递链 ✓
