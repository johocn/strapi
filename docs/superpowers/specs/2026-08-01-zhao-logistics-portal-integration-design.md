# zhao_logistics 客户门户对接设计

- **日期**: 2026-08-01
- **模块**: `odoo/custom-addons/zhao_logistics` + `site/`
- **状态**: 设计已批准，待生成实施计划

## 1. 背景与目标

### 1.1 现状

- **Odoo 端**：`zhao_logistics` 已有完整 REST API 控制器层（20 个 endpoint，全部 `auth='user'`）+ 服务层（`logistics_service.py`）+ 运费费率模型 `logistics.freight.rate`（含 `_match_rates()` 匹配逻辑）
- **前端 site**：React 18 + Vite + TailwindCSS + i18next，4 语言（中/日/韩/越），6 页面（Home/Quote/Track/Solutions/Trust/Help），**无后端**，所有数据为 Mock JSON（`src/data/`）
- **缺口**：公开网站无法调用需登录的 API；前端询价/追踪/报价均为 Mock 数据

### 1.2 目标

1. Odoo 新增公开 API 层（`auth='public'`），让前端无需登录即可调用
2. 前端从 Mock 切换到实时 Odoo 数据（追踪/询价/报价），保留 Mock 作为 fallback
3. 询价提交创建 `crm.lead`，进入 Odoo 销售流程

### 1.3 非目标（YAGNI）

- 不做客户登录/注册系统（公网询价场景，YAGNI）
- 不做前端订单管理（仅询价+追踪+报价）
- 不做 WebSocket 实时推送（追踪用轮询即可）

## 2. Odoo 公开 API 控制器

新增 `controllers/logistics_public_controller.py`，`auth='public'`，4 个 endpoint。

### 2.1 Endpoint 定义

| Endpoint | 方法 | 认证 | CSRF | 功能 |
|----------|------|------|------|------|
| `/zhao_logistics/public/v1/tracking` | GET | public | False | 按订单号查追踪 |
| `/zhao_logistics/public/v1/quote` | POST | public | False | 提交询价创建 lead |
| `/zhao_logistics/public/v1/price-estimate` | GET | public | False | 运费估算 |
| `/zhao_logistics/public/v1/routes` | GET | public | False | 公开线路列表 |

**注意**：POST 询价 `csrf=False` 因 public 用户无 session token，改用限流 + CORS 防护。

### 2.2 安全机制

**限流**：IP 维度，每分钟 30 次。用 `request.env['ir.config_parameter']` 存储计数器（或内存字典 + 时间窗），超限返回 429。

**CORS**：响应头 `Access-Control-Allow-Origin` 白名单（site 域名，从系统参数配置）。OPTIONS 预检请求直接返回 204。

**数据脱敏**：追踪 API 仅返回订单号、物流状态、时间线节点（状态/时间/地点/描述），**不返回**客户姓名、电话、地址、金额。

**权限**：`auth='public'` + `sudo()` 提升权限读取订单/创建 lead。public 用户无业务权限，必须 sudo。

### 2.3 追踪 API 详情

```
GET /zhao_logistics/public/v1/tracking?tracking_no=S00025

响应:
{
  "ok": true,
  "data": {
    "tracking_no": "S00025",
    "logistics_state": "in_transit",
    "origin": "上海",
    "destination": "东京",
    "eta": "2026-08-05",
    "nodes": [
      {
        "status": "done",
        "time": "2026-08-01 10:00",
        "location": "上海仓库",
        "desc": "已入库"
      },
      {
        "status": "active",
        "time": "2026-08-01 15:00",
        "location": "上海港",
        "desc": "已装船"
      }
    ]
  }
}
```

订单号不存在时返回 `{ok: false, error: "未找到订单", code: "not_found"}`。

### 2.4 询价 API 详情

```
POST /zhao_logistics/public/v1/quote
Content-Type: application/json

{
  "origin": "上海",
  "destination": "东京",
  "cargoType": "fba",
  "weight": 100,
  "volume": 0.5,
  "extraOptions": {"ioss": "IOSS12345"},
  "contactName": "田中",
  "contactMethod": "email",
  "contactValue": "tanaka@example.com",
  "remark": "易碎品",
  "utmSource": "google",
  "lang": "jp"
}

响应:
{
  "ok": true,
  "data": {
    "lead_id": 42,
    "lead_name": "询价-20260801-001"
  }
}
```

### 2.5 报价估算 API 详情

```
GET /zhao_logistics/public/v1/price-estimate?origin_country=CN&dest_country=JP&weight=100&volume=0.5&transport_mode=sea

响应:
{
  "ok": true,
  "data": {
    "min_price": 800.00,
    "max_price": 1200.00,
    "currency": "USD",
    "billing_basis": "weight",
    "matched_rates_count": 3
  }
}
```

无匹配费率时返回 `{ok: false, error: "无匹配费率", code: "no_rate"}`。

### 2.6 线路列表 API 详情

