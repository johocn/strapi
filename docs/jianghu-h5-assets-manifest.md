# 北上 H5 分层素材清单（美术定稿交接）

> 目标工程：`jianghu-client`（Vue3 H5 壳 + 原生 DOM 摆件方案）。本文档供美术方产出、验收方核对，**文件命名与代码键一一对应**，验收后即填即用、无需改键。
> 关联实现计划：`docs/superpowers/plans/2026-09-23-jianghu-h5-native-design.md`（Task 6 素材承接）。

---

## 0. 通用规格（所有文件强制）

- 格式：PNG-24 / PNG-8，**带 α 透明通道，且通道干净无白底/灰边/黑边**。
- 长边 ≥ 1024，建议按下表像素出 2x 图（H5 经 `object-fit` 缩放，避免糊）。
- 命名：全小写下划线，背景 `{场景}_{图层}`、摆件 `{用途}`。
- 风格：**彩墨新国潮**，与现有底图 `wudai.jpg / longtan.jpg`（`assets/scenes/`）一致。
- 近景摆件底部须留"落地处"，禁止悬空漂浮。

---

## 1. 分层背景 PNG（每场景 2 张：far / mount）

整幅**不透明**（天空/山体色块），宽幅`left → right` 铺满（`object-position: left`），同层多段元素**并入一张宽图**，不拆多张（懒加载只裁剪交互点，不拆图层）。

存放：`shells/h5/src/assets/scenes/`

| 文件 | 代码键 `sceneLayerImages` | 建议尺寸 (2x) | 落位内容 |
|---|---|---|---|
| `wudai_far.png` | `wudai_far` | 2048 × 1024 | 松花江渡口 __远景__：天际线、远山、江雾 |
| `wudai_mount.png` | `wudai_mount` | 2560 × 1024 | 渡口 __中景__：滩涂、苇丛、货栈轮廓 |
| `longtan_far.png` | `longtan_far` | 2048 × 1024 | 龙潭山 __远景__：层叠远峰、山雾 |
| `longtan_mount.png` | `longtan_mount` | 2944 × 1024 | 龙潭山 __中景__：山道、松林、崖壁 |

> 层宽推导 `宽(屏)=1+(worldWidth−1)×depth`：wudai(2屏) far 1.04 / mount 1.28；longtan(3屏) far 1.08 / mount 1.56。按 1440×16:9 基准屏换算像素。

---

## 2. 近景独立透明 PNG 摆件（单物抠净、透明底）

存放：`shells/h5/src/assets/props/`

| 文件 | 对接 `point.src`（场景:点id） | 建议尺寸 | 用途 |
|---|---|---|---|
| `notice.png` | `wudai:notice` | 160 × 200 | 封路告示/木桩 |
| `jar.png` | `wudai:barrel` | 200 × 200 | 青瓷泥封酒坛 |
| `boat.png` | `wudai:boat` | 320 × 200 | 渡船（老船家附于其上） |
| `monk.png` | `longtan:monk` | 200 × 240 | 守山僧 |
| `pine.png` | `longtan:pine` / `longtan:pine_root` | 260 × 320 | 山巅雪松（双点共用；根空处见注释） |
| `tarn.png` | `longtan:tan` | 260 × 140 | 龙潭水面/幽潭 |

补充说明：
- `pine_root`（浇潭水>得赤果）落点在树干处，若需"树根空槽/根须"特写，另出细稿 `pine_root.png`（240×280，**可延后**）。
- 待选（非当前剧情必需，供后续更多点复用）：`stele.png` 石碑(180×240)、`bloom.png` 朱砂果/花果(80×80)、`grass.png` 花草(120×120)。

---

## 3. 对接代码（验收后填充）

`shells/h5/src/assets/scenes/index.ts`

```ts
export const sceneLayerImages = {
  wudai_far:   "", // ← 填 "/assets/scenes/wudai_far.png"
  wudai_mount: "", // ← 填 "/assets/scenes/wudai_mount.png"
  longtan_far: "", // ← 填 "/assets/scenes/longtan_far.png"
  longtan_mount:"", // ← 填 "/assets/scenes/longtan_mount.png"
};
```

`content/src/northward.ts` 示例点（已预留 `src/z/size/preview` 字段，验收后填）：

```ts
{
  id: "jar", x: 0.2, y: 0.66, icon: "坛", shape: "jar",
  src: "/assets/props/jar.png", size: 96, z: 20,   // ← 摆件图+尺寸+遮挡层
  on: [ /* 保留现有行为 */ ],
}
```

- `src` 为空时自动回退到现有 SVG 剪影渲染，**先产出再填，不阻塞现有功能**。
- 遮挡序由 `elemZ(z, y)` 决定：显式 `z` 优先，缺省按底部在前。

---

## 4. 素材定稿验收清单

- [ ] 8 张背景：尺寸/命名/风格符合 §1，铺满无透底（`longtan_mount` ≥2560 宽）
- [ ] 8 张摆件：透明通道纯净、无白底/灰边、抠图边缘不生硬
- [ ] 落位复核：渡口告示在酒坛之前、船在滩上不悬空；龙潭水面在僧/松之后
- [ ] 代码填充后跑 `npm run dev` 冒烟：分层错速正确、近景点底部在前、无透底差比

---

## 5. 产出后交接流向

美术定稿 → 素材验收（§4 打勾） → 填 `sceneLayerImages` / `point.src|z|size` → `git commit` → dev 冒烟 → 整体验收。