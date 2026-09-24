# RiskTip 类型扩展（riskType）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以扁平枚举 `riskType`（20 态）替换 GEO 文章的 `isFinance` 布尔，前端 RiskTip 按类型映射标签与默认文案，覆盖金融 16 细分品类 + 健康/法律/通用声明。

**Architecture:** 后端仅动 geo-article schema（删 `isFinance`、加 `riskType` enum）并重建 dist；前端 RiskTip 组件内置 `RISK_TIP_MAP` 文案表，`GeoArticle` 类型字段同步替换，GeoArticleView 改为无条件渲染 RiskTip（组件内部自决是否展示）。验证策略为构建 + 接口 + 渲染 grep（本项目无单元测试框架，遵循项目惯例）。

**Tech Stack:** Strapi v5 插件（zhao-website）、Next.js 16 静态导出、PostgreSQL

**Spec:** `docs/superpowers/specs/2026-09-06-risk-tip-type-expansion-design.md`

---

### Task 1: 后端 schema 字段替换（isFinance → riskType）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\server\src\content-types\geo-article\schema.json:59-62`

- [ ] **Step 1: 替换 schema 字段**

将 schema.json 中的：

```json
    "isFinance": { "type": "boolean", "default": false,
      "description": "金融内容开关；开启后前端强制置顶不可折叠风险提示" },
```

替换为：

```json
    "riskType": { "type": "enumeration",
      "enum": ["none", "finance-general", "finance-stock", "finance-fund", "finance-bond",
        "finance-wealth", "finance-futures", "finance-precious-metals", "finance-forex",
        "finance-trust", "finance-convertible-bond", "finance-hk-us-stock", "finance-index",
        "finance-insurance", "finance-otc", "finance-reverse-repo", "finance-cd",
        "health", "legal", "other"],
      "default": "none", "required": true,
      "description": "风险提示/声明类型（none 不展示；finance-* 为金融细分品类）" },
```

- [ ] **Step 2: 验证 JSON 合法**

Run:
```powershell
node -e "const j=JSON.parse(require('fs').readFileSync('e:/code/basic/plugins/zhao-website/server/src/content-types/geo-article/schema.json','utf8')); console.log('ok', j.attributes.riskType.enum.length, 'isFinance:', j.attributes.isFinance)"
```
Expected: `ok 20 isFinance: undefined`

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/server/src/content-types/geo-article/schema.json
git commit -m "feat(zhao-website): geo-article isFinance 替换为 riskType 枚举（20 态）"
```

---

### Task 2: 数据迁移 SQL 脚本

**Files:**
- Create: `e:\code\basic\scripts\migrate_geo_risk_type.sql`

- [ ] **Step 1: 编写迁移脚本**

创建 `e:\code\basic\scripts\migrate_geo_risk_type.sql`：

```sql
-- riskType 迁移：isFinance=true → finance-general；false → none
-- 前提：dist 已部署、Strapi 已重启（risk_type 列由 Strapi bootstrap 自动创建）
-- 用法：psql -U <user> -d <db> -f migrate_geo_risk_type.sql

BEGIN;

UPDATE zhao_website_geo_articles
   SET risk_type = CASE WHEN is_finance THEN 'finance-general' ELSE 'none' END
 WHERE risk_type IS NULL OR risk_type = '';

-- 数据核对（预期：0 行）
SELECT count(*) AS remaining_null FROM zhao_website_geo_articles
 WHERE risk_type IS NULL OR risk_type = '';

-- 确认无误后放开注释执行删列（Strapi 不会自动删旧列）
-- ALTER TABLE zhao_website_geo_articles DROP COLUMN IF EXISTS is_finance;

COMMIT;
```

- [ ] **Step 2: 本地数据库执行验证**

本地 Strapi dev 库执行（用本地库连接信息，若本地无法直连则跳过本步，留待部署任务一并验证）：

```powershell
# 示例（以实际本地库名/用户替换）
psql -h localhost -U postgres -d strapi -f e:/code/basic/scripts/migrate_geo_risk_type.sql
```
Expected: `remaining_null` 为 0

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add scripts/migrate_geo_risk_type.sql
git commit -m "feat(zhao-website): geo-article riskType 数据迁移 SQL"
```

---

### Task 3: 后端 dist 重建与本地接口验证

**Files:**
- Modify: `e:\code\basic\plugins\zhao-website\dist`（构建产物）

- [ ] **Step 1: 重建 dist**

Run（在 `e:\code\basic\plugins\zhao-website` 下）:
```powershell
npm run build
```

- [ ] **Step 2: 确认 dist 含 riskType**

