# 产品级配送与支付方案 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现产品级别的配送档案（ShippingProfile）和支付档案（PaymentProfile），支持商品级配送方式/支付方式限制和分期方案

**Architecture:** 在 cjk-plugin 中新增 ShippingProfile 和 PaymentProfile 实体，通过 ManyToMany 关联到核心的 ShippingMethod/PaymentMethod；ProductVariant 通过自定义字段关联 Profile；购物车结算时取所有商品 Profile 的配送/支付方式交集过滤

**Tech Stack:** Vendure (NestJS, TypeORM, GraphQL), cjk-plugin, alipay-plugin, wechatpay-plugin

---

## 文件变更清单

### 新增文件

| 文件 | 职责 |
|------|------|
| `packages/cjk-plugin/src/shipping/shipping-profile.entity.ts` | ShippingProfile 实体定义 |
| `packages/cjk-plugin/src/shipping/shipping-profile.service.ts` | ShippingProfile CRUD + 交集计算 + 批量分配 |
| `packages/cjk-plugin/src/shipping/shipping-profile-admin.resolver.ts` | 配送档案 Admin GraphQL API |
| `packages/cjk-plugin/src/shipping/shipping-profile-permissions.ts` | 配送档案权限定义 |
| `packages/cjk-plugin/src/shipping/shipping-profile-shop.resolver.ts` | 配送档案 Shop API（eligibleShippingMethods 过滤） |
| `packages/cjk-plugin/src/payment/payment-profile.entity.ts` | PaymentProfile 实体定义 |
| `packages/cjk-plugin/src/payment/payment-profile.service.ts` | PaymentProfile CRUD + 交集计算 + 批量分配 |
| `packages/cjk-plugin/src/payment/payment-profile-admin.resolver.ts` | 支付档案 Admin GraphQL API |
| `packages/cjk-plugin/src/payment/payment-profile-permissions.ts` | 支付档案权限定义 |
| `packages/cjk-plugin/src/payment/payment-profile-shop.resolver.ts` | 支付档案 Shop API（eligiblePaymentMethods 过滤） |

### 修改文件

| 文件 | 改动 |
|------|------|
| `packages/cjk-plugin/src/shipping/product-variant-custom-fields.ts` | 新增 shippingProfileId, paymentProfileId 自定义字段 |
| `packages/cjk-plugin/src/order/order-custom-fields.ts` | 新增 shippingProfileSnapshot, paymentProfileSnapshot 快照字段 |
| `packages/cjk-plugin/src/plugin.ts` | 注册新实体、Service、Resolver、权限、自定义字段 |
| `packages/cjk-plugin/src/index.ts` | 导出新模块 |
| `packages/cjk-plugin/src/constants.ts` | 新增 loggerCtx 常量 |
| `packages/alipay-plugin/src/alipay-handler.ts` | 可扩展：花呗分期参数支持 |
| `packages/wechatpay-plugin/src/wechatpay-handler.ts` | 可扩展：微信支付分期参数支持 |

---

## Phase 1: 基础架构 ✅

### Task 1.1: ShippingProfile 实体 ✅

**Files:**
- Create: `packages/cjk-plugin/src/shipping/shipping-profile.entity.ts`
- Create: `packages/cjk-plugin/src/shipping/shipping-profile-permissions.ts`

- [ ] **Step 1: 创建 ShippingProfile 实体**

```typescript
// packages/cjk-plugin/src/shipping/shipping-profile.entity.ts
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import {
    Channel,
    ChannelAware,
    DeepPartial,
    ID,
    ShippingMethod,
    VendureEntity,
} from '@vendure/core';

@Entity()
export class ShippingProfile extends VendureEntity implements ChannelAware {
    constructor(input?: DeepPartial<ShippingProfile>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'text', default: '' })
    description: string;

    @Column()
    code: string;

    @Column({ default: false })
    isGlobal: boolean;

    @Column({ nullable: true })
    ownerChannelId: ID | null;

    @Column({ nullable: true })
    freeShippingThreshold: number | null;

    @ManyToMany(() => ShippingMethod)
    @JoinTable()
    shippingMethods: ShippingMethod[];

    @ManyToMany(() => Channel)
    @JoinTable()
    channels: Channel[];
}
```

- [ ] **Step 2: 创建权限定义**

```typescript
// packages/cjk-plugin/src/shipping/shipping-profile-permissions.ts
import { PermissionDefinition } from '@vendure/core';

export const shippingProfilePermission = new PermissionDefinition({
    name: 'ShippingProfile',
    description: '管理配送档案',
});

export const shippingProfilePermissionDefinitions = [
    shippingProfilePermission,
];
```

- [ ] **Step 3: 创建 PaymentProfile 实体**

```typescript
// packages/cjk-plugin/src/payment/payment-profile.entity.ts
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import {
    Channel,
    ChannelAware,
    DeepPartial,
    ID,
    PaymentMethod,
    VendureEntity,
} from '@vendure/core';

@Entity()
export class PaymentProfile extends VendureEntity implements ChannelAware {
    constructor(input?: DeepPartial<PaymentProfile>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'text', default: '' })
    description: string;

    @Column()
    code: string;

    @Column({ default: false })
    isGlobal: boolean;

    @Column({ nullable: true })
    ownerChannelId: ID | null;

    @Column({ type: 'simple-json', nullable: true })
    installmentOptions: Record<string, any> | null;

    @ManyToMany(() => PaymentMethod)
    @JoinTable()
    paymentMethods: PaymentMethod[];

    @ManyToMany(() => Channel)
    @JoinTable()
    channels: Channel[];
}
```

