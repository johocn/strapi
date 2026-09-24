# vadmin 移动管理平台 第一期实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 vendure 移动端综合管理平台 vadmin 的第一期，完整实现送货员模块，搭好权限框架与布局骨架，其他模块占位。

**Architecture:** 后端在 vendure/packages 下新建 delivery-plugin（PermissionDefinition + Role 同步 + admin resolver + 事件订阅自动派单）；前端新建 vadmin 独立 uni-app 工程（拷贝 vshop 基础设施 + admin-api 鉴权 + permission store + 工作台 + 6 个模块占位）。

**Tech Stack:** Vendure v3.6 + TypeScript + graphql-request + uni-app 3.0 + Vue 3 + Pinia + vitest

**Spec:** `docs/superpowers/specs/2026-07-27-vadmin-delivery-design.md`

---

## Task 1: 创建 delivery-plugin 脚手架与 PermissionDefinition

**Files:**
- Create: `e:\code\vendure\packages\delivery-plugin\package.json`
- Create: `e:\code\vendure\packages\delivery-plugin\tsconfig.json`
- Create: `e:\code\vendure\packages\delivery-plugin\src\index.ts`
- Create: `e:\code\vendure\packages\delivery-plugin\src\constants.ts`
- Create: `e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts`
- Modify: `e:\code\vendure\packages\dev-server\dev-config.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@vendure/delivery-plugin",
  "version": "1.0.0",
  "description": "Delivery staff management plugin for vendure",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w"
  },
  "dependencies": {
    "@vendure/core": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 constants.ts（PermissionDefinition）**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\constants.ts
import { PermissionDefinition } from '@vendure/core';

export const deliveryPermissions = new PermissionDefinition({
  permissions: [
    { name: 'DeliverOrder',       description: '查看配送任务' },
    { name: 'MarkDelivered',      description: '标记送达' },
    { name: 'ReportException',    description: '上报异常' },
    { name: 'ViewAllDeliveries',  description: '查看全部配送' },
    { name: 'ReassignDelivery',   description: '改派' },
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

// 状态枚举
export enum DeliveryStatus {
  Assigned = 'assigned',
  InProgress = 'in_progress',
  Delivered = 'delivered',
  Exception = 'exception',
}

export enum ExceptionType {
  Rejected = 'rejected',
  WrongAddress = 'wrong_address',
  NoRecipient = 'no_recipient',
  Damaged = 'damaged',
  Other = 'other',
}

// Role 与 Permission 绑定表
export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  'delivery-staff':     ['DeliverOrder', 'MarkDelivered', 'ReportException'],
  'sales-staff':        ['CreateOrder', 'ViewOwnSales', 'ManageCustomer', 'ViewSalesReport', 'ViewStock', 'ManageProduct'],
  'inventory-staff':    ['ViewStock', 'ManageStockMove', 'ManageStocktake', 'ManageStockIn', 'ManageStockOut', 'ManageProduct'],
  'customer-service':   ['ViewAllOrders', 'HandleAfterSales', 'HandleException', 'ManageCustomer', 'ManageProduct'],
  'operations-staff':   ['ManagePromotion', 'ManageContent', 'ViewDashboard'],
  'manager':            [
    'DeliverOrder', 'MarkDelivered', 'ReportException', 'ViewAllDeliveries', 'ReassignDelivery',
    'CreateOrder', 'ViewOwnSales', 'ManageCustomer', 'ViewSalesReport',
    'ViewStock', 'ManageStockMove', 'ManageStocktake', 'ManageStockIn', 'ManageStockOut',
    'ViewAllOrders', 'HandleAfterSales', 'HandleException',
    'ManagePromotion', 'ManageContent', 'ViewDashboard',
    'ManageProduct', 'ManageUser', 'ViewFinance', 'ManageMessage',
  ],
  'super-admin':        [
    'DeliverOrder', 'MarkDelivered', 'ReportException', 'ViewAllDeliveries', 'ReassignDelivery',
    'CreateOrder', 'ViewOwnSales', 'ManageCustomer', 'ViewSalesReport',
    'ViewStock', 'ManageStockMove', 'ManageStocktake', 'ManageStockIn', 'ManageStockOut',
    'ViewAllOrders', 'HandleAfterSales', 'HandleException',
    'ManagePromotion', 'ManageContent', 'ViewDashboard',
    'ManageProduct', 'ManageUser', 'ViewFinance', 'ManageMessage',
    'SuperAdmin',
  ],
};

// 模块配置（与前端 shortcuts.ts 对齐）
export const MODULE_CONFIGS = [
  { code: 'delivery',  name: '送货',  enabled: true,  entryPath: '/pkg-delivery/pages/list/index', icon: '📦', sort: 10, perms: ['DeliverOrder','MarkDelivered','ReportException','ViewAllDeliveries','ReassignDelivery'] },
  { code: 'sales',     name: '销售',  enabled: false, entryPath: '/pkg-sales/pages/list/index',    icon: '📝', sort: 20, perms: ['CreateOrder','ViewOwnSales','ManageCustomer','ViewSalesReport'] },
  { code: 'inventory', name: '调库',  enabled: false, entryPath: '/pkg-inventory/pages/stock/index', icon: '📊', sort: 30, perms: ['ViewStock','ManageStockMove','ManageStocktake','ManageStockIn','ManageStockOut'] },
  { code: 'cs',        name: '客服',  enabled: false, entryPath: '/pkg-cs/pages/orders/index',    icon: '🎧', sort: 40, perms: ['ViewAllOrders','HandleAfterSales','HandleException'] },
  { code: 'ops',       name: '运营',  enabled: false, entryPath: '/pkg-ops/pages/promotion/index', icon: '🎁', sort: 50, perms: ['ManagePromotion','ManageContent','ViewDashboard'] },
  { code: 'admin',     name: '管理',  enabled: false, entryPath: '/pkg-admin/pages/dashboard/index', icon: '⚙️', sort: 60, perms: ['ManageProduct','ManageUser','ViewFinance','ManageMessage','ViewDashboard'] },
  { code: 'common',    name: '通用',  enabled: true,  entryPath: '/pages/profile/index',         icon: '👤', sort: 70, perms: [] },
];
```

- [ ] **Step 4: 创建 delivery.plugin.ts（最小骨架）**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts
import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { deliveryPermissions } from './constants';

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    // 注册自定义 Permission
    config.authOptions.customPermissions = [
      ...(config.authOptions.customPermissions ?? []),
      ...deliveryPermissions.permissions,
    ];
    // 扩展 Order customFields（Task 2 会补充）
    // 扩展 Address customFields（Task 2 会补充）
    return config;
  },
})
export class DeliveryPlugin {
  static init = () => new DeliveryPlugin();
}
```

- [ ] **Step 5: 创建 index.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\index.ts
export * from './delivery.plugin';
export * from './constants';
```

- [ ] **Step 6: 在 dev-config.ts 注册插件**

修改 `e:\code\vendure\packages\dev-server\dev-config.ts`，在 plugins 数组中添加：

```typescript
import { DeliveryPlugin } from '../delivery-plugin/src/index';

// 在 plugins 数组中添加
plugins: [
  // ... 现有插件
  DeliveryPlugin.init(),
],
```

- [ ] **Step 7: 构建并启动验证**

```bash
cd e:\code\vendure\packages\delivery-plugin
npm install
npm run build
cd e:\code\vendure\packages\dev-server
npm run start
```

Expected: 服务启动无错误，日志中能看到权限注册

- [ ] **Step 8: Commit**

```bash
cd e:\code\vendure
git add packages/delivery-plugin packages/dev-server/dev-config.ts
git commit -m "feat(delivery-plugin): scaffold plugin with PermissionDefinition and module configs"
```

---

## Task 2: 扩展 Order 与 Address customFields

**Files:**
- Create: `e:\code\vendure\packages\delivery-plugin\src\config\order-custom-fields.ts`
- Create: `e:\code\vendure\packages\delivery-plugin\src\config\address-custom-fields.ts`
- Modify: `e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts`

- [ ] **Step 1: 创建 order-custom-fields.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\config\order-custom-fields.ts
import { CustomFields } from '@vendure/core';

export const deliveryOrderCustomFields: CustomFields = {
  Order: [
    { name: 'deliveryStaffId',    type: 'string',  nullable: true },
    { name: 'deliveryStatus',     type: 'string',  nullable: true },
    { name: 'assignedAt',         type: 'datetime', nullable: true },
    { name: 'deliveredAt',        type: 'datetime', nullable: true },
    { name: 'deliveryPhotos',     type: 'string',  list: true, nullable: true },
    { name: 'deliveryNote',       type: 'string',  nullable: true },
    { name: 'exceptionType',      type: 'string',  nullable: true },
    { name: 'exceptionNote',      type: 'string',  nullable: true },
    { name: 'exceptionPhotos',    type: 'string',  list: true, nullable: true },
  ],
};
```

- [ ] **Step 2: 创建 address-custom-fields.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\config\address-custom-fields.ts
import { CustomFields } from '@vendure/core';

export const deliveryAddressCustomFields: CustomFields = {
  Address: [
    { name: 'latitude',  type: 'float', nullable: true },
    { name: 'longitude', type: 'float', nullable: true },
  ],
};
```

- [ ] **Step 3: 修改 delivery.plugin.ts 合并 customFields**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { deliveryPermissions } from './constants';
import { deliveryOrderCustomFields } from './config/order-custom-fields';
import { deliveryAddressCustomFields } from './config/address-custom-fields';

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    config.authOptions.customPermissions = [
      ...(config.authOptions.customPermissions ?? []),
      ...deliveryPermissions.permissions,
    ];
    config.customFields.Order = [
      ...(config.customFields.Order ?? []),
      ...(deliveryOrderCustomFields.Order ?? []),
    ];
    config.customFields.Address = [
      ...(config.customFields.Address ?? []),
      ...(deliveryAddressCustomFields.Address ?? []),
    ];
    return config;
  },
})
export class DeliveryPlugin {
  static init = () => new DeliveryPlugin();
}
```

- [ ] **Step 4: 构建并验证 schema 生成**

```bash
cd e:\code\vendure\packages\delivery-plugin
npm run build
cd e:\code\vendure\packages\dev-server
npm run start
```

打开 http://localhost:3000/admin-api，执行 introspection 查询，确认 `Order.customFields.deliveryStaffId` 等字段存在

- [ ] **Step 5: Commit**

```bash
git add packages/delivery-plugin
git commit -m "feat(delivery-plugin): extend Order and Address customFields"
```

---

## Task 3: 实现 Role 同步机制

**Files:**
- Create: `e:\code\vendure\packages\delivery-plugin\src\role-sync.ts`
- Modify: `e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts`
- Test: `e:\code\vendure\packages\delivery-plugin\src\__tests__\role-sync.spec.ts`

- [ ] **Step 1: 编写 role-sync 测试**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\__tests__\role-sync.spec.ts
import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS_MAP } from '../constants';

describe('role-sync', () => {
  it('should define 7 roles', () => {
    expect(Object.keys(ROLE_PERMISSIONS_MAP)).toHaveLength(7);
  });

  it('delivery-staff should have 3 permissions', () => {
    expect(ROLE_PERMISSIONS_MAP['delivery-staff']).toEqual([
      'DeliverOrder', 'MarkDelivered', 'ReportException',
    ]);
  });

  it('manager should have all business permissions but not SuperAdmin', () => {
    const managerPerms = ROLE_PERMISSIONS_MAP['manager'];
    expect(managerPerms).toContain('DeliverOrder');
    expect(managerPerms).not.toContain('SuperAdmin');
  });

  it('super-admin should have SuperAdmin', () => {
    expect(ROLE_PERMISSIONS_MAP['super-admin']).toContain('SuperAdmin');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd e:\code\vendure\packages\delivery-plugin
npx vitest run src/__tests__/role-sync.spec.ts
```

Expected: PASS（因为只是验证常量，已经定义了）

- [ ] **Step 3: 实现 role-sync.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\role-sync.ts
import { Injector, Logger, RoleService, ChannelService } from '@vendure/core';
import { In } from 'typeorm';
import { ROLE_PERMISSIONS_MAP } from './constants';

