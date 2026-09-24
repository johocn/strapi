# 产品级配送与支付方案设计

- **创建日期**：2026-08-13
- **状态**：待实现
- **范围**：在现有 Vendure 多租户（Channel）配送/支付方案基础上，实现产品级别的配送档案（ShippingProfile）和支付档案（PaymentProfile），支持商品级配送方式限制、自提功能限制、支付方式限制和分期方案。

## 0. 租户级与产品级的关系

### 0.1 分层架构

```
┌──────────────────────────────────────────────────────────────┐
│                    Channel（租户）                             │
│                                                              │
│  ┌─ 租户级配送/支付池 ───────────────────────────────────┐    │
│  │  ShippingMethod A   ShippingMethod B   PaymentMethod X │    │
│  │  (顺丰冷链)           (中通快递)           (支付宝)       │    │
│  │  ShippingMethod C   PaymentMethod Y   PaymentMethod Z │    │
│  │  (门店自提)           (微信支付)           (货到付款)      │    │
│  └───────────────────────────────────────────────────────┘    │
│           ↑ 定义"租户有什么"                                   │
│                                                              │
│  ┌─ 产品级 Profile（从池中选子集） ────────────────────────┐    │
│  │  ShippingProfile "冷链" → 选中 {A, C}                    │    │
│  │  ShippingProfile "标准" → 选中 {B, C}                    │    │
│  │  PaymentProfile "线上" → 选中 {X, Y}                    │    │
│  │  PaymentProfile "到付" → 选中 {Z}                       │    │
│  │                                                          │    │
│  │  商品A（生鲜）→ 冷链档案 + 线上档案                        │    │
│  │  商品B（日用品）→ 标准档案 + 线上档案                      │    │
│  │  商品C（大件）→ 标准档案 + 到付档案                        │    │
│  └────────────────────────────────────────────────────────┘   │
│           ↑ 定义"产品能用什么"                                  │
│                                                              │
│  购物车交集：商品A+商品B → 配送方式交集 = {B,C}∩{A,C} = {C}   │
│  结果：仅门店自提可用                                          │
└──────────────────────────────────────────────────────────────┘
```

### 0.2 职责边界

| 层级 | 定义 | 示例 |
|------|------|------|
| **租户级（Channel）** | 定义"该租户有什么" | 配送方式池、支付方式池、支付凭证（AppKey/Secret） |
| **产品级（Profile）** | 从池中选子集，定义"该产品能用什么" | 配送档案选子集、支付档案选子集+分期配置 |
| **购物车级（交集）** | 实时计算，定义"当前订单能用什么" | 多商品 Profile 交集过滤 |

### 0.3 与现有配置的关系

- **ShippingTemplate**（现有）：配送方式模板，用于快速创建 ShippingMethod，与 Profile 正交
- **PayConfig**（现有）：Channel 自定义字段，存放加密的支付凭证（支付宝/微信/抖音 AppKey）
- **ShippingProfile**（新增）：从 Channel 的 ShippingMethod 池中选子集
- **PaymentProfile**（新增）：从 Channel 的 PaymentMethod 池中选子集，附加分期配置

**Profile 只做可见性筛选，不改变 ShippingMethod/PaymentMethod 的运行逻辑。**

## 1. 背景与目标

### 1.1 现状

当前 Vendure 的配送方式（ShippingMethod）和支付方式（PaymentMethod）是 **Channel 级别** 的，即一个租户下所有商品共享相同的配送和支付选项。无法实现：
- 生鲜商品只能走冷链配送，普通商品走快递
- 虚拟商品仅支持在线支付，不支持货到付款
- 高价商品支持花呗分期，低价商品仅全额支付

### 1.2 目标

- 引入 **ShippingProfile（配送档案）** 和 **PaymentProfile（支付档案）** 概念
- 商品可分配到一个配送档案和一个支付档案
- 配送档案定义该商品可用的配送方式（含自提方式）
- 支付档案定义该商品可用的支付方式及分期选项
- 购物车结算时，可用配送/支付方式取所有商品 Profile 的交集

## 2. 核心实体

### 2.1 ShippingProfile

```typescript
@Entity()
class ShippingProfile extends VendureEntity implements ChannelAware {
    name: string;                    // 档案名称，如"生鲜冷链方案"
    description: string;             // 描述
    code: string;                    // 唯一编码
    isGlobal: boolean;               // 全局模板（超级管理员维护）
    ownerChannelId: ID | null;       // 所属租户 ChannelId
    channels: Channel[];             // ChannelAware

    // 关联的配送方式（含自提方式）
    shippingMethods: ShippingMethod[];  // ManyToMany

    // 满额包邮门槛（分，0=不启用），覆盖单个配送方式的配置
    freeShippingThreshold: number | null;
}
```