- [ ] **Step 4: 创建支付档案权限**

```typescript
// packages/cjk-plugin/src/payment/payment-profile-permissions.ts
import { PermissionDefinition } from '@vendure/core';

export const paymentProfilePermission = new PermissionDefinition({
    name: 'PaymentProfile',
    description: '管理支付档案',
});

export const paymentProfilePermissionDefinitions = [
    paymentProfilePermission,
];
```

---

### Task 1.2: Profile 服务层

**Files:**
- Create: `packages/cjk-plugin/src/shipping/shipping-profile.service.ts`
- Create: `packages/cjk-plugin/src/payment/payment-profile.service.ts`

- [ ] **Step 1: ShippingProfileService**

```typescript
// packages/cjk-plugin/src/shipping/shipping-profile.service.ts
import { Injectable } from '@nestjs/common';
import {
    EntityNotFoundError,
    ID,
    ListQueryOptions,
    PaginatedList,
    Permission,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { ShippingProfile } from './shipping-profile.entity';

@Injectable()
export class ShippingProfileService {
    constructor(private connection: TransactionalConnection) {}

    async findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<ShippingProfile>,
    ): Promise<PaginatedList<ShippingProfile>> {
        const qb = this.connection
            .getRepository(ctx, ShippingProfile)
            .createQueryBuilder('sp')
            .leftJoinAndSelect('sp.shippingMethods', 'sm')
            .where('(sp.isGlobal = :isGlobal OR sp.ownerChannelId = :channelId)', {
                isGlobal: true,
                channelId: ctx.channelId,
            });
        // 可选：按 name/code 过滤
        if (options?.filter?.name?.contains) {
            qb.andWhere('sp.name LIKE :name', { name: `%${options.filter.name.contains}%` });
        }
        const skip = options?.skip || 0;
        const take = options?.take || 10;
        qb.skip(skip).take(take);
        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    async findOne(ctx: RequestContext, id: ID): Promise<ShippingProfile | undefined> {
        return this.connection
            .getRepository(ctx, ShippingProfile)
            .findOne({ where: { id: id as any }, relations: ['shippingMethods'] });
    }

    async findByCode(ctx: RequestContext, code: string): Promise<ShippingProfile | undefined> {
        return this.connection
            .getRepository(ctx, ShippingProfile)
            .findOne({ where: { code }, relations: ['shippingMethods'] });
    }

    async create(ctx: RequestContext, input: any): Promise<ShippingProfile> {
        if (!input.shippingMethodIds?.length) {
            throw new UserInputError('配送档案至少需要选择一种配送方式');
        }
        const repo = this.connection.getRepository(ctx, ShippingProfile);
        const profile = new ShippingProfile(input);
        profile.channels = [ctx.channel];
        profile.ownerChannelId = input.isGlobal ? null : ctx.channelId;
        profile.isGlobal = input.isGlobal ?? false;
        if (input.shippingMethodIds?.length) {
            profile.shippingMethods = input.shippingMethodIds.map((id: ID) => ({ id } as any));
        }
        return repo.save(profile);
    }

    async update(ctx: RequestContext, input: any): Promise<ShippingProfile> {
        const repo = this.connection.getRepository(ctx, ShippingProfile);
        const profile = await repo.findOne({
            where: { id: input.id },
            relations: ['shippingMethods'],
        });
        if (!profile) throw new EntityNotFoundError('ShippingProfile', input.id);
        if (profile.isGlobal && !ctx.userHasPermissions([Permission.SuperAdmin])) {
            throw new UserInputError('不能修改全局档案');
        }
        if (input.shippingMethodIds !== undefined) {
            if (input.shippingMethodIds.length === 0) {
                throw new UserInputError('配送档案至少需要选择一种配送方式');
            }
            profile.shippingMethods = input.shippingMethodIds.map((id: ID) => ({ id } as any));
        }
        const { id, shippingMethodIds, ...updateData } = input;
        Object.assign(profile, updateData);
        return repo.save(profile);
    }

    async delete(ctx: RequestContext, id: ID): Promise<void> {
        // 检查是否有商品引用此 Profile
        const count = await this.connection
            .getRepository(ctx, 'ProductVariant')
            .createQueryBuilder('pv')
            .where(`pv.customFields->>'shippingProfileId' = :id`, { id: String(id) })
            .getCount();
        if (count > 0) {
            throw new UserInputError(`有 ${count} 个商品引用此档案，请先重新分配`);
        }
        const repo = this.connection.getRepository(ctx, ShippingProfile);
        const profile = await repo.findOne({ where: { id: id as any } });
        if (!profile) throw new EntityNotFoundError('ShippingProfile', id);
        await repo.remove(profile);
    }

    /**
     * 批量分配配送档案给商品变体
     */
    async assignToVariants(
        ctx: RequestContext,
        variantIds: ID[],
        profileId: ID,
    ): Promise<void> {
        const profile = await this.findOne(ctx, profileId);
        if (!profile) throw new EntityNotFoundError('ShippingProfile', profileId);
        // 通过 raw SQL 更新 customFields
        const ids = variantIds.map(id => String(id));
        await this.connection
            .getRepository(ctx, 'ProductVariant')
            .createQueryBuilder()
            .update()
            .set({ customFields: () => `jsonb_set(COALESCE("customFields"::jsonb, '{}'), '{shippingProfileId}', '"${profileId}"')` })
            .where('id IN (:...ids)', { ids })
            .execute();
    }

    /**
     * 获取多个 Profile 的配送方式交集
     */
    async getIntersectedShippingMethods(
        ctx: RequestContext,
        profileIds: ID[],
    ): Promise<Array<{ id: ID; code: string }>> {
        if (profileIds.length === 0) return [];
        if (profileIds.length === 1) {
            const profile = await this.findOne(ctx, profileIds[0]);
            return (profile?.shippingMethods ?? []).map(sm => ({ id: sm.id, code: sm.code }));
        }
        // 取交集：查询所有 Profile 都有的 ShippingMethod
        const qb = this.connection
            .getRepository(ctx, ShippingProfile)
            .createQueryBuilder('sp')
            .innerJoin('sp.shippingMethods', 'sm')
            .select('sm.id', 'id')
            .addSelect('sm.code', 'code')
            .where('sp.id IN (:...profileIds)', { profileIds })
            .groupBy('sm.id')
            .addGroupBy('sm.code')
            .having('COUNT(DISTINCT sp.id) = :count', { count: profileIds.length });
        return qb.getRawMany();
    }
}
```

