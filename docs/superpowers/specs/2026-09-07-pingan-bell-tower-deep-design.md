# 平安钟楼沉浸剧情深化 · 设计文档

- 日期：2026-09-07

- 状态：待评审

- 应用：剧本活动（北山线）第一站「平安钟楼」剧情深化

- 技术边界：纯前端（`shao`，v.joho.cn），后端 zhao-point **零改动、零部署**

## 1. 目标

在已上线的《三声钟 · 一人愿》7 幕剧情之上，纯前端深化四类互动，把平安钟楼从「示范剧情」打磨成「完整走心的章节」：

1. **隐藏彩蛋互动**：心愿匣关键词触发守钟人隐藏对白；连点敲钟超 3 下触发「第四声」隐藏回响
2. **双结局深化**：暖线 / 悬疑线各自独立 epilogue 收尾，结局互锁，二周目可解锁另一条线
3. **站间线索联动**：平安钟楼线索「心愿絮条」带文案钩子指向关帝庙「话多的大爷」，埋下第一章故事线串联
4. **复访新对白**：已完成剧情后再次进入钟楼，播放守钟人复访台词（按已完成线定制）

## 2. 范围

- **本次**：改 `shao/data/tour-scenes.ts`（数据模型 + 剧本扩展）+ `shao/pages/activity/tour.vue`（播放层），构建部署 v.joho.cn

- **不做**：后端持久化、运营可视化配置、跨设备同步、其他站点改造

## 3. 现状（基线）

- 剧本数据 `tour-scenes.ts`：5 类节点 `narrative / input / tap / choice / settle`，平安钟楼 = 7 节点序列（S1–S7）

- 进度双通道：后端 `activity_signups.tour_progress`（站点完成/谜底/终章判定）+ 前端 localStorage `tour_story_<docId>_<uid>`（剧情播放状态）

- 结算复用后端 `tourCheckinStation`（幂等发分），打卡 +10

- 剧情现有要素：三声钟、心愿絮条、第四声悬念、七种下落、关帝庙「话多的大爷」钩子

## 4. 数据模型扩展（`tour-scenes.ts`）

### 4.1 TourNode 类型扩展

```ts
export type TourNode =
  | { type: 'narrative'; speaker?: string; text: string }
  | { type: 'input'; key: 'wish'; placeholder: string; hidden?: HiddenReply[] }
  | { type: 'tap'; target: number; rings: string[]; bonus?: BonusRing }
  | { type: 'choice'; options: ChoiceOption[] }
  | { type: 'settle'; relic: string; hint?: string }
  | { type: 'revisit'; text: string; speaker?: string }

interface HiddenReply { keys: string[]; text: string; speaker?: string }
interface BonusRing { when: number; text: string; speaker?: string }
interface ChoiceOption { id: string; label: string; note: string; epilogue: string }
```

`StationScript` 增加 `revisit` 字段（复访对白），key 仍为站点 order 字符串。

### 4.2 播放层扩展（`tour.vue`）

| 触发        | 行为                                                                                |
| --------- | --------------------------------------------------------------------------------- |
| input 提交  | 内容命中 `hidden[].keys` → 先播对应隐藏对白，再继续原流程；未命中走默认                                     |
| tap 计数    | `tapCount === target` 结算三响；`tapCount === bonus.when`（=target+1）先播 bonus「第四声」回响再结算 |
| choice 选择 | 记录所选线 `line`（warm/mystery）到 localStorage，播放该选项 `epilogue` 后进入 settle              |
| settle 收束 | 展示 `relic` + `hint` 线索文案                                                          |
| 复访判定      | `loadStoryAll()[order].done === true` → 播放 `revisit` 对白（按 `line` 定制），跳过首访 7 幕     |
| 二周目       | 已 done 时提供「再敲一次」入口，允许重新体验并选择另一条线（双结局互锁解锁）                                         |

## 5. 状态管理（localStorage）

