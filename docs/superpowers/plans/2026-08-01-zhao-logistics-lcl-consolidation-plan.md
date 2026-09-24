# 实施计划：LCL 拼箱池

- **Spec**: `docs/superpowers/specs/2026-08-01-zhao-logistics-lcl-consolidation-design.md`
- **模块**: `odoo/custom-addons/zhao_logistics`
- **目标**: 实现拼箱池队列 + BFD 推荐向导 + 执行创建集装箱

## 执行约束

- 严格遵守 Odoo 19 规范（Selection 值小写、`@api.constrains` 替代 `_sql_constraints`、`is_storable=True`、`@tagged('post_install','-at_install')`）
- 不自定义、不突破既有契约；复用 `logistics.container` 既有常量与约束
- 每个文件修改后立即 `python -c "import ast; ast.parse(open(...).read())"` 验证 Python 语法
- XML 文件需符合 Odoo 19 规范（`<list>` 替代 `<tree>`、`<form>` 等）
- 测试命令：`python odoo-bin -c odoo.conf -d test_db -u zhao_logistics --test-tags=zhao_logistics --stop-after-init`

## Task 列表

### Task 1: 创建瞬态模型文件

**文件**: `models/logistics_consolidation_wizard.py`

**内容**:
- `LogisticsConsolidationWizard(models.TransientModel)`:
  - `_name = 'logistics.consolidation.wizard'`
  - 字段: `destination_port_id`(M2one→logistics.port, required), `voyage_id`(M2one→logistics.voyage), `state`(Selection draft/recommended, default draft), `container_ids`(O2many→wizard.container), `total_orders`/`total_cbm`/`total_weight`(compute, 从待拼订单查询汇总)
  - `action_generate_recommendation()`: 查询待拼订单(domain 见 spec 5.1), 按 total_volume_cbm DESC 排序, BFD 装入已有柜或新建柜(柜型选择见 spec 5.2), 设置 state='recommended'
  - `action_confirm()`: 校验 state, 遍历 container_ids, **校验每个 order.logistics_state=='packing' 且 not order.container_ids**, 创建 logistics.container(临时名含时分秒), 关联 order/package, 更新 order.logistics_state='containerized', 返回 container 列表 action
  - `default_get()`: 重写以从 active_ids 预填 destination_port_id(取选中订单共同目的港)
- `LogisticsConsolidationWizardContainer(models.TransientModel)`:
  - `_name = 'logistics.consolidation.wizard.container'`
  - 字段: `wizard_id`(M2one), `container_type`(Selection 20gp/40gp/40hq, default 40gp), `max_cbm`/`max_weight`(compute 按柜型常量), `order_ids`(M2many→sale.order), `planned_cbm`/`planned_weight`/`utilization_pct`(compute)
  - 柜型常量: `{'20gp': (28000, 33), '40gp': (28000, 67), '40hq': (28000, 76)}`

**验证**: `python -c "import ast; ast.parse(open('odoo/custom-addons/zhao_logistics/models/logistics_consolidation_wizard.py').read())"`

### Task 2: 注册模型到 __init__.py

**文件**: `models/__init__.py`

**修改**: 添加 `from . import logistics_consolidation_wizard`

**验证**: 读取确认导入行存在

### Task 3: 创建视图文件

**文件**: `views/logistics_consolidation_views.xml`

**内容**:
- 拼箱池队列 kanban 视图 `view_logistics_consolidation_pool_kanban`(model=sale.order, domain 见 spec 第3节, group_by=shipping_port_dest)
- 拼箱池 action `action_logistics_consolidation_pool`(res_model=sale.order, view_mode=kanban,filter...)
- 向导 form 视图 `view_logistics_consolidation_wizard_form`(header 按钮: 生成推荐/确认执行, sheet: destination_port_id/voyage_id/total_* 字段, container_ids editable list 显示 container_type/max_cbm/planned_cbm/utilization_pct/order_ids many2many_tags)
- 向导 action `action_logistics_consolidation_wizard`(binding_model_id=sale.order, binding_view_types=list,kanban, target=new)
- container 列表 action `action_logistics_consolidation_container_result`(用于 action_confirm 返回)

