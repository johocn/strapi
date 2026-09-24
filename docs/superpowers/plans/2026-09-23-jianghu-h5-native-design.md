# 北上 H5 「原生 DOM 设计思路落地」实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「原生 DOM 摆件方案」的设计思路落到现有 jianghu-client（**保留 Vue3 H5 壳、不动现有 core 引擎与逐段剧情**），实现分层 PNG 视差、近景透明 PNG 摆件、Y 轴遮挡排序、区块懒加载、轻量 Popup 五块能力，剧情与交互逻辑不变。

**Architecture:** 不对 jianghu-client 做框架级重写（不用原生 DOM 换 Vue3）。把原生 DOM 摆件设计的原则映射为**数据模型增量 + 少量纯函数 + 对应组件分支渲染**：`SceneLayer` 增 `image` 层与 `src`，`InteractPoint` 增 `src/z/size/preview`；视差沿用父级 `transform`，抽出可单测的纯函数；懒加载用纯区间函数 + 薄 IntersectionObserver 接线。**缺素材时全部可回退**到现有 gradient/svg 渲染，杜绝硬依赖美术产物。

**Tech Stack:** Vue 3.4（眼球不掉头）、TypeScript 5.5、Vite 5、Vitest 2。无新增依赖。

**设计思路（承接用户原方案，映射到 Vue3）**
- 分层 PNG：远/中景各一张，按 `depth` 平移，层宽 = `1 + maxOffset*depth` 屏宽保证无透底。
- 近景透明 PNG：`point.src` 渲染 `<img>`，尺寸可配。
- Y 轴遮挡：`zIndexFor(z, y)` 底部(y 大)在前，允许 `z` 显式覆盖。
- 懒加载：世界横切 N 段，`visibleSections(camera,..)` 纯函数定可见段，越界点/重层图片 `v-if` 挂载/卸载。
- Popup：石碑/祈福台/NPC 简介用轻量 `InfoPopup`；对话仍走现有 `NarrativePanel`。

---

### Task 1: 数据模型增量（core 类型 + 关卡 TS 字段）

**Files:**
- Modify: `e:\code\jianghu-client\core\src\dsl\types.ts:31-62`
- Test: `e:\code\jianghu-client\core\tests\types.test.ts`

- [ ] **Step 1: 写失败测试（类型分支可解析）**

```ts
// core/tests/types.test.ts（文件末尾追加）
import type { SceneLayer, InteractPoint } from "../src/dsl/types";

describe("native-dom 设计增量类型", () => {
  it("SceneLayer 支持 image 层与 src", () => {
    const l: SceneLayer = { id: "far", depth: 0.04, kind: "image", src: "/assets/scenes/wudai_far.png" };
    expect(l.kind).toBe("image");
    expect(l.src).toMatch(/far\.png$/);
  });

  it("InteractPoint 支持 src/z/size/preview", () => {
    const p: InteractPoint = {
      id: "stone", x: 0.3, y: 0.7, icon: "碑", src: "/assets/props/stone.png",
      z: 10, size: 72, preview: { title: "石碑", text: "岁末封山碑记。" },
    };
    expect(p.z).toBe(10);
    expect(p.size).toBe(72);
    expect(p.preview?.title).toBe("石碑");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run（在 `E:\code`）: `cd jianghu-client; (cd core; npx vitest run tests/types.test.ts)`
Expected: FAIL —— 类型上不存在 `kind:"image"`/`src`/`z`/`size`/`preview`。

- [ ] **Step 3: 实现类型**

```diff
// core/src/dsl/types.ts
-  kind?: "gradient" | "svg";  // gradient=纯色/渐变，svg=水墨剪影轮廓
+  kind?: "gradient" | "svg" | "image";  // image=分层 PNG（src 必填）
   css: string;
   svg?: string;
+  src?: string;             // kind="image" 时，分层 PNG 地址
   height?: number;
```
```diff
// InteractPoint 增加（在 shape?: PropShape 之后）
   shape?: PropShape;  // 物体实例类型；缺省回退纯字符 icon