- [ ] **Step 2: PaymentProfileService**

```typescript
// packages/cjk-plugin/src/payment/payment-profile.service.ts
import { Injectable } from '@nestjs/common';
import {
    EntityNotFoundError,
    ID,
    ListQueryOptions,
    PaginatedList,
    Permission,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { PaymentProfile } from './payment-profile.entity';

@Injectable()
export class PaymentProfileService {
    constructor(private connection: TransactionalConnection) {}

    async findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<PaymentProfile>,
    ): Promise<PaginatedList<PaymentProfile>> {
        const qb = this.connection
            .getRepository(ctx, PaymentProfile)
            .createQueryBuilder('pp')
            .leftJoinAndSelect('pp.paymentMethods', 'pm')
            .where('(pp.isGlobal = :isGlobal OR pp.ownerChannelId = :channelId)', {
                isGlobal: true,
                channelId: ctx.channelId,
            });
        if (options?.filter?.name?.contains) {
            qb.andWhere('pp.name LIKE :name', { name: `%${options.filter.name.contains}%` });
        }
        const skip = options?.skip || 0;
        const take = options?.take || 10;
        qb.skip(skip).take(take);
        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    async findOne(ctx: RequestContext, id: ID): Promise<PaymentProfile | undefined> {
        return this.connection
            .getRepository(ctx, PaymentProfile)
            .findOne({ where: { id: id as any }, relations: ['paymentMethods'] });
    }

    async findByCode(ctx: RequestContext, code: string): Promise<PaymentProfile | undefined> {
        return this.connection
            .getRepository(ctx, PaymentProfile)
            .findOne({ where: { code }, relations: ['paymentMethods'] });
    }

    async create(ctx: RequestContext, input: any): Promise<PaymentProfile> {
        if (!input.paymentMethodIds?.length) {
            throw new UserInputError('支付档案至少需要选择一种支付方式');
        }
        const repo = this.connection.getRepository(ctx, PaymentProfile);
        const profile = new PaymentProfile(input);
        profile.channels = [ctx.channel];
        profile.ownerChannelId = input.isGlobal ? null : ctx.channelId;
        profile.isGlobal = input.isGlobal ?? false;
        if (input.paymentMethodIds?.length) {
            profile.paymentMethods = input.paymentMethodIds.map((id: ID) => ({ id } as any));
        }
        return repo.save(profile);
    }

    async update(ctx: RequestContext, input: any): Promise<PaymentProfile> {
        const repo = this.connection.getRepository(ctx, PaymentProfile);
        const profile = await repo.findOne({
            where: { id: input.id },
            relations: ['paymentMethods'],
        });
        if (!profile) throw new EntityNotFoundError('PaymentProfile', input.id);
        if (profile.isGlobal && !ctx.userHasPermissions([Permission.SuperAdmin])) {
            throw new UserInputError('不能修改全局档案');
        }
        if (input.paymentMethodIds !== undefined) {
            if (input.paymentMethodIds.length === 0) {
                throw new UserInputError('支付档案至少需要选择一种支付方式');
            }
            profile.paymentMethods = input.paymentMethodIds.map((id: ID) => ({ id } as any));
        }
        const { id, paymentMethodIds, ...updateData } = input;
        Object.assign(profile, updateData);
        return repo.save(profile);
    }

    async delete(ctx: RequestContext, id: ID): Promise<void> {
        const count = await this.connection
            .getRepository(ctx, 'ProductVariant')
            .createQueryBuilder('pv')
            .where(`pv.customFields->>'paymentProfileId' = :id`, { id: String(id) })
            .getCount();
        if (count > 0) {
            throw new UserInputError(`有 ${count} 个商品引用此档案，请先重新分配`);
        }
        const repo = this.connection.getRepository(ctx, PaymentProfile);
        const profile = await repo.findOne({ where: { id: id as any } });
        if (!profile) throw new EntityNotFoundError('PaymentProfile', id);
        await repo.remove(profile);
    }

    async assignToVariants(
        ctx: RequestContext,
        variantIds: ID[],
        profileId: ID,
    ): Promise<void> {
        const profile = await this.findOne(ctx, profileId);
        if (!profile) throw new EntityNotFoundError('PaymentProfile', profileId);
        const ids = variantIds.map(id => String(id));
        await this.connection
            .getRepository(ctx, 'ProductVariant')
            .createQueryBuilder()
            .update()
            .set({ customFields: () => `jsonb_set(COALESCE("customFields"::jsonb, '{}'), '{paymentProfileId}', '"${profileId}"')` })
            .where('id IN (:...ids)', { ids })
            .execute();
    }

    async getIntersectedPaymentMethods(
        ctx: RequestContext,
        profileIds: ID[],
    ): Promise<Array<{ id: ID; code: string }>> {
        if (profileIds.length === 0) return [];
        if (profileIds.length === 1) {
            const profile = await this.findOne(ctx, profileIds[0]);
            return (profile?.paymentMethods ?? []).map(pm => ({ id: pm.id, code: pm.code }));
        }
        const qb = this.connection
            .getRepository(ctx, PaymentProfile)
            .createQueryBuilder('pp')
            .innerJoin('pp.paymentMethods', 'pm')
            .select('pm.id', 'id')
            .addSelect('pm.code', 'code')
            .where('pp.id IN (:...profileIds)', { profileIds })
            .groupBy('pm.id')
            .addGroupBy('pm.code')
            .having('COUNT(DISTINCT pp.id) = :count', { count: profileIds.length });
        return qb.getRawMany();
    }

    /**
     * 获取多个 Profile 的分期选项交集
     * 返回所有 Profile 都支持的期数
     */
    async getIntersectedInstallmentOptions(
        ctx: RequestContext,
        profileIds: ID[],
    ): Promise<Record<string, any> | null> {
        const profiles = await this.connection
            .getRepository(ctx, PaymentProfile)
            .findByIds(profileIds as any[]);
        const profilesWithInstallment = profiles.filter(p => p.installmentOptions);
        if (profilesWithInstallment.length === 0) return null;

        // 取交集逻辑
        const result: Record<string, any> = {};
        for (const provider of ['alipay', 'wechatpay']) {
            const allPeriods = profilesWithInstallment
                .filter(p => p.installmentOptions?.[provider]?.huabei?.periods)
                .map(p => p.installmentOptions[provider].huabei.periods);
            if (allPeriods.length < profilesWithInstallment.length) continue; // 不是所有 Profile 都支持
            const intersected = allPeriods.reduce((a, b) => a.filter(v => b.includes(v)));
            if (intersected.length > 0) {
                result[provider] = { huabei: { periods: intersected } };
            }
        }
        return Object.keys(result).length > 0 ? result : null;
    }
}
```

