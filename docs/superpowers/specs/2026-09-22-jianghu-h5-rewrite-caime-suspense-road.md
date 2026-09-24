# 北上 H5 重做（彩墨新国潮 + 悬疑因果主线 + 路标切景）设计

日期：2026-09-22
状态：用户已批准
前序：推翻初版《2026-09-22-jianghu-h5-rewrite-ink-wuxia-design.md》（淡墨写意版不合格：背景单调、物体未实例化、视差无感、剧情无因无果）。

## 背景与问题
初版已落地（core 引擎 + Vue H5 壳 + 视差卷轴 + 逐段对话 + 淡墨写意水墨底图）。用户验收判定"不合格"，四个核心问题：
1. **鼠标左右拖动不切换场景** —— 视差平移有，但到边界无路标、不切景，功能缺失。
2. **互动剧情不连贯** —— 找酒坛无前因、无后果，"为什么找酒坛"缺乏线索牵引，感受割裂。
3. **发现酒坛后无选择** —— 期望"打开/打碎/不闻不问"都是真实选项且有后果差异。
4. **画面风格平淡** —— 纯淡墨写意对比度低、不醒目。

## 本轮目标
在保留现 core 引擎与 H5 壳结构前提下，重做三块：画面（彩墨新国潮）、叙事（悬疑因果主线 + 硬分支）、交互（视差 + 边界路标切景）。**剧情内容与分支需重写，引擎/壳架构基底不动。**

## 范围
- 改：`content/src/northward.ts`（重写主线剧情 + 硬分支 + 两景 layers/points）
- 改：`shells/h5` 展示层（SceneBg 底图、SceneProp 彩墨线描、SceneLayer、SceneView 加载路标切景、配色 token）
- 改（小）：`core` 如需补充行为能力（见"硬分支实现"节），最小增量；不破坏既有 engine/cond/state 契约
- 保留：`binding` 逐段对话状态机、`segments`、视差相机、跨场景 `goto:"=场景id"` 机制、`@core` 别名、无新 npm 依赖

## 决策（已与用户确认）
| 项 | 决策 |
|---|---|
| 画面风格 | **D. 彩墨新国潮**：水墨底 + 青绿/朱砂/靛青高饱和点缀 |
| 主线推动力 | **悬疑真相型**：因一封封路告示北上 |
| 切景机制 | **视差 + 边界路标点击切景**（保留视差拖动） |
| 酒坛/关键选项后果 | **硬影响**：打开/打碎/不闻不问改变主线走向 |

## 画面 · 彩墨新国潮

### 色彩 token（后续 main.css 与组件统一引用）
- 宣纸底色保留：`#efe7d8`（暖宣）、墨黑 `#2d2418`
- 高饱和点缀三原民彩：**朱砂** `#C03221`、**石青** `#2E4B8F`、**靛青** `#3A5F6E`、**赭石** `#A65D2D`
- 交互/强调：朱砂描金（`#C03221` + `rgba(224,190,120,…)`）
- 字体：衬线古风栈保留（Songti SC/STSong/SimSun/KaiTi）

### 底图（新国潮水墨 PNG）
- `shells/h5/src/assets/scenes/wudai.jpg`、`longtan.jpg` 重生成：
  - 保留宣纸米白底 + 水墨山形
  - 用青绿染山林、朱砂点衣角/船帆、靛青画江/潭水
  - 横向宽幅、留白、古风武侠氛围
- `SceneBg.vue` 已支持 `img.bg-img` + `.bg-mask` 叠层，仅换图/调色即可（mask 色随新底图适配）

### SceneProp 彩墨线描（替换纯墨）
7 个 shape（jar/boat/notice/boatman/tarn/monk/pine）从 `#3a322a` 纯墨改为：
- 勾线 **朱砂 `#C03221`**（主轮廓）
- 填充/晕染 **靛青 `#3A5F6E` 与墨 `#2d2418`**
- 个别（赤果/酒坛封泥）用 **朱砂实心** 做强调
- SVG 结构（viewBox 96×96、阴影、浮动晕环）不动，改 stroke/fill 色

### 交互醒目
- 交互点 `.ip-ring` 改朱砂描金脉冲晕环（替代淡金低对比）
- 边界路标用朱砂实底 + 描金字（见交互节）

## 主线 · 悬疑真相型（重写 content/northward.ts）

### 因果链总纲
> 告示（钩子）→ 酒坛（考验）→ 舟渡（条件/推进）→ 龙潭山（真相）→ 僧人（闭环）

**渡口（wudai）**：晨雾渡口，木柱告示"龙潭山塌方封路，北上改走旱道"，落款官府印。但细心可觉察异常（墨迹未干/印是新盖）——为后续"告示伪造"埋钩。老船家要一坛陈酒才肯渡江（条件）。酒坛为自找前因的"跌宕物"。

**龙潭山（longtan）**：山巅赤果被窃——守山僧神色有异。真相：贼人先伪造告示封山、窃走赤果（断山上香客心），僧人守山正是为等有人"寻上门"点破。玩家凭渡口拿到的线索（酒坛残片/告示破绽）可与僧人确认真相，兑换北上密道（闭环）。

### 酒坛三分支（硬影响，此为用户明确要求）
酒坛 `barrel` 触发时不再是单一"取酒"，而是真实选择 **打开 / 打碎 / 不闻不问**：

