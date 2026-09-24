# 江湖录 Demo C 版「行脚图」（avatar）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `jianghu-client/demo` 里新增第三种表现层 `views/avatar/`：720×2560 竖向长卷 + 一个会走路的剪影小人，点哪走哪（网格 A* 自动寻路），镜头缓动跟随，走到点位旁才升起交互卡片。

**Architecture:** 全部几何逻辑（投影、相机解算、栅格化、A*）写进 `avatar-geometry.ts` 的纯函数；地形多边形与桥面数据由 `avatar-terrain.ts` 单点持有，同一份数据既用来画地物又用来铺障碍格；`useWalker.ts` 唯一负责把纯函数串成 rAF 时序；`AvatarMap.vue` 只做 SVG 呈现，`AvatarApp.vue` 只做状态与交互编排。`shared/`、`platform/`、`album/`、`atlas/` 一行不改。

**Tech Stack:** Vue 3 + TypeScript + Vite + Vitest（`npm test`）+ Playwright（冒烟，走 CDP）。

**Spec:** [2026-09-24-jianghu-avatar-c-design.md](file:///e:/code/docs/superpowers/specs/2026-09-24-jianghu-avatar-c-design.md)

---

## 执行前置约束（务必先读）

1. **工作目录**：所有命令都在 `e:\code\jianghu-client\demo` 下执行（下文简写为「demo 根」）。
2. **零回归铁律**：`src/shared/**`、`src/platform/**`、`src/views/album/**`、`src/views/atlas/**` 一个字都不许改。C 版只新增文件。
3. **不加依赖**：`package.json` 只加一行 `scripts`，`dependencies`/`devDependencies` 不许动。
4. **提交纪律（用户规则）**：每个 Task 末尾的 `git commit` 步骤**必须先向用户确认再执行**，不得自行提交；`git add` 只加本 Task 明确列出的文件，不要 `git add -A`。工作区里其它未提交改动（`shao/`、`shells/h5/` 等）一律不碰。
5. **交互动线不可省**：C 版要验的就是「走过去」这个过程，任何「跳过行走」「瞬移」的实现都等于删掉结论。
6. **验证命令**：`npm test`（vitest）、`npm run typecheck`、`npm run smoke:avatar`（需先 `npm run dev` 起 5173）、`npm run smoke`（A 版 24 项）、`npm run smoke:atlas`（B 版）。

## 已核验的几何事实（本计划的地形数据已跑过探针）

在动手前已用一次性脚本按本计划的栅格化规则（障碍格 = 格心落在多边形内；桥面格覆盖障碍；点位半径 4 格强制可走）验算过：

| 项 | 实测值 |
|---|---|
| 格子总数 / 障碍格 | 4608 / 434 |
| 任一点位与任一地形顶点最近距离 | 118.2 单位（`山体二 → 龙潭`），满足 ≥ 90 |
| 五段相邻路径 A* | 全部有解（步数 6 / 6 / 28 / 27 / 34） |
| `老船家 → 龙潭` | 过桥面矩形 ✓ |
| `龙潭 → 守山僧` | 过石磴矩形 ✓ |
| 五段路径长合计 | 约 2209 单位 → 步速 170 时约 0.8s~4.1s |

> 收尾修订（山体二/三/四 由轴对齐四边形改为八点山影，见设计文档 §5.1）后复测：五段总长 2210（原 2209.9）、`山体二 → 龙潭` 最近距离 ≈116（原 118.2），仍满足 ≥ 90；障碍格总数随形变化，但可达性断言（五段有解 / 过桥 / 过石磴 / 山体二中心不可走）全部不变。

**所以地形数据不要「顺手调一下」**：任何微调都要重跑 §Task 4 的可达性单测。

## 文件结构（锁定分解）

### 新增

```
jianghu-client/demo/src/views/avatar/
├── avatar-terrain.ts    地形多边形 + 桥面矩形（渲染与网格的单一真源）
├── avatar-geometry.ts   投影 · 相机解算 · 栅格化 · A* · 驿道（全纯函数，无 Vue / 无 DOM / 无计时器）
├── useWalker.ts         rAF 驱动：沿路径推进 + 相机缓动 + 抵达回调
├── AvatarMap.vue        SVG 长卷：地形 / 桥面 / 驿道 / 点位 / 角色 / 地面点击层
├── AvatarCard.vue       点位卡片（与 A/B 同构，import ../interacts/*）
├── AvatarStamp.vue      落章动画（卡片 → HUD 印章槽）
├── AvatarPanel.vue      见闻录册（两页签）
└── AvatarApp.vue        组装：HUD + 地图 + 卡片 + 落章 + 见闻录册
```

```
jianghu-client/demo/tests/avatar-geometry.test.ts
jianghu-client/demo/scripts/smoke-avatar.cjs
```

### 修改

- `src/main.ts`：URL 参数增加 `?v=avatar` 分支
- `package.json`：`scripts` 增加 `smoke:avatar`

### 复用（零改动）

- `src/views/interacts/{ChoiceBox,ComposeBox,OrderBox}.vue`
- `src/shared/{types,engine,rules,persist,content}.ts`、`src/platform/index.ts`

### 为什么 `AvatarCard/Stamp/Panel` 是复制而不是复用 `atlas/` 的

三版要横向对比，其中一版将来被留下来，组件之间不该有耦合；A/B 之间已经是这个成法，C 版沿用同一约定（writing-plans：在既有代码库里跟随既有模式）。不要顺手把三份卡片抽成共用组件 —— 那会同时改动 `album/` 与 `atlas/`，违反零回归铁律。

---

## Task 1: 投影与相机纯函数 `avatar-geometry.ts`

**Files:**
- Create: `jianghu-client/demo/src/views/avatar/avatar-geometry.ts`
- Create: `jianghu-client/demo/tests/avatar-geometry.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/avatar-geometry.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { points } from "../src/shared/content";
import {
  MAP_H,
  MARGIN_V,
  TY_MIN,
  camTarget,
  clampTy,
  projectX,
  projectY,
  stepCamera,
  yRange,
} from "../src/views/avatar/avatar-geometry";

const range = yRange(points);

describe("长卷投影", () => {
  it("六个点位的投影与设计表逐一对齐", () => {
    expect(projectX(0.16)).toBeCloseTo(115.2, 2);
    expect(projectX(0.3)).toBeCloseTo(216.0, 2);
    expect(projectX(0.44)).toBeCloseTo(316.8, 2);
    expect(projectX(0.56)).toBeCloseTo(403.2, 2);
    expect(projectX(0.72)).toBeCloseTo(518.4, 2);
    expect(projectX(0.86)).toBeCloseTo(619.2, 2);

    expect(projectY(0.74, range)).toBeCloseTo(2160.0, 2);
    expect(projectY(0.72, range)).toBeCloseTo(2092.31, 2);
    expect(projectY(0.7, range)).toBeCloseTo(2024.62, 2);
    expect(projectY(0.54, range)).toBeCloseTo(1483.08, 2);
    expect(projectY(0.42, range)).toBeCloseTo(1076.92, 2);
    expect(projectY(0.22, range)).toBeCloseTo(400.0, 2);
  });

  it("重映射后纵向跨度 1760，稳过一屏 1280", () => {
    const span = projectY(range.maxY, range) - projectY(range.minY, range);
    expect(span).toBe(1760);
    expect(span).toBeGreaterThan(1280);
    expect(MAP_H - 2 * MARGIN_V).toBe(1760);
  });
});

describe("相机只有一个自由度", () => {
  it("六点位的相机目标与夹取结果与设计表一致", () => {
    expect(camTarget(2160)).toBeCloseTo(-1366.4, 2);
    expect(camTarget(2092.31)).toBeCloseTo(-1298.71, 2);
    expect(camTarget(2024.62)).toBeCloseTo(-1231.02, 2);
    expect(camTarget(1483.08)).toBeCloseTo(-689.48, 2);
    expect(camTarget(1076.92)).toBeCloseTo(-283.32, 2);
    expect(camTarget(400)).toBeCloseTo(393.6, 2);

    expect(clampTy(camTarget(2160))).toBe(TY_MIN);
    expect(clampTy(camTarget(2092.31))).toBe(TY_MIN);
    expect(clampTy(camTarget(2024.62))).toBeCloseTo(-1231.02, 2);
    expect(clampTy(camTarget(1483.08))).toBeCloseTo(-689.48, 2);
    expect(clampTy(camTarget(1076.92))).toBeCloseTo(-283.32, 2);
    expect(clampTy(camTarget(400))).toBe(0);
  });

  it("边界两侧都夹住", () => {
    expect(TY_MIN).toBe(-1280);
    expect(clampTy(-99999)).toBe(TY_MIN);
    expect(clampTy(99999)).toBe(0);
    expect(clampTy(-320)).toBe(-320);
  });

  it("起点到山巅正好把可平移范围走满一遍", () => {
    const atFerry = clampTy(camTarget(projectY(0.74, range)));
    const atPine = clampTy(camTarget(projectY(0.22, range)));
    expect(atPine - atFerry).toBe(1280);
  });
});

describe("stepCamera", () => {
  it("单调收敛、不过冲", () => {
    let ty = 0;
    let prev = ty;
    for (let i = 0; i < 120; i++) {
      ty = stepCamera(ty, TY_MIN, 1 / 60);
      expect(ty).toBeLessThanOrEqual(prev);
      expect(ty).toBeGreaterThanOrEqual(TY_MIN);
      prev = ty;
    }
    expect(ty).toBeCloseTo(TY_MIN, 1);
  });

  it("dt 很大时一步到位且不越过目标", () => {
    expect(stepCamera(0, TY_MIN, 10)).toBe(TY_MIN);
  });

  it("已达目标时不再变化", () => {
    expect(stepCamera(TY_MIN, TY_MIN, 1 / 60)).toBe(TY_MIN);
  });

  it("残差小于 0.5 时直接落位（否则指数平滑永远逼近不到目标）", () => {
    expect(stepCamera(-0.2, 0, 1 / 60)).toBe(0);
    expect(stepCamera(-320.2, -320, 1 / 60)).toBe(-320);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- avatar-geometry`
Expected: FAIL —— `Failed to resolve import "../src/views/avatar/avatar-geometry"`

- [ ] **Step 3: 写最小实现**

创建 `src/views/avatar/avatar-geometry.ts`：

```ts
// 行脚图几何：全部为纯函数，不碰 DOM、不碰 Vue、不碰计时器。
import type { GamePoint } from "../../shared/types";

/** 长卷画布（地图单位） */
export const MAP_W = 720;
export const MAP_H = 2560;
/** 虚拟视口 = 一屏 */
export const VIEW_W = 720;
export const VIEW_H = 1280;
/** 上下留白：重映射后点位落在 [MARGIN_V, MAP_H - MARGIN_V] */
export const MARGIN_V = 400;
/** 角色锚在视口 62% 高度处 */
export const CAM_ANCHOR_RATIO = 0.62;
/** 相机指数平滑系数（1/秒），对应时间常数约 0.17 秒 */
export const CAM_SMOOTH = 6;

/** 地图宽 = 视口宽，横向刚好贴合：相机只有纵向一个自由度 */
export const TY_MIN = VIEW_H - MAP_H;
export const TY_MAX = 0;

/** 角色出生点（地图单位）：渡口告示东南侧一百多单位，保证点它时会真的走一步 */
export const SPAWN = { x: 200, y: 2280 };

export interface YRange {
  minY: number;
  maxY: number;
}

export function yRange(points: Pick<GamePoint, "y">[]): YRange {
  const ys = points.map((p) => p.y);
  return { minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export function projectX(x: number): number {
  return x * MAP_W;
}

/**
 * 归一化 y → 长卷 y：把 [minY, maxY] 线性铺满 [MARGIN_V, MAP_H - MARGIN_V]。
 * 不做这步重映射，0.52 的内容跨度只有 1331，仅略大于一屏，镜头几乎不用动。
 */
export function projectY(y: number, range: YRange): number {
  const span = range.maxY - range.minY;
  if (span <= 0) return MAP_H / 2;
  return MARGIN_V + ((y - range.minY) / span) * (MAP_H - 2 * MARGIN_V);
}

/** 相机目标：把地图点 py 放到视口 62% 高度处 */
export function camTarget(py: number): number {
  return VIEW_H * CAM_ANCHOR_RATIO - py;
}

/** 取景约束：可平移范围正好等于整个长卷 */
export function clampTy(ty: number): number {
  return Math.min(TY_MAX, Math.max(TY_MIN, ty));
}

/**
 * 一帧的相机缓动：指数平滑，dt 大时一步到位且不过冲。
 * 残差小于 0.5 时直接落位 —— 否则指数平滑永远逼近不到目标，
 * 长卷贴住上/下缘时 ty 会停在 -0.0003 这种值上，冒烟断言永远咬不准。
 */
export function stepCamera(ty: number, target: number, dt: number): number {
  const next = ty + (target - ty) * Math.min(1, CAM_SMOOTH * dt);
  return Math.abs(target - next) < 0.5 ? target : next;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- avatar-geometry`
Expected: PASS（9 项）

- [ ] **Step 5: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/avatar-geometry.ts jianghu-client/demo/tests/avatar-geometry.test.ts
git commit -m "feat(demo-avatar): 新增行脚图投影与相机纯函数，几何自证 1760 跨度"
```

---

## Task 2: 地形与桥面数据 `avatar-terrain.ts`

**Files:**
- Create: `jianghu-client/demo/src/views/avatar/avatar-terrain.ts`
- Modify: `jianghu-client/demo/tests/avatar-geometry.test.ts`（追加 describe 块）

- [ ] **Step 1: 写失败测试**

在 `tests/avatar-geometry.test.ts` 顶部补 import：

```ts
import { BRIDGES, TERRAIN } from "../src/views/avatar/avatar-terrain";
```

在文件末尾追加：

```ts
describe("地形数据约束", () => {
  it("两块水域 + 四块山体林地，两条水道各有一座桥面", () => {
    expect(TERRAIN.filter((t) => t.kind === "water")).toHaveLength(2);
    expect(TERRAIN.filter((t) => t.kind === "hill")).toHaveLength(4);
    expect(BRIDGES).toHaveLength(2);
  });

  it("每块多边形与任一点位的最近距离 ≥ 90 单位", () => {
    for (const poly of TERRAIN) {
      for (const p of points) {
        const px = projectX(p.x);
        const py = projectY(p.y, range);
        const nearest = Math.min(
          ...poly.points.map(([x, y]) => Math.hypot(x - px, y - py))
        );
        expect(nearest, `${poly.id} ↔ ${p.id}`).toBeGreaterThanOrEqual(90);
      }
    }
  });

  it("桥面矩形各自罩住一条水道的横截面", () => {
    // 江：桥面 y 区间必须完整盖住江在这一段的上下缘
    const river = TERRAIN.find((t) => t.id === "river")!;
    const ys = river.points.map(([, y]) => y);
    const bridge = BRIDGES.find((b) => b.id === "bridge")!;
    expect(bridge.y).toBeLessThan(Math.min(...ys));
    expect(bridge.y + bridge.h).toBeGreaterThan(Math.max(...ys));

    // 溪：石磴同理
    const creek = TERRAIN.find((t) => t.id === "creek")!;
    const cys = creek.points.map(([, y]) => y);
    const step = BRIDGES.find((b) => b.id === "stepping")!;
    expect(step.y).toBeLessThan(Math.min(...cys));
    expect(step.y + step.h).toBeGreaterThan(Math.max(...cys));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- avatar-geometry`
Expected: FAIL —— `Failed to resolve import "../src/views/avatar/avatar-terrain"`

- [ ] **Step 3: 写地形数据**

创建 `src/views/avatar/avatar-terrain.ts`：

```ts
// 地形与桥面的单一真源：同一份数据既用来画地物，又用来栅格化成可走网格。
// 坐标是地图单位（y 向下）。改动任何一处都要重跑 tests/avatar-geometry.test.ts 的可达性用例。

export type TerrainKind = "water" | "hill";

export interface Poly {
  id: string;
  kind: TerrainKind;
  points: [number, number][];
}

export interface Bridge {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const TERRAIN: Poly[] = [
  {
    // 江：横贯分割，上缘左→右、下缘右→左闭合成一个简单多边形
    id: "river",
    kind: "water",
    points: [
      [0, 1720],
      [140, 1700],
      [300, 1690],
      [460, 1712],
      [720, 1700],
      [720, 1826],
      [460, 1838],
      [300, 1810],
      [140, 1820],
      [0, 1840],
    ],
  },
  {
    // 溪：第二道横贯分割
    id: "creek",
    kind: "water",
    points: [
      [0, 1262],
      [180, 1240],
      [380, 1252],
      [560, 1236],
      [720, 1250],
      [720, 1310],
      [560, 1296],
      [380, 1312],
      [180, 1300],
      [0, 1322],
    ],
  },
  {
    // 山体一：江左侧，把左岸的死路堵上，逼 A* 走桥
    id: "hill_1",
    kind: "hill",
    points: [
      [60, 1760],
      [170, 1700],
      [230, 1800],
      [150, 1880],
      [70, 1850],
    ],
  },
  {
    // 山体二：龙潭左侧，双肩抱一峰，作山影轮廓
    // （收尾修订：原为轴对齐四边形，渲染成半透明方块，改八点山影；顶点仍在原包围盒内）
    id: "hill_2",
    kind: "hill",
    points: [
      [155, 1478],
      [168, 1392],
      [205, 1352],
      [240, 1358],
      [272, 1400],
      [288, 1474],
      [243, 1458],
      [198, 1466],
    ],
  },
  {
    // 山体三：龙潭与守山僧之间的左侧，峰偏左、右肩拖长
    // （收尾修订：同上，八点山影）
    id: "hill_3",
    kind: "hill",
    points: [
      [325, 828],
      [338, 752],
      [378, 702],
      [405, 712],
      [442, 758],
      [468, 826],
      [425, 812],
      [372, 818],
    ],
  },
  {
    // 山体四：山巅左下，高尖峰配缓坡右肩
    // （收尾修订：同上，八点山影）
    id: "hill_4",
    kind: "hill",
    points: [
      [335, 366],
      [348, 296],
      [386, 252],
      [414, 262],
      [450, 302],
      [478, 364],
      [433, 352],
      [382, 358],
    ],
  },
];

/** 桥面（可走）：铺在障碍格之上，把被水道切开的地图重新连通 */
export const BRIDGES: Bridge[] = [
  { id: "bridge", x: 280, y: 1660, w: 70, h: 200 },
  { id: "stepping", x: 196, y: 1215, w: 54, h: 120 },
];
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- avatar-geometry`
Expected: PASS（12 项）

- [ ] **Step 5: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/avatar-terrain.ts jianghu-client/demo/tests/avatar-geometry.test.ts
git commit -m "feat(demo-avatar): 地形多边形与桥面数据落地，单测守住点位 90 单位净距"
```

---

## Task 3: 栅格化与 A*

**Files:**
- Modify: `jianghu-client/demo/src/views/avatar/avatar-geometry.ts`（追加）
- Modify: `jianghu-client/demo/tests/avatar-geometry.test.ts`（追加 describe 块）

- [ ] **Step 1: 写失败测试**

在 `tests/avatar-geometry.test.ts` 的 import 列表里补：

```ts
  ARRIVE_RADIUS,
  CELL,
  COLS,
  NAV_RADIUS_CELLS,
  ROWS,
  WALK_SPEED,
  astar,
  buildGrid,
  cellCenter,
  inBridge,
  isWalkable,
  pathToWorld,
  snapToWalkable,
  worldToCell,
```

在文件末尾追加：

```ts
describe("栅格化", () => {
  const grid = buildGrid(points);

  it("网格规模 36 × 128 = 4608 格", () => {
    expect(CELL).toBe(20);
    expect(COLS).toBe(36);
    expect(ROWS).toBe(128);
    expect(grid.length).toBe(4608);
  });

  it("水道成障碍：江心与溪心都不可走", () => {
    const [ri, rj] = worldToCell(360, 1770);
    expect(isWalkable(grid, ri, rj)).toBe(false);
    const [ci, cj] = worldToCell(600, 1275);
    expect(isWalkable(grid, ci, cj)).toBe(false);
  });

  it("山体成障碍：山体二中心不可走", () => {
    const [i, j] = worldToCell(220, 1420);
    expect(isWalkable(grid, i, j)).toBe(false);
  });

  it("桥面覆盖障碍：江面上的桥面格可走", () => {
    const [i, j] = worldToCell(310, 1750);
    expect(isWalkable(grid, i, j)).toBe(true);
    expect(inBridge(...(Object.values(cellCenter(i, j)) as [number, number]))).toBe(true);
  });

  it("石磴覆盖障碍：溪面上的石磴格可走", () => {
    const [i, j] = worldToCell(220, 1275);
    expect(isWalkable(grid, i, j)).toBe(true);
  });

  it("点位半径 4 格强制可走（防御性，挪坐标也不会被包住）", () => {
    for (const p of points) {
      const [ci, cj] = worldToCell(projectX(p.x), projectY(p.y, range));
      for (let dj = -NAV_RADIUS_CELLS; dj <= NAV_RADIUS_CELLS; dj++) {
        for (let di = -NAV_RADIUS_CELLS; di <= NAV_RADIUS_CELLS; di++) {
          expect(isWalkable(grid, ci + di, cj + dj), `${p.id} ${di},${dj}`).toBe(true);
        }
      }
    }
  });

  it("snapToWalkable：障碍格里吸附到最近可走格，可走格原样返回", () => {
    const [i, j] = worldToCell(360, 1770); // 江心
    const snapped = snapToWalkable(grid, [i, j]);
    expect(snapped).not.toBeNull();
    expect(isWalkable(grid, snapped![0], snapped![1])).toBe(true);
    expect(snapToWalkable(grid, [0, 0])).toEqual([0, 0]);
  });
});

describe("A*", () => {
  const grid = buildGrid(points);
  const target = (id: string) => {
    const p = points.find((x) => x.id === id)!;
    return snapToWalkable(grid, worldToCell(projectX(p.x), projectY(p.y, range)))!;
  };

  it("老船家 → 龙潭：有解，且路径格全部可走、确实经过桥面", () => {
    const path = astar(grid, target("boatman"), target("longtan"));
    expect(path).not.toBeNull();
    expect(path!.every(([i, j]) => isWalkable(grid, i, j))).toBe(true);
    expect(path!.some(([i, j]) => inBridge(cellCenter(i, j).x, cellCenter(i, j).y))).toBe(true);
  });

  it("龙潭 → 守山僧：有解，且确实经过石磴", () => {
    const path = astar(grid, target("longtan"), target("monk"));
    expect(path).not.toBeNull();
    const stepping = BRIDGES.find((b) => b.id === "stepping")!;
    const overStepping = path!.some(([i, j]) => {
      const c = cellCenter(i, j);
      return c.x >= stepping.x && c.x < stepping.x + stepping.w && c.y >= stepping.y && c.y < stepping.y + stepping.h;
    });
    expect(overStepping).toBe(true);
  });

  it("同格起终点：返回单格路径", () => {
    const cell = target("ferry_notice");
    const path = astar(grid, cell, cell);
    expect(path).toEqual([cell]);
  });

  it("路径能转成世界坐标折线，长度与格数同量级", () => {
    const path = astar(grid, target("boatman"), target("longtan"))!;
    const world = pathToWorld(path);
    expect(world).toHaveLength(path.length);
    expect(world[0].x).toBeCloseTo(cellCenter(path[0][0], path[0][1]).x, 6);
  });
});

describe("常量契约", () => {
  it("抵达半径与步速按设计取值", () => {
    expect(ARRIVE_RADIUS).toBe(55);
    expect(WALK_SPEED).toBe(170);
    expect(ARRIVE_RADIUS).toBeLessThan(WALK_SPEED);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- avatar-geometry`
Expected: FAIL —— `buildGrid is not a function` / `inBridge is not a function`

- [ ] **Step 3: 写实现**

在 `src/views/avatar/avatar-geometry.ts` 顶部补 import：

```ts
import { BRIDGES, TERRAIN, type Poly } from "./avatar-terrain";
```

在文件末尾追加：

```ts
// ---------- 可走网格 ----------

export const CELL = 20;
export const COLS = MAP_W / CELL;
export const ROWS = MAP_H / CELL;
/** 点位周围强制可走的格数（4 × 20 = 80 单位） */
export const NAV_RADIUS_CELLS = 4;
/** 抵达判定：剩余路径短于此值即停，视觉上站在点位旁边 */
export const ARRIVE_RADIUS = 55;
/** 地图单位 / 秒 */
export const WALK_SPEED = 170;

export type Cell = [number, number];

/** 射线法判点在多边形内 */
export function inPoly(px: number, py: number, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.points.length - 1; i < poly.points.length; j = i++) {
    const [xi, yi] = poly.points[i];
    const [xj, yj] = poly.points[j];
    if (
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function inBridge(px: number, py: number): boolean {
  return BRIDGES.some(
    (b) => px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h
  );
}

export function cellCenter(i: number, j: number): { x: number; y: number } {
  return { x: i * CELL + CELL / 2, y: j * CELL + CELL / 2 };
}

export function worldToCell(x: number, y: number): Cell {
  return [Math.floor(x / CELL), Math.floor(y / CELL)];
}

export function isWalkable(grid: Uint8Array, i: number, j: number): boolean {
  if (i < 0 || i >= COLS || j < 0 || j >= ROWS) return false;
  return grid[j * COLS + i] === 0;
}

/**
 * 栅格化顺序即语义：
 * 1. 地形铺成障碍格（格心落在多边形内即障碍）
 * 2. 桥面挖通（盖在障碍之上）
 * 3. 每个点位半径 4 格强制置为可走（防御性：将来挪点位坐标也不会被障碍包死）
 */
export function buildGrid(points: Pick<GamePoint, "x" | "y">[]): Uint8Array {
  const range = yRange(points);
  const grid = new Uint8Array(COLS * ROWS);

  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const c = cellCenter(i, j);
      if (TERRAIN.some((poly) => inPoly(c.x, c.y, poly))) grid[j * COLS + i] = 1;
    }
  }

  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const c = cellCenter(i, j);
      if (inBridge(c.x, c.y)) grid[j * COLS + i] = 0;
    }
  }

  for (const p of points) {
    const [ci, cj] = worldToCell(projectX(p.x), projectY(p.y, range));
    for (let dj = -NAV_RADIUS_CELLS; dj <= NAV_RADIUS_CELLS; dj++) {
      for (let di = -NAV_RADIUS_CELLS; di <= NAV_RADIUS_CELLS; di++) {
        const i = ci + di;
        const j = cj + dj;
        if (i >= 0 && i < COLS && j >= 0 && j < ROWS) grid[j * COLS + i] = 0;
      }
    }
  }

  return grid;
}

/** 吸附到最近可走格；已在可走格则原样返回。整张图无解时返回 null */
export function snapToWalkable(grid: Uint8Array, cell: Cell): Cell | null {
  const [i, j] = cell;
  if (isWalkable(grid, i, j)) return [i, j];
  for (let r = 1; r < Math.max(COLS, ROWS); r++) {
    let best: Cell | null = null;
    let bestDist = Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const ni = i + di;
        const nj = j + dj;
        if (!isWalkable(grid, ni, nj)) continue;
        const d = di * di + dj * dj;
        if (d < bestDist) {
          bestDist = d;
          best = [ni, nj];
        }
      }
    }
    if (best) return best;
  }
  return null;
}

// ---------- A* ----------

const NEIGHBORS: Cell[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/** 八向 A*，对角代价 √2；障碍格不进入开放集。无解返回 null */
export function astar(grid: Uint8Array, start: Cell, goal: Cell): Cell[] | null {
  const key = (i: number, j: number) => j * COLS + i;
  const goals = key(goal[0], goal[1]);
  const gScore = new Map<number, number>([[key(start[0], start[1]), 0]]);
  const fScore = new Map<number, number>([
    [key(start[0], start[1]), Math.hypot(start[0] - goal[0], start[1] - goal[1])],
  ]);
  const cameFrom = new Map<number, number>();
  const open: Cell[] = [start];
  const closed = new Set<number>();

  while (open.length > 0) {
    let bestAt = 0;
    for (let i = 1; i < open.length; i++) {
      const a = fScore.get(key(open[i][0], open[i][1])) ?? Infinity;
      const b = fScore.get(key(open[bestAt][0], open[bestAt][1])) ?? Infinity;
      if (a < b) bestAt = i;
    }
    const current = open.splice(bestAt, 1)[0];
    const ck = key(current[0], current[1]);
    if (ck === goals) {
      const path: Cell[] = [current];
      let p = ck;
      while (cameFrom.has(p)) {
        p = cameFrom.get(p)!;
        path.unshift([p % COLS, Math.floor(p / COLS)]);
      }
      return path;
    }
    if (closed.has(ck)) continue;
    closed.add(ck);

    const base = gScore.get(ck) ?? Infinity;
    for (const [di, dj] of NEIGHBORS) {
      const ni = current[0] + di;
      const nj = current[1] + dj;
      if (!isWalkable(grid, ni, nj)) continue;
      const nk = key(ni, nj);
      const tentative = base + Math.hypot(di, dj);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentative);
        cameFrom.set(nk, ck);
        fScore.set(nk, tentative + Math.hypot(ni - goal[0], nj - goal[1]));
        open.push([ni, nj]);
      }
    }
  }

  return null;
}

/** 格子路径 → 世界坐标折线（格心） */
export function pathToWorld(path: Cell[]): { x: number; y: number }[] {
  return path.map(([i, j]) => cellCenter(i, j));
}

/** 格子路径长度（地图单位） */
export function pathLength(path: Cell[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) * CELL;
  }
  return total;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- avatar-geometry`
Expected: PASS（24 项）

如果「老船家 → 龙潭」的过桥断言失败，说明 `buildGrid` 的**三步顺序被写反了**（桥面挖通必须在铺障碍之后），不要改地形数据。

- [ ] **Step 5: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/avatar-geometry.ts jianghu-client/demo/tests/avatar-geometry.test.ts
git commit -m "feat(demo-avatar): 栅格化与八向 A*，桥面挖通保证跨水可达"
```

---

## Task 4: 驿道 = 相邻点位之间的 A*

**Files:**
- Modify: `jianghu-client/demo/src/views/avatar/avatar-geometry.ts`（追加）
- Modify: `jianghu-client/demo/tests/avatar-geometry.test.ts`（追加 describe 块）

- [ ] **Step 1: 写失败测试**

在 import 列表里补 `buildRoads` 与 `toPathD`，在文件末尾追加：

```ts
describe("驿道 = 相邻点位之间的 A*", () => {
  const roads = buildRoads(points);

  it("六点位串成五段，段段有解（可达性门禁）", () => {
    expect(roads).toHaveLength(5);
    for (let i = 0; i < roads.length; i++) {
      expect(roads[i].length, `第 ${i + 1} 段`).toBeGreaterThan(0);
      expect(roads[i].every(([i2, j2]) => isWalkable(buildGrid(points), i2, j2))).toBe(true);
    }
  });

  it("五段总长在 2000~2400 之间（步速 170 时全程 12~14 秒）", () => {
    const total = roads.reduce((acc, road) => acc + pathLength(road), 0);
    expect(total).toBeGreaterThan(2000);
    expect(total).toBeLessThan(2400);
  });

  it("toPathD 产出合法 SVG 折线指令", () => {
    const d = toPathD(pathToWorld(roads[0]));
    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain(" L ");
    expect(d).not.toContain("NaN");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- avatar-geometry`
Expected: FAIL —— `buildRoads is not a function`

- [ ] **Step 3: 写实现**

在 `src/views/avatar/avatar-geometry.ts` 末尾追加：

```ts
/**
 * 驿道不另存数据：按 points 数组顺序把相邻两点用 A* 连起来。
 * 这样驿道自然会走桥、绕山，不会出现「驿道横穿江面」的穿帮，
 * 顺带把可达性验证做掉 —— 五段只要有解，六点位就连成一条通路。
 * 某段无解时该段返回空数组（调用方跳过绘制）。
 */
export function buildRoads(points: Pick<GamePoint, "x" | "y">[]): Cell[][] {
  const range = yRange(points);
  const grid = buildGrid(points);
  const roads: Cell[][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = snapToWalkable(grid, worldToCell(projectX(points[i].x), projectY(points[i].y, range)));
    const b = snapToWalkable(
      grid,
      worldToCell(projectX(points[i + 1].x), projectY(points[i + 1].y, range))
    );
    if (!a || !b) {
      roads.push([]);
      continue;
    }
    roads.push(astar(grid, a, b) ?? []);
  }
  return roads;
}

/** 世界坐标折线 → SVG path 的 d 属性 */
export function toPathD(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  const head = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  const tail = pts.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  return [head, ...tail].join(" ");
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- avatar-geometry`
Expected: PASS（27 项）

- [ ] **Step 5: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/avatar-geometry.ts jianghu-client/demo/tests/avatar-geometry.test.ts
git commit -m "feat(demo-avatar): 驿道由相邻点位 A* 生成，顺带锁死六点位可达性"
```

---

## Task 5: `useWalker.ts` —— rAF 驱动

**Files:**
- Create: `jianghu-client/demo/src/views/avatar/useWalker.ts`

这个文件的时序只能靠冒烟验证（vitest 不跑 rAF），所以 Step 1 直接写实现，Step 2 用 typecheck + 后续 Task 的冒烟兜底。

- [ ] **Step 1: 写实现**

创建 `src/views/avatar/useWalker.ts`：

```ts
import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import {
  ARRIVE_RADIUS,
  WALK_SPEED,
  camTarget,
  clampTy,
  pathToWorld,
  stepCamera,
  type Cell,
} from "./avatar-geometry";

/** 单帧 dt 上限：标签页隐藏再回来时避免角色瞬移出屏 */
const MAX_DT = 0.05;

export interface Walker {
  x: Ref<number>;
  y: Ref<number>;
  facing: Ref<1 | -1>;
  walking: Ref<boolean>;
  camTy: Ref<number>;
  goal: Ref<string>;
  walkTo: (path: Cell[], onArrive: () => void) => void;
  halt: () => void;
  reset: () => void;
}

/**
 * 角色推进 + 相机缓动。位置完全由路径插值决定，不反向依赖相机，避免耦合抖动。
 * 抵达判定按「剩余路径长度 ≤ ARRIVE_RADIUS」——角色因此停在点位旁边而不是压在图标的点上。
 */
export function useWalker(spawn: { x: number; y: number }): Walker {
  const x = ref(spawn.x);
  const y = ref(spawn.y);
  const facing = ref<1 | -1>(1);
  const walking = ref(false);
  const camTy = ref(clampTy(camTarget(spawn.y)));
  const goal = ref("");

  /** 世界坐标折线；route[0] 会被改写成角色当前位置，避免改道时回跳 */
  let route: { x: number; y: number }[] = [];
  let seg = 0;
  let arrived: (() => void) | null = null;
  let raf = 0;
  let last = 0;

  function remaining(): number {
    if (route.length === 0 || seg >= route.length) return 0;
    let total = Math.hypot(route[seg].x - x.value, route[seg].y - y.value);
    for (let i = seg + 1; i < route.length; i++) {
      total += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
    }
    return total;
  }

  function finish() {
    walking.value = false;
    route = [];
    seg = 0;
    const fn = arrived;
    arrived = null;
    if (fn) fn();
  }

  function advance(dt: number) {
    let budget = WALK_SPEED * dt;
    while (budget > 0 && seg < route.length) {
      const target = route[seg];
      const dx = target.x - x.value;
      const dy = target.y - y.value;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        x.value = target.x;
        y.value = target.y;
        budget -= d;
        seg += 1;
      } else {
        const k = budget / d;
        x.value += dx * k;
        y.value += dy * k;
        if (Math.abs(dx) > 0.5) facing.value = dx >= 0 ? 1 : -1;
        budget = 0;
      }
    }
    if (remaining() <= ARRIVE_RADIUS) finish();
  }

  function tick(now: number) {
    const dt = last === 0 ? 0 : Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    if (walking.value) advance(dt);
    camTy.value = stepCamera(camTy.value, clampTy(camTarget(y.value)), dt);
    raf = requestAnimationFrame(tick);
  }

  function walkTo(path: Cell[], onArrive: () => void) {
    const world = pathToWorld(path);
    if (world.length > 0) world[0] = { x: x.value, y: y.value };
    route = world;
    seg = 0;
    arrived = onArrive;
    const end = world[world.length - 1];
    goal.value = end ? `${end.x.toFixed(1)},${end.y.toFixed(1)}` : "";
    // 路径总长小于抵达半径：直接视为已抵达，不做「原地挪一下」的移动
    if (remaining() <= ARRIVE_RADIUS) {
      finish();
      return;
    }
    walking.value = true;
  }

  function halt() {
    walking.value = false;
    route = [];
    seg = 0;
    arrived = null;
  }

  function reset() {
    halt();
    x.value = spawn.x;
    y.value = spawn.y;
    facing.value = 1;
    camTy.value = clampTy(camTarget(spawn.y));
    goal.value = "";
  }

  onMounted(() => {
    raf = requestAnimationFrame(tick);
  });
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
  });

  return { x, y, facing, walking, camTy, goal, walkTo, halt, reset };
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`
Expected: 通过（此时 `useWalker.ts` 尚未被任何组件引用，`vue-tsc` 仍会检查它；如报未使用变量请检查是否漏了 `halt`）

- [ ] **Step 3: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/useWalker.ts
git commit -m "feat(demo-avatar): 角色推进与相机缓动时序，抵达按剩余路径判定"
```

---

## Task 6: `AvatarMap.vue` —— SVG 长卷

**Files:**
- Create: `jianghu-client/demo/src/views/avatar/AvatarMap.vue`

- [ ] **Step 1: 写组件**

创建 `src/views/avatar/AvatarMap.vue`：

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import type { GamePoint, PointState } from "../../shared/types";
import { BRIDGES, TERRAIN } from "./avatar-terrain";
import { MAP_H, MAP_W, VIEW_H, VIEW_W, projectX, projectY, yRange } from "./avatar-geometry";

const props = defineProps<{
  points: { point: GamePoint; state: PointState }[];
  roads: string[];
  walkerX: number;
  walkerY: number;
  facing: number;
  walking: boolean;
  camTy: number;
  stuckId: string | null;
}>();

const emit = defineEmits<{
  pick: [point: GamePoint];
  walk: [target: { x: number; y: number }];
}>();

const root = ref<SVGSVGElement | null>(null);

/** 重映射区间动态取自内容层，改内容坐标不需要动这里 */
const range = computed(() => yRange(props.points.map((entry) => entry.point)));
const px = (x: number) => projectX(x);
const py = (y: number) => projectY(y, range.value);

const waters = computed(() => TERRAIN.filter((t) => t.kind === "water"));
const hills = computed(() => TERRAIN.filter((t) => t.kind === "hill"));
const toPoints = (poly: { points: [number, number][] }) =>
  poly.points.map(([x, y]) => `${x},${y}`).join(" ");

const worldTransform = computed(() => `translate(0 ${props.camTy})`);

/** 客户端坐标 → 地图坐标。slice 溢出的部分被居中裁掉，需补回来 */
function toMap(e: MouseEvent): { x: number; y: number } {
  const svg = root.value;
  if (!svg) return { x: 0, y: 0 };
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  const k = Math.max(rect.width / VIEW_W, rect.height / VIEW_H);
  const cropX = (VIEW_W * k - rect.width) / 2;
  const cropY = (VIEW_H * k - rect.height) / 2;
  const vx = (e.clientX - rect.left + cropX) / k;
  const vy = (e.clientY - rect.top + cropY) / k;
  return { x: vx, y: vy - props.camTy };
}

function onGround(e: MouseEvent) {
  emit("walk", toMap(e));
}
</script>

<template>
  <svg
    ref="root"
    class="map"
    :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
    preserveAspectRatio="xMidYMid slice"
    role="img"
    aria-label="行脚图"
  >
    <defs>
      <linearGradient id="avatarFar3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#dde2da" stop-opacity="0.9" />
        <stop offset="60%" stop-color="#dde2da" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#dde2da" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="avatarFar2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#cdd5ca" stop-opacity="0.9" />
        <stop offset="60%" stop-color="#cdd5ca" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#cdd5ca" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="avatarFar1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#bcc7bb" stop-opacity="0.88" />
        <stop offset="60%" stop-color="#bcc7bb" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#bcc7bb" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- 地面点击层：铺在最底下，地物与驿道全部 pointer-events:none，
         点位画在它上面，因此「点图标」与「点地面」天然分流 -->
    <rect
      class="ground"
      x="0"
      y="0"
      :width="VIEW_W"
      :height="VIEW_H"
      @click="onGround"
    />

    <g class="world" :transform="worldTransform" :data-ty="camTy">
      <rect class="paper" x="0" y="0" :width="MAP_W" :height="MAP_H" />
      <rect class="paper-edge" x="1.5" y="1.5" :width="MAP_W - 3" :height="MAP_H - 3" />

      <!-- 远山三层：脊线走平滑弧，最上一层穿过「山巅孤松」，令其立于山巅 -->
      <path
        class="far"
        fill="url(#avatarFar3)"
        d="M0,450 Q100,290 200,410 T430,410 T619,360 T720,430 L720,2560 L0,2560 Z"
      />
      <path
        class="far"
        fill="url(#avatarFar2)"
        d="M0,780 Q130,620 260,780 T520,790 T720,760 L720,2560 L0,2560 Z"
      />
      <path
        class="far"
        fill="url(#avatarFar1)"
        d="M0,1100 Q150,930 300,1110 T600,1090 T720,1050 L720,2560 L0,2560 Z"
      />

      <!-- 水道：与栅格化同一份多边形数据 -->
      <polygon
        v-for="poly in waters"
        :key="poly.id"
        class="water"
        :points="toPoints(poly)"
      />

      <!-- 山体林地 -->
      <polygon v-for="poly in hills" :key="poly.id" class="hill" :points="toPoints(poly)" />

      <!-- 桥面与石磴 -->
      <rect
        v-for="b in BRIDGES"
        :key="b.id"
        class="bridge"
        :x="b.x"
        :y="b.y"
        :width="b.w"
        :height="b.h"
      />

      <!-- 驿道：相邻点位之间的 A* 路径，与角色走的路是同一套算法 -->
      <path v-for="(d, i) in props.roads" :key="`road-${i}`" class="road" :d="d" />

      <!-- 点位印章：三态 -->
      <g
        v-for="entry in props.points"
        :key="entry.point.id"
        class="node"
        :class="[`node-${entry.state}`, { 'node-stuck': props.stuckId === entry.point.id }]"
        :transform="`translate(${px(entry.point.x)}, ${py(entry.point.y)})`"
        role="button"
        tabindex="0"
        :aria-label="entry.point.name"
        @click="emit('pick', entry.point)"
        @keydown.enter="emit('pick', entry.point)"
      >
        <g class="tilt">
          <circle v-if="entry.state === 'ready'" class="pulse" r="34" />
          <circle class="seal" r="34" />
          <text class="seal-char" dominant-baseline="central">{{ entry.point.seal }}</text>
        </g>
      </g>

      <!-- 角色：剪影四人形图元（头 / 袍 / 双腿 / 一臂），纯 SVG + CSS 动画 -->
      <g
        class="walker"
        :class="{ on: props.walking }"
        :transform="`translate(${props.walkerX} ${props.walkerY}) scale(${props.facing} 1)`"
        :data-x="props.walkerX.toFixed(1)"
        :data-y="props.walkerY.toFixed(1)"
        :data-walking="props.walking ? '1' : '0'"
      >
        <circle class="head" cx="0" cy="-44" r="8" />
        <path class="robe" d="M-10,-36 L10,-36 L14,-4 L-14,-4 Z" />
        <line class="arm" x1="-9" y1="-30" x2="-15" y2="-13" />
        <line class="leg leg-a" x1="-5" y1="-4" x2="-6" y2="9" />
        <line class="leg leg-b" x1="5" y1="-4" x2="6" y2="9" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.map {
  display: block;
  width: 100%;
  height: 100%;
}

.ground {
  fill: #ded3bf;
  cursor: pointer;
}

.paper {
  fill: #f7f1e3;
  filter: drop-shadow(0 8px 20px rgba(74, 58, 38, 0.36));
  pointer-events: none;
}
.paper-edge { fill: none; stroke: #ddd0b6; stroke-width: 3; pointer-events: none; }
.far { stroke: none; pointer-events: none; }

.water {
  fill: #b9cdcf;
  opacity: 0.62;
  pointer-events: none;
}
.hill {
  fill: #c3c9b8;
  opacity: 0.85;
  pointer-events: none;
}
.bridge {
  fill: #d6c3a0;
  stroke: #b8a381;
  stroke-width: 2;
  opacity: 0.95;
  pointer-events: none;
}

.road {
  fill: none;
  stroke: #b5a184;
  stroke-width: 11;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 24 20;
  opacity: 0.75;
  pointer-events: none;
}

.node { cursor: pointer; outline: none; }
.tilt { transform-box: fill-box; transform-origin: center; }
.node-done .tilt { transform: rotate(-6deg); }

.node-locked { opacity: 0.55; }
.node-locked .seal { fill: #d5cfc5; stroke: #9c948a; stroke-width: 2; }
.node-locked .seal-char { fill: #6f6862; }

.node-stuck { opacity: 0.4; }

.node-ready .seal { fill: #fdf8f0; stroke: #b3402f; stroke-width: 3; }
.node-ready .seal-char { fill: #b3402f; }

.node-done .seal { fill: #b3402f; stroke: #8f2f21; stroke-width: 2; }
.node-done .seal-char { fill: #fdf8f0; }

.seal-char {
  font-family: "STKaiti", "KaiTi", "Songti SC", serif;
  font-size: 34px;
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

/* 角色：墨色与全局墨色一致 */
.walker { pointer-events: none; }
.head { fill: #3b342c; }
.robe { fill: #3b342c; }
.arm { stroke: #3b342c; stroke-width: 5; stroke-linecap: round; }
.leg { stroke: #3b342c; stroke-width: 5; stroke-linecap: round; }
.walker .tilt { transform-box: fill-box; transform-origin: center bottom; }

.walker.on .leg-a,
.walker.on .leg-b { transform-box: fill-box; transform-origin: top center; }
.walker.on .leg-a { animation: leg-swing 0.5s ease-in-out infinite; }
.walker.on .leg-b { animation: leg-swing 0.5s ease-in-out infinite reverse; }
.walker.on .robe,
.walker.on .head,
.walker.on .arm {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: walk-bob 0.5s ease-in-out infinite;
}

@keyframes leg-swing {
  0%, 100% { transform: rotate(-14deg); }
  50% { transform: rotate(14deg); }
}
@keyframes walk-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`
Expected: 通过

- [ ] **Step 3: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/AvatarMap.vue
git commit -m "feat(demo-avatar): SVG 长卷，地物/驿道/点位/剪影角色与地面点击分流"
```

---

## Task 7: 卡片 · 落章 · 见闻录册

**Files:**
- Create: `jianghu-client/demo/src/views/avatar/AvatarCard.vue`
- Create: `jianghu-client/demo/src/views/avatar/AvatarStamp.vue`
- Create: `jianghu-client/demo/src/views/avatar/AvatarPanel.vue`

三个文件分别是 `atlas/AtlasCard.vue`、`atlas/AtlasStamp.vue`、`atlas/AtlasPanel.vue` 的原样副本，只改组件名与相对路径。DOM 钩子（`.card` / `.card-close` / `.interacts` / `.reward` / `.panel` / `.tab` / `.grid` / `.stamp-board`）必须与 A/B 完全一致，冒烟脚本才能同构复用。

- [ ] **Step 1: 复制卡片**

把 `src/views/atlas/AtlasCard.vue` 全文复制为 `src/views/avatar/AvatarCard.vue`，**不改任何 class 名、不改文案、不改交互**。相对路径原本就是 `../../shared/engine`、`../../shared/types`、`../interacts/*`，与 C 版层级一致，无需调整。

- [ ] **Step 2: 复制落章**

把 `src/views/atlas/AtlasStamp.vue` 全文复制为 `src/views/avatar/AvatarStamp.vue`。注释里的「点位可能已被拖出视口」改成「点位会随镜头移动」，其余不动。

- [ ] **Step 3: 复制见闻录册**

把 `src/views/atlas/AtlasPanel.vue` 全文复制为 `src/views/avatar/AvatarPanel.vue`，不改任何 class 名与结构。

- [ ] **Step 4: 类型检查**

Run: `npm run typecheck`
Expected: 通过

- [ ] **Step 5: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/AvatarCard.vue jianghu-client/demo/src/views/avatar/AvatarStamp.vue jianghu-client/demo/src/views/avatar/AvatarPanel.vue
git commit -m "feat(demo-avatar): 卡片/落章/见闻录册三件套，DOM 钩子与 A/B 保持同构"
```

---

## Task 8: `AvatarApp.vue` —— 组装与交互语义

**Files:**
- Create: `jianghu-client/demo/src/views/avatar/AvatarApp.vue`

- [ ] **Step 1: 写组件**

创建 `src/views/avatar/AvatarApp.vue`：

```vue
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storage } from "../../platform";
import { albumEntries, points, sections } from "../../shared/content";
import { applyEffects, createState, markVisited } from "../../shared/engine";
import { clear, load, save } from "../../shared/persist";
import { albumGaps, pointState, progress, sectionUnlocked } from "../../shared/rules";
import type { GamePoint, GameState } from "../../shared/types";
import AvatarCard from "./AvatarCard.vue";
import AvatarMap from "./AvatarMap.vue";
import AvatarPanel from "./AvatarPanel.vue";
import AvatarStamp from "./AvatarStamp.vue";
import {
  SPAWN,
  astar,
  buildGrid,
  buildRoads,
  pathToWorld,
  projectX,
  projectY,
  snapToWalkable,
  toPathD,
  worldToCell,
  yRange,
} from "./avatar-geometry";
import { useWalker } from "./useWalker";

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

const prog = computed(() => progress(state.value, points.length, albumEntries.length));
const gaps = computed(() => albumGaps(state.value, albumEntries));
const scorePercent = computed(() => {
  const full = prog.value.totalStamps * 10;
  return full === 0 ? 0 : Math.min(100, Math.round((prog.value.score / full) * 100));
});
const nextLockedSection = computed(() => sections.find((s) => !sectionUnlocked(s, state.value)));

/** 地图层：网格与驿道都只算一次，内容层坐标变了也不用手改这里 */
const range = yRange(points);
const grid = buildGrid(points);
const roads = computed(() =>
  buildRoads(points)
    .filter((cells) => cells.length > 0)
    .map((cells) => toPathD(pathToWorld(cells)))
);

const walker = useWalker(SPAWN);
const { x: walkerX, y: walkerY, facing, walking, camTy, goal, walkTo, reset: resetWalker } = walker;

const active = ref<GamePoint | null>(null);
const hint = ref("");
const stuckId = ref<string | null>(null);
const albumOpen = ref(false);
const slot = ref<HTMLElement | null>(null);
const burst = ref<{
  seal: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
} | null>(null);

/** 预约触发：只有抵达这个点位才开卡；点空白则为 null */
let pending: string | null = null;

const pointCell = (point: GamePoint) =>
  worldToCell(projectX(point.x), projectY(point.y, range));

function goTo(cell: [number, number], pointId: string | null) {
  const from = snapToWalkable(grid, worldToCell(walkerX.value, walkerY.value));
  const to = snapToWalkable(grid, cell);
  const path = from && to ? astar(grid, from, to) : null;
  if (!path) {
    // 不静默失败：提示 + 把该点位渲染成灰态
    hint.value = "此路不通";
    stuckId.value = pointId;
    return;
  }
  stuckId.value = null;
  pending = pointId;
  walkTo(path, onArrive);
}

function onArrive() {
  const id = pending;
  pending = null;
  if (!id) return;
  const point = points.find((p) => p.id === id);
  if (point) active.value = point;
}

function pick(point: GamePoint) {
  if (active.value) return; // 卡片开启期间不接受新的点击
  const ps = pointState(point, state.value, sectionsById[point.sectionId]);
  if (ps === "locked") {
    hint.value = point.unlockHint ?? "此路暂不可通行";
    return;
  }
  hint.value = "";
  albumOpen.value = false;
  goTo(pointCell(point), point.id);
}

function onGround(target: { x: number; y: number }) {
  if (active.value) return; // 卡片开启期间不接受新的点击
  hint.value = "";
  goTo(worldToCell(target.x, target.y), null);
}

function closeCard() {
  if (active.value) state.value = markVisited(state.value, active.value.id);
  active.value = null;
  pending = null;
}

/** 落章不飞向地图点位（点位会随镜头移动），改飞向 HUD 的印章槽 */
function onSolved(from: { x: number; y: number }) {
  const point = active.value;
  if (!point) return;
  state.value = applyEffects(state.value, point.effect);
  const box = slot.value?.getBoundingClientRect();
  burst.value = {
    seal: point.seal,
    from,
    to: box
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : from,
  };
}

function restart() {
  if (!window.confirm("重开会清空行脚印与见闻录，确定吗？")) return;
  clear(storage);
  state.value = createState();
  active.value = null;
  albumOpen.value = false;
  burst.value = null;
  hint.value = "";
  stuckId.value = null;
  pending = null;
  resetWalker();
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
        <span ref="slot" class="hud-stat"
          >行脚印 {{ prog.stamps }}/{{ prog.totalStamps }}</span
        >
        <button class="hud-btn" type="button" @click="albumOpen = true">见闻录</button>
        <button class="hud-btn" type="button" @click="restart">重开</button>
      </div>
    </header>

    <p v-if="nextLockedSection" class="gate">
      {{ nextLockedSection.name }} 解锁需：行脚印 {{ prog.stamps }}/{{
        nextLockedSection.requiresStamps
      }}
      · 见闻值 {{ prog.score }}/{{ nextLockedSection.requiresScore }}
    </p>

    <main class="stage">
      <AvatarMap
        :points="nodes"
        :roads="roads"
        :walker-x="walkerX"
        :walker-y="walkerY"
        :facing="facing"
        :walking="walking"
        :cam-ty="camTy"
        :stuck-id="stuckId"
        @pick="pick"
        @walk="onGround"
      />
      <p class="walker-goal" hidden>{{ goal }}</p>
      <Transition name="fade">
        <p v-if="hint" class="hint" @click="hint = ''">{{ hint }}</p>
      </Transition>
    </main>

    <AvatarStamp
      v-if="burst"
      :seal="burst.seal"
      :from="burst.from"
      :to="burst.to"
      @done="burst = null"
    />

    <Transition name="rise">
      <AvatarCard
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
      <AvatarPanel
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 16px;
  letter-spacing: 1px;
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
.hud-side { display: flex; align-items: center; gap: 6px; }
.hud-stat { font-size: 12px; color: #6f665c; white-space: nowrap; }
.hud-btn {
  padding: 5px 10px;
  border: 1px solid #cbbfa9;
  border-radius: 999px;
  background: #fdfaf3;
  font-size: 12px;
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
  background: #ded3bf;
  /* C 版不接管手势，但长卷本身也不该被浏览器滚动带走 */
  overflow: hidden;
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

- [ ] **Step 2: 跑单测确认没碰坏几何层**

Run: `npm test`
Expected: PASS —— 原有 `rules` / `engine` / `persist` / `content` / `atlas-geometry` 全绿，加 `avatar-geometry` 33 项

- [ ] **Step 3: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/views/avatar/AvatarApp.vue
git commit -m "feat(demo-avatar): 点哪走哪编排，预约触发与改道语义"
```

---

## Task 9: 入口与脚本

**Files:**
- Modify: `jianghu-client/demo/src/main.ts`
- Modify: `jianghu-client/demo/package.json`

- [ ] **Step 1: 改入口**

把 `src/main.ts` 全文改成：

```ts
import { createApp } from "vue";
import AlbumApp from "./views/album/AlbumApp.vue";
import AtlasApp from "./views/atlas/AtlasApp.vue";
import AvatarApp from "./views/avatar/AvatarApp.vue";
import "./style.css";

// A/B/C 三版表现层靠 URL 参数切换，暂不引入 vue-router：
// /jianghu1/            → A 版（册页感，一屏可览）
// /jianghu1/?v=atlas    → B 版（竖向长卷，拖拽 + 缩放）
// /jianghu1/?v=avatar   → C 版（长卷 + 角色，点哪走哪）
const variant = new URLSearchParams(location.search).get("v");
const App =
  variant === "atlas" ? AtlasApp : variant === "avatar" ? AvatarApp : AlbumApp;

createApp(App).mount("#app");
```

- [ ] **Step 2: 加冒烟脚本入口**

在 `package.json` 的 `scripts` 里，`"smoke:atlas": "node scripts/smoke-atlas.cjs"` 之后加一行：

```json
    "smoke:avatar": "node scripts/smoke-avatar.cjs"
```

注意：`scripts` 块内除这一行外一个字不改，`dependencies` / `devDependencies` 不动。

- [ ] **Step 3: 起服务看一眼**

Run（两个终端）：
```bash
npm run dev
```
然后浏览器打开 `http://localhost:5173/?v=avatar`
Expected：看到长卷、渡口附近的墨色小人、印章点位与虚线驿道；点空白地面小人走过去；点「渡口告示」小人走过去后卡片升起；点「守山僧」只弹门槛提示。**同时确认 `?v=atlas` 与默认路径仍是原样。**

- [ ] **Step 4: 类型检查与构建**

Run: `npm run typecheck` 然后 `npm run build`
Expected: 两条都通过（`build` 会跑 `vue-tsc --noEmit && vite build`）

- [ ] **Step 5: 提交（先问用户）**

```bash
git add jianghu-client/demo/src/main.ts jianghu-client/demo/package.json
git commit -m "feat(demo-avatar): ?v=avatar 入口与 smoke:avatar 脚本"
```

---

## Task 10: 冒烟脚本 `smoke-avatar.cjs` + 三版回归

**Files:**
- Create: `jianghu-client/demo/scripts/smoke-avatar.cjs`

- [ ] **Step 1: 写冒烟脚本**

创建 `scripts/smoke-avatar.cjs`：

```js
/**
 * C 版（views/avatar）端到端冒烟：几何自证 + 点哪走哪 + 预约触发 + 改道 + 镜头跟随 + 完整闭环。
 *
 * 运行：npm run smoke:avatar（需 dev server 已在 http://localhost:5173 启动）
 * 生产：SMOKE_URL=https://game.joho.cn/jianghu1/ SMOKE_INSECURE=1 npm run smoke:avatar
 *
 * 注意：C 版不能像 A/B 那样直接点任意点位 —— 点位可能不在视口内，
 * 必须先「走过去」把镜头带到那里。所以有 approach() 这套先行走再点名的辅助。
 */

const { chromium } = require("playwright");

const BASE = (process.env.SMOKE_URL || "http://localhost:5173/") + "?v=avatar";
const SHORT = { timeout: 5000 };
const WALK = { timeout: 15000 };

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

function near(actual, expected, tol = 1.5) {
  return Math.abs(Number(actual) - expected) <= tol;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    ignoreHTTPSErrors: process.env.SMOKE_INSECURE === "1",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

  // ---------- 读取 ----------

  const ty = () => page.locator(".world").getAttribute("data-ty");
  const stat = () => page.locator(".hud-stat").innerText();
  const walker = () =>
    page.locator(".walker").evaluate((el) => ({
      x: Number(el.dataset.x),
      y: Number(el.dataset.y),
      walking: el.dataset.walking,
    }));
  const goal = () =>
    page.locator(".walker-goal").innerText().then((s) => s.trim());
  const stageBox = () => page.locator(".stage").boundingBox();
  const nodeCenter = async (name) => {
    const box = await page.locator(`.node[aria-label="${name}"]`).boundingBox();
    return box && { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  async function expectSelector(selector, name, opts = SHORT) {
    try {
      await page.waitForSelector(selector, opts);
      check(name, true);
      return true;
    } catch {
      check(name, false, `未见 ${selector}`);
      return false;
    }
  }

  async function settle() {
    // 先等「开始走」，再等「停下来」；两步都带兜底，避免时序抖动
    await page
      .waitForFunction(() => document.querySelector(".walker")?.dataset.walking === "1", null, {
        timeout: 3000,
      })
      .catch(() => {});
    await page.waitForFunction(
      () => document.querySelector(".walker")?.dataset.walking === "0",
      null,
      WALK
    );
    // 相机缓动收尾，镜头稳定后再读 ty；stepCamera 有残差落位（<0.5 直接吸附），但停走瞬间
    // 相机可能仍离目标较远，需给足缓动时间，冒烟才咬得准 data-ty
    await page.waitForTimeout(1200);
  }

  async function tapGround(dir) {
    const s = await stageBox();
    const x = s.x + 30; // 世界 x ≈ 36，六个点位最近的也在 115 之外，不会误点图标
    const y = dir === "up" ? s.y + 30 : s.y + s.height - 30;
    await page.mouse.click(x, y);
    await settle();
  }

  const nodeInStage = async (name) => {
    const s = await stageBox();
    const n = await nodeCenter(name);
    return (
      !!n &&
      n.y > s.y + 10 &&
      n.y < s.y + s.height - 10 &&
      n.x > s.x + 10 &&
      n.x < s.x + s.width - 10
    );
  };

  /** 点名之前先走过去，把镜头带到能看见它的位置；最多走 8 趟 */
  async function approach(name) {
    for (let i = 0; i < 8; i++) {
      if (await nodeInStage(name)) return true;
      const s = await stageBox();
      const n = await nodeCenter(name);
      await tapGround(!n || n.y < s.y ? "up" : "down");
    }
    return nodeInStage(name);
  }

  async function walkTo(name) {
    const ok = await approach(name);
    if (!ok) {
      check(`「${name}」能被走到可见位置`, false);
      return false;
    }
    await page.locator(`.node[aria-label="${name}"]`).click({ force: true });
    await settle();
    return true;
  }

  // ---------- 卡片操作（与 A/B 同名 DOM 钩子） ----------

  async function openPoint(name) {
    if (!(await walkTo(name))) return false;
    await page.waitForSelector(".card", SHORT);
    return true;
  }

  async function waitSolved() {
    return expectSelector(".reward", "答对后出现 .reward");
  }

  async function closeCard() {
    await page.locator(".card-close").click();
    await page.waitForSelector(".card", { state: "detached", ...SHORT });
  }

  async function pickChoice(label) {
    await page.waitForSelector(".interact", SHORT);
    await page.locator(".interact").getByText(label, { exact: true }).click();
  }

  async function readRowLabels() {
    await page.waitForSelector(".rows .row", SHORT);
    const raw = await page.locator(".rows .row .row-label").allInnerTexts();
    return raw.map((s) => s.trim());
  }

  async function fillOrder(target) {
    await page.waitForSelector(".interact", SHORT);
    for (let i = 0; i < target.length; i++) {
      const labels = await readRowLabels();
      const at = labels.indexOf(target[i]);
      for (let k = at; k > i; k--) {
        await page.locator(".rows .row").nth(k).getByLabel("上移").click();
      }
    }
    await page.locator(".interact .primary").click();
  }

  async function fillCompose(words) {
    await page.waitForSelector(".interact", SHORT);
    for (const w of words) {
      await page
        .locator(".chips .chip")
        .filter({ hasText: new RegExp(`^${w}$`) })
        .click();
    }
    await page.locator(".interact .primary").click();
  }

  // ---------- 一、首屏几何自证 ----------

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".map");

  await expectSelector(".hud-title", "首屏渲染出 HUD");
  check("首屏 6 枚印章", (await page.locator(".node").count()) === 6);
  check("首屏行脚印 0/6", (await stat()).includes("0/6"), await stat());
  check("首屏 5 段驿道", (await page.locator(".road").count()) === 5);
  check("首屏 2 条水道 + 4 块山体", (await page.locator(".water").count()) === 2 && (await page.locator(".hill").count()) === 4);
  check("首屏 2 处桥面", (await page.locator(".bridge").count()) === 2);
  check("镜头贴长卷下缘 ty = -1280", (await ty()) === "-1280", await ty());

  const w0 = await walker();
  check("角色停在渡口附近（约 200,2280）", near(w0.x, 200) && near(w0.y, 2280), `${w0.x},${w0.y}`);
  check("开局角色静止", w0.walking === "0");

  // ---------- 二、点哪走哪：第一个点位闭环 ----------

  await page.locator('.node[aria-label="渡口告示"]').click({ force: true });
  await page.waitForFunction(
    () => document.querySelector(".walker")?.dataset.walking === "1",
    null,
    SHORT
  );
  check("点「渡口告示」后角色开始走动", true);
  check("角色确实移动了", (await walker()).y !== w0.y, `${w0.y} → ${(await walker()).y}`);
  await settle();
  await expectSelector(".card", "走到「渡口告示」旁才升起卡片");
  check(
    "角色停在点位旁边而非压在图标上",
    Math.hypot((await walker()).x - 115.2, (await walker()).y - 2160) > 30
  );
  await pickChoice("像是急着贴上去的，印泥都没干透");
  await waitSolved();
  await closeCard();
  check("第一枚落章后行脚印 1/6", (await stat()).includes("1/6"), await stat());

  await openPoint("江滩酒坛");
  await fillOrder(["拂去坛身潮苔", "敲松封口干泥", "启封闻香"]);
  await waitSolved();
  await closeCard();
  check("第二枚落章后行脚印 2/6", (await stat()).includes("2/6"), await stat());

  // ---------- 三、点空白：只走，不弹卡 ----------

  await tapGround("up");
  check("点空白地面：角色移动了", near((await walker()).y, 2280) === false, String((await walker()).y));
  check("点空白地面：没有卡片", (await page.locator(".card").count()) === 0);

  // ---------- 四、走动中再点即改道 ----------

  const s1 = await stageBox();
  await page.mouse.click(s1.x + 30, s1.y + 30);
  await page.waitForFunction(
    () => document.querySelector(".walker")?.dataset.walking === "1",
    null,
    SHORT
  );
  const goalA = await goal();
  await page.mouse.click(s1.x + 30, s1.y + s1.height - 30);
  await page.waitForTimeout(120);
  const goalB = await goal();
  check("走动中再点：目标即刻改变（改道生效）", goalA !== goalB, `${goalA} → ${goalB}`);
  await settle();

  // ---------- 五、locked 点位：只提示，不动 ----------

  await approach("守山僧");
  const beforeLocked = await walker();
  await page.locator('.node[aria-label="守山僧"]').click({ force: true });
  await expectSelector(".hint", "未解锁的守山僧给提示气泡");
  check(
    "门槛文案为段二门槛",
    (await page.locator(".hint").innerText()).includes("行脚印满 3 枚"),
    await page.locator(".hint").innerText()
  );
  const afterLocked = await walker();
  check(
    "点 locked 点位角色不移动",
    beforeLocked.x === afterLocked.x && beforeLocked.y === afterLocked.y
  );
  check("点 locked 点位不弹卡", (await page.locator(".card").count()) === 0);

  // ---------- 六、回到南岸收下老船家，段二解锁 ----------

  await openPoint("老船家");
  await fillCompose(["总得", "有个", "由头", "才", "好"]);
  await waitSolved();
  await closeCard();
  check("第三枚落章后行脚印 3/6", (await stat()).includes("3/6"), await stat());
  check("段二解锁后门槛提示条消失", (await page.locator(".gate").count()) === 0);

  // ---------- 七、镜头确实跟随：老船家 → 龙潭 ----------

  const tyBefore = Number(await ty());
  await openPoint("龙潭");
  await pickChoice("掬一捧水饮下");
  await waitSolved();
  await closeCard();
  const tyAfter = Number(await ty());
  check(
    "走完「老船家 → 龙潭」后镜头位移明显（> 300）",
    Math.abs(tyAfter - tyBefore) > 300,
    `${tyBefore} → ${tyAfter}`
  );
  check("第四枚落章后行脚印 4/6", (await stat()).includes("4/6"), await stat());

  // ---------- 八、收官 ----------

  await openPoint("守山僧");
  await fillOrder(["山下来了一纸封路告示", "雪松仲秋结赤果", "前夜信香忽断，赤果被盗"]);
  await waitSolved();
  await closeCard();
  check("第五枚落章后行脚印 5/6", (await stat()).includes("5/6"), await stat());

  await openPoint("山巅孤松");
  await fillCompose(["山高", "路远"]);
  await waitSolved();
  await closeCard();
  check("收官行脚印 6/6", (await stat()).includes("6/6"), await stat());
  check("收官镜头贴长卷上缘 ty = 0", near(await ty(), 0), await ty());

  // ---------- 九、见闻录 / 重看 / 持久化 / 重开 ----------

  await page.getByRole("button", { name: "见闻录" }).click();
  await page.waitForSelector(".panel");
  check("见闻录已录 6 条", (await page.locator(".panel").innerText()).includes("已录 6 条"));
  await page.locator(".panel .close").click();
  await page.waitForSelector(".panel", { state: "detached", ...SHORT });

  await openPoint("老船家");
  await expectSelector(".reward", "已 done 点位直接显示奖励条");
  check("已 done 点位无互动框", (await page.locator(".interact").count()) === 0);
  await closeCard();
  check("重看后行脚印仍 6/6", (await stat()).includes("6/6"), await stat());

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".map");
  check("刷新后存档保持 6/6", (await stat()).includes("6/6"), await stat());
  check("刷新后镜头回到长卷下缘", (await ty()) === "-1280", await ty());
  check("刷新后角色回到出生点", near((await walker()).x, 200) && near((await walker()).y, 2280));

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "重开" }).click();
  await page.waitForFunction(
    () => document.querySelector(".hud-stat")?.textContent?.includes("0/6"),
    null,
    SHORT
  );
  check("重开后复位 0/6", (await stat()).includes("0/6"), await stat());
  check("重开后角色回出生点", near((await walker()).x, 200), String((await walker()).x));

  check("console 无报错", consoleErrors.length === 0, consoleErrors.join(" | "));

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
```

- [ ] **Step 2: 跑 C 版冒烟**

Run（dev server 已在 5173）：
```bash
npm run smoke:avatar
```
Expected: 全部 PASS（约 34 项），退出码 0

若「角色停在点位旁边而非压在图标上」失败，说明 `ARRIVE_RADIUS` 没生效 —— 检查 `useWalker.advance()` 里 `remaining() <= ARRIVE_RADIUS` 的判定是否在移动之后。**不要靠改 `ARRIVE_RADIUS` 蒙过去。**

若「走完老船家 → 龙潭后镜头位移明显」失败，先确认 `camTy` 是否真的在跟随（`.world` 的 `data-ty` 有变化），再查 `stepCamera` 的 `CAM_SMOOTH`。

- [ ] **Step 3: 三版共存回归（零回归门禁）**

Run（dev server 已在 5173）：
```bash
npm run smoke
npm run smoke:atlas
```
Expected: A 版 24 项全绿、B 版全绿。任何一项挂掉都说明改动漏到了 `shared/` 或 `platform/`，必须回退而不是改断言。

- [ ] **Step 4: 构建与截图自检**

Run:
```bash
npm run build
```
Expected: 通过。

截图自检（用 `.superpowers/shot.cjs` 的改法，1280×1400 视口、deviceScaleFactor 2，逐张截 `.stage` 与整页）：
1. 起点取景（`ty = -1280`，角色在渡口附近）
2. 走动中（点完地面约 300ms 后，双腿摆动可辨）
3. 抵达弹卡（卡片升起、角色停在点位旁）
4. 跨段后镜头位置（走完老船家 → 龙潭，龙潭在视口内）
5. 山巅终点（`ty = 0`，山巅孤松在视口内）

把 5 张图人工看一遍：地物是否与驿道错位、角色是否被地形盖住、印章是否被角色挡住。截图脚本是临时的，看完即删，不要提交。

- [ ] **Step 5: 提交（先问用户）**

```bash
git add jianghu-client/demo/scripts/smoke-avatar.cjs
git commit -m "test(demo-avatar): C 版冒烟，覆盖点哪走哪/改道/镜头跟随/门槛与三版共存"
```

---

## 完成标准

- [ ] `npm test` 全绿（含 `avatar-geometry` 33 项）
- [ ] `npm run typecheck` 与 `npm run build` 通过
- [ ] `npm run smoke:avatar` 全绿
- [ ] `npm run smoke`（A 版）与 `npm run smoke:atlas`（B 版）全绿
- [ ] `git status` 中 `src/shared/**`、`src/platform/**`、`src/views/album/**`、`src/views/atlas/**` 无任何改动
- [ ] 5 张截图人工过目，无错位/遮挡

## 自检记录（Self-Review）

**1. Spec 覆盖**

| Spec 章节 | 落在哪个 Task |
|---|---|
| §3 目录结构与改动清单 | 全部 Task 的 Files 段 |
| §4.1 地图与投影（720×2560、MARGIN_V 400、六点位 py 表） | Task 1 |
| §4.2 相机单自由度（camTarget / clampTy / stepCamera 与取景表） | Task 1 + Task 5 |
| §4.3 渡口三步镜头不动 | 未做「最小间距去堆叠」（照实呈现）；**收尾修订**追加「卡片升起时地图让位」，落在 `AvatarApp.vue`（`.stage` 的 `padding-bottom` 跟住卡片实测高度），详见设计文档 §4.3 |
| §5.1 地形数据与三条约束 | Task 2（约束 1、3）+ Task 4（约束 2 的可达性） |
| §5.2 栅格化与 A*（CELL 20、NAV 半径 4、ARRIVE 55、步速 170） | Task 3 |
| §5.3 驿道 = 相邻点位 A* | Task 4 |
| §5.4 兜底（吸附 / 短路径直抵 / 无解提示 / 改道 prepend / dt 截断） | Task 3（吸附）+ Task 5（短路径、prepend、dt 截断）+ Task 8（无解提示与灰态） |
| §6 角色（四图元、CSS 动画、随镜头同层） | Task 6 |
| §7.1 点击语义表 | Task 8（`pick` / `onGround` / 卡片期间拒绝点击） |
| §7.2 状态机与预约触发 | Task 8（`pending` + `onArrive`） |
| §7.3 复用与差异（interacts、HUD 印章槽落章、Panel DOM 钩子） | Task 7 |
| §8 数据流 | Task 5 + Task 8 |
| §9 入口 `?v=avatar` | Task 9 |
| §10 风险表 | 均落到 Task 1/3/4 的单测与 Task 10 的三版回归 |
| §11.1 单测清单 | Task 1~4 的测试步骤 |
| §11.2 冒烟清单 | Task 10 Step 2（逐条对应） |
| §11.3 三版共存 | Task 10 Step 3 |
| §11.4 构建 | Task 9 Step 4 + Task 10 Step 4 |
| §11.5 截图自检 | Task 10 Step 4 |

**2. 占位符扫描**：无 TBD / TODO；每个改代码的步骤都给了完整代码。

**3. 类型一致性**

- `Cell = [number, number]`，`astar` / `snapToWalkable` / `worldToCell` / `pathToWorld` 全部用 `Cell`。
- `buildGrid(points)` 只接 `Pick<GamePoint, "x" | "y">[]`（Task 3 定义），Task 8 传 `points` 兼容。
- `buildRoads(points)` 返回 `Cell[][]`（Task 4），Task 8 用 `.filter((cells) => cells.length > 0).map((cells) => toPathD(pathToWorld(cells)))` 一致。
- `useWalker(spawn)` 返回 `{ x, y, facing, walking, camTy, goal, walkTo, halt, reset }`（Task 5），Task 8 解构的 `walkerX/walkerY/facing/walking/camTy/goal/walkTo/reset` 全部命中（`halt` 未解构，但属于 halt/reset 语义，`reset` 内部已调用它）。
- `AvatarMap` 的 props 名（`points/roads/walkerX/walkerY/facing/walking/camTy/stuckId`）与 Task 8 模板里的传参逐一对齐；emits `pick` / `walk` 与 `@pick` / `@walk` 对齐。
- `AvatarCard/Stamp/Panel` 的 props 与 A/B 完全同名（`point/state/visited`、`seal/from/to`、`gaps/stamps/points/bag`），Task 8 传参一致。
- 冒烟脚本读取的 DOM 钩子全部在组件里存在：`.map` `.world[data-ty]` `.ground` `.road` `.water` `.hill` `.bridge` `.node[aria-label]` `.walker[data-x|data-y|data-walking]` `.walker-goal` `.hint` `.hud-stat` `.card` `.card-close` `.interact` `.rows .row .row-label` `.chips .chip` `.reward` `.panel` `.panel .close` `.gate`。

