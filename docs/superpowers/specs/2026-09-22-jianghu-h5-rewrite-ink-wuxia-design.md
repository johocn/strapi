# 北上 H5 展示层重写（水墨古风 + 逐段对话）设计

日期：2026-09-22

## 目标
重写 H5 壳的视觉表现与对话交互，实现水墨山水画风 + 古风武侠氛围，解决背景单调、物体未实例化、视差不明显、对话一次性全列滚动四条问题。**剧情内容不改**。

## 范围
仅展示层（`shells/h5`）与必要的数据形态扩展（`core` dsl 类型、`content` shape/贴点字段）。保留现有两场景剧情分支与跨场景逻辑。

## 视觉

### 背景：水墨山水底图
- 每场景生成一张水墨山水 PNG 存 `shells/h5/src/assets/scenes/wudai.png`、`longtan.png`。
- `SceneBg.vue` 渲染为最底层：图片铺满 + 墨色叠层 + 场景名题字（衬线）。

### 物体实例化：内联 SVG 水墨风
- 新增 `SceneProp.vue`：按 `shape` 渲染对应内联 SVG 线描实例。
- dsl `InteractPoint` 增加 `shape?: PropShape`，枚举：`jar`(坛)、`boat`(船)、`notice`(告示)、`boatman`(老船家)、`tarn`(龙潭)、`monk`(僧人)、`pine`(雪松)。
- 物体锚贴：船贴水岸线、坛半埋滩涂、松立山巅——按 x/y 微调。
- 字符 icon 移除，改为 SVG 实例 + 微浮动提示环。

### 视差增强：四层 + 层内轮廓
- 层数 2→4：`far`(0.04) / `mount`(0.28) / `tree`(0.6) / `near`(1.0)。
- 每层 `kind:"svg"` 提供**山形/树影/云雾剪影**（内联 SVG），取代单纯渐变。
- `SceneLayer.vue` 支持渲染 SVG 轮廓层；平移错位明显。
- content 两场景 `layers` 重建为 4 层，`worldWidth` 维持 2/3。

### 古风武侠风格
- 色板：宣纸米白 + 墨黑 + 赭石，舍弃霓虹渐变。
- 字体：系统衬线古风栈（Songti/SimSun/楷体 优先）。
- 控件：细描金线 + 墨色底，微圆角；交互点在 SVG 上加浅墨晕环。

## 对话系统（核心）

### 逐段推进状态
- `binding.ts` `UiState` 增加 `viewIndex: number`（当前展开到第几段）。
  - 段边界 = 触发 `scene`/`options` 命令处。
  - `triggerPoint`/`pick` 时 `viewIndex` 重置到最新段起点。
- `advance()`（前进一段）与 `retreat()`（回看上一段）方法。

### 点击整区逐段推进
- `NarrativePanel` 正文区点击 → 若 `viewIndex < lines.length` 则 `advance()`；到末段停住等选项。
- 无滚动条：移除 `.lines` 的 `overflow-y:auto`，只渲染 `lines.slice(0, viewIndex+1)`。

### 底部小字回看
- 正文区底部小字「▲ 上一段」：点击 `retreat()`，可连续回看；到顶后变「下一段 ▼」前进。
- 选项出现时隐藏回看，避免交互冲突。

### 历史兜底
- 保留「历史(N)」折叠弹窗，仅兜底；默认走底部小字翻页。

## 数据形态扩展
- `core/dsl/types.ts`：`InteractPoint.shape`、`SceneLayer.kind: "gradient"|"svg" + svg?: string`。
- `content/northward.ts`：物体补 `shape` + 贴点坐标微调；`layers` 重建为 4 层 SVG 轮廓。剧情分支与 `goto` 不动。

## 文件清单
- 改：`core/src/dsl/types.ts`、`content/src/northward.ts`
- 改：`shells/h5/src/engine/binding.ts`、`SceneView.vue`、`SceneBg.vue`、`SceneLayer.vue`、`NarrativePanel.vue`、`InteractPoint.vue`、全局样式
- 新增：`SceneProp.vue`、assets 场景水图 PNG、SVG 剪影数据

## 测试
- core：dsl 类型扩展、`SceneLayer.kind` 兼容旧测试。
- h5：binding 逐段 `advance/retreat/viewIndex` 状态转移、边界；scene 测试保持全绿。
- 构建：`vite build` 通过；浏览器验证跨场景 + 逐段对话 + 视差位移。

## 风险
- H5 新增、不新增 npm 依赖（SVG/图片全本地）。
- 剧情不变，只需复验跨场景 `goto` 与 `shape` 渲染。