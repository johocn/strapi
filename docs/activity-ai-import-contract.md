# 线下活动「AI 导入」契约与提示词模板

> 用途：运营把需求描述粘贴进任意 AI 网页（DeepSeek / Kimi / 豆包 等），AI 按下方契约输出一份规范化 JSON；
> 运营再把 AI 输出的 JSON 粘贴到 web 运营端「活动导入」页，一键入库为 **draft 草稿**（含全部宣传数据）。
> 系统本身不接入任何 AI 依赖，本文件是「外置 AI → 粘贴导入」的唯一契约来源，后续后端 import 接口与导入页均以此为准。

---

## 1. 字段契约

| 字段 | 必填 | 类型 | 说明 / 合法值 | 缺省 |
|---|---|---|---|---|
| title | ✅ | string | 活动标题，2~60 字 | - |
| type | ✅ | string | 活动类型：讲座 / 沙龙 / 培训 / 工作坊 / 交流会 / 读书会 / 公益 / 体验课 / 团建 / 其他 | 其他 |
| description | ✅ | string | 活动介绍，≤2000 字 | - |
| startTime | ✅ | string | 开始时间，见「时间语法」 | - |
| category | | string | 分类：社会公益 / 讲座 / 沙龙 / 工作坊 / 培训 / 读书会 / 交流会 / 其他 | "" |
| venueName | | string | 场地名称（纯文本；不关联场地资源，创建后手动关联） | "" |
| capacity | | number | 名额，1~10000 | 100 |
| endTime | | string | 结束时间，见「时间语法」 | startTime + 3 小时 |
| pricingMode | | string | `flat` 一口价 / `tier` 阶梯价 / `factor` 因子价 | flat |
| cashPrice | | number | 报名费（元），≥0 | 0 |
| feeCollectAt | | string | `signup` 报名时收 / `checkin` 签到收 | signup |
| checkinMode | | string | `worker_scan` 核销 / `self` 自助 / `both` 都行 | both |
| promoTemplate | | string | `summit` 峰会 / `salon` 沙龙 / `training` 培训 / `action` 行动 / `life` 生活 | summit |
| promoModules | | array | 宣传模块数组，见「模块契约」 | 标准模块组 |
| promoContact | | object | 联系方式占位，见「联系方式」 | 占位 |
| formConfig | | array | 报名表单字段，见「报名表单」 | 姓名 + 手机号 |
| rewardConfig | | object | 报名奖励，见「奖励契约」 | 无奖励 |
| tags | | array | 字符串标签数组 | [] |
| assets | | array | 图片数组 `[{url}]`，先用占位图，运营后替换 | [] |

> 约束：导入一律入库为 **draft 草稿**，不开放报名；
> 讲师/场地/系列不在契约内，创建后到活动编辑页手动关联；
> 未列出的字段（status / 关系 / 结算等）由后端强制，不接受 AI 传入。

---

## 2. 时间语法

```
相对时间  "+Nd HH:mm"        例："+7d 09:00" = 服务器当前时间 +7 天 的 09:00
绝对时间  "YYYY-MM-DDTHH:mm"  例："2026-09-01T09:00"
```

> startTime 为**必填**，AI 必须给出（用相对时间）；以下缺省规则仅适用于**可选**时间字段：

| 字段 | 缺省 |
|---|---|
| endTime | startTime + 3 小时 |
| signupStart | 当前时间 |
| signupEnd | startTime（即"活动开始即截止报名"） |

---

## 3. 模块契约（promoModules）

每项结构：

```json
{ "type": "模块类型", "config": { "自由对象" }, "sort": 1 }
```

后端白名单（12 种，`config` 自由对象；**非法 type 会被后端丢弃**）：

| type | 含义 |
|---|---|
| cover | 封面 |
| info | 基本信息 |
| rich | 富文本 |
| highlights | 亮点 |
| speakers | 讲师 |
| agenda | 日程 |
| images | 图集 |
| rewards | 奖励 |
| contact | 联系方式 |
| message | 留言板 |
| faq | 常见问题 |
| custom | 自定义 |