---

### Task 1.3: Admin GraphQL Resolver

**Files:**
- Create: `packages/cjk-plugin/src/shipping/shipping-profile-admin.resolver.ts`
- Create: `packages/cjk-plugin/src/payment/payment-profile-admin.resolver.ts`

- [ ] **Step 1: 配送档案 Admin Resolver**

```typescript
// packages/cjk-plugin/src/shipping/shipping-profile-admin.resolver.ts
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
    Allow,
    Ctx,
    ID,
    Permission,
    RequestContext,
    Transaction,
} from '@vendure/core';
import { ShippingProfileService } from './shipping-profile.service';
import { shippingProfilePermission } from './shipping-profile-permissions';

@Resolver()
export class ShippingProfileAdminResolver {
    constructor(private service: ShippingProfileService) {}

    @Query()
    @Allow(shippingProfilePermission.Permission)
    async shippingProfiles(
        @Ctx() ctx: RequestContext,
        @Args('options') options?: any,
    ) {
        return this.service.findAll(ctx, options);
    }

    @Query()
    @Allow(shippingProfilePermission.Permission)
    async shippingProfile(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.service.findOne(ctx, id);
    }

    @Mutation()
    @Transaction()
    @Allow(shippingProfilePermission.Permission)
    async createShippingProfile(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.service.create(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(shippingProfilePermission.Permission)
    async updateShippingProfile(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.service.update(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(shippingProfilePermission.Permission)
    async deleteShippingProfile(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        await this.service.delete(ctx, id);
        return true;
    }

    @Mutation()
    @Transaction()
    @Allow(shippingProfilePermission.Permission)
    async assignShippingProfile(
        @Ctx() ctx: RequestContext,
        @Args('variantIds') variantIds: ID[],
        @Args('profileId') profileId: ID,
    ) {
        await this.service.assignToVariants(ctx, variantIds, profileId);
        return true;
    }
}
```

- [ ] **Step 2: 支付档案 Admin Resolver**

```typescript
// packages/cjk-plugin/src/payment/payment-profile-admin.resolver.ts
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
    Allow,
    Ctx,
    ID,
    RequestContext,
    Transaction,
} from '@vendure/core';
import { PaymentProfileService } from './payment-profile.service';
import { paymentProfilePermission } from './payment-profile-permissions';

@Resolver()
export class PaymentProfileAdminResolver {
    constructor(private service: PaymentProfileService) {}

    @Query()
    @Allow(paymentProfilePermission.Permission)
    async paymentProfiles(
        @Ctx() ctx: RequestContext,
        @Args('options') options?: any,
    ) {
        return this.service.findAll(ctx, options);
    }

    @Query()
    @Allow(paymentProfilePermission.Permission)
    async paymentProfile(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.service.findOne(ctx, id);
    }

    @Mutation()
    @Transaction()
    @Allow(paymentProfilePermission.Permission)
    async createPaymentProfile(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.service.create(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(paymentProfilePermission.Permission)
    async updatePaymentProfile(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.service.update(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(paymentProfilePermission.Permission)
    async deletePaymentProfile(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        await this.service.delete(ctx, id);
        return true;
    }

    @Mutation()
    @Transaction()
    @Allow(paymentProfilePermission.Permission)
    async assignPaymentProfile(
        @Ctx() ctx: RequestContext,
        @Args('variantIds') variantIds: ID[],
        @Args('profileId') profileId: ID,
    ) {
        await this.service.assignToVariants(ctx, variantIds, profileId);
        return true;
    }
}
```

