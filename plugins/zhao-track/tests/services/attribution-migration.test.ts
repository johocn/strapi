import { createMockStrapi } from '../helpers/mock-strapi';
import attributionFactory from '../../server/src/services/attribution';

describe('attribution migration to ChannelPlatformConfig', () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = attributionFactory({ strapi });
  });

  it('findMatchingClick rule1 uses ChannelPlatformConfig reverse lookup', async () => {
    strapi.documents = jest.fn((uid: string) => {
      const findMany = jest.fn().mockImplementation((opts: any) => {
        if (uid === 'plugin::zhao-studio.channel-platform-config') {
          return [{ documentId: 'cfg1', channel: { documentId: 'ch1' } }];
        }
        if (uid === 'plugin::zhao-studio.promo-campaign') {
          return [{ documentId: 'camp1' }];
        }
        if (uid === 'plugin::zhao-track.click-event') {
          return [{ documentId: 'click1', promoPid: 'pid123' }];
        }
        return [];
      });
      return { findMany };
    });
    service = attributionFactory({ strapi });

    const order = {
      documentId: 'o1',
      promoPid: 'pid123',
      coupon: { documentId: 'coupon1' },
      transactedAt: new Date().toISOString(),
    };
    const result = await service.findMatchingClick(order);
    expect(result).toBeTruthy();
    expect(result.quality).toBe('pid_match');
  });

  it('findMatchingClick returns null when no ChannelPlatformConfig found', async () => {
    strapi.documents = jest.fn((uid: string) => {
      const findMany = jest.fn().mockResolvedValue([]);
      return { findMany };
    });
    service = attributionFactory({ strapi });

    const order = {
      promoPid: 'nonexist',
      coupon: { documentId: 'coupon1' },
      transactedAt: new Date().toISOString(),
    };
    const result = await service.findMatchingClick(order);
    expect(result).toBeNull();
  });
});
