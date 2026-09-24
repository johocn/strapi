# vadmin 移动端综合管理平台设计

- **创建日期**：2026-07-27
- **状态**：待实现
- **范围**：vendure 移动端综合管理平台的第一期，搭好权限框架与布局骨架，完整实现送货员模块，其他模块占位
- **核心原则**：第一期搭好骨架，后续按角色独立迭代，只填业务代码，不动权限与布局骨架

## 1. 平台定位与整体规划

### 1.1 定位

vadmin 是 **vendure 移动端综合管理平台**，不再是单一送货员后台：

- 一个工程、一套登录、一个 App
- 不同角色登录后看到不同首页、不同 tabbar、不同功能入口
- 第一期开发送货员模块，其他模块在布局上预留位置（灰色占位"即将上线"）
- 后续按角色独立迭代，但工程不拆分

### 1.2 核心设计原则

1. **统一入口、按权限分发**：登录后根据 Role 决定显示哪个首页、哪些 tab
2. **布局预留、模块可插**：未开发的模块在 UI 上保留入口占位（"即将上线"），后端 plugin 不存在时隐藏
3. **底部 tabbar 动态生成**：基于当前用户 Role 的权限生成 tab 项
4. **常用快捷功能上浮**：管理员常用功能（订单管理、商品管理、用户管理）从 PC 后台搬到 vadmin，简化为移动端列表+操作
5. **权限粒度到 resolver**：每个 admin-api mutation 都标 `@requiresPermission`，前端权限只控制显隐

### 1.3 功能模块全景图

```
vadmin 移动管理平台
│
├─ 送货模块 (delivery)          [第一期 MVP]
│  ├─ 我的任务
│  ├─ 订单详情
│  ├─ 开始配送
│  ├─ 送达签收
│  ├─ 异常上报
│  ├─ 一键导航 / 拨打
│  ├─ 历史任务                  [第二期]
│  └─ 个人统计                  [第二期]
│
├─ 销售模块 (sales)             [第二期]
│  ├─ 开单
│  ├─ 客户档案
│  ├─ 我的订单
│  ├─ 业绩查询
│  ├─ 客户跟进
│  └─ 快速报价
│
├─ 调库模块 (inventory)         [第三期]
│  ├─ 库存查询
│  ├─ 调拨单
│  ├─ 入库单 / 出库单
│  ├─ 盘点单
│  ├─ 库存预警
│  └─ 库存流水
│
├─ 客服模块 (cs)                [第二期]
│  ├─ 订单查询
│  ├─ 售后处理
│  ├─ 异常跟进
│  └─ 客户档案
│
├─ 运营模块 (ops)               [第四期]
│  ├─ 营销活动
│  ├─ 内容管理
│  └─ 数据看板
│
├─ 管理模块 (admin)             [第四期]
│  ├─ 数据看板
│  ├─ 订单管理
│  ├─ 商品管理
│  ├─ 用户管理
│  ├─ 财务概览
│  ├─ 营销活动
│  ├─ 异常处理
│  └─ 报表导出
│
└─ 通用模块 (common)            [第一期部分]
   ├─ 个人中心
   ├─ 消息中心                  [第二期]
   ├─ 扫码                      [第一期占位]
   ├─ 搜索                      [第二期]
   ├─ 帮助中心                  [第三期]
   └─ 设置                      [第三期]
```

### 1.4 迭代路线

| 阶段 | 模块 | 范围 |
|------|------|------|
| 第一期 | 送货模块 + 通用基础 | 送货闭环 + 登录 + 个人中心 + 权限框架 + 全模块占位 |
| 第二期 | 销售模块 + 客服模块 + 消息/搜索 | 开单 + 客户档案 + 业绩 + 售后处理 |
| 第三期 | 调库模块 + 帮助/设置 | 库存 + 调拨 + 盘点 |
| 第四期 | 运营模块 + 管理模块 | 看板 + 用户管理 + 营销 |

### 1.5 与现有系统的边界

- **不动 vshop**：vshop 是 C 端 storefront，保持纯净
- **不动 cjk-plugin**：delivery 是独立职责，避免 cjk-plugin 进一步膨胀
- **不动 vendure 核心 Fulfillment 状态机**：异常状态用 Order customFields 表达，Fulfillment 仍走标准 `Shipped → Delivered`
- **复用 vendure administrator 登录**：vadmin 登录页直接调 admin-api 的 `login(username, password)`，无需自己写鉴权

## 2. 权限控制系统

### 2.1 角色清单（7 个业务角色 + 1 个超管）

| 角色 code | 中文名 | 定位 |
|----------|--------|------|
| `delivery-staff` | 送货员 | 配送现场作业 |
| `sales-staff` | 销售员 | 开单、客户跟进 |
| `inventory-staff` | 调库员 | 库存调拨、盘点 |
| `customer-service` | 客服 | 订单咨询、售后处理 |
| `operations-staff` | 运营人员 | 营销活动、内容、数据 |
| `manager` | 管理员 | 全模块查看与操作 |
| `super-admin` | 超级管理员 | 全部权限 + 系统设置 |

### 2.2 完整权限矩阵

R=只读，RW=读写，✗=无权限

| 功能模块 | 送货员 | 销售员 | 调库员 | 客服 | 运营 | 管理员 | 超管 |
|---------|:----:|:----:|:----:|:----:|:----:|:----:|:----:|
| **送货任务** | RW 自己 | ✗ | ✗ | R 自己单 | ✗ | RW 全部 | RW |
| **开单（销售）** | ✗ | RW | ✗ | ✗ | ✗ | RW | RW |
| **客户档案** | ✗ | RW | ✗ | RW | ✗ | RW | RW |
| **库存查询** | ✗ | R | RW | ✗ | ✗ | RW | RW |
| **调拨单** | ✗ | ✗ | RW | ✗ | ✗ | RW | RW |
| **盘点** | ✗ | ✗ | RW | ✗ | ✗ | RW | RW |
| **入库/出库** | ✗ | ✗ | RW | ✗ | ✗ | RW | RW |
| **订单管理** | R 自己 | R 自己开 | ✗ | RW 全部 | ✗ | RW 全部 | RW |
| **售后处理** | ✗ | ✗ | ✗ | RW | ✗ | RW | RW |
| **商品管理** | ✗ | R | R | R | RW | RW | RW |
| **用户管理** | ✗ | ✗ | ✗ | ✗ | ✗ | RW | RW |
| **数据看板** | ✗ | R 个人 | ✗ | ✗ | RW | RW | RW |
| **异常订单** | R 上报的 | ✗ | ✗ | RW 跟进 | ✗ | RW 处理 | RW |
| **改派送货员** | ✗ | ✗ | ✗ | ✗ | ✗ | RW | RW |
| **营销活动** | ✗ | ✗ | ✗ | ✗ | RW | RW | RW |
| **内容管理** | ✗ | ✗ | ✗ | ✗ | RW | RW | RW |
| **财务概览** | ✗ | ✗ | ✗ | ✗ | ✗ | RW | RW |
| **消息中心** | R | R | R | R | R | RW | RW |
| **系统设置** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | RW |

