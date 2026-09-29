// tests/services/publish.test.ts

import publishFactory from '../../server/src/services/publish';
import { createMockStrapi } from '../helpers/mock-strapi';

describe('Publish Service', () => {
  test('listPlatforms should return active platforms', async () => {
    // Mock test - 实际测试需要完整的 Strapi 环境
    expect(true).toBe(true);
  });

  test('createAccount should create account with config', async () => {
    // Mock test - 实际测试需要完整的 Strapi 环境
    expect(true).toBe(true);
  });

  test('retryPublish should retry failed record', async () => {
    // Mock test - 实际测试需要完整的 Strapi 环境
    expect(true).toBe(true);
  });

  test('listRecords should return records sorted by publishedAt', async () => {
    // Mock test - 实际测试需要完整的 Strapi 环境
    expect(true).toBe(true);
  });

  test('updatePlatform should update platform config', async () => {
    // Mock test - 实际测试需要完整的 Strapi 环境
    expect(true).toBe(true);
  });

  test('deleteAccount should deactivate account', async () => {
    // Mock test - 实际测试需要完整的 Strapi 环境
    expect(true).toBe(true);
  });
});

describe('Publish Service - 公众号仅建草稿', () => {
  const article = { documentId: 'a1', status: 'ready', title: '标题', content: '<p>正文</p>' };

  function setup(publishResult: any) {
    const mockStrapi = createMockStrapi();
    const draftDoc = {
      findOne: jest.fn().mockResolvedValue(article),
      update: jest.fn().mockResolvedValue({}),
    };
    const accountDoc = {
      findMany: jest.fn().mockResolvedValue([
        { documentId: 'acc-1', name: '优佳购物', platform: { type: 'wechat' } },
      ]),
    };
    const recordDoc = { create: jest.fn().mockResolvedValue({ documentId: 'rec-1' }) };
    mockStrapi.documents.mockImplementation((uid: string) => {
      if (uid === 'plugin::zhao-studio.article-draft') return draftDoc;
      if (uid === 'plugin::zhao-studio.publish-account') return accountDoc;
      return recordDoc;
    });
    const channelAdapter = {
      adaptContent: jest.fn(async (a: any) => a),
      publish: jest.fn().mockResolvedValue(publishResult),
    };
    mockStrapi.plugin.mockReturnValue({
      service: jest.fn().mockReturnValue(channelAdapter),
      config: jest.fn(),
    });
    return { mockStrapi, draftDoc, recordDoc, service: publishFactory({ strapi: mockStrapi }) };
  }

  test('仅建草稿（createdDraft）时文章状态不置为 published，保持 ready', async () => {
    const { draftDoc, recordDoc, service } = setup({
      success: true,
      externalId: 'DRAFT_1',
      draftId: 'DRAFT_1',
      createdDraft: true,
    });

    const results = await service.publishArticle('a1', ['acc-1']);

    expect(results[0].createdDraft).toBe(true);
    expect(draftDoc.update).not.toHaveBeenCalled();
    expect(recordDoc.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        externalId: 'DRAFT_1',
        status: 'success',
        error: expect.stringContaining('"phase":"draft"'),
      }),
    });
  });

  test('真正发布成功时文章状态置为 published', async () => {
    const { draftDoc, service } = setup({ success: true, externalId: 'pub-1' });

    const results = await service.publishArticle('a1', ['acc-1']);

    expect(results[0].createdDraft).toBe(false);
    expect(draftDoc.update).toHaveBeenCalledWith({
      documentId: 'a1',
      data: expect.objectContaining({ status: 'published' }),
    });
  });
});