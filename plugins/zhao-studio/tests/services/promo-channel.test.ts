import { createMockStrapi } from '../helpers/mock-strapi';
import promoChannelServiceFactory from '../../server/src/services/promo-channel';

describe('promo-channel service', () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    // 覆盖 documents mock 以支持按 uid 返回不同结果
    const findMany = jest.fn().mockResolvedValue([]);
    const create = jest.fn().mockResolvedValue({ documentId: 'new', name: 'Test' });
    strapi.documents = jest.fn().mockReturnValue({ findMany, create });
    service = promoChannelServiceFactory({ strapi });
  });

  it('listChannels calls documents findMany', async () => {
    await service.listChannels({ page: 1, pageSize: 10 });
    expect(strapi.documents).toHaveBeenCalledWith('plugin::zhao-studio.promo-channel');
  });

  it('createChannel throws on duplicate code', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ documentId: 'existing' }]),
      create: jest.fn(),
    });
    service = promoChannelServiceFactory({ strapi });
    await expect(service.createChannel({ name: 'Test', code: 'dup' })).rejects.toThrow();
  });

  it('addPlatformConfig throws on duplicate channel+platform', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ documentId: 'existing' }]),
      create: jest.fn(),
    });
    service = promoChannelServiceFactory({ strapi });
    await expect(service.addPlatformConfig('ch1', { platform: 'p1' })).rejects.toThrow();
  });

  it('createChannel succeeds with unique code', async () => {
    const createMock = jest.fn().mockResolvedValue({ documentId: 'new' });
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
      create: createMock,
    });
    service = promoChannelServiceFactory({ strapi });
    const result = await service.createChannel({ name: 'Test', code: 'unique' });
    expect(result.documentId).toBe('new');
    expect(createMock).toHaveBeenCalled();
  });
});
