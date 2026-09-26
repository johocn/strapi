import contentTypes from '../server/src/content-types';

/**
 * 直接用插件导出的 content-types 定义做断言，不启动真实 Strapi 实例
 * （插件单测环境没有数据库连接，createStrapi().load() 无法完成注册）。
 */
const PLUGIN_CT_PREFIX = 'plugin::zhao-website.';

// 全局埋点 CT（邀请码流转）：不绑站点、不做软删除，属刻意例外
const GLOBAL_CTS = ['invite-trace'];

describe('Content Types', () => {
  const entries = Object.entries(contentTypes) as [string, any][];

  test('zhao-website has 23 content types', () => {
    expect(entries.length).toBe(23);
  });

  test('每个 CT 的 singularName 与注册名一致，可按 uid 定位', () => {
    for (const [name, def] of entries) {
      expect(`${PLUGIN_CT_PREFIX}${def.schema.info.singularName}`).toBe(`${PLUGIN_CT_PREFIX}${name}`);
      expect(typeof def.schema.collectionName).toBe('string');
    }
  });

  test('all CTs have site relation to zhao-common.site-config', () => {
    for (const [name, def] of entries) {
      if (GLOBAL_CTS.includes(name)) continue;
      const attrs = def.schema.attributes;
      expect(attrs.site).toBeDefined();
      expect(attrs.site.target).toBe('plugin::zhao-common.site-config');
    }
  });

  test('all CTs have deletedAt field for soft-delete', () => {
    for (const [name, def] of entries) {
      if (GLOBAL_CTS.includes(name)) continue;
      expect(def.schema.attributes.deletedAt).toBeDefined();
    }
  });

  test('article CT does not enable draftAndPublish', () => {
    const schema = contentTypes['article'].schema;
    expect(schema.options.draftAndPublish).toBe(false);
  });
});