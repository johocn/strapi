import { initStudioQueues, getRedis } from './utils/queue';

export default async ({ strapi }: { strapi: any }) => {
  // === P2: Bull 队列初始化 ===
  try {
    const { publish, scheduler } = await initStudioQueues();
    if (publish) {
      const pqSvc = strapi.plugin('zhao-studio').service('publish-queue');
      if (pqSvc?.registerProcessors) {
        pqSvc.registerProcessors();
        strapi.log.info('[zhao-studio] studio-publish queue processors registered');
      }
    }
    if (scheduler) {
      const schSvc = strapi.plugin('zhao-studio').service('scheduler');
      if (schSvc?.registerSchedulers) {
        schSvc.registerSchedulers();
        strapi.log.info('[zhao-studio] studio-scheduler queue registered');
      }
    }
  } catch (e: any) {
    strapi.log.warn(`[zhao-studio] Bull queue init skipped: ${e.message}`);
  }
  // === end Bull ===

  // 依赖检查（仅 warn 不阻塞）
  const checkPlugin = (name: string) => {
    try {
      const p = strapi.plugin(name);
      if (!p) {
        strapi.log.warn(`[zhao-studio] 依赖插件 ${name} 未启用，推广渠道跨插件功能将不可用`);
      }
    } catch {
      strapi.log.warn(`[zhao-studio] 依赖插件 ${name} 未启用，推广渠道跨插件功能将不可用`);
    }
  };
  checkPlugin('zhao-track');
  checkPlugin('zhao-deal');

  // Seed default poster template
  try {
    const posterService = strapi.plugin('zhao-studio').service('poster');
    if (posterService && typeof posterService.seedDefaultTemplate === 'function') {
      const result = await posterService.seedDefaultTemplate();
      strapi.log.info(`[zhao-studio] Poster seed result: ${JSON.stringify(result)}`);
    } else {
      strapi.log.warn('[zhao-studio] poster service or seedDefaultTemplate not found');
    }
  } catch (e: any) {
    strapi.log.error(`[zhao-studio] Failed to seed default poster template: ${e.message}`);
    strapi.log.error(`[zhao-studio] Seed error stack: ${e.stack}`);
  }

  // Seed default ad data (home-banner zone + 1 slideshow content with 2 images)
  try {
    const adResult = await seedAdData(strapi);
    strapi.log.info(`[zhao-studio] Ad seed result: ${JSON.stringify(adResult)}`);
  } catch (e: any) {
    strapi.log.error(`[zhao-studio] Failed to seed ad data: ${e.message}`);
    strapi.log.error(`[zhao-studio] Ad seed error stack: ${e.stack}`);
  }

  // Seed default notice data (home-notice zone + 1 html content for marquee)
  try {
    const noticeResult = await seedNoticeData(strapi);
    strapi.log.info(`[zhao-studio] Notice seed result: ${JSON.stringify(noticeResult)}`);
  } catch (e: any) {
    strapi.log.error(`[zhao-studio] Failed to seed notice data: ${e.message}`);
    strapi.log.error(`[zhao-studio] Notice seed error stack: ${e.stack}`);
  }

  // Seed publish-platforms + auto-link orphan accounts (platform=null)
  try {
    const pubResult = await seedPublishPlatformsAndLinkAccounts(strapi);
    strapi.log.info(`[zhao-studio] Publish seed result: ${JSON.stringify(pubResult)}`);
  } catch (e: any) {
    strapi.log.error(`[zhao-studio] Failed to seed publish platforms: ${e.message}`);
    strapi.log.error(`[zhao-studio] Publish seed error stack: ${e.stack}`);
  }
};

/**
 * Seed default ad zone and contents for homepage banner
 * Idempotent: skips if zone with code 'course-home-banner' already exists
 */
