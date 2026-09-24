# 自提点 + 商品销售模式 设计

## 概述

为积分兑换系统增加：
1. 自提点（pickup-location）功能，支持店铺名称、地理位置、导航、电话、营业时间、营业执照
2. 商品销售模式扩展：纯积分、纯售价、积分+售价混合（到店支付）

## 需求决策

| 决策项 | 结论 |
|--------|------|
| 商品与渠道关系 | 一对一：每个商品属于一个渠道 |
| 自提点与渠道关系 | 多对多：一个自提点可服务多个渠道 |
| 用户选点时机 | 下单时选择 |
| 导航方式 | 应用内地图导航（腾讯地图） |
| 营业执照 | 后台管理上传，C端可查看 |
| 商品销售模式 | points_only / purchase_only / hybrid |
| 混合定价 | 固定比例（如500积分+¥29.9） |
| 混合支付流程 | 先扣积分，售价部分到店支付 |
| 在线支付 | 本期不接入，售价部分到店支付 |

## 数据模型

### pickup-location Content Type（新建）

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string(100), required | 店铺名称 |
| address | text | 详细地址 |
| latitude | decimal(10,7) | 纬度 |
| longitude | decimal(10,7) | 经度 |
| phone | string(20) | 联系电话 |
| businessHours | string(200) | 营业时间，如"周一至周五 9:00-18:00" |
| businessLicense | media(single, image) | 营业执照图片 |
| coverImage | media(single, image) | 门头/封面图 |
| description | text | 自提点描述/备注 |
| status | enum(active/inactive), default: active | 状态 |
| sortOrder | integer, default: 0 | 排序 |
| channels | relation: manyToMany → plugin::zhao-channel.channel | 关联渠道 |
| deletedAt | datetime | 软删除 |

### point-product 变更

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| channel | relation: manyToOne → plugin::zhao-channel.channel | 所属渠道（一对一） |
| salesMode | enum(points_only/purchase_only/hybrid), default: points_only | 销售模式 |
| price | decimal(10,2) | 售价（purchase_only 或 hybrid 时使用） |
| pointsCost | integer | 积分价格（现有字段，points_only 或 hybrid 时使用） |

`deliveryType` 枚举不变（self_pickup/express/both）。

**销售模式说明**：
- `points_only`：纯积分兑换，用户支付 `pointsCost` 积分
- `purchase_only`：纯售价购买，用户到店支付 `price` 金额，不消耗积分
- `hybrid`：混合模式，用户支付 `pointsCost` 积分 + 到店支付 `price` 金额

### point-redemption 变更

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| pickupLocation | relation: manyToOne → plugin::zhao-point.pickup-location | 用户选择的自提点 |
| salesMode | enum(points_only/purchase_only/hybrid) | 下单时的销售模式快照 |
| priceAmount | decimal(10,2) | 到店支付金额（hybrid/purchase_only 时） |
| pointsAmount | integer | 积分支付数量（hybrid/points_only 时） |

### 关系图

```
channel ←→ pickup-location (多对多)
channel  ← point-product (一对多：商品属于渠道)
pickup-location ← point-redemption (一对多)
point-product ← point-redemption (多对一)
```

用户下单流程：
1. 商品属于渠道 → 渠道关联自提点 → 用户从渠道自提点列表选择
2. 根据商品 salesMode 决定支付方式
3. 选择结果 + 支付信息写入兑换记录

## C端交互

### 商品列表/详情页增强

- 商品卡片显示销售模式标签：
  - 纯积分：显示"500积分"
  - 纯售价：显示"¥29.9"
  - 混合：显示"500积分 + ¥29.9"
- hybrid 模式商品详情页标注"到店支付 ¥XX"

### 兑换下单流程

1. 用户选择配送方式（自提/快递）
2. 自提方式下，显示"选择自提点"区域
3. 点击进入自提点列表页，展示该渠道下所有 `active` 状态自提点
4. 列表项：店铺名称、地址、距离、营业时间、电话图标
5. 选中自提点后返回兑换页
6. 确认兑换：
   - `points_only`：扣积分 → 生成提货码
   - `purchase_only`：不扣积分 → 生成提货码 → 提示"到店支付 ¥XX"
   - `hybrid`：扣积分 → 生成提货码 → 提示"到店另付 ¥XX"

### 自提点列表页

- 店铺名称、封面图
- 地址 + 距离
- 营业时间
- 电话图标（点击拨打）
- 选中状态

### 自提点详情页

- 店铺名称 + 封面图
- 地址 + 导航按钮（应用内腾讯地图导航）
- 联系电话（点击拨打）
- 营业时间
- 营业执照（点击查看大图）
- 地图位置展示（uni-app map 组件）

### 兑换记录增强

- 自提订单显示自提点名称
- hybrid/purchase_only 订单显示到店支付金额
- 提货码弹窗中增加自提点地址 + 到店金额信息

## 后台管理

### 自提点管理页（pages/points/pickup-locations.vue）