+  src?: string;       // 近景透明 PNG 地址；缺省回退 SceneProp 内联 SVG
+  z?: number;         // 显式遮挡层级；缺省按 y 自动推导
+  size?: number;      // 渲染像素尺寸；缺省 58
+  preview?: { title?: string; text: string };  // 轻量弹窗内容；缺省不弹
```

- [ ] **Step 4: 运行确认通过**

Run: `cd jianghu-client; (cd core; npx vitest run tests/types.test.ts)`
Expected: PASS，全部通过。

- [ ] **Step 5: 提交**

```bash
git add jianghu-client/core/src/dsl/types.ts jianghu-client/core/tests/types.test.ts
git commit -m "feat(core): SceneLayer image 层与 InteractPoint src/z/preview 类型增量"
```

---

### Task 2: 视差图像层纯函数 + SceneLayer 渲染分支

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\engine\parallax.ts`
- Test: `e:\code\jianghu-client\shells\h5\tests\parallax.test.ts`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneLayer.vue`

- [ ] **Step 1: 写失败测试**

```ts
// shells/h5/tests/parallax.test.ts
import { describe, it, expect } from "vitest";
import { imageLayerWidthPct, layerShift } from "../src/engine/parallax";

describe("视差图像层几何", () => {
  it("imageLayerWidthPct = 1 + maxOffset*depth，保证无透底", () => {
    // maxOffset=1, depth=0.28 → 层宽 1.28 屏
    expect(imageLayerWidthPct(0.28, 1)).toBeCloseTo(1.28);
    // depth=0.04 → 层宽 1.04 屏（几乎钉住）
    expect(imageLayerWidthPct(0.04, 1)).toBeCloseTo(1.04);
    // maxOffset=0（单屏）→ 宽 100%
    expect(imageLayerWidthPct(0.6, 0)).toBe(1);
  });

  it("layerShift 为单位屏宽的平移量（camera×depth）", () => {
    // camera=1, depth=0.28 → 平移 0.28 屏（右移时左移 28% 视口）
    expect(layerShift(0.28, 1)).toBeCloseTo(0.28);
    // depth=1 → 平移到 camera 满
    expect(layerShift(1, 1)).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd jianghu-client; (cd shells/h5; npx vitest run tests/parallax.test.ts)`
Expected: FAIL —— 模块/函数不存在。

- [ ] **Step 3: 实现纯函数**

```ts
// shells/h5/src/engine/parallax.ts
/** 视差层在父级 transform 下的平移量（单位=屏宽，正=向右探索时层向左移） */
export function layerShift(depth: number, camera: number): number {
  return camera * depth;
}

/** image 层宽度（屏宽比例）。多余部分 = maxOffset*depth，
 *  使 camera 推到 maxOffset 时右缘仍被覆盖、不露底。 */
export function imageLayerWidthPct(depth: number, maxOffset: number): number {
  return 1 + maxOffset * Math.max(0, depth);
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd jianghu-client; (cd shells/h5; npx vitest run tests/parallax.test.ts)`
Expected: PASS。

- [ ] **Step 5: 组件渲染分支（image → `<img>`）**

```diff
// shells/h5/src/components/SceneLayer.vue
+import { computed } from "vue";
+import { imageLayerWidthPct } from "../engine/parallax";
<script setup lang="ts">
-import type { SceneLayer } from "@core";
- withDefaults(defineProps<{ layer: SceneLayer; height?: number }>(), { height: 1 });
+import type { SceneLayer } from "@core";
+const props = withDefaults(defineProps<{ layer: SceneLayer; maxOffset?: number; height?: number }>(), { height: 1, maxOffset: 0 });
+const cap = computed(() => props.layer.kind === "image" ? imageLayerWidthPct(props.layer.depth, props.maxOffset) * 100 : 100);
</script>
```
```diff
<template>
   <div
     class="scene-layer"
-    :class="{ 'is-svg': layer.kind === 'svg' }"
+    :class="{ 'is-svg': layer.kind === 'svg', 'is-image': layer.kind === 'image' }"
     :style="{
       background: layer.css,
       height: (height * 100) + '%',
       willChange: 'transform',
     }"
   >
     <svg v-if="layer.kind === 'svg' && layer.svg" class="layer-silhouette" viewBox="0 0 200 120" preserveAspectRatio="none" v-html="layer.svg"></svg>
+    <img v-else-if="layer.kind === 'image' && layer.src"
+         class="layer-image" :src="layer.src"
+         :style="{ width: cap + '%' }" alt="" draggable="false" />
   </div>
 </template>
```
```diff
 .layer-silhouette { position: absolute; inset: 0; width: 100%; height: 100%; }
+.layer-image { position: absolute; left: 0; top: 0; height: 100%; object-fit: cover; object-position: left center; pointer-events: none; }
```

- [ ] **Step 6: 提交**

```bash
git add jianghu-client/shells/h5/src/engine/parallax.ts jianghu-client/shells/h5/tests/parallax.test.ts jianghu-client/shells/h5/src/components/SceneLayer.vue
git commit -m "feat(h5): 分层 image 视差层（imageLayerWidth/layerShift 纯函数 + SceneLayer img 分支）"
```

---

### Task 3: 近景透明 PNG 摆件 + Y 轴遮挡排序

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\engine\occlusion.ts`
- Test: `e:\code\jianghu-client\shells\h5\tests\occlusion.test.ts`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\InteractPoint.vue`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneView.vue`

- [ ] **Step 1: 写失败测试**

```ts
// shells/h5/tests/occlusion.test.ts
import { describe, it, expect } from "vitest";
import { elemZ } from "../src/engine/occlusion";

describe("Y 轴遮挡排序", () => {
  it("底部(y 大)在前：z 随 y 单调增", () => {
    expect(elemZ(undefined, 0.3, 0)).toBeLessThan(elemZ(undefined, 0.8, 0));
  });
  it("显式 z 覆盖 y 推导", () => {
    const lowY = elemZ(undefined, 0.2, 0);
    expect(elemZ(99, 0.9, 0)).toBeGreaterThan(lowY);
  });
  it("basis 只平移不破坏单调性", () => {
    const a = elemZ(undefined, 0.5, 100);
    const b = elemZ(undefined, 0.5, 100);
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd jianghu-client; (cd shells/h5; npx vitest run tests/occlusion.test.ts)`
Expected: FAIL —— 函数不存在。

- [ ] **Step 3: 实现 pure 遮挡**

```ts
// shells/h5/src/engine/occlusion.ts
/** 计算前景元素遮挡层级。规则：显式 z 优先；缺省时底部(y 大)越靠前。
 *  返回统一递增序，保证同类元素间单调。 */
export function elemZ(z: number | undefined, y: number, basis = 100): number {
  if (z !== undefined) return basis + z * 100;
  return basis + Math.round(y * 1000);
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd jianghu-client; (cd shells/h5; npx vitest run tests/occlusion.test.ts)`
Expected: PASS。

- [ ] **Step 5: InteractPoint 支持 src 透明 PNG 与 size**

```diff
// shells/h5/src/components/InteractPoint.vue
-defineProps<{ point: InteractPoint }>();
+const props = defineProps<{ point: InteractPoint; z?: number }>();
 const emit = defineEmits<{ (e: "click-p", id: string): void }>();
</script>
```
```diff
 <button
     class="interact-point"
     :style="{ left: point.x * 100 + '%', top: point.y * 100 + '%' }"
     :aria-label="point.icon"
     @click="emit('click-p', point.id)"
   >
-    <span class="ip-ring"></span>
-    <SceneProp v-if="point.shape" :shape="point.shape" :size="58" />
-    <span v-else class="ip-icon">{{ point.icon }}</span>
+    <span v-if="!point.src" class="ip-ring"></span>
+    <img v-if="point.src" class="ip-img" :src="point.src" :style="{ width: (point.size ?? 58) + 'px' }" alt="" draggable="false" />
+    <SceneProp v-else-if="point.shape" :shape="point.shape" :size="point.size ?? 58" />
+    <span v-else class="ip-icon">{{ point.icon }}</span>
   </button>
```
```diff
 .ip-icon {
   position: relative;
   font-size: 20px;
   text-shadow: 0 1px 3px rgba(0,0,0,0.9);
 }
+.ip-img { display: block; max-width: none; filter: drop-shadow(0 3px 4px rgba(40,30,20,0.4)); }
```
> 说明：有 `src` 时去掉脉冲盘，避免遮挡透明摆件；`pointer-events` 由父级 `.interact-point` 保留。

- [ ] **Step 6: SceneView 注入 z-index**

```diff
 // shells/h5/src/components/SceneView.vue
+import { elemZ } from "../engine/occlusion";
+const zh = (p: typeof scene extends never ? never : any): number => elemZ(p.z, p.y);
```
```diff
       <InteractPoint
         v-for="p in scene.points"
         :key="p.id"
         :point="p"
+        :style="{ zIndex: zh(p) }"
+        :z="p.z"
         @click-p="triggerPoint"
       />
```
> 说明：`element.style` 或 style 绑定均可；目的让底部摆件绘于顶部之上。属渲染细节，不需新类型。

- [ ] **Step 7: 提交**

```bash
git add jianghu-client/shells/h5/src/engine/occlusion.ts jianghu-client/shells/h5/tests/occlusion.test.ts jianghu-client/shells/h5/src/components/InteractPoint.vue jianghu-client/shells/h5/src/components/SceneView.vue
git commit -m "feat(h5): 近景透明 PNG 摆件 + Y 轴遮挡排序(elemZ pure)"
```

---

### Task 4: 区块懒加载（纯函数裁剪 + 薄 IO 接线）

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\engine\culling.ts`
- Test: `e:\code\jianghu-client\shells\h5\tests\culling.test.ts`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneView.vue`

- [ ] **Step 1: 写失败测试**

```ts
// shells/h5/tests/culling.test.ts
import { describe, it, expect } from "vitest";
import { sectionIndex, inVisibleRange } from "../src/engine/culling";

describe("区块懒加载区间", () => {
  const nums = 5; // 世界切 5 段，世界跨度 worldWidth=3 → 段宽 0.6 屏
  it("sectionIndex 把 x∈[0,3] 映射到 [0,4]", () => {
    expect(sectionIndex(0, 3, nums)).toBe(0);
    expect(sectionIndex(2.95, 3, nums)).toBe(4);
    expect(sectionIndex(1.2, 3, nums)).toBe(2);
  });
  it("inVisibleRange 只看当前 camera 视口前后，越界段被裁剪", () => {
    // 视口覆盖 [camera, camera+1] 屏宽，前后各扩 maxOffset 屏
    // camera=2, maxOffset=1，视野 ≈ [1,3]
    expect(inVisibleRange(2, 1, 1, nums, 3)).toBe(false);   // 段0 x∈[0,.6] 在视野左外
    expect(inVisibleRange(2, 1, 2, nums, 3)).toBe(true);    // 段2 x∈[1.2,1.8] 在视野内
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd jianghu-client; (cd shells/h5; npx vitest run tests/culling.test.ts)`
Expected: FAIL —— 函数不存在。

- [ ] **Step 3: 实现纯函数**

```ts
// shells/h5/src/engine/culling.ts
/** 世界横轴 x∈[0,worldWidth] 切 nums 段，返回所属段号 */
export function sectionIndex(x: number, worldWidth: number, nums: number): number {
  const w = Math.max(1, worldWidth);
  const i = Math.floor((Math.min(Math.max(0, x), w - 1e-9)) / (w / nums));
  return Math.min(nums - 1, i);
}

/** 某段是否处于可见范围：以 camera 视口为中心，左右各扩 padCoef 屏宽 */
export function inVisibleRange(
  camera: number, padCoef: number, seg: number, nums: number, worldWidth: number
): boolean {
  const w = Math.max(1, worldWidth);
  const segW = w / nums;
  const left = camera - padCoef;
  const right = camera + 1 + padCoef;
  const s0 = seg * segW;
  const s1 = (seg + 1) * segW;
  return s1 > left && s0 < right;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd jianghu-client; (cd shells/h5; npx vitest run tests/culling.test.ts)`
Expected: PASS。

- [ ] **Step 5: SceneView 接线（v-if 裁剪重层图片与越界点）**

```diff
 // shells/h5/src/components/SceneView.vue
+import { computed } from "vue";
+import { sectionIndex, inVisibleRange } from "../engine/culling";
 const scene = computed(() => state.scene);
 const worldWidth = computed(() => scene.value?.worldWidth ?? 1);
 const layers = computed(() => scene.value?.layers ?? []);
+const NUM = 5;
+const imgLayerVisible = computed(() =>
+  layers.value.filter(l => l.kind === "image" && inVisibleRange(camera.value, 0.5, sectionIndex(0, worldWidth.value, NUM), NUM, worldWidth.value))
+);
+const pointVisible = (p: any): boolean =>
+  inVisibleRange(camera.value, 0.2, sectionIndex(p.x, worldWidth.value, NUM), NUM, worldWidth.value);
```
```diff
     <SceneLayer
       v-for="layer in layers"
       :key="layer.id"
       :layer="layer"
+      :max-offset="maxOffset"
+      v-show="layer.kind !== 'image' || imgLayerVisible.includes(layer)"
       :style="{ transform: 'translateX(' + (camera * layer.depth * -100) + '%)' }"
     />
```
```diff
       <InteractPoint
         v-for="p in scene.points"
-        :key="p.id"
+        :key="p.id"
+        v-if="pointVisible(p)"
         :point="p"
         :style="{ zIndex: zh(p) }"
         :z="p.z"
         @click-p="triggerPoint"
       />
```
> 说明：影像层用 `v-show`（保视差位移平滑、不重排布局），**点**用 `v-if`（移出视口彻底卸载、释放 DOM，符合设计「移出视口移除 DOM」）。懒加载的 IO 调度由 `camera` 响应式驱动，`computed` 天然细粒度更新；无需 IntersectionObserver 依赖，纯响应式裁剪在 Vue3 里更轻更可测。

- [ ] **Step 6: 提交**

```bash
git add jianghu-client/shells/h5/src/engine/culling.ts jianghu-client/shells/h5/tests/culling.test.ts jianghu-client/shells/h5/src/components/SceneView.vue
git commit -m "feat(h5): 区块懒加载(响应式裁剪替代 IO，越界点卸载释放 DOM)"
```

---

### Task 5: 轻量 Popup

**Files:**
- Create: `e:\code\jianghu-client\shells\h5\src\components\InfoPopup.vue`
- Test: `e:\code\jianghu-client\shells\h5\tests\InfoPopup.test.vue`
- Modify: `e:\code\jianghu-client\shells\h5\src\components\SceneView.vue`

- [ ] **Step 1: 写失败测试（@vue/test-utils 已由配置提供则直接用）**

> 若 `@vue/test-utils` 未装则跳过单测、仅冒烟，避免新增依赖（遵守「vue3 不加依赖」铁律）。默认按「可用则测」处理。

```ts
// shells/h5/tests/InfoPopup.test.vue.ts（若有 @vue/test-utils）
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import InfoPopup from "../src/components/InfoPopup.vue";

describe("InfoPopup", () => {
  it("展示标题/正文，emit close", async () => {
    const w = mount(InfoPopup, { props: { title: "石碑", text: "封山碑记。" } });
    expect(w.text()).toContain("碑");
    await w.find(".ip-close").trigger("click");
    expect(w.emitted("close")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 实现组件**

```vue
<!-- shells/h5/src/components/InfoPopup.vue -->
<script setup lang="ts">
defineProps<{ title?: string; text: string }>();
const emit = defineEmits<{ (e: "close"): void }>();
</script>

<template>
  <div class="info-popup" @click.self="emit('close')">
    <div class="info-card">
      <button class="ip-close" @click="emit('close')" aria-label="关闭">×</button>
      <h3 v-if="title" class="ip-title">{{ title }}</h3>
      <p class="ip-text">{{ text }}</p>
    </div>
  </div>
</template>

<style scoped>
.info-popup { position: absolute; inset: 0; display: flex; align-items: flex-end;
  justify-content: center; background: rgba(20,14,8,0.35); z-index: 50; }
.info-card { position: relative; width: 84%; max-width: 460px; margin-bottom: 14%;
  padding: 16px 18px 20px; background: linear-gradient(180deg,#e9dfc8,#d8c9a8);
  color: #3a2e1c; border: 1px solid #b09a68; border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
.ip-close { position: absolute; top: 6px; right: 10px; border: none; background: transparent;
  color: #6a5638; font-size: 20px; cursor: pointer; }
.ip-title { margin: 0 0 8px; font-size: 17px; letter-spacing: 3px; color: #8a2f1e; }
.ip-text { margin: 0; font-size: 14px; line-height: 1.8; }
</style>
```

- [ ] **Step 3: SceneView 挂载 popup 状态**

```diff
 // shells/h5/src/components/SceneView.vue
+import { ref } from "vue";
+import InfoPopup from "./InfoPopup.vue";
+const popup = ref<{ title?: string; text: string } | null>(null);
+function onPoint(p: any): void {
+  if (p?.preview) { popup.value = p.preview; return; }  // 有简介先弹轻量 Popup
+  triggerPoint(p.id);                                    // 否则照旧走剧情
+}
</script>
```
```diff
       <InteractPoint
         v-for="p in scene.points"
         :key="p.id"
         v-if="pointVisible(p)"
         :point="p"
         :style="{ zIndex: zh(p) }"
         :z="p.z"
-        @click-p="triggerPoint"
+        @click-p="onPoint(p)"
       />
+    <InfoPopup v-if="popup" v-bind="popup" @close="popup = null" />
+    <div v-if="popup" class="popup-hint">点击弹窗外部关闭</div>
```

- [ ] **Step 4: 运行回归 + 提交**

Run: `cd jianghu-client; (cd shells/h5; npx vitest run) && (cd core; npx vitest run) && (cd shells/h5; npx tsc --noEmit)`
Expected: 全绿；`tsc` 无类型错。
> 若场景点有意让「简介+剧情」共存：保证 `preview` 与 `on` 都配时，先弹简介、点弹窗外再走剧情（由 `onPoint` 分支实现，已满足）。

```bash
git add jianghu-client/shells/h5/src/components/InfoPopup.vue jianghu-client/shells/h5/src/components/SceneView.vue
git commit -m "feat(h5): 轻量 InfoPopup（石碑/祈福台/NPC 简介），对话仍走 NarrativePanel"
```

---

### Task 6: 素材承接（分层 PNG 接入 + 透明净化说明）

**Files:**
- Modify: `e:\code\jianghu-client\shells\h5\src\assets\scenes\index.ts`
- Modify: `e:\code\jianghu-client\content\src\northward.ts`

> 前置依赖「美术定稿/素材验收」（user 主线 1-2）。**素材未产出前用 `src` 可缺省回退**，本 Task 先接入引入方式与占位，验收后替换成真图。

- [ ] **Step 1: scenes 引入中心化（新增图片则加入）**

```diff
 // shells/h5/src/assets/scenes/index.ts
 import wudai from "./wudai.jpg";
 import longtan from "./longtan.jpg";
 export const sceneImages: Record<string, string> = { riverside: wudai, mountain: longtan };
+
+// 分层 PNG 图层（美术定稿后替换为真实资源）
+export const sceneLayerImages = {
+  wudai_far: "",   // 远景 PNG，验收后填 "/xxx/wudai_far.png"
+  wudai_mount: "",
+  longtan_far: "",
+  longtan_mount: "",
+};
```

- [ ] **Step 2: 关卡数据接入示例（wudai 远景/中景层补 `kind:"image"`+`src`，点补 `src/z`）**

```diff
 // content/src/northward.ts（wudai.layers 顶部两条，叠加在现有 gradient 之上）
+    { id: "far",   depth: 0.04, kind: "image", css: "transparent", src: "" },   // ← lamin.PNG
+    { id: "mount", depth: 0.28, kind: "image", css: "transparent", src: "" },   // ← 中景.PNG
     { id: "far",   depth: 0.04, kind: "gradient", ... },   // 保留兜底
```
```diff
 // content/src/northward.ts（示例点，wudai.points 内新增一座石碑摆件）
+    {
+      id: "stele", x: 0.42, y: 0.68, icon: "碑", shape: "notice",
+      src: "", size: 88, z: 20,                         // ← 近景透明 PNG，验收后填
+      preview: { title: "渡口石碑", text: "岁久年深，字迹多已漫漶，唯『北行』二字可辨。" },
+      on: [ { t: "narration", text: "你摩挲碑面凉石，指腹拂过那道深得异乎寻常的刻痕。" } ],
+    },
```

- [ ] **Step 3: 回归 + 提交**

Run: `cd jianghu-client; (cd content; npx vitest run) && (cd core; npx vitest run) && (cd shells/h5; npx tsc --noEmit)`
Expected: 全绿。空 `src` 自动回退到现有 shape/gradient，无破坏。

```bash
git add jianghu-client/shells/h5/src/assets/scenes/index.ts jianghu-client/content/src/northward.ts
git commit -m "feat(content): 接入分层 PNG / 近景透明 PNG 占位与示例摆件（空 src 回退）"
```

---

### Task 7: 全量回归 + 构建 + 冒烟

**Files:** 无（验证性）

- [ ] **Step 1: 全量单测**

Run: `cd jianghu-client; (cd core; npx vitest run); (cd content; npx vitest run); (cd shells/h5; npx vitest run)`
Expected: core 27 / content / h5 全绿。

- [ ] **Step 2: 构建与类型**

Run: `cd jianghu-client; (cd core; npm run build); (cd shells/h5; npm run build)`
Expected: `tsc` 通过、`vite build` 产物生成（`dist/`）。

- [ ] **Step 3: 冒烟**

Run: `cd jianghu-client/shells/h5; npm run dev`
Expected: `localhost:5173` 打开；拖动画面时分层图随 `depth` 错速平移、近景摆件底部在前、点到石碑弹 InfoPopup、到右缘出现"北上龙潭山"路标切景；`v-if` 裁剪使越界点从 DOM 卸载（DevTools Elements 验证）。

- [ ] **Step 4: 提交**

```bash
git add -A jianghu-client
git commit -m "chore(h5): 原生 DOM 摆件设计落地全量回归 + 构建通过"
```

---

## 自检

- **Spec 覆盖**：分层 PNG(T2/T6)✓ 近景透明 PNG(T3/T6)✓ Y 轴遮挡(T3)✓ 懒加载(T4)✓ Popup(T5)✓ 场景跳转(已有 gotoScene，T7 回归)✓ 剧情不变(content 只增字段不改 behavior)✓ Vue3 壳不动(全部组件分支内增量)✓。
- **占位符扫描**：无 "TBD/稍后/类似 Task"；空 `src` 为**有意回退**而非占位符，有明确验收替换点。
- **类型一致**：`layerShift`=平移/`imageLayerWidthPct`=层宽；`elemZ(z,y,basis)`；`sectionIndex/inVisibleRange`；`SceneLayer.kind:"image"`+`src`；`InteractPoint.src/z/size/preview` 前后任务签名一致。