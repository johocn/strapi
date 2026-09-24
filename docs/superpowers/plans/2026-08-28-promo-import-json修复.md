# 宣传文案 JSON 导入解析容错加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 AI 生成的宣传 JSON 因「模块被提前双闭、`"sort"` 掉出元素」导致导入解析失败的问题，加固 `repairJson` 识别中途多余闭合符。

**Architecture:** 在 `web/src/pages/activity/promo-import.js` 的 `repairJson` 的 `}` 分支新增前瞻判断：当闭合的 `{` 其父级是数组 `[`、且紧随 `,` 后是 `"`（裸键）时，判定该 `}` 为提前多余的闭合，跳过它，由其后真正的 `}` 去闭合对象。改动后对目标 JSON 及两例回归用临时 Node 脚本验证，再构建部署到 h.joho.cn。

**Tech Stack:** uni-app Vue3 + Vite（web 运营端），Node 临时脚本校验。

---

## 文件结构

- 修改：`web/src/pages/activity/promo-import.js`（`repairJson` 的 `}` 分支，约 L98-113）
- 临时校验（不提交）：仓库根 `_promo_repair_test.cjs`
- 部署脚本（复用）：`web/deploy-h5.ps1` → h.joho.cn

---

## Task 1: 加固 `repairJson` 识别提前双闭

**Files:**
- Modify: `web/src/pages/activity/promo-import.js:98-113`

- [ ] **Step 1: 阅读现状确认行区间**

读取 `web/src/pages/activity/promo-import.js` 的 `repairJson`，确认 `}`/`]` 处理分支：

```js
if (ch === '}' || ch === ']') {
  const expect = ch === '}' ? '{' : '['
  while (stack.length && stack[stack.length - 1] !== expect) {
    const open = stack.pop()
    trimTrail()
    out += open === '{' ? '}' : ']'
  }
  if (stack.length && stack[stack.length - 1] === expect) {
    stack.pop()
    trimTrail()
    out += ch
    last = ch
  }
  continue
}
```

- [ ] **Step 2: 在该分支开头插入前瞻跳过逻辑**

把上一步的 `if (ch === '}' || ch === ']') {` 分支内、`const expect` 之前，插入：

```js
if (ch === '}' || ch === ']') {
  // 前瞻：数组元素对象被提前双闭，导致后面 `,"sort":N}` 掉出元素。
  // 若此 `}` 闭合的 `{` 父级为数组 `[`，且紧随 `,` 后是 `"`（裸键，非法作数组元素）→ 该 `}` 为提前多余，跳过，由其后真正的 `}` 闭合对象。
  if (ch === '}' && stack[stack.length - 1] === '{' && stack[stack.length - 2] === '[') {
    let k = i + 1
    while (k < s.length && /\s/.test(s[k])) k++
    if (s[k] === ',') {
      let j = k + 1
      while (j < s.length && /\s/.test(s[j])) j++
      if (s[j] === '"') { continue }
    }
  }
  const expect = ch === '}' ? '{' : '['
  // ... 后续原有逻辑不变
}
```

预期：`}]}},"sort":5}` 中第二个 `}` 被跳过，输出变为合法的 `}]}, "sort":5}`。

- [ ] **Step 3: 提交**

```bash
git add web/src/pages/activity/promo-import.js
git commit -m "fix(activity): 宣传文案JSON导入容错识别模块提前双闭(sort掉出元素)"
```

---

## Task 2: 用临时 Node 校验真实源码

**Files:**
- Create（临时，不提交）：`_promo_repair_test.cjs`

- [ ] **Step 1: 写临时校验脚本**

创建 `_promo_repair_test.cjs`，通过「读源码→去 import→去 export→eval」加载真实 `repairJson/parsePromoImport`：

```js
const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.resolve(__dirname, 'web/src/pages/activity/promo-import.js'), 'utf8')
  .replace("import { PROMO_PALETTES } from './promo-palettes.js'", 'const PROMO_PALETTES = []')
const code = src.replace(/export\s+function\s+/g, 'function ') +
  '\n;globalThis.__pi={parsePromoImport,repairJson,stripCodeBlock,normalizePromoModules};'
;(0, eval)(code)
const { parsePromoImport, repairJson } = globalThis.__pi