export class RoleSyncService {
  private roleService: RoleService;
  private channelService: ChannelService;
  private roleRepo: any;
  private channelRepo: any;

  init(injector: Injector) {
    this.roleService = injector.get(RoleService);
    this.channelService = injector.get(ChannelService);
    this.roleRepo = injector.getRepository('Role');
    this.channelRepo = injector.getRepository('Channel');
  }

  async syncRoles(ctx: any) {
    const defaultChannel = await this.channelRepo.findOne({ where: { code: '__default_channel__' } });
    let syncedRoles = 0;
    let syncedPerms = 0;

    for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      let role = await this.roleRepo.findOne({
        where: { code: roleCode },
        relations: ['channels'],
      });

      if (!role) {
        // 创建缺失的 Role，关联默认 Channel
        role = this.roleRepo.create({
          code: roleCode,
          description: `Auto-synced role: ${roleCode}`,
          channels: defaultChannel ? [defaultChannel] : [],
        });
        await this.roleRepo.save(role);
        syncedRoles++;
        Logger.info(`[delivery-plugin] Created role: ${roleCode}`);
      }

      // 补绑缺失的 Permission
      const existingPerms = new Set(role.permissions ?? []);
      for (const perm of permissions) {
        if (!existingPerms.has(perm)) {
          existingPerms.add(perm);
          syncedPerms++;
        }
      }
      role.permissions = Array.from(existingPerms);
      await this.roleRepo.save(role);
    }

    Logger.info(`[delivery-plugin] Synced ${syncedRoles} roles, ${syncedPerms} permissions`);
  }
}
```

- [ ] **Step 4: 修改 delivery.plugin.ts 在 onBootstrap 调用同步**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts
import { PluginCommonModule, VendurePlugin, Injector } from '@vendure/core';
import { deliveryPermissions } from './constants';
import { deliveryOrderCustomFields } from './config/order-custom-fields';
import { deliveryAddressCustomFields } from './config/address-custom-fields';
import { RoleSyncService } from './role-sync';

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    config.authOptions.customPermissions = [
      ...(config.authOptions.customPermissions ?? []),
      ...deliveryPermissions.permissions,
    ];
    config.customFields.Order = [
      ...(config.customFields.Order ?? []),
      ...(deliveryOrderCustomFields.Order ?? []),
    ];
    config.customFields.Address = [
      ...(config.customFields.Address ?? []),
      ...(deliveryAddressCustomFields.Address ?? []),
    ];
    return config;
  },
  onBootstrap: async (injector: Injector) => {
    const roleSync = new RoleSyncService();
    roleSync.init(injector);
    const ctx = injector.get('RequestContext') as any;
    // 用一个简单的 ctx，实际 onBootstrap 可能需要构造 ctx
    await roleSync.syncRoles({} as any);
  },
})
export class DeliveryPlugin {
  static init = () => new DeliveryPlugin();
}
```

> 注意：onBootstrap 中的 ctx 获取可能需要调整，参考其他插件的 onBootstrap 实现。如果 ctx 不可用，可改用直接连接数据库的方式。

- [ ] **Step 5: 构建并启动验证**

```bash
cd e:\code\vendure\packages\delivery-plugin
npm run build
cd e:\code\vendure\packages\dev-server
npm run start
```

Expected: 启动日志中看到 `[delivery-plugin] Synced 7 roles, 25 permissions`

- [ ] **Step 6: 验证数据库中 Role 已创建**

打开 PC Admin UI → Settings → Roles，确认 `delivery-staff`、`sales-staff` 等 7 个角色存在

- [ ] **Step 7: Commit**

```bash
git add packages/delivery-plugin
git commit -m "feat(delivery-plugin): implement role sync on bootstrap"
```

---

## Task 4: 实现 myPermissions Admin Resolver

**Files:**
- Create: `e:\code\vendure\packages\delivery-plugin\src\permission-admin.resolver.ts`
- Modify: `e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts`

- [ ] **Step 1: 创建 permission-admin.resolver.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\permission-admin.resolver.ts
import { Resolver, Query, Ctx, Allow, RequestContext, AdministratorService } from '@vendure/core';
import { deliveryPermissions } from './constants';
import { MODULE_CONFIGS } from './constants';

@Resolver()
export class PermissionAdminResolver {
  constructor(private administratorService: AdministratorService) {}

  @Query()
  @Allow(deliveryPermissions.values.DeliverOrder)
  async myPermissions(@Ctx() ctx: RequestContext) {
    if (!ctx.activeUserId) {
      throw new Error('Unauthorized');
    }

    // 查询 administrator 的 roles
    const admin = await this.administratorService.findOne(ctx, ctx.activeUserId);
    if (!admin || !admin.user) {
      return { roles: [], permissions: [], visibleModules: [] };
    }

    const roles = admin.user.roles?.map(r => r.code) ?? [];
    const permissions = new Set<string>();
    for (const role of admin.user.roles ?? []) {
      for (const perm of role.permissions ?? []) {
        permissions.add(perm);
      }
    }

    // super-admin 角色自动拥有所有权限
    if (roles.includes('super-admin')) {
      MODULE_CONFIGS.forEach(m => m.perms.forEach(p => permissions.add(p)));
    }

    const permArray = Array.from(permissions);
    const visibleModules = MODULE_CONFIGS.filter(m =>
      m.enabled && (m.perms.length === 0 || m.perms.some(p => permArray.includes(p)))
    ).map(m => ({
      code: m.code,
      name: m.name,
      enabled: m.enabled,
      entryPath: m.entryPath,
      icon: m.icon,
      sort: m.sort,
    }));

    return {
      roles,
      permissions: permArray,
      visibleModules,
    };
  }
}
```

- [ ] **Step 2: 修改 delivery.plugin.ts 注册 resolver**

```typescript
// 修改 delivery.plugin.ts，在 @VendurePlugin 装饰器中加 adminApiResolvers
@VendurePlugin({
  imports: [PluginCommonModule],
  adminApiResolvers: [PermissionAdminResolver],
  configuration: (config) => { /* ... 保持不变 ... */ },
  onBootstrap: async (injector: Injector) => { /* ... 保持不变 ... */ },
})
```

- [ ] **Step 3: 构建、启动、用 GraphQL playground 验证**

```bash
cd e:\code\vendure\packages\delivery-plugin
npm run build && cd ../dev-server && npm run start
```

打开 http://localhost:3000/admin-api，用 super-admin 登录后执行：

```graphql
query { myPermissions { roles permissions visibleModules { code name enabled entryPath icon sort } } }
```

Expected: 返回 roles=['super-admin']，permissions 含全部 24 个，visibleModules 含 delivery 和 common

- [ ] **Step 4: Commit**

```bash
git add packages/delivery-plugin
git commit -m "feat(delivery-plugin): add myPermissions admin resolver"
```

---

## Task 5: 实现 Delivery Admin Resolver（核心 CRUD）

**Files:**
- Create: `e:\code\vendure\packages\delivery-plugin\src\delivery.service.ts`
- Create: `e:\code\vendure\packages\delivery-plugin\src\delivery-admin.resolver.ts`
- Modify: `e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts`

- [ ] **Step 1: 创建 delivery.service.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\delivery.service.ts
import { Injectable, Injector, Logger, ForbiddenError, UserInputError, ConflictError } from '@vendure/core';
import { TransactionalConnection, OrderService, FulfillmentService } from '@vendure/core';
import { DeliveryStatus, ExceptionType } from './constants';

@Injectable()
export class DeliveryService {
  private connection: TransactionalConnection;
  private orderService: OrderService;
  private fulfillmentService: FulfillmentService;
  private administratorRepo: any;
  private orderRepo: any;

  init(injector: Injector) {
    this.connection = injector.get(TransactionalConnection);
    this.orderService = injector.get(OrderService);
    this.fulfillmentService = injector.get(FulfillmentService);
    this.administratorRepo = injector.getRepository('Administrator');
    this.orderRepo = injector.getRepository('Order');
  }

  async findMyDeliveries(ctx: any, staffId: string, status?: string) {
    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.shippingLines', 'shippingLines')
      .where('order.customFields.deliveryStaffId = :staffId', { staffId });

    if (status) {
      qb.andWhere('order.customFields.deliveryStatus = :status', { status });
    }
    qb.orderBy('order.createdAt', 'DESC');

    const orders = await qb.getMany();
    return orders.map(o => this.toDeliveryOrder(o));
  }

  async findAllDeliveries(ctx: any, status?: string) {
    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.customFields.deliveryStaffId IS NOT NULL');

    if (status) {
      qb.andWhere('order.customFields.deliveryStatus = :status', { status });
    }
    qb.orderBy('order.createdAt', 'DESC');

    const orders = await qb.getMany();
    return orders.map(o => this.toDeliveryOrder(o));
  }

  async startDelivery(ctx: any, orderId: string) {
    const order = await this.orderService.findOne(ctx, orderId);
    if (!order) throw new UserInputError('Order not found');
    if (order.customFields.deliveryStaffId !== ctx.activeUserId) {
      throw new ForbiddenError('Not your delivery');
    }
    if (order.customFields.deliveryStatus !== DeliveryStatus.Assigned) {
      throw new ConflictError('Order is not in assigned status');
    }

    await this.orderService.updateCustomFields(ctx, orderId, {
      deliveryStatus: DeliveryStatus.InProgress,
    });

    return this.toDeliveryOrder(await this.orderService.findOne(ctx, orderId));
  }

  async markDelivered(ctx: any, orderId: string, photos: string[], note?: string) {
    const order = await this.orderService.findOne(ctx, orderId);
    if (!order) throw new UserInputError('Order not found');
    if (order.customFields.deliveryStaffId !== ctx.activeUserId) {
      throw new ForbiddenError('Not your delivery');
    }
    if (order.customFields.deliveryStatus !== DeliveryStatus.InProgress) {
      throw new ConflictError('Order is not in progress');
    }
    if (!photos || photos.length === 0) {
      throw new UserInputError('At least one photo is required');
    }

    await this.connection.withTransaction(ctx, async (txCtx) => {
      await this.orderService.updateCustomFields(txCtx, orderId, {
        deliveryStatus: DeliveryStatus.Delivered,
        deliveredAt: new Date(),
        deliveryPhotos: photos,
        deliveryNote: note ?? '',
      });

      // 推进 Fulfillment: Shipped → Delivered
      const fulfillments = await this.fulfillmentService.findByOrder(txCtx, orderId);
      for (const f of fulfillments) {
        if (f.state === 'Shipped') {
          await this.fulfillmentService.transitionToState(txCtx, f.id, 'Delivered');
        }
      }
    });

    return this.toDeliveryOrder(await this.orderService.findOne(ctx, orderId));
  }

  async reportException(ctx: any, orderId: string, type: string, photos: string[], note?: string) {
    const order = await this.orderService.findOne(ctx, orderId);
    if (!order) throw new UserInputError('Order not found');
    if (order.customFields.deliveryStaffId !== ctx.activeUserId) {
      throw new ForbiddenError('Not your delivery');
    }
    if (!Object.values(ExceptionType).includes(type as ExceptionType)) {
      throw new UserInputError(`Invalid exception type: ${type}`);
    }
    if (!photos || photos.length === 0) {
      throw new UserInputError('At least one photo is required');
    }

    await this.orderService.updateCustomFields(ctx, orderId, {
      deliveryStatus: DeliveryStatus.Exception,
      exceptionType: type,
      exceptionNote: note ?? '',
      exceptionPhotos: photos,
    });

    return this.toDeliveryOrder(await this.orderService.findOne(ctx, orderId));
  }

  async reassignDelivery(ctx: any, orderId: string, newStaffId: string) {
    const order = await this.orderService.findOne(ctx, orderId);
    if (!order) throw new UserInputError('Order not found');

    await this.orderService.updateCustomFields(ctx, orderId, {
      deliveryStaffId: newStaffId,
      deliveryStatus: DeliveryStatus.Assigned,
      assignedAt: new Date(),
      exceptionType: null,
      exceptionNote: null,
      exceptionPhotos: [],
    });

    return this.toDeliveryOrder(await this.orderService.findOne(ctx, orderId));
  }

  private toDeliveryOrder(order: any) {
    return {
      orderId: order.id,
      code: order.code,
      deliveryStatus: order.customFields.deliveryStatus,
      customer: {
        name: order.customer?.firstName ?? '',
        phone: order.customer?.phoneNumber ?? '',
        address: order.shippingAddress?.streetLine1 ?? '',
        latitude: order.shippingAddress?.customFields?.latitude ?? null,
        longitude: order.shippingAddress?.customFields?.longitude ?? null,
      },
      lines: (order.lines ?? []).map((l: any) => ({
        name: l.productVariant?.name ?? '',
        sku: l.productVariant?.sku ?? '',
        qty: l.quantity,
        imageUrl: l.productVariant?.featuredAsset?.preview ?? '',
      })),
      totalWithTax: order.totalWithTax ?? 0,
      assignedAt: order.customFields.assignedAt,
      deliveredAt: order.customFields.deliveredAt,
      deliveryPhotos: order.customFields.deliveryPhotos ?? [],
      deliveryNote: order.customFields.deliveryNote ?? '',
      exceptionType: order.customFields.exceptionType,
      exceptionPhotos: order.customFields.exceptionPhotos ?? [],
    };
  }
}
```