### 2.2 PaymentProfile

```typescript
@Entity()
class PaymentProfile extends VendureEntity implements ChannelAware {
    name: string;                    // 档案名称，如"在线支付方案"
    description: string;
    code: string;
    isGlobal: boolean;
    ownerChannelId: ID | null;
    channels: Channel[];

    // 关联的支付方式
    paymentMethods: PaymentMethod[];  // ManyToMany

    // 分期选项（JSON）
    // { alipay: { huabei: { periods: [3,6,12], feeBearer: 'merchant'|'user' } } }
    installmentOptions: Record<string, any> | null;
}
```

### 2.3 ProductVariant 扩展

在现有 ProductVariant 自定义字段上新增：

```typescript
// cjk-plugin product-variant-custom-fields.ts 扩展
{
    name: 'shippingProfileId',
    type: 'string',
    nullable: true,
    // null = 使用 default 档案
}
{
    name: 'paymentProfileId',
    type: 'string',
    nullable: true,
}
```

### 2.4 Product 级 Profile（可选继承）

Product 级别也添加 Profile 字段，作为 Variant 的默认值：

```typescript
// Product 自定义字段
{
    name: 'shippingProfileId',
    type: 'string',
    nullable: true,
}
{
    name: 'paymentProfileId',
    type: 'string',
    nullable: true,
}
```

**继承规则：** Variant 未设置时继承 Product 的 Profile，Product 也未设置时使用 default 档案。

## 3. 默认档案

每个 Channel 自动创建两个默认档案：

- `default-shipping`：允许所有该 Channel 可用的配送方式（含自提方式）
- `default-payment`：允许所有该 Channel 可用的支付方式，无分期选项

未分配 Profile 的商品自动归属 default 档案，确保向后兼容。

### 3.1 默认档案自动创建

```typescript
// 监听 Channel 创建事件，自动创建默认 Profile
// 在 onApplicationBootstrap 注册 ChannelEvent 订阅
@OnEvent(ChannelEvent)
async handleChannelCreated(event: ChannelEvent) {
    if (event.type === 'created') {
        await this.createDefaultProfiles(event.ctx, event.entity);
    }
}
```

### 3.2 Profile 删除保护

删除 Profile 时校验是否有商品引用，被引用的 Profile 不可删除，需先重新分配商品：

```typescript
async delete(ctx: RequestContext, id: ID): Promise<void> {
    const count = await this.connection
        .getRepository(ctx, ProductVariant)
        .count({ where: { customFields: { shippingProfileId: id } } });
    if (count > 0) {
        throw new UserInputError(`有 ${count} 个商品引用此档案，请先重新分配`);
    }
    // ... 执行删除
}
```

### 3.3 Profile 空集校验

创建/更新 Profile 时，校验 `shippingMethods`/`paymentMethods` 至少有一个元素：

```typescript
async create(ctx, input) {
    if (!input.shippingMethodIds?.length) {
        throw new UserInputError('配送档案至少需要选择一种配送方式');
    }
    // ...
}
```

### 3.4 批量分配 Profile

```graphql
extend type Mutation {
    assignShippingProfile(productVariantIds: [ID!]!, profileId: ID!): Boolean!
    assignPaymentProfile(productVariantIds: [ID!]!, profileId: ID!): Boolean!
}
```

### 3.5 跨租户 Profile 复制

支持 `isGlobal` 标记的 Profile 对所有租户可见但不可编辑（类似现有 ShippingTemplate 的全局模式）。超管维护全局 Profile，租户可引用：

- 超管创建 `isGlobal=true` 的 Profile，不绑定 Channel
- 租户在 Admin UI 中可见全局 Profile 列表，可勾选"使用此全局 Profile"
- 租户勾选后，该 Profile 的关联关系复制到租户 Channel 的可见范围

## 4. 数据流

### 4.1 配送方式选择

```
用户打开结算页 → 请求可用配送方式：

1. 遍历 Order 所有 OrderLine
2. 获取每个 ProductVariant 的 shippingProfileId
3. 收集所有 Profile 的 shippingMethods 集合
4. 取交集 → 得到最终可用配送方式列表
5. 如果某个 Profile 的 freeShippingThreshold 满足条件，标记对应方式为免邮
6. 返回给前端展示

用户选择配送方式 → 校验：

1. 获取所选方式的 ID
2. 检查该方式是否在步骤 4 的交集内
3. 不在 → 返回错误：该配送方式不适用于当前购物车商品
```

### 4.2 支付方式选择

