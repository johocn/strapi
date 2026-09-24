# 江湖录 H5 客户端增强设计

> 设计时间 2026-09-23，对接「jianghu-client」现有 Vue3 H5 壳。
> 本文档源自 brainstorming 四节全确认，是后续执行计划的唯一输入。

---

## 1. 背景与目标

在既有 jianghu-client 基础上，补齐五大块能力：

| # | 需求 | 约束 |
|---|------|------|
| A | 背景图全部换成治愈系国风插画 | 现有 4 张 .jpg 全部替换，统一风格 |
| B | 5 个物件实例化为透明 PNG | jar / boat / notice / tarn / pine_wet；pine 浇水状态用 CSS 不新增图 |
| C | 人性化引导三层（L1 新手 / L2 场景提要 / L3 门禁提示） | L1 只触发一次（localStorage），L2/L3 每次可触发 |
| D | 场景编码 1/2 + 左右滑动/箭头切换 + 剧情锁门禁 | 第 3 个场景留扩展位，剧情 goto 也须过门禁 |
| E | 松树根浇水状态可视化 | 浇水后 SVG 加 CSS filter 模拟湿润感，不新增图片资源 |

**不变量：**
- Vue3 H5 壳不动、core DSL 引擎不大改、剧情文字不修改、无新增 npm 依赖
- 现有分层视差、Y 轴遮挡、懒加载、InfoPopup 能力全部保留

---

## 2. Scene DSL 增量

### 2.1 新增字段（全部可选，不破坏现有 Scene）

```ts
export interface Scene {
  // —— 现有字段不变 ——
  id: string;
  name: string;
  bg: string;
  fx?: string;
  worldWidth?: number;
  layers?: SceneLayer[];
  next?: string;          // 保留，兼容剧情 goto sceneId
  points: InteractPoint[];
  entry: Behavior[];
  // —— 新增 ——
  index?: number;             // 场景顺序号 1,2,3... 缺省时按数组自然序
  requiredFlags?: string[];   // 剧情锁：这些 flag 全部 setflag 过才算「完成」
                              // 空/缺省 = 自由切换
  unlockHint?: string;        // 门禁被挡时的人性化提示
  introHint?: string;         // L2 场景提要，进入场景后自动 toast
}
```

### 2.2 northward.ts 配置示例

```ts
// wudai
index: 1,
requiredFlags: ["saw_notice"],        // 看过告示即可北上，不强制走完酒坛全部分支
unlockHint: "先去看看渡口那张告示牌",
introHint: "松花江渡口 — 先看看告示牌和老船家吧",

// longtan
index: 2,
requiredFlags: ["got_fruit"],         // 必须浇松根拿赤果
unlockHint: "去松树下找找办法，把赤果寻回",
introHint: "龙潭山 — 先去潭边掬一捧水，再到松根处看看",
```

---

## 3. 场景切换 + 剧情锁门禁

### 3.1 场景数组化

现有 `scenes: Record<string, Scene>` 改为按 `index` 排序的数组 `Scene[]`，切换时用 index 推导前后场：

```ts
const ordered: Scene[] = Object.values(scenes).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
function getPrev(id: string): Scene | null { /* index-1 */ }
function getNext(id: string): Scene | null { /* index+1 */ }
```

**保留 `next` 字段**：剧情 `goto sceneId`（如 boat 对话 `goto longtan`）仍直接按 sceneId 查，不受数组化影响，但 **goto 也必须过门禁**。

### 3.2 切换交互

| 方式 | 触发 | 适配 |
|------|------|------|
| 键盘 | `←` / `→` | 桌面端 |
| 触屏滑动 | pointerdown + move 阈值 50px，direction 判定 | 移动端 |
| 边缘箭头 | `<` / `>` SVG 水墨风按钮，淡入淡出 | 所有端通用 fallback |

**防冲突**：触屏滑动阈值 ≥ 50px 才算切换，短按或微移归为视差拖拽（现有 camera drag 逻辑保留）。