- [ ] **Step 2: 创建 delivery-admin.resolver.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\delivery-admin.resolver.ts
import { Resolver, Query, Mutation, Args, Ctx, Allow, RequestContext } from '@vendure/core';
import { deliveryPermissions } from './constants';
import { DeliveryService } from './delivery.service';

@Resolver()
export class DeliveryAdminResolver {
  constructor(private deliveryService: DeliveryService) {}

  @Query(() => [Object])
  @Allow(deliveryPermissions.values.DeliverOrder)
  async myDeliveries(
    @Ctx() ctx: RequestContext,
    @Args({ name: 'status', type: () => String, nullable: true }) status?: string,
  ) {
    // delivery-staff 只能看自己的单；manager/super-admin 看全部
    const roles = ctx.user?.roles?.map(r => r.code) ?? [];
    const isManager = roles.includes('manager') || roles.includes('super-admin');
    if (isManager) {
      return this.deliveryService.findAllDeliveries(ctx, status);
    }
    return this.deliveryService.findMyDeliveries(ctx, String(ctx.activeUserId), status);
  }

  @Mutation(() => Object)
  @Allow(deliveryPermissions.values.DeliverOrder)
  async startDelivery(
    @Ctx() ctx: RequestContext,
    @Args({ name: 'orderId', type: () => String }) orderId: string,
  ) {
    return this.deliveryService.startDelivery(ctx, orderId);
  }

  @Mutation(() => Object)
  @Allow(deliveryPermissions.values.MarkDelivered)
  async markDelivered(
    @Ctx() ctx: RequestContext,
    @Args({ name: 'orderId', type: () => String }) orderId: string,
    @Args({ name: 'photos', type: () => [String] }) photos: string[],
    @Args({ name: 'note', type: () => String, nullable: true }) note?: string,
  ) {
    return this.deliveryService.markDelivered(ctx, orderId, photos, note);
  }

  @Mutation(() => Object)
  @Allow(deliveryPermissions.values.ReportException)
  async reportException(
    @Ctx() ctx: RequestContext,
    @Args({ name: 'orderId', type: () => String }) orderId: string,
    @Args({ name: 'type', type: () => String }) type: string,
    @Args({ name: 'photos', type: () => [String] }) photos: string[],
    @Args({ name: 'note', type: () => String, nullable: true }) note?: string,
  ) {
    return this.deliveryService.reportException(ctx, orderId, type, photos, note);
  }

  @Mutation(() => Object)
  @Allow(deliveryPermissions.values.ReassignDelivery)
  async reassignDelivery(
    @Ctx() ctx: RequestContext,
    @Args({ name: 'orderId', type: () => String }) orderId: string,
    @Args({ name: 'newStaffId', type: () => String }) newStaffId: string,
  ) {
    return this.deliveryService.reassignDelivery(ctx, orderId, newStaffId);
  }
}
```

- [ ] **Step 3: 修改 delivery.plugin.ts 注册 service 和 resolver**

```typescript
// 在 @VendurePlugin 装饰器中加 providers 和 adminApiResolvers
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [DeliveryService],
  adminApiResolvers: [PermissionAdminResolver, DeliveryAdminResolver],
  configuration: (config) => { /* ... */ },
  onBootstrap: async (injector: Injector) => {
    const roleSync = new RoleSyncService();
    roleSync.init(injector);
    await roleSync.syncRoles({} as any);

    // 初始化 DeliveryService
    const deliveryService = injector.get(DeliveryService);
    deliveryService.init(injector);
  },
})
```

- [ ] **Step 4: 构建、启动、用 GraphQL 验证**

```bash
cd e:\code\vendure\packages\delivery-plugin && npm run build && cd ../dev-server && npm run start
```

用 super-admin 登录后执行：

```graphql
query { myDeliveries { orderId code deliveryStatus customer { name phone } } }
```

Expected: 返回空数组（无派单数据）

- [ ] **Step 5: Commit**

```bash
git add packages/delivery-plugin
git commit -m "feat(delivery-plugin): implement delivery admin resolver with CRUD operations"
```

---

## Task 6: 实现自动派单事件订阅

**Files:**
- Create: `e:\code\vendure\packages\delivery-plugin\src\delivery-events.ts`
- Modify: `e:\code\vendure\packages\delivery-plugin\src\delivery.plugin.ts`

- [ ] **Step 1: 创建 delivery-events.ts**

```typescript
// e:\code\vendure\packages\delivery-plugin\src\delivery-events.ts
import { Injectable, Injector, Logger, EventBus, OrderStateTransitionEvent } from '@vendure/core';
import { DeliveryService } from './delivery.service';

@Injectable()
export class DeliveryEventSubscriber {
  private eventBus: EventBus;
  private deliveryService: DeliveryService;
  private administratorRepo: any;
  private orderRepo: any;
  private staffCache: { data: any[]; expiredAt: number } = { data: [], expiredAt: 0 };

  init(injector: Injector) {
    this.eventBus = injector.get(EventBus);
    this.deliveryService = injector.get(DeliveryService);
    this.administratorRepo = injector.getRepository('Administrator');
    this.orderRepo = injector.getRepository('Order');

    this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
      if (event.toState !== 'PaymentSettled') return;
      if (event.fromState === 'PaymentSettled') return; // 避免重复
      await this.autoAssign(event.ctx, event.entity);
    });
  }

  private async getCandidates(ctx: any) {
    // 5 分钟缓存
    if (Date.now() < this.staffCache.expiredAt) {
      return this.staffCache.data;
    }
    const admins = await this.administratorRepo.find({
      relations: ['user', 'user.roles'],
    });
    const candidates = admins.filter((a: any) =>
      a.user?.roles?.some((r: any) => r.code === 'delivery-staff')
    );
    this.staffCache = { data: candidates, expiredAt: Date.now() + 5 * 60 * 1000 };
    return candidates;
  }

  private async autoAssign(ctx: any, order: any) {
    try {
      // 已派单则跳过
      if (order.customFields?.deliveryStaffId) return;

      const candidates = await this.getCandidates(ctx);
      if (candidates.length === 0) {
        Logger.warn(`[delivery-plugin] No delivery staff available for order ${order.code}`);
        return;
      }

      // 查每个候选人的当前未完成订单数
      const staffWithLoad = await Promise.all(
        candidates.map(async (admin: any) => {
          const pendingCount = await this.orderRepo.count({
            where: {
              customFields: {
                deliveryStaffId: String(admin.id),
                deliveryStatus: 'assigned',
              },
            },
          });
          return { admin, pendingCount, lastAssignedAt: admin.updatedAt };
        })
      );

      // 按 pendingCount ASC, lastAssignedAt ASC 排序
      staffWithLoad.sort((a, b) => {
        if (a.pendingCount !== b.pendingCount) return a.pendingCount - b.pendingCount;
        return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
      });

      const chosen = staffWithLoad[0].admin;

      // 写入派单信息
      await this.orderRepo.update(order.id, {
        customFields: {
          deliveryStaffId: String(chosen.id),
          deliveryStatus: 'assigned',
          assignedAt: new Date(),
        },
      });

      Logger.info(`[delivery-plugin] Auto-assigned order ${order.code} to staff ${chosen.id}`);
    } catch (e: any) {
      Logger.error(`[delivery-plugin] Auto-assign failed for order ${order.code}: ${e.message}`);
    }
  }
}
```

> 注意：MVP 简化版，未在派单时创建 Fulfillment。Fulfillment 创建可在 markDelivered 时通过其他方式处理，或第二期完善。如果业务需要"派单即扣库存"，需补充 Fulfillment 创建逻辑。

- [ ] **Step 2: 修改 delivery.plugin.ts 注册事件订阅**

```typescript
// 在 onBootstrap 中初始化事件订阅
onBootstrap: async (injector: Injector) => {
  const roleSync = new RoleSyncService();
  roleSync.init(injector);
  await roleSync.syncRoles({} as any);

  const deliveryService = injector.get(DeliveryService);
  deliveryService.init(injector);

  const eventSubscriber = new DeliveryEventSubscriber();
  eventSubscriber.init(injector);
},
```

- [ ] **Step 3: 构建、启动、用 vshop 下单验证**

```bash
cd e:\code\vendure\packages\delivery-plugin && npm run build && cd ../dev-server && npm run start
```

1. 确保 vshop 运行中
2. 用 vshop 创建一个测试订单并完成支付
3. 查看 vendure 日志，应看到 `[delivery-plugin] Auto-assigned order XXX to staff YYY`
4. 用 GraphQL 查询 `myDeliveries` 确认订单出现

- [ ] **Step 4: Commit**

```bash
git add packages/delivery-plugin
git commit -m "feat(delivery-plugin): implement auto-assignment event subscriber"
```

---

## Task 7: 初始化 vadmin 工程

**Files:**
- Create: `e:\code\vadmin\` 整个工程目录

- [ ] **Step 1: 拷贝 vshop 工程骨架**

```bash
xcopy e:\code\vshop e:\code\vadmin\ /E /I /EXCLUDE:e:\code\vshop\.gitignore
```

或手动拷贝以下文件/目录到 vadmin：
- `package.json`（修改 name 为 vadmin）
- `tsconfig.json`、`vite.config.ts`、`manifest.json`、`pages.json`
- `src/App.vue`、`src/main.ts`、`src/env.d.ts`
- `src/utils/`（auth.ts 保留，移除其他不需要的）
- `src/api/client.ts`
- `src/components/`（保留通用组件，删除业务组件）

- [ ] **Step 2: 修改 package.json**

```json
{
  "name": "vadmin",
  "version": "1.0.0",
  "description": "vendure 移动端综合管理平台",
  // ... 其他依赖与 vshop 一致
}
```

- [ ] **Step 3: 修改 src/api/client.ts 指向 admin-api**

```typescript
// e:\code\vadmin\src\api\client.ts
import { GraphQLClient } from 'graphql-request';

const ADMIN_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/admin-api';

let client: GraphQLClient | null = null;

