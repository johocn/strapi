# 积分兑换页自提点兜底与渠道过滤设计

- 日期：2026-07-05
- 涉及前端：shao/pages/exchange/exchange.vue
- 涉及后端：zhao-common（site-config service 抽取方法）、zhao-point（getProducts 改用 available channels）

## 1. 需求

页面 `http://localhost:5175/#/pages/exchange/exchange`（shao 目录积分兑换页）需增强：

1. 商品列表按"全渠道 + zhao-common 的 available channels（site ∪ user）"过滤
2. 点击兑换按钮后，根据商品所属渠道查询自提点，按数量兜底处理：
   - 自提点数量 = 0 → 不显示自提点选项
   - 自提点数量 = 1 → 自动选中（兜底）
   - 自提点数量 > 1 → 允许用户单选

## 2. 现状分析

### 商品 schema（已确认）

- `channel` 是 `manyToOne` 关系（一个商品只属于一个渠道），**不会因多渠道重复**
- 后端查询用 `$or` 条件，一条商品只匹配一次，**无需去重**

### 后端 getProducts 现状（redemption.ts:117-134）

```ts
if (userId) {
  const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
    where: { user: userId },
    populate: { channel: { select: ['id'] } },
  });
  const userChannelIds = members.map((m: any) => m.channel?.id || m.channel).filter(Boolean);
  if (userChannelIds.length > 0) {
    where.$or = [
      { channel: { $in: userChannelIds } },
      { allowCrossChannel: true },
    ];
  } else {
    where.allowCrossChannel = true;
  }
}
```

**问题**：仅用 user channels（CHANNEL_MEMBER），未包含 site channels。用户需求是"zhao-common 的渠道"（site ∪ user）。

### zhao-common available channels 逻辑（config.ts:861-922）

controller 中实现了 site channels ∪ user channels 的合并去重，但逻辑写在 controller，无法跨插件复用。

### site-resolver 中间件（已全局生效）

