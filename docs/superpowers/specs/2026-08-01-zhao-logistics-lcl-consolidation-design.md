# zhao_logistics LCL 拼箱池设计

- **日期**: 2026-08-01
- **模块**: `odoo/custom-addons/zhao_logistics`
- **版本**: 19.0.1.0.0
- **状态**: 设计已批准，待生成实施计划

## 1. 背景与目标

### 1.1 现状

`zhao_logistics` 已实现订单→入库→打包→集装箱→船运→派送全链路，含邮件解析下单、运费计算结算、退货逆向物流、海关报关单四大模块。当前订单与集装箱的关联通过 `sale.order.container_ids`（m2m）与 `logistics.container.order_ids`（m2m）手工维护，缺少"待拼箱队列 + 按目的港分组 + 容量优化分配"的机制。

### 1.2 目标

LCL 拼箱池提供：

1. **可视队列**：按目的港分组展示所有已打包未装箱的订单
2. **智能推荐**：Best-Fit-Decreasing (BFD) 背包算法自动生成拼箱方案，最大化柜容利用率
3. **手工调整**：操作员可在确认前修改柜型、移动订单归属
4. **一键执行**：确认后自动创建集装箱、关联订单/包裹、更新物流状态

### 1.3 非目标（YAGNI）

- 不做历史拼箱方案审计追溯（如需可从 container 的 mail.thread 追溯）
- 不做多维背包（体积+重量双约束联合优化），仅做体积优先 + 重量硬约束校验
- 不做自动航次分配（航次由操作员在向导中可选填入）

## 2. 数据模型

新增 2 个瞬态模型（TransientModel），无持久化模型。

### 2.1 logistics.consolidation.wizard

| 字段 | 类型 | 说明 |
|------|------|------|
| `destination_port_id` | Many2one → `logistics.port` | 目的港（必填） |
| `voyage_id` | Many2one → `logistics.voyage` | 航次（可选，执行时写入集装箱） |
| `state` | Selection(`draft`,`recommended`) | 向导状态，默认 `draft` |
| `container_ids` | One2many → `logistics.consolidation.wizard.container` | 推荐柜明细 |
| `total_orders` | Integer, compute | 待拼订单总数 |
| `total_cbm` | Float, compute | 待拼总体积 |
| `total_weight` | Float, compute | 待拼总重量 |

**方法**：

- `action_generate_recommendation()`：运行 BFD 算法生成推荐柜明细
- `action_confirm()`：创建真实集装箱并关联订单/包裹

### 2.2 logistics.consolidation.wizard.container

| 字段 | 类型 | 说明 |
|------|------|------|
| `wizard_id` | Many2one → `logistics.consolidation.wizard` | 所属向导 |
| `container_type` | Selection(`20gp`,`40gp`,`40hq`) | 柜型，默认 `40gp` |
| `max_cbm` | Float, compute | 柜型最大体积（20gp=33, 40gp=67, 40hq=76） |
| `max_weight` | Float, compute | 柜型最大载重（统一 28000 KG） |
| `order_ids` | Many2many → `sale.order` | 该柜分配的订单 |
| `planned_cbm` | Float, compute | `sum(order_ids.total_volume_cbm)` |
| `planned_weight` | Float, compute | `sum(order_ids.package_ids.shipping_weight)` |
| `utilization_pct` | Float, compute | `planned_cbm / max_cbm * 100` |

### 2.3 设计要点

- `order_ids` 直接 m2m 到 `sale.order`，复用其已有的 `total_volume_cbm` compute 字段，无需新建 order line 模型
- 重量从 `order.package_ids.shipping_weight` 实时汇总
- 柜型上限常量复用 `logistics.container._compute_container_limit` 的逻辑：`{'20gp': (28000, 33), '40gp': (28000, 67), '40hq': (28000, 76)}`

## 3. 拼箱池队列视图

队列是对 `sale.order` 的筛选视图，无新模型。

- **视图类型**: Kanban，按 `shipping_port_dest` 分组
- **筛选域**: `[('logistics_state','=','packing'),('container_ids','=',False),('total_package_qty','>',0)]`（用 `total_package_qty > 0` 替代 `package_ids != False`，因前者 store=True 性能更优）
- **卡片字段**: 订单号、客户、总体积CBM、总重量、包裹数
- **向导触发**: 通过 `binding_model_id` 绑定到 sale.order 动作菜单（详见 7.4），kanban 选中订单后从"动作"菜单触发"生成拼箱方案"，`destination_port_id` 预填逻辑：取选中订单共同的 `shipping_port_dest`；若选中订单目的港不一致或未选中则留空

## 4. 向导流程

1. 从拼箱池队列点击"生成拼箱方案" → 打开向导，`destination_port_id` 预填
2. 点击"生成推荐方案" → 运行 BFD 算法 → 生成 `container_ids` 明细（每行=一个推荐柜，内含 order_ids）
3. 操作员手工调整：
   - 修改柜型（20gp/40gp/40hq 下拉）
   - 在推荐柜之间移动订单（从 order_ids 中增删）
   - 实时看到 `utilization_pct` 与超限红色告警