---

### Task 1.4: 自定义字段扩展 + 注册到 Plugin

**Files:**
- Modify: `packages/cjk-plugin/src/shipping/product-variant-custom-fields.ts`
- Modify: `packages/cjk-plugin/src/plugin.ts`
- Modify: `packages/cjk-plugin/src/index.ts`
- Modify: `packages/cjk-plugin/src/constants.ts`

- [ ] **Step 1: 扩展 ProductVariant 自定义字段**

```typescript
// packages/cjk-plugin/src/shipping/product-variant-custom-fields.ts
// 在现有字段末尾追加
{
    name: 'shippingProfileId',
    type: 'string',
    nullable: true,
    public: true,
    label: [
        { languageCode: LanguageCode.zh_Hans, value: '配送档案 ID' },
    ],
},
{
    name: 'paymentProfileId',
    type: 'string',
    nullable: true,
    public: true,
    label: [
        { languageCode: LanguageCode.zh_Hans, value: '支付档案 ID' },
    ],
},
```

- [ ] **Step 2: 扩展 Order 自定义字段（快照）**

```typescript
// packages/cjk-plugin/src/order/order-custom-fields.ts
// 追加
{
    name: 'shippingProfileSnapshot',
    type: 'json',
    nullable: true,
    public: true,
    label: [
        { languageCode: LanguageCode.zh_Hans, value: '配送档案快照' },
    ],
},
{
    name: 'paymentProfileSnapshot',
    type: 'json',
    nullable: true,
    public: true,
    label: [
        { languageCode: LanguageCode.zh_Hans, value: '支付档案快照' },
    ],
},
```

- [ ] **Step 3: 注册到 plugin.ts**

在 `plugin.ts` 中需要做的改动：

1. `entities: [...]` 数组添加 `ShippingProfile` 和 `PaymentProfile`
2. `providers: [...]` 添加 `ShippingProfileService` 和 `PaymentProfileService`
3. `adminApiExtensions.resolvers` 添加 `ShippingProfileAdminResolver` 和 `PaymentProfileAdminResolver`
4. `configuration` 钩子中：
   - 注册 `shippingProfilePermissionDefinitions` 和 `paymentProfilePermissionDefinitions` 到 `config.authOptions.customPermissions`
   - 已有的 ProductVariant customFields 注册逻辑中，新增的字段会自动被包含（因为追加在同一个文件）
   - 注册 Order customFields 新增的快照字段
5. `onApplicationBootstrap` 中添加默认档案创建 + 存量数据迁移逻辑

```typescript
// plugin.ts 中 onApplicationBootstrap 新增逻辑
async onApplicationBootstrap(): Promise<void> {
    // ... 现有逻辑 ...

    // 创建默认配送档案
    if (this.options.profiles?.enabled !== false) {
        await this.ensureDefaultProfiles();
    }
}

private async ensureDefaultProfiles(): Promise<void> {
    try {
        const injector = new Injector(this.moduleRef);
        const shippingProfileService = injector.get(ShippingProfileService);
        const paymentProfileService = injector.get(PaymentProfileService);
        const channelService = injector.get(ChannelService);
        const ctx = await injector.get(RequestContextService).create({ apiType: 'admin' });

        const channels = await channelService.findAll(ctx);
        for (const channel of channels.items) {
            // 检查是否存在 default-shipping
            const existingShipping = await shippingProfileService.findByCode(ctx, `default-shipping-${channel.code}`);
            if (!existingShipping) {
                // 获取当前 Channel 所有可用的 ShippingMethod
                const shippingMethods = await injector.get(ShippingMethodService).findAll(ctx);
                const channelMethods = shippingMethods.items.filter(sm =>
                    sm.channels?.some(c => c.id === channel.id)
                );
                // 创建默认配送档案
                await shippingProfileService.create(ctx, {
                    name: `默认配送档案 (${channel.code})`,
                    code: `default-shipping-${channel.code}`,
                    description: '自动创建的默认配送档案',
                    shippingMethodIds: channelMethods.map(sm => sm.id),
                    isGlobal: false,
                });
            }

            // 检查是否存在 default-payment
            const existingPayment = await paymentProfileService.findByCode(ctx, `default-payment-${channel.code}`);
            if (!existingPayment) {
                const paymentMethods = await injector.get(PaymentMethodService).findAll(ctx);
                const channelMethods = paymentMethods.items.filter(pm =>
                    pm.channels?.some(c => c.id === channel.id)
                );
                await paymentProfileService.create(ctx, {
                    name: `默认支付档案 (${channel.code})`,
                    code: `default-payment-${channel.code}`,
                    description: '自动创建的默认支付档案',
                    paymentMethodIds: channelMethods.map(pm => pm.id),
                    isGlobal: false,
                });
            }
        }

        // 存量数据迁移：将 null 更新为 default Profile
        await this.migrateExistingVariants(ctx, shippingProfileService, paymentProfileService, channels);
    } catch (e: any) {
        Logger.error(`Failed to ensure default profiles: ${e.message}`, loggerCtx);
    }
}

private async migrateExistingVariants(
    ctx: RequestContext,
    shippingSvc: ShippingProfileService,
    paymentSvc: PaymentProfileService,
    channels: any,
): Promise<void> {
    for (const channel of channels.items) {
        const defaultShipping = await shippingSvc.findByCode(ctx, `default-shipping-${channel.code}`);
        const defaultPayment = await paymentSvc.findByCode(ctx, `default-payment-${channel.code}`);
        if (!defaultShipping || !defaultPayment) continue;

        const channelCtx = new RequestContext({
            apiType: 'admin',
            channel,
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
        });

        // 更新 shippingProfileId 为 null 的变体
        await this.connection
            .getRepository(channelCtx, 'ProductVariant')
            .createQueryBuilder()
            .update()
            .set({
                customFields: () =>
                    `jsonb_set(COALESCE("customFields"::jsonb, '{}'), '{shippingProfileId}', '"${defaultShipping.id}"')`,
            })
            .where(`"customFields"->>'shippingProfileId' IS NULL`)
            .execute();

        // 更新 paymentProfileId 为 null 的变体
        await this.connection
            .getRepository(channelCtx, 'ProductVariant')
            .createQueryBuilder()
            .update()
            .set({
                customFields: () =>
                    `jsonb_set(COALESCE("customFields"::jsonb, '{}'), '{paymentProfileId}', '"${defaultPayment.id}"')`,
            })
            .where(`"customFields"->>'paymentProfileId' IS NULL`)
            .execute();
    }
}
```

