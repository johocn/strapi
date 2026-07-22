import sourceTag from '../../server/src/content-types/source-tag/schema.json';
import clickEvent from '../../server/src/content-types/click-event/schema.json';
import order from '../../server/src/content-types/order/schema.json';

describe('zhao-track schema promoCampaign migration', () => {
  it('source-tag removes promoChannelId and adds promoCampaign', () => {
    expect(sourceTag.attributes.promoChannelId).toBeUndefined();
    expect(sourceTag.attributes.promoCampaign.relation).toBe('manyToOne');
    expect(sourceTag.attributes.promoCampaign.target).toBe('plugin::zhao-studio.promo-campaign');
  });

  it('click-event removes promoChannelId and adds promoCampaign + abVariant', () => {
    expect(clickEvent.attributes.promoChannelId).toBeUndefined();
    expect(clickEvent.attributes.promoCampaign.relation).toBe('manyToOne');
    expect(clickEvent.attributes.promoCampaign.target).toBe('plugin::zhao-studio.promo-campaign');
    expect(clickEvent.attributes.abVariant.relation).toBe('manyToOne');
    expect(clickEvent.attributes.abVariant.target).toBe('plugin::zhao-studio.ab-variant');
  });

  it('order removes promoChannelId and adds promoCampaign', () => {
    expect(order.attributes.promoChannelId).toBeUndefined();
    expect(order.attributes.promoCampaign.relation).toBe('manyToOne');
    expect(order.attributes.promoCampaign.target).toBe('plugin::zhao-studio.promo-campaign');
  });
});
