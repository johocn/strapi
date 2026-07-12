import { setupStrapi, teardownStrapi } from './helpers/strapi-setup';

describe('Content Types', () => {
  let strapi: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await teardownStrapi();
  });

  test('zhao-website has 19 content types', () => {
    const uids = Object.keys(strapi.contentTypes).filter((u) => u.startsWith('plugin::zhao-website.'));
    expect(uids.length).toBe(19);
  });

  test('all CTs have site relation to zhao-common.site-config', () => {
    const uids = Object.keys(strapi.contentTypes).filter((u) => u.startsWith('plugin::zhao-website.'));
    for (const uid of uids) {
      const attrs = strapi.contentTypes[uid].attributes;
      expect(attrs.site).toBeDefined();
      expect(attrs.site.target).toBe('plugin::zhao-common.site-config');
    }
  });

  test('all CTs have deletedAt field for soft-delete', () => {
    const uids = Object.keys(strapi.contentTypes).filter((u) => u.startsWith('plugin::zhao-website.'));
    for (const uid of uids) {
      expect(strapi.contentTypes[uid].attributes.deletedAt).toBeDefined();
    }
  });

  test('article CT does not enable draftAndPublish', () => {
    const schema = strapi.contentTypes['plugin::zhao-website.article'];
    expect(schema.options.draftAndPublish).toBe(false);
  });
});
