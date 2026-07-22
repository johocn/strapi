import promoChannel from '../../server/src/content-types/promo-channel/schema.json';
import channelPlatformConfig from '../../server/src/content-types/channel-platform-config/schema.json';
import promoCampaign from '../../server/src/content-types/promo-campaign/schema.json';
import abExperiment from '../../server/src/content-types/ab-experiment/schema.json';
import abVariant from '../../server/src/content-types/ab-variant/schema.json';

describe('zhao-studio promo content-types schemas', () => {
  it('promo-channel has required fields', () => {
    expect(promoChannel.info.singularName).toBe('promo-channel');
    expect(promoChannel.attributes.name.required).toBe(true);
    expect(promoChannel.attributes.code.required).toBe(true);
    expect(promoChannel.attributes.code.unique).toBe(true);
    expect(promoChannel.attributes.scene.enum).toContain('wechat_group');
    expect(promoChannel.attributes.platformConfigs.relation).toBe('oneToMany');
    expect(promoChannel.attributes.platformConfigs.mappedBy).toBe('channel');
    expect(promoChannel.attributes.coupons.relation).toBe('manyToMany');
    expect(promoChannel.attributes.coupons.target).toBe('plugin::zhao-deal.coupon');
    expect(promoChannel.attributes.coupons.mappedBy).toBe('promoChannels');
  });

  it('channel-platform-config has required fields', () => {
    expect(channelPlatformConfig.info.singularName).toBe('channel-platform-config');
    expect(channelPlatformConfig.attributes.channel.relation).toBe('manyToOne');
    expect(channelPlatformConfig.attributes.channel.inversedBy).toBe('platformConfigs');
    expect(channelPlatformConfig.attributes.platform.relation).toBe('manyToOne');
    expect(channelPlatformConfig.attributes.platform.target).toBe('plugin::zhao-studio.publish-platform');
    expect(channelPlatformConfig.attributes.promoPid.required).toBeUndefined();
  });

  it('promo-campaign has required fields', () => {
    expect(promoCampaign.info.singularName).toBe('promo-campaign');
    expect(promoCampaign.attributes.code.required).toBe(true);
    expect(promoCampaign.attributes.code.unique).toBe(true);
    expect(promoCampaign.attributes.channel.relation).toBe('manyToOne');
    expect(promoCampaign.attributes.channel.inversedBy).toBe('campaigns');
    expect(promoCampaign.attributes.startAt.required).toBe(true);
    expect(promoCampaign.attributes.endAt.required).toBe(true);
  });

  it('ab-experiment has required fields', () => {
    expect(abExperiment.info.singularName).toBe('ab-experiment');
    expect(abExperiment.attributes.status.enum).toEqual(['draft', 'running', 'paused', 'completed']);
    expect(abExperiment.attributes.channel.relation).toBe('manyToOne');
    expect(abExperiment.attributes.campaign.relation).toBe('manyToOne');
    expect(abExperiment.attributes.variants.relation).toBe('oneToMany');
    expect(abExperiment.attributes.variants.mappedBy).toBe('experiment');
  });

  it('ab-variant has required fields', () => {
    expect(abVariant.info.singularName).toBe('ab-variant');
    expect(abVariant.attributes.experiment.relation).toBe('manyToOne');
    expect(abVariant.attributes.experiment.inversedBy).toBe('variants');
    expect(abVariant.attributes.weight.required).toBe(true);
    expect(abVariant.attributes.article.target).toBe('plugin::zhao-studio.article-draft');
    expect(abVariant.attributes.coupon.target).toBe('plugin::zhao-deal.coupon');
  });
});