**验证**: XML 语法检查(标签闭合、属性正确)

### Task 4: 注册视图到 __manifest__.py

**文件**: `__manifest__.py`

**修改**: 在 `views/logistics_freight_credit_note_views.xml` 之后、`views/menu.xml` 之前插入 `'views/logistics_consolidation_views.xml',`

**验证**: 读取确认位置正确

### Task 5: 新增菜单

**文件**: `views/menu.xml`

**修改**: 在 `menu_logistics_container`(sequence=30) 之后、`menu_logistics_voyage`(sequence=40) 之前插入:
```xml
<menuitem id="menu_logistics_consolidation"
          name="拼箱池"
          parent="menu_logistics_root"
          action="action_logistics_consolidation_pool"
          sequence="35"
          groups="zhao_logistics.logistics_group_warehouse"/>
```

**验证**: 读取确认菜单存在且 sequence=35

### Task 6: 新增权限

**文件**: `security/ir.model.access.csv`

**修改**: 追加 4 行:
```
access_logistics_consolidation_wizard_warehouse,...,model_logistics_consolidation_wizard,zhao_logistics.logistics_group_warehouse,1,1,1,1
access_logistics_consolidation_wizard_manager,...,model_logistics_consolidation_wizard,zhao_logistics.logistics_group_manager,1,1,1,1
access_logistics_consolidation_wizard_container_warehouse,...,model_logistics_consolidation_wizard_container,zhao_logistics.logistics_group_warehouse,1,1,1,1
access_logistics_consolidation_wizard_container_manager,...,model_logistics_consolidation_wizard_container,zhao_logistics.logistics_group_manager,1,1,1,1
```

**验证**: 读取确认 4 行存在

### Task 7: 新增 ir.rule

**文件**: `security/logistics_security.xml`

**修改**: 在 `rule_logistics_order_manager` 之后插入:
```xml
<record id="rule_logistics_order_warehouse" model="ir.rule">
    <field name="name">Logistics Order: Warehouse sees all for consolidation</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('logistics_group_warehouse'))]"/>
</record>
```

**验证**: 读取确认规则存在

### Task 8: 创建测试文件

**文件**: `tests/test_consolidation_flow.py`

**内容**: `@tagged('post_install', '-at_install')` 测试类，7 个测试用例 + setUp + 辅助方法:
- setUp: 创建产品(is_storable=True)、仓库、港口、partner
- `_create_packing_order(volume_cbm, weight_kg)`: 创建订单+包裹+确认到 packing 状态
- test_01_pool_domain: 验证待拼订单查询 domain
- test_02_bfd_recommendation: 3 单 45CBM → 1 个 40gp
- test_03_container_type_selection: 70CBM → 40hq
- test_04_overload_validation: 80CBM → ValidationError
- test_05_manual_adjust: 移除订单后 utilization_pct 更新
- test_06_confirm_execution: 创建 container、关联、状态更新
- test_07_weight_constraint: 2 单各 15000KG → 触发新柜

**文件**: `tests/__init__.py` 追加 `from . import test_consolidation_flow`

**验证**: `python -c "import ast; ast.parse(open('odoo/custom-addons/zhao_logistics/tests/test_consolidation_flow.py').read())"`

### Task 9: 集成验证

**操作**:
1. 语法检查所有新增/修改的 .py 和 .xml 文件
2. 若有 Odoo 运行环境，执行模块升级和测试:
   `python odoo-bin -c odoo.conf -d test_db -u zhao_logistics --test-tags=zhao_logistics.TestConsolidationFlow --stop-after-init`
3. 若无运行环境，跳过运行时测试，仅做静态验证
4. 整理文件清单和核心业务流程

## 验收标准

- [ ] 3 个新文件创建完成
- [ ] 5 个修改文件更新正确
- [ ] Python 语法全部通过
- [ ] XML 语法全部通过
- [ ] (如有环境) 7 个测试用例全部通过
- [ ] 无破坏现有功能
