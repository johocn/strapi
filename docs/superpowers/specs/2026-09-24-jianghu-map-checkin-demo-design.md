# 江湖录 Demo · A 版「古风地图打卡册」设计

- 日期：2026-09-24
- 状态：待评审
- 落位：`e:\code\jianghu-client\demo`（新建，独立可删）
- 参照物：宁波天一阁·月湖景区「月湖灵境」小程序

## 1. 背景

上一版 `e:\code\jianghu-client`（Vue3 H5，横版视差 + 点击物件读文本）在四个维度均不满意：玩法形态、目标感、表现手感、剧情文案。用户决定：**旧代码原样保留，另起独立 demo 探索全新形态**。

参照物「月湖灵境」是文旅打卡小程序，其可迁移的本质是 **古风地图 + 点位打卡 + 图鉴/印章收集 + 路线解锁**，而不是它的 AI 问答与社交组队。

三种新形态都要做一版，**先做 A**，后续再做 B（可漫游大地图）、C（小人跑图），对比后决定去留。

## 2. 目标与非目标

### 目标

1. 验证「地图 → 点位 → 互动 → 落章 → 图鉴 → 解锁下一段路」这条闭环是否成立、是否好玩。
2. 三套玩法（A/B/C）共用同一份数据与规则，视图层可替换。
3. 先跑 H5；`shared/` 保持框架无关，便于日后搬进小游戏。

### 非目标（本次明确不做）

- 不做 AI 对话、不做组队/社交、不做多人。
- 不做微信小游戏导出，只预留平台适配层。
- 不写正式剧情文案，用占位文案。
- 不改动 `jianghu-client` 现有任何代码与文件。

## 3. 目录结构

```
jianghu-client/demo/
├── package.json               独立包（vue3 + vite + vitest + typescript）
├── vite.config.ts
├── tsconfig.json
├── index.html
└── src/
    ├── main.ts                挂载入口
    ├── shared/                纯 TS、零依赖、框架无关、可单测
    │   ├── types.ts
    │   ├── content.ts         占位剧情数据
    │   ├── engine.ts
    │   ├── rules.ts
    │   └── persist.ts
    ├── platform/
    │   ├── storage.ts         H5 localStorage 实现
    │   └── index.ts           平台能力出口（日后小游戏替换此层）
    └── views/
        └── album/             表现层 A
            ├── AlbumApp.vue
            ├── MapCanvas.vue
            ├── PointCard.vue
            ├── StampBurst.vue
            ├── AlbumPanel.vue
            └── interacts/
                ├── ChoiceBox.vue
                ├── ComposeBox.vue
                └── OrderBox.vue
```

**边界铁律**：`shared/` 不得 import 任何 Vue 或 DOM API；`views/` 不得直接改状态，只能通过 `engine` 导出的函数。

## 4. 数据模型

```ts
// shared/types.ts
export type PointState = "locked" | "ready" | "done";

export interface ChoiceInteract {
  kind: "choice";
  prompt: string;
  options: { id: string; label: string; correct?: boolean }[];
}
export interface ComposeInteract {
  kind: "compose";
  prompt: string;          // 上句
  pool: string[];          // 候选词（含干扰项）
  answer: string[];        // 正确词序
}
export interface OrderInteract {
  kind: "order";
  prompt: string;
  items: { id: string; label: string }[];
  answer: string[];        // 正确 id 顺序
}
export type Interact = ChoiceInteract | ComposeInteract | OrderInteract;

export interface Effect {
  setFlags?: string[];
  giveItems?: { id: string; name: string }[];
  stampId?: string;        // 行脚印
  albumId?: string;        // 见闻录条目
  score?: number;          // 见闻值
}

export interface GamePoint {
  id: string;
  name: string;
  x: number;               // 地图归一化坐标 0..1
  y: number;
  seal: string;            // 印章上的单字
  lines: string[];         // 旁白 / 对话（占位）
  interact: Interact;
  effect: Effect;
  sectionId: string;       // 归属路段
  requiresFlag?: string;   // 前置 flag
  unlockHint?: string;     // 被挡时的提示
}

export interface Section {
  id: string;
  name: string;
  requiresStamps: number;  // 解锁门槛
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
  visited: string[];       // 已读过的点位（用于卡片重看）
}
```

