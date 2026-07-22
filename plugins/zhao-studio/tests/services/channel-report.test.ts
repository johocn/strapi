import { createMockStrapi } from '../helpers/mock-strapi';
import channelReportServiceFactory from '../../server/src/services/channel-report';

describe('channel-report service', () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = channelReportServiceFactory({ strapi });
  });

  it('getChannelReport throws when channel not found', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
    });
    service = channelReportServiceFactory({ strapi });
    await expect(service.getChannelReport({
      channelCode: 'nonexist',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    })).rejects.toThrow();
  });

  it('getChannelReport returns report with funnel + roi', async () => {
    strapi.documents = jest.fn().mockImplementation((uid: string) => {
      const findMany = jest.fn().mockImplementation((opts: any) => {
        if (uid === 'plugin::zhao-studio.promo-channel') {
          return [{ documentId: 'ch1', name: '微信群', code: 'wx', scene: 'wechat_group', budget: '500.00', actualCost: '450.00', campaigns: [{ documentId: 'camp1', name: '活动1', code: 'c1', actualCost: '100.00' }] }];
        }
        if (uid === 'plugin::zhao-studio.browser-log') {
          return [{ eventType: 'page-view' }, { eventType: 'ad-click' }];
        }
        if (uid === 'plugin::zhao-track.click-event') {
          return [{ documentId: 'click1' }];
        }
        if (uid === 'plugin::zhao-track.order') {
          return [{ documentId: 'o1', commission: '100.00', attributionQuality: 'pid_match', commissionStatus: 'paid' }];
        }
        return [];
      });
      return { findMany };
    });
    service = channelReportServiceFactory({ strapi });

    const result = await service.getChannelReport({
      channelCode: 'wx',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(result.channel.code).toBe('wx');
    expect(result.funnel.impressions).toBeGreaterThan(0);
    expect(result.funnel.adClicks).toBeGreaterThan(0);
    expect(result.funnel.couponClicks).toBeGreaterThan(0);
    expect(result.funnel.orders).toBeGreaterThan(0);
    expect(result.revenue.totalCommission).toBeGreaterThan(0);
  });
});