```
用户选择支付方式 → 请求可用支付方式：

1. 遍历 Order 所有 OrderLine
2. 获取每个 ProductVariant 的 paymentProfileId
3. 收集所有 Profile 的 paymentMethods 集合
4. 取交集 → 得到最终可用支付方式列表
5. 分期选项：取所有 Profile 的 installmentOptions 交集
   - 花呗期数交集：如 A 支持 [3,6,12]，B 支持 [6,12] → 结果 [6,12]
   - 手续费承担方：以最严格为准
6. 返回给前端展示
```

### 4.3 自提方式集成

自提方式（门店自提、自提点、企业职工自提）在系统中是普通的 ShippingMethod，ShippingProfile 通过 ManyToMany 关系控制哪些自提方式可用。

- 自提方式的 Checker（如距离校验、企业绑定校验）**独立运行**，Profile 只做可见性控制
- 一个 Profile 可以同时勾选快递配送和自提方式

## 5. 订单结算流程改动

### 5.0 加购时提前拦截（推荐策略）

在 `addItemToOrder` 时检测新商品与购物车现有商品的 Profile 兼容性，提前提示用户，避免到结算页才发现冲突：

```typescript
async function validateProfileCompatibility(order, newVariantId) {
    const existingProfileIds = getDistinctProfileIds(order.lines, 'shipping');
    const newVariant = await getVariant(newVariantId);
    const newProfileId = newVariant.customFields.shippingProfileId ?? 'default-shipping';

    if (existingProfileIds.length > 0) {
        // 计算现有商品配送方式的交集
        const existingIntersection = await getIntersectedShippingMethods(existingProfileIds);
        // 计算加入新商品后的交集
        const newIntersection = await getIntersectedShippingMethods([...existingProfileIds, newProfileId]);

        if (newIntersection.length === 0) {
            throw new UserInputError(
                '该商品的配送方式与购物车中现有商品不兼容，请分开下单',
                { code: 'PROFILE_INCOMPATIBLE' },
            );
        }
        if (newIntersection.length < existingIntersection.length) {
            // 兼容但配送选项减少，仅警告，不阻止加购
            // 可返回 warning 给前端展示
        }
    }
}
```

### 5.1 setShippingMethod 增强

```typescript
// 在 setShippingMethod 时增加 Profile 校验
async function validateShippingMethodEligibility(order, methodId) {
    const profileIds = getDistinctProfileIds(order.lines, 'shipping');
    const allowedMethods = await getIntersectedShippingMethods(profileIds);
    if (!allowedMethods.includes(methodId)) {
        throw new Error('该配送方式不支持当前购物车中的部分商品');
    }
}
```

### 5.2 addPaymentToOrder 增强

```typescript
// 结算时校验支付方式
async function validatePaymentMethodEligibility(order, methodCode) {
    const profileIds = getDistinctProfileIds(order.lines, 'payment');
    const allowedMethods = await getIntersectedPaymentMethods(profileIds);
    if (!allowedMethods.includes(methodCode)) {
        throw new Error('该支付方式不支持当前购物车中的部分商品', { code: 'PROFILE_INCOMPATIBLE' });
    }
}
```

### 5.3 Shop API 查询扩展

```typescript
// 查询可用配送方式（根据当前购物车商品）
extend type Query {
    eligibleShippingMethods: [ShippingMethod!]!
    eligiblePaymentMethods: [PaymentMethod!]!
    eligibleInstallmentOptions: JSON
}
```

## 6. 中国本地化方案

### 6.1 配送

| 方案 | 说明 | 集成方式 |
|------|------|---------|
| 快递100 | 物流查询/电子面单 | 已集成 logistics-plugin |
| 顺丰API | 企业级下单/轨迹 | 通过 logistics-plugin 扩展 |
| 菜鸟物流 | 电子面单/物流详情 | 新增插件 |
| 京东物流 | 企业级配送 | 新增插件 |

### 6.2 支付分期

| 方案 | 说明 | 集成方式 |
|------|------|---------|
| 花呗分期 | 支付宝扩展参数 `extendParams.hbFqNum`（期数）`hbFqSellerPercent`（卖家承担比例） | 扩展 alipay-plugin |
| 微信分付 | 微信支付分期扩展参数 | 扩展 wechatpay-plugin |
| 信用卡分期 | 通过银行通道或第三方聚合 | 新增插件 |

**花呗分期支付参数示例：**

```typescript
// 在 PaymentMethodHandler.createPayment 中传递
{
    extendParams: {
        hbFqNum: '6',                // 分期期数（从 Profile 配置获取）
        hbFqSellerPercent: '0',      // 卖家承担手续费比例（0=用户承担，100=商户承担）
    }
}
```

### 5.4 订单 Profile 快照

下单时，将结算时使用的 Profile 信息快照到 Order 的 `customFields`，用于售后追溯：

```typescript
// Order 自定义字段扩展
{
    name: 'shippingProfileSnapshot',
    type: 'json',
    nullable: true,
    // 存储: [{ variantId, profileId, profileName }]
}
{
    name: 'paymentProfileSnapshot',
    type: 'json',
    nullable: true,
}
```