- [ ] **Step 4: 更新 index.ts 导出**

```typescript
// packages/cjk-plugin/src/index.ts
export * from './shipping/shipping-profile.entity';
export * from './shipping/shipping-profile.service';
export * from './shipping/shipping-profile-admin.resolver';
export * from './shipping/shipping-profile-permissions';
export * from './payment/payment-profile.entity';
export * from './payment/payment-profile.service';
export * from './payment/payment-profile-admin.resolver';
export * from './payment/payment-profile-permissions';
```

- [ ] **Step 5: 更新 constants.ts**

```typescript
// packages/cjk-plugin/src/constants.ts
export const loggerCtx = 'CjkPlugin';
```

---

## Phase 2: 结算集成 ✅

### Task 2.1: Shop API 查询扩展

**Files:**
- Create: `packages/cjk-plugin/src/shipping/shipping-profile-shop.resolver.ts`
- Create: `packages/cjk-plugin/src/payment/payment-profile-shop.resolver.ts`
- Modify: `packages/cjk-plugin/src/plugin.ts`

- [ ] **Step 1: 配送档案 Shop Resolver**

```typescript
// packages/cjk-plugin/src/shipping/shipping-profile-shop.resolver.ts
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, ID, RequestContext } from '@vendure/core';
import { ShippingProfileService } from './shipping-profile.service';

@Resolver()
export class ShippingProfileShopResolver {
    constructor(private service: ShippingProfileService) {}

    /**
     * 获取当前订单可用配送方式的 Profile 交集
     * 如果返回空列表，前端应提示"购物车商品不兼容，请分开下单"
     */
    @Query()
    async eligibleShippingMethodsByProfile(
        @Ctx() ctx: RequestContext,
        @Args('profileIds') profileIds: ID[],
    ) {
        return this.service.getIntersectedShippingMethods(ctx, profileIds);
    }

    /**
     * 检查购物车商品 Profile 兼容性
     * 返回 { compatible: boolean, intersectedCount: number }
     */
    @Query()
    async checkShippingProfileCompatibility(
        @Ctx() ctx: RequestContext,
        @Args('profileIds') profileIds: ID[],
    ) {
        const methods = await this.service.getIntersectedShippingMethods(ctx, profileIds);
        return {
            compatible: methods.length > 0,
            intersectedCount: methods.length,
        };
    }
}
```

- [ ] **Step 2: 支付档案 Shop Resolver**

```typescript
// packages/cjk-plugin/src/payment/payment-profile-shop.resolver.ts
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, ID, RequestContext } from '@vendure/core';
import { PaymentProfileService } from './payment-profile.service';

@Resolver()
export class PaymentProfileShopResolver {
    constructor(private service: PaymentProfileService) {}

    @Query()
    async eligiblePaymentMethodsByProfile(
        @Ctx() ctx: RequestContext,
        @Args('profileIds') profileIds: ID[],
    ) {
        return this.service.getIntersectedPaymentMethods(ctx, profileIds);
    }

    @Query()
    async eligibleInstallmentOptions(
        @Ctx() ctx: RequestContext,
        @Args('profileIds') profileIds: ID[],
    ) {
        return this.service.getIntersectedInstallmentOptions(ctx, profileIds);
    }

    @Query()
    async checkPaymentProfileCompatibility(
        @Ctx() ctx: RequestContext,
        @Args('profileIds') profileIds: ID[],
    ) {
        const methods = await this.service.getIntersectedPaymentMethods(ctx, profileIds);
        return {
            compatible: methods.length > 0,
            intersectedCount: methods.length,
        };
    }
}
```

