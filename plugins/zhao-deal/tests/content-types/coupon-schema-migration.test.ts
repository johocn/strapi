import coupon from '../../server/src/content-types/coupon/schema.json';

describe('coupon schema promoChannels migration', () => {
  it('removes promoChannelIds string field', () => {
    expect(coupon.attributes.promoChannelIds).toBeUndefined();
  });

  it('adds promoChannels manyToMany relation', () => {
    expect(coupon.attributes.promoChannels.type).toBe('relation');
    expect(coupon.attributes.promoChannels.relation).toBe('manyToMany');
    expect(coupon.attributes.promoChannels.target).toBe('plugin::zhao-studio.promo-channel');
    expect(coupon.attributes.promoChannels.inversedBy).toBe('coupons');
  });
});
