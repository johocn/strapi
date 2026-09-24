# 积分兑换页自提点兜底与渠道过滤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** shao 目录积分兑换页增加渠道过滤与自提点兜底逻辑——后端 getProducts 改用 zhao-common available channels（site ∪ user）过滤商品，前端兑换弹窗按商品渠道拉取自提点并根据数量自动处理（0 隐藏 / 1 自动选中 / >1 单选）。

**Architecture:** 后端改动 3 处（zhao-common 抽取 service 方法、controller 重构、zhao-point getProducts 改用 service）；前端改动 1 处（exchange.vue 自提点兜底 + 内联单选 UI）。商品 channel 是 manyToOne，不会重复，无需去重。

**Tech Stack:** Strapi v5 + Vue 3 + uni-app + TypeScript。

**Spec:** `docs/superpowers/specs/2026-07-05-exchange-pickup-location-fallback-design.md`

---

## File Structure

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `basic/plugins/zhao-common/server/src/services/site-config.ts` | 站点配置 + available channels service | 修改（新增方法） |
| `basic/plugins/zhao-common/server/src/controllers/config.ts` | available channels controller | 修改（重构为调用 service） |
| `basic/plugins/zhao-point/server/src/controllers/point.ts` | listProducts controller | 修改（传入 siteId） |
| `basic/plugins/zhao-point/server/src/services/redemption.ts` | getProducts service | 修改（改用 zhao-common service） |
| `shao/pages/exchange/exchange.vue` | 兑换页组件 | 修改（自提点兜底 + 内联单选 UI） |

无新增文件。

---

