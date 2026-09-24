# zhao_member_points 会员积分模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建会员积分获取/抵扣/回滚 MVP 闭环，通过 points_service 显式 API 供 zhao_market_pos 调用

**Architecture:** 新建 zhao_member_points 模块，依赖 zhao_member/zhao_market_pos/zhao_pos_iam。积分逻辑集中在 services/points_service.py，使用 SQL 原子操作保证并发安全。不依赖 Odoo 原生 pos.order 钩子，由 pos_service 显式调用。

**Tech Stack:** Odoo 19, Python, SQL 原子操作, TransactionCase 测试

**Spec:** `docs/superpowers/specs/2026-07-30-zhao-member-points-design.md`

---

## 文件结构

```
zhao_member_points/
├── __init__.py                          # 空文件
├── __manifest__.py                      # 模块清单
├── models/
│   ├── __init__.py                      # 模型注册
│   ├── zhao_member.py                   # inherit: 加 points_balance
│   ├── zhao_member_level.py             # inherit: 加 points_earn_rate
│   ├── zhao_market_pos_order.py         # inherit: 加 member_points_deduct_amount
│   └── zhao_member_points_history.py    # 新模型: 积分流水
├── services/
│   ├── __init__.py                      # 导出 PointsService
│   └── points_service.py                # 积分业务逻辑层
├── views/
│   └── points_history_views.xml         # 流水查询视图
├── security/
│   ├── ir.model.access.csv              # 权限矩阵
│   └── points_security.xml              # 记录规则（多门店隔离）
└── tests/
    ├── __init__.py
    ├── test_points_earn.py              # 获取测试（6 个）
    ├── test_points_deduct.py            # 抵扣测试（5 个）
    └── test_points_refund.py            # 回滚测试（5 个）
```

---

### Task 1: 模块骨架

**Files:**
- Create: `e:\code\odoo\custom-addons\zhao_member_points\__init__.py`
- Create: `e:\code\odoo\custom-addons\zhao_member_points\__manifest__.py`
- Create: `e:\code\odoo\custom-addons\zhao_member_points\models\__init__.py`
- Create: `e:\code\odoo\custom-addons\zhao_member_points\services\__init__.py`
- Create: `e:\code\odoo\custom-addons\zhao_member_points\tests\__init__.py`

- [ ] **Step 1: 创建目录和 __init__.py**

创建 `e:\code\odoo\custom-addons\zhao_member_points\__init__.py`：
```python
```

创建 `e:\code\odoo\custom-addons\zhao_member_points\models\__init__.py`：
```python
from . import zhao_member_points_history
from . import zhao_member
from . import zhao_member_level
from . import zhao_market_pos_order
```

创建 `e:\code\odoo\custom-addons\zhao_member_points\services\__init__.py`：
```python
from .points_service import PointsService, PointsServiceError
```

创建 `e:\code\odoo\custom-addons\zhao_member_points\tests\__init__.py`：
```python
from . import test_points_earn
from . import test_points_deduct
from . import test_points_refund
```

- [ ] **Step 2: 创建 __manifest__.py**

创建 `e:\code\odoo\custom-addons\zhao_member_points\__manifest__.py`：
```python
{
    'name': 'Zhao Member Points',
    'version': '19.0.1.0.0',
    'category': 'Zhao/POS',
    'summary': '中国本地化收银：会员积分（获取/抵扣/回滚 MVP）',
    'description': """
Zhao Member Points - Phase 3
=====================
- 消费赠积分（消费额 × 等级倍率）
- 积分抵扣现金（固定汇率 100 积分=1 元，上限 50%）
- 退货回滚（获取回滚 + 抵扣返还）
- 积分流水审计
- 多门店隔离
""",
    'author': 'Zhao',
    'website': 'https://example.com',
    'license': 'LGPL-3',
    'depends': ['zhao_member', 'zhao_market_pos', 'zhao_pos_iam'],
    'data': [
        'security/ir.model.access.csv',
        'security/points_security.xml',
        'views/points_history_views.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
```

- [ ] **Step 3: 创建占位文件（后续 Task 填充）**

创建空的占位文件（后续 Task 填充内容）：
- `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member_points_history.py`（空）
- `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member.py`（空）
- `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member_level.py`（空）
- `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_market_pos_order.py`（空）
- `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py`（空）
- `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_earn.py`（空）
- `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_deduct.py`（空）
- `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_refund.py`（空）

- [ ] **Step 4: 验证目录结构**

Run: `dir /s /b e:\code\odoo\custom-addons\zhao_member_points`
Expected: 列出所有创建的文件