export function getAdminClient(): GraphQLClient {
  if (!client) {
    const token = uni.getStorageSync('admin_token');
    client = new GraphQLClient(ADMIN_API_URL, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
  }
  return client;
}

export function resetAdminClient() {
  client = null;
}
```

- [ ] **Step 4: 创建 auth mutations（admin login）**

```typescript
// e:\code\vadmin\src\api\mutations\auth.ts
const ADMIN_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/admin-api';

export interface LoginResult {
  token: string;
  userId: string;
  identifier: string;
}

export async function adminLogin(username: string, password: string): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: ADMIN_API_URL,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        query: `
          mutation Login($username: String!, $password: String!) {
            login(username: $username, password: $password) {
              __typename
              ... on CurrentUser {
                id
                identifier
                channels { id token code }
              }
              ... on ErrorResult { errorCode message }
            }
          }
        `,
        variables: { username, password },
      },
      success: (res: any) => {
        const token = res.header['vendure-auth-token'] || res.header['Vendure-Auth-Token'];
        if (!token) {
          reject(new Error('登录失败：未收到 token'));
          return;
        }
        const data = res.data?.data?.login;
        if (data?.__typename === 'CurrentUser') {
          resolve({ token, userId: String(data.id), identifier: data.identifier });
        } else {
          reject(new Error(data?.message || '登录失败'));
        }
      },
      fail: (err: any) => reject(err),
    });
  });
}
```

- [ ] **Step 5: 创建 auth store**

```typescript
// e:\code\vadmin\src\stores\auth.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { adminLogin } from '@/api/mutations/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(uni.getStorageSync('admin_token') || '');
  const userId = ref<string>('');
  const identifier = ref<string>('');

  async function login(username: string, password: string) {
    const result = await adminLogin(username, password);
    token.value = result.token;
    userId.value = result.userId;
    identifier.value = result.identifier;
    uni.setStorageSync('admin_token', result.token);
  }

  function logout() {
    token.value = '';
    userId.value = '';
    identifier.value = '';
    uni.removeStorageSync('admin_token');
    uni.removeStorageSync('my_permissions');
  }

  function isLoggedIn(): boolean {
    return !!token.value;
  }

  return { token, userId, identifier, login, logout, isLoggedIn };
});
```

- [ ] **Step 6: 安装依赖并启动验证**

```bash
cd e:\code\vadmin
npm install
npm run dev:h5
```

打开 http://localhost:5173，确认空页面能加载

- [ ] **Step 7: Commit**

```bash
cd e:\code\vadmin
git init
git add .
git commit -m "feat(vadmin): initialize project from vshop scaffold with admin-api client"
```

---

## Task 8: 实现 permission store 与权限守卫

**Files:**
- Create: `e:\code\vadmin\src\stores\permission.ts`
- Create: `e:\code\vadmin\src\composables\usePermission.ts`
- Create: `e:\code\vadmin\src\directives\perm.ts`
- Create: `e:\code\vadmin\src\api\queries\auth.ts`
- Create: `e:\code\vadmin\src\router\meta.ts`
- Modify: `e:\code\vadmin\src\main.ts`

- [ ] **Step 1: 创建 myPermissions query**

```typescript
// e:\code\vadmin\src\api\queries\auth.ts
import { getAdminClient } from '@/api/client';

export interface ModuleConfig {
  code: string;
  name: string;
  enabled: boolean;
  entryPath: string;
  icon: string;
  sort: number;
}

export interface MyPermissionProfile {
  roles: string[];
  permissions: string[];
  visibleModules: ModuleConfig[];
}

export async function fetchMyPermissions(): Promise<MyPermissionProfile> {
  const client = getAdminClient();
  const res = await client.request<{
    myPermissions: MyPermissionProfile;
  }>(`
    query {
      myPermissions {
        roles
        permissions
        visibleModules { code name enabled entryPath icon sort }
      }
    }
  `);
  return res.myPermissions;
}
```

- [ ] **Step 2: 创建 permission store**

```typescript
// e:\code\vadmin\src\stores\permission.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchMyPermissions, type ModuleConfig } from '@/api/queries/auth';

const ROLE_PRIORITY = [
  'super-admin', 'manager', 'operations-staff', 'customer-service',
  'sales-staff', 'inventory-staff', 'delivery-staff',
];

export const usePermissionStore = defineStore('permission', () => {
  const permissions = ref<string[]>(uni.getStorageSync('my_permissions_perms') || []);
  const roles = ref<string[]>(uni.getStorageSync('my_permissions_roles') || []);
  const visibleModules = ref<ModuleConfig[]>(uni.getStorageSync('my_permissions_modules') || []);
  const primaryRole = ref<string>('');

  function has(perm: string): boolean {
    return permissions.value.includes(perm) || roles.value.includes('super-admin');
  }

  function is(role: string): boolean {
    return roles.value.includes(role);
  }

  function computePrimaryRole(): string {
    for (const r of ROLE_PRIORITY) {
      if (roles.value.includes(r)) return r;
    }
    return roles.value[0] ?? '';
  }

  async function load() {
    const profile = await fetchMyPermissions();
    permissions.value = profile.permissions;
    roles.value = profile.roles;
    visibleModules.value = profile.visibleModules;
    primaryRole.value = computePrimaryRole();
    uni.setStorageSync('my_permissions_perms', profile.permissions);
    uni.setStorageSync('my_permissions_roles', profile.roles);
    uni.setStorageSync('my_permissions_modules', profile.visibleModules);
  }

  function clear() {
    permissions.value = [];
    roles.value = [];
    visibleModules.value = [];
    primaryRole.value = '';
    uni.removeStorageSync('my_permissions_perms');
    uni.removeStorageSync('my_permissions_roles');
    uni.removeStorageSync('my_permissions_modules');
  }

  return { permissions, roles, visibleModules, primaryRole, has, is, load, clear };
});
```

- [ ] **Step 3: 创建 usePermission composable**

```typescript
// e:\code\vadmin\src\composables\usePermission.ts
import { usePermissionStore } from '@/stores/permission';

export function usePermission() {
  const store = usePermissionStore();

  function can(perm: string): boolean {
    return store.has(perm);
  }

  function checkRoute(toPath: string): string | null {
    // 由 useAuthGuard 调用，返回重定向路径或 null
    const meta = ROUTE_META[toPath];
    if (meta?.perm && !store.has(meta.perm)) {
      return '/pages/403/index';
    }
    return null;
  }

  return { can, checkRoute };
}

import { ROUTE_META } from '@/router/meta';
```

- [ ] **Step 4: 创建路由元信息**

```typescript
// e:\code\vadmin\src\router\meta.ts
export const ROUTE_META: Record<string, { perm?: string; module?: string }> = {
  'pkg-delivery/pages/list/index':      { perm: 'DeliverOrder' },
  'pkg-delivery/pages/detail/index':    { perm: 'DeliverOrder' },
  'pkg-delivery/pages/sign/index':      { perm: 'MarkDelivered' },
  'pkg-delivery/pages/exception/index': { perm: 'ReportException' },
  // 其他模块路由（第二期实现时填充）
};
```

- [ ] **Step 5: 创建 v-perm 指令**

```typescript
// e:\code\vadmin\src\directives\perm.ts
import { App } from 'vue';
import { usePermissionStore } from '@/stores/permission';

export function registerPermDirective(app: App) {
  app.directive('perm', {
    mounted(el: any, binding: any) {
      const store = usePermissionStore();
      if (binding.value && !store.has(binding.value)) {
        el.parentNode?.removeChild(el);
      }
    },
  });
}
```

- [ ] **Step 6: 在 main.ts 注册指令**

```typescript
// e:\code\vadmin\src\main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { registerPermDirective } from './directives/perm';

const app = createApp(App);
app.use(createPinia());
registerPermDirective(app);
app.mount('#app');
```

- [ ] **Step 7: Commit**

```bash
git add src/stores src/composables src/directives src/api/queries src/router src/main.ts
git commit -m "feat(vadmin): implement permission store, guard, and v-perm directive"
```

---

## Task 9: 创建 shortcuts 配置与 useAuthGuard

**Files:**
- Create: `e:\code\vadmin\src\config\shortcuts.ts`
- Create: `e:\code\vadmin\src\config\kpi.ts`
- Create: `e:\code\vadmin\src\composables\useAuthGuard.ts`

- [ ] **Step 1: 创建 shortcuts.ts（全量配置）**

```typescript
// e:\code\vadmin\src\config\shortcuts.ts
export interface ShortcutConfig {
  code: string;
  name: string;
  icon: string;
  perm: string | null;
  route: string;
  enabled: boolean;  // 后端模块是否实现
}

export const SHORTCUTS: ShortcutConfig[] = [
  // 送货模块（第一期实现）
  { code: 'delivery-tasks',  name: '任务', icon: '📦', perm: 'DeliverOrder',       route: '/pkg-delivery/pages/list/index',      enabled: true },
  { code: 'delivery-sign',   name: '签收', icon: '✍️', perm: 'MarkDelivered',      route: '/pkg-delivery/pages/list/index',      enabled: true },
  { code: 'delivery-except', name: '异常', icon: '⚠️', perm: 'ReportException',    route: '/pkg-delivery/pages/list/index',      enabled: true },
  // 销售模块（第二期占位）
  { code: 'sales-create',    name: '开单', icon: '📝', perm: 'CreateOrder',        route: '/pkg-sales/pages/placeholder',        enabled: false },
  { code: 'sales-customer',  name: '客户', icon: '👤', perm: 'ManageCustomer',     route: '/pkg-sales/pages/placeholder',        enabled: false },
  { code: 'sales-report',    name: '业绩', icon: '📈', perm: 'ViewSalesReport',    route: '/pkg-sales/pages/placeholder',        enabled: false },
  // 调库模块（第三期占位）
  { code: 'inv-stock',       name: '库存', icon: '📊', perm: 'ViewStock',          route: '/pkg-inventory/pages/placeholder',    enabled: false },
  { code: 'inv-move',        name: '调拨', icon: '🔄', perm: 'ManageStockMove',    route: '/pkg-inventory/pages/placeholder',    enabled: false },
  { code: 'inv-stocktake',   name: '盘点', icon: '📋', perm: 'ManageStocktake',    route: '/pkg-inventory/pages/placeholder',    enabled: false },
  // 客服模块（第二期占位）
  { code: 'cs-orders',       name: '订单', icon: '🛒', perm: 'ViewAllOrders',      route: '/pkg-cs/pages/placeholder',           enabled: false },
  { code: 'cs-after-sales',  name: '售后', icon: '↩️', perm: 'HandleAfterSales',   route: '/pkg-cs/pages/placeholder',           enabled: false },
  // 运营模块（第四期占位）
  { code: 'ops-promo',       name: '营销', icon: '🎁', perm: 'ManagePromotion',    route: '/pkg-ops/pages/placeholder',          enabled: false },
  { code: 'ops-dashboard',   name: '看板', icon: '📊', perm: 'ViewDashboard',      route: '/pkg-ops/pages/placeholder',          enabled: false },
  // 管理模块（第四期占位）
  { code: 'admin-orders',    name: '订单', icon: '🛒', perm: 'ViewAllOrders',      route: '/pkg-admin/pages/placeholder',        enabled: false },
  { code: 'admin-products',  name: '商品', icon: '🏷️', perm: 'ManageProduct',      route: '/pkg-admin/pages/placeholder',        enabled: false },
  { code: 'admin-users',     name: '用户', icon: '👥', perm: 'ManageUser',         route: '/pkg-admin/pages/placeholder',        enabled: false },
  { code: 'admin-finance',   name: '财务', icon: '💰', perm: 'ViewFinance',        route: '/pkg-admin/pages/placeholder',        enabled: false },
  // 通用
  { code: 'common-scan',     name: '扫码', icon: '📷', perm: null,                 route: '/pages/scan/index',                   enabled: true },
  { code: 'common-message',  name: '消息', icon: '🔔', perm: null,                 route: '/pkg-common/pages/message/placeholder', enabled: false },
  { code: 'common-settings', name: '设置', icon: '⚙️', perm: 'SuperAdmin',        route: '/pkg-common/pages/settings/placeholder', enabled: false },
];

export function buildShortcutsByPermission(
  permissions: string[],
  isSuperAdmin: boolean,
  primaryRole: string,
): ShortcutConfig[] {
  const filtered = SHORTCUTS.filter(s => {
    if (s.perm === null) return true;
    if (isSuperAdmin) return true;
    return permissions.includes(s.perm);
  });

  // 主角色相关排前面
  const rolePrefix = primaryRole.split('-')[0]; // 'delivery-staff' → 'delivery'
  filtered.sort((a, b) => {
    const aMatch = a.code.startsWith(rolePrefix) ? 0 : 1;
    const bMatch = b.code.startsWith(rolePrefix) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return 0;
  });

  return filtered.slice(0, 12);
}
```

- [ ] **Step 2: 创建 kpi.ts**

```typescript
// e:\code\vadmin\src\config\kpi.ts
export interface KpiCard {
  label: string;
  value: number | string;
  color: 'orange' | 'blue' | 'green' | 'purple' | 'red';
}