### 5.5 freeShippingThreshold 优先级规则

**ShippingProfile 的 freeShippingThreshold 覆盖单个 ShippingMethod 的免费规则。**

当 Profile 设置了 `freeShippingThreshold`（>0）时：
- 订单金额达到该阈值 → 该 Profile 关联的所有配送方式免邮费
- 不计算各 ShippingMethod 自身的 Calculator 运费

当 Profile 未设置（null/0）时：
- 回退到各 ShippingMethod 的 Calculator 自行计算运费

## 6. 前端错误码

| 错误码 | 触发场景 | 前端展示 |
|--------|---------|---------|
| `PROFILE_INCOMPATIBLE` | 加购/结算时 Profile 交集为空 | "该商品配送方式与购物车不兼容，请分开下单" |
| `PROFILE_SHIPPING_METHOD_NOT_ALLOWED` | 选择的配送方式不在交集内 | "该配送方式不支持当前购物车中的部分商品" |
| `PROFILE_PAYMENT_METHOD_NOT_ALLOWED` | 选择的支付方式不在交集内 | "该支付方式不支持当前购物车中的部分商品" |

## 7. Admin UI 改动

| 页面 | 改动 |
|------|------|
| 配送档案管理 | 新增 CRUD 页面：名称、编码、可用配送方式（含自提）、满额包邮门槛 |
| 支付档案管理 | 新增 CRUD 页面：名称、编码、可用支付方式、分期选项配置 |
| 商品编辑页 | 新增下拉选择「配送档案」「支付档案」，默认=default |
| 变体编辑页 | 可覆盖父级 Product 的 Profile 设置 |

## 8. 与现有系统的边界

- **不动 cjk-plugin 现有功能**：ShippingTemplate、阶梯运费、自提 Checker 等保持独立
- **不动 alipay-plugin/wechatpay-plugin**：支付处理逻辑不变，只扩展支付参数
- **不动 logistics-plugin**：物流跟踪保持独立
- **不动 delivery-plugin**：配送管理模块保持独立
- **Profile 只做可见性控制**：不改变现有 ShippingMethod/PaymentMethod 的运行逻辑

## 9. 实现计划

### 第一期：基础架构

1. 新增 `ShippingProfile` 实体 + CRUD Service + Admin Resolver
2. 新增 `PaymentProfile` 实体 + CRUD Service + Admin Resolver
3. ProductVariant 自定义字段扩展（shippingProfileId, paymentProfileId）
4. Product 自定义字段扩展（shippingProfileId, paymentProfileId）
5. 默认档案自动创建逻辑（Channel 创建事件监听）
6. 存量数据迁移脚本（null → default Profile）
7. Profile 删除保护 + 空集校验
8. 批量分配 Profile API
9. 跨租户 Profile 复制（isGlobal 模式）

### 第二期：结算集成

1. `eligibleShippingMethods` Shop API 查询（Profile 交集计算）
2. `eligiblePaymentMethods` Shop API 查询（Profile 交集计算）
3. `eligibleInstallmentOptions` Shop API 查询
4. `addItemToOrder` 加购时 Profile 兼容性校验
5. `setShippingMethod` 增强校验
6. `addPaymentToOrder` 增强校验
7. Order Profile 快照（shippingProfileSnapshot, paymentProfileSnapshot）
8. freeShippingThreshold 优先级处理

### 第三期：Admin UI

1. 配送档案管理页面
2. 支付档案管理页面
3. 商品编辑页 Profile 选择器
4. 变体编辑页 Profile 覆盖
5. 批量分配 Profile 操作界面

### 第四期：分期支付集成

1. 花呗分期 - alipay-plugin 扩展（extendParams.hbFqNum / hbFqSellerPercent）
2. 微信支付分期 - wechatpay-plugin 扩展

## 10. 技术风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Profile 交集为空时无可用配送/支付方式 | 用户无法下单 | 加购时提前拦截（5.0），返回明确错误码 `PROFILE_INCOMPATIBLE` |
| 大量商品的 Profile 交集计算性能 | 结算页加载慢 | 缓存 Profile→ShippingMethod 映射，只在修改关联时清除缓存 |
| 分期参数传递到支付网关 | 分期不生效 | 在 PaymentMethodHandler 中统一处理分期参数透传 |
| 核心实体 ShippingMethod ManyToMany 关联 | 插件无法关联核心实体 | 验证 @ManyToMany(() => ShippingMethod) 在插件中是否可用，备选方案：用中间表手动维护 |
| 存量数据迁移不完整 | 部分商品无 Profile，结算异常 | bootstrap 时执行迁移脚本，将 null 统一更新为 default Profile |