async function seedAdData(strapi: any) {
  strapi.log.info('[zhao-studio] Starting ad data seed...');

  // 1. Find default site
  const sites = await strapi.documents('plugin::zhao-common.site-config').findMany({ limit: 1 });
  if (!sites || sites.length === 0) {
    strapi.log.warn('[zhao-studio] No site found, skipping ad seed');
    return { success: false, reason: 'no_site' };
  }
  const siteId = sites[0].documentId;
  strapi.log.info(`[zhao-studio] Ad seed using site documentId: ${siteId}`);

  // 2. Check if ad-zone already exists (idempotent)
  const existingZones = await strapi.documents('plugin::zhao-studio.ad-zone').findMany({
    filters: { code: 'course-home-banner' },
    limit: 1,
  });
  if (existingZones && existingZones.length > 0) {
    strapi.log.info('[zhao-studio] Ad zone "course-home-banner" already exists, skipping seed');
    return { success: true, reason: 'already_exists', zoneId: existingZones[0].documentId };
  }

  // 3. Create ad-zone
  const zone = await strapi.documents('plugin::zhao-studio.ad-zone').create({
    data: {
      name: '课程首页',
      code: 'course-home-banner',
      position: 'home-banner',
      displayMode: 'slideshow',
      isActive: true,
      suggestedWidth: 750,
      suggestedHeight: 300,
      site: siteId,
    },
  });
  strapi.log.info(`[zhao-studio] Ad zone created: course-home-banner (documentId: ${zone.documentId})`);

  // 4. Create ad-content with 2 slideshow images
  //    images 数组包含 2 张图片，ad-banner 组件会对该数组创建 swiper
  await strapi.documents('plugin::zhao-studio.ad-content').create({
    data: {
      name: '首页轮播广告',
      contentType: 'slideshow',
      title: '精选好课 限时免费',
      images: [
        { url: '/static/ads/banner-courses.jpg', title: '精选好课 限时免费', subtitle: '名师授课，品质保证' },
        { url: '/static/ads/banner-points.jpg', title: '学习赚积分', subtitle: '积分兑换好礼' },
      ],
      linkType: 'internal',
      linkUrl: '/pages/index/index',
      isActive: true,
      sortOrder: 0,
      priority: 10,
      slideshowAutoplay: true,
      slideshowInterval: 4000,
      slideshowLoop: true,
      slideshowShowDots: true,
      adZone: zone.documentId,
      site: siteId,
    },
  });
  strapi.log.info('[zhao-studio] Ad content created: 首页轮播广告 (2 images)');

  strapi.log.info('[zhao-studio] Ad data seed completed: 1 zone + 1 content (2 images)');
  return { success: true, zoneId: zone.documentId, contents: 1, images: 2 };
}

/**
 * Seed default notice zone and content for homepage marquee bar
 * Idempotent: skips if zone with code 'course-home-notice' already exists
 */
async function seedNoticeData(strapi: any) {
  strapi.log.info('[zhao-studio] Starting notice data seed...');

  // 1. Find default site
  const sites = await strapi.documents('plugin::zhao-common.site-config').findMany({ limit: 1 });
  if (!sites || sites.length === 0) {
    strapi.log.warn('[zhao-studio] No site found, skipping notice seed');
    return { success: false, reason: 'no_site' };
  }
  const siteId = sites[0].documentId;

  // 2. Check if notice zone already exists (idempotent)
  const existingZones = await strapi.documents('plugin::zhao-studio.ad-zone').findMany({
    filters: { code: 'course-home-notice' },
    limit: 1,
  });
  if (existingZones && existingZones.length > 0) {
    strapi.log.info('[zhao-studio] Notice zone "course-home-notice" already exists, skipping seed');
    return { success: true, reason: 'already_exists', zoneId: existingZones[0].documentId };
  }

  // 3. Create notice ad-zone
  const zone = await strapi.documents('plugin::zhao-studio.ad-zone').create({
    data: {
      name: '课程首页公告',
      code: 'course-home-notice',
      position: 'home-notice',
      displayMode: 'single',
      isActive: true,
      suggestedWidth: 750,
      suggestedHeight: 64,
      site: siteId,
    },
  });
  strapi.log.info(`[zhao-studio] Notice zone created: course-home-notice (documentId: ${zone.documentId})`);

  // 4. Create notice ad-content (HTML type, title = marquee text, htmlContent = popup content)
  const noticeHtml = `<div style="padding: 10px 0;">
  <h2 style="color: #0056D2; font-size: 18px; text-align: center; margin-bottom: 15px;">🎉 新学期优惠活动开启</h2>
  <p style="color: #333; font-size: 14px; line-height: 1.8;">亲爱的学员们，新学期来临之际，我们为您准备了丰厚的优惠活动：</p>
  <ul style="color: #666; font-size: 14px; line-height: 2; padding-left: 20px;">
    <li>🎁 全场课程限时免费学习</li>
    <li>💰 签到积分翻倍，连续签到7天得额外500积分</li>
    <li>🏆 邀请好友注册，双方各得200积分</li>
    <li>📚 精品课程包立减50%</li>
  </ul>
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 15px;">活动时间：2026年8月9日 - 8月31日</p>
  <p style="color: #999; font-size: 12px; text-align: center;">最终解释权归圣麟教育所有</p>
</div>`;

  await strapi.documents('plugin::zhao-studio.ad-content').create({
    data: {
      name: '首页公告',
      contentType: 'html',
      title: '🎉 新学期优惠活动开启，全场课程限时免费！签到积分翻倍，邀请好友各得200积分！',
      htmlContent: noticeHtml,
      linkType: 'none',
      isActive: true,
      sortOrder: 0,
      priority: 10,
      adZone: zone.documentId,
      site: siteId,
    },
  });
  strapi.log.info('[zhao-studio] Notice content created: 首页公告 (html)');

  strapi.log.info('[zhao-studio] Notice data seed completed: 1 zone + 1 content');
  return { success: true, zoneId: zone.documentId, contents: 1 };
}