Run:
```powershell
rg -n "finance-general" "e:\code\basic\plugins\zhao-website\dist\server"
```
Expected: 命中（schema 编译产物含枚举值）。无命中 = 构建未生效，禁止继续。

- [ ] **Step 3: 本地 Strapi 重启并验证接口**

重启本地 Strapi（dev :1337）后：

```powershell
curl "http://localhost:1337/api/geo-articles?locale=zh-CN"
```
Expected: 200，返回的每篇文章对象含 `riskType` 字段（值为枚举之一），不再含 `isFinance`。

- [ ] **Step 4: Commit（含 dist）**

```bash
cd e:\code\basic
git add plugins/zhao-website/dist plugins/zhao-website/server
git commit -m "build(zhao-website): 重建 dist 发布 riskType 枚举"
```

---

### Task 4: 前端类型与 RiskTip 文案映射

**Files:**
- Modify: `e:\code\strapi-site\lib\geo-article.ts:7-70`
- Modify: `e:\code\strapi-site\components\modules\geo\RiskTip.tsx`
- Modify: `e:\code\strapi-site\components\views\GeoArticleView.tsx:109`

- [ ] **Step 1: 更新 GeoArticle 类型**

在 `lib/geo-article.ts` 的 `GeoArticleType` 后新增：

```ts
export type RiskType =
  | "none" | "finance-general" | "finance-stock" | "finance-fund" | "finance-bond"
  | "finance-wealth" | "finance-futures" | "finance-precious-metals" | "finance-forex"
  | "finance-trust" | "finance-convertible-bond" | "finance-hk-us-stock" | "finance-index"
  | "finance-insurance" | "finance-otc" | "finance-reverse-repo" | "finance-cd"
  | "health" | "legal" | "other";
```

并将 GeoArticle 中的：

```ts
  isFinance?: boolean;
```

替换为：

```ts
  riskType?: RiskType;
```

- [ ] **Step 2: 重写 RiskTip.tsx**

将 `e:\code\strapi-site\components\modules\geo\RiskTip.tsx` 整体替换为：