export function buildKpiByRole(roles: string[], stats: any): KpiCard[] {
  if (roles.includes('delivery-staff')) {
    return [
      { label: '待取货', value: stats.assigned ?? 0, color: 'orange' },
      { label: '配送中', value: stats.inProgress ?? 0, color: 'blue' },
      { label: '今日已完成', value: stats.delivered ?? 0, color: 'green' },
    ];
  }
  if (roles.includes('sales-staff')) {
    return [
      { label: '今日开单', value: stats.todayOrders ?? 0, color: 'blue' },
      { label: '今日业绩', value: stats.todayAmount ?? 0, color: 'green' },
      { label: '本月业绩', value: stats.monthAmount ?? 0, color: 'purple' },
    ];
  }
  if (roles.includes('manager') || roles.includes('super-admin')) {
    return [
      { label: '今日订单', value: stats.todayOrders ?? 0, color: 'blue' },
      { label: '异常待处理', value: stats.exceptionCount ?? 0, color: 'red' },
      { label: '今日销售额', value: stats.todayAmount ?? 0, color: 'green' },
    ];
  }
  return [];
}
```

- [ ] **Step 3: 创建 useAuthGuard**

```typescript
// e:\code\vadmin\src\composables\useAuthGuard.ts
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';
import { ROUTE_META } from '@/router/meta';

const PUBLIC_PATHS = ['/pages/login/index', '/pages/403/index', '/pages/404/index'];

export function useAuthGuard() {
  const authStore = useAuthStore();
  const permStore = usePermissionStore();

  function check(toPath: string): string | null {
    // 公开页面放行
    if (PUBLIC_PATHS.includes(toPath)) return null;

    // 未登录跳登录
    if (!authStore.isLoggedIn()) {
      return '/pages/login/index';
    }

    // 权限检查
    const meta = ROUTE_META[toPath];
    if (meta?.perm && !permStore.has(meta.perm)) {
      return '/pages/403/index';
    }

    return null;
  }

  return { check };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/config src/composables
git commit -m "feat(vadmin): add shortcuts config, kpi builder, and auth guard"
```

---

## Task 10: 实现工作台首页

**Files:**
- Create: `e:\code\vadmin\src\pages\home\index.vue`
- Create: `e:\code\vadmin\src\components\HomeHeader.vue`
- Create: `e:\code\vadmin\src\components\KpiCards.vue`
- Create: `e:\code\vadmin\src\components\GridLayout.vue`
- Create: `e:\code\vadmin\src\components\ShortcutButton.vue`
- Create: `e:\code\vadmin\src\components\TodoList.vue`
- Create: `e:\code\vadmin\src\api\queries\delivery.ts`

- [ ] **Step 1: 创建 delivery queries**

```typescript
// e:\code\vadmin\src\api\queries\delivery.ts
import { getAdminClient } from '@/api/client';

export async function fetchMyDeliveries(status?: string) {
  const client = getAdminClient();
  const res = await client.request<{
    myDeliveries: any[];
  }>(`
    query MyDeliveries($status: String) {
      myDeliveries(status: $status) {
        orderId
        code
        deliveryStatus
        customer { name phone address latitude longitude }
        lines { name sku qty imageUrl }
        totalWithTax
        assignedAt
        deliveredAt
      }
    }
  `, { status: status ?? null });
  return res.myDeliveries;
}
```

- [ ] **Step 2: 创建 ShortcutButton 组件**

```vue
<!-- e:\code\vadmin\src\components\ShortcutButton.vue -->
<template>
  <view class="shortcut-btn" :class="{ disabled }" @click="onClick">
    <view class="icon">{{ icon }}</view>
    <view class="name">{{ label }}</view>
    <view v-if="!enabled" class="badge">即将上线</view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  icon: string;
  label: string;
  enabled: boolean;
  route: string;
}>();