[bootstrap.ts:113-133](file:///e:/code/basic/plugins/zhao-common/server/src/bootstrap.ts#L113-L133) 通过 `strapi.server.use` 全局注册 site-resolver 与 tenant-context-resolver，所有路由的 `ctx.state.siteId` 可用。

### 自提点选择（exchange.vue:222-230）

- 自提点是"可选"的，跳转独立列表页选择
- 未根据商品渠道预筛选，未做数量兜底

### 后端 pickup-locations 接口（已就绪）

`GET /zhao-point/v1/point/pickup-locations?channelId=xxx`，channelId 兼容 numeric id 与 documentId（point.ts:200）。

## 3. 设计方案

### 3.1 改动范围

| 文件 | 改动 |
|------|------|
| `zhao-common/server/src/services/site-config.ts` | 新增 `getAvailableChannels(siteId, userId)` 方法 |
| `zhao-common/server/src/controllers/config.ts:861-922` | `getAvailableChannels` controller 重构为调用 service |
| `zhao-point/server/src/services/redemption.ts:100-152` | `getProducts` 改用 zhao-common service 获取 channelIds |
| `shao/pages/exchange/exchange.vue` | 自提点兜底逻辑 + 内联单选 UI（前端不再做商品列表过滤） |

### 3.2 zhao-common 抽取 service 方法

在 `zhao-common/server/src/services/site-config.ts` 新增 `getAvailableChannels(siteId, userId)` 方法：

```ts
/**
 * 获取用户可访问渠道（site channels ∪ user direct channels，按 id 去重）
 * 跨插件复用：zhao-point getProducts 等场景调用
 * @param siteId site-config documentId
 * @param userId 用户 id
 * @returns 渠道列表 [{ id, documentId, name }]
 */
async getAvailableChannels(siteId?: string, userId?: string | number) {
  const siteChannels: any[] = [];
  if (siteId) {
    const siteConfig = await this.getConfig(siteId);
    if (siteConfig?.channels && Array.isArray(siteConfig.channels)) {
      for (const ch of siteConfig.channels) {
        siteChannels.push({
          id: ch.id,
          documentId: ch.documentId,
          name: ch.name,
        });
      }
    }
  }

  const userChannels: any[] = [];
  if (userId) {
    const channelPermissionService = strapi.plugin("zhao-channel")?.service("channel-permission");
    if (channelPermissionService && typeof channelPermissionService.getUserDirectChannels === "function") {
      const userChannelIds = await channelPermissionService.getUserDirectChannels(userId);
      if (Array.isArray(userChannelIds)) {
        const channels = await strapi.db.query("plugin::zhao-channel.channel").findMany({
          where: { id: { $in: userChannelIds } },
          select: ["id", "documentId", "name"],
        });
        for (const ch of channels) {
          userChannels.push({
            id: ch.id,
            documentId: ch.documentId,
            name: ch.name,
          });
        }
      }
    }
  }

  // 合并去重（按 numeric id）
  const merged = new Map();
  for (const ch of [...siteChannels, ...userChannels]) {
    const key = String(ch.id);
    if (!merged.has(key)) {
      merged.set(key, ch);
    }
  }
  return Array.from(merged.values());
}
```

### 3.3 zhao-common controller 重构

`zhao-common/server/src/controllers/config.ts:861-922` 的 `getAvailableChannels` 重构为调用 service：

```ts
async getAvailableChannels(ctx: any) {
  try {
    const siteId = ctx.state?.siteId;
    const userId = ctx.state?.user?.id;

    if (!siteId) {
      ctx.status = 400;
      ctx.body = { error: "缺少站点标识" };
      return;
    }

    const channels = await strapi.plugin("zhao-common").service("site-config").getAvailableChannels(siteId, userId);
    ctx.body = { data: channels };
  } catch (error: any) {
    ctx.status = error.status ?? 500;
    ctx.body = { error: error.message };
  }
}
```

### 3.4 zhao-point getProducts 改造

`zhao-point/server/src/services/redemption.ts:100-152` 的 `getProducts` 中，将现有 CHANNEL_MEMBER 查询替换为调用 zhao-common service：

```ts
const getProducts = async (filters?: {
  status?: string;
  deliveryType?: string;
  name?: string;
  page?: number;
  pageSize?: number;
  userId?: string | number;
  siteId?: string;
  extraWhere?: Record<string, any>;
}) => {
  const { status, deliveryType, name, page = 1, pageSize = 20, userId, siteId, extraWhere } = filters || {};
  const where: any = { deletedAt: null, status: status || "on_shelf" };
  if (deliveryType) where.deliveryType = deliveryType;
  if (name) where.name = { $containsi: name };
  if (extraWhere && typeof extraWhere === "object" && !Array.isArray(extraWhere)) {
    Object.assign(where, extraWhere);
  }

  // 使用 zhao-common available channels（site ∪ user）过滤
  if (userId && siteId) {
    const availableChannels = await strapi.plugin("zhao-common").service("site-config").getAvailableChannels(siteId, userId);
    const channelIds = availableChannels.map((c: any) => c.id).filter(Boolean);

    if (channelIds.length > 0) {
      where.$or = [
        { channel: { $in: channelIds } },
        { allowCrossChannel: true },
      ];
    } else {
      // 用户与站点皆无渠道，仅看跨渠道商品
      where.allowCrossChannel = true;
    }
  } else if (userId) {
    // 无 siteId 兜底：退回 user channels 查询
    const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
      where: { user: userId },
      populate: { channel: { select: ['id'] } },
    });
    const userChannelIds = members.map((m: any) => m.channel?.id || m.channel).filter(Boolean);
    if (userChannelIds.length > 0) {
      where.$or = [
        { channel: { $in: userChannelIds } },
        { allowCrossChannel: true },
      ];
    } else {
      where.allowCrossChannel = true;
    }
  }

  const [records, total] = await Promise.all([
    strapi.db.query(PRODUCT_UID).findMany({
      where,
      orderBy: { sortOrder: "asc" },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: {
        channel: { select: ['id', 'documentId', 'name'] },
        coverImage: true,
        images: true,
      },
    }),
    strapi.db.query(PRODUCT_UID).count({ where }),
  ]);

  return { records, total, page, pageSize };
};
```

### 3.5 zhao-point controller 传入 siteId

`zhao-point/server/src/controllers/point.ts:152-168` 的 `listProducts` 传入 `siteId`：

```ts
async listProducts(ctx: any) {
  try {
    const userId = ctx.state.user?.id;
    const siteId = ctx.state?.siteId;
    const { status, deliveryType, page, pageSize } = ctx.query;
    const result = await strapi.plugin("zhao-point").service("redemption").getProducts({
      status: status || "on_shelf",
      deliveryType,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      userId,
      siteId,
    });
    ctx.body = wrapList(result);
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
}
```

### 3.6 前端 loadData 简化（去掉二次过滤）

`shao/pages/exchange/exchange.vue` 的 `loadData` 直接使用后端返回数据，不再调用 `getAvailableChannels`：

```ts
async function loadData() {
  loading.value = true
  try {
    const [balanceRes, productRes] = await Promise.all([
      getPointBalance(),
      getPointProductList({ status: 'on_shelf' }),
    ])
    pointsBalance.value = (balanceRes as any)?.balance ?? 0
    channelBalances.value = (balanceRes as any)?.channelBalances || []
    globalBalance.value = (balanceRes as any)?.globalBalance ?? 0

    const rawList = (productRes as any)?.data?.records || (productRes as any)?.records || (productRes as any)?.data || []
    productList.value = rawList.map((p: any) => ({
      id: p.id,
      documentId: p.documentId,
      name: p.name || '',
      subtitle: p.subtitle || '',
      description: p.description || '',
      detail: p.detail || '',
      pointsCost: p.pointsCost || 0,
      originalPrice: p.originalPrice || 0,
      stock: p.stock ?? 0,
      deliveryType: p.deliveryType || 'express',
      category: p.category || '',
      coverImageUrl: getMediaUrl(p.coverImage),
      imagesList: (p.images || []).map((img: any) => getMediaUrl(img)),
      maxPerUser: p.maxPerUser || 0,
      salesMode: p.salesMode || 'points_only',
      price: parseFloat(p.price) || 0,
      channelId: p.channel?.documentId || p.channel?.id || p.channelId || '',
      allowCrossChannel: p.allowCrossChannel || false,
      allowGlobalPoints: p.allowGlobalPoints !== false,
    }))
  } catch (e) {
    console.error('加载数据失败', e)
  } finally {
    loading.value = false
  }
}
```

**注意**：前端 import 不再需要 `getAvailableChannels`，api.ts 也不需要新增该函数。

### 3.7 兑换弹窗自提点逻辑（不变）

新增响应式状态：

```ts
const pickupLocations = ref<any[]>([])

async function loadPickupLocations(channelId: string) {
  if (!channelId) { pickupLocations.value = []; return }
  try {
    const res = await getPickupLocationList({ channelId })
    const data = (res as any)?.data || {}
    let list: any[] = data.records || data.list || []
    if (!Array.isArray(list)) list = Array.isArray(data) ? data : []
    pickupLocations.value = list
  } catch {
    pickupLocations.value = []
  }
}
```

在 `showProductDetail(product)` 中：

```ts
async function showProductDetail(product: Product) {
  selectedProduct.value = product
  // ... 默认 deliveryType 设置、用户信息填充不变
  form.value.pickupLocationId = ''
  form.value.pickupLocationName = ''

  // 自提点兜底逻辑
  // 跨渠道商品（无 channelId）不查自提点 → 自提选项隐藏（见 3.9 showPickup）
  // 指定渠道商品按 channelId 查自提点：0 → 强制快递 / 1 → 自动选中 / >1 → 等用户选
  pickupLocations.value = []
  if (showPickup.value && product.channelId) {
    await loadPickupLocations(product.channelId)
    if (pickupLocations.value.length === 0) {
      form.value.deliveryType = 'express'
    } else if (pickupLocations.value.length === 1) {
      const loc = pickupLocations.value[0]
      form.value.pickupLocationId = loc.documentId || loc.id
      form.value.pickupLocationName = loc.name
    } else {
      form.value.pickupLocationId = ''
      form.value.pickupLocationName = ''
    }
  } else if (showPickup.value && !product.channelId) {
    // 跨渠道商品无指定渠道：清空自提点，强制快递
    pickupLocations.value = []
    form.value.deliveryType = 'express'
  }

  // ... 自动选中渠道积分逻辑不变
  showDetail.value = true
}
```

### 3.8 UI 调整：内联单选列表

移除 `exchange.vue:222-230` 的"跳转独立页"逻辑，改为弹窗内联单选：

```html
<view v-if="form.deliveryType === 'self_pickup'" class="pickup-info">
  <view v-if="pickupLocations.length === 0" class="pickup-tip">
    <text>该商品未配置自提点，请选择快递配送</text>
  </view>
  <view v-else>
    <view class="pickup-tip">
      <text>请前往指定地点自提，工作人员将核实您的兑换信息</text>
    </view>
    <view class="form-item">
      <text class="form-label">
        选择自提点
        <text class="required" v-if="pickupLocations.length > 1">*</text>
        <text class="form-hint-inline" v-if="pickupLocations.length === 1">（已自动选择）</text>
      </text>
      <view class="pickup-radio-list">
        <view
          v-for="loc in pickupLocations"
          :key="loc.documentId || loc.id"
          :class="['pickup-radio-item', { active: form.pickupLocationId === (loc.documentId || loc.id) }]"
          @click="selectPickupLocation(loc)"
        >
          <view class="pickup-radio-icon">
            <text v-if="form.pickupLocationId === (loc.documentId || loc.id)" class="check-icon-sm">✓</text>
          </view>
          <view class="pickup-radio-info">
            <text class="pickup-radio-name">{{ loc.name }}</text>
            <text class="pickup-radio-address" v-if="loc.address">{{ loc.address }}</text>
            <text class="pickup-radio-phone" v-if="loc.phone">📞 {{ loc.phone }}</text>
          </view>
        </view>
      </view>
    </view>
    <!-- 联系电话输入框保持原样 -->
  </view>
</view>
```

```ts
function selectPickupLocation(loc: any) {
  form.value.pickupLocationId = loc.documentId || loc.id
  form.value.pickupLocationName = loc.name
}
```

移除原 `selectPickupLocation` 跳转函数与 `uni.$on('selectPickupLocation')` 监听。

### 3.9 配送方式可选性

`showPickup` / `canConfirm` computed 调整：

```ts
const showPickup = computed(() => {
  const dt = selectedProduct.value?.deliveryType
  if (!(dt === 'self_pickup' || dt === 'both')) return false
  // 跨渠道商品（无 channelId）不显示自提选项
  if (!selectedProduct.value?.channelId) return false
  // 指定渠道商品但自提点为 0 时不显示自提选项
  if (pickupLocations.value.length === 0) return false
  return true
})

const canConfirm = computed(() => {
  if (!selectedProduct.value) return false
  const mode = selectedProduct.value.salesMode || 'points_only'
  if (mode !== 'purchase_only') {
    if (deductionDetail.value.shortfall > 0) return false
  }
  if (selectedProduct.value.stock <= 0) return false
  if (form.value.deliveryType === 'express') {
    return form.value.receiverName.trim() !== '' &&
      isValidPhone(form.value.receiverPhone) &&
      form.value.receiverAddress.trim() !== ''
  }
  if (form.value.deliveryType === 'self_pickup') {
    if (pickupLocations.value.length > 1 && !form.value.pickupLocationId) return false
    return isValidPhone(form.value.receiverPhone)
  }
  return true
})
```

### 3.10 样式新增

```scss
.pickup-radio-list { display: flex; flex-direction: column; gap: 12rpx; }
.pickup-radio-item {
  display: flex; align-items: flex-start; gap: 16rpx;
  padding: 20rpx; background: #f5f5f5; border-radius: 12rpx;
  border: 2rpx solid transparent;
  &.active { background: #f0f4ff; border-color: #667eea; }
}
.pickup-radio-icon {
  width: 36rpx; height: 36rpx; border-radius: 50%;
  border: 2rpx solid #d9d9d9; display: flex;
  align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 4rpx; background: #fff;
  .pickup-radio-item.active & { background: #667eea; border-color: #667eea; }
}
.pickup-radio-info { flex: 1; min-width: 0; }
.pickup-radio-name { display: block; font-size: 28rpx; color: #333; font-weight: 500; }
.pickup-radio-address { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pickup-radio-phone { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.form-hint-inline { font-size: 22rpx; color: #999; margin-left: 8rpx; }
```

## 4. 数据流

1. 用户进入兑换页 → `loadData()` 并行调 balance + products
2. 后端 `getProducts` 调用 zhao-common `getAvailableChannels(siteId, userId)` 获取 site ∪ user 渠道
3. 后端按 channelIds + allowCrossChannel 过滤商品（不会重复，因为 manyToOne）
4. 前端直接展示后端返回的商品列表（无需二次过滤、无需去重）
5. 用户点兑换 → `showProductDetail(product)` 拉取该商品渠道的自提点
6. 根据自提点数量决定 UI：0 隐藏 / 1 自动选中 / >1 单选
7. 用户确认 → `confirmExchange()` 提交

## 5. 边界情况

| 场景 | 处理 |
|------|------|
| 跨渠道商品（`channelId` 为空） | 不拉取自提点，自提选项隐藏，强制快递 |
| 商品 `deliveryType` 不含 `self_pickup` | 不拉取自提点，仅显示快递选项 |
| `loadPickupLocations` 失败 | `pickupLocations.value = []`，按 0 个处理（自提选项隐藏） |
| 用户切换 `deliveryType` 为 express | 不影响已选自提点（提交时若 express 则忽略 pickupLocationId） |
| siteId 缺失（未识别租户） | getProducts 退回 user channels 查询（兜底） |
| available channels 为空 | 仅显示 allowCrossChannel 商品 |

## 6. 风险与回滚

- **风险**：
  - zhao-common service 方法跨插件调用，依赖插件加载顺序（Strapi 保证 bootstrap 完成后 service 可用）
  - siteId 缺失时退回 user channels，行为与原逻辑一致
- **回滚**：
  - 后端：还原 redemption.ts getProducts 与 config.ts getAvailableChannels
  - 前端：还原 exchange.vue

## 7. 验收标准

1. 商品列表仅显示：全渠道商品 / allowCrossChannel 商品 / 商品渠道在 available channels（site ∪ user）内的商品
2. 商品列表无重复项（manyToOne schema 决定）
3. 点击兑换按钮：
   - 跨渠道商品（无 channelId）→ 自提选项隐藏，仅显示快递
   - 指定渠道商品无自提点 → 自提选项隐藏，仅显示快递
   - 指定渠道商品有 1 个自提点 → 自动选中，自提选项可见
   - 指定渠道商品有多个自提点 → 显示内联单选列表，未选时无法确认
4. 提交兑换时 pickupLocationId 正确传递
