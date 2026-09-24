# zhao_member_points ORM 缓存失效修复 设计文档

## 背景与问题

`zhao_member_points` 模块 16 个单元测试中有 7 个失败，根因是 `points_service.py` 使用 `self.env.cr.execute("UPDATE zhao_member SET points_balance = ... RETURNING ...")` 直接 SQL 更新会员积分余额。SQL 成功后数据库已更新，但 ORM 内部缓存中 `member.points_balance` 仍持有旧值。测试通过 `self.member.points_balance` 读取时命中缓存，得到旧值，导致断言失败。

## 失败测试清单

| 测试方法 | 失败断言 | 期望值 | 实际值 |
|---------|---------|-------|-------|
| `test_earn_points_basic` | `self.member.points_balance` | 100 | 0 |
| `test_deduct_points_basic` | `self.member.points_balance` | 800 | 1000 |
| `test_refund_points_basic` | `self.member.points_balance` | 600 | 500 |
| `test_refund_points_already_refunded` | `self.member.points_balance` | 0 | 100 |
| `test_refund_points_insufficient_balance` | `self.member.points_balance` | 0 | 30 |
| `test_refund_points_only_deducted` | `self.member.points_balance` | 500 | 300 |
| `test_refund_points_only_earned` | `self.member.points_balance` | 0 | 100 |

## 修复方案

采用 `invalidate_recordset(['points_balance'])` 精准失效方案。

在每个 SQL UPDATE RETURNING 拿到 `new_balance` 之后，紧跟一行：

```python
member.invalidate_recordset(['points_balance'])
```

使该字段的 ORM 缓存失效，下次读取（无论从 service 内部还是测试）都从数据库重新加载。

### 选择理由

- **保持并发安全**：SQL UPDATE 语句本身不变，`WHERE points_balance >= %s` 原子条件检查仍有效
- **最小改动**：每个 UPDATE 点加 1 行，共 5 处新增
- **精准失效**：只失效 `points_balance` 单字段，不影响其他字段缓存
- **流水写入不变**：`RETURNING` 拿到的 `new_balance` 仍用于写入流水记录的 `balance_after` 字段

### 不选择的方案

- `invalidate_recordset()`（不带参数）：全量失效，影响面大于必要
- 改用 ORM `write`：丧失 `WHERE points_balance >= %s` 原子条件检查，无法在 UPDATE 时防并发扣减超限

## 修复点清单（6 个 SQL UPDATE 位置，5 处 invalidate）

| 方法 | 行号 | SQL UPDATE 说明 | invalidate 位置 |
|------|------|----------------|----------------|
| `earn_points` | 52-55 | 加积分 | 第 56 行 `new_balance = ...` 之后 |
| `apply_points_deduction` | 95-98 | 扣减积分 | 第 103 行 `new_balance = row[0]` 之后 |
| `refund_points`（回滚获取） | 141-144 + 149-152 | 主分支 + clamp 分支 | 第 161-162 行 `else` 块之后、`create` 流水之前统一加 1 处，覆盖两分支 |
| `refund_points`（返还抵扣） | 177-180 | 返还抵扣 | 第 182 行 `new_balance = ...` 之后 |
| `adjust_points` | 216-219 | 手工调整 | 第 224 行 `new_balance = row[0]` 之后 |

### refund_points 回滚获取分支的统一 invalidate

原代码结构：
```python
if order.member_points_earned > 0:
    points_to_deduct = order.member_points_earned
    self.env.cr.execute(...)  # 主分支 UPDATE
    row = self.env.cr.fetchone()
    if row is None:
        # clamp 到 0
        self.env.cr.execute(...)  # clamp 分支 UPDATE
        new_balance = self.env.cr.fetchone()[0]
        actual_deducted = points_to_deduct
        _logger.warning(...)
    else:
        new_balance = row[0]
        actual_deducted = points_to_deduct
    # 在此处加 invalidate，覆盖两分支
    self.env['zhao.member.points.history'].create({...})
```

在 `else` 块结束之后、`create` 流水之前，插入：

```python
    member.invalidate_recordset(['points_balance'])
```

这样无论走主分支还是 clamp 分支，缓存都会被失效。

## 不改动的部分

- SQL UPDATE 语句本身（包括 `WHERE points_balance >= %s` 条件和 `RETURNING` 子句）
- 流水记录的 `balance_after` 字段写入逻辑（仍用 SQL 返回的 `new_balance`）
- 测试代码（测试断言是正确的，只是 ORM 缓存导致读不到新值）
- 其他模型、控制器、视图文件

## 验证

运行 `zhao_member_points` 全量 16 个测试：

```bash
cd e:\code\odoo
& "e:\code\odoo\venv\Scripts\python.exe" "e:\code\odoo\odoo-bin" -c "e:\code\odoo\odoo.conf" -d odoo_dev -u zhao_member_points --test-enable --test-tags=/zhao_member_points --stop-after-init
```

期望：`0 failed, 0 error(s) of 16 tests`。

## 范围

单文件修改：`e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py`，新增 5 行 `invalidate_recordset` 调用。不涉及其他文件。
