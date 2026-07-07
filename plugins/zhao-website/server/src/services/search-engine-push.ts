import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async pushToBaidu(siteId: number, urls: string[]): Promise<any> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig?.baiduSiteVerification || !seoConfig?.extraConfig?.searchPushTokens?.baidu) {
      return { skipped: true, reason: "no_baidu_config" };
    }
    const token = seoConfig.extraConfig.searchPushTokens.baidu;
    const res = await fetch(`http://data.zz.baidu.com/urls?site=${seoConfig.baiduSiteVerification}&token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: urls.join("\n"),
    });
    return res.json();
  },

  async pushToBing(siteId: number, urls: string[]): Promise<any> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const apiKey = seoConfig?.extraConfig?.searchPushTokens?.bing;
    if (!apiKey) return { skipped: true, reason: "no_bing_config" };
    const res = await fetch("https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch", {
      method: "POST",
      headers: { "Content-Type": "application/json", "ApiKey": apiKey },
      body: JSON.stringify({ siteUrl: urls[0], urlList: urls }),
    });
    return res.json();
  },

  async pushAll(siteId: number, urls: string[]) {
    const [baidu, bing] = await Promise.allSettled([
      this.pushToBaidu(siteId, urls),
      this.pushToBing(siteId, urls),
    ]);
    return { baidu, bing };
  },
});
