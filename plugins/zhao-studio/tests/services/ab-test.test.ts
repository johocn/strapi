import { createMockStrapi } from '../helpers/mock-strapi';
import abTestServiceFactory from '../../server/src/services/ab-test';

describe('ab-test service', () => {
  let strapi: any;
  let service: any;

  beforeEach(() => {
    strapi = createMockStrapi();
    service = abTestServiceFactory({ strapi });
  });

  it('pickVariant returns null when no running experiments', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
    });
    service = abTestServiceFactory({ strapi });
    const result = await service.pickVariant({ channelId: 'ch1' });
    expect(result).toBeNull();
  });

  it('pickVariant throws when experiment has no variants', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ documentId: 'exp1', variants: [] }]),
    });
    service = abTestServiceFactory({ strapi });
    await expect(service.pickVariant({ channelId: 'ch1' })).rejects.toThrow();
  });

  it('pickVariant returns a variant based on weight', async () => {
    const variants = [
      { documentId: 'v1', name: 'A', weight: 100, article: null, coupon: null },
      { documentId: 'v2', name: 'B', weight: 0, article: null, coupon: null },
    ];
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ documentId: 'exp1', variants }]),
    });
    service = abTestServiceFactory({ strapi });
    const result = await service.pickVariant({ channelId: 'ch1' });
    expect(result.documentId).toBe('v1');
  });

  it('startExperiment transitions draft to running', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ documentId: 'exp1', status: 'draft' }]),
      update: jest.fn().mockResolvedValue({ documentId: 'exp1', status: 'running' }),
    });
    service = abTestServiceFactory({ strapi });
    const result = await service.startExperiment('exp1');
    expect(result.status).toBe('running');
  });

  it('startExperiment throws when not draft/paused', async () => {
    strapi.documents = jest.fn().mockReturnValue({
      findMany: jest.fn().mockResolvedValue([{ documentId: 'exp1', status: 'running' }]),
      update: jest.fn(),
    });
    service = abTestServiceFactory({ strapi });
    await expect(service.startExperiment('exp1')).rejects.toThrow();
  });
});
