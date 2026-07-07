export default {
  async info(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) {
      ctx.body = null;
      return;
    }
    // 用 knex 查 site-config + template 关系（Document Service 关系 filter 不稳定）
    const db = strapi.db.connection;
    const site = await db('zhao_site_configs')
      .where('document_id', siteId)
      .select('id', 'site_name', 'site_description', 'logo', 'favicon', 'icp_number',
              'seo_keywords', 'seo_description', 'customer_service_url', 'domain',
              'template', 'theme_config', 'extra_config', 'share_title', 'share_description', 'share_image')
      .first();
    if (!site) {
      ctx.body = null;
      return;
    }
    let template = null;
    if (site.template) {
      template = await db('zhao_site_templates').where('id', site.template).select('id', 'name', 'display_name', 'theme_config').first();
    }
    // brand-info + seo-config（若存在）
    let brandInfo = null;
    let seoConfig = null;
    try {
      brandInfo = await strapi.plugin('zhao-website').service('brand-info').find(siteId);
    } catch (e) {}
    try {
      seoConfig = await strapi.plugin('zhao-website').service('seo-config').find(siteId);
    } catch (e) {}
    ctx.body = {
      siteName: site.site_name,
      siteDescription: site.site_description,
      logo: site.logo,
      favicon: site.favicon,
      icpNumber: site.icp_number,
      seoKeywords: site.seo_keywords,
      seoDescription: site.seo_description,
      customerServiceUrl: site.customer_service_url,
      domain: site.domain,
      shareTitle: site.share_title,
      shareDescription: site.share_description,
      shareImage: site.share_image,
      themeConfig: site.theme_config || {},
      extraConfig: site.extra_config || {},
      template: template ? { name: template.name, displayName: template.display_name, themeConfig: template.theme_config || {} } : { name: 'default', displayName: '默认', themeConfig: {} },
      brandInfo,
      seoConfig,
    };
  },
};
