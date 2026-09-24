# 宣传文案 JSON 导入解析修复 — 设计

日期：2026-08-28
模块：`web/src/pages/activity/promo-import.js`

## 背景

运营在 h.joho.cn 宣传文案设计页「粘贴 AI 输出 JSON → 导入」时，AI 一键生成的某份 JSON 触发「json解析结果失败」。
已在本地用 Node 完整复现：`JSON.parse` 报 `Expected ',' or ']' after array element in JSON at position 2071`。

## 根因

该份 AI 输出中 `faq` 模块多了一个右大括号，结构与数组边界错位：

```text
?"}]}},"sort":5}   （异常）
?"}],"sort":5}     （正确）
```

- `]` 关闭 `items` 数组
- `}` 关闭 `config`
- `}`（多余）提前关闭整个 `faq` 模块对象
- 导致 `,"sort":5}` 落到 `promoModules` 数组元素之外，成为裸键 → 语法非法

非 textarea 截断（已 `maxlength="-1"`），也非常规非法字符（全角连字符/中文引号/emoji 均在字符串内合法）。

现有 `repairJson` 只能处理「缺失/末尾」括号，遇到这种「模块被提前双闭、字段掉出元素」的**中途失衡**会照抄，二次 parse 仍失败。

## 修复方案

在 `repairJson` 的 `}` 处理分支新增一条前瞻判断：

> 当要闭合一个 `{` 对象、且其**父级是数组 `[`**，而紧接着（跳过空白）是 `,` 后再跟 `"`（裸键）时，说明此 `}` 是提前多余的闭合：**不输出、不弹栈、直接跳过**；由裸键后的真正 `}` 去闭合对象。

安全性：
- 数组元素不可能以裸键开头；合法的 `,"sort":` 只应出现在对象内部。故识别条件即「多闭了一层」。
- 合法嵌套如 `"config":{"a":{…}},"sort":N` 不受影响（那时父级是 `config` 对象、非数组）。
- 既有的补缺失/错位闭合、忽略末尾多余闭合逻辑保持不变，无回归。

改动量：单个函数加约 6 行，不动数据契约、C 端、部署链路。

## 验证口径

1. 目标样例：用本段 AI JSON 走 `parsePromoImport` → 应 `ok:true`，模块 cover/highlights/rich/agenda/faq/images 及各自 `sort` 保留。
2. 回归 1：合法嵌套 `"config":{"a":{…}},"sort"` 不被误修。
3. 回归 2：AI 漏右括号的场景（原 `repairJson` 能力）不被破坏。