- [ ] **Step 5: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/
git commit -m "feat(zhao_member_points): 模块骨架"
```

---

### Task 2: 积分流水模型 + 权限 + 隔离规则

**Files:**
- Create: `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member_points_history.py`
- Create: `e:\code\odoo\custom-addons\zhao_member_points\security\ir.model.access.csv`
- Create: `e:\code\odoo\custom-addons\zhao_member_points\security\points_security.xml`

- [ ] **Step 1: 创建 zhao.member.points.history 模型**

写入 `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member_points_history.py`：
```python
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class ZhaoMemberPointsHistory(models.Model):
    _name = 'zhao.member.points.history'
    _description = '会员积分流水'
    _order = 'changed_at desc'

    member_id = fields.Many2one('zhao.member', '会员', required=True, index=True)
    market_order_id = fields.Many2one(
        'zhao.market.pos.order', '关联订单',
        help='手工调整时为空',
    )
    change_type = fields.Selection([
        ('earn', '获取'),
        ('deduct', '抵扣'),
        ('refund_earn', '退货回滚获取'),
        ('refund_deduct', '退货返还抵扣'),
        ('adjust', '手工调整'),
    ], '变更类型', required=True)
    points = fields.Integer('变更积分', required=True, help='正数加，负数减')
    balance_after = fields.Integer('变更后余额', required=True)
    amount_paid = fields.Float('订单实付金额', help='获取规则计算依据')
    rate_applied = fields.Float('实际倍率', help='快照')
    warehouse_id = fields.Many2one('stock.warehouse', '门店')
    reason = fields.Char('备注')
    changed_by = fields.Many2one('res.users', '操作人', default=lambda self: self.env.uid)
    changed_at = fields.Datetime('时间', default=fields.Datetime.now)

    @api.constrains('points')
    def _check_points_nonzero(self):
        for rec in self:
            if rec.points == 0:
                raise ValidationError(_("变更积分不能为 0"))

    @api.constrains('balance_after')
    def _check_balance_non_negative(self):
        for rec in self:
            if rec.balance_after < 0:
                raise ValidationError(_("变更后余额不能为负: %d") % rec.balance_after)
```

- [ ] **Step 2: 创建 ir.model.access.csv**

创建 `e:\code\odoo\custom-addons\zhao_member_points\security\ir.model.access.csv`：
```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_zhao_member_points_history_user,zhao.member.points.history.user,model_zhao_member_points_history,point_of_sale.group_pos_user,1,0,1,0
access_zhao_member_points_history_manager,zhao.member.points.history.manager,model_zhao_member_points_history,point_of_sale.group_pos_manager,1,1,1,1
```

- [ ] **Step 3: 创建 points_security.xml**

创建 `e:\code\odoo\custom-addons\zhao_member_points\security\points_security.xml`：
```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <data noupdate="1">
        <!-- zhao.member.points.history 按会员门店隔离 -->
        <record id="rule_zhao_member_points_history_warehouse" model="ir.rule">
            <field name="name">zhao.member.points.history: 按会员门店隔离</field>
            <field name="model_id" ref="model_zhao_member_points_history"/>
            <field name="domain_force">
                ['|', ('member_id.warehouse_id', 'in', user.zhao_warehouse_ids.ids), ('member_id.warehouse_id', '=', False)]
            </field>
            <field name="groups" eval="[(4, ref('point_of_sale.group_pos_user'))]"/>
        </record>

        <record id="rule_zhao_member_points_history_manager_warehouse" model="ir.rule">
            <field name="name">zhao.member.points.history: 店长按门店隔离</field>
            <field name="model_id" ref="model_zhao_member_points_history"/>
            <field name="domain_force">
                ['|', ('member_id.warehouse_id', 'in', user.zhao_warehouse_ids.ids), ('member_id.warehouse_id', '=', False)]
            </field>
            <field name="groups" eval="[(4, ref('point_of_sale.group_pos_manager'))]"/>
        </record>
    </data>
</odoo>
```

- [ ] **Step 4: 语法验证**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/models/zhao_member_points_history.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 5: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/models/zhao_member_points_history.py custom-addons/zhao_member_points/security/
git commit -m "feat(zhao_member_points): 积分流水模型 + 权限 + 多门店隔离规则"
```

---

### Task 3: 扩展 zhao.member 和 zhao.member.level

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member.py`
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member_level.py`

- [ ] **Step 1: 扩展 zhao.member 加 points_balance**

写入 `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member.py`：
```python
from odoo import fields, models


class ZhaoMember(models.Model):
    _inherit = 'zhao.member'

    points_balance = fields.Integer(
        '积分余额', default=0,
        help='当前可用积分余额，由 points_service 维护，禁止手动修改',
    )
```

- [ ] **Step 2: 扩展 zhao.member.level 加 points_earn_rate**