```tsx
import type { RiskType } from "@/lib/geo-article";

type RiskTipContent = { label: string; text: string };

/** 枚举 → 标签 + 默认文案；riskDisclaimer 非空时覆盖 text */
export const RISK_TIP_MAP: Record<Exclude<RiskType, "none">, RiskTipContent> = {
  "finance-general": { label: "风险提示", text: "仅供学习，不构成投资建议、理财推荐及交易依据。市场有风险，决策需谨慎。过往业绩、历史走势不代表未来收益，无任何保本保收益承诺。所有投资行为请投资者独立判断、自行承担风险，结合自身风险承受能力、财务状况审慎决策，切勿盲目投资、跟风交易。" },
  "finance-stock": { label: "股票风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。股票价格受宏观经济、行业政策、市场情绪、公司经营、突发事件等多重因素影响，价格波动剧烈，存在本金亏损、价格回撤、个股退市等风险，无固定收益保障，投资者需充分知晓市场波动风险，审慎参与交易。" },
  "finance-fund": { label: "基金风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。公募基金、私募基金、指数基金、定投产品等所有基金产品均不保本、不保收益，已全面打破刚性兑付。基金净值随市场行情实时波动，存在本金亏损、收益不及预期、清盘退市等风险，不同类型基金风险等级差异较大，需匹配自身风险承受能力选择。" },
  "finance-bond": { label: "债券风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。国债、企业债、城投债、信用债等各类债券并非零风险产品，存在信用违约、利率波动、流动性不足、估值下跌、无法按期兑付本息等风险，不存在绝对保本保收益，投资者需审慎甄别发行主体资质，理性投资。" },
  "finance-wealth": { label: "理财产品风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。银行理财、资管理财等各类理财产品已全面打破刚性兑付，不承诺保本保息。产品净值随市场波动，存在本金亏损、收益浮动、提前终止、流动性受限等风险，不同风险评级产品亏损概率不同，投资者需仔细阅读产品说明书，匹配自身风险承受能力。" },
  "finance-futures": { label: "期货期权风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。期货、期权交易自带高杠杆属性，价格波动幅度极大，交易风险极高。投资者可能在短时间内产生大幅亏损，甚至损失全部本金，面临强制平仓风险。该类产品仅适合专业度高、风险承受能力极强的合规投资者，普通投资者请勿盲目参与。" },
  "finance-precious-metals": { label: "贵金属风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。黄金、白银、铂金等贵金属现货、递延、合约及纸贵金属产品，价格受国际局势、美元汇率、全球货币政策、大宗商品行情影响极大，波动频繁且不确定性强，存在本金亏损、价差亏损、流动性不足等多重投资风险。" },
  "finance-forex": { label: "外汇风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。合法合规外汇交易受国际汇率、地缘政治、各国货币政策、国际资本市场波动影响显著，行情不确定性极高。杠杆式外汇交易风险加剧，极易产生大幅本金亏损，且境内非法外汇交易不受法律保护，投资者需严守合规交易渠道。" },
  "finance-trust": { label: "信托产品风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。信托产品无刚性兑付保障，存在信用违约、项目逾期、流动性不足、政策变动、本息延期兑付甚至本金亏损等风险。产品锁定期较长、中途退出难度大，仅适合高净值、高风险承受能力投资者，需充分尽调产品底层资产风险。" },
  "finance-convertible-bond": { label: "可转债风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。可转债兼具债权与股权双重属性，价格高度依赖正股走势，受股市波动影响显著。存在价格大幅下跌、转股失败、溢价亏损、强制赎回、标的退市、流动性枯竭等多重风险，并非稳健保本产品，普通投资者需谨慎参与。" },
  "finance-hk-us-stock": { label: "港股美股风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。港股、美股无涨跌幅限制，交易机制、结算规则、市场制度与A股差异较大，受海外宏观政策、国际资本流动、地缘局势、汇率波动影响深远。存在大幅波动、隔夜跳空、流动性不足、汇率亏损、监管政策变动等多重风险，投资风险显著高于A股市场。" },
  "finance-index": { label: "指数投资风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。指数及指数相关投资无法规避市场系统性风险，受大盘行情、行业周期、政策调整影响会出现大幅波动。指数基金、指数定投、指数衍生品均不保本，存在长期被套、本金亏损、收益不达预期的风险，不存在稳赚、保本增值的投资效果。" },
  "finance-insurance": { label: "保险产品风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。保险产品以保障功能为主，理财型保险收益具有不确定性，不承诺保本保息。产品存在退保亏损、现金价值不足、保障条款限制、收益浮动、缴费周期长、流动性差等风险，请勿将保险等同于存款、理财，需仔细核对条款后审慎投保。" },
  "finance-otc": { label: "场外衍生品风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。场外衍生品交易结构复杂、风险等级极高，缺乏公开透明交易市场，流动性差、估值难度大，存在杠杆亏损、对手方违约、政策合规、无法平仓等多重风险，仅限合规专业机构及合格投资者参与，普通投资者严禁参与。" },
  "finance-reverse-repo": { label: "国债逆回购风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。国债逆回购整体风险极低，但并非零风险，存在极端市场下交易失败、资金到账延迟、收益低于预期、节假日资金闲置无收益等情况，收益随市场资金面波动，无固定收益保障，需理性看待低风险理财属性。" },
  "finance-cd": { label: "存单类产品风险提示", text: "仅供学习，不构成投资建议。市场有风险，决策需谨慎。大额存单、结构性存款等产品，结构性存款不保本不保息，受挂钩标的行情影响收益浮动；大额存单存在提前支取利息损失、流动性受限、利率波动等风险，不存在绝对无风险，需结合自身资金使用需求投资。" },
  health: { label: "健康提示", text: "本内容仅供参考，不构成医疗诊断或治疗建议，如有不适请及时就医。" },
  legal: { label: "法律提示", text: "本内容仅供参考，不构成法律意见，具体问题请咨询专业律师。" },
  other: { label: "声明", text: "本文仅为信息分享，不构成任何专业建议。" },
};

export function riskTipContent(riskType?: RiskType): RiskTipContent | null {
  if (!riskType || riskType === "none") return null;
  return RISK_TIP_MAP[riskType];
}

export default function RiskTip({
  riskType,
  riskDisclaimer,
}: {
  riskType?: RiskType;
  riskDisclaimer?: string;
}) {
  const tip = riskTipContent(riskType);
  if (!tip) return null;
  const text = riskDisclaimer?.trim() || tip.text;
  return (
    <div className="geo-risk-tip" role="note">
      <span className="geo-risk-tip-tag">{tip.label}</span>
      <p className="geo-risk-tip-text">{text}</p>
    </div>
  );
}
```

- [ ] **Step 3: 更新 GeoArticleView 渲染**

将 `GeoArticleView.tsx` 中的：

```tsx
          {article.isFinance && <RiskTip article={article} />}
```

替换为：

```tsx
          <RiskTip riskType={article.riskType} riskDisclaimer={article.riskDisclaimer} />
```

- [ ] **Step 4: 类型检查**

