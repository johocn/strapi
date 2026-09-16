// 运营端四个页面 UI 渲染验证：知识实体 / 第一真值 / 知识关系 / AI 摘要
const { chromium } = require("playwright");

const BASE = "https://h.joho.cn";

const PAGES = [
  ["知识实体", "/#/pages/website/knowledge-entity/list"],
  ["第一真值", "/#/pages/website/first-truth/list"],
  ["知识关系", "/#/pages/website/knowledge-relation/list"],
  ["AI 摘要", "/#/pages/website/ai-summary/list"],
];

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

    for (const [name, path] of PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(3500);
      const info = await page.evaluate(() => {
        const text = document.body.innerText || "";
        // 统计常见列表空态文案
        const emptyHits = ["暂无数据", "没有数据", "暂无内容", "空空如也", "暂无", "无数据"].filter((k) => text.includes(k));
        // 抓取可能的列表项文本（截取页面中间区域）
        const trimmed = text.replace(/\s+/g, " ").slice(0, 800);
        return { emptyHits, sample: trimmed };
      });
      console.log(`\n===== ${name} (${path}) =====`);
      console.log(`空态关键词: ${info.emptyHits.length ? info.emptyHits.join(",") : "无"}`);
      console.log(`页面文本样本: ${info.sample.slice(0, 400)}`);
    }
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