/**
 * Seed publish-platforms (wechat/douyin/xiaohongshu/toutiao/bilibili/internal/custom)
 * + auto-link orphan accounts whose platform is null.
 * Idempotent: skips existing platforms; only touches accounts with platform=null.
 *
 * Account → platform inference rules (heuristic, ordered):
 *   1. name contains "公众号" / "微信"            → wechat
 *   2. name contains "抖音" / "douyin"            → douyin
 *   3. name contains "小红书" / "xiaohongshu"     → xiaohongshu
 *   4. name contains "头条" / "toutiao"          → toutiao
 *   5. name contains "bilibili" / "b站" / "B站"   → bilibili
 *   6. name contains "internal" / "内部" / "E2E"  → internal
 *   7. config.appId / config.mediaId present       → wechat (公众号 config 特征)
 *   8. fallback → internal
 */
async function seedPublishPlatformsAndLinkAccounts(strapi: any) {
  strapi.log.info('[zhao-studio] Starting publish-platforms seed + account auto-link...');

  // 1. Ensure all 7 platform types exist
  const PLATFORM_SEEDS = [
    { type: 'wechat',      name: '微信公众号',   category: 'content' },
    { type: 'douyin',      name: '抖音',         category: 'content' },
    { type: 'xiaohongshu', name: '小红书',       category: 'content' },
    { type: 'toutiao',     name: '头条',         category: 'content' },
    { type: 'bilibili',    name: 'B站',          category: 'content' },
    { type: 'internal',    name: '内部渠道',     category: 'custom' },
    { type: 'custom',      name: '自定义',       category: 'custom' },
  ];

  const created: string[] = [];
  const existing: string[] = [];

  for (const seed of PLATFORM_SEEDS) {
    const found = await strapi.documents('plugin::zhao-studio.publish-platform').findMany({
      filters: { type: seed.type },
      limit: 1,
    });
    if (found.length === 0) {
      const p = await strapi.documents('plugin::zhao-studio.publish-platform').create({ data: { ...seed, isActive: true } });
      created.push(seed.type);
      strapi.log.info(`[zhao-studio] Seed platform ${seed.type} → ${p.documentId}`);
    } else {
      existing.push(seed.type);
    }
  }

  // Build map: type → documentId
  const allPlatforms = await strapi.documents('plugin::zhao-studio.publish-platform').findMany({ limit: 50 });
  const typeToDocId: Record<string, string> = {};
  for (const p of allPlatforms) {
    if (p.type) typeToDocId[p.type] = p.documentId;
  }

  // 2. Find orphan accounts (platform=null) + link
  const orphans = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
    filters: { platform: null },
    limit: 50,
  });

  let linked = 0;
  for (const acc of orphans) {
    const inferredType = inferPlatformType(acc);
    const targetDocId = typeToDocId[inferredType];
    if (!targetDocId) {
      strapi.log.warn(`[zhao-studio] Cannot find platform doc for type=${inferredType}, skip linking account=${acc.documentId}`);
      continue;
    }
    await strapi.documents('plugin::zhao-studio.publish-account').update({
      documentId: acc.documentId,
      data: { platform: { connect: [{ documentId: targetDocId }] } } as any,
    });
    linked++;
    strapi.log.info(`[zhao-studio] Auto-linked account "${acc.name}" (${acc.documentId}) → platform=${inferredType}`);
  }

  return { platforms: { created, existing, total: allPlatforms.length }, orphanAccounts: { found: orphans.length, linked } };
}

function inferPlatformType(acc: any): string {
  const name = (acc.name || '').toLowerCase();
  const cfg = acc.config || {};
  if (/公众号|微信|wechat/i.test(name)) return 'wechat';
  if (/douyin|抖音/i.test(name)) return 'douyin';
  if (/xiaohongshu|小红书/i.test(name)) return 'xiaohongshu';
  if (/toutiao|头条/i.test(name)) return 'toutiao';
  if (/bilibili|b站|b站/i.test(name)) return 'bilibili';
  if (/internal|内部|e2e/i.test(name)) return 'internal';
  if (cfg.appId || cfg.mediaId) return 'wechat';
  return 'internal';
}