### Task 1: zhao-common site-config service 新增 getAvailableChannels 方法

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/services/site-config.ts`

- [ ] **Step 1: 在 site-config.ts 末尾（`}` 闭合 `getConfigByDomain` 方法之后、`});` 闭合 export 之前）新增 `getAvailableChannels` 方法**

定位 `basic/plugins/zhao-common/server/src/services/site-config.ts`，找到 `getConfigByDomain` 方法结束的位置（约第 50 行），在其后新增方法：

```ts
  /**
   * 获取用户可访问渠道（site channels ∪ user direct channels，按 numeric id 去重）
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
  },
```

- [ ] **Step 2: 验证 TS 编译**

Run:
```bash
cd e:\code\basic\plugins\zhao-common && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

- [ ] **Step 3: 构建 zhao-common 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-common && npm run build 2>&1 | tail -10
```
Expected: 构建成功，`dist/` 目录更新。

- [ ] **Step 4: 提交**

```bash
cd e:\code && git add basic/plugins/zhao-common/server/src/services/site-config.ts && git commit -m "feat(zhao-common): site-config service 新增 getAvailableChannels 方法"
```

---

### Task 2: zhao-common controller 重构 getAvailableChannels 调用 service

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/controllers/config.ts:861-922`

- [ ] **Step 1: 替换 getAvailableChannels controller 方法体**

定位 `basic/plugins/zhao-common/server/src/controllers/config.ts:861-922`，整个 `getAvailableChannels` 方法替换为：

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
      ctx.body = {
        data: channels,
      };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
```

- [ ] **Step 2: 验证 TS 编译**

Run:
```bash
cd e:\code\basic\plugins\zhao-common && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

- [ ] **Step 3: 构建 zhao-common 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-common && npm run build 2>&1 | tail -10
```
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
cd e:\code && git add basic/plugins/zhao-common/server/src/controllers/config.ts && git commit -m "refactor(zhao-common): getAvailableChannels controller 改为调用 service"
```

---

### Task 3: zhao-point listProducts controller 传入 siteId

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/controllers/point.ts:152-168`

- [ ] **Step 1: 修改 listProducts controller，传入 siteId**

定位 `basic/plugins/zhao-point/server/src/controllers/point.ts:152-168`，整个 `listProducts` 方法替换为：

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
  },
```

- [ ] **Step 2: 验证 TS 编译**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误（siteId 参数已在 getProducts 签名中，Task 4 会添加）。

**注意**：此 Task 3 与 Task 4 必须一起完成才能编译通过。如单独验证 Task 3 会报 `siteId` 参数类型错误，属正常。

---

### Task 4: zhao-point getProducts service 改用 zhao-common available channels

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/redemption.ts:100-152`

- [ ] **Step 1: 替换 getProducts 函数签名与渠道过滤逻辑**

定位 `basic/plugins/zhao-point/server/src/services/redemption.ts:100-152`，整个 `getProducts` 函数替换为：

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

- [ ] **Step 2: 验证 TS 编译**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

- [ ] **Step 3: 构建 zhao-point 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && npm run build 2>&1 | tail -10
```
Expected: 构建成功，`dist/` 目录更新。

- [ ] **Step 4: 提交**

```bash
cd e:\code && git add basic/plugins/zhao-point/server/src/controllers/point.ts basic/plugins/zhao-point/server/src/services/redemption.ts && git commit -m "feat(zhao-point): getProducts 改用 zhao-common available channels 过滤"
```

---

### Task 5: exchange.vue 新增 pickupLocations 状态与 loadPickupLocations 函数

**Files:**
- Modify: `shao/pages/exchange/exchange.vue`

- [ ] **Step 1: 修改 import 语句引入 getPickupLocationList**

定位 `shao/pages/exchange/exchange.vue:266`：

```ts
import { getPointBalance, getPointProductList, redeemPoints } from '../../services/api'
```

改为：

```ts
import { getPointBalance, getPointProductList, redeemPoints, getPickupLocationList } from '../../services/api'
```

- [ ] **Step 2: 新增 pickupLocations 状态**

定位 `shao/pages/exchange/exchange.vue` 的状态定义区（约第 313-333 行，`const phoneFocus = ref(false)` 之后），新增一行：

```ts
const nameFocus = ref(false)
const phoneFocus = ref(false)
const pickupLocations = ref<any[]>([])
```

- [ ] **Step 3: 新增 loadPickupLocations 函数**

在 `shao/pages/exchange/exchange.vue` 的 `selectPickupLocation` 函数（约第 379-382 行）之前新增 `loadPickupLocations` 函数：

```ts
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

- [ ] **Step 4: 验证无 TS 错误**

Run:
```bash
cd e:\code\shao && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

---

### Task 6: exchange.vue 改造 showProductDetail 加自提点兜底逻辑

**Files:**
- Modify: `shao/pages/exchange/exchange.vue:586-628`

- [ ] **Step 1: 改造 showProductDetail 函数**

定位 `shao/pages/exchange/exchange.vue` 的 `showProductDetail` 函数（约第 586-628 行），将整个函数替换为：

```ts
async function showProductDetail(product: Product) {
  // 先赋值，让 computed 生效
  selectedProduct.value = product
  // 根据商品配送类型设置默认配送方式
  if (product.deliveryType === 'self_pickup') {
    form.value.deliveryType = 'self_pickup'
  } else {
    form.value.deliveryType = 'express'
  }
  // 从用户信息自动填充姓名和手机号
  const user = getUser()
  form.value.receiverName = user?.name || user?.nickname || user?.username || ''
  form.value.receiverPhone = user?.phone || ''
  form.value.receiverAddress = ''
  form.value.remark = ''
  form.value.pickupLocationId = ''
  form.value.pickupLocationName = ''

  // 自提点兜底逻辑：拉取商品渠道下的自提点
  pickupLocations.value = []
  if (showPickup.value && product.channelId) {
    await loadPickupLocations(product.channelId)
    if (pickupLocations.value.length === 0) {
      // 无自提点，强制快递
      form.value.deliveryType = 'express'
    } else if (pickupLocations.value.length === 1) {
      // 兜底自动选中
      const loc = pickupLocations.value[0]
      form.value.pickupLocationId = loc.documentId || loc.id
      form.value.pickupLocationName = loc.name
    } else {
      // 多个自提点，清空选择等用户选
      form.value.pickupLocationId = ''
      form.value.pickupLocationName = ''
    }
  }

  // 按扣减顺序自动选中渠道，直到积分够用
  const cost = product.pointsCost || 0
  let remaining = cost

  // 第1级：本渠道（始终参与，无需选择）
  const ownBal = ownChannelBalance.value
  remaining -= Math.min(ownBal, remaining)

  // 第2级：按顺序选中跨渠道，直到够用
  const autoSelected: string[] = []
  if (remaining > 0 && product.allowCrossChannel) {
    for (const ch of availableChannelBalances.value) {
      if (remaining <= 0) break
      autoSelected.push(ch.channelId)
      remaining -= Math.min(ch.balance, remaining)
    }
  }
  form.value.selectedChannels = autoSelected

  // 第3级：如果还不够，自动开启全局积分
  form.value.useGlobalPoints = remaining > 0 && product.allowGlobalPoints && globalBalance.value > 0

  showDetail.value = true
}
```

**关键改动**：
1. 函数改为 `async`
2. 在 `form.value.pickupLocationName = ''` 之后插入自提点兜底逻辑
3. 自提点 = 0 → 强制 express；= 1 → 自动选中；> 1 → 等用户选

- [ ] **Step 2: 验证无 TS 错误**

Run:
```bash
cd e:\code\shao && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

---

### Task 7: exchange.vue 调整 showPickup / canConfirm computed

**Files:**
- Modify: `shao/pages/exchange/exchange.vue:384-392` 与 `500-516`

- [ ] **Step 1: 调整 showPickup computed**

定位 `shao/pages/exchange/exchange.vue:384-387`：

```ts
const showPickup = computed(() => {
  const dt = selectedProduct.value?.deliveryType
  return dt === 'self_pickup' || dt === 'both'
})
```

替换为：

```ts
const showPickup = computed(() => {
  const dt = selectedProduct.value?.deliveryType
  if (!(dt === 'self_pickup' || dt === 'both')) return false
  // 商品有 channelId 但自提点为 0 时隐藏自提选项
  if (selectedProduct.value?.channelId && pickupLocations.value.length === 0) return false
  return true
})
```

- [ ] **Step 2: 调整 canConfirm computed 的 self_pickup 分支**

定位 `shao/pages/exchange/exchange.vue` 的 `canConfirm` computed（约第 500-516 行），找到 `self_pickup` 分支：

```ts
  if (form.value.deliveryType === 'self_pickup') {
    return isValidPhone(form.value.receiverPhone)
  }
```

替换为：

```ts
  if (form.value.deliveryType === 'self_pickup') {
    // 多个自提点时必须选一个
    if (pickupLocations.value.length > 1 && !form.value.pickupLocationId) return false
    return isValidPhone(form.value.receiverPhone)
  }
```

- [ ] **Step 3: 验证无 TS 错误**

Run:
```bash
cd e:\code\shao && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

---

### Task 8: exchange.vue 改造自提点 UI 为内联单选列表

**Files:**
- Modify: `shao/pages/exchange/exchange.vue:217-241` 与 `379-382`

- [ ] **Step 1: 改造自提点 UI 模板块**

定位 `shao/pages/exchange/exchange.vue:217-241` 的整个 `<!-- 自提信息 -->` 区块，替换为：

```html
              <!-- 自提信息 -->
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
                  <view class="form-item">
                    <view class="form-label-row">
                      <text class="form-label">联系电话 <text class="required">*</text></text>
                      <view class="form-actions" v-if="form.receiverPhone">
                        <text class="action-btn" @click="form.receiverPhone = ''">清空电话</text>
                      </view>
                    </view>
                    <input class="form-input" v-model="form.receiverPhone" placeholder="请输入11位手机号（用于核实身份）" type="number" maxlength="11" :focus="phoneFocus" @blur="phoneFocus = false" />
                    <text class="form-error" v-if="form.receiverPhone && !isValidPhone(form.receiverPhone)">请输入正确的11位手机号（1开头）</text>
                  </view>
                </view>
              </view>
```

- [ ] **Step 2: 改造 selectPickupLocation 函数**

定位 `shao/pages/exchange/exchange.vue:379-382`：

```ts
function selectPickupLocation() {
  const channelId = selectedProduct.value?.channelId || ''
  uni.navigateTo({ url: `/pages/pickup-location/list?channelId=${channelId}` })
}
```

替换为：

```ts
function selectPickupLocation(loc: any) {
  form.value.pickupLocationId = loc.documentId || loc.id
  form.value.pickupLocationName = loc.name
}
```

- [ ] **Step 3: 移除 onMounted 中的 selectPickupLocation 监听**

定位 `shao/pages/exchange/exchange.vue` 的 `onMounted`（约第 713-719 行）：

```ts
onMounted(() => {
  uni.$on('selectPickupLocation', (location: any) => {
    form.value.pickupLocationId = location.documentId || location.id
    form.value.pickupLocationName = location.name
  })
  if (checkLoginStatus()) loadData()
})
```

替换为：

```ts
onMounted(() => {
  if (checkLoginStatus()) loadData()
})
```

- [ ] **Step 4: 验证无 TS 错误**

Run:
```bash
cd e:\code\shao && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

---

### Task 9: exchange.vue 新增内联单选列表样式

**Files:**
- Modify: `shao/pages/exchange/exchange.vue`（`<style>` 区块末尾）

- [ ] **Step 1: 在 `<style lang="scss" scoped>` 末尾新增样式**

定位 `shao/pages/exchange/exchange.vue` 的 `<style>` 区块末尾（`</style>` 之前），新增：

```scss
/* 内联自提点单选列表 */
.pickup-radio-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.pickup-radio-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  &.active {
    background: #f0f4ff;
    border-color: #667eea;
  }
}
.pickup-radio-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
  background: #fff;
  .pickup-radio-item.active & {
    background: #667eea;
    border-color: #667eea;
  }
}
.pickup-radio-info {
  flex: 1;
  min-width: 0;
}
.pickup-radio-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.pickup-radio-address {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pickup-radio-phone {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.form-hint-inline {
  font-size: 22rpx;
  color: #999;
  margin-left: 8rpx;
}
```

---

### Task 10: 重启 Strapi 并浏览器验证

**Files:**
- 无文件改动，仅运行时验证

- [ ] **Step 1: 重启 Strapi**

停止当前 Strapi 进程，在 `e:\code\basic` 重新启动：

```bash
cd e:\code\basic && npm run develop
```
Expected: Strapi 启动成功，加载 zhao-common 与 zhao-point 新构建产物。

- [ ] **Step 2: 验证商品列表渠道过滤**

操作：
1. 登录后访问 `http://localhost:5175/#/pages/exchange/exchange`
2. 检查商品列表

Expected:
- 仅显示：全渠道商品 / allowCrossChannel 商品 / 商品渠道在 available channels（site ∪ user）内的商品
- 商品列表无重复项
- site channels 关联的商品也能显示（增量验证）

- [ ] **Step 3: 验证自提点兜底（0 个自提点）**

操作：
1. 找到 `deliveryType` 含 `self_pickup` 且渠道下无自提点的商品
2. 点击兑换

Expected:
- 兑换弹窗中自提选项隐藏
- 配送方式仅显示快递

- [ ] **Step 4: 验证自提点兜底（1 个自提点）**

操作：
1. 找到渠道下仅 1 个自提点的商品
2. 点击兑换

Expected:
- 自提选项可见
- 自提点已自动选中（绿色 ✓）
- 标签显示"（已自动选择）"

- [ ] **Step 5: 验证自提点兜底（多个自提点）**

操作：
1. 找到渠道下有多个自提点的商品
2. 点击兑换

Expected:
- 自提选项可见
- 显示内联单选列表，未选时确认按钮置灰
- 选择一个后确认按钮可点击

- [ ] **Step 6: 验证兑换提交**

操作：
1. 选好自提点，填写手机号
2. 点击确认兑换

Expected:
- 兑换成功
- 接口请求体中 `pickupLocationId` 正确传递

- [ ] **Step 7: 验证 /channels/available 接口仍正常（回归）**

操作：
```bash
curl -H "Authorization: Bearer <token>" http://localhost:1337/api/zhao-common/v1/channels/available
```
Expected: 返回 `{ data: [{ id, documentId, name }, ...] }`，与改造前一致。

---

## Self-Review

**1. Spec coverage:**
- 3.1 改动范围 → Task 1-4（后端）+ Task 5-9（前端）✓
- 3.2 zhao-common service 方法 → Task 1 ✓
- 3.3 controller 重构 → Task 2 ✓
- 3.4 getProducts 改造 → Task 4 ✓
- 3.5 controller 传入 siteId → Task 3 ✓
- 3.6 前端 loadData 简化 → 实际无需改动（原 loadData 已直接 map，无前端过滤；spec 3.6 是说明前端不再加过滤，原代码已满足）✓
- 3.7 兑换弹窗自提点逻辑 → Task 5 (loadPickupLocations) + Task 6 (showProductDetail) ✓
- 3.8 UI 内联单选 → Task 8 ✓
- 3.9 配送方式可选性 → Task 7 ✓
- 3.10 样式 → Task 9 ✓
- 5 边界情况 → Task 6 (无 channelId 不拉取) + Task 7 (length=0 隐藏) + Task 4 (siteId 缺失兜底) ✓
- 7 验收标准 → Task 10 全覆盖 ✓

**2. Placeholder scan:** 无 TBD/TODO，所有代码块完整。

**3. Type consistency:**
- `getAvailableChannels(siteId?, userId?)` 在 Task 1 定义，Task 2/4 调用一致 ✓
- `getProducts({ siteId, ... })` 在 Task 4 定义，Task 3 controller 调用一致 ✓
- `pickupLocations: ref<any[]>` 在 Task 5 定义，Task 6/7/8 使用一致 ✓
- `loadPickupLocations(channelId: string)` 在 Task 5 定义，Task 6 调用一致 ✓
- `selectPickupLocation(loc: any)` 在 Task 8 改造，template 中 `@click="selectPickupLocation(loc)"` 一致 ✓

**4. 关于 spec 3.6 前端 loadData 简化的说明：**
spec 3.6 描述的是"前端不再做二次过滤"，但原 exchange.vue 的 loadData 本来就没有前端过滤逻辑（直接 map 展示）。spec 3.6 的代码块与原代码基本一致，仅 channelId 字段优先取 documentId。需在 Task 5 或单独 Task 中确认原 loadData 的 channelId 映射正确。

**补充检查**：Task 5-9 未涉及 loadData 改动，需确认原 loadData 的 channelId 映射已优先取 documentId。如未取，需在 Task 6 的 showProductDetail 中使用 `product.channel?.documentId || product.channel?.id` 兜底。但 product 是前端 Product 类型，channelId 已在 loadData 中映射。需在 Task 10 验证时确认商品 channelId 为 documentId。

无问题。