```
GET /zhao_logistics/public/v1/routes

响应:
{
  "ok": true,
  "data": [
    {
      "origin_country": "中国",
      "dest_country": "日本",
      "transport_mode": "sea",
      "price_range": [800, 1200],
      "currency": "USD",
      "transit_days": "5-7天"
    }
  ]
}
```

## 3. 服务层扩展

在 `controllers/logistics_service.py` 的 `LogisticsService` 类新增 4 个方法。

### 3.1 get_tracking_by_name(tracking_no)

```
1. 按 name=tracking_no 搜索 sale.order（limit=1）
2. 不存在 → raise LogisticsServiceError('未找到订单', 'not_found')
3. 构建脱敏响应:
   - tracking_no: order.name
   - logistics_state: order.logistics_state
   - origin: order.shipping_port_origin.name（脱敏，仅港口名）
   - destination: order.shipping_port_dest.name
   - eta: order.voyage_id.arrival_date（或空）
   - nodes: 从 order.tracking_event_ids 映射，仅返回 status/time/location/desc
4. 状态映射（tracking_event.from_state → 前端 status）:
   - 已发生的事件（timestamp <= now）且 to_state == order.logistics_state → active（当前节点）
   - 已发生的事件且 to_state != order.logistics_state → done（历史节点）
   - order.logistics_state == 'exception' → 该节点标记 alert
   - 未发生的事件不展示（tracking_event 都是已发生的，无未来节点）
```

### 3.2 create_lead_from_quote(params)

```
1. 校验必填: contact_name, contact_value（至少一种联系方式）
2. 构建 lead name: f"询价-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
3. 创建 crm.lead:
   - name: lead_name
   - partner_name: params.contact_name
   - contact_name: params.contact_name
   - email_from / phone: 根据 contact_method 填充
   - city: params.destination
   - description: 拼接货物详情（起运地/目的地/货物类型/重量/体积/备注/动态字段/UTM来源/语言）
   - team_id: 默认销售团队（从 ir.config_parameter 取 'zhao_logistics.default_sale_team_id'）
   - user_id: False（未分配）
   - type: 'lead'
4. 返回 {lead_id, lead_name}
```

### 3.3 estimate_price(origin_country, dest_country, weight, volume, transport_mode)

```
1. 查 res.country by code (CN/JP/KR/VN)
2. 搜索 logistics.freight.rate:
   domain = [
     ('origin_country_id', '=', origin.id),
     ('dest_country_id', '=', dest.id),
     ('transport_mode', '=', transport_mode),
     ('active', '=', True),
     '|', ('date_start', '=', False), ('date_start', '<=', today),
     '|', ('date_end', '=', False), ('date_end', '>=', today),
   ]
3. 无匹配 → raise LogisticsServiceError('无匹配费率', 'no_rate')
4. 计算价格区间:
   - 按重量计费: price = weight * unit_price
   - 按体积计费: price = volume * unit_price
   - 取 min(price) 和 max(price) 作为区间
   - 应用 min_charge: price = max(price, min_charge)
5. 返回 {min_price, max_price, currency, billing_basis, matched_rates_count}
```

### 3.4 list_public_routes()

```
1. 搜索 active=True 的 logistics.freight.rate，按 origin_country_id + dest_country_id + transport_mode 去重
2. 每条线路聚合:
   - origin_country / dest_country
   - transport_mode
   - price_range: [min(unit_price), max(unit_price)] × 参考重量 100kg
   - currency
   - transit_days: 从费率表无此字段，返回空字符串（前端用 Mock 的时效数据补充）
3. 返回列表
```

## 4. 前端 API 客户端

### 4.1 新增 site/src/lib/api.ts

```typescript
const API_BASE = import.meta.env.VITE_ODOO_API_BASE || 'http://localhost:8069';

interface ApiResponse<T> { ok: boolean; data?: T; error?: string; code?: string }

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    signal: AbortSignal.timeout(10000),
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error(json.error || 'API Error');
  return json.data as T;
}

export const api = {
  fetchTracking: (trackingNo: string) =>
    fetchApi<TrackingResult>(`/zhao_logistics/public/v1/tracking?tracking_no=${encodeURIComponent(trackingNo)}`),
  submitQuote: (data: QuoteFormData) =>
    fetchApi<{lead_id: number; lead_name: string}>('/zhao_logistics/public/v1/quote', {
      method: 'POST', body: JSON.stringify(data),
    }),
  estimatePrice: (params: PriceEstimateParams) =>
    fetchApi<PriceEstimate>(`/zhao_logistics/public/v1/price-estimate?${new URLSearchParams(params)}`),
  fetchRoutes: () =>
    fetchApi<RouteItem[]>('/zhao_logistics/public/v1/routes'),
};
```

### 4.2 页面改造

**Track.tsx**：
- 查询时调 `api.fetchTracking(trackingNo)`
- 失败时 fallback 到 `src/data/tracking.ts` Mock 数据
- 成功时映射 Odoo 响应到现有 `TrackingResult` 类型

**Quote.tsx**：
- 提交时调 `api.submitQuote(formData)`
- 成功后显示 Odoo 返回的 `lead_name`（如"询价-20260801-001"）
- 失败时显示错误提示，保留表单内容

