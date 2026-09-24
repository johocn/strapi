# 文字江湖文旅游戏「游吉林市北上」— C 端通用组件设计

- 日期：2026-09-22
- 状态：设计已认可，待用户 review
- 范围：C 端（客户端）基础通用组件。**不修改 nest 目录任何内容**，仅写 C 端代码。
- 目标环境：H5、微信小程序、微信小游戏

## 1. 目标与约束

- 一款文字江湖类文旅游戏，主题「游吉林市北上」（以松花江北上为主线）。
- 好玩互动要多，剧情要有意思。
- 可扩展性高：新增场景/剧情/地点/任务 = 只加数据（JSON），组件零改动。
- 硬约束：
  - 桌面路径 `e:\code`，nest 目录为官方 Nest.js 源码/示例，**只作参考、禁止修改**。
  - 契合现有 C 端技术栈（shao 前端 = Vite + Vue3）；核心零运行时依赖。
  - H5 / 小程序 / 小游戏 三端共用一份核心逻辑（引擎），仅表现层换壳。

## 2. 内容展示方式（已定：B+C 混合 → 叙事面板式）

- 整体结构：**场景为容器，对话为抽屉**。
  - 主屏 = C 式场景（背景 + 交互光点 + 底部操作盘）。
  - 触发对话/选项时，从底部浮起 B 式「叙事面板」抽屉，保留场景缩略与常驻操作盘。
- 对话形态采用**叙事面板式**（非沉浸覆盖式）：
  - 对话作为可上下滑动的「叙事面板」，保留场景缩略 + 常驻操作盘。
  - 选项分列清晰，探索与对话可在同一屏连续操作，最耐玩、扩展性最好。

## 3. 通用组件切分清单（8 组件 + Engine）

数据驱动引擎 + 8 个通用组件。核心原则：内容是脚本，组件是解释器。

### 交互层组件树

```
SceneView（场景容器）
  ├─ SceneBg         # 背景 / 地点状态
  ├─ InteractPoint×n # 交互光点（位置 x/y + 触发叙事）
  ├─ AmbientFx       # 天气/时辰光效（雨/雾/雪/晨昏）
MapNav（地图导航）   # 新增：北上路线纵贯 / 二级视图
  └─ Node(地点)/edge(道路)   # 节点=场景id；解锁绑定主线 flag
NarrativePanel（核心抽屉）
  ├─ DialogSlot      # 4 种子行：旁白 / 对话 / 内心 / 双人（插槽注册，可扩展）
  ├─ ChoiceGroup     # 分支选项气泡（单选/多选）
  └─ FlowControl     # 逐字 / 快进 / skip / 历史
ActionBar             # 操作盘：行路 / 交谈 / 探查 / 行囊（行路→开 MapNav）
StatusBar             # 状态栏：地点 / 时辰 / 气血 / 金钱
Engine                # 脚本解释器 → 状态机（纯TS）
```

### MapNav 地图导航详情
- 城市/大地图二级视图（松花江北上路线纵贯）。
- 节点 = 场景 id；边 = 可通行道路（解锁状态绑定主线 flag）。
- 点击节点 → `teleport` 进入对应 SceneView。
- 状态接入：当前场景高亮、已探索打钩、未解锁灰锁、未探地域迷雾。
- 数据：`nodes`/`edges` JSON；新增地点只加节点+道路。

## 4. 技术选型（已定：方案 A）

**方案 A（推荐，已认可）：纯 TS 引擎 + 三壳适配。**
- 核心 `Engine` 平台无关：读 JSON 脚本 → 状态机 → 输出 `render commands` + 事件。
- 三壳为薄渲染层，消费同一份 render commands。
- 未采用：
  - **方案 B（Cocos/Laya 统一发布）**：小游戏导出需 GUI，本机 Laya IDE CLI 交互式登录不可用；引擎体积/学习成本高。
  - **方案 C（H5 优先 + 小游戏 WebView 兜底）**：小游戏是「假小游戏」，审核/体验差。

### 技术栈清单

| 端 / 层   | 技术 |
|-----------|------|
| 核心引擎  | 纯 TS，零运行时依赖 |
| H5 壳     | Vue3 + Vite + TS + CSS（对齐现有 shao 栈） |
| 小程序壳  | 原生自定义组件（WXML/WXSS） |
| 小游戏壳  | Canvas2D 自绘 UI 渲染器 |
| 脚本数据  | JSON（场景/对话/地图） |
| 构建/测试 | Vite lib 模式 + Vitest |

## 5. 目录结构（独立新工程 jianghu-client）

```
e:\code\jianghu-client/
├─ core/                 # 纯 TS 引擎（不碰 nest）
│  └─ src/
│     ├─ engine/         # 状态机 · 脚本解释
│     ├─ render/         # render-commands 定义
│     ├─ state/          # 变量池 · flag · 背包
│     └─ dsl/            # JSON 脚本类型定义（schema）
├─ shells/
│  ├─ h5/                # Vue3 + Vite H5 壳
│  ├─ mp/                # 小程序原生壳
│  └─ game/              # 小游戏 Canvas 壳
└─ content/              # 剧本 JSON（北上剧目/场景）
```

- `core` 与 `shells` 完全解耦：shell 只消费 `render commands` + 事件。

## 6. 脚本 DSL / 数据驱动

场景 JSON 示例与要素：

```json
{ // scene_wudai.json 松花江渡口
  "id": "wudai",
  "name": "松花江渡口",
  "bg": "wudai_bg",
  "fx": "晨雾",
  "points": [
    { "id": "boat", "x": 0.32, "y": 0.5, "icon": "船", "on": { "emit": "talk", "npc": "老船家" } },
    { "id": "sailor", "x": 0.6, "y": 0.8, "icon": "船家" }
  ],
  "entry": [
    { "t": "narration", "text": "雾锁十里长堤…" },
    { "t": "dialog", "npc": "老船家", "text": "小郎君，可是要渡江？",
      "options": [
        { "label": "问北上路线", "goto": "route" },
        { "label": "送上酒水", "goto": "gift", "cond": "bag.has(酒)" }
      ] }
  ]
}
```

- 行为单元 `type` 覆盖：`narration` 旁白 · `dialog` 对话 · `monologue` 内心 · `voiceoff` 画外音 · `options` 选项 · `goto` 跳转 · `take/check` 收放道具 · `setflag` 状态 · `fight` 战斗 · `teleport` 移动。
- `DialogSlot` 插槽注册机制：新增「双人争执」「回忆闪回」只新增一种子行组件。

## 7. 数据流（单向）

```
Shell(渲染场景) ──用户交互──▶ Engine ──读JSON脚本/状态──▶ 推进节点
       ▲                                                   │
       └────── render-commands + fx事件 ◀──────────────────┘
         (打字机/选项/光点/地图/天气)
```

## 8. 错误处理

- JSON 脚本在加载时做运行时校验（符合 dsl schema），坏脚本在进入即出明确定位错误。
- 引擎状态机守卫：非法跳转/缺节点不崩溃。
- 坏节点回退到编辑器占位内容，不让流程卡死。

## 9. 测试策略

- `core` 用 Vitest 单测：状态机推进、分支选择、条件求值、道具/flag 变更。
- `content` 脚本做结构 lint（参照既有 check.js 的章节/引用一致性校验思路）。

## 落地先后（后续 writing-plans 细排）

1. `core` 引擎（dsl 类型 → 状态机 → render commands）
2. `content` 北上剧目脚本初版（1-2 个场景打通）
3. `shells/h5`（Vue3 壳，先跑通叙事面板）
4. `shells/mp` / `shells/game`（复用 core）