```ts
// 键：tour_story_<documentId>_<uid 后6位>
{
  "1": {
    done: true,          // 剧情播放完成
    wish: "妈妈",        // 心愿词
    line: "warm",        // 已选线 warm|mystery
    tapCount: 4,         // 敲钟次数（>3 表示触发过第四声）
    completedAt: "2026-09-07T10:00:00.000Z"
  }
}
```

- 双线互锁：`line` 已存在时，再次游玩可选另一条线；两条线均完成后不再锁

- 站点完成（发分）仍由后端 `tour_progress.stations` 判定，剧情状态与结算解耦

## 6. 完整文案

### 6.1 双结局 epilogue

**warm 暖线**（选「被护的人，终会被护住」）：

> 钟声最后一声落下，檐角的风铃跟着颤了颤。你写下的名字，此刻正被人稳稳护着。
> 守钟人颔首：「字留钟上，愿落人心。去吧——关帝庙那位大爷，兴许知道下一把锁在哪儿。」

**mystery 悬疑线**（选「替人护着的人，才最孤独」）：

> 钟声最后一声落下，却像有什么在钟腹里轻轻回敲了一下——第四声，不是你的。
> 守钟人抬眼：「你听见了。」他把半张泛黄的签纸推过来：「关帝庙的老陈，等这个秘密，等了很多年。」

### 6.2 hidden 关键词对白（input 心愿匣）

| 关键词     | 对白                                               |
| ------- | ------------------------------------------------ |
| 妈妈      | 守钟人：「替你许给妈妈啊……钟声会轻些，怕惊着她。她也替你想过这一声，只是没说出口。」      |
| 爸爸 / 父亲 | 守钟人：「山上的男人话少，愿更沉。这一声，钟替你替他，都记住了。」                |
| 自己      | 守钟人：「头一回见人替自己敲钟。北山有规矩——许给自己的愿，要还三年。想清楚了？」        |
| 平安      | 钟之回声：「平安二字，北山一年要收上千斤。可你这一声，钟楼记得住——因为你说的时候，顿了一下。」 |
| （其他）    | 守钟人：「钟记下了。这字，会替你留在钟上。」                           |

### 6.3 第四声 bonus（tap 超敲，第 4 下）

> 钟之回声：「第四声……这钟，多年没人敲出过第四声了。上一次，是七年前，有个戴眼镜的年轻人，敲完就走，落下了半张签纸。」

### 6.4 复访对白（revisit，按已选线定制）

- **warm 线复访**：守钟人：「又来了。钟上的字还在，替你记着。这一回——想再敲一声，还是给谁捎句话？」

- **mystery 线复访**：守钟人：「为那第四声来的？老陈在关帝庙等你。他说，七年前那个人，走的时候回头看了钟楼三次。」

### 6.5 站间线索 hint（settle）

> 心愿絮条 · 第一声钟音，已收进你的行囊。
> 钟声的回响，隐隐沉向关帝庙——那里有位「话多的大爷」，逢人便讲他七年前遇见的一个敲钟人。

## 7. 改动清单

- Modify：`shao/data/tour-scenes.ts`（类型扩展 + PINGAN\_SCRIPT 全量重写 + revisit）

- Modify：`shao/pages/activity/tour.vue`（hidden/tap bonus/choice epilogue/settle hint/复访分支/二周目入口）

- 部署：shao 构建 → `deploy-h5.ps1` 部署 v.joho.cn（commit 提交 shao 仓库）

- 验收：id2（后端进度已重置为 `{}`）真机走完整剧情 + 触发隐藏彩蛋 + 复访验证

## 8. 风险与边界

- localStorage 丢进度：换设备/清缓存会回到首访（可接受，纯前端方案固有权衡）

- 旧 localStorage `done` 标记：复访分支天然处理（不会卡死在旧剧情态）

- 隐藏关键词表内置在数据文件，运营改动需发版（本次不做后台配置）

- 站间联动仅文案钩子，不影响其他站点现有打卡逻辑

- 后端 `tour_progress` 保持与剧情解耦：剧情重玩不重复发分（结算幂等）