## 5. 规则（`shared/rules.ts`，全部纯函数）

| 函数 | 语义 |
|---|---|
| `pointState(point, state)` | `done`（已落章）/ `locked`（所在路段未解锁，或 `requiresFlag` 未满足）/ `ready` |
| `sectionUnlocked(section, state)` | `stamps.length >= requiresStamps && score >= requiresScore` |
| `albumGaps(state)` | 返回 `{ got: AlbumEntry[], missing: AlbumEntry[] }`，供图鉴册画缺口 |
| `progress(state)` | 返回 `{ score, stamps, totalStamps, totalAlbum }`，供顶部进度条 |

**所有点位始终显示在地图上**，未解锁的显示为灰态并可点击（给出 `unlockHint`）。不做「未解锁就藏起来」——看得见的缺口才是目标感来源。

## 6. 引擎（`shared/engine.ts`）

```ts
export function createState(): GameState
export function applyEffects(state: GameState, fx: Effect): GameState   // 纯函数，返回新对象
export function checkAnswer(interact: Interact, answer: unknown): boolean
```

`checkAnswer` 对三种互动的判据：
- `choice`：所选 option 的 `correct === true`
- `compose`：提交词序与 `answer` 全等
- `order`：提交 id 序与 `answer` 全等

答对才 `applyEffects`，答错只给提示、不落章。

## 7. 存档（`shared/persist.ts` + `platform/`）

`persist.ts` 只依赖注入进来的 `StorageLike { getItem, setItem, removeItem }`，不直接碰 `window`。H5 侧由 `platform/storage.ts` 传 `localStorage`，日后小游戏侧换成 `wx.getStorageSync` 包装即可。

存档键：`jianghu_demo_save_v1`。提供「重开」入口（清档）。

## 8. 表现层 A：古风地图打卡册

### 8.1 界面分区

```
┌─────────────────────────────┐
│ 顶部：见闻值进度条 + 行脚印 n/6 │
├─────────────────────────────┤
│                             │
│   SVG 古风地图（全幅）        │
│   远山 / 河道 / 驿道 / 路径   │
│   点位印章（三态）            │
│                             │
├─────────────────────────────┤
│ 底部：点位卡片（点击后升起）   │
│  或 见闻录册（点右上角切换）   │
└─────────────────────────────┘
```

### 8.2 SVG 地图（`MapCanvas.vue`）

零素材依赖，全部代码绘制：

- **远山**：2–3 层错落折线，低饱和墨青，做水墨淡出。
- **河道**：一条横向曲线带，浅青灰。
- **驿道**：贯穿各点位的折线路径，按路段分段着色（未解锁段为虚灰线，解锁后转实线）。
- **点位印章**：圆形印章，中央单字。三态视觉：
  - `locked`：灰、降透明度；仍可点击，点击给出 `unlockHint` 气泡
  - `ready`：朱红描边 + 缓慢脉冲环
  - `done`：朱红实底 + 白色字 + 轻微倾斜（像盖上去的）

### 8.3 点位卡片（`PointCard.vue`）

底部升起（CSS transform + transition），内容自上而下：

1. 点位名 + 关闭按钮
2. `lines[]` 逐行渐显的旁白/对话（点击可跳过逐字效果）
3. 互动区（按 `interact.kind` 渲染三种之一）
4. 答对后：互动区收起 → 落章动画 → 显示「已录入见闻录 · 见闻值 +N」

已 `done` 的点位可再次打开，只显示 `lines[]` 与完成态，不重复给奖励。

### 8.4 三种互动组件