**PriceCalculator.tsx**：
- 输入完成后调 `api.estimatePrice(params)`
- 实时显示 Odoo 运费区间
- 失败时 fallback 到 Mock 价格表

**routes.ts / Home.tsx**：
- 在 `Home.tsx` 的 `useEffect` 中调 `api.fetchRoutes()` 预加载线路数据，存入 Zustand store
- 失败时 fallback 到静态 `src/data/routes.ts` 默认数据
- `Routes.tsx` 组件从 store 读取，有 API 数据用 API，无则用静态

### 4.3 环境配置

新增 `site/.env`:
```
VITE_ODOO_API_BASE=http://localhost:8069
```

## 5. 限流实现

在 `logistics_public_controller.py` 中实现简易限流：

```python
import time
from collections import defaultdict

# 进程内 IP 计数器（单进程部署足够；多进程需用 redis）
_rate_limit_store = defaultdict(list)  # {ip: [timestamp, ...]}

def _check_rate_limit(self):
    ip = request.httprequest.remote_addr or 'unknown'
    now = time.time()
    window = 60  # 60 秒
    max_requests = 30  # 每分钟 30 次
    # 清理过期时间戳
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < window]
    if len(_rate_limit_store[ip]) >= max_requests:
        return False
    _rate_limit_store[ip].append(now)
    return True
```

每个公开 endpoint 调用前检查 `_check_rate_limit()`，超限返回 429。

## 6. CORS 实现

在 `logistics_public_controller.py` 的 `_json()` 和 `_ok()` / `_err()` 方法中添加 CORS 头：

```python
def _json(self, data, status=200):
    response = request.make_response(
        json.dumps(data, ensure_ascii=False, default=str),
        headers=[
            ('Content-Type', 'application/json; charset=utf-8'),
            ('Access-Control-Allow-Origin', self._cors_origin()),
            ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type'),
        ],
    )
    response.status_code = status
    return response

def _cors_origin(self):
    """从系统参数读取允许的域名，默认 * """
    allowed = request.env['ir.config_parameter'].sudo().get_param(
        'zhao_logistics.cors_allowed_origins', '*')
    origin = request.httprequest.headers.get('Origin', '')
    if allowed == '*' or origin in allowed.split(','):
        return origin or '*'
    return allowed.split(',')[0] if allowed else '*'
```

OPTIONS 预检请求处理：

```python
@http.route('/zhao_logistics/public/v1/<path:subpath>',
            type='http', auth='public', methods=['OPTIONS'], csrf=False)
def public_options(self, **kw):
    return request.make_response('', headers=[
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
        ('Access-Control-Allow-Headers', 'Content-Type'),
    ])
```

## 7. 文件结构

```
Odoo 端新增/修改:
  controllers/logistics_public_controller.py  # 新增：公开 API 控制器
  controllers/logistics_service.py            # 修改：新增 4 个公开服务方法
  controllers/__init__.py                     # 修改：导入新 controller
  tests/test_public_api.py                    # 新增：公开 API 测试

前端 site 新增/修改:
  src/lib/api.ts                              # 新增：API 客户端
  src/pages/Track.tsx                         # 修改：调 API + fallback Mock
  src/pages/Quote.tsx                         # 修改：提交调 API
  src/components/home/PriceCalculator.tsx     # 修改：调 API 实时估算
  src/data/routes.ts                          # 修改：启动时预加载 API
  .env                                        # 新增：API base URL 配置
```

## 8. 测试策略

`tests/test_public_api.py`，`@tagged('post_install', '-at_install')`，使用 `HttpCase`（URL 测试）：

1. **追踪 API 正常**：创建订单+追踪事件，GET /public/v1/tracking?tracking_no=xxx，验证脱敏响应
2. **追踪 API 不存在**：查询不存在的订单号，验证 404 + not_found
3. **询价 API 正常**：POST /public/v1/quote，验证创建 crm.lead + 返回 lead_name
4. **询价 API 缺联系方式**：contact_name 和 contact_value 都空，验证 400
5. **报价估算 API 正常**：创建 freight.rate，GET /public/v1/price-estimate，验证价格区间
6. **报价估算 API 无匹配**：查询不存在的线路，验证 no_rate
7. **线路列表 API**：创建多条 rate，GET /public/v1/routes，验证去重
8. **限流测试**：连续请求 31 次，验证第 31 次返回 429

## 9. 风险点与缓解

| 风险 | 缓解 |
|------|------|
| 公开 API 被滥用（DDoS/爬数据） | IP 限流 30 次/分钟 + CORS 白名单 + 追踪数据脱敏 |
| 询价 spam（批量提交假询盘） | 限流 + lead 不自动转订单（人工审核） |
| 进程内限流多进程失效 | 单进程部署足够；多进程需升级为 redis（YAGNI 暂不做） |
| 前端 API 不可用 | fallback 到 Mock 数据，保证基本可用性 |
| CORS 配置错误 | 系统参数配置允许域名，默认 * 开发友好 |
| Odoo public 用户权限不足 | sudo() 提升权限，仅暴露脱敏数据 |