---

## 4. 报名表单（formConfig）

字段项结构（field 类型：`text` / `textarea` / `number` / `select` / `radio` / `checkbox` / `date`）：

```json
[
  { "name": "name",  "label": "姓名",   "type": "text", "required": true, "placeholder": "请输入姓名" },
  { "name": "phone", "label": "手机号", "type": "text", "required": true, "placeholder": "请输入手机号" }
]
```

---

## 5. 奖励契约（rewardConfig）

```json
{
  "loginEnabled": false,
  "selectMode": "all",
  "rewards": [
    { "id": "r1", "name": "到场伴手礼", "type": "gift", "mode": "single", "condition": "none", "config": { "note": "到场领取" } }
  ]
}
```

- `mode`：`single` 基础自动发放 / `multi` 客户自选
- `condition`：`none` 无条件 / `wechat_auth` 微信授权 / `contact` 留联系方式 / `survey` 回答问卷
- `selectMode`：`all` 全选 / `one` 最多 1 / `any` 任选 N（配 `selectN`）

---

## 6. 联系方式（promoContact）

```json
{ "phone": "请填写真实电话", "wechat": "请填写真实微信号", "note": "请运营替换为真实联系方式" }
```

> 必须用占位符，禁止 AI 编造真实号码/微信号。

---

## 7. 提示词模板（复制给任意 AI 网页）

```text
你是活动运营宣传助手。根据用户对线下活动的描述，输出一份规范化 JSON 活动宣传数据。
要求：
1. 只输出一个 JSON 对象，不要任何 markdown 代码块标记（不要```）、不要注释、不要解释、不要多余文字。
2. 必须包含全部必填字段；字段名与取值严格按下表。
3. 时间用相对时间 "+Nd HH:mm"（如 +7d 09:00），不要用具体日期。
4. 联系方式 phone/wechat 一律用占位文本"请填写真实电话"/"请填写真实微信号"，禁止编造。
5. 图片 assets 用占位 [{ "url": "https://picsum.photos/seed/xxx/800/600" }]，不解释。
6. 若用户描述信息不足（如没说人数/费用/场地），用合理默认值补全并自然写入，不要拒绝。
7. 输出必须是合法 JSON，可直接被 JSON.parse 解析。

字段契约：
- title(必填,string,2~60字) 活动标题
- type(必填,string) 活动类型，从 讲座/沙龙/培训/工作坊/交流会/读书会/公益/体验课/团建/其他 选一个
- description(必填,string,≤2000字) 活动介绍
- startTime(必填,string) 相对时间如 "+7d 09:00"
- category(string) 从 社会公益/讲座/沙龙/工作坊/培训/读书会/交流会/其他 选一个
- venueName(string) 场地名称纯文本
- capacity(number,默认100) 名额
- endTime(string) 结束时间，相对时间；可省
- pricingMode(string,默认flat) flat/tier/factor
- cashPrice(number,默认0) 报名费元
- feeCollectAt(string,默认signup) signup/checkin
- checkinMode(string,默认both) worker_scan/self/both
- promoTemplate(string,默认summit) summit/salon/training/action/life
- promoModules(array) 宣传模块，每项 {type,config,sort}，type 从 cover/info/rich/highlights/speakers/agenda/images/rewards/contact/message/faq/custom 选；按宣传需要自由组合排序
- promoContact(object) {phone:"请填写真实电话",wechat:"请填写真实微信号",note:"请运营替换"}
- formConfig(array) 报名表单字段 [{name,label,type,required,placeholder}]，type 从 text/textarea/number/select/radio/checkbox/date
- rewardConfig(object) {loginEnabled:false,selectMode:"all",rewards:[{id,name,type,mode,condition,config}]}，mode:single/multi，condition:none/wechat_auth/contact/survey；无奖励则 rewards:[]
- tags(array) 标签字符串数组
- assets(array) 占位图 [{url}]

