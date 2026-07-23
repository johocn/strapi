import { createMockStrapi } from '../helpers/mock-strapi';
import sourceResolverFactory from '../../server/src/services/source-resolver';

describe('source-resolver migration to promoCampaign', () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = sourceResolverFactory({ strapi });
  });

  it('identify matches utm_source to PromoCampaign first', async () => {
    strapi.documents = jest.fn((uid: string) => {
      const findMany = jest.fn().mockImplementation((opts: any) => {
        if (uid === 'plugin::zhao-studio.promo-campaign' && opts.filters && opts.filters.code === 'double11') {
          return [{ documentId: 'camp1', code: 'double11', channel: { documentId: 'ch1', code: 'wx' } }];
        }
        if (uid === 'plugin::zhao-track.source-tag') {
          return [];
        }
        return [];
      });
      const update = jest.fn().mockResolvedValue({});
      const create = jest.fn().mockResolvedValue({ documentId: 'tag1', tagId: 'utm_123' });
      const findOne = jest.fn().mockResolvedValue({ documentId: 'tag1', tagId: 'utm_123', promoCampaign: null });
      return { findMany, update, create, findOne };
    });
    service = sourceResolverFactory({ strapi });

    const result = await service.identify({ utm: { utmSource: 'double11' }, deviceFingerprint: 'fp1' });
    // 应该创建新 SourceTag（因为步骤 0 匹配到 campaign，但步骤 1-3 找不到现有 tag）
    expect(result.isNew).toBe(true);
  });

  it('identify creates new SourceTag without promoChannelId', async () => {
    const createMock = jest.fn().mockResolvedValue({ documentId: 'tag1', tagId: 'utm_123' });
    strapi.documents = jest.fn((uid: string) => {
      const findMany = jest.fn().mockResolvedValue([]);
      const create = uid === 'plugin::zhao-track.source-tag' ? createMock : jest.fn();
      const update = jest.fn().mockResolvedValue({});
      const findOne = jest.fn().mockResolvedValue({ documentId: 'tag1', tagId: 'utm_123', promoCampaign: null });
      return { findMany, create, update, findOne };
    });
    service = sourceResolverFactory({ strapi });

    const result = await service.identify({ utm: { utmSource: 'unknown' }, deviceFingerprint: 'fp1' });
    expect(result.isNew).toBe(true);
    expect(createMock).toHaveBeenCalled();
    const createCall = createMock.mock.calls[0][0];
    expect(createCall.data.promoChannelId).toBeUndefined();
  });
});
