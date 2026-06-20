# zhao-point 前端 API 手册

## 通用说明

### 接口分类

| 类型 | 说明 | URL 前缀 | 认证方式 |
|------|------|---------|---------|
| C 端公开接口 | 规则/商品浏览 | `/api/zhao-point/v1/` | 无 |
| C 端用户接口 | 个人积分操作 | `/api/zhao-point/v1/my/` | zhao-auth JWT |
| C 端管理员接口 | 积分发放/扣除 | `/api/zhao-point/v1/admin/` | zhao-auth JWT |
| Admin 接口 | Strapi 后台管理 | `/admin/plugins/zhao-point/` | Strapi admin session |

### Admin 接口

Admin 接口属于 Strapi 后台路由，详细接口见 [backend-content-api.md](./backend-content-api.md)。

### C 端接口调用

通过 request.js 拦截器自动携带 Token，URL 前缀为 `BASE_API` = `http://localhost:1337/api`。

### 数据转换函数

- `extractList(res)`: 从 Strapi 列表响应提取 `{ list: [...], pagination: { page, pageSize, total } }`
- `extractItem(res)`: 从 Strapi 单项响应提取数据对象

---

## 一、C 端公开接口

基础路径: `/api/zhao-point/v1`

### 1.1 积分规则

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/point/rules` | 查询积分规则 |

#### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| action | string | 按动作过滤 |
| category | string | 按分类过滤 |

### 1.2 兑换商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/point/products` | 商品列表 |
| GET | `/point/products/:id` | 商品详情 |

#### GET /point/products 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 状态过滤（默认 on_shelf） |
| deliveryType | string | 配送方式过滤 |
| page | integer | 页码 |
| pageSize | integer | 每页条数 |

### 1.3 兑换比率

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/point/exchange-rate` | 查询积分兑换比率 |

---

## 二、C 端用户接口

基础路径: `/api/zhao-point/v1/my`

**认证**: `Authorization: Bearer <token>`

### 2.1 积分查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/point/balance` | 查询积分余额 |
| GET | `/point/records` | 查询积分记录 |
| GET | `/point/statistics` | 查询积分统计 |

#### GET /point/records 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码 |
| pageSize | integer | 每页条数 |
| action | string | 按动作过滤 |
| type | string | 按类型过滤 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 2.2 积分兑换

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/point/redeem` | 兑换商品 |
| GET | `/point/redeem/records` | 查询兑换记录 |

#### POST /point/redeem 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | **是** | 商品 ID |
| itemName | string | 否 | 商品名称 |
| pointsCost | integer | **是** | 消耗积分 |
| quantity | integer | **是** | 兑换数量 |
| deliveryType | string | **是** | 配送方式 |
| receiverName | string | 否 | 收件人姓名 |
| receiverPhone | string | 否 | 收件人电话 |
| receiverAddress | string | 否 | 收件人地址 |
| remark | string | 否 | 备注 |

#### GET /point/redeem/records 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 按状态过滤 |
| page | integer | 页码 |
| pageSize | integer | 每页条数 |

### 2.3 积分核销

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/point/verify/qrcode` | 生成核销二维码 |
| POST | `/point/verify/scan` | 扫码核销 |
| POST | `/point/verify/manual` | 手动核销 |
| GET | `/point/verify/log` | 查询核销记录 |

#### POST /point/verify/qrcode 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 否 | 渠道 ID |
| direction | string | 否 | 核销方向 |

#### POST /point/verify/scan 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | **是** | 二维码 token |
| location | string | 否 | 位置信息 |

#### POST /point/verify/manual 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| verifiedUserId | string | **是** | 被核销用户 ID |
| channelId | string | 否 | 渠道 ID |
| direction | string | 否 | 核销方向 |
| remark | string | 否 | 备注 |

#### GET /point/verify/log 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| direction | string | 核销方向 |
| status | string | 状态 |
| page | integer | 页码 |
| pageSize | integer | 每页条数 |

### 2.4 可用动作

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/point/eligible-actions` | 查询可用积分动作 |

#### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| channelId | string | 渠道 ID |

---

## 三、C 端管理员接口

基础路径: `/api/zhao-point/v1/admin`

**认证**: `Authorization: Bearer <token>`，需 `point.grant` 权限

### 3.1 积分发放/扣除

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/point/earn` | 发放积分 |
| POST | `/point/deduct` | 扣除积分 |

#### POST /point/earn 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | string | **是** | 积分动作标识 |
| source | string | 否 | 来源 |
| method | string | 否 | 获取方式 |
| remark | string | 否 | 备注 |
| orderId | string | 否 | 关联订单 ID |
| channelId | string | 否 | 关联渠道 ID |

#### POST /point/deduct 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | string | **是** | 积分动作标识 |
| points | integer | **是** | 扣除积分数 |
| source | string | 否 | 来源 |
| method | string | 否 | 扣除方式 |
| remark | string | 否 | 备注 |
| orderId | string | 否 | 关联订单 ID |