完整示例：
{
  "title": "城市咖啡手作品鉴沙龙",
  "type": "沙龙",
  "category": "沙龙",
  "description": "一次沉浸式的咖啡风味探索：从豆子产地、烘焙曲线到手冲手法，现场品鉴 4 款精品豆，由主理人带练冲煮。适合零基础与进阶爱好者。",
  "startTime": "+7d 14:00",
  "endTime": "+7d 16:30",
  "venueName": "城市客厅 · 咖啡工坊",
  "capacity": 24,
  "cashPrice": 99,
  "pricingMode": "flat",
  "feeCollectAt": "signup",
  "checkinMode": "both",
  "promoTemplate": "salon",
  "promoModules": [
    { "type": "cover", "config": { "title": "城市咖啡手作品鉴沙龙", "subtitle": "从产地到杯中的风味之旅" }, "sort": 1 },
    { "type": "info", "config": { "time": "+7d 14:00", "venue": "城市客厅 · 咖啡工坊", "capacity": 24, "price": 99 }, "sort": 2 },
    { "type": "highlights", "config": { "items": ["品鉴 4 款精品豆", "主理人手冲带练", "现场烘焙曲线讲解", "带走风味笔记"] }, "sort": 3 },
    { "type": "agenda", "config": { "items": [["14:00", "签到与破冰"], ["14:30", "豆子产地与风味"], ["15:30", "手冲实操带练"], ["16:15", "自由交流"]] }, "sort": 4 },
    { "type": "speakers", "config": { "items": [{ "name": "林小满", "desc": "SCA 认证咖啡师，5 年门店主理经验" }] }, "sort": 5 },
    { "type": "rewards", "config": {}, "sort": 6 },
    { "type": "faq", "config": { "items": [{ "q": "需要自带器材吗？", "a": "不需要，现场提供全套手冲器材" }] }, "sort": 7 },
    { "type": "contact", "config": {}, "sort": 8 },
    { "type": "message", "config": { "enabled": true }, "sort": 9 }
  ],
  "promoContact": { "phone": "请填写真实电话", "wechat": "请填写真实微信号", "note": "请运营替换为真实联系方式" },
  "formConfig": [
    { "name": "name", "label": "姓名", "type": "text", "required": true, "placeholder": "请输入姓名" },
    { "name": "phone", "label": "手机号", "type": "text", "required": true, "placeholder": "请输入手机号" }
  ],
  "rewardConfig": { "loginEnabled": false, "selectMode": "all", "rewards": [] },
  "tags": ["咖啡", "沙龙", "手冲"],
  "assets": [{ "url": "https://picsum.photos/seed/coffee/800/600" }]
}

请根据用户的描述输出 JSON。
```

---

## 8. 后端导入行为约定（import 接口）

1. 接收 AI 原文（可能带 ```json 代码块 / 前后解释文字）：剥代码块 → 取首个 `{` 到末个 `}` → JSON.parse。
2. 必填缺失、枚举非法（pricingMode/feeCollectAt/checkinMode/promoTemplate/promoModules.type/时间格式）→ **阻断**并返回字段级错误清单。
3. 未知字段忽略；`promoModules` 非法 type 丢弃、sort 去重排序（复用现有 `normalizePromoModules`）。
4. 模块 config 标准化（AI 契约格式 → C 端渲染组件格式）：
   - `highlights`：`config.items`（字符串数组）→ `config.points`
   - `agenda`：`config.items` 二维数组 `[t,title,desc?]` → 对象数组 `{t,title,desc}`；对象数组透传
   - `speakers`：`config.items` 丢弃（C 端读讲师关联实体 lecturer，导入时关系留空，运营后台手动关联讲师后展示）
   - 其余模块（cover/info/rich/images/rewards/contact/message/faq/custom）config 原样透传
5. 相对时间换算为绝对时间；缺省字段按「第 2 节」自动补全。
6. 一律 `status=draft` 入库；讲师/场地/系列/结算字段留空。
