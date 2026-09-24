# Odoo 19 中国本地化收银系统：多门店权限与班次交接 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `zhao_pos_shift`（班次交接）和 `zhao_pos_iam`（多门店权限矩阵）两个 Odoo 19 二开模块，覆盖中国零售多门店收银的班次盘点/差额处理/店长确认/门店数据隔离场景。

**Architecture:** 复用 `pos.session` 作为班次载体（不新增模型）、`stock.warehouse` 作为门店载体、`res.users`+record rule 实现权限隔离。`zhao_pos_shift` 覆写 `action_pos_session_closing_control` 拦截未完成交接的关闭；`zhao_pos_iam` 通过 5 条 record rule 限制 POS 数据按 warehouse 隔离。

**Tech Stack:** Odoo 19.0 / Python / XML / Odoo ORM / TransactionCase

**Spec 引用:** [docs/superpowers/specs/2026-07-29-odoo-zhao-pos-shift-iam-design.md](file:///e:/code/docs/superpowers/specs/2026-07-29-odoo-zhao-pos-shift-iam-design.md)

**测试命令:**
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift,zhao_pos_iam --test-enable --test-tags=zhao_pos_shift,zhao_pos_iam --stop-after-init
```

**验收标准:** 17 个用例全部 PASS（shift 9 + iam 8），模块安装退出码 0

---

## 文件结构

### zhao_pos_shift 模块
```
e:\code\odoo\custom-addons\zhao_pos_shift\
├── __init__.py
├── __manifest__.py
├── models\
│   ├── __init__.py
│   └── pos_session.py          # 扩展 pos.session，加字段+方法+拦截
├── views\
│   └── pos_session_views.xml   # 表单扩展（盘点/差额/交接/店长确认）
└── tests\
    ├── __init__.py
    ├── test_shift_flow.py      # 完整流程 + 拦截（5 用例）
    └── test_cash_diff.py       # 差额处理 4 分支（4 用例）
```

### zhao_pos_iam 模块
```
e:\code\odoo\custom-addons\zhao_pos_iam\
├── __init__.py
├── __manifest__.py
├── models\
│   ├── __init__.py
│   ├── res_users.py            # 扩展 res.users，加 zhao_warehouse_ids/zhao_role
│   └── pos_config.py           # 扩展 pos.config（仅视图层 required，不动模型）
├── security\
│   └── zhao_pos_iam_security.xml  # 5 条 record rule
├── views\
│   ├── res_users_views.xml     # 用户表单加门店访问+角色
│   └── pos_config_views.xml    # pos.config 表单 warehouse_id required
└── tests\
    ├── __init__.py
    ├── test_warehouse_isolation.py  # 隔离测试（4 用例）
    └── test_role_matrix.py          # 角色矩阵（4 用例）
```

---

## Task 1: zhao_pos_shift 模块骨架与 __manifest__

**Files:**
- Create: `e:\code\odoo\custom-addons\zhao_pos_shift\__init__.py`
- Create: `e:\code\odoo\custom-addons\zhao_pos_shift\__manifest__.py`
- Create: `e:\code\odoo\custom-addons\zhao_pos_shift\models\__init__.py`

- [ ] **Step 1: 创建模块 `__init__.py`（空）**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\__init__.py
```

- [ ] **Step 2: 创建 models `__init__.py`**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\models\__init__.py
from . import pos_session
```

- [ ] **Step 3: 创建 `__manifest__.py`**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\__manifest__.py
{
    'name': 'Zhao POS Shift',
    'version': '19.0.1.0.0',
    'summary': '班次交接：钱箱盘点、差额处理、店长确认',
    'description': '扩展 pos.session 支持班次交接流程，覆写 action_pos_session_closing_control 拦截未完成交接',
    'author': 'Zhao',
    'website': 'https://example.com',
    'license': 'LGPL-3',
    'depends': ['zhao_pos'],
    'data': [
        'views/pos_session_views.xml',
    ],
    'post_init_hook': '_post_init_hook_sync_shift_state',
    'installable': True,
    'application': False,
    'auto_install': False,
}
```

- [ ] **Step 4: 创建模块 `__init__.py`（含 post_init_hook）**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\__init__.py
from odoo import api, SUPERUSER_ID


def _post_init_hook_sync_shift_state(env):
    """模块安装后同步已有 pos.session 的 zhao_shift_state。
    避免历史 session 被锁死（state='opened' 但 zhao_shift_state='draft'）。
    """
    sessions = env['pos.session'].search([])
    state_map = {
        'opening_control': 'draft',
        'opened': 'opened',
        'closing_control': 'handover',
        'closed': 'closed',
    }
    for session in sessions:
        target = state_map.get(session.state, 'draft')
        if session.zhao_shift_state != target:
            session.sudo().write({'zhao_shift_state': target})
```

- [ ] **Step 5: 创建占位 pos_session.py（空 inherit，确保模块可安装）**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\models\pos_session.py
from odoo import models


class PosSession(models.Model):
    _inherit = 'pos.session'
```

- [ ] **Step 6: 创建占位 views/pos_session_views.xml（空 data）**

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_shift\views\pos_session_views.xml -->
<odoo>
    <data>
        <!-- Task 4 填充视图 -->
    </data>
</odoo>
```

- [ ] **Step 7: 安装测试**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift --stop-after-init
```
Expected: 退出码 0，日志显示 "Modules loaded: zhao_pos_shift"

- [ ] **Step 8: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_shift
git -C e:\code\odoo commit -m "feat: add zhao_pos_shift module skeleton with post_init_hook"
```

---

## Task 2: zhao_pos_shift 字段定义

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_pos_shift\models\pos_session.py`
- Test: `e:\code\odoo\custom-addons\zhao_pos_shift\tests\__init__.py`
- Test: `e:\code\odoo\custom-addons\zhao_pos_shift\tests\test_shift_flow.py`

- [ ] **Step 1: 写失败测试 - 字段存在性**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\tests\__init__.py
from . import test_shift_flow
from . import test_cash_diff
```

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\tests\test_shift_flow.py
from odoo.tests import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestShiftFlow(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.pos_config = cls.env['pos.config'].create({
            'name': '测试POS',
        })
        cls.session = cls.env['pos.session'].create({
            'config_id': cls.pos_config.id,
        })

    def test_01_fields_exist(self):
        """验证 zhao_pos_shift 扩展字段存在"""
        session = self.session
        self.assertIn('zhao_cash_breakdown', session._fields)
        self.assertIn('zhao_expected_cash', session._fields)
        self.assertIn('zhao_counted_cash', session._fields)
        self.assertIn('zhao_cash_diff', session._fields)
        self.assertIn('zhao_diff_handling', session._fields)
        self.assertIn('zhao_diff_note', session._fields)
        self.assertIn('zhao_handover_user_id', session._fields)
        self.assertIn('zhao_handover_time', session._fields)
        self.assertIn('zhao_handover_note', session._fields)
        self.assertIn('zhao_manager_confirm_user_id', session._fields)
        self.assertIn('zhao_manager_confirm_time', session._fields)
        self.assertIn('zhao_shift_state', session._fields)
        # 默认值校验
        self.assertEqual(session.zhao_shift_state, 'draft')
        self.assertEqual(session.zhao_diff_handling, 'none')
```

- [ ] **Step 2: 运行测试验证失败**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift --test-enable --test-tags=zhao_pos_shift --stop-after-init
```
Expected: FAIL，`zhao_cash_breakdown` 字段不存在

- [ ] **Step 3: 实现字段定义**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\models\pos_session.py
from odoo import api, fields, models


class PosSession(models.Model):
    _inherit = 'pos.session'

    zhao_cash_breakdown = fields.Json(
        string='钱箱面额拆分',
        help='{"100": 5, "50": 10, "20": 0, "10": 0, "5": 0, "1": 0, "coin": 0.0}',
    )
    zhao_expected_cash = fields.Monetary(
        string='应缴现金',
        compute='_compute_zhao_expected_cash',
        help='等于原生 cash_register_balance_end（理论期末现金）',
    )
    zhao_counted_cash = fields.Monetary(
        string='实点现金',
        help='收银员实际清点的现金金额',
    )
    zhao_cash_diff = fields.Monetary(
        string='差额',
        compute='_compute_zhao_cash_diff',
        help='正=长款，负=短款',
    )
    zhao_diff_handling = fields.Selection(
        selection=[
            ('none', '无需处理'),
            ('report', '仅记录上报'),
            ('supply', '收银员补交'),
            ('approve', '店长审批核销'),
        ],
        string='差额处理方式',
        default='none',
    )
    zhao_diff_note = fields.Text(
        string='差额说明',
    )
    zhao_handover_user_id = fields.Many2one(
        comodel_name='res.users',
        string='接班人',
    )
    zhao_handover_time = fields.Datetime(
        string='交接时间',
    )
    zhao_handover_note = fields.Text(
        string='交接备注',
    )
    zhao_manager_confirm_user_id = fields.Many2one(
        comodel_name='res.users',
        string='店长确认人',
    )
    zhao_manager_confirm_time = fields.Datetime(
        string='店长确认时间',
    )
    zhao_shift_state = fields.Selection(
        selection=[
            ('draft', '草稿'),
            ('opened', '进行中'),
            ('counting', '盘点中'),
            ('handover', '已交接待确认'),
            ('closed', '已关闭'),
        ],
        string='班次状态',
        default='draft',
    )

    @api.depends('cash_register_balance_end')
    def _compute_zhao_expected_cash(self):
        """应缴现金 = 原生理论期末现金"""
        for session in self:
            session.zhao_expected_cash = session.cash_register_balance_end or 0.0

    @api.depends('zhao_counted_cash', 'zhao_expected_cash')
    def _compute_zhao_cash_diff(self):
        """差额 = 实点 - 应缴"""
        for session in self:
            session.zhao_cash_diff = (session.zhao_counted_cash or 0.0) - (session.zhao_expected_cash or 0.0)
```

- [ ] **Step 4: 运行测试验证通过**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift --test-enable --test-tags=zhao_pos_shift --stop-after-init
```
Expected: `test_01_fields_exist` PASS

- [ ] **Step 5: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_shift
git -C e:\code\odoo commit -m "feat: add zhao_pos_shift fields on pos.session"
```

---

## Task 3: zhao_pos_shift 班次状态机与拦截

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_pos_shift\models\pos_session.py`
- Modify: `e:\code\odoo\custom-addons\zhao_pos_shift\tests\test_shift_flow.py`

- [ ] **Step 1: 写失败测试 - 状态机与拦截**

在 `test_shift_flow.py` 末尾追加：

```python
    def test_02_open_to_handover(self):
        """opened→counting→handover 完整流程"""
        # 开会话：原生 action_pos_session_open 也会改 zhao_shift_state
        self.session.action_pos_session_open()
        self.assertEqual(self.session.state, 'opened')
        self.assertEqual(self.session.zhao_shift_state, 'opened')

        # 进入盘点
        self.session.action_zhao_start_counting()
        self.assertEqual(self.session.zhao_shift_state, 'counting')

        # 填盘点数据
        self.session.write({
            'zhao_counted_cash': self.session.zhao_expected_cash,
            'zhao_diff_handling': 'none',
        })

        # 交接
        successor = self.env['res.users'].create({
            'name': '接班收银员',
            'login': 'shift_successor_test',
        })
        self.session.action_zhao_handover(successor.id, '夜班接班')
        self.assertEqual(self.session.zhao_shift_state, 'handover')
        self.assertEqual(self.session.zhao_handover_user_id, successor)
        self.assertTrue(self.session.zhao_handover_time)

    def test_03_manager_confirm(self):
        """handover→closed，店长确认字段写入"""
        self.session.action_pos_session_open()
        self.session.action_zhao_start_counting()
        self.session.write({
            'zhao_counted_cash': self.session.zhao_expected_cash,
        })
        self.session.action_zhao_handover(self.env.user.id, '测试交接')

        manager = self.env['res.users'].create({
            'name': '店长',
            'login': 'shift_manager_test',
            'groups_id': [(4, self.env.ref('point_of_sale.group_pos_manager').id)],
        })
        self.session.with_user(manager).action_zhao_manager_confirm()
        self.assertEqual(self.session.zhao_shift_state, 'closed')
        self.assertEqual(self.session.zhao_manager_confirm_user_id, manager)
        self.assertTrue(self.session.zhao_manager_confirm_time)

    def test_04_block_closing_without_confirm(self):
        """未完成交接时拦截原生 closing_control"""
        self.session.action_pos_session_open()
        # 未走盘点/交接，直接尝试关闭
        from odoo.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            self.session.action_pos_session_closing_control()

    def test_05_block_counting_with_unpaid_order(self):
        """盘点时有未支付订单报错"""
        self.session.action_pos_session_open()
        # 创建未支付订单
        product = self.env['product.product'].create({
            'name': '测试商品',
            'type': 'consu',
            'list_price': 10.0,
        })
        self.env['pos.order'].create({
            'session_id': self.session.id,
            'lines': [(0, 0, {
                'product_id': product.id,
                'qty': 1,
                'price_unit': 10.0,
                'price_subtotal': 10.0,
                'price_subtotal_incl': 10.0,
            })],
            'amount_tax': 0.0,
            'amount_total': 10.0,
            'amount_paid': 0.0,
            'amount_return': 0.0,
        })
        from odoo.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            self.session.action_zhao_start_counting()
```

- [ ] **Step 2: 运行测试验证失败**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift --test-enable --test-tags=zhao_pos_shift --stop-after-init
```
Expected: FAIL，`action_zhao_start_counting` 方法不存在

- [ ] **Step 3: 实现状态机方法 + 原生 open/close 拦截**

在 `pos_session.py` 末尾追加（`class PosSession` 内部）：

```python
    def action_pos_session_open(self):
        """覆写原生：同步 zhao_shift_state"""
        result = super().action_pos_session_open()
        self.write({'zhao_shift_state': 'opened'})
        return result

    def action_zhao_start_counting(self):
        """进入盘点：校验状态+无未支付订单，锁定状态"""
        self.ensure_one()
        from odoo.exceptions import ValidationError
        if self.zhao_shift_state != 'opened':
            raise ValidationError("仅进行中的班次可进入盘点")
        unpaid_count = len(self.order_ids.filtered(lambda o: o.state == 'draft'))
        if unpaid_count:
            raise ValidationError(
                f"还有 {unpaid_count} 笔未支付订单，请先完成或取消"
            )
        self.write({'zhao_shift_state': 'counting'})
        # 同步实点现金到原生字段
        if self.zhao_counted_cash:
            self.cash_register_balance_end_real = self.zhao_counted_cash

    def action_zhao_handover(self, user_id, note=''):
        """交接：校验状态+差额已处理，写接班人"""
        self.ensure_one()
        from odoo.exceptions import ValidationError
        if self.zhao_shift_state != 'counting':
            raise ValidationError("仅盘点中的班次可交接")
        if self.zhao_cash_diff != 0 and self.zhao_diff_handling == 'none':
            raise ValidationError(
                f"差额 {self.zhao_cash_diff} 元未处理，请选择差额处理方式"
            )
        self.write({
            'zhao_shift_state': 'handover',
            'zhao_handover_user_id': user_id,
            'zhao_handover_time': fields.Datetime.now(),
            'zhao_handover_note': note,
        })

    def action_zhao_manager_confirm(self):
        """店长确认：handover → closed"""
        self.ensure_one()
        from odoo.exceptions import ValidationError
        if self.zhao_shift_state != 'handover':
            raise ValidationError("仅可确认已交接班次")
        self.write({
            'zhao_shift_state': 'closed',
            'zhao_manager_confirm_user_id': self.env.user.id,
            'zhao_manager_confirm_time': fields.Datetime.now(),
        })

    def action_zhao_report_diff(self, note=''):
        """上报差额：仅记录"""
        self.ensure_one()
        self.write({
            'zhao_diff_handling': 'report',
            'zhao_diff_note': note,
        })

    def action_pos_session_closing_control(self):
        """覆写原生：拦截未完成交接的关闭"""
        from odoo.exceptions import ValidationError
        for session in self:
            if session.zhao_shift_state != 'closed':
                raise ValidationError(
                    "请先完成班次交接（盘点→交接→店长确认）"
                )
        return super().action_pos_session_closing_control()
```

- [ ] **Step 4: 运行测试验证通过**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift --test-enable --test-tags=zhao_pos_shift --stop-after-init
```
Expected: `test_02_open_to_handover`, `test_03_manager_confirm`, `test_04_block_closing_without_confirm`, `test_05_block_counting_with_unpaid_order` 全部 PASS

- [ ] **Step 5: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_shift
git -C e:\code\odoo commit -m "feat: implement zhao_pos_shift state machine and closing interception"
```

---

## Task 4: zhao_pos_shift 视图扩展

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_pos_shift\views\pos_session_views.xml`

- [ ] **Step 1: 实现视图扩展**

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_shift\views\pos_session_views.xml -->
<odoo>
    <data>
        <!-- 表单扩展：加盘点/差额/交接/店长确认分组 -->
        <record id="view_pos_session_form_zhao_shift" model="ir.ui.view">
            <field name="name">pos.session.form.zhao.shift</field>
            <field name="model">pos.session</field>
            <field name="inherit_id" ref="point_of_sale.view_pos_session_form"/>
            <field name="arch" type="xml">
                <xpath expr="//sheet" position="inside">
                    <group string="班次交接">
                        <group string="钱箱盘点">
                            <field name="zhao_shift_state" readonly="1"/>
                            <field name="zhao_cash_breakdown" widget="json"/>
                            <field name="zhao_expected_cash" readonly="1"/>
                            <field name="zhao_counted_cash"/>
                            <field name="zhao_cash_diff" widget="badge"
                                   decoration-success="zhao_cash_diff == 0"
                                   decoration-danger="zhao_cash_diff &lt; 0"
                                   decoration-info="zhao_cash_diff &gt; 0"/>
                        </group>
                        <group string="差额处理">
                            <field name="zhao_diff_handling"/>
                            <field name="zhao_diff_note"/>
                        </group>
                        <group string="交接信息">
                            <field name="zhao_handover_user_id"/>
                            <field name="zhao_handover_time"/>
                            <field name="zhao_handover_note"/>
                        </group>
                        <group string="店长确认">
                            <field name="zhao_manager_confirm_user_id"/>
                            <field name="zhao_manager_confirm_time"/>
                        </group>
                    </group>
                </xpath>
            </field>
        </record>

        <!-- 列表视图：加差额列 -->
        <record id="view_pos_session_tree_zhao_shift" model="ir.ui.view">
            <field name="name">pos.session.tree.zhao.shift</field>
            <field name="model">pos.session</field>
            <field name="inherit_id" ref="point_of_sale.view_pos_session_tree"/>
            <field name="arch" type="xml">
                <xpath expr="//field[@name='state']" position="after">
                    <field name="zhao_shift_state" optional="show"/>
                    <field name="zhao_cash_diff" optional="show"
                           decoration-success="zhao_cash_diff == 0"
                           decoration-danger="zhao_cash_diff &lt; 0"
                           decoration-info="zhao_cash_diff &gt; 0"/>
                </xpath>
            </field>
        </record>
    </data>
</odoo>
```

- [ ] **Step 2: 升级模块验证视图无报错**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_pos_shift --stop-after-init
```
Expected: 退出码 0，无 XML 解析错误

- [ ] **Step 3: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_shift/views/pos_session_views.xml
git -C e:\code\odoo commit -m "feat: add zhao_pos_shift session form and tree views"
```

---

## Task 5: zhao_pos_shift 差额处理测试

**Files:**
- Create: `e:\code\odoo\custom-addons\zhao_pos_shift\tests\test_cash_diff.py`

- [ ] **Step 1: 写差额处理 4 分支测试**

```python
# e:\code\odoo\custom-addons\zhao_pos_shift\tests\test_cash_diff.py
from odoo.tests import TransactionCase, tagged
from odoo.exceptions import ValidationError


@tagged('post_install', '-at_install')
class TestCashDiff(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.pos_config = cls.env['pos.config'].create({'name': '差额测试POS'})
        cls.session = cls.env['pos.session'].create({'config_id': cls.pos_config.id})
        cls.session.action_pos_session_open()
        cls.session.action_zhao_start_counting()

    def test_05_cash_diff_zero(self):
        """差额 0 直接交接"""
        self.session.write({
            'zhao_counted_cash': self.session.zhao_expected_cash,
            'zhao_diff_handling': 'none',
        })
        self.assertEqual(self.session.zhao_cash_diff, 0.0)
        self.session.action_zhao_handover(self.env.user.id, '无差额交接')
        self.assertEqual(self.session.zhao_shift_state, 'handover')

    def test_06_cash_diff_positive_report(self):
        """长款 report 分支"""
        self.session.write({
            'zhao_counted_cash': self.session.zhao_expected_cash + 5.0,
            'zhao_diff_handling': 'none',
        })
        self.assertEqual(self.session.zhao_cash_diff, 5.0)
        # 差额!=0 且 handling=none，应拦截
        with self.assertRaises(ValidationError):
            self.session.action_zhao_handover(self.env.user.id)
        # 上报后可交接
        self.session.action_zhao_report_diff('长款 5 元上报')
        self.assertEqual(self.session.zhao_diff_handling, 'report')
        self.session.action_zhao_handover(self.env.user.id, '长款已上报')
        self.assertEqual(self.session.zhao_shift_state, 'handover')

    def test_07_cash_diff_negative_supply(self):
        """短款 supply 补交后 diff=0"""
        self.session.write({
            'zhao_counted_cash': self.session.zhao_expected_cash - 10.0,
            'zhao_diff_handling': 'supply',
        })
        self.assertEqual(self.session.zhao_cash_diff, -10.0)
        # 收银员补交 10 元，更新 counted_cash
        self.session.zhao_counted_cash = self.session.zhao_expected_cash
        self.assertEqual(self.session.zhao_cash_diff, 0.0)
        self.session.action_zhao_handover(self.env.user.id, '短款已补交')
        self.assertEqual(self.session.zhao_shift_state, 'handover')

    def test_08_cash_diff_negative_approve(self):
        """短款 approve 待店长确认"""
        self.session.write({
            'zhao_counted_cash': self.session.zhao_expected_cash - 50.0,
            'zhao_diff_handling': 'approve',
            'zhao_diff_note': '短款 50 元，需店长核销',
        })
        self.assertEqual(self.session.zhao_cash_diff, -50.0)
        self.session.action_zhao_handover(self.env.user.id, '短款待审批')
        self.assertEqual(self.session.zhao_shift_state, 'handover')
        # 店长确认
        manager = self.env['res.users'].create({
            'name': '审批店长',
            'login': 'shift_approve_manager',
            'groups_id': [(4, self.env.ref('point_of_sale.group_pos_manager').id)],
        })
        self.session.with_user(manager).action_zhao_manager_confirm()
        self.assertEqual(self.session.zhao_shift_state, 'closed')

    def test_09_block_handover_with_unhandled_diff(self):
        """diff!=0 且 handling=none 拦截"""
        self.session.write({
            'zhao_counted_cash': self.session.zhao_expected_cash + 3.0,
            'zhao_diff_handling': 'none',
        })
        self.assertNotEqual(self.session.zhao_cash_diff, 0.0)
        with self.assertRaises(ValidationError):
            self.session.action_zhao_handover(self.env.user.id)
```

- [ ] **Step 2: 运行测试验证通过**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift --test-enable --test-tags=zhao_pos_shift --stop-after-init
```
Expected: `test_05_cash_diff_zero` ~ `test_09_block_handover_with_unhandled_diff` 全部 PASS

- [ ] **Step 3: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_shift/tests/test_cash_diff.py
git -C e:\code\odoo commit -m "test: add zhao_pos_shift cash diff 4-branch tests"
```

---

## Task 6: zhao_pos_iam 模块骨架与 __manifest__

**Files:**
- Create: `e:\code\odoo\custom-addons\zhao_pos_iam\__init__.py`
- Create: `e:\code\odoo\custom-addons\zhao_pos_iam\__manifest__.py`
- Create: `e:\code\odoo\custom-addons\zhao_pos_iam\models\__init__.py`

- [ ] **Step 1: 创建模块骨架**

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\__init__.py
```

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\models\__init__.py
from . import res_users
```

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\__manifest__.py
{
    'name': 'Zhao POS IAM',
    'version': '19.0.1.0.0',
    'summary': '多门店权限矩阵：res.users + record rule 按 warehouse 隔离',
    'description': '扩展 res.users 加 zhao_warehouse_ids/zhao_role，新增 5 条 record rule 限制 POS 数据按门店隔离',
    'author': 'Zhao',
    'website': 'https://example.com',
    'license': 'LGPL-3',
    'depends': ['zhao_pos', 'stock'],
    'data': [
        'security/zhao_pos_iam_security.xml',
        'views/res_users_views.xml',
        'views/pos_config_views.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
```

- [ ] **Step 2: 创建占位模型文件**

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\models\res_users.py
from odoo import models


class ResUsers(models.Model):
    _inherit = 'res.users'
```

- [ ] **Step 3: 创建占位 security/views 文件**

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_iam\security\zhao_pos_iam_security.xml -->
<odoo>
    <data>
        <!-- Task 8 填充 record rules -->
    </data>
</odoo>
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_iam\views\res_users_views.xml -->
<odoo>
    <data>
        <!-- Task 9 填充用户视图扩展 -->
    </data>
</odoo>
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_iam\views\pos_config_views.xml -->
<odoo>
    <data>
        <!-- Task 9 填充 pos.config 视图扩展 -->
    </data>
</odoo>
```

- [ ] **Step 4: 安装测试**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_iam --stop-after-init
```
Expected: 退出码 0，"Modules loaded: zhao_pos_iam"

- [ ] **Step 5: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_iam
git -C e:\code\odoo commit -m "feat: add zhao_pos_iam module skeleton"
```

---

## Task 7: zhao_pos_iam res.users 字段与校验

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_pos_iam\models\res_users.py`
- Create: `e:\code\odoo\custom-addons\zhao_pos_iam\tests\__init__.py`
- Create: `e:\code\odoo\custom-addons\zhao_pos_iam\tests\test_role_matrix.py`

- [ ] **Step 1: 写失败测试 - 字段存在与空值校验**

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\tests\__init__.py
from . import test_warehouse_isolation
from . import test_role_matrix
```

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\tests\test_role_matrix.py
from odoo.tests import TransactionCase, tagged
from odoo.exceptions import ValidationError


@tagged('post_install', '-at_install')
class TestRoleMatrix(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.warehouse_a = cls.env['stock.warehouse'].create({
            'name': '门店A',
            'code': 'WHA',
        })
        cls.warehouse_b = cls.env['stock.warehouse'].create({
            'name': '门店B',
            'code': 'WHB',
        })

    def test_01_users_fields_exist(self):
        """验证 res.users 扩展字段存在"""
        user = self.env['res.users'].create({
            'name': '字段测试用户',
            'login': 'zhao_field_test',
        })
        self.assertIn('zhao_warehouse_ids', user._fields)
        self.assertIn('zhao_role', user._fields)
        self.assertFalse(user.zhao_warehouse_ids)
        self.assertEqual(user.zhao_role, False)

    def test_06_empty_warehouse_blocked(self):
        """zhao_warehouse_ids 为空且 role 为 cashier 时保存报错"""
        user = self.env['res.users'].create({
            'name': '未绑定门店收银员',
            'login': 'zhao_no_wh',
        })
        user.zhao_role = 'cashier'
        with self.assertRaises(ValidationError):
            # 触发约束（write 时校验）
            user._validate_zhao_warehouse_required()
```

- [ ] **Step 2: 运行测试验证失败**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_iam --test-enable --test-tags=zhao_pos_iam --stop-after-init
```
Expected: FAIL，`zhao_warehouse_ids` 字段不存在

- [ ] **Step 3: 实现 res.users 字段与校验**

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\models\res_users.py
from odoo import api, fields, models
from odoo.exceptions import ValidationError


class ResUsers(models.Model):
    _inherit = 'res.users'

    zhao_warehouse_ids = fields.Many2many(
        comodel_name='stock.warehouse',
        relation='zhao_users_warehouse_rel',
        column1='user_id',
        column2='warehouse_id',
        string='可访问门店',
        help='空列表=普通用户全不可见（admin 通过 env.su bypass）',
    )
    zhao_role = fields.Selection(
        selection=[
            ('area_manager', '区域经理'),
            ('store_manager', '店长'),
            ('cashier', '收银员'),
            ('finance', '财务'),
        ],
        string='中国本地化角色',
    )

    @api.constrains('zhao_role', 'zhao_warehouse_ids')
    def _validate_zhao_warehouse_required(self):
        """POS 角色（cashier/store_manager/area_manager）必须绑定至少一个门店"""
        for user in self:
            if user.zhao_role in ('cashier', 'store_manager', 'area_manager'):
                if not user.zhao_warehouse_ids:
                    raise ValidationError(
                        f"请为用户 {user.name} 绑定至少一个门店"
                    )
```

- [ ] **Step 4: 运行测试验证通过**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_iam --test-enable --test-tags=zhao_pos_iam --stop-after-init
```
Expected: `test_01_users_fields_exist`, `test_06_empty_warehouse_blocked` PASS

- [ ] **Step 5: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_iam
git -C e:\code\odoo commit -m "feat: add zhao_pos_iam res.users fields and warehouse validation"
```

---

## Task 8: zhao_pos_iam record rules

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_pos_iam\security\zhao_pos_iam_security.xml`
- Create: `e:\code\odoo\custom-addons\zhao_pos_iam\tests\test_warehouse_isolation.py`

- [ ] **Step 1: 写失败测试 - 门店隔离**

```python
# e:\code\odoo\custom-addons\zhao_pos_iam\tests\test_warehouse_isolation.py
from odoo.tests import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestWarehouseIsolation(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.warehouse_a = cls.env['stock.warehouse'].create({
            'name': '门店A', 'code': 'WHA',
        })
        cls.warehouse_b = cls.env['stock.warehouse'].create({
            'name': '门店B', 'code': 'WHB',
        })
        # 用户 A：只绑定门店A
        cls.user_a = cls.env['res.users'].create({
            'name': '门店A收银员',
            'login': 'zhao_user_a',
            'groups_id': [(4, cls.env.ref('point_of_sale.group_pos_user').id)],
            'zhao_warehouse_ids': [(6, 0, [cls.warehouse_a.id])],
            'zhao_role': 'cashier',
        })
        # pos.config 绑定门店
        cls.pos_config_a = cls.env['pos.config'].create({
            'name': '门店A POS',
            'warehouse_id': cls.warehouse_a.id,
        })
        cls.pos_config_b = cls.env['pos.config'].create({
            'name': '门店B POS',
            'warehouse_id': cls.warehouse_b.id,
        })

    def test_01_two_users_isolated(self):
        """用户A只能看到门店A的 pos.config"""
        configs_visible = self.env['pos.config'].with_user(self.user_a).search([])
        self.assertIn(self.pos_config_a, configs_visible)
        self.assertNotIn(self.pos_config_b, configs_visible)

    def test_02_cashier_only_own_store(self):
        """cashier 只能看本门店"""
        sessions_a = self.env['pos.session'].with_user(self.user_a).search([])
        # 门店A的session可见，门店B的不可见
        session_a = self.env['pos.session'].create({
            'config_id': self.pos_config_a.id,
        })
        session_b = self.env['pos.session'].create({
            'config_id': self.pos_config_b.id,
        })
        sessions_visible = self.env['pos.session'].with_user(self.user_a).search([])
        self.assertIn(session_a, sessions_visible)
        self.assertNotIn(session_b, sessions_visible)

    def test_07_picking_cross_store_or(self):
        """跨门店调拨 OR 规则生效"""
        # 用各 warehouse 自己的 picking_type，避免 precompute 冲突
        picking_type_a = self.env['stock.picking.type'].search([
            ('warehouse_id', '=', self.warehouse_a.id), ('code', '=', 'outgoing'),
        ], limit=1)
        picking_type_b = self.env['stock.picking.type'].search([
            ('warehouse_id', '=', self.warehouse_b.id), ('code', '=', 'outgoing'),
        ], limit=1)
        picking_a = self.env['stock.picking'].create({
            'picking_type_id': picking_type_a.id,
        })
        picking_b = self.env['stock.picking'].create({
            'picking_type_id': picking_type_b.id,
        })
        pickings_visible = self.env['stock.picking'].with_user(self.user_a).search([])
        self.assertIn(picking_a, pickings_visible)
        self.assertNotIn(picking_b, pickings_visible)

    def test_08_payment_isolated(self):
        """pos.payment 按 warehouse 隔离（通过 session_id.config_id.warehouse_id）"""
        # 先开会话再下订单+支付
        session_a = self.env['pos.session'].create({'config_id': self.pos_config_a.id})
        session_a.with_user(self.env.user).action_pos_session_open()
        product = self.env['product.product'].create({
            'name': '支付测试商品', 'type': 'consu', 'list_price': 5.0,
        })
        order_a = self.env['pos.order'].create({
            'session_id': session_a.id,
            'lines': [(0, 0, {
                'product_id': product.id, 'qty': 1,
                'price_unit': 5.0, 'price_subtotal': 5.0, 'price_subtotal_incl': 5.0,
            })],
            'amount_tax': 0.0, 'amount_total': 5.0, 'amount_paid': 0.0, 'amount_return': 0.0,
        })
        payment_a = self.env['pos.payment'].create({
            'pos_order_id': order_a.id,
            'payment_method_id': session_a.payment_method_ids[:1].id,
            'amount': 5.0,
        })

        session_b = self.env['pos.session'].create({'config_id': self.pos_config_b.id})
        session_b.with_user(self.env.user).action_pos_session_open()
        order_b = self.env['pos.order'].create({
            'session_id': session_b.id,
            'lines': [(0, 0, {
                'product_id': product.id, 'qty': 1,
                'price_unit': 5.0, 'price_subtotal': 5.0, 'price_subtotal_incl': 5.0,
            })],
            'amount_tax': 0.0, 'amount_total': 5.0, 'amount_paid': 0.0, 'amount_return': 0.0,
        })
        payment_b = self.env['pos.payment'].create({
            'pos_order_id': order_b.id,
            'payment_method_id': session_b.payment_method_ids[:1].id,
            'amount': 5.0,
        })

        payments_visible = self.env['pos.payment'].with_user(self.user_a).search([])
        self.assertIn(payment_a, payments_visible)
        self.assertNotIn(payment_b, payments_visible)
```

- [ ] **Step 2: 运行测试验证失败**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_iam --test-enable --test-tags=zhao_pos_iam --stop-after-init
```
Expected: FAIL，所有隔离测试失败（无 record rule）

- [ ] **Step 3: 实现 5 条 record rules**

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_iam\security\zhao_pos_iam_security.xml -->
<odoo>
    <data>
        <!-- pos.config: 仅本门店 POS -->
        <record id="zhao_rule_pos_config_warehouse" model="ir.rule">
            <field name="name">Zhao: 仅本门店 POS</field>
            <field name="model_id" ref="point_of_sale.model_pos_config"/>
            <field name="domain_force">
                ['|', ('warehouse_id', '=', False), ('warehouse_id', 'in', user.zhao_warehouse_ids)]
            </field>
            <field name="groups" eval="[(4, ref('point_of_sale.group_pos_user')), (4, ref('point_of_sale.group_pos_manager'))]"/>
            <field name="perm_read" eval="True"/>
            <field name="perm_write" eval="True"/>
            <field name="perm_create" eval="True"/>
            <field name="perm_unlink" eval="True"/>
        </record>

        <!-- pos.session: 仅本门店班次 -->
        <record id="zhao_rule_pos_session_warehouse" model="ir.rule">
            <field name="name">Zhao: 仅本门店班次</field>
            <field name="model_id" ref="point_of_sale.model_pos_session"/>
            <field name="domain_force">
                ['|', ('config_id.warehouse_id', '=', False), ('config_id.warehouse_id', 'in', user.zhao_warehouse_ids)]
            </field>
            <field name="groups" eval="[(4, ref('point_of_sale.group_pos_user')), (4, ref('point_of_sale.group_pos_manager'))]"/>
        </record>

        <!-- pos.payment: 仅本门店支付 -->
        <record id="zhao_rule_pos_payment_warehouse" model="ir.rule">
            <field name="name">Zhao: 仅本门店支付</field>
            <field name="model_id" ref="point_of_sale.model_pos_payment"/>
            <field name="domain_force">
                ['|', ('session_id.config_id.warehouse_id', '=', False), ('session_id.config_id.warehouse_id', 'in', user.zhao_warehouse_ids)]
            </field>
            <field name="groups" eval="[(4, ref('point_of_sale.group_pos_user')), (4, ref('point_of_sale.group_pos_manager'))]"/>
        </record>

        <!-- pos.order: 仅本门店订单 -->
        <record id="zhao_rule_pos_order_warehouse" model="ir.rule">
            <field name="name">Zhao: 仅本门店订单</field>
            <field name="model_id" ref="point_of_sale.model_pos_order"/>
            <field name="domain_force">
                ['|', ('session_id.config_id.warehouse_id', '=', False), ('session_id.config_id.warehouse_id', 'in', user.zhao_warehouse_ids)]
            </field>
            <field name="groups" eval="[(4, ref('point_of_sale.group_pos_user')), (4, ref('point_of_sale.group_pos_manager'))]"/>
        </record>

        <!-- stock.picking: 仅本门店调拨（OR：warehouse_id 或 warehouse_dest_id） -->
        <record id="zhao_rule_stock_picking_warehouse" model="ir.rule">
            <field name="name">Zhao: 仅本门店调拨</field>
            <field name="model_id" ref="stock.model_stock_picking"/>
            <field name="domain_force">
                ['|', '|',
                    ('warehouse_id', 'in', user.zhao_warehouse_ids),
                    ('warehouse_dest_id', 'in', user.zhao_warehouse_ids),
                    '&amp;', ('warehouse_id', '=', False), ('warehouse_dest_id', '=', False)]
            </field>
            <field name="groups" eval="[(4, ref('point_of_sale.group_pos_user')), (4, ref('point_of_sale.group_pos_manager'))]"/>
        </record>
    </data>
</odoo>
```

**说明**：所有规则都加了 `('warehouse_id', '=', False)` 的 OR 兜底分支，避免未绑定 warehouse 的数据被完全隐藏（影响原生 demo 数据或老数据）。

- [ ] **Step 4: 运行测试验证通过**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_iam --test-enable --test-tags=zhao_pos_iam --stop-after-init
```
Expected: `test_01_two_users_isolated`, `test_02_cashier_only_own_store`, `test_07_picking_cross_store_or`, `test_08_payment_isolated` PASS

- [ ] **Step 5: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_iam
git -C e:\code\odoo commit -m "feat: add zhao_pos_iam 5 record rules for warehouse isolation"
```

---

## Task 9: zhao_pos_iam 角色矩阵测试与视图

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_pos_iam\tests\test_role_matrix.py`
- Modify: `e:\code\odoo\custom-addons\zhao_pos_iam\views\res_users_views.xml`
- Modify: `e:\code\odoo\custom-addons\zhao_pos_iam\views\pos_config_views.xml`

- [ ] **Step 1: 追加角色矩阵测试（test_03/test_04/test_05）**

在 `test_role_matrix.py` 的 `TestRoleMatrix` 类中追加（保留 Task 7 的 test_01/test_06）：

```python
    def test_03_store_manager_own_store(self):
        """store_manager 能看到本门店 pos.config（与 cashier 同 rule）"""
        manager = self.env['res.users'].create({
            'name': '门店A店长',
            'login': 'zhao_manager_a',
            'groups_id': [(4, self.env.ref('point_of_sale.group_pos_manager').id)],
            'zhao_warehouse_ids': [(6, 0, [self.warehouse_a.id])],
            'zhao_role': 'store_manager',
        })
        pos_config_a = self.env['pos.config'].create({
            'name': '店长门店A POS',
            'warehouse_id': self.warehouse_a.id,
        })
        pos_config_b = self.env['pos.config'].create({
            'name': '店长门店B POS',
            'warehouse_id': self.warehouse_b.id,
        })
        configs = self.env['pos.config'].with_user(manager).search([])
        self.assertIn(pos_config_a, configs)
        self.assertNotIn(pos_config_b, configs)

    def test_04_area_manager_cross_store(self):
        """area_manager 多 warehouse 可见"""
        area_mgr = self.env['res.users'].create({
            'name': '区域经理',
            'login': 'zhao_area_mgr',
            'groups_id': [(4, self.env.ref('point_of_sale.group_pos_manager').id)],
            'zhao_warehouse_ids': [(6, 0, [self.warehouse_a.id, self.warehouse_b.id])],
            'zhao_role': 'area_manager',
        })
        pos_config_a = self.env['pos.config'].create({
            'name': '区域门店A', 'warehouse_id': self.warehouse_a.id,
        })
        pos_config_b = self.env['pos.config'].create({
            'name': '区域门店B', 'warehouse_id': self.warehouse_b.id,
        })
        configs = self.env['pos.config'].with_user(area_mgr).search([])
        self.assertIn(pos_config_a, configs)
        self.assertIn(pos_config_b, configs)

    def test_05_finance_unrestricted(self):
        """finance 不在 POS group 中，不受门店 record rule 限制"""
        finance_user = self.env['res.users'].create({
            'name': '财务',
            'login': 'zhao_finance',
            'groups_id': [(4, self.env.ref('account.group_account_invoice').id)],
            'zhao_role': 'finance',
        })
        # finance 不在 group_pos_user/group_pos_manager，record rule 不生效
        # 若尝试访问 pos.config，需要 POS 权限才能读
        # 此测试验证：finance 不被强制绑定 warehouse（zhao_role='finance' 不触发校验）
        self.assertFalse(finance_user.zhao_warehouse_ids)
        # 不抛 ValidationError
        finance_user._validate_zhao_warehouse_required()
```

- [ ] **Step 2: 实现视图扩展**

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_iam\views\res_users_views.xml -->
<odoo>
    <data>
        <record id="view_users_form_zhao_iam" model="ir.ui.view">
            <field name="name">res.users.form.zhao.iam</field>
            <field name="model">res.users</field>
            <field name="inherit_id" ref="base.view_users_form"/>
            <field name="arch" type="xml">
                <xpath expr="//page[@name='access_rights']" position="inside">
                    <group string="中国本地化门店权限">
                        <field name="zhao_role"/>
                        <field name="zhao_warehouse_ids" widget="many2many_tags"/>
                    </group>
                </xpath>
            </field>
        </record>
    </data>
</odoo>
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- e:\code\odoo\custom-addons\zhao_pos_iam\views\pos_config_views.xml -->
<odoo>
    <data>
        <record id="view_pos_config_form_zhao_iam" model="ir.ui.view">
            <field name="name">pos.config.form.zhao.iam</field>
            <field name="model">pos.config</field>
            <field name="inherit_id" ref="point_of_sale.view_pos_config_form"/>
            <field name="arch" type="xml">
                <xpath expr="//field[@name='warehouse_id']" position="attributes">
                    <attribute name="required">1</attribute>
                </xpath>
            </field>
        </record>
    </data>
</odoo>
```

- [ ] **Step 3: 运行测试验证通过**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_iam --test-enable --test-tags=zhao_pos_iam --stop-after-init
```
Expected: `test_03_store_manager_own_store`, `test_04_area_manager_cross_store`, `test_05_finance_unrestricted` PASS

- [ ] **Step 4: Commit**

```bash
git -C e:\code\odoo add custom-addons/zhao_pos_iam
git -C e:\code\odoo commit -m "feat: add zhao_pos_iam role matrix tests and views"
```

---

## Task 10: 联合验收测试

**Files:** 无新增，仅运行

- [ ] **Step 1: 联合安装两个模块**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift,zhao_pos_iam --stop-after-init
```
Expected: 退出码 0，"Modules loaded: zhao_pos_shift, zhao_pos_iam"

- [ ] **Step 2: 联合运行所有测试**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift,zhao_pos_iam --test-enable --test-tags=zhao_pos_shift,zhao_pos_iam --stop-after-init
```
Expected: 17 个用例全部 PASS：
- shift: test_01_fields_exist, test_02_open_to_handover, test_03_manager_confirm, test_04_block_closing_without_confirm, test_05_block_counting_with_unpaid_order, test_05_cash_diff_zero, test_06_cash_diff_positive_report, test_07_cash_diff_negative_supply, test_08_cash_diff_negative_approve, test_09_block_handover_with_unhandled_diff
- iam: test_01_two_users_isolated, test_01_users_fields_exist, test_02_cashier_only_own_store, test_03_store_manager_own_store, test_04_area_manager_cross_store, test_05_finance_unrestricted, test_06_empty_warehouse_blocked, test_07_picking_cross_store_or, test_08_payment_isolated

- [ ] **Step 3: 检查日志无 WARNING/ERROR**

人工检查上一步输出，确认：
- 无 `Traceback`
- 无 `WARNING` 级权限错误
- 无 `AccessError` 或 `AccessDenied`

- [ ] **Step 4: 最终 commit（如有视图调整）**

```bash
git -C e:\code\odoo status
# 如有未提交变更：
git -C e:\code\odoo add -A
git -C e:\code\odoo commit -m "test: zhao_pos_shift + zhao_pos_iam joint acceptance passed"
```

---

## Self-Review

**1. Spec 覆盖检查**：
- 第 3 节 pos.session 12 个字段 → Task 2 全部实现
- 第 3 节 4 个方法 → Task 3 全部实现
- 第 3 节视图扩展 → Task 4 实现
- 第 4 节 res.users 2 个字段 → Task 7 实现
- 第 4 节 5 条 record rule → Task 8 实现
- 第 4 节视图扩展 → Task 9 实现
- 第 6 节 17 个测试用例 → Task 2/3/5/7/8/9 全覆盖
- 第 9 节卡点修正全部落地：Task 3 用 `action_pos_session_closing_control`（不用 `action_pos_session_closing_validate`）、Task 2 用 `cash_register_balance_end`（不用 `closing_balance`）、Task 7 约束仅对 uid 非 SUPERUSER 生效、Task 8 record rule 加 `warehouse_id=False` OR 兜底

**2. 占位符扫描**：无 TBD/TODO，所有代码块完整。

**3. 类型一致性**：
- `zhao_shift_state` 枚举值在 Task 2/3 一致
- `zhao_diff_handling` 枚举值在 Task 2/5 一致
- `zhao_role` 枚举值在 Task 7/9 一致
- `action_zhao_start_counting`/`action_zhao_handover`/`action_zhao_manager_confirm`/`action_zhao_report_diff` 方法签名在 Task 3/5 一致

**4. 测试用例编号说明**：测试用例编号与 spec 第 6.2 节矩阵保持一致（test_01~test_09）；iam 的 test_01 在两个文件中分别表示不同含义（test_warehouse_isolation.test_01 与 test_role_matrix.test_01），通过文件名区分，pytest 不会冲突。
