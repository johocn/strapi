# 产品级配送与支付方案 - 部署与对接文档

> **适用版本：** Vendure 3.x + cjk-plugin
> **最后更新：** 2026-08-13

---

## 目录

1. [环境配置](#1-环境配置)
2. [Admin API 对接](#2-admin-api-对接)
3. [Shop API 对接](#3-shop-api-对接)
4. [前端集成指南](#4-前端集成指南)
5. [部署步骤](#5-部署步骤)

---

## 1. 环境配置

### 1.1 启用 Profile 功能

在 `cjk-plugin` 初始化配置中启用 Profile 模块：

```typescript
// packages/vendure-config.ts 或 vendure-config.ts
import { CjkPlugin } from '@vendure-local/cjk-plugin';

export const config: VendureConfig = {
    plugins: [
        CjkPlugin.init({
            profiles: {
                enabled: true, // 默认为 true
            },
            // 其他配置...
        }),
    ],
};
```

### 1.2 数据库迁移

Profile 功能使用 TypeORM 实体，无需手动迁移脚本。启动时自动创建以下表：

| 表名 | 说明 |
|------|------|
| `shipping_profile` | 配送档案主表 |
| `shipping_profile_shipping_methods_shipping_method` | 配送档案 ↔ 配送方式关联表 |
| `shipping_profile_channels_channel` | 配送档案 ↔ 渠道关联表 |
| `payment_profile` | 支付档案主表 |
| `payment_profile_payment_methods_payment_method` | 支付档案 ↔ 支付方式关联表 |
| `payment_profile_channels_channel` | 支付档案 ↔ 渠道关联表 |

### 1.3 自定义字段

启动时自动在 `product_variant` 和 `order` 表添加以下 JSONB 字段：

```sql
-- ProductVariant 自定义字段
ALTER TABLE product_variant ADD COLUMN "customFields" jsonb;
-- shippingProfileId, paymentProfileId 存储在 customFields 中

-- Order 自定义字段
ALTER TABLE order ADD COLUMN "customFields" jsonb;
-- shippingProfileSnapshot, paymentProfileSnapshot 存储在 customFields 中
```

### 1.4 存量数据迁移

启动时 `onApplicationBootstrap` 自动执行：

1. 为每个 Channel 创建默认配送档案（`default-shipping-{channelCode}`）
2. 为每个 Channel 创建默认支付档案（`default-payment-{channelCode}`）
3. 将 `shippingProfileId` 或 `paymentProfileId` 为 NULL 的 Variant 更新为默认档案

### 1.5 权限配置

| 权限名 | 说明 |
|--------|------|
| `ShippingProfileRead` | 查看配送档案（Admin API） |
| `ShippingProfileCreate` | 创建配送档案 |
| `ShippingProfileUpdate` | 更新配送档案 |
| `ShippingProfileDelete` | 删除配送档案 |
| `PaymentProfileRead` | 查看支付档案（Admin API） |
| `PaymentProfileCreate` | 创建支付档案 |
| `PaymentProfileUpdate` | 更新支付档案 |
| `PaymentProfileDelete` | 删除支付档案 |

---

## 2. Admin API 对接

### 2.1 配送档案管理

#### 查询列表

```graphql
query GetShippingProfiles($options: ListQueryOptions) {
    shippingProfiles(options: $options) {
        items {
            id
            name
            code
            description
            freeShippingThreshold
            isGlobal
            shippingMethods {
                id
                code
                name
            }
        }
        totalItems
    }
}
```

#### 查询单个

```graphql
query GetShippingProfile($id: ID!) {
    shippingProfile(id: $id) {
        id
        name
        code
        description
        freeShippingThreshold
        isGlobal
        shippingMethods {
            id
            code
            name
        }
    }
}
```

#### 创建

```graphql
mutation CreateShippingProfile($input: CreateShippingProfileInput!) {
    createShippingProfile(input: $input) {
        id
        name
    }
}
```

**Input：**

```json
{
    "input": {
        "name": "冷链配送",
        "code": "cold-chain",
        "description": "冷链商品专用配送方案",
        "freeShippingThreshold": 19900,
        "isGlobal": false,
        "shippingMethodIds": ["T_1", "T_3"]
    }
}
```

> `freeShippingThreshold` 单位为分（如 19900 = 199 元），null 表示使用各配送方式自身免邮规则。
> `shippingMethodIds` 不能为空数组。

#### 更新

```graphql
mutation UpdateShippingProfile($input: UpdateShippingProfileInput!) {
    updateShippingProfile(input: $input) {
        id
        name
    }
}
```

**Input：**

```json
{
    "input": {
        "id": "T_1",
        "name": "冷链配送（更新）",
        "shippingMethodIds": ["T_1", "T_2", "T_3"]
    }
}
```

#### 删除

```graphql
mutation DeleteShippingProfile($id: ID!) {
    deleteShippingProfile(id: $id)
}
```

> 如果存在商品 Variant 引用此档案，删除会失败并返回错误信息。

#### 批量分配 Variant

```graphql
mutation AssignShippingProfile($variantIds: [ID!]!, $profileId: ID!) {
    assignShippingProfile(variantIds: $variantIds, profileId: $profileId)
}
```

### 2.2 支付档案管理

#### 查询列表

```graphql
query GetPaymentProfiles($options: ListQueryOptions) {
    paymentProfiles(options: $options) {
        items {
            id
            name
            code
            description
            isGlobal
            installmentOptions
            paymentMethods {
                id
                code
                name
            }
        }
        totalItems
    }
}
```

#### 创建

```graphql
mutation CreatePaymentProfile($input: CreatePaymentProfileInput!) {
    createPaymentProfile(input: $input) {
        id
        name
    }
}
```

**Input：**

```json
{
    "input": {
        "name": "线上支付",
        "code": "online-payment",
        "description": "在线支付方式",
        "isGlobal": false,
        "paymentMethodIds": ["T_1", "T_2"],
        "installmentOptions": {
            "alipay": {
                "huabei": {
                    "periods": [3, 6, 12]
                }
            }
        }
    }
}
```

> `installmentOptions` 是可选的 JSON 对象，格式为 `{ provider: { huabei: { periods: number[] } } }`。
> `paymentMethodIds` 不能为空数组。

#### 更新 / 删除 / 批量分配

与配送档案相同的模式，使用 `updatePaymentProfile`、`deletePaymentProfile`、`assignPaymentProfile`。

---

## 3. Shop API 对接

### 3.1 配送档案兼容性查询

#### 检查配送兼容性

```graphql
query CheckShippingProfileCompatibility($profileIds: [ID!]!) {
    checkShippingProfileCompatibility(profileIds: $profileIds) {
        compatible
        intersectedCount
    }
}
```

**返回：**

```json
{
    "data": {
        "checkShippingProfileCompatibility": {
            "compatible": true,
            "intersectedCount": 3
        }
    }
}
```

> `compatible: false` 表示购物车中商品 Profile 完全没有交集，需要分开下单。

#### 获取交集配送方式

```graphql
query GetEligibleShippingMethods($profileIds: [ID!]!) {
    eligibleShippingMethodsByProfile(profileIds: $profileIds) {
        id
        code
        name
        description
        price
        priceWithTax
    }
}
```

### 3.2 支付档案兼容性查询

#### 检查支付兼容性

```graphql
query CheckPaymentProfileCompatibility($profileIds: [ID!]!) {
    checkPaymentProfileCompatibility(profileIds: $profileIds) {
        compatible
        intersectedCount
    }
}
```

#### 获取交集支付方式

```graphql
query GetEligiblePaymentMethods($profileIds: [ID!]!) {
    eligiblePaymentMethodsByProfile(profileIds: $profileIds) {
        id
        code
        name
        description
    }
}
```

#### 获取交集分期选项

```graphql
query GetEligibleInstallmentOptions($profileIds: [ID!]!) {
    eligibleInstallmentOptions(profileIds: $profileIds)
}
```

**返回示例：**

```json
{
    "data": {
        "eligibleInstallmentOptions": {
            "alipay": {
                "huabei": {
                    "periods": [3, 6]
                }
            }
        }
    }
}
```

> 如果所有 Profile 都没有分期配置，或期数无交集，返回 `null`。

---

## 4. 前端集成指南

### 4.1 标准结算流程

```
1. 用户加购商品 → addItemToOrder
2. 前端收集所有商品 Variant 的 shippingProfileId / paymentProfileId
3. 调用 checkShippingProfileCompatibility / checkPaymentProfileCompatibility
   └─ compatible=false → 提示"购物车商品配送方案不兼容，请分开下单"
4. 调用 eligibleShippingMethodsByProfile → 展示可用配送方式
5. 调用 eligiblePaymentMethodsByProfile → 展示可用支付方式
6. 用户选择配送方式 → setShippingMethod
7. 用户选择支付方式 → addPaymentToOrder
8. 如果选择支付宝且存在分期选项，展示分期期数选择
9. 用户选择分期期数 → 传入 metadata.installmentPeriod
```

### 4.2 前端 Profile ID 获取

从 `order.lines` 中提取 Profile ID：

```typescript
// 获取订单中所有使用的 Profile ID
function getOrderProfileIds(order: any) {
    const shippingProfileIds = new Set<string>();
    const paymentProfileIds = new Set<string>();

    for (const line of order.lines) {
        const variant = line.productVariant;
        if (variant?.customFields?.shippingProfileId) {
            shippingProfileIds.add(variant.customFields.shippingProfileId);
        }
        if (variant?.customFields?.paymentProfileId) {
            paymentProfileIds.add(variant.customFields.paymentProfileId);
        }
    }

    return {
        shippingProfileIds: [...shippingProfileIds],
        paymentProfileIds: [...paymentProfileIds],
    };
}
```

### 4.3 加购时兼容性检查（推荐）

```typescript
// 在每次 addItemToOrder 成功后调用
async function checkCartCompatibility(order: any) {
    const { shippingProfileIds, paymentProfileIds } = getOrderProfileIds(order);

    // 只有一种 Profile 时无需检查
    if (shippingProfileIds.length <= 1 && paymentProfileIds.length <= 1) {
        return { shippingCompatible: true, paymentCompatible: true };
    }

    const [shippingResult, paymentResult] = await Promise.all([
        api.query(CHECK_SHIPPING_COMPATIBILITY, { profileIds: shippingProfileIds }),
        api.query(CHECK_PAYMENT_COMPATIBILITY, { profileIds: paymentProfileIds }),
    ]);

    const shippingCompatible = shippingResult.checkShippingProfileCompatibility.compatible;
    const paymentCompatible = paymentResult.checkPaymentProfileCompatibility.compatible;

    if (!shippingCompatible) {
        showWarning('购物车中的商品配送方案不兼容，请分开下单');
    }
    if (!paymentCompatible) {
        showWarning('购物车中的商品支付方案不兼容，请分开下单');
    }

    return { shippingCompatible, paymentCompatible };
}
```

### 4.4 分期参数传递

```typescript
// 用户选择支付宝支付并选择分期时
const selectedPeriod = 6; // 用户选择的期数

// 调用 addPaymentToOrder 时传入 metadata
const result = await api.mutate(ADD_PAYMENT_TO_ORDER, {
    input: {
        method: 'alipay-pay',
        metadata: {
            // 前端透传参数，会在 Shop API 的 Payment.metadata.public 中返回
            public: {
                installmentPeriod: selectedPeriod,
            },
        },
    },
});
```

### 4.5 订单快照

订单结算后，`order.customFields` 中会自动写入 Profile 快照：

```json
{
    "shippingProfileSnapshot": {
        "T_1": "冷链配送"
    },
    "paymentProfileSnapshot": {
        "T_1": "线上支付"
    }
}
```

> 快照字段为 `text` 类型，存储 JSON 序列化后的字符串。前端需自行 `JSON.parse`。

### 4.6 商品编辑时选择 Profile

在商品编辑页面，需要提供 Profile 选择器：

```graphql
# 获取当前 Channel 可用的配送档案
query GetAvailableShippingProfiles {
    shippingProfiles(options: { take: 100 }) {
        items {
            id
            name
            code
        }
    }
}
```

使用 `assignShippingProfile` / `assignPaymentProfile` 批量分配。

---

## 5. 部署步骤

### 5.1 构建

```bash
# 构建 cjk-plugin
cd packages/cjk-plugin
npm run build

# 构建 alipay-plugin（如果修改了）
cd ../alipay-plugin
npm run build

# 构建 wechatpay-plugin（如果修改了）
cd ../wechatpay-plugin
npm run build

# 构建主应用
cd ../..
npm run build
```

### 5.2 启动

```bash
npm run start
```

### 5.3 首次启动验证

启动后检查以下项目：

1. **控制台日志** - 确认无错误日志，特别是 `ensureDefaultProfiles` 和 `migrateExistingVariants`
2. **数据库表** - 确认 `shipping_profile` 和 `payment_profile` 表已创建
3. **默认档案** - 确认每个 Channel 已自动创建 `default-shipping-{code}` 和 `default-payment-{code}` 档案
4. **Admin UI** - 确认设置菜单中出现"配送档案"和"支付档案"菜单项
5. **Shop API** - 确认新 Query 可用

### 5.4 回滚

如需要回滚，可执行：

```sql
-- 删除新增表
DROP TABLE IF EXISTS shipping_profile_channels_channel CASCADE;
DROP TABLE IF EXISTS shipping_profile_shipping_methods_shipping_method CASCADE;
DROP TABLE IF EXISTS shipping_profile CASCADE;
DROP TABLE IF EXISTS payment_profile_channels_channel CASCADE;
DROP TABLE IF EXISTS payment_profile_payment_methods_payment_method CASCADE;
DROP TABLE IF EXISTS payment_profile CASCADE;
```

然后在 `packages/vendure-config.ts` 中设置 `profiles: { enabled: false }` 重启应用。

### 5.5 注意事项

| 注意点 | 说明 |
|--------|------|
| JSONB 依赖 | 数据库需支持 JSONB（PostgreSQL 9.4+），MySQL/MariaDB 需调整 SQL |
| 存量数据迁移 | 首次启动会自动将 NULL 的 Variant 更新为默认档案，大表（>10万 Variant）建议手动执行迁移 |
| 分期支付 | 仅支付宝花呗分期已实现，微信支付分付需商户开通后自行对接 |
| 交集为空 | 前端务必在加购后检查兼容性，避免用户到结算页才发现无可用方式 |
| 权限配置 | 确保 Admin 角色已分配 `ShippingProfile` 和 `PaymentProfile` 权限 |