// 为 ga-main-000000001 生成并写入 AI 摘要（tldr，内容基于文章真实内容整理）
const { chromium } = require("playwright");

const BASE = "https://h.joho.cn";
const API = "/api/zhao-website/v1/admin/ai-summaries";

const TARGET_TYPE = "geo-article";
const TARGET_ID = "ga-main-000000001";

const CONTENT_TEXT = "职业没有一劳永逸：吉林职场人长期学习规划四步法。本文结合吉林本地产业与职场实际，围绕四条主线展开：一、职业能力需求随技术更迭与产业升级持续迁移，职业规划是从「一次择业」转向「动态迭代」的过程；二、长期学习规划四步法——诊断（梳理技能差距）→ 选径（确定课程/证书/项目实践路径）→ 执行（按周拆解并记录学习日志）→ 复盘（对照职业目标校准方向）；三、多元学习渠道组合使用——公共图书馆资源、本地职业院校与社会培训、人社部门补贴性培训目录、行业公开课与沙龙，优先盘活本地资源；四、常见三大误区——把报名付费当作学到技能、只追热点不做体系、忽视复盘与方向校准。本文权威依据参考中华人民共和国教育部及相关官方来源，适用于吉林及各地职场人建立可持续的学习体系。";

const CONTENT = {
  tldr: "职业没有一劳永逸，长期学习规划四步法（诊断-选径-执行-复盘）帮助吉林职场人以确定性应对技术更迭与产业升级。",
  keyPoints: [
    "职业能力需求随技术更迭和产业升级持续迁移，职业规划是动态迭代过程，不再是一次择业终身受用",
    "四步法：每季度诊断技能差距 → 确定学习路径 → 按周拆解执行并记录 → 每年复盘校准方向",
    "学习渠道多元组合：图书馆等公共资源、职业院校与社区教育、人社补贴培训、行业公开课，优先本地资源",
    "避免三大误区：报名付费≠学到技能、只追热点不做体系、忽视复盘与方向校准",
  ],
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();

  try {
    // 登录
    await page.goto(`${BASE}/#/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    const inputs = page.locator("input");
    await inputs.nth(0).fill("admin");
    await inputs.nth(1).fill("__ADMIN_PASSWORD__");
    await page.locator("uni-button.login-btn").click();
    let loggedIn = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1200);
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes("当前租户")) { loggedIn = true; break; }
    }
    console.log(`login: ${loggedIn ? "OK" : "FAIL"}`);
    if (!loggedIn) { await browser.close(); return; }

    const token = await page.evaluate(() => localStorage.getItem("tadmin_token") || "");
    const tenant = await page.evaluate(() => localStorage.getItem("tadmin_current_tenant_id") || "");

    const payload = {
      data: {
        targetType: TARGET_TYPE,
        targetId: TARGET_ID,
        summaryType: "tldr",
        content: CONTENT,
        contentText: CONTENT_TEXT,
        language: "zh-CN",
        generatedBy: "ai_generated",
        aiProvider: "joho-internal",
        aiModel: "manual-curated",
        generatedAt: new Date().toISOString(),
        verificationStatus: "verified",
        status: true,
      },
    };

    const result = await page.evaluate(async ({ API, payload, token, tenant }) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (tenant) headers["x-site-id"] = String(tenant);
      const r = await fetch(API, { method: "POST", headers, body: JSON.stringify(payload) });
      const text = await r.text();
      return { status: r.status, body: text.slice(0, 600) };
    }, { API, payload, token, tenant });

    console.log(`POST ${API} -> ${result.status}`);
    console.log(`body: ${result.body}`);

    // 验证：列表查询
    const list = await page.evaluate(async ({ API, token, tenant }) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (tenant) headers["x-site-id"] = String(tenant);
      const r = await fetch(`${API}?pagination[page]=1&pagination[pageSize]=10`, { headers });
      return { status: r.status, body: (await r.text()).slice(0, 400) };
    }, { API, token, tenant });
    console.log(`\nGET 列表 -> ${list.status}`);
    console.log(`body: ${list.body}`);
  } finally {
    await browser.close();
  }
})();
