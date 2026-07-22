import { createMockStrapi } from '../helpers/mock-strapi';
import clickOrchestratorFactory from '../../server/src/services/click-orchestrator';

describe('click-orchestrator migration', () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = clickOrchestratorFactory({ strapi });
  });

  it('orchestrate writes promoCampaign instead of promoChannelId', async () => {
    const createMock = jest.fn().mockResolvedValue({ documentId: 'click1' });
    strapi.documents = jest.fn((uid: string) => {
      const findMany = jest.fn().mockImplementation((opts: any) => {
        if (uid === 'plugin::zhao-deal.coupon') {
          return [{ documentId: 'c1', couponId: 'C1', promoLink: 'http://x', platform: { code: 'taobao' } }];
        }
        if (uid === 'plugin::zhao-studio.channel-platform-config') {
          return [{ documentId: 'cfg1', promoPid: 'mm_123' }];
        }
        return [];
      });
      const create = uid === 'plugin::zhao-track.click-event' ? createMock : jest.fn();
      return { findMany, create };
    });

    // Mock plugin services
    strapi.plugin = jest.fn((name: string) => {
      if (name === 'zhao-track') {
        return {
          service: jest.fn((sname: string) => {
            if (sname === 'rate-limiter') {
              return { checkAndRecord: jest.fn().mockResolvedValue({ allowed: true }) };
            }
            if (sname === 'source-resolver') {
              return {
                identify: jest.fn().mockResolvedValue({
                  tag: {
                    documentId: 't1',
                    tagId: 'utm_1',
                    promoCampaign: { documentId: 'camp1', channel: { documentId: 'ch1' } },
                  },
                }),
              };
            }
            return null;
          }),
        };
      }
      if (name === 'zhao-deal') {
        return {
          service: jest.fn((sname: string) => {
            if (sname === 'adapterRegistry') {
              return {
                get: jest.fn().mockReturnValue({
                  transformLink: jest.fn().mockResolvedValue({ resolvedLink: 'http://r', promoPid: 'pid' }),
                }),
              };
            }
            return null;
          }),
        };
      }
      if (name === 'zhao-studio') {
        return {
          service: jest.fn((sname: string) => {
            if (sname === 'ab-test') {
              return { pickVariant: jest.fn().mockResolvedValue(null) };
            }
            return null;
          }),
        };
      }
      return { service: jest.fn().mockReturnValue(null) };
    });
    service = clickOrchestratorFactory({ strapi });

    await service.orchestrate({
      couponId: 'C1',
      deviceFingerprint: 'fp1',
      utm: { utmSource: 'test' },
    });

    expect(createMock).toHaveBeenCalled();
    const createCall = createMock.mock.calls[0][0];
    expect(createCall.data.promoChannelId).toBeUndefined();
    expect(createCall.data.promoCampaign).toBeDefined();
  });
});
