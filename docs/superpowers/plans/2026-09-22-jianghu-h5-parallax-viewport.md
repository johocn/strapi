# H5 视差卷轴视口（Parallax Viewport）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 H5 场景从「固定单屏」升级为「横向视差卷轴」：玩家左右拖动/按按钮平移相机，远景/中景/近景按不同系数错位移动形成视差，交互点仍在 DOM 上随相机平移并保留点击拾取。

**Architecture:** 视觉增强全部落在 `SceneView` 渲染层。核心 `Engine`/dsl **不改 run 逻辑**，仅两个可选字段：`Scene.worldWidth`（场景横轴跨度，单位=视口倍数，缺省 1 即单屏）与 `Scene.layers`（视差层数组）。SceneView 内做 `transform: translateX(-cameraOffset)`，各层按 `depth` 系数乘以 offset 错位；交互点保留 DOM 定位，命中仍走现有 `@click` → `triggerPoint`。新增一个 `useViewport` composable 管理相机 offset（拖拽 + 边界 clamp）。懒加载**砍掉**（初版整场景常驻）。

**Tech Stack:** Vue3 + Vite + TS strict，复用现有 H5 壳与 `@core` 别名；纯 CSS transform 动画，零新依赖。

**项目位置:**
- core dsl: `e:\code\jianghu-client\core\src\dsl\types.ts`
- h5: `e:\code\jianghu-client\shells\h5\`

---

## 文件结构

```
e:\code\jianghu-client\
├─ core\
│  └─ src\dsl\types.ts                 # 改：Scene 加 layers? / worldWidth?
│  └─ tests\dsl-scene-ext.test.ts      # 新：类型层面 scene 扩展可用性（弱断言）
├─ content\
│  └─ src\northward.ts                 # 改：wudai/longtan 补 layers 与 worldWidth
├─ shells\h5\
│  └─ src\composables\useViewport.ts   # 新：相机 offset（拖拽+clamp+reset）
│  └─ src\components\SceneView.vue     # 改：渲染层分层 + 相机平移 + 视差
│  └─ src\components\SceneLayer.vue    # 新：单个视差层（depth 系数位移）
```

**恒定类型契约：**

```ts
// core/src/dsl/types.ts 追加
export interface SceneLayer {
  id: string;
  depth: number;          // 视差系数：0=钉在视口(远景)、0.4=中景、1=与场景同步(近景/交互层)
  kind?: "gradient" | "image";  // 初版仅 gradient；image 预留
  css: string;            // 该层背景样式（background 简写或 background-image 等）
  height?: number;        // 可选：层占视口高度比例，默认 1
}