- `ChoiceBox.vue`：选项按钮组，点选即判。
- `ComposeBox.vue`：上方显示上句，下方候选词可点选进「已拼」区，可撤销，点「落笔」判定。
- `OrderBox.vue`：条目列表，用上/下按钮调序（不做拖拽，避免移动端手势冲突），点「定序」判定。

### 8.5 落章动画（`StampBurst.vue`）

从卡片顶部飞出一枚印章，落到地图对应点位，放大 → 落下（`scale` 1.6 → 1.0 + 轻微回弹）→ 朱红显色。纯 CSS，约 600ms。

### 8.6 见闻录册（`AlbumPanel.vue`）

两个页签：
- **见闻录**：网格展示全部 `AlbumEntry`，未得为灰底虚线框 + 「？」，已得显示名称与描述。
- **行脚印**：6 个印章位，已得显示朱红印章，未得为空心灰圈。

## 9. demo 内容清单（占位文案）

| # | 点位 | 路段 | 互动 | 奖励 |
|---|---|---|---|---|
| 1 | 渡口告示 | 段一 | choice | 行脚印① · 见闻录① · +10 |
| 2 | 江滩酒坛 | 段一 | order | 行脚印② · 见闻录② · +10 |
| 3 | 老船家 | 段一 | compose | 行脚印③ · 见闻录③ · +10 |
| 4 | 龙潭 | 段一 | choice | 行脚印④ · 见闻录④ · +10 |
| 5 | 守山僧 | 段二 | order | 行脚印⑤ · 见闻录⑤ · +10 |
| 6 | 山巅孤松 | 段二 | compose | 行脚印⑥ · 见闻录⑥ · +10 |

- 段一：4 个点位，全部默认可探索。
- 段二：2 个点位，需 `stamps >= 3 && score >= 30` 解锁；未达标时这两个点位在地图上显示为灰态（可点击、给出 `unlockHint`），段二路径为虚灰线。
- 文案全部为占位短句，只求通顺可读，不求文学质量。

## 10. 验收方式

1. **单测**（`npm test`，vitest）：覆盖 `rules.ts` 全部纯函数与 `engine.checkAnswer` 三种判据、`applyEffects` 幂等性（重复落章不重复加分）。
2. **构建**（`npm run build`）：vite 构建通过，无 TS 报错。
3. **手动冒烟 + 截图自检**：起 dev server，走通完整闭环——
   进地图 → 点第一个点位 → 答对 → 看到落章动画 → 见闻值 +10 → 开图鉴看到新条目 → 连做 3 个 → 段二解锁、新点位出现 → 做完 6 个 → 行脚印 6/6。
   关键节点各截一张图，自查视觉与手感。

## 11. 风险

| 风险 | 应对 |
|---|---|
| SVG 手绘地图容易做成「示意图」而非「古风地图」 | 先做地图视觉稿单独确认，再叠交互；远山/河道/驿道分层调 |
| 微信小游戏无 DOM，`views/` 将来要按 canvas 重写 | `shared/` 与数据零改动即可搬；本次只做 H5，不投入小游戏适配 |
| 占位文案会让 demo「不好玩」的结论失真 | 文案统一走「一句话悬念」，并在验收时明确区分「形态问题」与「文案问题」 |
| 三套玩法共用数据层，可能出现为迁就某套而过度抽象 | 只抽 `shared/` 四件套（类型/内容/引擎/规则），不做通用渲染抽象层 |

## 12. 后续（不在本次范围）

- B 版：`views/atlas/`，地图可拖拽缩放、点位雾态、走过留痕。（已完成，见 §13）
- C 版：`views/avatar/`，角色在地图上走动 + 靠近触发 + 寻路/碰撞。（已完成，见 §13）
- 三版做完后对比，决定留存哪一套，再考虑正式剧情与美术接入。→ **对比结论见 §13**

## 13. 三版对比结论（决定留存哪一套）

三版均已完成：单测 71/71，冒烟 A 24/24、B 51/51、C 45/45，`npm run build` 通过。
入口：默认 = A 版，`?v=atlas` = B 版，`?v=avatar` = C 版。共用底座（`shared` / `platform` / `interacts`）三版等量复用、零改动。