Run:
```powershell
cd e:\code\strapi-site; npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
cd e:\code\strapi-site
git add lib/geo-article.ts components/modules/geo/RiskTip.tsx components/views/GeoArticleView.tsx
git commit -m "feat(strapi-site): RiskTip 支持 riskType 20 态文案映射，替换 isFinance"
```

---

### Task 5: 前端本地渲染与生产构建验证

**Files:**
- 无（仅验证 + 构建产物 `e:\code\strapi-site\out`）

- [ ] **Step 1: 本地 dev 渲染验证**

起本地 Strapi（已含 geo-article 数据），在本地库将一篇文章 `risk_type` 分别设为 `finance-stock`、`health` 验证：

```powershell
# 例：本地库执行
psql -h localhost -U postgres -d strapi -c "UPDATE zhao_website_geo_articles SET risk_type='finance-stock' WHERE id=<某篇id>;"
```
浏览器访问对应文章页，Expected: 顶部出现"股票风险提示"条 + 对应文案；把 `risk_type` 改为 `none` 后刷新，Expected: 提示条消失。

- [ ] **Step 2: 生产构建**

```powershell
cd e:\code\strapi-site
$env:NEXT_PUBLIC_SITE_URL="https://www.joho.cn"
npm run build
```
Expected: 构建成功，`out/` 完整生成（含 `local-report/*.html` 等）。

- [ ] **Step 3: grep 产物确认文案写入**

Run:
```powershell
rg -l "风险提示|健康提示|法律提示" e:\code\strapi-site\out\local-report e:\code\strapi-site\out 2>$null | Select-Object -First 5
```
Expected: 至少命中含非 none riskType 文章的 HTML 页（若当前无此类文章，记录"待上线后有数据再验"）。

- [ ] **Step 4: Commit（out 不入库，无需提交）**

说明：`out/` 为构建产物，不入 git。若本地有 `strapi-site/out` 的 git 忽略配置需确认。

---

### Task 6: 部署与线上验证

**Files:**
- Modify: 生产 Strapi dist（zhao-website）
- Modify: `e:\code\strapi-site\out` 上传替换

- [ ] **Step 1: 提交并推送后端**

```bash
cd e:\code\basic
git push origin main
```
Expected: 推送成功（含 dist）。

- [ ] **Step 2: 部署后端 dist + 重启 + 迁移**

按项目部署脚本流程（scp dist 到 joho → 覆盖 → 重启 strapi），重启后执行：

```bash
ssh joho "psql ... -f /tmp/migrate_geo_risk_type.sql"   # 具体库连接以生产实际为准
```
Expected: `remaining_null = 0`；确认无误后再执行删列 SQL。

- [ ] **Step 3: 生产接口验证**

```powershell
curl "https://www.joho.cn/api/geo-articles?locale=zh-CN"
```
Expected: 200（此前为 404，本次一并修复 GEO dist 缺口）；响应对象含 `riskType` 字段，无 `isFinance`。

- [ ] **Step 4: 前端部署**

```powershell
cd e:\code\strapi-site
.\deploy-www.ps1
```
Expected: tar 上传解包替换，www.joho.cn 静态页更新。

- [ ] **Step 5: 线上渲染验证**

访问 `https://www.joho.cn/local-report/<已发布 slug>`（riskType=finance-* 或 health 的文章），Expected: 页面含对应标签与文案；`none` 文章无提示条。

- [ ] **Step 6: Commit（部署脚本如更新）**

```bash
cd e:\code
git add strapi-site/deploy-www.ps1
git commit -m "chore: riskType 上线部署"
```

---

## Self-Review

- **Spec 覆盖**：枚举 20 态 ✓（Task 1/4）；文案映射全量 19 条 ✓（Task 4）；schema 删 isFinance ✓（Task 1）；迁移 ✓（Task 2）；dist 重建与部署 ✓（Task 3/6）；前端渲染替换 ✓（Task 4/5）；自定义 riskDisclaimer 覆盖 ✓（Task 4 Step 2 `riskDisclaimer?.trim() || tip.text`）。
- **占位符扫描**：无 TBD/待补。所有代码块为最终内容。
- **类型一致性**：`RiskType` 定义于 lib/geo-article.ts（Task 4 Step 1），RiskTip 从该模块 import（Step 2），GeoArticleView 传 `riskType`/`riskDisclaimer`（Step 3），props 名一致；`RISK_TIP_MAP` 键为 `Exclude<RiskType,"none">` 与枚举一致。
- **风险提示**：Task 6 生产 GEO dist 缺口一并修复；删列 SQL 在迁移核对后单独执行（脚本内注释保留）。
