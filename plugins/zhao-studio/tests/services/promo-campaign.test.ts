import { createMockStrapi } from '../helpers/mock-strapi';
import promoCampaignServiceFactory from '../../server/src/services/promo-campaign';

describe('promo-campaign service', () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = promoCampaignServiceFactory({ strapi });
  });

  it('createCampaign throws when channel missing', async () => {
    await expect(service.createCampaign({ name: 'Test', code: 't1', startAt: '2026-01-01', endAt: '2026-01-02' }))
      .rejects.toThrow();
  });

  it('createCampaign throws on duplicate code', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ documentId: 'existing' }]),
      create: jest.fn(),
    });
    service = promoCampaignServiceFactory({ strapi });
    await expect(service.createCampaign({ name: 'Test', code: 'dup', channel: 'ch1', startAt: '2026-01-01', endAt: '2026-01-02' }))
      .rejects.toThrow();
  });

  it('createCampaign succeeds with channel + unique code', async () => {
    const createMock = jest.fn().mockResolvedValue({ documentId: 'new' });
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
      create: createMock,
    });
    service = promoCampaignServiceFactory({ strapi });
    const result = await service.createCampaign({ name: 'Test', code: 'unique', channel: 'ch1', startAt: '2026-01-01', endAt: '2026-01-02' });
    expect(result.documentId).toBe('new');
  });

  it('listCampaigns filters by channelId', async () => {
    const findManyMock = jest.fn().mockResolvedValue([]);
    strapi.documents = jest.fn().mockReturnValue({ findMany: findManyMock });
    service = promoCampaignServiceFactory({ strapi });
    await service.listCampaigns({ page: 1, pageSize: 10, channelId: 'ch1' });
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ channel: 'ch1' }),
    }));
  });
});