let fail = 0
function assert(name, cond) { console.log((cond ? 'PASS' : 'FAIL') + '  ' + name); if (!cond) fail++ }

// 1) 目标：AI 生成的 faq 模块提前双闭导致 sort 掉出元素
const broken = '{"title":"t1","description":"d","promoModules":[{"type":"cover","config":{"title":"x"},"sort":1},{"type":"faq","config":{"items":[{"q":"q1","a":"a1"}]}},"sort":5},{"type":"images","config":{"images":[]},"sort":6}],"paletteKey":"nature-green"}'
const r1 = parsePromoImport(broken)
assert('1 目标样例 ok', r1.ok === true)
assert('1 模块类型覆盖', r1.ok && r1.data.promoModules.map(m => m.type).join(',') === 'cover,faq,images')
assert('1 faq 含 1 条问答', r1.ok && r1.data.promoModules.find(m => m.type === 'faq').config.items.length === 1)

// 2) 回归：合法嵌套 config 出现 `}},"sort":` 不得误修
const legit = '{"promoModules":[{"type":"custom","config":{"title":"A","meta":{"b":1}},"sort":1},{"type":"faq","config":{"items":[{"q":"q","a":"a"}]},"sort":2}]}'
const r2 = parsePromoImport(legit)
assert('2 合法嵌套 ok', r2.ok === true)
assert('2 sort 保留', r2.ok && r2.data.promoModules.find(m => m.type === 'faq').sort === 2)
assert('2 未丢字段', r2.ok && r2.data.promoModules.find(m => m.type === 'custom').config.meta.b === 1)

// 3) 回归：AI 漏右括号（原 repairJson 能力）不被破坏
const r3 = parsePromoImport('{"title":"t3","promoModules":[{"type":"cover","config":{"title":"x"')
assert('3 漏右括号仍修复', r3.ok === true)

console.log(fail ? '\nFAILED ' + fail + ' 项' : '\n全部通过')
process.exitCode = fail ? 1 : 0
```

注意：`broken` 必须是**带双闭缺陷**的形态 `},"sort":5}`（非 `}],"sort":5}`），以复现线上报错。

- [ ] **Step 2: 运行并预期全 PASS**

```bash
node _promo_repair_test.cjs
```

预期输出三组 `PASS`，末尾 `全部通过`，退出码 0。若任一 FAIL，回到 Task 1 调整实现后重跑。

- [ ] **Step 3: 用运营完整 JSON 复核（可选强度）**

把用户提供的完整 JSON 存成 `_promo_full.txt`，在脚本临时段读取 `parsePromoImport(fs.readFileSync('_promo_full.txt','utf8'))`，断言 `ok===true` 且模块数 6、顺序 cover/highlights/rich/agenda/faq/images。

> 临时脚本不提交、不进 git。

---

## Task 3: 构建并部署到 h.joho.cn

**Files:**
- 运行：`web` 内 `npm run build:h5`；`web/deploy-h5.ps1`

- [ ] **Step 1: 构建 H5**

```bash
npm run build:h5
```

预期：产出 `web/dist/build/h5`，含 `assets/index-*.js` 新哈希。若改动过 `web/src/config/env.js` 的线上后端地址需先还原。

- [ ] **Step 2: 用 deploy-h5.ps1 部署**

```bash
./deploy-h5.ps1
```

目标：h.joho.cn（joho 主机，远程 rm/cp 需 sudo；脚本内已处理）。

- [ ] **Step 3: 一致性校验**

```bash
ssh joho "grep -o 'assets/index-*.js' <h.joho.cn 站点>/index/index.html"
```
与本地 `web/dist/build/h5/index.html` 引用的同名 assets 比对，一致即部署成功。

- [ ] **Step 4: 线上回归**

在 h.joho.cn 对应活动宣传页「粘贴 AI 输出 JSON」粘贴用户那份完整 JSON → 点「导入 JSON 并回填」应显示「已回填」，推广字段正确回填（faq 模块 5 条问答、6 个模块、配色 stay）。

---

## 自检

- 规格覆盖：根因（多一个 `}`）+ 修复（前瞻跳过）+ 验证 3 例，全部有对应 Task。
- 无占位符：每步含完整代码与命令。
- 类型一致：`parsePromoImport` 返回 `{ok, errors, data}`、`repairJson` 参数 `s` 等名称全程一致。