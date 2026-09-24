# 租户功能开关：考试 / 线下活动 / 内容角色限制(roleGate) 设计

日期：2026-08-23
状态：已批准（用户：按这个方案来）

---

## 1. 背景与目标

现有租户功能开关（`tenant/detail.vue` 的 `featureFlags`）只覆盖
`website/logistics/studio/points/course/quiz/channel/sso/thirdParty/oss/wealth`。
「考试」目前嵌套在题目中心（`pages/quiz/exam/*`）、「线下活动」在 `pages/activity/*`（对应后端 zhao-point 的 `activity-*`），
但二者都没有独立的租户开关，也没有「内容仅特定角色可见」的能力。

本设计要达成三点：

1. 在租户设置中为**考试(exam)**、**线下活动(activity)** 增加独立功能开关。
2. 新增**内容角色限制**能力（`roleGate` 总开关）：授权租户可对其**课程、线下活动、考试**
   分别设置「仅特定 zhao-auth 角色可见」；默认关闭 = 全开放。
3. 只有租户开启对应功能，web 运营端与 shao C端 的相应 CRUD / 读取 / 显示才开启可用。

---

## 2. 租户功能开关建模（featureFlags 新增 3 键）

| 新键 | 默认 | 父级依赖 | 说明 |
|---|---|---|---|
| `exam` | `true` | `quiz` | 考试模块总开关；`quiz=false` 时考试强制关闭 |
| `activity` | `true` | `points` | 线下活动模块总开关；`points=false` 时活动强制关闭 |
| `roleGate` | `false` | 无 | 内容角色限制能力总开关；默认关闭=全开放 |

### 2.1 生效规则（后端汇总）

```
moduleGranted(exam)    = featureFlags.exam !== false && moduleGranted(quiz)
moduleGranted(activity)= featureFlags.activity !== false && moduleGranted(points)

内容可见性开启 = 当前租户 featureFlags.roleGate === true
```

- 当 `exam`(或 `quiz`) 未开启：web 运营端考试菜单/路由隐藏，C端考试入口隐藏，考试相关 CRUD 不可用。
- 当 `activity`(或 `points`) 未开启：同理作用于线下活动。
- `roleGate` 关闭（默认）：所有课程/活动/考试全开放，`visibleToRoles` 配置区不展示、后端忽略该字段。

---

## 3. 内容角色限制（roleGate 核心机制）

### 3.1 数据模型

- `course`、`activity`(线下活动)、`exam` 各新增 JSON 字段 **`visibleToRoles`**（角色 code 数组）：
  - 空数组或 null = **全开放**（默认）
  - 非空 = 仅当 `用户.zhaoRoles ∩ visibleToRoles ≠ ∅` 时可见

对线下活动的粒度：默认挂在 `series`（活动系列，线下活动的组织/展示主体）上，`visibleToRoles` 为数组。

### 3.2 web 运营端

- 仅当租户 `roleGate=true` 时，课程/活动/考试的表单出现「可见角色」多选配置区（可选 zhao-auth 角色）。
- 未开启 `roleGate`：配置区隐藏；前端不上送该字段，即便上送后端也忽略。

### 3.3 C 端（后端强约束）

- 列表 / 详情接口统一按当前身份过滤受限项：
  - 若 `roleGate=false` → 不过滤
  - 若 `roleGate=true` 且 `item.visibleToRoles` 非空：
    - 登录用户：`user.zhaoRoles ∩ item.visibleToRoles ≠ ∅` 才可见
    - 游客：不可见受限项
- 过滤必须发生在**后端**（禁止仅前端隐藏，避免越权读取）。

---

## 4. 门户联动（租户开关驱动两端显隐）

### 4.1 后端

- `getPublicConfig` 返回的 `featureFlags` 增加 `exam / activity / roleGate`。
- `moduleGrantedForCurrentTenant` 增加 `exam`(挂 quiz)、`activity`(挂 points)。

### 4.2 web 运营端

- `constants/module.js`：`MODULE_LIST` 补 `exam`(挂 quiz 下)、`activity`(挂 points 下)；`DEFAULT_FEATURE_FLAGS` 补 3 键。
- `utils/config-helper.js`：`exam` 继承 quiz 的角色/可见性，`activity` 继承 points；`isModuleVisible` 按 moduleGranted + moduleVisibility 控制菜单与路由。
- 未开启对应模块：菜单隐藏、路由禁用。