4. 点击"确认执行" → 创建真实 `logistics.container`、关联 order/package、更新 `logistics_state='containerized'`

## 5. BFD 推荐算法

### 5.1 算法 `action_generate_recommendation()`

```
1. 查询待拼订单（domain）:
   logistics_state = 'packing'
   AND container_ids = False
   AND package_ids != False
   AND shipping_port_dest = wizard.destination_port_id

2. 按体积 total_volume_cbm DESC 排序（Decreasing）

3. 遍历每个订单，尝试装入已有推荐柜（Best-Fit：选剩余容量最小但仍能装下的柜）:
   - 装入条件:
     planned_cbm + order.total_volume_cbm <= max_cbm
     AND planned_weight + order_weight <= max_weight
   - 若装入: order_ids += order，planned_cbm/planned_weight 自动 compute 更新
   - 若无一可装: 新建推荐柜，按 5.2 选柜型

4. wizard.state = 'recommended'
```

其中 `order_weight` = `sum(order.package_ids.shipping_weight)`。

### 5.2 新柜柜型选择

- `order.total_volume_cbm > 76` → raise ValidationError（订单超最大柜容，需拆分）
- `order.total_volume_cbm > 67` → `40hq`
- `order.total_volume_cbm > 33` → `40gp`
- else → `40gp`（默认；操作员可手工降为 20gp）

## 6. 执行逻辑 `action_confirm()`

```
1. 校验 wizard.state == 'recommended'

2. 遍历 wizard.container_ids:
   a. 【状态校验】遍历 line.order_ids，校验每个 order:
      - order.logistics_state == 'packing'（防止并发被其他向导装箱）
      - not order.container_ids（防止已装箱订单重复装箱）
      若校验失败，raise UserError 提示具体订单号
   b. 创建 logistics.container:
      - container_type = line.container_type
      - voyage_id = wizard.voyage_id（若已选）
      - state = 'open'
      - name = 临时名 "LCL/{目的港代码}/{YYYYMMDD}/{HHMMSS}/{wizard内序号}"
        （用时分秒+wizard内序号确保同日多次拼箱不重复）
   c. 关联订单: container.order_ids = [(6, 0, line.order_ids.ids)]
   d. 关联包裹: container.package_ids = [(6, 0, line.order_ids.mapped('package_ids').ids)]
   e. 更新订单:
      order.container_ids = [(4, container.id)]
      order.logistics_state = 'containerized'
      （不设置 order.voyage_id——保持 readonly，由后续封箱/装船流程级联）

3. 返回打开已创建 container 列表的 ir.actions.act_window
```

### 6.1 关键约束

- 已封箱/已装船的集装箱不可参与重新分配（由 `logistics.container._check_voyage_lock` 既有约束保障）
- 临时集装箱号 `name` 由操作员后续手工改为真实箱号（船公司分配后）；`name` 字段无 unique 约束，临时号格式含时分秒避免重复
- `action_confirm` 幂等性：执行成功后返回打开 container 列表的 action 并关闭向导（TransientModel 记录由 Odoo 自动清理）；订单 `logistics_state` 已变为 `containerized`，即使重复进入向导也不会再被待拼查询 domain 命中；步骤 2a 的显式状态校验进一步防止并发重复装箱
- `order.voyage_id` 保持空（readonly），LCL 阶段仅在 container 上设置 voyage_id；order.voyage_id 由后续集装箱封箱或航次出发流程级联设置

## 7. 菜单与权限

### 7.1 菜单（修改 `views/menu.xml`）

- 在根菜单 `menu_logistics_root` 下新增子菜单"拼箱池"
- sequence=35（介于集装箱 30 和航次 40 之间）
- 指向 sale.order 的 kanban 筛选视图（拼箱池队列）
- groups=`zhao_logistics.logistics_group_warehouse`（仓库组操作）

### 7.2 权限（修改 `security/ir.model.access.csv`）

| 模型 | warehouse 组 | manager 组 |
|------|-------------|-----------|
| `logistics.consolidation.wizard` | read/write/create/unlink = 1 | 1/1/1/1 |
| `logistics.consolidation.wizard.container` | read/write/create/unlink = 1 | 1/1/1/1 |

瞬态模型需完整权限以支持向导创建/编辑/清理。warehouse 组负责实际拼箱操作，manager 组有全权限。

### 7.3 记录规则（修改 `security/logistics_security.xml`）— 关键卡点

**问题**：现有 `rule_logistics_order_user` 限制 user 组只能看 `create_uid=user.id` 的订单。warehouse 组 imply user 组，导致 warehouse 用户只能看到自己创建的订单，无法看到全部待拼订单。

**修复**：新增 `rule_logistics_order_warehouse` ir.rule，给 warehouse 组放空 domain `[(1, '=', 1)]`。Odoo ir.rule 同模型多条规则 OR 合并，warehouse 用户同时匹配 user 规则（限制自己）和 warehouse 规则（全部），OR 后即全部可见。