function onClick() {
  if (!props.enabled) {
    uni.showToast({ title: '即将上线，敬请期待', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: props.route });
}
</script>

<style scoped>
.shortcut-btn { display: flex; flex-direction: column; align-items: center; padding: 12rpx; position: relative; }
.shortcut-btn .icon { font-size: 48rpx; margin-bottom: 8rpx; }
.shortcut-btn .name { font-size: 24rpx; color: #333; }
.shortcut-btn.disabled .icon, .shortcut-btn.disabled .name { opacity: 0.4; }
.shortcut-btn .badge { position: absolute; top: 0; right: 0; font-size: 16rpx; color: #999; background: #f0f0f0; padding: 2rpx 6rpx; border-radius: 4rpx; }
</style>
```

- [ ] **Step 3: 创建 KpiCards 组件**

```vue
<!-- e:\code\vadmin\src\components\KpiCards.vue -->
<template>
  <view class="kpi-cards">
    <view v-for="(card, i) in cards" :key="i" class="kpi-card" :class="card.color">
      <view class="value">{{ card.value }}</view>
      <view class="label">{{ card.label }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ cards: Array<{ label: string; value: number | string; color: string }> }>();
</script>

<style scoped>
.kpi-cards { display: flex; gap: 12rpx; padding: 24rpx; }
.kpi-card { flex: 1; background: #f8f8f8; border-radius: 12rpx; padding: 24rpx; text-align: center; }
.kpi-card .value { font-size: 40rpx; font-weight: bold; margin-bottom: 8rpx; }
.kpi-card .label { font-size: 24rpx; color: #666; }
.kpi-card.orange .value { color: #ff9900; }
.kpi-card.blue .value { color: #0088ff; }
.kpi-card.green .value { color: #00aa00; }
.kpi-card.purple .value { color: #aa00ff; }
.kpi-card.red .value { color: #ff0000; }
</style>
```

- [ ] **Step 4: 创建 GridLayout 组件**

```vue
<!-- e:\code\vadmin\src\components\GridLayout.vue -->
<template>
  <view class="grid-layout">
    <view v-for="(item, i) in items" :key="i" class="grid-item" :style="{ width: 100 / columns + '%' }">
      <slot name="item" :item="item" />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ items: any[]; columns: number }>();
</script>

<style scoped>
.grid-layout { display: flex; flex-wrap: wrap; padding: 0 12rpx; }
.grid-item { padding: 12rpx; box-sizing: border-box; }
</style>
```

- [ ] **Step 5: 创建 HomeHeader 组件**

```vue
<!-- e:\code\vadmin\src\components\HomeHeader.vue -->
<template>
  <view class="home-header">
    <view class="welcome">欢迎你，{{ userName }}</view>
    <view class="role-badge">{{ roleName }}</view>
    <view class="msg-icon" @click="onMessage">🔔 <text v-if="msgCount > 0" class="badge">{{ msgCount }}</text></view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ userName: string; roleName: string; msgCount: number }>();

function onMessage() {
  uni.showToast({ title: '消息中心即将上线', icon: 'none' });
}
</script>

<style scoped>
.home-header { display: flex; align-items: center; padding: 24rpx; background: #fff; }
.welcome { font-size: 32rpx; font-weight: bold; margin-right: 12rpx; }
.role-badge { font-size: 22rpx; color: #0088ff; background: #e6f4ff; padding: 4rpx 12rpx; border-radius: 20rpx; }
.msg-icon { margin-left: auto; font-size: 36rpx; position: relative; }
.msg-icon .badge { position: absolute; top: -8rpx; right: -8rpx; background: red; color: #fff; font-size: 18rpx; padding: 2rpx 6rpx; border-radius: 10rpx; }
</style>
```

- [ ] **Step 6: 创建 TodoList 组件**

```vue
<!-- e:\code\vadmin\src\components\TodoList.vue -->
<template>
  <view class="todo-list">
    <view v-for="item in items" :key="item.id" class="todo-item" @click="$emit('click', item)">
      <view class="todo-icon">{{ item.icon }}</view>
      <view class="todo-content">
        <view class="todo-title">{{ item.title }}</view>
        <view class="todo-desc">{{ item.desc }}</view>
      </view>
      <view class="todo-badge">{{ item.badge }}</view>
    </view>
    <view v-if="!items.length" class="empty">暂无待办</view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ items: Array<{ id: string; icon: string; title: string; desc: string; badge: string }> }>();
defineEmits(['click']);
</script>

<style scoped>
.todo-list { padding: 0 24rpx; }
.todo-item { display: flex; align-items: center; padding: 24rpx; background: #fff; border-radius: 12rpx; margin-bottom: 12rpx; }
.todo-icon { font-size: 40rpx; margin-right: 16rpx; }
.todo-content { flex: 1; }
.todo-title { font-size: 28rpx; font-weight: bold; }
.todo-desc { font-size: 24rpx; color: #666; margin-top: 4rpx; }
.todo-badge { font-size: 22rpx; color: #ff9900; background: #fff5e6; padding: 4rpx 12rpx; border-radius: 20rpx; }
.empty { text-align: center; color: #999; padding: 48rpx; }
</style>
```

- [ ] **Step 7: 创建工作台首页**

```vue
<!-- e:\code\vadmin\src\pages\home\index.vue -->
<template>
  <view class="home">
    <HomeHeader :user-name="userName" :role-name="roleName" :msg-count="0" />
    <KpiCards :cards="kpiCards" />

    <view class="section">
      <view class="section-title">快捷功能</view>
      <GridLayout :items="shortcuts" :columns="4">
        <template #item="{ item }">
          <ShortcutButton :icon="item.icon" :label="item.name" :enabled="item.enabled" :route="item.route" />
        </template>
      </GridLayout>
    </view>

    <view class="section">
      <view class="section-title">待办事项</view>
      <TodoList :items="todos" @click="onTodoClick" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';
import { buildShortcutsByPermission } from '@/config/shortcuts';
import { buildKpiByRole } from '@/config/kpi';
import { fetchMyDeliveries } from '@/api/queries/delivery';
import HomeHeader from '@/components/HomeHeader.vue';
import KpiCards from '@/components/KpiCards.vue';
import GridLayout from '@/components/GridLayout.vue';
import ShortcutButton from '@/components/ShortcutButton.vue';
import TodoList from '@/components/TodoList.vue';

const authStore = useAuthStore();
const permStore = usePermissionStore();

const userName = computed(() => authStore.identifier || '管理员');
const roleName = computed(() => permStore.primaryRole || '未知');

const shortcuts = computed(() =>
  buildShortcutsByPermission(permStore.permissions, permStore.is('super-admin'), permStore.primaryRole)
);

const stats = ref({ assigned: 0, inProgress: 0, delivered: 0 });
const kpiCards = computed(() => buildKpiByRole(permStore.roles, stats.value));

const todos = ref<any[]>([]);

async function loadData() {
  try {
    // 刷新权限
    await permStore.load();

    // 送货员角色加载任务数据
    if (permStore.is('delivery-staff') || permStore.is('manager') || permStore.is('super-admin')) {
      const [assigned, inProgress, delivered] = await Promise.all([
        fetchMyDeliveries('assigned').catch(() => []),
        fetchMyDeliveries('in_progress').catch(() => []),
        fetchMyDeliveries('delivered').catch(() => []),
      ]);
      stats.value = {
        assigned: assigned.length,
        inProgress: inProgress.length,
        delivered: delivered.length,
      };
      todos.value = assigned.slice(0, 5).map((o: any) => ({
        id: o.orderId,
        icon: '🚚',
        title: `#${o.code} 待取货`,
        desc: o.customer?.address || '',
        badge: o.deliveryStatus,
      }));
    }
  } catch (e) {
    console.error('Load home data failed', e);
  }
}

function onTodoClick(item: any) {
  uni.navigateTo({ url: `/pkg-delivery/pages/detail/index?id=${item.id}` });
}

onShow(() => {
  loadData();
});
</script>

<style scoped>
.home { min-height: 100vh; background: #f5f5f5; }
.section { margin-top: 24rpx; background: #fff; padding: 24rpx 0; }
.section-title { font-size: 28rpx; font-weight: bold; padding: 0 24rpx 12rpx; }
</style>
```

- [ ] **Step 8: 在 pages.json 注册首页**

修改 `e:\code\vadmin\src\pages.json`：

```json
{
  "pages": [
    { "path": "pages/home/index", "style": { "navigationBarTitleText": "工作台" } },
    { "path": "pages/login/index", "style": { "navigationBarTitleText": "登录" } },
    { "path": "pages/scan/index", "style": { "navigationBarTitleText": "扫码" } },
    { "path": "pages/profile/index", "style": { "navigationBarTitleText": "我的" } },
    { "path": "pages/403/index", "style": { "navigationBarTitleText": "无权限" } },
    { "path": "pages/404/index", "style": { "navigationBarTitleText": "页面不存在" } }
  ],
  "subPackages": [
    { "root": "pkg-delivery", "pages": [
      { "path": "pages/list/index", "style": { "navigationBarTitleText": "任务列表" } },
      { "path": "pages/detail/index", "style": { "navigationBarTitleText": "订单详情" } },
      { "path": "pages/sign/index", "style": { "navigationBarTitleText": "签收" } },
      { "path": "pages/exception/index", "style": { "navigationBarTitleText": "异常上报" } }
    ]},
    { "root": "pkg-sales", "pages": [
      { "path": "pages/placeholder", "style": { "navigationBarTitleText": "销售模块" } }
    ]},
    { "root": "pkg-inventory", "pages": [
      { "path": "pages/placeholder", "style": { "navigationBarTitleText": "调库模块" } }
    ]},
    { "root": "pkg-cs", "pages": [
      { "path": "pages/placeholder", "style": { "navigationBarTitleText": "客服模块" } }
    ]},
    { "root": "pkg-ops", "pages": [
      { "path": "pages/placeholder", "style": { "navigationBarTitleText": "运营模块" } }
    ]},
    { "root": "pkg-admin", "pages": [
      { "path": "pages/placeholder", "style": { "navigationBarTitleText": "管理模块" } }
    ]},
    { "root": "pkg-common", "pages": [
      { "path": "pages/message/placeholder", "style": { "navigationBarTitleText": "消息" } },
      { "path": "pages/settings/placeholder", "style": { "navigationBarTitleText": "设置" } },
      { "path": "pages/help/placeholder", "style": { "navigationBarTitleText": "帮助" } }
    ]}
  ],
  "tabBar": {
    "list": [
      { "pagePath": "pages/home/index", "text": "工作台" },
      { "pagePath": "pages/scan/index", "text": "扫码" },
      { "pagePath": "pages/profile/index", "text": "我的" }
    ]
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add src/pages/home src/components src/api/queries/delivery.ts src/pages.json
git commit -m "feat(vadmin): implement home page with dynamic shortcuts, kpi, and todos"
```

---

## Task 11: 实现登录页

**Files:**
- Create: `e:\code\vadmin\src\pages\login\index.vue`
- Create: `e:\code\vadmin\src\utils\error-codes.ts`

- [ ] **Step 1: 创建错误码映射**

```typescript
// e:\code\vadmin\src\utils\error-codes.ts
export const ERROR_MSG_MAP: Record<string, string> = {
  INVALID_CREDENTIALS_ERROR: '账号或密码错误',
  NATIVE_AUTH_STRATEGY_ERROR: '登录失败',
  NOT_VERIFIED_ERROR: '账号未验证',
};

export function mapErrorMsg(errorCode: string, defaultMessage: string): string {
  return ERROR_MSG_MAP[errorCode] || defaultMessage;
}
```

- [ ] **Step 2: 创建登录页**

```vue
<!-- e:\code\vadmin\src\pages\login\index.vue -->
<template>
  <view class="login-page">
    <view class="title">vadmin 管理平台</view>
    <view class="form">
      <input v-model="username" class="input" placeholder="账号" />
      <input v-model="password" class="input" placeholder="密码" type="password" />
      <button class="btn" :disabled="loading" @click="onLogin">{{ loading ? '登录中...' : '登 录' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';
import { mapErrorMsg } from '@/utils/error-codes';

const authStore = useAuthStore();
const permStore = usePermissionStore();

const username = ref('');
const password = ref('');
const loading = ref(false);

async function onLogin() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    await authStore.login(username.value, password.value);
    await permStore.load();
    uni.reLaunch({ url: '/pages/home/index' });
  } catch (e: any) {
    const msg = e.message || '登录失败';
    const mapped = msg.includes('errorCode') ? mapErrorMsg(msg, msg) : msg;
    uni.showToast({ title: mapped, icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page { padding: 80rpx 48rpx; min-height: 100vh; background: #f5f5f5; }
.title { font-size: 48rpx; font-weight: bold; text-align: center; margin: 80rpx 0; }
.form { background: #fff; border-radius: 16rpx; padding: 48rpx; }
.input { border: 1rpx solid #ddd; border-radius: 8rpx; padding: 24rpx; margin-bottom: 24rpx; }
.btn { background: #0088ff; color: #fff; border-radius: 8rpx; margin-top: 24rpx; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/login src/utils/error-codes.ts
git commit -m "feat(vadmin): implement login page with error code mapping"
```

---

## Task 12: 实现送货模块 4 个页面

**Files:**
- Create: `e:\code\vadmin\src\pkg-delivery\pages\list\index.vue`
- Create: `e:\code\vadmin\src\pkg-delivery\pages\detail\index.vue`
- Create: `e:\code\vadmin\src\pkg-delivery\pages\sign\index.vue`
- Create: `e:\code\vadmin\src\pkg-delivery\pages\exception\index.vue`
- Create: `e:\code\vadmin\src\api\mutations\delivery.ts`
- Create: `e:\code\vadmin\src\utils\upload.ts`

- [ ] **Step 1: 创建 delivery mutations**

```typescript
// e:\code\vadmin\src\api\mutations\delivery.ts
import { getAdminClient } from '@/api/client';

export async function startDelivery(orderId: string) {
  const client = getAdminClient();
  return client.request(`
    mutation StartDelivery($orderId: String!) {
      startDelivery(orderId: $orderId) { orderId code deliveryStatus }
    }
  `, { orderId });
}

export async function markDelivered(orderId: string, photos: string[], note?: string) {
  const client = getAdminClient();
  return client.request(`
    mutation MarkDelivered($orderId: String!, $photos: [String!]!, $note: String) {
      markDelivered(orderId: $orderId, photos: $photos, note: $note) {
        orderId code deliveryStatus deliveredAt
      }
    }
  `, { orderId, photos, note: note ?? null });
}

export async function reportException(orderId: string, type: string, photos: string[], note?: string) {
  const client = getAdminClient();
  return client.request(`
    mutation ReportException($orderId: String!, $type: String!, $photos: [String!]!, $note: String) {
      reportException(orderId: $orderId, type: $type, photos: $photos, note: $note) {
        orderId code deliveryStatus exceptionType
      }
    }
  `, { orderId, type, photos, note: note ?? null });
}
```

- [ ] **Step 2: 创建 upload 工具（MVP 用 base64）**

```typescript
// e:\code\vadmin\src\utils\upload.ts
// MVP 策略：转 base64 直接随 mutation 提交
// 第二期改造为 OSS 上传

export async function chooseAndCompressImages(maxCount = 3): Promise<string[]> {
  const chooseRes = await uni.chooseImage({
    count: maxCount,
    sourceType: ['camera', 'album'],
    sizeType: ['compressed'],
  });

  const paths = chooseRes.tempFilePaths;
  const base64List: string[] = [];

  for (const path of paths) {
    const base64 = await pathToBase64(path);
    // 限制单张 500KB
    if (base64.length > 500 * 1024) {
      uni.showToast({ title: '图片过大，请重新选择', icon: 'none' });
      return [];
    }
    base64List.push(base64);
  }

  return base64List;
}

function pathToBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (res: any) => resolve(`data:image/jpeg;base64,${res.data}`),
      fail: reject,
    });
  });
}
```

- [ ] **Step 3: 创建任务列表页**

```vue
<!-- e:\code\vadmin\src\pkg-delivery\pages\list\index.vue -->
<template>
  <view class="list-page">
    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: activeTab === tab.value }" @click="switchTab(tab.value)">{{ tab.label }}</view>
    </view>
    <scroll-view scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" class="list">
      <view v-for="order in list" :key="order.orderId" class="card" @click="goDetail(order.orderId)">
        <view class="card-header">
          <text class="code">#{{ order.code }}</text>
          <text class="status" :class="order.deliveryStatus">{{ statusMap[order.deliveryStatus] }}</text>
        </view>
        <view class="card-body">
          <view class="info">{{ order.customer.name }} {{ order.customer.phone }}</view>
          <view class="addr">{{ order.customer.address }}</view>
          <view class="amount">¥{{ (order.totalWithTax / 100).toFixed(2) }}</view>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无任务</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { fetchMyDeliveries } from '@/api/queries/delivery';

const tabs = [
  { label: '待取货', value: 'assigned' },
  { label: '配送中', value: 'in_progress' },
  { label: '已完成', value: 'delivered' },
];
const statusMap: Record<string, string> = {
  assigned: '待取货', in_progress: '配送中', delivered: '已送达', exception: '异常',
};

const activeTab = ref('assigned');
const list = ref<any[]>([]);
const refreshing = ref(false);

async function loadList() {
  try {
    list.value = await fetchMyDeliveries(activeTab.value);
  } catch (e) {
    console.error(e);
  }
}

function switchTab(tab: string) {
  activeTab.value = tab;
  loadList();
}

async function onRefresh() {
  refreshing.value = true;
  await loadList();
  refreshing.value = false;
}

function goDetail(orderId: string) {
  uni.navigateTo({ url: `/pkg-delivery/pages/detail/index?id=${orderId}` });
}

onShow(() => loadList());
</script>

<style scoped>
.list-page { min-height: 100vh; background: #f5f5f5; }
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 24rpx; font-size: 28rpx; color: #666; }
.tab.active { color: #0088ff; border-bottom: 4rpx solid #0088ff; }
.list { height: calc(100vh - 88rpx); }
.card { margin: 16rpx 24rpx; background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-header { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.code { font-weight: bold; }
.status { font-size: 24rpx; padding: 4rpx 12rpx; border-radius: 20rpx; }
.status.assigned { color: #ff9900; background: #fff5e6; }
.status.in_progress { color: #0088ff; background: #e6f4ff; }
.status.delivered { color: #00aa00; background: #e6ffe6; }
.status.exception { color: #ff0000; background: #ffe6e6; }
.info { font-size: 28rpx; margin-bottom: 8rpx; }
.addr { font-size: 24rpx; color: #666; margin-bottom: 8rpx; }
.amount { font-size: 32rpx; color: #ff0000; font-weight: bold; }
.empty { text-align: center; color: #999; padding: 80rpx; }
</style>
```

- [ ] **Step 4: 创建订单详情页**

```vue
<!-- e:\code\vadmin\src\pkg-delivery\pages\detail\index.vue -->
<template>
  <view class="detail-page" v-if="order">
    <view class="header">
      <text class="code">#{{ order.code }}</text>
      <text class="status">{{ statusMap[order.deliveryStatus] }}</text>
    </view>
    <view class="section">
      <view class="row">
        <text class="label">收货人</text>
        <text class="value">{{ order.customer.name }}</text>
      </view>
      <view class="row">
        <text class="label">电话</text>
        <text class="value">{{ order.customer.phone }}</text>
        <button size="mini" @click="onCall">拨打</button>
      </view>
      <view class="row">
        <text class="label">地址</text>
        <text class="value">{{ order.customer.address }}</text>
        <button size="mini" @click="onNavigate" :disabled="!canNavigate">导航</button>
      </view>
    </view>
    <view class="section">
      <view class="section-title">商品清单</view>
      <view v-for="line in order.lines" :key="line.sku" class="line">
        <text class="line-name">{{ line.name }}</text>
        <text class="line-qty">x{{ line.qty }}</text>
      </view>
      <view class="total">合计：¥{{ (order.totalWithTax / 100).toFixed(2) }}</view>
    </view>
    <view class="footer">
      <button v-if="order.deliveryStatus === 'assigned'" type="primary" @click="onStart">开始配送</button>
      <template v-if="order.deliveryStatus === 'in_progress'">
        <button type="primary" @click="onSign">已送达，去签收</button>
        <button @click="onException">上报异常</button>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { getAdminClient } from '@/api/client';
import { startDelivery } from '@/api/mutations/delivery';

const orderId = ref('');
const order = ref<any>(null);
const statusMap: Record<string, string> = {
  assigned: '待取货', in_progress: '配送中', delivered: '已送达', exception: '异常',
};

const canNavigate = computed(() =>
  order.value?.customer?.latitude != null && order.value?.customer?.longitude != null
);

async function loadDetail() {
  const client = getAdminClient();
  const res = await client.request(`
    query OrderDetail($id: ID!) {
      order(id: $id) {
        id code
        customFields { deliveryStatus deliveryStaffId assignedAt deliveredAt }
        customer { firstName phoneNumber }
        shippingAddress { streetLine1 customFields { latitude longitude } }
        lines { quantity productVariant { name sku featuredAsset { preview } } }
        totalWithTax
      }
    }
  `, { id: orderId.value });
  const o = res.order;
  order.value = {
    code: o.code,
    deliveryStatus: o.customFields.deliveryStatus,
    customer: {
      name: o.customer?.firstName ?? '',
      phone: o.customer?.phoneNumber ?? '',
      address: o.shippingAddress?.streetLine1 ?? '',
      latitude: o.shippingAddress?.customFields?.latitude,
      longitude: o.shippingAddress?.customFields?.longitude,
    },
    lines: (o.lines ?? []).map((l: any) => ({
      name: l.productVariant?.name ?? '',
      sku: l.productVariant?.sku ?? '',
      qty: l.quantity,
    })),
    totalWithTax: o.totalWithTax,
  };
}

function onCall() {
  uni.makePhoneCall({ phoneNumber: order.value.customer.phone });
}

function onNavigate() {
  if (!canNavigate.value) {
    uni.showToast({ title: '地址无经纬度，无法导航', icon: 'none' });
    return;
  }
  uni.openLocation({
    latitude: order.value.customer.latitude,
    longitude: order.value.customer.longitude,
    name: order.value.customer.name,
    address: order.value.customer.address,
  });
}

async function onStart() {
  try {
    await startDelivery(orderId.value);
    await loadDetail();
    uni.showToast({ title: '已开始配送', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  }
}

function onSign() {
  uni.navigateTo({ url: `/pkg-delivery/pages/sign/index?id=${orderId.value}` });
}

function onException() {
  uni.navigateTo({ url: `/pkg-delivery/pages/exception/index?id=${orderId.value}` });
}

onLoad((options: any) => {
  orderId.value = options.id;
});
onShow(() => {
  if (orderId.value) loadDetail();
});
</script>

<style scoped>
.detail-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 120rpx; }
.header { display: flex; justify-content: space-between; padding: 24rpx; background: #fff; }
.code { font-size: 32rpx; font-weight: bold; }
.status { font-size: 24rpx; color: #0088ff; }
.section { margin-top: 16rpx; background: #fff; padding: 24rpx; }
.row { display: flex; align-items: center; padding: 12rpx 0; }
.label { width: 120rpx; color: #666; font-size: 28rpx; }
.value { flex: 1; font-size: 28rpx; }
.section-title { font-size: 28rpx; font-weight: bold; margin-bottom: 12rpx; }
.line { display: flex; justify-content: space-between; padding: 12rpx 0; }
.line-name { font-size: 28rpx; }
.line-qty { font-size: 28rpx; color: #666; }
.total { text-align: right; font-size: 32rpx; color: #ff0000; font-weight: bold; margin-top: 12rpx; }
.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 24rpx; background: #fff; display: flex; gap: 16rpx; }
</style>
```

- [ ] **Step 5: 创建签收页**

```vue
<!-- e:\code\vadmin\src\pkg-delivery\pages\sign\index.vue -->
<template>
  <view class="sign-page">
    <view class="section">
      <view class="title">上传送达照片（1-3 张）</view>
      <view class="photos">
        <view v-for="(photo, i) in photos" :key="i" class="photo">
          <image :src="photo" mode="aspectFill" />
        </view>
        <view v-if="photos.length < 3" class="add-btn" @click="onAddPhoto">+</view>
      </view>
    </view>
    <view class="section">
      <view class="title">备注</view>
      <textarea v-model="note" class="textarea" placeholder="可选填写备注" />
    </view>
    <button class="submit-btn" :disabled="submitting" @click="onSubmit">
      {{ submitting ? '提交中...' : '确认签收' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { chooseAndCompressImages } from '@/utils/upload';
import { markDelivered } from '@/api/mutations/delivery';

const orderId = ref('');
const photos = ref<string[]>([]);
const note = ref('');
const submitting = ref(false);

async function onAddPhoto() {
  try {
    const newPhotos = await chooseAndCompressImages(3 - photos.value.length);
    photos.value.push(...newPhotos);
  } catch (e) {
    console.error(e);
  }
}

async function onSubmit() {
  if (photos.value.length === 0) {
    uni.showToast({ title: '至少上传一张照片', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await markDelivered(orderId.value, photos.value, note.value);
    uni.showToast({ title: '签收成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e: any) {
    uni.showToast({ title: e.message || '签收失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

onLoad((options: any) => {
  orderId.value = options.id;
});
</script>

<style scoped>
.sign-page { min-height: 100vh; background: #f5f5f5; }
.section { margin-top: 16rpx; background: #fff; padding: 24rpx; }
.title { font-size: 28rpx; font-weight: bold; margin-bottom: 16rpx; }
.photos { display: flex; flex-wrap: wrap; gap: 16rpx; }
.photo { width: 200rpx; height: 200rpx; border-radius: 8rpx; overflow: hidden; }
.photo image { width: 100%; height: 100%; }
.add-btn { width: 200rpx; height: 200rpx; border: 2rpx dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 60rpx; color: #999; }
.textarea { width: 100%; height: 200rpx; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 16rpx; box-sizing: border-box; }
.submit-btn { margin: 48rpx 24rpx; background: #0088ff; color: #fff; }
</style>
```

- [ ] **Step 6: 创建异常上报页**

```vue
<!-- e:\code\vadmin\src\pkg-delivery\pages\exception\index.vue -->
<template>
  <view class="exception-page">
    <view class="section">
      <view class="title">异常类型</view>
      <radio-group @change="onTypeChange">
        <label v-for="t in types" :key="t.value" class="radio-item">
          <radio :value="t.value" :checked="type === t.value" />
          <text>{{ t.label }}</text>
        </label>
      </radio-group>
    </view>
    <view class="section">
      <view class="title">现场照片（1-3 张）</view>
      <view class="photos">
        <view v-for="(photo, i) in photos" :key="i" class="photo">
          <image :src="photo" mode="aspectFill" />
        </view>
        <view v-if="photos.length < 3" class="add-btn" @click="onAddPhoto">+</view>
      </view>
    </view>
    <view class="section">
      <view class="title">备注</view>
      <textarea v-model="note" class="textarea" placeholder="可选填写备注" />
    </view>
    <button class="submit-btn" :disabled="submitting" @click="onSubmit">
      {{ submitting ? '提交中...' : '提交上报' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { chooseAndCompressImages } from '@/utils/upload';
import { reportException } from '@/api/mutations/delivery';

const orderId = ref('');
const types = [
  { label: '拒收', value: 'rejected' },
  { label: '地址错误', value: 'wrong_address' },
  { label: '无人收货', value: 'no_recipient' },
  { label: '商品损坏', value: 'damaged' },
  { label: '其他', value: 'other' },
];
const type = ref('');
const photos = ref<string[]>([]);
const note = ref('');
const submitting = ref(false);

function onTypeChange(e: any) {
  type.value = e.detail.value;
}

async function onAddPhoto() {
  try {
    const newPhotos = await chooseAndCompressImages(3 - photos.value.length);
    photos.value.push(...newPhotos);
  } catch (e) {
    console.error(e);
  }
}

async function onSubmit() {
  if (!type.value) {
    uni.showToast({ title: '请选择异常类型', icon: 'none' });
    return;
  }
  if (photos.value.length === 0) {
    uni.showToast({ title: '至少上传一张照片', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await reportException(orderId.value, type.value, photos.value, note.value);
    uni.showToast({ title: '上报成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e: any) {
    uni.showToast({ title: e.message || '上报失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

onLoad((options: any) => {
  orderId.value = options.id;
});
</script>

<style scoped>
.exception-page { min-height: 100vh; background: #f5f5f5; }
.section { margin-top: 16rpx; background: #fff; padding: 24rpx; }
.title { font-size: 28rpx; font-weight: bold; margin-bottom: 16rpx; }
.radio-item { display: block; padding: 12rpx 0; }
.photos { display: flex; flex-wrap: wrap; gap: 16rpx; }
.photo { width: 200rpx; height: 200rpx; border-radius: 8rpx; overflow: hidden; }
.photo image { width: 100%; height: 100%; }
.add-btn { width: 200rpx; height: 200rpx; border: 2rpx dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 60rpx; color: #999; }
.textarea { width: 100%; height: 200rpx; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 16rpx; box-sizing: border-box; }
.submit-btn { margin: 48rpx 24rpx; background: #ff6600; color: #fff; }
</style>
```

- [ ] **Step 7: Commit**

```bash
git add src/pkg-delivery src/api/mutations/delivery.ts src/utils/upload.ts
git commit -m "feat(vadmin): implement delivery module list/detail/sign/exception pages"
```

---

## Task 13: 实现个人中心、扫码占位、403/404 页

**Files:**
- Create: `e:\code\vadmin\src\pages\profile\index.vue`
- Create: `e:\code\vadmin\src\pages\scan\index.vue`
- Create: `e:\code\vadmin\src\pages\403\index.vue`
- Create: `e:\code\vadmin\src\pages\404\index.vue`

- [ ] **Step 1: 创建个人中心**

```vue
<!-- e:\code\vadmin\src\pages\profile\index.vue -->
<template>
  <view class="profile-page">
    <view class="user-info">
      <view class="avatar">👤</view>
      <view class="info">
        <view class="name">{{ authStore.identifier || '管理员' }}</view>
        <view class="role">{{ roleName }} | ID: {{ authStore.userId }}</view>
      </view>
    </view>
    <view class="kpi">
      <view class="kpi-item">
        <view class="value">{{ stats.assigned }}</view>
        <view class="label">待取货</view>
      </view>
      <view class="kpi-item">
        <view class="value">{{ stats.inProgress }}</view>
        <view class="label">配送中</view>
      </view>
      <view class="kpi-item">
        <view class="value">{{ stats.delivered }}</view>
        <view class="label">已完成</view>
      </view>
    </view>
    <view class="menu">
      <view class="menu-item" @click="onTip">🔔 消息通知</view>
      <view class="menu-item" @click="onTip">📖 帮助中心</view>
      <view class="menu-item" @click="onTip">📧 意见反馈</view>
      <view class="menu-item" @click="onTip">ℹ️ 关于</view>
      <view class="menu-item logout" @click="onLogout">🚪 退出登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';
import { fetchMyDeliveries } from '@/api/queries/delivery';

const authStore = useAuthStore();
const permStore = usePermissionStore();

const roleName = computed(() => permStore.primaryRole || '未知');
const stats = ref({ assigned: 0, inProgress: 0, delivered: 0 });

async function loadStats() {
  if (!permStore.is('delivery-staff') && !permStore.is('manager') && !permStore.is('super-admin')) return;
  try {
    const [assigned, inProgress, delivered] = await Promise.all([
      fetchMyDeliveries('assigned').catch(() => []),
      fetchMyDeliveries('in_progress').catch(() => []),
      fetchMyDeliveries('delivered').catch(() => []),
    ]);
    stats.value = { assigned: assigned.length, inProgress: inProgress.length, delivered: delivered.length };
  } catch (e) {}
}

function onTip() {
  uni.showToast({ title: '功能即将上线', icon: 'none' });
}

function onLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout();
        permStore.clear();
        uni.reLaunch({ url: '/pages/login/index' });
      }
    },
  });
}

onShow(() => loadStats());
</script>

<style scoped>
.profile-page { min-height: 100vh; background: #f5f5f5; }
.user-info { display: flex; align-items: center; padding: 48rpx 24rpx; background: #0088ff; color: #fff; }
.avatar { font-size: 80rpx; margin-right: 24rpx; }
.info .name { font-size: 36rpx; font-weight: bold; }
.info .role { font-size: 24rpx; opacity: 0.8; margin-top: 8rpx; }
.kpi { display: flex; background: #fff; padding: 24rpx; }
.kpi-item { flex: 1; text-align: center; }
.kpi-item .value { font-size: 40rpx; font-weight: bold; color: #0088ff; }
.kpi-item .label { font-size: 24rpx; color: #666; margin-top: 4rpx; }
.menu { margin-top: 16rpx; background: #fff; }
.menu-item { padding: 24rpx; border-bottom: 1rpx solid #f0f0f0; font-size: 28rpx; }
.menu-item.logout { color: #ff0000; }
</style>
```

- [ ] **Step 2: 创建扫码占位页**

```vue
<!-- e:\code\vadmin\src\pages\scan\index.vue -->
<template>
  <view class="scan-page">
    <view class="placeholder">
      <view class="icon">📷</view>
      <view class="text">扫码中心</view>
      <view class="desc">即将上线</view>
    </view>
  </view>
</template>

<script setup lang="ts">
</script>

<style scoped>
.scan-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
.placeholder { text-align: center; }
.icon { font-size: 120rpx; }
.text { font-size: 36rpx; font-weight: bold; margin-top: 24rpx; }
.desc { font-size: 28rpx; color: #999; margin-top: 8rpx; }
</style>
```

- [ ] **Step 3: 创建 403 页**

```vue
<!-- e:\code\vadmin\src\pages\403\index.vue -->
<template>
  <view class="forbidden-page">
    <view class="icon">🔒</view>
    <view class="text">无权限访问</view>
    <button class="btn" @click="goHome">返回工作台</button>
  </view>
</template>

<script setup lang="ts">
function goHome() {
  uni.reLaunch({ url: '/pages/home/index' });
}
</script>

<style scoped>
.forbidden-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f5f5f5; }
.icon { font-size: 120rpx; }
.text { font-size: 32rpx; color: #666; margin: 24rpx 0; }
.btn { background: #0088ff; color: #fff; }
</style>
```

- [ ] **Step 4: 创建 404 页**

```vue
<!-- e:\code\vadmin\src\pages\404\index.vue -->
<template>
  <view class="not-found-page">
    <view class="icon">🔍</view>
    <view class="text">页面不存在</view>
    <button class="btn" @click="goHome">返回工作台</button>
  </view>
</template>

<script setup lang="ts">
function goHome() {
  uni.reLaunch({ url: '/pages/home/index' });
}
</script>

<style scoped>
.not-found-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f5f5f5; }
.icon { font-size: 120rpx; }
.text { font-size: 32rpx; color: #666; margin: 24rpx 0; }
.btn { background: #0088ff; color: #fff; }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/profile src/pages/scan src/pages/403 src/pages/404
git commit -m "feat(vadmin): implement profile, scan placeholder, 403 and 404 pages"
```

---

## Task 14: 创建 6 个占位模块

**Files:**
- Create: `e:\code\vadmin\src\pkg-sales\pages\placeholder.vue`
- Create: `e:\code\vadmin\src\pkg-inventory\pages\placeholder.vue`
- Create: `e:\code\vadmin\src\pkg-cs\pages\placeholder.vue`
- Create: `e:\code\vadmin\src\pkg-ops\pages\placeholder.vue`
- Create: `e:\code\vadmin\src\pkg-admin\pages\placeholder.vue`
- Create: `e:\code\vadmin\src\pkg-common\pages\message\placeholder.vue`
- Create: `e:\code\vadmin\src\pkg-common\pages\settings\placeholder.vue`
- Create: `e:\code\vadmin\src\pkg-common\pages\help\placeholder.vue`
- Create: `e:\code\vadmin\src\components\ModulePlaceholder.vue`

- [ ] **Step 1: 创建通用 ModulePlaceholder 组件**

```vue
<!-- e:\code\vadmin\src\components\ModulePlaceholder.vue -->
<template>
  <view class="placeholder" @click="onTip">
    <view class="icon">{{ icon }}</view>
    <view class="name">{{ name }}</view>
    <view class="badge">即将上线</view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ icon: string; name: string }>();

function onTip() {
  uni.showToast({ title: '即将上线，敬请期待', icon: 'none' });
}
</script>

<style scoped>
.placeholder { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f5f5f5; }
.icon { font-size: 120rpx; }
.name { font-size: 36rpx; font-weight: bold; margin-top: 24rpx; }
.badge { font-size: 24rpx; color: #999; margin-top: 8rpx; }
</style>
```

- [ ] **Step 2: 创建 6 个模块的 placeholder.vue**

每个文件内容相同（仅 icon/name 不同）：

```vue
<!-- e:\code\vadmin\src\pkg-sales\pages\placeholder.vue -->
<template>
  <ModulePlaceholder icon="📝" name="销售模块" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

```vue
<!-- e:\code\vadmin\src\pkg-inventory\pages\placeholder.vue -->
<template>
  <ModulePlaceholder icon="📊" name="调库模块" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

```vue
<!-- e:\code\vadmin\src\pkg-cs\pages\placeholder.vue -->
<template>
  <ModulePlaceholder icon="🎧" name="客服模块" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

```vue
<!-- e:\code\vadmin\src\pkg-ops\pages\placeholder.vue -->
<template>
  <ModulePlaceholder icon="🎁" name="运营模块" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

```vue
<!-- e:\code\vadmin\src\pkg-admin\pages\placeholder.vue -->
<template>
  <ModulePlaceholder icon="⚙️" name="管理模块" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

```vue
<!-- e:\code\vadmin\src\pkg-common\pages\message\placeholder.vue -->
<template>
  <ModulePlaceholder icon="🔔" name="消息中心" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

```vue
<!-- e:\code\vadmin\src\pkg-common\pages\settings\placeholder.vue -->
<template>
  <ModulePlaceholder icon="⚙️" name="系统设置" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

```vue
<!-- e:\code\vadmin\src\pkg-common\pages\help\placeholder.vue -->
<template>
  <ModulePlaceholder icon="📖" name="帮助中心" />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/pkg-sales src/pkg-inventory src/pkg-cs src/pkg-ops src/pkg-admin src/pkg-common src/components/ModulePlaceholder.vue
git commit -m "feat(vadmin): add placeholder pages for 6 future modules"
```

---

## Task 15: 端到端验收

**Files:** 无新文件，验证用

- [ ] **Step 1: 启动 vendure 后端**

```bash
cd e:\code\vendure\packages\dev-server
npm run start
```

Expected: 启动无错误，日志显示 `[delivery-plugin] Synced 7 roles, 25 permissions`

- [ ] **Step 2: 启动 vadmin 前端**

```bash
cd e:\code\vadmin
npm run dev:h5
```

- [ ] **Step 3: 在 PC Admin UI 创建送货员账号**

1. 打开 http://localhost:3000/admin
2. 用 super-admin 登录
3. Settings → Administrators → 新建
4. 填入账号 `delivery1`，密码 `test1234`
5. Roles 选择 `delivery-staff`
6. 保存

- [ ] **Step 4: 用 vshop 下单并支付**

1. 打开 vshop http://localhost:5180
2. 加商品到购物车
3. 下单并完成支付
4. 查看 vendure 日志，应看到 `[delivery-plugin] Auto-assigned order XXX to staff YYY`

> 注意：自动派单需要有 delivery-staff 角色的 administrator 存在，否则会跳过并 warn

- [ ] **Step 5: 用送货员账号登录 vadmin**

1. 打开 http://localhost:5173
2. 用 `delivery1 / test1234` 登录
3. 工作台应显示：
   - 顶部 "欢迎你，delivery1 [送货员]"
   - KPI 卡片显示待取货 1
   - 九宫格显示任务/签收/异常/扫码等
   - 待办列表显示该订单

- [ ] **Step 6: 测试送货全流程**

1. 点"任务"进列表页，应看到待取货订单
2. 点订单进详情页
3. 点"开始配送"，状态变为配送中
4. 点"已送达，去签收"
5. 拍照 1-3 张，写备注，提交
6. 应回到列表页，订单移到"已完成"
7. 验证 vendure 后端 Fulfillment 状态从 Shipped → Delivered

- [ ] **Step 7: 测试异常上报**

1. 重新用 vshop 下单并支付
2. vadmin 中开始配送
3. 点"上报异常"
4. 选异常类型，拍照，提交
5. 订单状态应变为"异常"

- [ ] **Step 8: 测试权限控制**

1. 用 super-admin 登录 vadmin
2. 工作台应显示更多快捷入口（管理模块等）
3. KPI 显示今日订单、异常待处理、销售额
4. 用送货员登录，看不到管理模块入口

- [ ] **Step 9: 测试未实现模块占位**

1. 工作台九宫格中点"开单"（灰色）
2. 应 toast "即将上线，敬请期待"

- [ ] **Step 10: Commit 验收通过**

```bash
cd e:\code\vadmin
git add .
git commit --allow-empty -m "chore: end-to-end acceptance passed for vadmin MVP"
```

---

## Task 1 实施修正记录

subagent 在 Task 1 中发现并修正了 PermissionDefinition API 用法：

**原 plan 写法（错误）：**
```typescript
export const deliveryPermissions = new PermissionDefinition({
  permissions: [{ name: 'DeliverOrder', description: '...' }, ...],
});
// 用法：@Allow(deliveryPermissions.values.DeliverOrder)
```

**实际正确写法（vendure 3.6）：**
```typescript
// 常量对象用于 @Allow 装饰器
export const DeliveryPermissions = {
  DeliverOrder: 'DeliverOrder',
  // ... 24 个权限名
} as const;

// PermissionDefinition 实例数组用于注册
export const deliveryPermissionDefinitions: PermissionDefinition[] = Object.entries(DeliveryPermissions).map(
  ([key, name]) => new PermissionDefinition({ name, description: PERMISSION_DESCRIPTIONS[key] }),
);
```

**后续 Task 4/5 的 @Allow 用法修正：**
- 原：`@Allow(deliveryPermissions.values.DeliverOrder)`
- 改：`@Allow(DeliveryPermissions.DeliverOrder)`

参考：`e:\code\vendure\packages\cjk-plugin\src\pickup\pickup-permissions.ts`

## 自审清单

**Spec 覆盖检查：**
- ✅ 7+1 角色 + 25 Permission + Role 同步（Task 1, 3）
- ✅ Order customFields + Address customFields（Task 2）
- ✅ myPermissions resolver（Task 4）
- ✅ delivery resolver CRUD（Task 5）
- ✅ 自动派单事件订阅（Task 6）
- ✅ vadmin 工程初始化（Task 7）
- ✅ permission store + v-perm + 路由守卫（Task 8）
- ✅ shortcuts + kpi + authGuard 配置（Task 9）
- ✅ 工作台首页（Task 10）
- ✅ 登录页（Task 11）
- ✅ 送货 4 页面（Task 12）
- ✅ 个人中心 + 403/404 + 扫码占位（Task 13）
- ✅ 6 个模块占位（Task 14）
- ✅ 端到端验收（Task 15）

**已知简化（与 spec 差异）：**
- Task 6 自动派单未在派单时创建 Fulfillment（spec 4.6 要求），MVP 简化，第二期完善
- Task 12 签收照片用 base64 提交（spec 5.2.1 允许的退化方案）
- Task 3 onBootstrap 中 ctx 获取可能需要调整，参考其他插件实现