写入 `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_member_level.py`：
```python
from odoo import fields, models


class ZhaoMemberLevel(models.Model):
    _inherit = 'zhao.member.level'

    points_earn_rate = fields.Float(
        '积分获取倍率', default=1.0,
        help='消费额 × 倍率 = 获取积分，如金卡 1.5 表示消费 1 元得 1.5 积分',
    )
```

- [ ] **Step 3: 语法验证**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/models/zhao_member.py', encoding='utf-8').read()); ast.parse(open('custom-addons/zhao_member_points/models/zhao_member_level.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 4: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/models/zhao_member.py custom-addons/zhao_member_points/models/zhao_member_level.py
git commit -m "feat(zhao_member_points): 扩展 zhao.member 加 points_balance + level 加 points_earn_rate"
```

---

### Task 4: 扩展 zhao.market.pos.order

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_market_pos_order.py`

- [ ] **Step 1: 扩展 zhao.market.pos.order 加 member_points_deduct_amount**

写入 `e:\code\odoo\custom-addons\zhao_member_points\models\zhao_market_pos_order.py`：
```python
from odoo import fields, models


class ZhaoMarketPosOrder(models.Model):
    _inherit = 'zhao.market.pos.order'

    member_points_deduct_amount = fields.Monetary(
        '积分抵扣金额', default=0.0,
        help='本单使用积分抵扣的金额，由 points_service 写入',
    )
```