### 3.3 切换流程

```
用户触发 → 确定目标场景 next
  → canAdvance(current)?
    ├─ YES → fade-out（200ms opacity 过渡）→ state.scene=next
              → 触发 next.entry 剧情 → fade-in → L2 introHint toast
    └─ NO  → L3 unlockHint toast → 不切场
```

### 3.4 门禁纯函数

落 `shells/h5/src/engine/locks.ts`：

```ts
export function canAdvance(scene: Scene, flags: Set<string>): boolean {
  if (!scene.requiredFlags || scene.requiredFlags.length === 0) return true;
  return scene.requiredFlags.every(f => flags.has(f));
}
```

剧情 `goto` 路径同样走此门禁（在 engine.ts 的 goto 处理里插入检查）。

### 3.5 单测覆盖

- 空 requiredFlags → true
- 全部满足 → true
- 缺 1 个 → false
- flags 集合中含多余 key 不影响

---

## 4. 引导系统（三层）

### 4.1 层级定义

| 层 | 组件 | 触发 | 内容 | 消失 | 持久化 |
|----|------|------|------|------|--------|
| **L1 新手引导** | `GuideOverlay.vue` | 首次进入（`localStorage.jianghu_tutorial_done` 未设） | 半透明遮罩 + 高亮圈 + 气泡，3 步：(1)点告示牌 (2)对话老船家 (3)拖动画面 | 用户走完或点跳过 | 设 localStorage 后永不重复 |
| **L2 场景提要** | `SceneToast.vue` 复用 | 进入场景、entry 剧情播完后 watch 触发 | `scene.introHint`，顶部 toast | 3s 自动/点掉 | 每次可触发 |
| **L3 门禁提示** | `SceneToast.vue` 复用 | `canAdvance` 返回 false | `scene.unlockHint`，底部 toast | 4s 自动/点掉 | 每次可触发 |

### 4.2 SceneToast 统一接口

```vue
// SceneToast.vue
<script setup lang="ts">
defineProps<{ text: string; position: "top" | "bottom"; duration?: number }>();
const emit = defineEmits<{ (e: "close"): void }>();
// duration 到点自动 emit close
</script>
```

### 4.3 L1 GuideOverlay 实现

- 步骤配置硬编码（3 步，不 DSL 化，简单够用）
- 每步通过 DOM querySelector 高亮目标交互点（如 `[data-point="notice"]`）
- 完成后设 `localStorage.jianghu_tutorial_done = "true"`
- 有「跳过」按钮

### 4.4 引导与剧情解耦

引导只读 scene 和 state.flags，不修改 engine 状态。

```ts
// useGame.ts watcher（伪代码）
watch(() => state.scene, (s) => {
  if (s?.introHint) toast.show(s.introHint, "top", 3000);
  // L1 检查
  if (!localStorage.getItem("jianghu_tutorial_done")) showGuide();
});
```

---

## 5. 美术素材

### 5.1 背景分层 PNG（4 张，全部替换现有 .jpg）

**风格**：治愈系国风插画 · 柔和平涂 · 低饱和暖色调（米黄/淡青/浅粉/赭石）· 柔化轮廓 · 轻雾氛围 · 纯风景无人物建筑文字水印

**输出规格**：2048×1152，PNG，放 `shells/h5/public/assets/scenes/`

| 文件 | 场景 | 描述要点 |
|------|------|----------|
| `wudai_far.png` | 松花江渡口·远景 | 淡墨远山横卧、江面晨雾、远处一叶扁舟剪影（极小） |
| `wudai_mount.png` | 松花江渡口·中景 | 近处土坡、芦苇荡、半埋酒坛、木栈桥伸向江里 |
| `longtan_far.png` | 龙潭山·远景 | 层峦叠嶂、山顶云绕、松枝剪影 |
| `longtan_mount.png` | 龙潭山·中景 | 山间石阶、古寺飞檐一角、幽潭水面反光、斜松 |

### 5.2 物件透明 PNG（5 张）

