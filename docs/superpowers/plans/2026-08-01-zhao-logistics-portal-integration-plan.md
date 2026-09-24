# 实施计划：客户门户对接

- **Spec**: `docs/superpowers/specs/2026-08-01-zhao-logistics-portal-integration-design.md`
- **目标**: Odoo 公开 API 层 + 前端 site 对接

## Task 1: 扩展服务层 — 4 个公开方法

**文件**: `odoo/custom-addons/zhao_logistics/controllers/logistics_service.py`

在 `LogisticsService` 类末尾新增：
- `get_tracking_by_name(tracking_no)`: 按 name 查 sale.order，返回脱敏追踪数据（按 spec 3.1）
- `create_lead_from_quote(params)`: 校验必填→创建 crm.lead→返回 {lead_id, lead_name}（按 spec 3.2）
- `estimate_price(origin_country, dest_country, weight, volume, transport_mode)`: 查 freight.rate→算价格区间（按 spec 3.3）
- `list_public_routes()`: 聚合去重 freight.rate→返回线路列表（按 spec 3.4）

**验证**: `python -c "import ast; ast.parse(open(...).read())"`

## Task 2: 创建公开 API 控制器

**文件**: `odoo/custom-addons/zhao_logistics/controllers/logistics_public_controller.py`

- `LogisticsPublicController(http.Controller)`:
  - `_check_rate_limit()`: IP 限流 30 次/分钟（进程内字典，按 spec 第 5 节）
  - `_cors_origin()`: 从 ir.config_parameter 读 CORS 白名单（按 spec 第 6 节）
  - `_json()` / `_ok()` / `_err()` / `_call()`: 复用主 controller 模式 + CORS 头
  - `tracking_get`: GET /public/v1/tracking?tracking_no=xxx
  - `quote_post`: POST /public/v1/quote
  - `price_estimate_get`: GET /public/v1/price-estimate
  - `routes_get`: GET /public/v1/routes
  - `public_options`: OPTIONS /public/v1/<path> 预检
  - 全部 `auth='public'`, `csrf=False`

**修改**: `controllers/__init__.py` 追加 `from . import logistics_public_controller`

**验证**: Python ast.parse

## Task 3: 创建公开 API 测试

**文件**: `odoo/custom-addons/zhao_logistics/tests/test_public_api.py`

`@tagged('post_install', '-at_install')`，继承 `TransactionTestCase`，8 个用例（按 spec 第 8 节）：
1. 追踪正常
2. 追踪不存在
3. 询价正常
4. 询价缺联系方式
5. 报价正常
6. 报价无匹配
7. 线路列表
8. 限流

**修改**: `tests/__init__.py` 追加导入

**验证**: Python ast.parse

## Task 4: 前端 API 客户端

**文件**: `site/src/lib/api.ts`

按 spec 4.1 实现：API_BASE 从 env 读取、fetchApi 封装、4 个方法（fetchTracking/submitQuote/estimatePrice/fetchRoutes）、10 秒超时。

**新增**: `site/.env` — `VITE_ODOO_API_BASE=http://localhost:8069`

**验证**: `cd site && npx tsc --noEmit`

## Task 5: 前端页面改造

**修改**:
- `site/src/pages/Track.tsx`: 查询调 api.fetchTracking + fallback Mock
- `site/src/pages/Quote.tsx`: 提交调 api.submitQuote + 显示 lead_name
- `site/src/components/home/PriceCalculator.tsx`: 调 api.estimatePrice
- `site/src/pages/Home.tsx`: useEffect 预加载 fetchRoutes

**验证**: `cd site && npx tsc --noEmit`

## Task 6: 集成验证

- Odoo 升级模块 + 运行测试
- 前端 tsc 编译检查
