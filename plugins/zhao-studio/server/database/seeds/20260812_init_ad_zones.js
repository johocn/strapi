/**
 * 示例 seed：初始化广告位（ad-zone）和示例广告内容
 *
 * 场景：新站点上线时需要预置 home-notice（跑马灯）和 home-banner（幻灯片）广告位
 *
 * 幂等性：
 * - ad-zone 按 (site + position) 检查，存在则跳过
 * - ad-content 按 (zone + title) 检查，存在则跳过
 *
 * 注意：本 seed 创建的广告位关联到默认站点（id 最小的 site-config）
 *      若要为特定站点创建，可在 up 中通过 strapi.documents('plugin::zhao-common.site-config').findMany() 查询后指定
 */
module.exports = {
  async up({ strapi, db }) {
    const zoneService = strapi.documents('plugin::zhao-studio.ad-zone');
    const contentService = strapi.documents('plugin::zhao-studio.ad-content');
    const siteService = strapi.documents('plugin::zhao-common.site-config');

    // 1. 查询默认站点（id 最小的）
    const sites = await siteService.findMany({ sort: 'id:asc', limit: 1 });
    if (!sites || sites.length === 0) {
      console.log('[seed 20260812] [WARN] 未找到 site-config，跳过广告位种子');
      return;
    }
    const defaultSiteDocId = sites[0].documentId;
    console.log(`[seed 20260812] 使用默认站点: ${sites[0].domain || '(no domain)'} (${defaultSiteDocId})`);

    // 2. 定义广告位
    const ZONES = [
      {
        position: 'home-notice',
        name: '首页跑马灯',
        displayMode: 'rotation',
        sortOrder: 1,
      },
      {
        position: 'home-banner',
        name: '首页幻灯片',
        displayMode: 'slideshow',
        sortOrder: 2,
      },
    ];

    // 3. 创建广告位（按 position + site 幂等）
    const positionToZone = {};
    for (const z of ZONES) {
      const existing = await zoneService.findMany({
        filters: {
          position: { $eq: z.position },
          site: { documentId: defaultSiteDocId },
        },
      });
      if (existing && existing.length > 0) {
        positionToZone[z.position] = existing[0];
        console.log(`[seed 20260812] [SKIP] ad-zone 已存在: position=${z.position}`);
        continue;
      }
      const created = await zoneService.create({
        data: {
          ...z,
          isActive: true,
          site: defaultSiteDocId,
        },
      });
      positionToZone[z.position] = created;
      console.log(`[seed 20260812] [OK] 创建 ad-zone: ${z.position} (${z.name})`);
    }

    // 4. 创建示例广告内容（按 zone + name 幂等）
    const SAMPLE_CONTENTS = [
      {
        zonePosition: 'home-notice',
        name: '欢迎来到 Joho 学院',
        title: '欢迎来到 Joho 学院',
        htmlContent: '专注金融理财与职场技能培训，开启你的成长之旅',
        contentType: 'html',
        linkType: 'none',
        priority: 100,
        sortOrder: 1,
      },
      {
        zonePosition: 'home-notice',
        name: '新课上线优惠',
        title: '新课上线优惠',
        htmlContent: '限时优惠，金融理财系列课程 8 折起',
        contentType: 'html',
        linkType: 'none',
        priority: 90,
        sortOrder: 2,
      },
    ];

    for (const c of SAMPLE_CONTENTS) {
      const zone = positionToZone[c.zonePosition];
      if (!zone) {
        console.log(`[seed 20260812] [WARN] zone ${c.zonePosition} 未创建，跳过内容 "${c.name}"`);
        continue;
      }

      const existing = await contentService.findMany({
        filters: {
          name: { $eq: c.name },
          adZone: { documentId: zone.documentId },
        },
      });
      if (existing && existing.length > 0) {
        console.log(`[seed 20260812] [SKIP] ad-content 已存在: "${c.name}"`);
        continue;
      }

      const { zonePosition, ...contentData } = c;
      await contentService.create({
        data: {
          ...contentData,
          isActive: true,
          adZone: zone.documentId,
          site: defaultSiteDocId,
        },
      });
      console.log(`[seed 20260812] [OK] 创建 ad-content: "${c.name}"`);
    }
  },

  async down({ strapi, db }) {
    // 回滚：删除本种子创建的广告位和内容
    const zoneService = strapi.documents('plugin::zhao-studio.ad-zone');
    const positions = ['home-notice', 'home-banner'];
    for (const position of positions) {
      const zones = await zoneService.findMany({
        filters: { position: { $eq: position } },
        populate: { adContents: true },
      });
      for (const z of zones) {
        // 先删关联的 ad-content
        for (const c of (z.adContents || [])) {
          await strapi.documents('plugin::zhao-studio.ad-content').delete({ documentId: c.documentId });
        }
        await zoneService.delete({ documentId: z.documentId });
        console.log(`[seed 20260812] [DOWN] 删除 ad-zone: ${position}`);
      }
    }
  },
};
