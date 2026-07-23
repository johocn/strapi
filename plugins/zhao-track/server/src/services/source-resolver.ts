import type { Core } from "@strapi/strapi";

const SOURCE_TAG_UID = "plugin::zhao-track.source-tag";

export interface IdentifyOpts {
  sourceTagId?: string;
  utm?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string };
  deviceFingerprint?: string;
  fullUrl?: string;
  referer?: string;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async identify(opts: IdentifyOpts) {
      // 步骤 0: utm_source 匹配 PromoCampaign/Channel
      let matchedCampaignId: string | undefined;
      let matchedChannelId: string | undefined;
      if (opts.utm?.utmSource) {
        try {
          const campaigns = await strapi.documents("plugin::zhao-studio.promo-campaign").findMany({
            filters: { code: opts.utm.utmSource },
            populate: { channel: true },
            limit: 1,
          });
          if (campaigns && campaigns.length > 0) {
            matchedCampaignId = campaigns[0].documentId;
            matchedChannelId = campaigns[0].channel?.documentId;
          } else {
            const channels = await strapi.documents("plugin::zhao-studio.promo-channel").findMany({
              filters: { code: opts.utm.utmSource },
              limit: 1,
            });
            if (channels && channels.length > 0) {
              matchedChannelId = channels[0].documentId;
            }
          }
        } catch (err: any) {
          strapi.log.warn(`[source-resolver] utm_source match failed: ${err.message}`);
        }
      }

      // 1. 直接提供 sourceTagId
      if (opts.sourceTagId) {
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters: { tagId: opts.sourceTagId },
          populate: { promoCampaign: { populate: { channel: true } } },
        });
        if (tags && tags.length > 0) {
          const tag = tags[0];
          await strapi.documents(SOURCE_TAG_UID).update({
            documentId: tag.documentId,
            data: { lastSeenAt: new Date() } as any,
          });
          return { tag, isNew: false };
        }
      }

      // 2. 按 utm 组合查询
      if (opts.utm && (opts.utm.utmSource || opts.utm.utmMedium || opts.utm.utmCampaign)) {
        const filters: any = {};
        if (opts.utm.utmSource) filters.utmSource = opts.utm.utmSource;
        if (opts.utm.utmMedium) filters.utmMedium = opts.utm.utmMedium;
        if (opts.utm.utmCampaign) filters.utmCampaign = opts.utm.utmCampaign;
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters,
          populate: { promoCampaign: { populate: { channel: true } } },
        });
        if (tags && tags.length > 0) {
          const tag = tags[0];
          await strapi.documents(SOURCE_TAG_UID).update({
            documentId: tag.documentId,
            data: { lastSeenAt: new Date() } as any,
          });
          return { tag, isNew: false };
        }
      }

      // 3. deviceFingerprint 二次识别（30 天内）
      if (opts.deviceFingerprint) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters: {
            deviceFingerprint: opts.deviceFingerprint,
            lastSeenAt: { $gte: thirtyDaysAgo.toISOString() },
          },
          sort: { lastSeenAt: "desc" },
          populate: { promoCampaign: { populate: { channel: true } } },
        });
        if (tags && tags.length > 0) {
          const tag = tags[0];
          await strapi.documents(SOURCE_TAG_UID).update({
            documentId: tag.documentId,
            data: {
              lastSeenAt: new Date(),
              utmSource: opts.utm?.utmSource || tag.utmSource,
              utmMedium: opts.utm?.utmMedium || tag.utmMedium,
              utmCampaign: opts.utm?.utmCampaign || tag.utmCampaign,
            } as any,
          });
          return { tag, isNew: false };
        }
      }

      // 4. 创建新 SourceTag
      const tagId = `utm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date();
      const newTag = await strapi.documents(SOURCE_TAG_UID).create({
        data: {
          tagId,
          promoCampaign: matchedCampaignId || null,
          sourceUrl: opts.fullUrl,
          utmSource: opts.utm?.utmSource,
          utmMedium: opts.utm?.utmMedium,
          utmCampaign: opts.utm?.utmCampaign,
          utmContent: opts.utm?.utmContent,
          utmTerm: opts.utm?.utmTerm,
          deviceFingerprint: opts.deviceFingerprint,
          firstSeenAt: now,
          lastSeenAt: now,
        } as any,
      });
      const populated = await strapi.documents(SOURCE_TAG_UID).findOne({
        documentId: newTag.documentId,
        populate: { promoCampaign: { populate: { channel: true } } },
      });
      return { tag: populated, isNew: true };
    },
  };
};