- [ ] **Step 3: 注册 Shop Resolvers 到 plugin.ts**

```typescript
// 在 shopApiExtensions.resolvers 中添加
resolvers: [
    // ... 现有 ...
    ShippingProfileShopResolver,
    PaymentProfileShopResolver,
],
```

- [ ] **Step 4: 在 plugin.ts 中添加 Shop API schema 扩展**

```graphql
// 在 shopApiExtensions.schema 中添加
extend type Query {
    eligibleShippingMethodsByProfile(profileIds: [ID!]!): [ShippingMethod!]!
    eligiblePaymentMethodsByProfile(profileIds: [ID!]!): [PaymentMethod!]!
    eligibleInstallmentOptions(profileIds: [ID!]!): JSON
    checkShippingProfileCompatibility(profileIds: [ID!]!): ProfileCompatibilityResult!
    checkPaymentProfileCompatibility(profileIds: [ID!]!): ProfileCompatibilityResult!
}

type ProfileCompatibilityResult {
    compatible: Boolean!
    intersectedCount: Int!
}
```

---

### Task 2.2: 订单校验集成

**Files:**
- Modify: `packages/cjk-plugin/src/plugin.ts`（在 API 扩展中添加校验逻辑或通过事件订阅）

- [ ] **Step 1: 创建 OrderEvent 订阅者，设置 Profile 快照**

在 plugin.ts 的 `onApplicationBootstrap` 中注册事件订阅：

```typescript
// 在 onApplicationBootstrap 中
@OnEvent(OrderEvent)
async handleOrderStateChange(event: OrderEvent) {
    if (event.type === 'settled' || event.type === 'payment-settled') {
        // 订单结算成功，写入 Profile 快照
        const order = event.entity;
        const lines = order.lines ?? [];
        if (lines.length === 0) return;

        const injector = new Injector(this.moduleRef);
        const shippingSvc = injector.get(ShippingProfileService);
        const paymentSvc = injector.get(PaymentProfileService);

        // 收集 Profile 信息
        const shippingProfileNames: Record<string, string> = {};
        const paymentProfileNames: Record<string, string> = {};
        const profileIds = new Set<string>();

        for (const line of lines) {
            const variant = line.productVariant;
            if (!variant) continue;
            const spId = (variant as any).customFields?.shippingProfileId;
            const ppId = (variant as any).customFields?.paymentProfileId;
            if (spId) {
                profileIds.add(spId);
                if (!shippingProfileNames[spId]) {
                    const profile = await shippingSvc.findOne(event.ctx, spId as any);
                    shippingProfileNames[spId] = profile?.name ?? spId;
                }
            }
            if (ppId) {
                profileIds.add(ppId);
                if (!paymentProfileNames[ppId]) {
                    const profile = await paymentSvc.findOne(event.ctx, ppId as any);
                    paymentProfileNames[ppId] = profile?.name ?? ppId;
                }
            }
        }

        // 更新 Order customFields
        const orderRepo = injector.get(TransactionalConnection).getRepository(event.ctx, Order);
        await orderRepo.update(order.id, {
            customFields: {
                shippingProfileSnapshot: shippingProfileNames,
                paymentProfileSnapshot: paymentProfileNames,
            },
        } as any);
    }
}
```

- [ ] **Step 2: 在 eligibleShippingMethods 查询中集成 Profile 过滤**

Vendure 的 Shop API 已有 `eligibleShippingMethods` 查询。在 plugin.ts 的 `configuration` 钩子中，通过 `shopApiExtensions` 自定义一个带 Profile 过滤的版本，或者让前端使用新的 `eligibleShippingMethodsByProfile` 查询自行过滤。

**推荐方案：** 前端调用流程：

```
1. addItemToOrder → 获得 order
2. 从 order.lines 提取出所有 shippingProfileId 的数组
3. 调用 checkShippingProfileCompatibility(profileIds) → 检查兼容性
4. 调用 eligibleShippingMethodsByProfile(profileIds) → 获取过滤后的配送方式
5. 如果 compatible=false，显示"请分开下单"提示
```

---

### Task 2.3: 加购时兼容性校验

- [ ] **Step 1: 在 plugin.ts 的 onApplicationBootstrap 中注册 OrderItem 事件校验**

```typescript
// 在 onApplicationBootstrap 中
// 注册 OrderLineEvent 或直接监听 OrderEvent
@OnEvent(OrderEvent)
async handleOrderModified(event: OrderEvent) {
    if (event.type !== 'modified' && event.type !== 'added') return;
    // 仅做检测，不阻断（前端通过 checkShippingProfileCompatibility 主动查询）
    // 可在此记录日志，用于问题排查
    const order = event.entity;
    const lines = order.lines ?? [];
    if (lines.length < 2) return;

    const profileIds = new Set<string>();
    for (const line of lines) {
        const spId = (line.productVariant as any)?.customFields?.shippingProfileId;
        if (spId) profileIds.add(spId);
    }
    if (profileIds.size > 1) {
        Logger.info(
            `Order ${order.code} has mixed shipping profiles: ${[...profileIds].join(', ')}`,
            loggerCtx,
        );
    }
}
```

**注意：** 加购时的阻断校验由前端主动调用 `checkShippingProfileCompatibility` 实现，后端不阻断 `addItemToOrder`，以保持与现有 Vendure 行为的兼容性。

