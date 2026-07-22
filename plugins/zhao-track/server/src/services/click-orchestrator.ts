import type { Core } from "@strapi/strapi";
import UAParser from "ua-parser-js";

const COUPON_UID = "plugin::zhao-deal.coupon";
const CLICK_EVENT_UID = "plugin::zhao-track.click-event";
const CHANNEL_CONFIG_UID = "plugin::zhao-studio.channel-platform-config";

export interface ClickRequest {
  couponId: string;
  sourceTagId?: string;
  deviceFingerprint: string;
  utm?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string };
  referer?: string;
  userAgent?: string;
  ip?: string;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async orchestrate(req: ClickRequest) {
      // 1. 校验 couponId
      if (!req.couponId) {
        const err: any = new Error("couponId 必填");
        err.code = "TRACK_SOURCE_INVALID";
        throw err;
      }
      const coupons = await strapi.documents(COUPON_UID).findMany({
        filters: { couponId: req.couponId },
        populate: { platform: true, product: true },
      });
      if (!coupons || coupons.length === 0) {
        const err: any = new Error("优惠券不存在");
        err.code = "DEAL_COUPON_NOT_FOUND";
        throw err;
      }
      const coupon = coupons[0];

      // 2. 校验来源
      if (!req.sourceTagId && !(req.utm && (req.utm.utmSource || req.utm.utmMedium))) {
        const err: any = new Error("sourceTagId 或 utm 至少一个");
        err.code = "TRACK_SOURCE_INVALID";
        throw err;
      }

      // 3. 频率限制
      const rateLimiter = strapi.plugin("zhao-track").service("rate-limiter");
      const rateCheck = await rateLimiter.checkAndRecord(req.deviceFingerprint, req.couponId);
      if (!rateCheck.allowed) {
        const err: any = new Error("点击频率超限");
        err.code = "TRACK_CLICK_RATE_LIMITED";
        throw err;
      }

      // 4. 来源识别
      const sourceResolver = strapi.plugin("zhao-track").service("source-resolver");
      const { tag } = await sourceResolver.identify({
        sourceTagId: req.sourceTagId,
        utm: req.utm,
        deviceFingerprint: req.deviceFingerprint,
        referer: req.referer,
      });

      // 步骤 4.5: A/B 变体选择
      let abVariant: any = null;
      try {
        const abTest = strapi.plugin("zhao-studio")?.service("ab-test");
        if (abTest) {
          abVariant = await abTest.pickVariant({
            campaignId: tag.promoCampaign?.documentId,
            channelId: tag.promoCampaign?.channel?.documentId,
          });
        }
      } catch (err: any) {
        strapi.log.warn(`[click] ab-test pickVariant failed: ${err.message}`);
      }

      // 步骤 5a: 从 ChannelPlatformConfig 获取 promoPid（替代原 tag.promoChannelId）
      let promoPid = "";
      const channelId = tag.promoCampaign?.channel?.documentId;
      if (channelId && coupon.platform?.code) {
        try {
          const configs = await strapi.documents(CHANNEL_CONFIG_UID).findMany({
            filters: { channel: channelId, platform: { type: coupon.platform.code } },
            limit: 1,
          });
          if (configs && configs.length > 0) {
            promoPid = configs[0].promoPid || "";
          }
        } catch (err: any) {
          strapi.log.warn(`[click] ChannelPlatformConfig lookup failed: ${err.message}`);
        }
      }

      // 5. 调 zhao-deal adapter 置换链接（三层 try-catch 容错）
      let resolvedLink = coupon.promoLink;
      try {
        const dealPlugin = strapi.plugin("zhao-deal");
        if (!dealPlugin) {
          strapi.log.warn("[click] zhao-deal plugin not enabled, using original promoLink");
        } else {
          const registry = (dealPlugin as any).service("adapterRegistry");
          if (!registry) {
            strapi.log.warn("[click] adapterRegistry service not available, using original promoLink");
          } else {
            const adapter = registry.get(coupon.platform?.code);
            const result = await adapter.transformLink({
              promoLink: coupon.promoLink,
              promoChannelId: promoPid,
              sourceTagId: tag.tagId,
            });
            resolvedLink = result.resolvedLink;
          }
        }
      } catch (err: any) {
        strapi.log.warn(`[click] transformLink failed, using original promoLink: ${err.message}`);
      }

      // 6. UA 解析
      let browser = "", os = "", device = "";
      if (req.userAgent) {
        try {
          const parsed = new UAParser(req.userAgent).getResult();
          browser = parsed.browser.name || "";
          os = parsed.os.name || "";
          device = parsed.device.type || "desktop";
        } catch { /* 留空 */ }
      }

      // 7. 写入 ClickEvent
      const clickEvent = await strapi.documents(CLICK_EVENT_UID).create({
        data: {
          coupon: coupon.documentId,
          sourceTag: tag.documentId,
          promoCampaign: tag.promoCampaign?.documentId || null,
          promoPid,
          abVariant: abVariant?.documentId || null,
          deviceFingerprint: req.deviceFingerprint,
          clickedAt: new Date(),
          ip: req.ip,
          userAgent: req.userAgent,
          browser, os, device,
          referer: req.referer,
          resolvedLink,
        } as any,
      });

      return {
        clickId: clickEvent.documentId,
        resolvedLink,
        coupon: {
          documentId: coupon.documentId,
          couponId: coupon.couponId,
          amountDesc: coupon.amountDesc,
          product: coupon.product,
        },
      };
    },
  };
};