- [ ] **Step 2: 语法验证**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/models/zhao_market_pos_order.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/models/zhao_market_pos_order.py
git commit -m "feat(zhao_member_points): 扩展 zhao.market.pos.order 加 member_points_deduct_amount"
```

---

### Task 5: points_service 骨架 + earn_points 方法

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py`
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_earn.py`

- [ ] **Step 1: 写 earn_points 测试**

写入 `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_earn.py`：
```python
import math
from odoo.tests.common import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestPointsEarn(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Warehouse = cls.env['stock.warehouse']
        cls.warehouse = cls.Warehouse.search([], limit=1)
        if not cls.warehouse:
            cls.warehouse = cls.Warehouse.create({'name': '测试门店', 'code': 'TEST'})
        cls.Level = cls.env['zhao.member.level']
        cls.normal_level = cls.Level.create({
            'name': '普通', 'sequence': 10, 'discount_rate': 100.0, 'points_earn_rate': 1.0,
        })
        cls.gold_level = cls.Level.create({
            'name': '金卡', 'sequence': 20, 'discount_rate': 95.0, 'points_earn_rate': 1.5,
        })
        cls.Member = cls.env['zhao.member']
        cls.member = cls.Member.create({
            'name': '张三', 'mobile': '13800138000',
            'level_id': cls.normal_level.id,
            'warehouse_id': cls.warehouse.id,
        })
        # 创建 paid 状态的 zhao.market.pos.order
        cls.Config = cls.env['pos.config']
        cls.config = cls.Config.create({'name': '测试收银台'})
        cls.Session = cls.env['pos.session']
        cls.session = cls.Session.create({
            'config_id': cls.config.id, 'user_id': cls.env.uid,
        })
        cls.session.action_pos_session_open()
        cls.session._set_opening_control_data(0.0, '')
        cls.Order = cls.env['zhao.market.pos.order']
        cls.Payment = cls.env['zhao.market.pos.payment']

    def _create_paid_order(self, member, level_snapshot, amount_paid):
        """创建已支付订单"""
        order = self.Order.create({
            'session_id': self.session.id,
            'zhao_member_id': member.id if member else False,
            'member_level_id': level_snapshot.id if level_snapshot else False,
            'state': 'paid',
        })
        # 创建支付记录让 amount_paid compute 生效
        self.Payment.create({
            'config_id': self.config.id,
            'order_id': order.id,
            'payment_method': 'cash',
            'amount': amount_paid,
        })
        return order

    def test_earn_points_basic(self):
        """订单支付后按消费额 × 倍率获取积分"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        order = self._create_paid_order(self.member, self.normal_level, 100.0)
        service = PointsService(self.env)
        service.earn_points(order)
        self.assertEqual(self.member.points_balance, 100)
        self.assertEqual(order.member_points_earned, 100)

    def test_earn_points_no_member(self):
        """无会员订单不获取积分"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        order = self._create_paid_order(None, None, 100.0)
        service = PointsService(self.env)
        service.earn_points(order)
        self.assertEqual(order.member_points_earned, 0)

    def test_earn_points_zero_amount(self):
        """金额为 0 不获取积分"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        order = self._create_paid_order(self.member, self.normal_level, 0.0)
        service = PointsService(self.env)
        service.earn_points(order)
        self.assertEqual(self.member.points_balance, 0)
        self.assertEqual(order.member_points_earned, 0)

    def test_earn_points_level_snapshot(self):
        """用订单 member_level_id 快照倍率，非会员当前等级"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        # 会员当前是普通（1.0倍率），但下单时快照金卡（1.5倍率）
        order = self._create_paid_order(self.member, self.gold_level, 100.0)
        service = PointsService(self.env)
        service.earn_points(order)
        # 用快照金卡倍率：100 * 1.5 = 150
        self.assertEqual(self.member.points_balance, 150)
        self.assertEqual(order.member_points_earned, 150)

    def test_earn_points_floor(self):
        """积分向下取整"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        # 金卡 1.5 倍率，消费 99.9 元 → 149.85 → floor 149
        order = self._create_paid_order(self.member, self.gold_level, 99.9)
        service = PointsService(self.env)
        service.earn_points(order)
        self.assertEqual(self.member.points_balance, 149)

    def test_earn_points_no_level(self):
        """等级快照为空用默认倍率 1.0"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        order = self._create_paid_order(self.member, None, 100.0)
        service = PointsService(self.env)
        service.earn_points(order)
        self.assertEqual(self.member.points_balance, 100)
```

- [ ] **Step 2: 写 earn_points 实现**

写入 `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py`：
```python
"""积分业务逻辑层 —— 所有积分变更集中在此。
zhao_market_pos 的 pos_service 通过本层调用积分功能。
"""
import logging
import math

from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class PointsServiceError(Exception):
    """积分业务错误基类"""


class PointsService:
    """积分业务逻辑层。

    用法：
        service = PointsService(env)
        service.earn_points(order)
        result = service.apply_points_deduction(member_id, points, amount)
    """

    # 抵扣汇率：100 积分 = 1 元
    POINTS_TO_CURRENCY_RATE = 100.0
    # 单笔最多抵扣订单金额 50%
    MAX_DEDUCT_RATIO = 0.5

    def __init__(self, env):
        self.env = env

    def earn_points(self, order):
        """订单支付后获取积分。

        :param order: zhao.market.pos.order 记录（state=paid）
        :return: 获取的积分数（0 表示未获取）
        """
        member = order.zhao_member_id
        if not member:
            return 0
        amount_paid = order.amount_paid
        if amount_paid <= 0:
            return 0
        # 用订单等级快照倍率，非会员当前等级
        level = order.member_level_id
        rate = level.points_earn_rate if level else 1.0
        points = int(math.floor(amount_paid * rate))
        if points <= 0:
            return 0
        # SQL 原子加积分
        self.env.cr.execute(
            "UPDATE zhao_member SET points_balance = points_balance + %s WHERE id = %s RETURNING points_balance",
            (points, member.id),
        )
        new_balance = self.env.cr.fetchone()[0]
        # 创建流水
        self.env['zhao.member.points.history'].create({
            'member_id': member.id,
            'market_order_id': order.id,
            'change_type': 'earn',
            'points': points,
            'balance_after': new_balance,
            'amount_paid': amount_paid,
            'rate_applied': rate,
            'warehouse_id': member.warehouse_id.id if member.warehouse_id else False,
            'reason': f'订单 {order.name} 消费获取',
            'changed_by': self.env.uid,
        })
        # 回写订单
        order.member_points_earned = points
        return points
```

- [ ] **Step 3: 语法验证**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); ast.parse(open('custom-addons/zhao_member_points/tests/test_points_earn.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 4: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py custom-addons/zhao_member_points/tests/test_points_earn.py
git commit -m "feat(zhao_member_points): points_service 骨架 + earn_points 方法 + 6 个测试"
```

---

### Task 6: apply_points_deduction 方法

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py`
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_deduct.py`

- [ ] **Step 1: 写抵扣测试**

写入 `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_deduct.py`：
```python
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import ValidationError


@tagged('post_install', '-at_install')
class TestPointsDeduct(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Warehouse = cls.env['stock.warehouse']
        cls.warehouse = cls.Warehouse.search([], limit=1)
        if not cls.warehouse:
            cls.warehouse = cls.Warehouse.create({'name': '测试门店', 'code': 'TEST'})
        cls.Level = cls.env['zhao.member.level']
        cls.normal_level = cls.Level.create({
            'name': '普通', 'sequence': 10, 'discount_rate': 100.0, 'points_earn_rate': 1.0,
        })
        cls.Member = cls.env['zhao.member']
        cls.member = cls.Member.create({
            'name': '张三', 'mobile': '13800138001',
            'level_id': cls.normal_level.id,
            'warehouse_id': cls.warehouse.id,
            'points_balance': 1000,  # 预置 1000 积分
        })

    def test_deduct_points_basic(self):
        """正常抵扣，余额扣减，返回 deduct_amount"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        service = PointsService(self.env)
        result = service.apply_points_deduction(self.member.id, 200, 100.0)
        self.assertEqual(result['deduct_amount'], 2.0)
        self.assertEqual(result['points_used'], 200)
        self.assertEqual(self.member.points_balance, 800)

    def test_deduct_points_insufficient_balance(self):
        """余额不足抛异常"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService, PointsServiceError
        service = PointsService(self.env)
        with self.assertRaises(PointsServiceError):
            service.apply_points_deduction(self.member.id, 2000, 100.0)

    def test_deduct_points_over_50_percent(self):
        """超过 50% 上限抛异常"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService, PointsServiceError
        service = PointsService(self.env)
        # 订单 100 元，50% 上限 = 50 元 = 5000 积分
        # 尝试用 6000 积分（=60 元，超过 50%）
        with self.assertRaises(PointsServiceError):
            service.apply_points_deduction(self.member.id, 6000, 100.0)

    def test_deduct_points_zero(self):
        """抵扣 0 积分抛异常"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService, PointsServiceError
        service = PointsService(self.env)
        with self.assertRaises(PointsServiceError):
            service.apply_points_deduction(self.member.id, 0, 100.0)

    def test_deduct_points_concurrent(self):
        """并发抵扣：余额只够一次，第二次失败"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService, PointsServiceError
        # 余额 1000，两次各扣 800（第一次成功，第二次余额不足）
        service = PointsService(self.env)
        result = service.apply_points_deduction(self.member.id, 800, 100.0)
        self.assertEqual(result['points_used'], 800)
        # 第二次应失败（余额 200 < 800）
        with self.assertRaises(PointsServiceError):
            service.apply_points_deduction(self.member.id, 800, 100.0)
```

- [ ] **Step 2: 加 apply_points_deduction 实现**

在 `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py` 的 `earn_points` 方法之后追加：
```python

    def apply_points_deduction(self, member_id, points_to_use, order_amount):
        """积分抵扣现金。

        :param member_id: zhao.member ID
        :param points_to_use: 要使用的积分数
        :param order_amount: 订单总金额（用于计算 50% 上限）
        :return: {'deduct_amount': float, 'points_used': int}
        :raises PointsServiceError: 余额不足/超限/并发冲突
        """
        if points_to_use <= 0:
            raise PointsServiceError("抵扣积分数必须大于 0")
        member = self.env['zhao.member'].browse(member_id)
        if not member.exists():
            raise PointsServiceError(f"会员 {member_id} 不存在")
        # 50% 上限：points_to_use <= order_amount * 0.5 * 100
        max_points = int(math.floor(order_amount * self.MAX_DEDUCT_RATIO * self.POINTS_TO_CURRENCY_RATE))
        if points_to_use > max_points:
            raise PointsServiceError(
                f"抵扣积分 {points_to_use} 超过订单金额 50% 上限 {max_points}"
            )
        # SQL 原子扣减
        self.env.cr.execute(
            "UPDATE zhao_member SET points_balance = points_balance - %s "
            "WHERE id = %s AND points_balance >= %s RETURNING points_balance",
            (points_to_use, member_id, points_to_use),
        )
        row = self.env.cr.fetchone()
        if row is None:
            raise PointsServiceError("积分不足或并发冲突")
        new_balance = row[0]
        deduct_amount = points_to_use / self.POINTS_TO_CURRENCY_RATE
        # 创建流水
        self.env['zhao.member.points.history'].create({
            'member_id': member_id,
            'change_type': 'deduct',
            'points': -points_to_use,
            'balance_after': new_balance,
            'amount_paid': order_amount,
            'rate_applied': self.POINTS_TO_CURRENCY_RATE,
            'warehouse_id': member.warehouse_id.id if member.warehouse_id else False,
            'reason': f'订单抵扣现金 {deduct_amount:.2f} 元',
            'changed_by': self.env.uid,
        })
        return {'deduct_amount': deduct_amount, 'points_used': points_to_use}
```

- [ ] **Step 3: 语法验证**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); ast.parse(open('custom-addons/zhao_member_points/tests/test_points_deduct.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 4: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py custom-addons/zhao_member_points/tests/test_points_deduct.py
git commit -m "feat(zhao_member_points): apply_points_deduction 方法 + 5 个测试"
```

---

### Task 7: refund_points 方法

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py`
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_refund.py`

- [ ] **Step 1: 写回滚测试**

写入 `e:\code\odoo\custom-addons\zhao_member_points\tests\test_points_refund.py`：
```python
from odoo.tests.common import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestPointsRefund(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Warehouse = cls.env['stock.warehouse']
        cls.warehouse = cls.Warehouse.search([], limit=1)
        if not cls.warehouse:
            cls.warehouse = cls.Warehouse.create({'name': '测试门店', 'code': 'TEST'})
        cls.Level = cls.env['zhao.member.level']
        cls.normal_level = cls.Level.create({
            'name': '普通', 'sequence': 10, 'discount_rate': 100.0, 'points_earn_rate': 1.0,
        })
        cls.Member = cls.env['zhao.member']
        cls.member = cls.Member.create({
            'name': '张三', 'mobile': '13800138002',
            'level_id': cls.normal_level.id,
            'warehouse_id': cls.warehouse.id,
        })
        cls.Config = cls.env['pos.config']
        cls.config = cls.Config.create({'name': '测试收银台'})
        cls.Session = cls.env['pos.session']
        cls.session = cls.Session.create({
            'config_id': cls.config.id, 'user_id': cls.env.uid,
        })
        cls.session.action_pos_session_open()
        cls.session._set_opening_control_data(0.0, '')
        cls.Order = cls.env['zhao.market.pos.order']
        cls.Payment = cls.env['zhao.market.pos.payment']

    def _create_paid_order_with_points(self, member, level, amount_paid, points_earned, points_used=0):
        """创建已支付订单并预置积分字段"""
        order = self.Order.create({
            'session_id': self.session.id,
            'zhao_member_id': member.id,
            'member_level_id': level.id if level else False,
            'state': 'paid',
            'member_points_earned': points_earned,
            'member_points_used': points_used,
        })
        self.Payment.create({
            'config_id': self.config.id,
            'order_id': order.id,
            'payment_method': 'cash',
            'amount': amount_paid,
        })
        return order

    def test_refund_points_basic(self):
        """退货回滚获取 + 返还抵扣"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        # 预置会员余额 500（含已获 100 + 已用 200 对应的抵扣返还）
        self.member.points_balance = 500
        order = self._create_paid_order_with_points(
            self.member, self.normal_level, 100.0,
            points_earned=100, points_used=200,
        )
        service = PointsService(self.env)
        service.refund_points(order)
        # 回滚获取：500 - 100 = 400
        # 返还抵扣：400 + 200 = 600
        self.assertEqual(self.member.points_balance, 600)
        # 订单字段清零
        self.assertEqual(order.member_points_earned, 0)
        self.assertEqual(order.member_points_used, 0)
        self.assertEqual(order.member_points_deduct_amount, 0.0)

    def test_refund_points_only_earned(self):
        """仅获取无抵扣的订单退货"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        self.member.points_balance = 100
        order = self._create_paid_order_with_points(
            self.member, self.normal_level, 100.0,
            points_earned=100, points_used=0,
        )
        service = PointsService(self.env)
        service.refund_points(order)
        self.assertEqual(self.member.points_balance, 0)

    def test_refund_points_only_deducted(self):
        """仅抵扣无获取的订单退货"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        self.member.points_balance = 300
        order = self._create_paid_order_with_points(
            self.member, self.normal_level, 100.0,
            points_earned=0, points_used=200,
        )
        service = PointsService(self.env)
        service.refund_points(order)
        # 无获取回滚，仅返还抵扣：300 + 200 = 500
        self.assertEqual(self.member.points_balance, 500)

    def test_refund_points_insufficient_balance(self):
        """余额不足回滚获取时 clamp 到 0"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        # 余额只剩 30，但要回滚 100 获取积分
        self.member.points_balance = 30
        order = self._create_paid_order_with_points(
            self.member, self.normal_level, 100.0,
            points_earned=100, points_used=0,
        )
        service = PointsService(self.env)
        service.refund_points(order)
        # clamp 到 0（不抛异常）
        self.assertEqual(self.member.points_balance, 0)

    def test_refund_points_already_refunded(self):
        """已退货订单不重复回滚"""
        from odoo.addons.zhao_member_points.services.points_service import PointsService
        self.member.points_balance = 100
        order = self._create_paid_order_with_points(
            self.member, self.normal_level, 100.0,
            points_earned=100, points_used=0,
        )
        service = PointsService(self.env)
        # 第一次回滚
        service.refund_points(order)
        self.assertEqual(self.member.points_balance, 0)
        # 第二次回滚应跳过
        service.refund_points(order)
        self.assertEqual(self.member.points_balance, 0)
```

- [ ] **Step 2: 加 refund_points 实现**

在 `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py` 的 `apply_points_deduction` 方法之后追加：
```python

    def refund_points(self, order):
        """退货时回滚积分。

        :param order: 原始 zhao.market.pos.order 记录
        :return: True 表示执行了回滚，False 表示已回滚跳过
        """
        member = order.zhao_member_id
        if not member:
            return False
        # 检查是否已回滚
        existing = self.env['zhao.member.points.history'].search_count([
            ('market_order_id', '=', order.id),
            ('change_type', 'in', ['refund_earn', 'refund_deduct']),
        ])
        if existing > 0:
            _logger.warning("订单 %s 已回滚积分，跳过", order.name)
            return False
        # 回滚顺序：先回滚获取（减），再返还抵扣（加）
        # 1. 回滚获取
        if order.member_points_earned > 0:
            points_to_deduct = order.member_points_earned
            # SQL 原子扣减，余额不足时 clamp
            self.env.cr.execute(
                "UPDATE zhao_member SET points_balance = points_balance - %s "
                "WHERE id = %s AND points_balance >= %s RETURNING points_balance",
                (points_to_deduct, member.id, points_to_deduct),
            )
            row = self.env.cr.fetchone()
            if row is None:
                # 余额不足，clamp 到 0
                self.env.cr.execute(
                    "UPDATE zhao_member SET points_balance = 0 "
                    "WHERE id = %s RETURNING points_balance",
                    (member.id,),
                )
                new_balance = self.env.cr.fetchone()[0]
                actual_deducted = points_to_deduct  # 记录原始值用于日志，实际扣的是原余额
                _logger.warning(
                    "订单 %s 回滚获取积分 %d 时余额不足，clamp 到 0",
                    order.name, points_to_deduct,
                )
            else:
                new_balance = row[0]
                actual_deducted = points_to_deduct
            self.env['zhao.member.points.history'].create({
                'member_id': member.id,
                'market_order_id': order.id,
                'change_type': 'refund_earn',
                'points': -actual_deducted,
                'balance_after': new_balance,
                'amount_paid': order.amount_paid,
                'warehouse_id': member.warehouse_id.id if member.warehouse_id else False,
                'reason': f'退货 {order.name} 回滚获取积分',
                'changed_by': self.env.uid,
            })
        # 2. 返还抵扣
        if order.member_points_used > 0:
            points_to_return = order.member_points_used
            self.env.cr.execute(
                "UPDATE zhao_member SET points_balance = points_balance + %s "
                "WHERE id = %s RETURNING points_balance",
                (points_to_return, member.id),
            )
            new_balance = self.env.cr.fetchone()[0]
            self.env['zhao.member.points.history'].create({
                'member_id': member.id,
                'market_order_id': order.id,
                'change_type': 'refund_deduct',
                'points': points_to_return,
                'balance_after': new_balance,
                'warehouse_id': member.warehouse_id.id if member.warehouse_id else False,
                'reason': f'退货 {order.name} 返还抵扣积分',
                'changed_by': self.env.uid,
            })
        # 清零订单积分字段
        order.write({
            'member_points_earned': 0,
            'member_points_used': 0,
            'member_points_deduct_amount': 0.0,
        })
        return True
```

- [ ] **Step 3: 语法验证**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); ast.parse(open('custom-addons/zhao_member_points/tests/test_points_refund.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 4: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py custom-addons/zhao_member_points/tests/test_points_refund.py
git commit -m "feat(zhao_member_points): refund_points 方法 + 5 个测试"
```

---

### Task 8: adjust_points 方法

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py`

- [ ] **Step 1: 加 adjust_points 实现**

在 `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py` 的 `refund_points` 方法之后追加：
```python

    def adjust_points(self, member_id, points, reason):
        """手工调整积分。

        :param member_id: zhao.member ID
        :param points: 调整积分数（正数加，负数减）
        :param reason: 调整原因
        :return: {'points': int, 'balance_after': int}
        :raises PointsServiceError: 调整后余额为负
        """
        if points == 0:
            raise PointsServiceError("调整积分数不能为 0")
        member = self.env['zhao.member'].browse(member_id)
        if not member.exists():
            raise PointsServiceError(f"会员 {member_id} 不存在")
        # SQL 原子更新，确保调整后余额 >= 0
        self.env.cr.execute(
            "UPDATE zhao_member SET points_balance = points_balance + %s "
            "WHERE id = %s AND points_balance + %s >= 0 RETURNING points_balance",
            (points, member_id, points),
        )
        row = self.env.cr.fetchone()
        if row is None:
            raise PointsServiceError("积分不足，无法扣减")
        new_balance = row[0]
        self.env['zhao.member.points.history'].create({
            'member_id': member_id,
            'change_type': 'adjust',
            'points': points,
            'balance_after': new_balance,
            'warehouse_id': member.warehouse_id.id if member.warehouse_id else False,
            'reason': reason or '手工调整',
            'changed_by': self.env.uid,
        })
        return {'points': points, 'balance_after': new_balance}
```

- [ ] **Step 2: 语法验证**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py
git commit -m "feat(zhao_member_points): adjust_points 手工调整方法"
```

---

### Task 9: 流水查询视图

**Files:**
- Create: `e:\code\odoo\custom-addons\zhao_member_points\views\points_history_views.xml`

- [ ] **Step 1: 创建流水视图**

写入 `e:\code\odoo\custom-addons\zhao_member_points\views\points_history_views.xml`：
```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <!-- 流水列表视图 -->
    <record id="view_zhao_member_points_history_list" model="ir.ui.view">
        <field name="name">zhao.member.points.history.list</field>
        <field name="model">zhao.member.points.history</field>
        <field name="arch" type="xml">
            <list string="积分流水">
                <field name="changed_at"/>
                <field name="member_id"/>
                <field name="change_type"/>
                <field name="points"/>
                <field name="balance_after"/>
                <field name="amount_paid"/>
                <field name="rate_applied"/>
                <field name="market_order_id"/>
                <field name="changed_by"/>
                <field name="reason"/>
            </list>
        </field>
    </record>

    <!-- 流水表单视图 -->
    <record id="view_zhao_member_points_history_form" model="ir.ui.view">
        <field name="name">zhao.member.points.history.form</field>
        <field name="model">zhao.member.points.history</field>
        <field name="arch" type="xml">
            <form string="积分流水">
                <sheet>
                    <group>
                        <field name="member_id"/>
                        <field name="change_type"/>
                        <field name="points"/>
                        <field name="balance_after"/>
                    </group>
                    <group>
                        <field name="market_order_id"/>
                        <field name="amount_paid"/>
                        <field name="rate_applied"/>
                        <field name="warehouse_id"/>
                        <field name="changed_by"/>
                        <field name="changed_at"/>
                        <field name="reason"/>
                    </group>
                </sheet>
            </form>
        </field>
    </record>

    <!-- 流水搜索视图 -->
    <record id="view_zhao_member_points_history_search" model="ir.ui.view">
        <field name="name">zhao.member.points.history.search</field>
        <field name="model">zhao.member.points.history</field>
        <field name="arch" type="xml">
            <search string="积分流水">
                <field name="member_id"/>
                <field name="market_order_id"/>
                <field name="reason"/>
                <filter name="filter_earn" string="获取" domain="[('change_type', '=', 'earn')]"/>
                <filter name="filter_deduct" string="抵扣" domain="[('change_type', '=', 'deduct')]"/>
                <filter name="filter_refund" string="退货回滚" domain="[('change_type', 'in', ['refund_earn', 'refund_deduct'])]"/>
                <filter name="filter_adjust" string="手工调整" domain="[('change_type', '=', 'adjust')]"/>
                <group expand="0" string="分组">
                    <filter name="group_member" string="会员" context="{'group_by': 'member_id'}"/>
                    <filter name="group_type" string="变更类型" context="{'group_by': 'change_type'}"/>
                    <filter name="group_date" string="日期" context="{'group_by': 'changed_at:day'}"/>
                </group>
            </search>
        </field>
    </record>

    <!-- 流水 action -->
    <record id="action_zhao_member_points_history" model="ir.actions.act_window">
        <field name="name">积分流水</field>
        <field name="res_model">zhao.member.points.history</field>
        <field name="view_mode">list,form</field>
        <field name="search_view_id" ref="view_zhao_member_points_history_search"/>
        <field name="context">{'search_default_today': 1}</field>
    </record>
</odoo>
```

- [ ] **Step 2: XML 语法验证**

Run: `cd e:\code\odoo && python -c "import xml.etree.ElementTree as ET; ET.parse('custom-addons/zhao_member_points/views/points_history_views.xml'); print('xml ok')"`
Expected: `xml ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/views/points_history_views.xml
git commit -m "feat(zhao_member_points): 积分流水查询视图（list/form/search/action）"
```

---

### Task 10: 全量测试验证

**Files:**
- 无文件改动，纯验证

- [ ] **Step 1: 安装模块**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_member_points --stop-after-init
```
Expected: exit code 0，无 traceback

- [ ] **Step 2: 运行全量测试**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_member_points --test-enable --test-tags=/zhao_member_points --stop-after-init
```
Expected: 16 个测试全部通过（6 earn + 5 deduct + 5 refund），0 失败 0 错误

- [ ] **Step 3: 汇总测试结果**

记录：
- 总测试数
- 通过数
- 失败数
- 失败的测试名称和错误信息（如有）

- [ ] **Step 4: 最终 Commit（如有修复）**

如果测试发现需要修复的问题，修复后提交：
```bash
cd e:\code\odoo
git add -A
git commit -m "fix(zhao_member_points): 测试修复"
```

如果测试全通过，无需额外提交。