### 4.3 shao C 端

- 读取 `featureFlags.exam / activity / roleGate`（复用站点配置读取）。
- 考试入口 / 线下活动入口按 `exam` / `activity` 显隐。
- 课程 / 活动 / 考试列表按 `roleGate` + `visibleToRoles` 过滤（由后端返回过滤后的数据）。

### 4.4 设置权限边界：功能开关 / 企业官网 / 多媒体发布中心 仅 admin 可配置

**三类租户设置仅平台超管 `admin`（zhao-auth 角色）可对租户设置，其他角色（channel-admin / plugin-manager / instructor / user）无权限：**

| 设置区域 | 可配置角色 |
|---|---|
| 功能开关（featureFlags，含本设计新增的 exam/activity/roleGate） | 仅 `admin` |
| 企业官网（website 相关配置） | 仅 `admin` |
| 多媒体发布中心（studio 相关配置） | 仅 `admin` |

- **前端（web 运营端）**：`tenant/detail.vue` 按当前用户 `zhaoRoles` 判定——上述三区域仅 `admin` 可见可编辑；非 admin 隐藏或只读展示，不上送修改。
- **后端（强约束）**：租户设置写入接口对 `featureFlags / website / studio` 相关字段做角色校验，非 `admin` 拒绝写入（沿用 `has-permission` 的 admin 放行逻辑）；前端隐藏仅作体验优化，不构成安全边界。

### 4.5 企业全局配置页：模块授权入口（moduleGranted 授权门控）

**来源定位**：已有页面 `e:\code\web\src\pages\global-config\index.vue`（路由 `pages/global-config/index`），dashboard「多租户管理」区"/租户权限"项进入，仅 `admin` 可见。

- 该页管理 **`moduleEnabled`(全局开关)** + **`moduleTenantGrants`(按租户授权)**。
- 后端 `getPublicConfig` 派生：`moduleGrantedForCurrentTenant[key] = moduleEnabled[key] || moduleTenantGrants[key].includes(当前租户)`。
- 这是 admin 给租户**授权模块**的统一入口：课程/活动/考试、企业官网/媒体发布 等模块若「全局关闭且未按租户授权」→ 该租户 `moduleGranted=false` → web 菜单与 C端入口均不可用。

**本设计对该页的补充：**
- 页面 `MODULE_LIST`/`DEFAULT_MODULE_ENABLED` 需补齐 `exam`、`activity`（顺带确保 `wealth`），使其可被 admin 授权。
- 授权门控应用到两端：
  - web：`isModuleVisible` 层 2 已用 `moduleGrantedForCurrentTenant`。
  - shao(C端)：对 课程/活动/考试 需读取 `moduleGrantedForCurrentTenant` 联合 `featureFlags` 判断入口可见性。

**两级授权关系（admin 统一由角色门控）：** `企业全局配置(moduleGranted授权)` 决定模块"是否授权该租户可用"；`租户详情的功能开关(featureFlags)` 决定"授权后是否开启"；C端/web 需两者同时满足才可用。

---

## 5. 错误处理与兜底

- 后端过滤为强约束；前端隐藏只做体验优化。
- `visibleToRoles` 引用已删除的角色时：仅按剩余存在的角色过滤，不报错、不隐藏全开放项。
- C端未登录访问受限项详情 → 按既有认证流程引导登录（登录后仍无交集则 404/不可见，不返回 403 以免误触登出）。

---

## 6. 测试要点

- 后端模块开关：`exam/quiz`、`activity/points` 的开关组合（on/off 交叉）正确。
- roleGate 过滤：开启/关闭、游客/登录用户、有交集/无交集用户各自正确。
- 门户显隐：web 菜单/路由、C端入口随开关联动。
- 过滤仅后端生效（构造无权限请求验证不返回受限数据）。

---

## 7. 实施范围提示

- 后端 zhao-common（config/featureFlags）、zhao-course、zhao-point、zhao-quiz（visibleToRoles 与过滤）。
- web 运营端 module.js / config-helper / tenant/detail.vue / 课程·活动·考试表单。
- shao C端 站点配置读取 + 考试/活动入口 + 列表过滤。
- 涉及插件 schema 增加 JSON 字段后会重生成 `types/generated`，需随提交。