### 2.3 Permission 命名空间与注册机制

每个模块独立 plugin，定义自己的 Permission。MVP 阶段 delivery-plugin 完整实现，其他模块 Permission 常量在 delivery-plugin 中预留定义，后续模块迭代时由各自 plugin 实现 resolver。

**注册机制**：vendure 要求用 `PermissionDefinition` 定义权限，并注册到 `config.authOptions.customPermissions`。参考 [pickup-permissions.ts](file:///e:/code/vendure/packages/cjk-plugin/src/pickup/pickup-permissions.ts)。

```typescript
// e:\code\vendure\packages\delivery-plugin\src\constants.ts
import { PermissionDefinition } from '@vendure/core';

// 用 PermissionDefinition 定义，每个权限带 name 和 description
export const deliveryPermissions = new PermissionDefinition({
  permissions: [
    { name: 'DeliverOrder',       description: '查看配送任务' },
    { name: 'MarkDelivered',      description: '标记送达' },
    { name: 'ReportException',    description: '上报异常' },
    { name: 'ViewAllDeliveries',  description: '查看全部配送' },
    { name: 'ReassignDelivery',   description: '改派' },
    // 其他模块预留权限（第二期起由各 plugin 自行定义，此处仅为前端配置一致性）
    { name: 'CreateOrder',        description: '开单' },
    { name: 'ViewOwnSales',       description: '查看自己的销售订单' },
    { name: 'ManageCustomer',     description: '客户档案管理' },
    { name: 'ViewSalesReport',    description: '业绩查询' },
    { name: 'ViewStock',          description: '库存查询' },
    { name: 'ManageStockMove',    description: '调拨单' },
    { name: 'ManageStocktake',    description: '盘点' },
    { name: 'ManageStockIn',      description: '入库' },
    { name: 'ManageStockOut',     description: '出库' },
    { name: 'ViewAllOrders',      description: '查看全部订单' },
    { name: 'HandleAfterSales',   description: '售后处理' },
    { name: 'HandleException',    description: '异常跟进' },
    { name: 'ManagePromotion',    description: '营销活动' },
    { name: 'ManageContent',      description: '内容管理' },
    { name: 'ViewDashboard',      description: '数据看板' },
    { name: 'ManageProduct',      description: '商品管理' },
    { name: 'ManageUser',         description: '用户管理' },
    { name: 'ViewFinance',        description: '财务概览' },
    { name: 'ManageMessage',      description: '消息群发' },
  ],
});

// 在 delivery.plugin.ts 的 configuration 中注册
// config.authOptions.customPermissions = [
//   ...(config.authOptions.customPermissions ?? []),
//   ...deliveryPermissions.permissions,
// ];

// resolver 中用 @Allow(Permission.DeliverOrder) 装饰
// 或用 deliveryPermissions.values.DeliverOrder
```

### 2.4 Role 与 Permission 绑定表

| Role | 绑定的 Permission |
|------|------------------|
| `delivery-staff` | `DeliverOrder`, `MarkDelivered`, `ReportException` |
| `sales-staff` | `CreateOrder`, `ViewOwnSales`, `ManageCustomer`, `ViewSalesReport`, `ViewStock`, `ManageProduct` |
| `inventory-staff` | `ViewStock`, `ManageStockMove`, `ManageStocktake`, `ManageStockIn`, `ManageStockOut`, `ManageProduct` |
| `customer-service` | `ViewAllOrders`, `HandleAfterSales`, `HandleException`, `ManageCustomer`, `ManageProduct` |
| `operations-staff` | `ManagePromotion`, `ManageContent`, `ViewDashboard` |
| `manager` | 所有业务 Permission（不含 `SuperAdmin`） |
| `super-admin` | 全部 Permission（含 `SuperAdmin`） |

### 2.5 权限同步机制

在 `delivery.plugin.ts` 的 `onBootstrap` 中：

```typescript
const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  'delivery-staff':     ['DeliverOrder', 'MarkDelivered', 'ReportException'],
  'sales-staff':        ['CreateOrder', 'ViewOwnSales', 'ManageCustomer', 'ViewSalesReport', 'ViewStock', 'ManageProduct'],
  'inventory-staff':    ['ViewStock', 'ManageStockMove', 'ManageStocktake', 'ManageStockIn', 'ManageStockOut', 'ManageProduct'],
  'customer-service':   ['ViewAllOrders', 'HandleAfterSales', 'HandleException', 'ManageCustomer', 'ManageProduct'],
  'operations-staff':   ['ManagePromotion', 'ManageContent', 'ViewDashboard'],
  'manager':            [/* 全部业务 Permission，不含 SuperAdmin */],
  'super-admin':        [/* 全部 Permission 含 SuperAdmin */],
};

// 遍历 map：
// - 缺失 Role 自动创建
// - 缺失 Permission 自动补绑到对应 Role
// - 已存在的 Role 不动，避免覆盖管理员手动调整
// - 创建 Role 时绑定默认 Channel（vendure 中 Channel 绑定在 Role 上，不在 Administrator 上）
//   多 channel 场景下需为每 Channel 创建独立 Role，或把 Role 关联所有 Channel
// - 输出同步日志：[delivery-plugin] Synced 7 roles, 25 permissions
```

### 2.5.1 Role 与 Channel 绑定

vendure 中 Channel 绑定在 Role 上（`Role.channels: ManyToMany`），不在 Administrator 上。这意味着：

- **单 Channel 场景（MVP）**：所有业务 Role 关联默认 Channel 即可
- **多 Channel 场景**：要么为每 Channel 创建独立 Role（如 `delivery-staff-channel-a`），要么把业务 Role 关联所有 Channel
- MVP 采用单 Channel 策略，同步时把所有业务 Role 关联到 `ctx.channelId` 对应的 Channel
- 多 Channel 策略留待后续迭代

### 2.6 后端权限校验

每个 mutation/query 都标 `@Allow(Permission.Xxx)`，并在 service 内做二次校验（送货员只能看自己的单）：

```typescript
@Query(() => [DeliveryOrder])
@Allow(Permission.DeliverOrder)
async myDeliveries(@Ctx() ctx: RequestContext, @Args() args: { status?: string }) {
  // 内部再校验：送货员只能看自己的单
  if (ctx.user && this.hasRole(ctx.user, 'delivery-staff') && !this.hasRole(ctx.user, 'manager')) {
    return this.service.findByStaffId(ctx.user.id, args.status);
  }
  // 管理员/超管可看全部
  if (this.hasRole(ctx.user, 'manager') || this.hasRole(ctx.user, 'super-admin')) {
    return this.service.findAll(args.status);
  }
  throw new ForbiddenError();
}
```

### 2.7 myPermissions Admin API

```graphql
type Query {
  myPermissions: MyPermissionProfile!
}

type MyPermissionProfile {
  roles: [String!]!
  permissions: [String!]!
  visibleModules: [ModuleConfig!]!   # 基于权限动态计算可见模块
}

type ModuleConfig {
  code: String!          # 'delivery' / 'sales' / 'inventory' / 'cs' / 'ops' / 'admin' / 'common'
  name: String!          # 中文名
  enabled: Boolean!      # 后端 plugin 是否已实现
  entryPath: String!     # 前端路由路径
  icon: String!
  sort: Int!
}
```

模块可见性配置表（与前端 shortcuts.ts 对齐）：

```typescript
const MODULE_CONFIGS = [
  { code: 'delivery',  name: '送货',  enabled: true,  entryPath: '/pkg-delivery/pages/list/index', icon: '📦', sort: 10, perms: ['DeliverOrder','MarkDelivered','ReportException','ViewAllDeliveries','ReassignDelivery'] },
  { code: 'sales',     name: '销售',  enabled: false, entryPath: '/pkg-sales/pages/list/index',    icon: '📝', sort: 20, perms: ['CreateOrder','ViewOwnSales','ManageCustomer','ViewSalesReport'] },
  { code: 'inventory', name: '调库',  enabled: false, entryPath: '/pkg-inventory/pages/stock/index', icon: '📊', sort: 30, perms: ['ViewStock','ManageStockMove','ManageStocktake','ManageStockIn','ManageStockOut'] },
  { code: 'cs',        name: '客服',  enabled: false, entryPath: '/pkg-cs/pages/orders/index',    icon: '🎧', sort: 40, perms: ['ViewAllOrders','HandleAfterSales','HandleException'] },
  { code: 'ops',       name: '运营',  enabled: false, entryPath: '/pkg-ops/pages/promotion/index', icon: '🎁', sort: 50, perms: ['ManagePromotion','ManageContent','ViewDashboard'] },
  { code: 'admin',     name: '管理',  enabled: false, entryPath: '/pkg-admin/pages/dashboard/index', icon: '⚙️', sort: 60, perms: ['ManageProduct','ManageUser','ViewFinance','ManageMessage','ViewDashboard'] },
  { code: 'common',    name: '通用',  enabled: true,  entryPath: '/pages/profile/index',         icon: '👤', sort: 70, perms: [] },
];

function computeVisibleModules(userPermissions: string[]): ModuleConfig[] {
  return MODULE_CONFIGS
    .filter(m => m.enabled && (
      m.perms.length === 0 ||
      m.perms.some(p => userPermissions.includes(p))
    ))
    .map(m => ({ ...m }));
}
```

### 2.8 前端权限控制

#### permission store

```typescript
// e:\code\vadmin\src\stores\permission.ts
export const usePermissionStore = defineStore('permission', () => {
  const permissions = ref<string[]>([]);
  const roles = ref<string[]>([]);
  const visibleModules = ref<ModuleConfig[]>([]);

  function has(perm: string): boolean {
    return permissions.value.includes(perm) || roles.value.includes('super-admin');
  }

  function is(role: string): boolean {
    return roles.value.includes(role);
  }

  async function load() {
    const profile = await fetchMyPermissions();
    permissions.value = profile.permissions;
    roles.value = profile.roles;
    visibleModules.value = profile.visibleModules;
  }

  return { permissions, roles, visibleModules, has, is, load };
});
```

#### 路由守卫

```typescript
// composables/usePermission.ts
export function usePermission() {
  const store = usePermissionStore();

  // 路由元信息配 meta: { perm: 'MarkDelivered' }
  // 守卫检查：无权限则跳 403 页
  function checkRoute(to: any) {
    if (to.meta.perm && !store.has(to.meta.perm)) {
      return { path: '/pages/403/index' };
    }
  }

  function can(perm: string): boolean {
    return store.has(perm);
  }

  return { can, checkRoute };
}
```

#### 组件级权限指令

```vue
<button v-perm="'MarkDelivered'" @click="onSign">送达签收</button>
<button v-perm="'ReassignDelivery'" @click="onReassign">改派</button>
```

```typescript
// main.ts 注册全局指令
app.directive('perm', {
  mounted(el, binding) {
    if (!usePermissionStore().has(binding.value)) {
      el.parentNode?.removeChild(el);
    }
  }
});
```

### 2.9 权限缓存与刷新

- **登录成功后**：调 `myPermissions` 加载到 store
- **每次进入首页**：重新调 `myPermissions` 刷新（避免管理员后台改了权限 vadmin 还用旧权限）
- **403 响应**：清空 token + 权限，跳登录页
- **前端 store 持久化**：`uni.setStorageSync('my_permissions', ...)`，启动时优先读缓存再异步刷新

### 2.10 权限异常处理

| 场景 | 处理 |
|------|------|
| 用户无任何业务角色 | 登录后显示"账号未授权"提示页，可退出登录 |
| 后端 plugin 未实现但前端有入口 | 入口显示"即将上线"灰色按钮，点击 toast 提示 |
| 管理员后台撤销了某权限 | 用户下次进首页刷新时被识别，对应入口隐藏 |
| 越权调用 admin-api | 后端 `@Allow` 拦截，返回 `FORBIDDEN`，前端 toast 提示并刷新权限 |
| 多角色用户主角色不确定 | 见 2.10.1 |

### 2.10.1 多角色用户主角色确定

vendure Administrator 可关联多个 Role，`myPermissions.roles` 返回数组但顺序无保证。多角色用户（如既是销售又是送货）的主角色确定策略：

- **MVP 策略**：按角色优先级表硬编码取第一个匹配的角色作为主角色
  - 优先级：`super-admin` > `manager` > `operations-staff` > `customer-service` > `sales-staff` > `inventory-staff` > `delivery-staff`
  - 即"权限最大的角色优先"，避免低权限角色覆盖高权限角色的视图
- **第二期**：扩展 Administrator customFields 加 `primaryRole` 字段，用户在个人中心手动选择主角色
- **工作台聚合**：即使主角色是 delivery-staff，工作台九宫格仍聚合展示该用户所有权限对应的快捷入口

### 2.10.2 改派功能说明

`ReassignDelivery` Permission 已定义，但 MVP 阶段不提供 UI：

- **PC Admin UI 改派界面**：不在本 spec 范围，第四期独立实现
- **MVP 改派方式**：
  - 后端 `reassignDelivery(orderId, newStaffId)` resolver 完整实现并暴露
  - 管理员通过 GraphQL playground 直接调用 mutation 改派
  - 或通过数据库直接修改 `Order.customFields.deliveryStaffId`
- **异常订单处理**：送货员上报异常后，订单 `deliveryStatus = 'exception'`，管理员在 PC Admin UI 看到异常列表后手动改派或取消

## 3. 移动端布局与导航

### 3.1 整体布局架构

vadmin 采用 **角色驱动的动态 tabbar + 统一工作台首页**：

- 顶部：欢迎语 + 角色 + 消息铃铛
- 中部：快捷功能九宫格（按权限动态生成）+ 角色相关 KPI 卡片 + 待办事项列表
- 底部：动态生成的 tabbar（最多 4 个 tab）

### 3.2 角色 × tabbar 矩阵

不同角色登录后看到的 tabbar 不同，但**最多 4 个**（移动端空间有限）：

| 角色 | tab 1 | tab 2 | tab 3 | tab 4 |
|------|-------|-------|-------|-------|
| delivery-staff | 工作台 | 任务 | 扫码 | 我的 |
| sales-staff | 工作台 | 订单 | 扫码 | 我的 |
| inventory-staff | 工作台 | 库存 | 扫码 | 我的 |
| customer-service | 工作台 | 订单 | 扫码 | 我的 |
| operations-staff | 工作台 | 营销 | 扫码 | 我的 |
| manager | 工作台 | 管理 | 扫码 | 我的 |
| super-admin | 工作台 | 管理 | 扫码 | 我的 |

> 多角色用户（如既是销售又是调库）取主角色 + 工作台聚合多模块入口

### 3.3 工作台首页设计

```
┌─────────────────────────────────────┐
│  欢迎你，张三 [送货员]      🔔 12   │  ← 顶部欢迎+消息
├─────────────────────────────────────┤
│  📋 待取货 3   🚚 配送中 2          │  ← 角色相关 KPI 卡片
│  ✅ 今日已完成 8                      │
├─────────────────────────────────────┤
│  快捷功能                            │
│  ┌────┐ ┌────┐ ┌────┐               │
│  │📦  │ │🗺️  │ │📞  │               │  ← 九宫格快捷入口
│  │任务│ │导航│ │拨号│               │     按权限动态生成
│  └────┘ └────┘ └────┘               │
│  ┌────┐ ┌────┐ ┌────┐               │
│  │📊  │ │🎫  │ │⚙️  │               │  ← 未开发模块灰色
│  │统计│ │签收│ │设置│   "即将上线"  │
│  └────┘ └────┘ └────┘               │
├─────────────────────────────────────┤
│  待办事项                            │
│  ┌─────────────────────────────┐    │
│  │ 🚚 #10023 待取货 10:23      │    │  ← 角色相关待办
│  │ 朝阳区 xx 路 → [导航]       │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ ⚠️ #10019 异常待处理        │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [工作台] [任务] [扫码] [我的]      │
└─────────────────────────────────────┘
```

### 3.4 快捷功能九宫格（按角色生成）

各角色展示 8-12 个快捷入口：

- **delivery-staff**：任务列表、签收、异常上报、扫码、导航、拨号、消息、设置
- **sales-staff**：开单、客户档案、我的订单、扫码、商品查询、业绩、消息、设置
- **inventory-staff**：库存查询、调拨、入库、出库、盘点、扫码、消息、设置
- **customer-service**：订单查询、售后处理、异常跟进、客户档案、商品查询、消息群发、消息、设置
- **operations-staff**：营销活动、优惠券、内容管理、数据看板、商品管理、消息群发、消息、设置
- **manager**：数据看板、订单管理、商品管理、用户管理、营销活动、财务概览、异常处理、消息
- **super-admin**：数据看板、订单管理、商品管理、用户管理、营销活动、财务概览、系统设置、消息

> 未实现的模块显示为灰色占位"即将上线"，点击 toast 提示

### 3.5 统一列表页模板

所有列表页共用 `ListPageLayout`，减少重复代码：

```vue
<!-- components/ListPageLayout.vue -->
<template>
  <view class="list-page">
    <SearchBar v-model="keyword" @search="refresh" />
    <FilterTabs v-model="activeStatus" :tabs="statusTabs" @change="refresh" />
    <scroll-view scroll-y refresher-enabled @refresherrefresh="onPull">
      <CardItem v-for="item in list" :key="item.id" :data="item" @click="onDetail" />
      <EmptyState v-if="!list.length" text="暂无数据" />
      <LoadMore :status="loadStatus" />
    </scroll-view>
    <FabButton v-if="canCreate" @click="onCreate" />  <!-- 悬浮新建按钮 -->
  </view>
</template>
```

### 3.6 页面路由与分包设计

```
src/
├─ pages/                         # 主包
│  ├─ login/index.vue             # 登录
│  ├─ home/index.vue              # 工作台（默认 Tab）
│  ├─ scan/index.vue              # 扫码入口（默认 Tab）
│  ├─ profile/index.vue           # 个人中心（默认 Tab）
│  ├─ 403/index.vue               # 无权限页
│  └─ 404/index.vue               # 找不到页
│
├─ pkg-delivery/pages/            # 送货模块分包 [第一期实现]
│  ├─ list/index.vue              # 任务列表（tab）
│  ├─ detail/index.vue            # 订单详情
│  ├─ sign/index.vue              # 签收页
│  └─ exception/index.vue         # 异常上报
│
├─ pkg-sales/pages/               # 销售模块分包 [第二期占位]
│  └─ placeholder.vue
│
├─ pkg-inventory/pages/           # 调库模块分包 [第三期占位]
│  └─ placeholder.vue
│
├─ pkg-cs/pages/                  # 客服模块分包 [第二期占位]
│  └─ placeholder.vue
│
├─ pkg-ops/pages/                 # 运营模块分包 [第四期占位]
│  └─ placeholder.vue
│
├─ pkg-admin/pages/               # 管理模块分包 [第四期占位]
│  └─ placeholder.vue
│
└─ pkg-common/pages/              # 通用分包
   ├─ message/placeholder.vue     # [第二期]
   ├─ settings/placeholder.vue    # [第三期]
   └─ help/placeholder.vue        # [第三期]
```

### 3.7 路由元信息与权限守卫

```typescript
// router/meta.ts
export const ROUTE_META: Record<string, { perm?: string; module?: string }> = {
  'pkg-delivery/pages/list/index':      { perm: 'DeliverOrder' },
  'pkg-delivery/pages/sign/index':      { perm: 'MarkDelivered' },
  'pkg-delivery/pages/exception/index': { perm: 'ReportException' },
  'pkg-sales/pages/create/index':       { perm: 'CreateOrder' },
  'pkg-inventory/pages/move/index':     { perm: 'ManageStockMove' },
  // ... 全部路由的权限映射
};

// composables/useAuthGuard.ts 增强
function checkRoute(to: string) {
  const meta = ROUTE_META[to];
  if (meta?.perm && !permissionStore.has(meta.perm)) {
    return { path: '/pages/403/index' };
  }
}
```

### 3.8 工作台首页动态渲染

```vue
<!-- pages/home/index.vue -->
<template>
  <view class="home">
    <HomeHeader :user="user" :msg-count="msgCount" />
    <KpiCards :cards="kpiCards" />

    <view class="section">
      <view class="title">快捷功能</view>
      <GridLayout :items="shortcuts" :columns="4">
        <template #item="{ item }">
          <ShortcutButton
            :icon="item.icon"
            :label="item.name"
            :disabled="!item.enabled"
            @click="onShortcut(item)"
          />
        </template>
      </GridLayout>
    </view>

    <view class="section">
      <view class="title">待办事项</view>
      <TodoList :items="todos" @click="onTodo" />
    </view>
  </view>
</template>

<script setup>
const permissionStore = usePermissionStore();
const user = computed(() => authStore.user);
const kpiCards = computed(() => buildKpiByRole(permissionStore.roles));
const shortcuts = computed(() => buildShortcutsByPermission(permissionStore));
</script>
```

### 3.9 快捷功能配置（src/config/shortcuts.ts）

```typescript
export const SHORTCUTS: ShortcutConfig[] = [
  // 送货模块
  { code: 'delivery-tasks',  name: '任务', icon: '📦', perm: 'DeliverOrder',       route: '/pkg-delivery/pages/list/index' },
  { code: 'delivery-sign',   name: '签收', icon: '✍️', perm: 'MarkDelivered',      route: '/pkg-delivery/pages/sign/index' },
  { code: 'delivery-except', name: '异常', icon: '⚠️', perm: 'ReportException',    route: '/pkg-delivery/pages/exception/index' },
  // 销售模块
  { code: 'sales-create',    name: '开单', icon: '📝', perm: 'CreateOrder',        route: '/pkg-sales/pages/create/index' },
  { code: 'sales-customer',  name: '客户', icon: '👤', perm: 'ManageCustomer',     route: '/pkg-sales/pages/customer/index' },
  { code: 'sales-report',    name: '业绩', icon: '📈', perm: 'ViewSalesReport',    route: '/pkg-sales/pages/report/index' },
  // 调库模块
  { code: 'inv-stock',       name: '库存', icon: '📊', perm: 'ViewStock',          route: '/pkg-inventory/pages/stock/index' },
  { code: 'inv-move',        name: '调拨', icon: '🔄', perm: 'ManageStockMove',    route: '/pkg-inventory/pages/move/index' },
  { code: 'inv-stocktake',   name: '盘点', icon: '📋', perm: 'ManageStocktake',    route: '/pkg-inventory/pages/stocktake/index' },
  // 客服模块
  { code: 'cs-orders',       name: '订单', icon: '🛒', perm: 'ViewAllOrders',      route: '/pkg-cs/pages/orders/index' },
  { code: 'cs-after-sales',  name: '售后', icon: '↩️', perm: 'HandleAfterSales',   route: '/pkg-cs/pages/after-sales/index' },
  // 运营模块
  { code: 'ops-promo',       name: '营销', icon: '🎁', perm: 'ManagePromotion',    route: '/pkg-ops/pages/promotion/index' },
  { code: 'ops-dashboard',   name: '看板', icon: '📊', perm: 'ViewDashboard',      route: '/pkg-ops/pages/dashboard/index' },
  // 管理模块
  { code: 'admin-orders',    name: '订单', icon: '🛒', perm: 'ViewAllOrders',      route: '/pkg-admin/pages/orders/index' },
  { code: 'admin-products',  name: '商品', icon: '🏷️', perm: 'ManageProduct',      route: '/pkg-admin/pages/products/index' },
  { code: 'admin-users',     name: '用户', icon: '👥', perm: 'ManageUser',         route: '/pkg-admin/pages/users/index' },
  { code: 'admin-finance',   name: '财务', icon: '💰', perm: 'ViewFinance',        route: '/pkg-admin/pages/finance/index' },
  // 通用
  { code: 'common-scan',     name: '扫码', icon: '📷', perm: null,                 route: '/pages/scan/index' },
  { code: 'common-message',  name: '消息', icon: '🔔', perm: null,                 route: '/pkg-common/pages/message/list' },
  { code: 'common-settings', name: '设置', icon: '⚙️', perm: 'SuperAdmin',        route: '/pkg-common/pages/settings/index' },
];
```

`buildShortcutsByPermission` 根据当前用户权限过滤，并按角色排序（主角色相关排前面），最多展示 12 个。

### 3.10 模块占位与"即将上线"

```vue
<!-- components/ModulePlaceholder.vue -->
<template>
  <view class="placeholder" @click="onTip">
    <view class="icon">{{ icon }}</view>
    <view class="name">{{ name }}</view>
    <view class="badge">即将上线</view>
  </view>
</template>

<script setup>
const props = defineProps<{ icon: string; name: string }>();
function onTip() {
  uni.showToast({ title: '即将上线，敬请期待', icon: 'none' });
}
</script>
```

每个分包目录即使不开发，也建一个 `placeholder.vue`，在 pages.json 注册但只渲染占位组件。这样：
- 工程结构完整
- 跳转链接可达
- 用户体验一致（看到入口而不是空白）

### 3.11 扫码中心（统一扫码入口）

```
┌─────────────────────────────────────┐
│  扫码中心                            │
├─────────────────────────────────────┤
│  请选择扫码类型                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📦 订单码（送货员）          │    │
│  │   扫码查看订单详情并签收     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 🏷️ 商品码（销售/调库/管理）  │    │
│  │   扫码查看商品详情/库存      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 📋 库位码（调库员）          │    │
│  │   扫码查看库位库存           │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 🎫 活动码（运营）            │    │
│  │   扫码查看活动详情           │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

扫码类型按权限过滤，扫码后根据内容路由到对应详情页。

### 3.12 个人中心

```
┌─────────────────────────────────────┐
│  👤 张三                             │
│  角色：送货员 | ID: 1024             │
├─────────────────────────────────────┤
│  📊 今日数据                         │
│  ┌──────┬──────┬──────┐             │
│  │  8   │  3   │  2   │             │
│  │已完成│ 待取 │ 配送中│             │
│  └──────┴──────┴──────┘             │
├─────────────────────────────────────┤
│  ⚙️ 功能                            │
│  ├─ 🔄 切换角色（多角色用户）       │
│  ├─ 🔔 消息通知                     │
│  ├─ 📖 帮助中心                     │
│  ├─ 📧 意见反馈                     │
│  ├─ ℹ️ 关于                          │
│  └─ 🚪 退出登录                     │
└─────────────────────────────────────┘
```

- **切换角色**：多角色用户（如既是销售又是调库）可手动切换主角色，影响工作台首页和 tabbar
- **今日数据**：按角色展示不同 KPI（送货员看完成单数，销售看业绩，调库看库存变动等）

### 3.13 未实现模块的处理策略

| 模块 | 第一期处理 |
|------|----------|
| pkg-sales | 目录建空，placeholder.vue 占位，工作台入口灰色 |
| pkg-inventory | 同上 |
| pkg-cs | 同上 |
| pkg-ops | 同上 |
| pkg-admin | 同上 |
| pkg-common/message | 建空，铃铛图标显示但不跳转，toast 提示 |
| pkg-common/settings | 建空，超管可见但内容占位 |
| pkg-common/help | 建空，placeholder.vue |

工程结构完整，未来二期/三期直接填实现，不动整体布局。

## 4. 后端 delivery-plugin 设计

### 4.1 插件目录结构

```
e:\code\vendure\packages\delivery-plugin\
├─ src/
│  ├─ index.ts                          # 插件入口
│  ├─ constants.ts                      # Permission 全量常量、状态枚举
│  ├─ types.ts                          # DTO 接口
│  ├─ delivery.plugin.ts                # VendurePlugin 定义
│  ├─ role-sync.ts                      # 8 个角色 + Permission 绑定同步
│  ├─ module-config.ts                  # MODULE_CONFIGS 配置
│  ├─ delivery.service.ts               # 业务逻辑（派单、签收、异常）
│  ├─ delivery-admin.resolver.ts        # delivery admin-api resolver
│  ├─ permission-admin.resolver.ts      # myPermissions resolver
│  ├─ delivery-events.ts                # 自动派单事件订阅
│  └─ config/
│     └─ order-custom-fields.ts         # Order customFields 扩展
├─ package.json
├─ tsconfig.json
└─ README.md
```

### 4.2 自定义 Permission（全量定义）

详见 2.3 节。

### 4.3 Role 同步（全量 7+1 角色）

详见 2.4、2.5 节。在 `onBootstrap` 中同步所有角色，缺失 Role 自动创建，缺失 Permission 自动补绑，已存在的 Role 不动避免覆盖管理员手动调整。

### 4.4 Order customFields 扩展

| 字段 | 类型 | 说明 |
|------|------|------|
| `deliveryStaffId` | `String` | 被派单的 administrator id |
| `deliveryStatus` | `Enum` | `assigned` / `in_progress` / `delivered` / `exception` |
| `assignedAt` | `DateTime` | 派单时间 |
| `deliveredAt` | `DateTime` | 送达时间 |
| `deliveryPhotos` | `[String]` | OSS URL 数组 |
| `deliveryNote` | `String` | 送达备注 |
| `exceptionType` | `String` | `rejected` / `wrong_address` / `no_recipient` / `damaged` / `other` |
| `exceptionNote` | `String` | 异常备注 |
| `exceptionPhotos` | `[String]` | 异常照片 |

### 4.4.1 Address customFields 扩展（导航功能依赖）

为支持一键导航，需扩展 `Address` customFields 存收货地址经纬度：

```typescript
config.customFields.Address = [
  ...(config.customFields.Address ?? []),
  { name: 'latitude',  type: 'float', nullable: true },
  { name: 'longitude', type: 'float', nullable: true },
];
```

注意：Address customFields 同时作用于 shipping 和 billing 地址，但两地址是不同实体实例，数据独立。前端在用户下单时通过地图选点获取经纬度写入 shippingAddress.customFields（vshop 端工作，不在本 spec 范围）。若地址无经纬度，vadmin 详情页的"一键导航"按钮禁用并提示。

### 4.5 Delivery Admin Resolver API

```graphql
type Query {
  myDeliveries(status: String): [DeliveryOrder!]!
    @requiresPermission(Permission.DeliverOrder)
  # 内部用 ctx.user.id 过滤，送货员只能看自己的单；管理员可看全部
}

type Mutation {
  markDelivered(orderId: ID!, photos: [String!]!, note: String): DeliveryOrder!
    @requiresPermission(Permission.MarkDelivered)
  reportException(orderId: ID!, type: String!, photos: [String!]!, note: String): DeliveryOrder!
    @requiresPermission(Permission.ReportException)
  startDelivery(orderId: ID!): DeliveryOrder!
    @requiresPermission(Permission.DeliverOrder)
}

type DeliveryOrder {
  orderId: ID!
  code: String!
  deliveryStatus: String!
  customer: CustomerInfo!
  lines: [DeliveryLine!]!
  totalWithTax: Int!
  assignedAt: DateTime
  deliveredAt: DateTime
  deliveryPhotos: [String!]
  deliveryNote: String
  exceptionType: String
  exceptionPhotos: [String!]
}

type CustomerInfo {
  name: String
  phone: String
  address: String
  latitude: Float
  longitude: Float
}

type DeliveryLine {
  name: String
  sku: String
  qty: Int
  imageUrl: String
}
```

### 4.6 自动派单逻辑

订阅 `OrderStateTransitionEvent`：

- **触发条件**：`toState === 'PaymentSettled'`
- **查询候选送货员**：所有拥有 `delivery-staff` Role 的 administrator
  - vendure 无现成"按 Role 查 Administrator"API，需自定义 service：
    `repository.find({ relations: ['user', 'user.roles'] })` 后内存过滤 `admin.user.roles.some(r => r.code === 'delivery-staff')`
  - 加 5 分钟内存缓存避免每次派单都查库
- **负载均衡排序**：按"该送货员当前未完成订单数 ASC, lastAssignedAt ASC"排序，选第一个
- **写入**：`Order.customFields.deliveryStaffId = X`、`deliveryStatus = 'assigned'`、`assignedAt = now()`
- **创建 Fulfillment**：派单时自动创建 Fulfillment 并标记 `Shipped`，使 vendure 标准流程与配送状态对齐
  - 用 `fulfillmentService.createFulfillment(ctx, { order, lines, handler: { code: 'manual', arguments: [] } })` 创建
  - 创建后立即 `transitionToState(ctx, fulfillmentId, 'Shipped')`
  - trackingNumber 可填 `deliveryStaffId` 便于反查
- **无可用送货员**：保留 `deliveryStaffId = NULL`，不创建 Fulfillment，记录 warning 日志，等待管理员手动指派
- **事务**：用 `this.connection.withTransaction(ctx, async txCtx => { ... })` 保证派单原子性
  - 注意：必须用回调内的 `txCtx`，不能用外层 `ctx`
  - 参考 [coupon.service.ts](file:///e:/code/vendure/packages/coupon-plugin/src/coupon.service.ts) 第 248-273 行

### 4.7 状态机扩展说明

`deliveryStatus` 独立流转，同时驱动 Fulfillment 状态推进：

```
[新订单 PaymentSettled]
    └──派单──> assigned (创建 Fulfillment → Shipped)
                └──开始──> in_progress
                            ├──送达──> delivered (Fulfillment Shipped → Delivered)
                            └──异常──> exception (Fulfillment 保持 Shipped，等人工处理)
```

- **派单时**：创建 Fulfillment 并转 Shipped，库存按 vendure 标准流程扣减
- **送达时**：Fulfillment 从 Shipped → Delivered
- **异常时**：Fulfillment 保持 Shipped，由管理员在 PC Admin UI 处理（改派或取消）
- 不修改 Fulfillment 标准状态机定义，只调用标准 transition API

### 4.8 错误处理策略

| 场景 | 处理 |
|------|------|
| 送货员调 `markDelivered` 但 orderId 不属于自己 | 抛 `ForbiddenError` |
| 订单已经被标记送达 | 抛 `ConflictError` |
| 上传照片失败 | vadmin 客户端拦截，不调用 mutation |
| 自动派单时无可用送货员 | 跳过，记 warning，不抛异常打断主流程 |
| `deliveryStatus` 不在允许的转移路径 | service 内校验，抛 `UserInputError` |

### 4.9 dev-config 注册

在 [e:\code\vendure\packages\dev-server\dev-config.ts](file:///e:/code/vendure/packages/dev-server/dev-config.ts) 中导入并 `plugins: [DeliveryPlugin.init()]`，本地开发即可生效。

## 5. 前端 vadmin 设计

### 5.1 工程初始化

新建 `e:\code\vadmin`，从 vshop 拷贝基础设施：

```
e:\code\vadmin\
├─ src/
│  ├─ api/
│  │  ├─ client.ts                  # 改为指向 /admin-api
│  │  ├─ queries/
│  │  │  ├─ auth.ts                 # myPermissions
│  │  │  └─ delivery.ts             # myDeliveries
│  │  └─ mutations/
│  │     ├─ auth.ts                 # login
│  │     └─ delivery.ts             # markDelivered/reportException/startDelivery
│  ├─ stores/
│  │  ├─ auth.ts                    # administrator token
│  │  ├─ permission.ts              # 权限 store + has/is/can
│  │  └─ delivery.ts                # 当前订单、筛选状态
│  ├─ config/
│  │  ├─ shortcuts.ts               # 快捷功能配置（全量，按权限过滤）
│  │  └─ kpi.ts                     # KPI 按角色生成
│  ├─ router/
│  │  └─ meta.ts                    # 路由权限元信息（全量）
│  ├─ composables/
│  │  ├─ useAuthGuard.ts            # 增强：权限守卫
│  │  └─ usePermission.ts           # has/is/can
│  ├─ directives/
│  │  └─ perm.ts                    # v-perm 指令
│  ├─ components/
│  │  ├─ ListPageLayout.vue         # 通用列表页布局
│  │  ├─ KpiCards.vue               # KPI 卡片
│  │  ├─ GridLayout.vue             # 九宫格
│  │  ├─ ShortcutButton.vue         # 快捷功能按钮
│  │  ├─ ModulePlaceholder.vue      # 模块占位
│  │  └─ TodoList.vue               # 待办列表
│  ├─ pages/                        # 主包
│  │  ├─ login/index.vue            # 实现
│  │  ├─ home/index.vue             # 实现（动态工作台）
│  │  ├─ scan/index.vue             # 占位
│  │  ├─ profile/index.vue          # 实现
│  │  ├─ 403/index.vue              # 实现
│  │  └─ 404/index.vue              # 实现
│  ├─ pkg-delivery/pages/           # 实现
│  │  ├─ list/index.vue
│  │  ├─ detail/index.vue
│  │  ├─ sign/index.vue
│  │  └─ exception/index.vue
│  ├─ pkg-sales/pages/              # 占位
│  │  └─ placeholder.vue
│  ├─ pkg-inventory/pages/          # 占位
│  │  └─ placeholder.vue
│  ├─ pkg-cs/pages/                 # 占位
│  │  └─ placeholder.vue
│  ├─ pkg-ops/pages/                # 占位
│  │  └─ placeholder.vue
│  ├─ pkg-admin/pages/              # 占位
│  │  └─ placeholder.vue
│  └─ pkg-common/pages/             # 占位
│     ├─ message/placeholder.vue
│     ├─ settings/placeholder.vue
│     └─ help/placeholder.vue
│  ├─ App.vue
│  ├─ main.ts
│  ├─ pages.json
│  └─ manifest.json
├─ package.json                     # 与 vshop 一致的 uni-app 3.0 + Vue 3 + Pinia
├─ tsconfig.json
└─ vite.config.ts
```

### 5.2 登录与鉴权

- **登录页**：username + password，调 admin-api `login(username, password)` mutation
- **token 提取**：admin-api 的 login mutation 不在响应 body 返回 token，token 通过响应头 `vendure-auth-token` 返回（与 shop-api 机制相同）
  - 必须用 `uni.request` 发送登录请求（不能用 graphql-request，因为小程序环境对 header 的兼容性问题）
  - 参考 vshop 的 [auth.ts](file:///e:/code/vshop/src/api/mutations/auth.ts) 实现
- **token 存储**：`uni.setStorageSync('admin_token', token)`（区别于 vshop 的 `auth_token`）
- **client.ts 改造**：
  - URL 指向 `http://localhost:3000/admin-api`（注意：HTTP 路径是 `/admin-api`，不是 `/admin-api/graphql`）
  - 请求头 `Authorization: Bearer <admin_token>`
  - 移除 channel token 相关逻辑（vadmin 是后台，不需要）
- **路由守卫**：复用 vshop 的 `useAuthGuard` 模式 + 权限守卫，未登录跳 `/pages/login/index`，无权限跳 `/pages/403/index`
- **多租户 channel token**：vadmin 是后台，**不需要** channel token，移除相关逻辑

### 5.2.1 照片上传 OSS 复用

vshop 已有 OSS 上传逻辑，vadmin 复用方式：

- **MVP 策略**：拷贝 vshop 的 `utils/upload.ts` 到 vadmin，改造为走 admin-api 鉴权
- **上传端点**：vendure 的 [oss-plugin](file:///e:/code/vendure/packages/oss-plugin) 提供 admin-api 的 asset 上传 mutation
- **认证差异**：vshop 用 shop-api 的 customer token，vadmin 用 admin-api 的 administrator token
- **若 oss-plugin 不支持 admin-api 上传**：MVP 退化为 base64 图片直接随 mutation 提交（限制单张 < 500KB，最多 3 张）
- 第二期可重构为统一的 OSS 上传服务

### 5.3 第一期实现页面

#### 5.3.1 登录页 `pages/login/index.vue`

- 表单：账号、密码
- 校验：非空
- 登录失败：显示错误码中文映射（复用 vshop 的 `ERROR_CODE_MAP` 模式）
- 登录成功：写 token + 加载权限 + 跳工作台

#### 5.3.2 工作台首页 `pages/home/index.vue`

- 顶部：欢迎语 + 角色徽章 + 消息铃铛
- KPI 卡片：按角色动态生成（送货员看完成单数等）
- 快捷功能九宫格：按权限动态生成，未实现模块灰色占位
- 待办事项：按角色查询对应数据源
- 见 3.3、3.8 节

#### 5.3.3 任务列表页 `pkg-delivery/pages/list/index.vue`（送货员 tab 2）

- 顶部状态 tab：待取货（assigned）/ 配送中（in_progress）/ 已完成（delivered）
- 下拉刷新：`onPullDownRefresh` 调 `myDeliveries(status)`
- 卡片信息：订单号、状态、收货人、电话、地址、商品件数、金额、操作按钮（导航 / 开始配送）
- 卡片点击：进详情页

#### 5.3.4 订单详情页 `pkg-delivery/pages/detail/index.vue`

- 顶部：订单号、状态、指派时间
- 收货人信息：姓名、电话（[拨打]按钮）、地址（[一键导航]按钮）
- 商品清单：图片、名称、SKU、数量
- 合计金额
- 底部按钮按状态切换：
  - `assigned`：显示 [开始配送]
  - `in_progress`：显示 [已送达，去签收] + [上报异常]
- 拨打：`uni.makePhoneCall`
- 一键导航：`uni.openLocation`（lat/lng 来自 Order customFields）

#### 5.3.5 签收页 `pkg-delivery/pages/sign/index.vue`

- 上传送达照片（1-3 张）：`uni.chooseImage({ count: 3, sourceType: ['camera'] })`
- 备注：多行文本
- 提交流程：先调 `uploadToOss` 串行上传照片拿 URL，再调 `markDelivered(orderId, photos, note)`
- 成功后：返回列表页，刷新

#### 5.3.6 异常上报页 `pkg-delivery/pages/exception/index.vue`

- 异常类型：单选（拒收 / 地址错误 / 无人收货 / 商品损坏 / 其他）
- 现场照片（1-3 张）
- 备注：多行文本
- 类型必选、照片必传（至少 1 张）、备注可选
- 提交：调 `reportException(orderId, type, photos, note)`

#### 5.3.7 个人中心 `pages/profile/index.vue`

- 显示管理员姓名、角色、ID
- 今日数据卡片（按角色展示不同 KPI）
- 切换角色（多角色用户）
- 消息通知、帮助中心、意见反馈、关于
- 退出登录按钮

### 5.4 KPI 卡片按角色生成

```typescript
// src/config/kpi.ts
function buildKpiByRole(roles: string[], stats: any): KpiCard[] {
  if (roles.includes('delivery-staff')) {
    return [
      { label: '待取货', value: stats.assigned, color: 'orange' },
      { label: '配送中', value: stats.inProgress, color: 'blue' },
      { label: '今日已完成', value: stats.delivered, color: 'green' },
    ];
  }
  if (roles.includes('sales-staff')) {
    return [
      { label: '今日开单', value: stats.todayOrders, color: 'blue' },
      { label: '今日业绩', value: stats.todayAmount, color: 'green' },
      { label: '本月业绩', value: stats.monthAmount, color: 'purple' },
    ];
  }
  // ... 其他角色
}
```

第一期只实现 delivery-staff 的 KPI，其他角色 KPI 字段已定义，二期实现时填数据源。

### 5.5 待办事项按角色生成

```typescript
// src/config/todos.ts
function buildTodoQueryByRole(roles: string[]): TodoQueryConfig | null {
  if (roles.includes('delivery-staff')) {
    return {
      module: 'delivery',
      query: 'myDeliveries',
      variables: { status: 'assigned' },
      titleField: 'code',
      descField: 'customer.address',
      badgeField: 'deliveryStatus',
      route: '/pkg-delivery/pages/detail/index',
    };
  }
  if (roles.includes('manager')) {
    return {
      module: 'delivery',
      query: 'allDeliveries',
      variables: { status: 'exception' },
      titleField: 'code',
      descField: 'exceptionNote',
      badgeField: 'exceptionType',
      route: '/pkg-admin/pages/exception/index',
    };
  }
  return null;
}
```

### 5.6 错误处理

- 网络错误：toast 提示 + 重试按钮
- token 过期：拦截 `401`，清 `admin_token` + 权限，跳登录页
- mutation 业务错误（如订单不属于自己）：toast 显示错误码中文映射

## 6. 测试策略

| 层 | 策略 |
|----|------|
| delivery-plugin Role 同步 | vitest，验证 7+1 角色 + Permission 绑定正确 |
| myPermissions resolver | vitest，不同角色返回不同 visibleModules |
| delivery-plugin service | vitest 单元测试，mock ctx + event |
| 自动派单逻辑 | vitest，多送货员+多订单，验证负载均衡 |
| 权限拦截 | vitest，无权限调用抛 ForbiddenError |
| vadmin 工作台 | 手动验收，3 个角色登录看不同首页 |
| 端到端 | 创建测试订单 → 派单 → vadmin 签收 → Fulfillment 推进 |

## 7. 第一期 MVP 实现顺序

1. delivery-plugin 脚手架 + Permission 全量定义 + Role 同步全量 7+1 角色
2. Order customFields 扩展 + dev-config 注册
3. myPermissions admin resolver
4. delivery admin resolver（myDeliveries + markDelivered + reportException + startDelivery）
5. 自动派单事件订阅
6. vadmin 工程初始化（拷贝 vshop 基础设施）
7. 登录页 + client.ts 改造 + auth store
8. permission store + usePermission + v-perm 指令 + 路由守卫
9. shortcuts.ts 全量配置 + router/meta.ts 全量配置
10. 工作台首页（KPI + 九宫格 + 待办）
11. 送货模块 4 个页面（list/detail/sign/exception）
12. 个人中心
13. 其他 6 个 pkg-* 占位目录与 placeholder.vue
14. 端到端验收

## 8. 风险与开放问题

| 风险 | 缓解 |
|------|------|
| 用户有多角色（如销售+送货） | 主角色优先级表硬编码取第一个匹配（见 2.10.1）；第二期加 primaryRole customFields |
| 后端 plugin 未实现但前端占位 | placeholder.vue + toast 提示，工程结构完整 |
| 权限缓存过期 | 每次进首页重新调 myPermissions；403 响应触发权限刷新 |
| 7 个角色同步冲突 | onBootstrap 只创建缺失的，不动已有 Role 的 Permission 绑定，避免覆盖管理员调整 |
| 自动派单 PaymentSettled 触发可能过早 | MVP 接受，后续可在 Fulfillment 创建后触发，或加人工确认步 |
| 收货地址经纬度缺失 | 扩展 Address customFields 加 lat/lng（见 4.4.1）；vshop 端下单时写入；若缺失，导航按钮禁用并提示 |
| 多送货员同时刷新抢单 | 不存在此问题，派单在服务端事件中原子完成，前端只读 |
| 照片上传失败 | 客户端重试 3 次，仍失败则提示用户检查网络 |
| MODULE_CONFIGS 跨插件污染 | delivery-plugin 定义全部模块配置，后续 sales-plugin 实现时要改 delivery-plugin 代码。**已知技术债**，MVP 接受，第二期重构为各插件自注册 ModuleConfig |
| 按 Role 查 Administrator 性能 | 无现成 API，需内存过滤。加 5 分钟内存缓存避免每次派单都查库 |
| Fulfillment 自动创建影响库存 | 派单时创建 Fulfillment 标记 Shipped 会按 vendure 标准流程扣库存。若业务上希望"配送完成才扣库存"，需调整 FulfillmentHandler 的 createFulfillment 逻辑 |
| 多 Channel 场景 | MVP 单 Channel，所有业务 Role 关联默认 Channel。多 Channel 策略留待后续迭代 |
| admin-api token 提取 | login mutation 不在 body 返回 token，需从响应头 `vendure-auth-token` 提取，用 uni.request 而非 graphql-request |

## 9. 后续迭代接入方式

第二期实现 sales-plugin 时：

1. 在 vendure/packages 下新建 sales-plugin
2. 实现 CreateOrder/ViewOwnSales 等 resolver
3. delivery-plugin 的 MODULE_CONFIGS 把 `sales.enabled` 改为 `true`（或 sales-plugin 自己覆盖配置）
4. vadmin 的 pkg-sales/pages/ 填充实现，删除 placeholder.vue
5. shortcuts.ts 与 router/meta.ts 已配好，无需改动

**核心：第一期搭好骨架，后续只填业务代码，不动权限与布局骨架。**

## 10. 后续迭代（不在本 spec 范围）

- 销售模块完整实现（第二期独立 spec）
- 客服模块完整实现（第二期独立 spec）
- 调库模块完整实现（第三期独立 spec）
- 运营模块完整实现（第四期独立 spec）
- 管理模块完整实现（第四期独立 spec）
- 消息中心、搜索、帮助中心、设置等通用模块
- 离线缓存与队列上传
- 实时推送（WebSocket / 极光 / Firebase）
- 验证码签收、手写签名
- 自动派单的高级规则（区域匹配、距离匹配）
- PC Admin UI 的改派界面