| 选项 | 后果 | 实现 |
|---|---|---|
| **打开** | 得「陈酒」 → 赠酒渡河（正路） | `setflag jar_opened=true` + `take item=酒`；描述坛启封泥、酒香 |
| **打碎** | 酒碎（无酒），但坛底藏**告示残片**（刻字/拓印指向贼人）→ 携带残片线索到龙潭山，与僧人对话另开"认出残片"暗线兑换渡河 | `setflag jar_broken=true` + `take item=告示残片`；打碎有代价（无酒）但有补偿线索 |
| **不闻不问** | 暂不取酒，保留可回头重新"打开/打碎"；对话以独白收尾 | 只 `setflag jar_ignored=true`，不改变物品；可再次 trigger 由 `cond` 重新呈现首两选项 |

**引擎落地约束**（`check` 会消耗物品、`take` 去重、`setflag` 记录）：
- 选项用 `cond` 过滤：`jar_opened` / `jar_broken` 任一发生后，不再重复给 3 选；`jar_ignored=true` 且未 opened/broken 时，重新给"打开/打碎"两选。
- 正路：`take 酒` → 赠舟（`=longtan`）。异路：`take 告示残片` → 龙潭山靠残片换渡。

### 渡河条件
- 必须有「酒」或「告示残片」之一才触发渡船 dialog；无任何线索时船家只摆手、不给选项（`cond: bag.has(酒) || bag.has(告示残片)`）。
- 渡河统一 `goto:"=longtan"` 跨景（沿用现机制）。

### 龙潭山真相闭环
- 赤果被窃 → 守山僧对话揭示：告示是贼人伪造（呼应渡口告示破绽），盗走赤果断人间烟火。**若携带告示残片**，僧人确认是拓印的贼人印章残片，信任玩家，指北上密道。
- 赤果找回与否作为支线兜底（保留取潭水浇松得赤果浮点），主线以"揭露真相 + 获密道"为闭环，#branch 不堵死。

## 交互 · 视差 + 边界路标切景

- **保留**现有视差拖动（`useViewport`、SceneView 相机、`worldWidth`）。
- **新增**：`SceneView` 于每景横向尽头检测当前 `camera` 达边界（`camera >= maxOffset`），叠加一个可点击**路标**（如"→ 北上 龙潭山"），点击触发跨景。
- 切景复用现有 `goto:"=场景id"`（content 的渡船/密道本就走 `=longtan`，路标仅作为显式可达入口）。
- **实现位置**：SceneView 里根据 `scene.id` 决定路标文案与目标 sceneId；用 `useGame` 派发 `goto`/`loadScene` 语义的跨景动作。`binding` 需暴露一个跨景方法（如 `jumpToScene(id)`）或复用 content 已建路径。
  - 约束：**不改 core Engine 既有契约前提下实现**；若需新增跨景 API，走最小增量（core 增一个 `gotoScene(id)` 包装 `loadScene`），保持 binding/壳依赖不变。
- 路标出现时机：`camera >= maxOffset` 且当前场景无进行中分支（idle）时。

## 文件清单
- 改：`content/src/northward.ts`（重写主线 + 三分支 + layers/points）
- 改：`shells/h5/src/assets/scenes/wudai.jpg`、`longtan.jpg`（重新生成）
- 改：`shells/h5/src/assets/scenes/index.ts`（映射不变，仅图更新）
- 改：`shells/h5/src/components/SceneBg.vue`（如 mask 色需随新图调）
- 改：`shells/h5/src/components/SceneProp.vue`（stroke/fill 改彩墨）
- 改：`shells/h5/src/components/InteractPoint.vue`（晕环朱砂提亮）
- 改：`shells/h5/src/components/SceneView.vue`（边界路标切景）
- 改：`shells/h5/src/styles/main.css`（彩墨 token 点缀）
- 改（最小，如需要）：`core/src/engine/engine.ts`（跨景 API 包装）与 `shells/h5/src/engine/binding.ts` / `useGame.ts`（暴露 jumpToScene)
- 改（小）：NarrativePanel/ChoiceGroup 若配色需微调

## 测试
- core：既有 engine/cond/state 契约测试保持全绿；如新增跨景 API 补单测。
- content：`northward` 结构调整后跑 content lint（若有）+ 分支 `cond` 走查。
- h5：`binding`/`segments`/`engine_scene` 测试保持全绿；新增路标切景相关测试（若可组件级测）。
- 构建：`vite build` 通过；浏览器验证：拖动到头出现路标→点击切景；酒坛三分支各有差异化后果；渡河条件绑定线索；龙潭山真相闭环。

## 风险
- 硬分支逻辑依赖 `cond`/`flag`搭配，易出"选项重复出现/物品异常"——以 `cond` 精确过滤 + 小步 TDD 控住。
- 底图重生成是资产替换，不改代码逻辑，风险低。
- 路标切景在 idle 判断需清晰，避免分支进行中误触。
- 不新增 npm 依赖、不改 vue 版本、不改 core 既有契约（除非最小增量经确认）。

## 不做（YAGNI）
- 不做 mp/game 壳（本轮回 H5 质量）。
- 不扩第三个场景。
- 不做云存档/战斗。