### 13.1 同维度对照（实测，viewport 390×844）

| 维度 | A album | B atlas | C avatar |
|---|---|---|---|
| 地图形态 | 一屏 720×1280，不可动 | 长卷 720×2880，手拖 + 手缩放 | 长卷 720×2560，镜头缓动跟随角色 |
| 触发方式 | 点图标 → 立刻弹卡 | 点图标 → 立刻弹卡 | 点目标 → 走过去 → 抵达才弹卡 |
| 沿途反馈 | 无 | 雾两层 + 留痕两层 | 无 |
| 首屏所见 | 6 枚印章全见 + 段二门槛条 | 4 枚印章 + 一条向上出屏的虚线 | 4 枚印章 + 一个角色 + 江/桥/山体 |
| 点 → 弹卡等待 | 0 | 0 | 渡口 918ms、江滩酒坛 966ms、老船家 836ms、老船家→龙潭 3436ms；全程纯走路约 13s |
| 表现层代码 | 5 文件 759 行 | 7 文件 1151 行 | 8 文件 1468 行 |
| 冒烟断言 | 24 | 51 | 45 |
| 几何单测 | — | 11 | 27 |

对照基准：`src/shared` 5 文件 404 行、`src/platform` 2 文件 13 行、`src/views/interacts` 3 文件 230 行。

### 13.2 实测发现（三条，均已在截图中确认）

1. **B 版整块雾落在初始视口之外**：雾区间 `[0, 1371]` 与初始视口 `[1600, 2880]` 不重叠，首屏看不到任何雾；拖到 `ty = 0` 才见到整屏灰雾。这不是缺陷（初始取景本就该"渡口一带尽收眼底"），但意味着 **B 的"未知感"在首屏不成立**，拖拽动机只剩"虚线向上出屏"这一条弱暗示。
2. **C 版渡口三点镜头一步不动**（§4.3 已记）：点→弹卡 0.8~1.0s，观感是"人在这片江滩上挪两下"，而非"走一段路"。内容层点位分布过密（y = 0.74 / 0.72 / 0.70）被 C 版如实暴露。
3. **C 版把地形保真度变成双份负担**：`avatar-terrain.ts` 同一份数据既渲染地物、又栅格化成可走网格，桥面渲成半透明矩形、山体渲成八点色块，是三版中最"示意图"的一套视觉。

### 13.3 留存建议

**以 A 版为骨架留存**；B 版不作废，留作内容扩张时的扩容路径；C 版本期不留存。

1. 闭环（地图 → 点位 → 互动 → 落章 → 图鉴 → 解锁）三版都成立。成立之后决定去留的是**成本与可续性**，不是形态新鲜度。
2. A 版单点信息效率最高（首屏 6 点全见 + 零等待），构图可控、视觉完成度最高；demo 下一站是接正式剧情与美术，一屏可控的构图对接美术的代价最小。
3. B 版的纵深在当前 6 个点位下用不上：重映射后跨度 2160 = 1.69 屏，而玩家九成时间停留的那一屏里只有 4 个点。**B 不是被否定，是时机未到**——`atlas-geometry.ts`（11 条单测）与 `usePanZoom.ts` 可直接留作扩容备选。
4. C 版成本最高（多 1468 行 + 27 条几何单测）而闭环收益为零：三种互动、卡片、图鉴与 A 版同构，多出来的几乎都在搬运一个"走路"过程；地形双份负担会在接美术时变成最大返工面。

**结论成立的前提（任一条变化需重估）**：

- 正式内容点位数显著超过 6（如 15+）→ B 的纵深从"用不上"变"必需"。
- 若"走路过程本身"被确认为核心体验而非包装 → C 的等待成本从缺点变卖点；本期无证据支持（1s 级等待是"等人挪两下"，不是"沉浸"）。
- 若确定必须补"沿途反馈"或"角色代入" → 那就不是"选 A"，而是"A 骨架 + 补一条"，成本需重新估。
