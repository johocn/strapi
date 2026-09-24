# zhao_member_points ORM 缓存失效修复 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 points_service.py 中 SQL UPDATE 后 ORM 缓存未失效导致 7 个测试失败的问题。

**Architecture:** 在 4 个方法的 5 个 SQL UPDATE RETURNING 位置之后，新增 `member.invalidate_recordset(['points_balance'])` 调用，使 ORM 缓存精准失效。SQL 语句本身不变，保持 `WHERE points_balance >= %s` 原子条件检查的并发安全性。

**Tech Stack:** Odoo 19, Python 3, TransactionCase 测试

---

## 文件结构

| 文件 | 职责 | 改动类型 |
|------|------|----------|
| `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py` | 积分业务逻辑层，4 个方法 5 处加 invalidate | 修改 |

测试文件不改动（16 个测试已存在，是正确的，只是 ORM 缓存导致读不到新值）。

---

### Task 1: earn_points 加 invalidate

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py:56`

- [ ] **Step 1: 在 earn_points 的 SQL UPDATE RETURNING 后加 invalidate**

将第 52-56 行：

```python
        self.env.cr.execute(
            "UPDATE zhao_member SET points_balance = points_balance + %s WHERE id = %s RETURNING points_balance",
            (points, member.id),
        )
        new_balance = self.env.cr.fetchone()[0]
```

改为：

```python
        self.env.cr.execute(
            "UPDATE zhao_member SET points_balance = points_balance + %s WHERE id = %s RETURNING points_balance",
            (points, member.id),
        )
        new_balance = self.env.cr.fetchone()[0]
        member.invalidate_recordset(['points_balance'])
```

- [ ] **Step 2: 验证语法**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py
git commit -m "fix(zhao_member_points): earn_points SQL UPDATE 后失效 ORM 缓存"
```

---

### Task 2: apply_points_deduction 加 invalidate

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py:103`

- [ ] **Step 1: 在 apply_points_deduction 的 new_balance 赋值后加 invalidate**

将第 100-103 行：

```python
        row = self.env.cr.fetchone()
        if row is None:
            raise PointsServiceError("积分不足或并发冲突")
        new_balance = row[0]
```

改为：

```python
        row = self.env.cr.fetchone()
        if row is None:
            raise PointsServiceError("积分不足或并发冲突")
        new_balance = row[0]
        member.invalidate_recordset(['points_balance'])
```

- [ ] **Step 2: 验证语法**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py
git commit -m "fix(zhao_member_points): apply_points_deduction SQL UPDATE 后失效 ORM 缓存"
```

---

### Task 3: refund_points 回滚获取分支加 invalidate

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py:160-163`

**注意：** 回滚获取有两个 SQL UPDATE 分支（主分支 + clamp 到 0 分支）。在 `if row is None: ... else: ...` 的 if/else 块结束之后、`create` 流水之前，统一加 1 处 invalidate，覆盖两种情况。

- [ ] **Step 1: 在 if/else 块之后、create 流水之前加 invalidate**

将第 160-163 行：

```python
            else:
                new_balance = row[0]
                actual_deducted = points_to_deduct
            self.env['zhao.member.points.history'].create({
```

改为：

```python
            else:
                new_balance = row[0]
                actual_deducted = points_to_deduct
            member.invalidate_recordset(['points_balance'])
            self.env['zhao.member.points.history'].create({
```

- [ ] **Step 2: 验证语法**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py
git commit -m "fix(zhao_member_points): refund_points 回滚获取分支 SQL UPDATE 后失效 ORM 缓存"
```

---

### Task 4: refund_points 返还抵扣分支加 invalidate

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py:182`

- [ ] **Step 1: 在返还抵扣的 new_balance 赋值后加 invalidate**

将第 177-182 行：

```python
            self.env.cr.execute(
                "UPDATE zhao_member SET points_balance = points_balance + %s "
                "WHERE id = %s RETURNING points_balance",
                (points_to_return, member.id),
            )
            new_balance = self.env.cr.fetchone()[0]
```

改为：

```python
            self.env.cr.execute(
                "UPDATE zhao_member SET points_balance = points_balance + %s "
                "WHERE id = %s RETURNING points_balance",
                (points_to_return, member.id),
            )
            new_balance = self.env.cr.fetchone()[0]
            member.invalidate_recordset(['points_balance'])
```

- [ ] **Step 2: 验证语法**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py
git commit -m "fix(zhao_member_points): refund_points 返还抵扣分支 SQL UPDATE 后失效 ORM 缓存"
```

---

### Task 5: adjust_points 加 invalidate

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_member_points\services\points_service.py:224`

- [ ] **Step 1: 在 adjust_points 的 new_balance 赋值后加 invalidate**

将第 221-224 行：

```python
        row = self.env.cr.fetchone()
        if row is None:
            raise PointsServiceError("积分不足，无法扣减")
        new_balance = row[0]
```

改为：

```python
        row = self.env.cr.fetchone()
        if row is None:
            raise PointsServiceError("积分不足，无法扣减")
        new_balance = row[0]
        member.invalidate_recordset(['points_balance'])
```

- [ ] **Step 2: 验证语法**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_member_points/services/points_service.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_member_points/services/points_service.py
git commit -m "fix(zhao_member_points): adjust_points SQL UPDATE 后失效 ORM 缓存"
```

---

### Task 6: 全量测试验证

**Files:** 无修改

- [ ] **Step 1: 运行 zhao_member_points 全量 16 个测试**

Run:

```bash
cd e:\code\odoo
& "e:\code\odoo\venv\Scripts\python.exe" "e:\code\odoo\odoo-bin" -c "e:\code\odoo\odoo.conf" -d odoo_dev -u zhao_member_points --test-enable --test-tags=/zhao_member_points --stop-after-init
```

Expected: `0 failed, 0 error(s) of 16 tests`

- [ ] **Step 2: 确认 7 个原失败测试全部通过**

检查日志中以下测试不再出现 FAIL：
- `test_earn_points_basic`
- `test_deduct_points_basic`
- `test_refund_points_basic`
- `test_refund_points_already_refunded`
- `test_refund_points_insufficient_balance`
- `test_refund_points_only_deducted`
- `test_refund_points_only_earned`

- [ ] **Step 3: 确认 git 历史**

Run: `cd e:\code\odoo && git log --oneline -6`
Expected: 看到 Task 1-5 各一个 commit

---

## Self-Review 检查

**1. Spec 覆盖：**
- ✅ earn_points 1 处 invalidate → Task 1
- ✅ apply_points_deduction 1 处 invalidate → Task 2
- ✅ refund_points 回滚获取（主分支 + clamp 分支统一）1 处 invalidate → Task 3
- ✅ refund_points 返还抵扣 1 处 invalidate → Task 4
- ✅ adjust_points 1 处 invalidate → Task 5
- ✅ 全量测试验证 → Task 6

**2. 占位符扫描：** 无 TBD/TODO，每个 step 都有完整代码 ✓

**3. 类型一致性：**
- `member.invalidate_recordset(['points_balance'])` - 5 个 Task 中签名完全一致 ✓
- `member` 变量在 4 个方法中都可用（earn_points: `order.zhao_member_id`，apply_points_deduction: `browse(member_id)`，refund_points: `order.zhao_member_id`，adjust_points: `browse(member_id)`）✓
