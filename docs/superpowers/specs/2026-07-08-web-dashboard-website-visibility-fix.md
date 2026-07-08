# Web Dashboard 官网中心可见性修复与顺序调整

**日期：** 2026-07-08
**目标：** 修复 admin 角色登录后 dashboard 看不到"🌐 官网中心"区域的问题；并将官网中心从第 7 位调整到第 1 位（课程中心之前）。

---

## 1. 背景与问题

### 1.1 现象

admin 角色登录 web 目录后，dashboard 中"🌐 官网中心"区域完全不见（连标题都看不到）。

### 1.2 根因分析

| 项 | 现状 | 问题 |
|---|---|---|
| 权限配置 | permissions.ts 中 admin 拥有全部权限（含 `menu.website-center`） | 配置正确 |
| 权限同步 | 项目 memory 约束"系统角色权限启动时同步到数据库" | 后端已遵守 |
| 权限刷新 | dashboard 第 500 行用 `onMounted` 触发 `fetchPermissions()` | **违反 memory 约束** |
| memory 约束 | "Frontend must refresh permission data every time the dashboard page is entered to avoid using cached old data" | 当前代码未遵守 |

**核心问题：** dashboard 使用 Vue 3 的 `onMounted`（仅首次挂载触发），而非 uni-app 的 `onShow`（每次页面显示触发）。当用户从其他页面返回 dashboard 时，权限不会刷新，导致 `hasPermission('menu.website-center')` 判断时使用旧/空权限，section 被 `v-if` 隐藏。

### 1.3 顺序问题

当前 dashboard section 顺序：
1. 课程中心（第 92 行）
2. 学习数据
3. 题库系统
4. 积分体系
5. 标签体系
6. 营销运营
7. **官网中心（第 242 行）** ← 当前位置
8. 系统工具
9. 多租户管理
10. 系统设置

用户希望官网中心调整到第 1 位。

---

## 2. 设计方案

### 2.1 改动范围

| 文件 | 改动 |
|---|---|
| `web/pages/dashboard/index.vue` | 1. import 调整：移除 onMounted，引入 onShow<br>2. 生命周期：onMounted → onShow<br>3. section 顺序：官网中心移到课程中心之前 |

共 1 个文件，3 处修改。

### 2.2 改动 1：权限刷新机制

**第 408 行 import 修改：**

修改前：
```js
import { ref, computed, onMounted } from 'vue'
```

修改后：
```js
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
```

**第 500 行生命周期修改：**

修改前：
```js
onMounted(async () => {
  // ... 包含 fetchPermissions / fetchUserRoles / fetchTenants / loadSiteConfig / loadStats
})
```

修改后：
```js
onShow(async () => {
  // ... 内容保持不变
})
```

**刷新策略：** 全部 onShow（用户已确认）。每次进入 dashboard 都刷新权限+角色+租户+配置+统计。符合 memory 约束"每次进入 dashboard 都要刷新权限"。

### 2.3 改动 2：section 顺序调整

将"官网中心" section（当前第 242-318 行）整体移动到"课程中心" section（第 92 行）之前。

**新顺序：**
1. **官网中心** ← 移到最前（含 18 个菜单项）
2. 课程中心
3. 学习数据
4. 题库系统
5. 积分体系
6. 标签体系
7. 营销运营
8. 系统工具
9. 多租户管理
10. 系统设置

**移动方式：** 剪切官网中心 section 代码块，粘贴到课程中心 section 代码块之前。section 内部代码不变。

---

## 3. 验收标准

- [ ] admin 账号登录后，dashboard 显示"🌐 官网中心"区域及 18 个菜单项
- [ ] 官网中心显示在课程中心之前（顺序第 1 位）
- [ ] 从其他页面返回 dashboard，权限重新刷新（onShow 触发，菜单项可见性正确）
- [ ] 其他 section（课程/学习/题库等）顺序保持不变
- [ ] loadStats 等其他逻辑正常执行，无重复请求错误

---

## 4. 实施顺序

1. 修改 import（移除 onMounted，引入 onShow）
2. 修改生命周期（onMounted → onShow）
3. 移动官网中心 section 到课程中心之前
4. 提交 commit

---

## 5. 注意事项

- 如果修改后 admin 仍看不到官网区域，需确认后端已重启同步权限到数据库（memory 约束："System roles must have their permissions synchronized to the database on every startup"）
- onShow 每次触发都会发起多个网络请求（权限/角色/租户/配置/统计），这是用户已确认的策略
- section 移动时保持 section 内部代码原样，仅改变位置
