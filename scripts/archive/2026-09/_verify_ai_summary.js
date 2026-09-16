// 验证 AI 摘要：接口列表非空 + 列表页渲染 + 详情页显示摘要文本
const { chromium } = require("playwright");

const BASE = "https://h.joho.cn";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text().slice(0, 150)); });

  try {
    await page.goto(`${BASE}/#/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    const inputs = page.locator("input");
    await inputs.nth(0).fill("admin");
    await inputs.nth(1).fill("__ADMIN_PASSWORD__");
    await page.locator("uni-button.login-btn").click();
    let ok = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1200);
      if ((await page.evaluate(() => document.body.innerText)).includes("当前租户")) { ok = true; break; }
    }
    console.log(`login: ${ok ? "OK" : "FAIL"}`);
    if (!ok) { await browser.close(); return; }

    const token = await page.evaluate(() => localStorage.getItem("tadmin_token") || "");
    const tenant = await page.evaluate(() => localStorage.getItem("tadmin_current_tenant_id") || "");

    // 1) 接口列表
    const list = await page.evaluate(async ({ token, tenant }) => {
      const h = { "Content-Type": "application/json" };
      if (token) h["Authorization"] = `Bearer ${token}`;
      if (tenant) h["x-site-id"] = String(tenant);
      const r = await fetch(`/api/zhao-website/v1/admin/ai-summaries?pagination[page]=1&pagination[pageSize]=10`, { headers: h });
      const t = await r.text();
      return { status: r.status, len: t.length, preview: t.slice(0, 300) };
    }, { token, tenant });
    console.log(`\n[接口] /ai-summaries -> ${list.status} len=${list.len}`);
    console.log(`  preview: ${list.preview}`);

    // 2) 列表页
    await page.goto(`${BASE}/#/pages/website/ai-summary/list`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    const listText = (await page.evaluate(() => document.body.innerText)).split("\n").filter(l => l.trim()).slice(0, 12).join(" | ");
    console.log(`\n[列表页] ${listText}`);
    console.log(`  console错误: ${errors.length ? errors.join(" || ") : "(无)"}`);

    // 3) 详情页（点击第一条进入）
    const firstCard = page.locator(".item-card").first();
    if (await firstCard.count()) {
      await firstCard.tap();
      await page.waitForTimeout(4000);
      const detailText = (await page.evaluate(() => document.body.innerText)).split("\n").filter(l => l.trim()).slice(0, 14).join(" | ");
      console.log(`\n[详情页] ${detailText}`);
    } else {
      console.log(`\n[详情页] 列表无卡片，无法进入`);
    }
  } finally {
    await browser.close();
  }
})();