**风格**：同上国风插画，中心对齐，四周留呼吸空间

**输出规格**：256×256，透明 PNG，放 `shells/h5/public/assets/props/`

| 文件 | PropShape | 描述 |
|------|-----------|------|
| `prop_jar.png` | jar | 青瓷酒坛、泥封、潮苔 |
| `prop_boat.png` | boat | 乌篷渡船、船家侧影、橹 |
| `prop_notice.png` | notice | 木柱告示牌、墨迹新印 |
| `prop_tarn.png` | tarn | 幽潭水面、青碧反光、寒雾 |
| `prop_pine_wet.png` | pine | 湿润松根（可选，最终渲染仍用 SVG+CSS） |

**接入点**：northward.ts 的每个 InteractPoint 加 `src` 字段，指向对应路径。

### 5.3 松树浇水状态切换（CSS filter，不新增图片）

浇水前：`SceneProp.vue` 内联 SVG 剪影（现有实现）

浇水后：SVG 加 `.watered` class，CSS 模拟湿润感

```css
.pine.watered svg {
  filter: brightness(0.85) saturate(1.4) contrast(1.1);
}
```

**触发条件**：`state.flags.has("got_fruit")`（松树根浇完水拿赤果后 setflag）

**渲染切换点**：`SceneProp.vue` 里根据传入的 `flags` prop（从 state 派生）加 class：

```vue
// SceneProp.vue（伪代码）
const props = defineProps<{ shape: PropShape; flags?: Set<string> }>();
const watered = computed(() => props.shape === "pine" && props.flags?.has("got_fruit"));
```

**不改动** core engine，纯前端响应 state.flags。

---

## 6. 文件变更总览

| 操作 | 文件 | 说明 |
|------|------|------|
| Modify | `core/src/dsl/types.ts` | Scene 加 index/requiredFlags/unlockHint/introHint |
| Test | `core/tests/types.test.ts` | 增量类型分支 |
| Create | `shells/h5/src/engine/locks.ts` | canAdvance 纯函数 |
| Test | `shells/h5/tests/locks.test.ts` | 门禁单测 |
| Modify | `shells/h5/src/engine/useGame.ts` | 接入数组化 scenes、切换交互、门禁、引导 watcher |
| Modify | `shells/h5/src/components/SceneView.vue` | 左右箭头按钮、触屏滑动、SceneToast/GuideOverlay 挂载点 |
| Create | `shells/h5/src/components/SceneToast.vue` | L2/L3 共用 toast |
| Create | `shells/h5/src/components/GuideOverlay.vue` | L1 新手引导遮罩 |
| Modify | `shells/h5/src/components/SceneProp.vue` | 加 flags prop，pine 浇水状态 class |
| Modify | `content/src/northward.ts` | 两个 Scene 加 index/requiredFlags/unlockHint/introHint，point 加 src |
| Replace | `shells/h5/public/assets/scenes/*.jpg` → `*.png` | 4 张分层背景 |
| Create | `shells/h5/public/assets/props/prop_*.png` | 5 张物件 |

---

## 7. 风险与回退

| 风险 | 影响 | 缓解 |
|------|------|------|
| AI 生成的「治愈系国风」偏离预期 | 视觉风格不统一 | 先出 1 张 wudai_far.png 验证风格，满意再批量 |
| 剧情 goto 与门禁冲突（某支线剧情仍可卡关） | 玩家卡死 | 门禁走 requiredFlags（宽松集合），不强制所有分支 |
| 触屏滑动与视差拖拽冲突 | 误切场 | 阈值 ≥ 50px，边缘区域才触发切换，中间区域归为视差 |
| localStorage 清除后 L1 重复触发 | 体验差 | 可选「永不提示」按钮（后续加，本期先按方案来） |

---

## 8. 不在本期范围内

- 新建第 3 个场景（留 index 扩展位）
- 修改 core engine 的 Behavior 类型或 DSL 语义
- 新增 npm 依赖
- LayaAir 游戏客户端改动（独立仓库）
