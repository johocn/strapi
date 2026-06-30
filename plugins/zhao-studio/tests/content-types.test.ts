import { setupStrapi, teardownStrapi } from './helpers/strapi-setup';

describe('Content Types', () => {
  let strapi: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await teardownStrapi();
  });

  test('article-draft content type exists', () => {
    const contentType = strapi.contentTypes['plugin::zhao-studio.article-draft'];
    expect(contentType).toBeDefined();
    expect(contentType.kind).toBe('collectionType');
  });

  test('collect-source content type exists', () => {
    const contentType = strapi.contentTypes['plugin::zhao-studio.collect-source'];
    expect(contentType).toBeDefined();
    expect(contentType.kind).toBe('collectionType');
  });

  test('publish-platform content type exists', () => {
    const contentType = strapi.contentTypes['plugin::zhao-studio.publish-platform'];
    expect(contentType).toBeDefined();
    expect(contentType.kind).toBe('collectionType');
  });
});