export interface Scene {
  // …现有字段不变…
  worldWidth?: number;    // 横轴跨度（视口倍数），缺省 1 是单屏
  layers?: SceneLayer[];  // 视差层；缺省无
}
```

`useViewport` 状态：`const camera = ref(0)`；`maxOffset` = `(worldWidth??1) - 1`，clamp 到 `[0, maxOffset]`。场景切换时 reset 到 0。

**交叉一致性提醒（勿改名）：** `SceneView` 用 `worldWidth`、`layers`；新组件 `SceneLayer` 的 prop 名用 `layer`/`depth`/`height`；`useViewport` 暴露 `{ camera, onDrag, onDragEnd, moveBy }`。

---

## Task 1: core dsl —— Scene 扩展视差字段

**Files:**
- Modify: `e:\code\jianghu-client\core\src\dsl\types.ts`
- Test: `e:\code\jianghu-client\core\tests\dsl-scene-ext.test.ts`

- [ ] **Step 1: 写失败测试（dsl-scene-ext.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import type { Scene, SceneLayer } from "../src/dsl/types";

describe("scene 扩展字段（世界宽度 + 视差层）", () => {
  const layer: SceneLayer = { id: "far", depth: 0.2, css: "linear-gradient(#999,#333)" };
  const scene: Scene = {
    id: "wudai", name: "渡口", bg: "riverside", fx: "晨雾",
    worldWidth: 2.5,
    layers: [layer],
    points: [],
    entry: [{ t: "narration", text: "x" }],
  };

  it("Scene 可选携带 worldWidth 与 layers", () => {
    expect(scene.worldWidth).toBe(2.5);
    expect(scene.layers?.[0]?.depth).toBe(0.2);
  });

  it("下沿兼容：无世界宽度时仍视作单屏语义", () => {
    const plain: Scene = { id: "a", name: "b", bg: "c", points: [], entry: [] };
    expect(plain.worldWidth ?? 1).toBe(1);
    expect(plain.layers ?? []).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run（`core` 下）: `npx vitest run tests/dsl-scene-ext.test.ts`
Expected: FAIL（`SceneLayer` 类型不存在 / `Scene.worldWidth` 不存在，TS 编译错）。

- [ ] **Step 3: 实现（types.ts 追加如下，不改现有字段）**

在文件顶部定义 `SceneLayer` 接口，并在 `Scene` 接口内追加字段：

```ts
export interface SceneLayer {
  id: string;
  depth: number;
  kind?: "gradient" | "image";
  css: string;
  height?: number;
}
```

`Scene` 接口在 `points`/`entry` 附近追加：

```ts
export interface Scene {
  id: string;
  name: string;
  bg: string;
  fx?: string;
  worldWidth?: number;   // 横轴跨度（视口倍数），缺省 1=单屏
  layers?: SceneLayer[]; // 视差层
  points: InteractPoint[];
  entry: Behavior[];
}
```

- [ ] **Step 4: 运行 core 全量测试**

Run（`core` 下）: `npx vitest run`
Expected: 全 PASS（新增 2 it + 既有 21 it）。

- [ ] **Step 5: `npx tsc --noEmit -p tsconfig.json`** → 退出码 0。

- [ ] **Step 6: Commit**

```bash
cd e:/code; git add e:/code/jianghu-client/core; git commit -m "feat(core): Scene 扩展 worldWidth/layers 视差字段"
```

---

## Task 2: content —— 为北上两景补视差层与横轴宽度

**Files:**
- Modify: `e:\code\jianghu-client\content\src\northward.ts`

> 为 `wudai` / `longtan` 各加 `worldWidth`（渡口 2、龙潭山 3——龙潭山更宽阔）与 `layers`（far 远景 0.18、mid 中景 0.45）。CSS 用径向/线性渐变模拟山水山雾，不需要图片素材，符合零依赖。

- [ ] **Step 1: 为 `wudai` 场景对象追加字段**（在 `entry` 前插入 `worldWidth` 与 `layers`）

把 `export const wudai: Scene = {` 之后、`points: [` 之前，插入（保持缩进一致，逗号衔接）。场景 1 `wudai` 插入：

```ts
  worldWidth: 2,
  layers: [
    { id: "far", depth: 0.18, kind: "gradient", css: "radial-gradient(circle at 70% 28%, rgba(210,225,235,0.55), rgba(120,150,175,0.35) 45%, rgba(48,72,95,0.1) 80%), linear-gradient(180deg, #2c4458 0%, #1b2a3a 100%)" },
    { id: "mid", depth: 0.45, kind: "gradient", css: "linear-gradient(180deg, #3a5a72 0%, #223850 55%, rgba(34,56,80,0) 100%)" },
  ],
```

场景 2 `longtan` 插入：

```ts
  worldWidth: 3,
  layers: [
    { id: "far", depth: 0.15, kind: "gradient", css: "radial-gradient(circle at 50% 22%, rgba(196,218,208,0.5), rgba(96,128,118,0.3) 50%, rgba(30,50,44,0.08) 85%), linear-gradient(180deg, #24403a 0%, #16291f 100%)" },
    { id: "mid", depth: 0.4, kind: "gradient", css: "linear-gradient(180deg, #2e4e42 0%, #1c3329 60%, rgba(28,51,41,0) 100%)" },
  ],
```

- [ ] **Step 2: 运行 content lint + tsc**

Run（`content` 下）: `npx vitest run`
Expected: 3 PASS（lint 不校验 layers/worldWidth，正常）。

Run（`content` 下）: `npx tsc --noEmit -p tsconfig.json` → 退出码 0。

- [ ] **Step 3: Commit**

```bash
cd e:/code; git add e:/code/jianghu-client/content; git commit -m "feat(content): 北上两景补视差层与横轴宽度"
```

---

## Task 3: h5 —— useViewport 相机 composable

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\composables\useViewport.ts`
- Test: `e:\code\jianghu-client\shells\h5\src\composables\useViewport.test.ts`

- [ ] **Step 1: 写失败测试（useViewport.test.ts）**

```ts
import { describe, it, expect } from "vitest";
import { useViewport } from "./useViewport";

describe("useViewport 相机", () => {
  it("初始 camera 为 0，maxOffset = worldWidth-1", () => {
    const v = useViewport(2);
    expect(v.camera.value).toBe(0);
    expect(v.maxOffset).toBe(1);
  });

  it("moveBy clamp 在 [0, maxOffset]", () => {
    const v = useViewport(2);
    v.moveBy(-2);        // 期望右移但触底 1
    expect(v.camera.value).toBe(1);
    v.moveBy(3);
    expect(v.camera.value).toBe(0);
  });

  it("onDrag 累加速度并 clamp", () => {
    const v = useViewport(3);
    v.onDrag(-40); // 手指左滑(负)→图上右移
    expect(v.camera.value).toBeCloseTo(40 / 100);
    v.onDrag(500);
    expect(v.camera.value).toBe(0);
  });

  it("reset 归零", () => {
    const v = useViewport(2);
    v.moveBy(-2);
    v.reset();
    expect(v.camera.value).toBe(0);
  });
});
```

> 设计口径：`camera` 单位 =「视口倍数」，范围 `[0, maxOffset]`，`maxOffset = worldWidth - 1`（worldWidth<1 时取 0）。拖拽用 `camera += deltaX / viewportPx`；测试里把 viewport 宽约定为 100px（下面实现把 `pixelPerUnit` 设固定可注入）。

- [ ] **Step 2: 运行确认失败**

Run（`h5` 下）: `npx vitest run src/composables/useViewport.test.ts`
Expected: FAIL（`useViewport` 不存在）。

- [ ] **Step 3: 实现（useViewport.ts）**

```ts
import { ref } from "vue";

export interface ViewportApi {
  camera: { value: number };
  readonly maxOffset: number;
  onDrag(deltaX: number): void;
  reset(): void;
  moveBy(delta: number): void;
}

/** 横向视差相机的核心状态；camera 单位=视口倍数，clamp 到 [0, maxOffset] */
export function useViewport(worldWidth: number, pixelPerUnit = 100): ViewportApi {
  const camera = ref(0);
  const safeW = worldWidth > 0 ? worldWidth : 1;
  const maxOffset = Math.max(0, safeW - 1);

  function clamp(v: number): number {
    return Math.min(maxOffset, Math.max(0, v));
  }
  function moveBy(delta: number): void {
    camera.value = clamp(camera.value + delta);
  }
  function onDrag(deltaX: number): void {
    moveBy(deltaX / pixelPerUnit);
  }
  function reset(): void {
    camera.value = 0;
  }

  return { camera, maxOffset, onDrag, reset, moveBy };
}
```

> 测试用注入了 `useViewport(2)` 时默认 `pixelPerUnit=100`，`moveBy` 直接以视口倍数计；`onDrag(-40/-100 = -0.4)`。与测试断言吻合。

- [ ] **Step 4: 运行 h5 相关测试**

Run（`h5` 下）: `npx vitest run src/composables/useViewport.test.ts`
Expected: 4 PASS。

- [ ] **Step 5: `npx tsc --noEmit -p tsconfig.json`** → 退出码 0。

- [ ] **Step 6: Commit**

```bash
cd e:/code; git add e:/code/jianghu-client/shells/h5; git commit -m "feat(h5): useViewport 视差相机状态（拖拽+clamp）"
```

---

## Task 4: h5 —— SceneLayer 视差层组件 + SceneView 卷轴改造

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\components\SceneLayer.vue`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneView.vue`

- [ ] **Step 1: 新建 SceneLayer.vue**

```vue
<script setup lang="ts">
import type { SceneLayer } from "@core";
withDefaults(defineProps<{ layer: SceneLayer; height?: number }>(), { height: 1 });
</script>

<template>
  <div
    class="scene-layer"
    :style="{
      background: layer.css,
      height: (height * 100) + '%',
      willChange: 'transform',
    }"
  ></div>
</template>

<style scoped>
.scene-layer {
  position: absolute;
  left: 0; right: 0; top: 0;
  pointer-events: none;
}
</style>
```

> 注意：`@core` 已含新增的 `SceneLayer` 类型（Task 1 提交后 h5 别名生效）。

- [ ] **Step 2: 改写 SceneView.vue 为视差卷轴结构**

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../engine/useGame";
import SceneBg from "./SceneBg.vue";
import AmbientFx from "./AmbientFx.vue";
import InteractPoint from "./InteractPoint.vue";
import SceneLayer from "./SceneLayer.vue";
import { useViewport } from "../composables/useViewport";

const { state, triggerPoint } = useGame();
const scene = computed(() => state.scene);
const worldWidth = computed(() => scene.value?.worldWidth ?? 1);
const layers = computed(() => scene.value?.layers ?? []);
const { camera, maxOffset, onDrag, reset } = useViewport(worldWidth.value);

// 场景切换时重置相机
const lastSceneId = ref<string | null>(null);
if (scene.value) lastSceneId.value = scene.value.id;
watch(scene, (s) => {
  if (s && s.id !== lastSceneId.value) reset();
});

const dragStart = ref(0);
function onPointerDown(e: PointerEvent): void {
  dragStart.value = e.clientX;
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
}
function onPointerMove(e: PointerEvent): void {
  if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) {
    onDrag(e.clientX - dragStart.value);
    dragStart.value = e.clientX;
  }
}
function onPointerUp(): void {
  dragStart.value = 0;
}
</script>

<template>
  <div
    v-if="scene"
    class="scene-view"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <SceneLayer
      v-for="layer in layers"
      :key="layer.id"
      :layer="layer"
      :style="{ transform: 'translateX(' + (camera * layer.depth * -100) + '%)' }"
    />
    <SceneBg :name="scene.name" :bg="scene.bg" />

    <div
      class="scene-world"
      :style="{ width: (worldWidth * 100) + '%', transform: 'translateX(' + (camera * -100) + '%)' }"
    >
      <InteractPoint
        v-for="p in scene.points"
        :key="p.id"
        :point="p"
        @click-p="triggerPoint"
      />
    </div>

    <AmbientFx :kind="state.fx" />
    <div v-if="maxOffset > 0" class="viewport-hint">左右拖动查看 · {{ maxOffset + 1 }} 屏</div>
  </div>
</template>

<style scoped>
.scene-view {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
  touch-action: none; /* 接管手势，避免页面滚冲突 */
}
.scene-layer,
.scene-bg,
.scene-world { position: absolute; inset: 0; }
.scene-world { pointer-events: none; }
.scene-world :deep(.interact-point) { pointer-events: auto; }
.viewport-hint {
  position: absolute; bottom: 10px; right: 12px;
  font-size: 11px; color: rgba(255,255,255,0.7);
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  pointer-events: none;
}
</style>
```

> 实现要点：SceneLayer/SceneBg 铺满视口(`inset:0`)，各层按 `camera*100%` 平移；interact 层放进 `.scene-world`（宽 = `worldWidth*100%`），随 `camera` 平移，`pointer-events:none` 层容器 + 子按钮 `auto` 保证点击可命中。`useViewport(worldWidth.value)` 用初始宽构造（横轴宽度短时恒定，场景阔度在 content 已定，运行时不变）。

请在 `<script setup>` 顶部补 `import { watch } from "vue";`（Step 2 是 `<script setup>` 引用 watch，需 import）。若 `reset` 未用到可在 watch 回调里 `camera.value = 0` 代替 `reset()` 以规避 noUnusedLocals——但 plan 声明 `reset` 暴露，保留并在 watch 使用它。

- [ ] **Step 3: 类型校验 + 现有测试**

Run（`h5` 下）: `npx tsc --noEmit -p tsconfig.json` → 退出码 0。
Run（`h5` 下）: `npx vitest run` → binding 4 + viewport 4 = 8 PASS。

- [ ] **Step 4: 构建**

Run（`h5` 下）: `npm run build` → 生成 dist 无报错。

- [ ] **Step 5: 手测冒烟（开发自检）**

Run（`h5` 下）: `npm run dev`，浏览器 http://localhost:5173：
- 渡口：应见远景/中景渐变错位，左右拖动场景横向移动、远近两层位移差明显；
- 交互点（坛/告/船）随场景一起平移，点击仍可触发剧情；
- 选「递上酒水→随船北上」切到龙潭山后，相机归零、背景切换到龙潭山配色。

- [ ] **Step 6: Commit**

```bash
cd e:/code; git add e:/code/jianghu-client/shells/h5; git commit -m "feat(h5): SceneView 视差卷轴 + SceneLayer 分层渲染"
```

---

## 自审清单

- **DRY/YAGNI**：懒加载砍掉，初版整场景常驻；`kind:"image"` 仅类型预留不实现。
- **类型一致**：`SceneLayer.depth/css/height/kind`、`Scene.worldWidth` 在 Task 1 定义，Task 2/4 同名复用。
- **零新依赖**：纯 CSS transform + 现有 vue，无新增 package。
- **不破坏 core run 逻辑**：dsl 只有可选字段，现有单屏 Scene（无 worldWidth/layers）行为降级为 `worldWidth=1`、无 layers，等价原版。
- **spec 对照**：方案 A 纯 TS 引擎 + H5 壳、可扩展性（新场景只加数据）保持一致；此计划不改 setDefault。