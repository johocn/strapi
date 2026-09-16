// GEO/SEO JSON-LD 深度校验：提取线上页面全部 JSON-LD 块，语法 + 结构断言
// 用法：node _ld_validate.mjs
const BASE = "https://www.joho.cn";
const PAGES = {
  article: `${BASE}/geo-article/career-lifelong-learning-plan`,
  home: `${BASE}/`,
  knowledge: `${BASE}/knowledge/learning`,
};

const results = [];
function check(page, name, ok, detail = "") {
  results.push({ page, name, ok: !!ok, detail });
}

function extractBlocks(html) {
  const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1]));
    } catch (e) {
      out.push({ __parseError: `${e.message} @ ${m[1].slice(0, 120)}` });
    }
  }
  return out;
}

function typesOf(blocks) {
  return blocks.flatMap((b) => (Array.isArray(b) ? b : [b])).map((b) => b["@type"]);
}

async function main() {
  for (const [key, url] of Object.entries(PAGES)) {
    const res = await fetch(url);
    const html = await res.text();
    const blocks = extractBlocks(html);
    const jsonld = blocks.filter((b) => !b.__parseError);
    const types = typesOf(jsonld);

    check(key, "HTTP 200", res.status === 200, String(res.status));
    check(key, "JSON-LD 语法全部合法", blocks.length === jsonld.length, `${blocks.length} 块，${blocks.length - jsonld.length} 解析失败`);
    for (const b of jsonld) {
      const arr = Array.isArray(b) ? b : [b];
      for (const item of arr) {
        if (item["@type"] === "BreadcrumbList") {
          const elems = item.itemListElement || [];
          check(key, "BreadcrumbList ≥2 项且 item 为绝对 URL",
            elems.length >= 2 && elems.every((e) => typeof e.item === "string" && e.item.startsWith(BASE)),
            JSON.stringify(elems.map((e) => e.item)));
          check(key, "BreadcrumbList position 连续",
            elems.every((e, i) => e.position === i + 1));
        }
        if (item["@type"] === "Article") {
          check(key, "Article 含 headline/datePublished/author/publisher",
            !!(item.headline && item.datePublished && item.author?.name && item.publisher?.name));
          check(key, "Article speakable cssSelector 存在",
            Array.isArray(item.speakable) && item.speakable[0]?.["@type"] === "SpeakableSpecification" &&
              (item.speakable[0].cssSelector || []).includes(".geo-body"),
            JSON.stringify(item.speakable?.[0]?.cssSelector));
          const mentions = item.mentions || [];
          check(key, "Article mentions 为 DefinedTerm 且带 url",
            mentions.length > 0 && mentions.every((m) => m["@type"] === "DefinedTerm" && typeof m.url === "string" && m.url.startsWith(BASE)),
            `${mentions.length} 个`);
          const citation = item.citation || [];
          check(key, "Article citation 为 CreativeWork 且非空",
            citation.length > 0 && citation.every((c) => c["@type"] === "CreativeWork" && c.name),
            `${citation.length} 条`);
        }
        if (item["@type"] === "Organization" || item["@type"] === "WebSite") {
          check(key, `${item["@type"]} name/url 合法`, !!item.name && item.url === BASE);
        }
      }
    }
    // speakable cssSelector 对应的 .geo-body 区块确实存在于页面
    if (types.includes("Article")) {
      check(key, ".geo-body 正文区块存在于 HTML", html.includes('class="geo-body"'));
    }
    // 实体标签链接化：文章页应有 /knowledge/ 链接
    if (key === "article") {
      const links = [...html.matchAll(/href="\/knowledge\/([^"]+)"/g)].map((m) => m[1]);
      check(key, "实体标签链接存在", links.length > 0, `${[...new Set(links)].length} 个唯一知识页链接`);
    }
    // 首页 Organization/WebSite 各恰好 1 份（不重复）
    if (key === "home") {
      const org = jsonld.filter((b) => typesOf([b]).includes("Organization")).length;
      const site = jsonld.filter((b) => typesOf([b]).includes("WebSite")).length;
      check(key, "Organization 恰 1 份", org === 1, `实际 ${org}`);
      check(key, "WebSite 恰 1 份", site === 1, `实际 ${site}`);
    }
  }

  let fail = 0;
  for (const r of results) {
    if (!r.ok) fail++;
    console.log(`${r.ok ? "PASS" : "FAIL"}  [${r.page}] ${r.name}${r.detail ? "  -> " + r.detail : ""}`);
  }
  console.log(`\n总计 ${results.length} 项，失败 ${fail} 项`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("脚本异常:", e.message); process.exit(2); });
