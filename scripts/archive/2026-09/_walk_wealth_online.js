const { chromium } = require("playwright");

const BASE = "https://v.joho.cn/wealth/";
const LOCAL_ASSETS = ["assets/uni.19e9689d.css", "assets/index-CP-dBPz9.js", "assets/index-CFFSeDgm.css"];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const log = (k, v) => console.log(`${k}: ${v}`);

  try {
    // 1) 打开首页，记录重定向链
    let redirects = [];
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) redirects.push(f.url());
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    log("finalUrl", page.url());
    log("redirectChain", JSON.stringify(redirects));

    const body = await page.evaluate(() => document.body.innerText.slice(0, 600));
    log("bodyText", JSON.stringify(body));

    // 2) 抓线上 index.html 资源名（可能已跳走，直接 fetch）
    const html = await page.evaluate(async (url) => {
      const r = await fetch(url, { cache: "no-store" });
      return await r.text();
    }, BASE);
    const onlineAssets = [...html.matchAll(/assets\/[^"']+\.(js|css)/g)].map((m) => m[0]);
    log("onlineAssets", JSON.stringify(onlineAssets));
    log("assetMatch", JSON.stringify(LOCAL_ASSETS.every((a) => onlineAssets.includes(a)) ? "MATCH" : "MISMATCH"));

    // 3) 截图
    await page.screenshot({ path: "e:/code/basic/scripts/_walk_wealth_home.png", fullPage: true });
    log("screenshot", "saved _walk_wealth_home.png");
  } catch (e) {
    console.log("ERR:", e.message.slice(0, 300));
  }
  await browser.close();
})();
