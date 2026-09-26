import contentTypes from '../server/src/content-types';

/**
 * 直接断言插件导出的 content-types 定义，不启动真实 Strapi 实例
 * （单测环境无数据库连接，createStrapi().load() 无法完成注册）。
 */
describe('Content Types', () => {
  test.each(['article-draft', 'collect-source', 'publish-platform'])(
    '%s content type exists',
    (name) => {
      const contentType = (contentTypes as any)[name];
      expect(contentType).toBeDefined();
      expect(contentType.schema.kind).toBe('collectionType');
    }
  );

  test('每个 CT 的 singularName 与注册名一致', () => {
    for (const [name, def] of Object.entries(contentTypes) as [string, any][]) {
      expect(def.schema.info.singularName).toBe(name);
    }
  });
});