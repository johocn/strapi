const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const DOC_ID = "ga-main-000000001";
  try {
    await page.goto("https://h.joho.cn/#/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    const inputs = page.locator("input");
    await inputs.nth(0).fill("admin");
    await inputs.nth(1).fill("__ADMIN_PASSWORD__");
    await page.locator("uni-button.login-btn").click();
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1200);
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes("当前租户")) break;
    }
    await page.goto(`https://h.joho.cn/#/pages/website/geo-article/edit?documentId=${DOC_ID}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000);

    const picker = page.locator(".section-bind-row").first().locator("uni-picker");
    await picker.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const box = await picker.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1500);
    // 检查页面任何可见的弹层选项
    const state = await page.evaluate(() => {
      const anyVisible = Array.from(document.querySelectorAll(".uni-picker-item")).filter(i => {
        const r = i.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return { visibleItems: anyVisible.length, firstVisible: anyVisible[0] ? anyVisible[0].innerText : "" };
    });
    console.log("STATE:", JSON.stringify(state));
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