---

## Phase 3: Admin UI（Vendure Dashboard）✅

该阶段涉及 Vendure Dashboard 的 React 前端开发，需要在 `packages/dashboard` 中新增 Profile 管理页面。

**注意：** 此阶段需要与 Vendure Dashboard 的现有架构保持一致。由于 Dashboard 使用 React、Apollo Client 和自定义 UI 组件库，建议在实现时参考已有的 ShippingMethod/PaymentMethod 管理页面的实现模式。

### 需要实现的页面

1. **配送档案列表页** - `/settings/shipping-profiles` - 表格展示所有 Profile，可搜索/筛选
2. **配送档案编辑页** - 表单：名称、编码、描述、可用配送方式多选、满额包邮门槛
3. **支付档案列表页** - `/settings/payment-profiles` - 表格展示
4. **支付档案编辑页** - 表单：名称、编码、描述、可用支付方式多选、分期选项配置
5. **商品编辑页 Profile 选择器** - 在下拉框中显示当前 Channel 可用的 Profile
6. **批量分配操作界面** - 在商品列表页新增批量操作按钮

---

## Phase 4: 分期支付集成 ✅

### Task 4.1: 花呗分期 - alipay-plugin 扩展

**Files:**
- Modify: `packages/alipay-plugin/src/alipay-handler.ts`

- [ ] **Step 1: 在 createPayment 中添加花呗分期参数**

```typescript
// alipay-handler.ts 中 createPayment 逻辑
// 从 Order.customFields 中读取分期配置
const installmentOptions = order.customFields?.paymentProfileSnapshot || {};
const alipayInstallment = installmentOptions?.alipay?.huabei;
if (alipayInstallment?.periods?.length > 0) {
    // 前端已在结算时选择了分期期数，存储在 order 的 customFields 中
    const selectedPeriod = order.customFields?.selectedInstallmentPeriod || alipayInstallment.periods[0];
    extendParams: {
        ...extendParams,
        hbFqNum: String(selectedPeriod),
        hbFqSellerPercent: '0', // 0=用户承担手续费，100=商户承担
    }
}
```

### Task 4.2: 微信支付分期 - wechatpay-plugin 扩展

**Files:**
- Modify: `packages/wechatpay-plugin/src/wechatpay-handler.ts`

- [ ] **Step 1: 在 createPayment 中添加微信支付分期参数**

微信支付分期（分付）的参数格式与支付宝不同，需根据微信支付文档确认具体参数名。预留扩展点。

---

## 自审检查清单

### Spec 覆盖

| Spec 章节 | 对应 Task |
|-----------|-----------|
| 0. 租户级与产品级关系 | 文档说明，无代码 |
| 2.1 ShippingProfile 实体 | Task 1.1 |
| 2.2 PaymentProfile 实体 | Task 1.1 |
| 2.3 ProductVariant 扩展 | Task 1.4 |
| 2.4 Product 级 Profile | Task 1.4（Variant 继承，Product 暂不实现） |
| 3. 默认档案 | Task 1.4 onApplicationBootstrap |
| 3.1 默认档案自动创建 | Task 1.4 |
| 3.2 Profile 删除保护 | Task 1.2 Service.delete |
| 3.3 Profile 空集校验 | Task 1.2 Service.create |
| 3.4 批量分配 Profile | Task 1.2 Service.assignToVariants |
| 3.5 跨租户 Profile 复制 | Task 1.1 isGlobal 字段 |
| 4.1 配送方式选择 | Task 2.1 |
| 4.2 支付方式选择 | Task 2.1 |
| 4.3 自提方式集成 | 自提方式是 ShippingMethod 的子集，Profile 自动覆盖 |
| 5.0 加购时提前拦截 | Task 2.3（前端主动查询） |
| 5.1 setShippingMethod 增强 | 前端校验，后端不阻断开单 |
| 5.2 addPaymentToOrder 增强 | 前端校验，后端不阻断开单 |
| 5.3 Shop API 查询扩展 | Task 2.1 |
| 5.4 订单 Profile 快照 | Task 2.2 |
| 5.5 freeShippingThreshold 优先级 | Task 1.1 实体字段，前端根据 Profile 阈值计算 |
| 6. 前端错误码 | 定义在 GraphQL schema 中 |
| 7. Admin UI | Phase 3 |
| 8. 分期支付 | Phase 4 |
| 9. 存量数据迁移 | Task 1.4 bootstrap |

### 未实现的 spec 项

- **Product 级别 Profile（2.4）**：当前只实现了 ProductVariant 级别，Product 级别可选。如果后续需要，可在 Product 自定义字段上添加同样的字段，并在 Variant 查询时 fallback 到 Product。
- **Admin UI（Phase 3）**：具体实现需参考 Vendure Dashboard 的现有模式和组件库，建议在 Phase 1-2 完成后单独实现。

### 类型一致性检查

- `ShippingProfile.id` / `PaymentProfile.id` — 使用 `ID` 类型（Vendure 的 `ID` 是 `string | number`）
- `shippingProfileId` / `paymentProfileId` — 自定义字段使用 `string` 类型存储 ID 字符串
- `getIntersectedShippingMethods` 返回 `{ id: ID, code: string }[]` — 与 ShippingMethod 的字段匹配
- `ensureDefaultProfiles` 中 `code` 使用 `default-shipping-${channel.code}` 格式，确保唯一性