- 列表：名称、地址、状态、关联渠道数
- 新增/编辑弹窗：
  - 店铺名称、详细地址
  - 经纬度（地图选点，腾讯地图 JavaScript API）
  - 联系电话、营业时间
  - 营业执照上传（MediaPicker）
  - 封面图上传（MediaPicker）
  - 描述
  - 关联渠道选择（多选）
  - 状态开关
- 删除（软删除）

### 商品管理页增强

- 新增"销售模式"选择：纯积分 / 纯售价 / 混合
- 选择"纯售价"或"混合"时，显示"售价"输入框
- 选择"纯积分"或"混合"时，显示"积分"输入框
- 商品卡片显示销售模式标签

### 仪表盘入口

积分中心区域添加"自提点管理"模块入口

### 兑换审核页增强

- 自提订单显示自提点名称
- hybrid/purchase_only 订单显示到店支付金额
- 扫码兑付时显示自提点信息 + 待收金额

## 后端API

### 公开路由

| 方法 | 路径 | Handler | 说明 |
|------|------|---------|------|
| GET | /v1/point/pickup-locations | point.listPickupLocations | 获取自提点列表（支持 channelId 筛选） |
| GET | /v1/point/pickup-locations/:id | point.getPickupLocation | 自提点详情 |

### 管理路由

| 方法 | 路径 | Handler | 权限 | 说明 |
|------|------|---------|------|------|
| GET | /admin/pickup-locations | point-admin.findPickupLocations | pickup-location.read | 列表 |
| GET | /admin/pickup-locations/:documentId | point-admin.findOnePickupLocation | pickup-location.read | 详情 |
| POST | /admin/pickup-locations | point-admin.createPickupLocation | pickup-location.create | 创建 |
| PUT | /admin/pickup-locations/:documentId | point-admin.updatePickupLocation | pickup-location.update | 更新 |
| DELETE | /admin/pickup-locations/:documentId | point-admin.deletePickupLocation | pickup-location.delete | 删除 |

### 兑换接口变更

`POST /v1/my/point/redeem` 新增参数：
- `pickupLocationId` — 自提点ID
- 兑换逻辑根据商品 `salesMode` 调整：
  - `points_only`：扣积分（现有逻辑）
  - `purchase_only`：不扣积分，记录 priceAmount
  - `hybrid`：扣积分 + 记录 priceAmount

`createRedemption` 变更：
- 写入 `pickupLocation` 关联
- 写入 `salesMode`、`priceAmount`、`pointsAmount` 快照
- `purchase_only` 模式不扣积分
- `hybrid` 模式只扣积分部分

## 地图集成

### 腾讯地图SDK

- C端：uni-app `map` 组件（底层腾讯地图）
- 后台管理：腾讯地图 JavaScript API 地图选点
- manifest.json 配置腾讯地图 key
- 导航：`uni.openLocation()` 打开应用内导航

### 距离计算

- C端获取用户定位后，计算与各自提点直线距离
- 列表按距离排序

## 涉及文件

### 后端（新建）

- `plugins/zhao-point/server/src/content-types/pickup-location/schema.json`
- `plugins/zhao-point/server/src/content-types/pickup-location/lifecycles.ts`

### 后端（修改）

- `plugins/zhao-point/server/src/content-types/point-product/schema.json` — 新增 channel、salesMode、price 字段
- `plugins/zhao-point/server/src/content-types/point-redemption/schema.json` — 新增 pickupLocation、salesMode、priceAmount、pointsAmount
- `plugins/zhao-point/server/src/services/redemption.ts` — createRedemption 支持 pickupLocationId、salesMode 逻辑
- `plugins/zhao-point/server/src/controllers/point.ts` — 新增 listPickupLocations、getPickupLocation
- `plugins/zhao-point/server/src/controllers/point-admin.ts` — 新增 pickup-location CRUD
- `plugins/zhao-point/server/src/routes/content-api.ts` — 新增路由

### C端（新建）

- `shao/pages/pickup-location/list.vue` — 自提点列表页
- `shao/pages/pickup-location/detail.vue` — 自提点详情页

### C端（修改）

- `shao/pages/exchange/exchange.vue` — 兑换页增加自提点选择 + 销售模式展示
- `shao/pages/redeem-record/redeem-record.vue` — 兑换记录显示自提点 + 到店金额
- `shao/services/api.ts` — 新增自提点API
- `shao/pages.json` — 注册新页面
- `shao/manifest.json` — 配置腾讯地图key

### 后台管理（新建）

- `web/pages/points/pickup-locations.vue` — 自提点管理页

### 后台管理（修改）

- `web/pages/points/products.vue` — 商品表单增加销售模式 + 售价字段
- `web/pages/dashboard/index.vue` — 添加自提点管理入口
- `web/pages/points/exchanges.vue` — 显示自提点 + 到店金额
- `web/pages/points/pickup-verify.vue` — 显示自提点 + 待收金额
- `web/src/api/points.js` — 新增自提点API
- `web/pages.json` — 注册新页面
