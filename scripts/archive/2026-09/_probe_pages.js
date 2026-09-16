// 打开运营端 4 个列表页，抓取页面文本 / console 错误 / 网络请求
const { chromium } = require("playwright");

const BASE = "https://h.joho.cn";
const PAGES = [
  ["知识实体", "/#/pages/website/knowledge-entity/list"],
  ["知识关系", "/#/pages/website/knowledge-relation/list"],
  ["第一真值", "/#/pages/website/first-truth/list"],
  ["AI摘要", "/#/pages/website/ai-summary/list"],
];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const apiHits = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200)); });
  page.on("request", (req) => { const u = req.url(); if (u.includes("/api/zhao-website")) apiHits.push(`${req.method()} ${u.replace(BASE, "")}`); });
  page.on("response", async (res) => {
    const u = res.url();
    if (u.includes("/api/zhao-website")) {
      const ct = res.headers()["content-type"] || "";
      let len = 0;
      try { const t = await res.text(); len = t.length; } catch (e) {}
      console.log(`API ${res.status()} ${ct.split(";")[0]} len=${len} ${u.replace(BASE, "").slice(0, 90)}`);
    }
  });

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

    for (const [name, path] of PAGES) {
      console.log(`\n===== ${name} ${path}`);
      consoleErrors.length = 0;
      apiHits.length = 0;
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(6000);
      const text = await page.evaluate(() => document.body.innerText);
      const summary = text.split("\n").filter(l => l.trim()).slice(0, 15).join(" | ");
      console.log(`页面文本: ${summary}`);
      console.log(`API 请求: ${apiHits.length ? apiHits.join(" ; ") : "(无)"}`);
      console.log(`console 错误: ${consoleErrors.length ? consoleErrors.join(" || ") : "(无)"}`);
    }
  } finally {
    await browser.close();
  }
})();