```xml
<record id="rule_logistics_order_warehouse" model="ir.rule">
    <field name="name">Logistics Order: Warehouse sees all for consolidation</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('logistics_group_warehouse'))]"/>
</record>
```

### 7.4 向导触发方式（关键卡点）

**问题**：spec 原说"kanban 顶栏按钮"，但 Odoo kanban 顶栏按钮触发向导需额外 server action 配置。

**方案**：用 `binding_model_id` 将向导 action 绑定到 `sale.order`，自动出现在 sale.order 的"动作(Actions)"菜单。kanban 选中订单后从动作菜单触发"生成拼箱方案"。无需修改 sale.order kanban 视图。

```xml
<record id="action_logistics_consolidation_wizard" model="ir.actions.act_window">
    <field name="name">生成拼箱方案</field>
    <field name="res_model">logistics.consolidation.wizard</field>
    <field name="view_mode">form</field>
    <field name="target">new</field>
    <field name="binding_model_id" ref="sale.model_sale_order"/>
    <field name="binding_view_types">list,kanban</field>
</record>
```

`target=new` 弹出向导对话框，`binding_view_types=list,kanban` 确保在列表和看板视图的动作菜单都可见。

## 8. 文件结构

```
新增:
  models/logistics_consolidation_wizard.py     # 2 个 TransientModel
  views/logistics_consolidation_views.xml      # 向导 form + 队列 kanban + action + binding
  tests/test_consolidation_flow.py             # 7 个测试用例

修改:
  __manifest__.py          # 注册新 views 文件（必须在 views/menu.xml 之前加载，因 menu 引用 action）
  models/__init__.py       # 导入新 model
  views/menu.xml           # 新增拼箱池子菜单（sequence=35）
  security/ir.model.access.csv  # 新增 4 行（2 模型 × warehouse/manager 组）
  security/logistics_security.xml  # 新增 rule_logistics_order_warehouse ir.rule
  tests/__init__.py        # 导入新 test
```

### 8.1 __manifest__.py 加载顺序

`views/logistics_consolidation_views.xml` 必须在 `views/menu.xml` 之前加载（因 menu.xml 中拼箱池菜单引用 consolidation_views 中定义的 action）。建议插入位置：在 `views/logistics_freight_credit_note_views.xml` 之后、`views/menu.xml` 之前。

## 9. 测试策略

`test_consolidation_flow.py`，7 个测试用例，`@tagged('post_install', '-at_install')`：

1. **待拼订单查询**：验证 domain 筛选（packing + 无柜 + 有包裹 + 目的港匹配），排除已装箱/无包裹/其他目的港订单
2. **BFD 推荐生成**：3 单总 45CBM → 推荐 1 个 40gp（utilization≈67%）
3. **柜型自动选择**：单订单 70CBM → 推荐 40hq
4. **超限校验**：单订单 80CBM → ValidationError
5. **手工调整**：从某柜移除一个订单后 utilization_pct 正确下降
6. **确认执行**：创建 container、关联 order/package、order.logistics_state='containerized'、container.package_ids 含正确包裹
7. **重量约束**：订单累计超 28000KG → 触发新柜（验证 planned_weight 不超 max_weight）。测试数据准备：创建 2 个订单，每个订单 1 个包裹 shipping_weight=15000KG，体积均 10CBM，BFD 应装入第一个柜（30000KG 超 28000 限制），第二个订单触发新柜

### 9.1 测试通用 setUp

- 创建测试产品（`is_storable=True`，Odoo 19 要求）
- 创建测试仓库、入库 picking type
- 创建测试港口（起运港/目的港）
- 创建测试客户 partner
- 辅助方法 `_create_packing_order(volume_cbm, weight_kg)`：创建订单 + 包裹（设置 package_type 尺寸使体积匹配，设置 shipping_weight）+ 确认物流状态到 packing

## 10. 风险点与缓解

| 风险 | 缓解 |
|------|------|
| BFD 非最优解（背包问题 NP-hard） | BFD 是经典近似算法，利用率通常≥75%；操作员可手工调整弥补 |
| 临时集装箱号与真实号冲突 | 临时号前缀 `LCL/` 明确区分，操作员获取真实号后手工修改 |
| 向导中 order_ids m2m 编辑体验 | 使用 many2many_tags 或 editable list，实时显示 utilization_pct |
| 并发执行（多操作员同时确认） | 瞬态向导天然隔离；action_confirm 步骤 2a 显式校验 order.logistics_state=='packing' 且 container_ids 为空，防止重复装箱 |
| warehouse 用户看不到所有订单（ir.rule 限制） | 新增 rule_logistics_order_warehouse 放空 domain，OR 合并后 warehouse 可见全部 |
| order.voyage_id 未级联 | LCL 阶段仅设 container.voyage_id，order.voyage_id 由后续封箱/装船流程级联，保持现有流程一致 |
