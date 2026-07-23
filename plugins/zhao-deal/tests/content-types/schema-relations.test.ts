import platform from '../../server/src/content-types/platform/schema.json';
import category from '../../server/src/content-types/category/schema.json';
import coupon from '../../server/src/content-types/coupon/schema.json';
import sourceTag from '../../../zhao-track/server/src/content-types/source-tag/schema.json';

describe('Schema 反向关系补全', () => {
  describe('Platform', () => {
    it('包含 coupons oneToMany mappedBy=platform', () => {
      const attr = platform.attributes.coupons as any;
      expect(attr).toBeDefined();
      expect(attr.type).toBe('relation');
      expect(attr.relation).toBe('oneToMany');
      expect(attr.target).toBe('plugin::zhao-deal.coupon');
      expect(attr.mappedBy).toBe('platform');
    });
    it('包含 products oneToMany mappedBy=platform', () => {
      const attr = platform.attributes.products as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe('oneToMany');
      expect(attr.mappedBy).toBe('platform');
    });
    it('包含 categories oneToMany mappedBy=platform', () => {
      const attr = platform.attributes.categories as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe('oneToMany');
      expect(attr.mappedBy).toBe('platform');
    });
  });

  describe('Category', () => {
    it('包含 coupons oneToMany mappedBy=category', () => {
      const attr = category.attributes.coupons as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe('oneToMany');
      expect(attr.mappedBy).toBe('category');
    });
    it('包含 products oneToMany mappedBy=category', () => {
      const attr = category.attributes.products as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe('oneToMany');
      expect(attr.mappedBy).toBe('category');
    });
  });

  describe('Coupon', () => {
    it('包含 product oneToOne mappedBy=coupon', () => {
      const attr = coupon.attributes.product as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe('oneToOne');
      expect(attr.mappedBy).toBe('coupon');
    });
    it('包含 clickEvents oneToMany mappedBy=coupon', () => {
      const attr = coupon.attributes.clickEvents as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe('oneToMany');
      expect(attr.target).toBe('plugin::zhao-track.click-event');
      expect(attr.mappedBy).toBe('coupon');
    });
  });

  describe('SourceTag', () => {
    it('包含 clickEvents oneToMany mappedBy=sourceTag', () => {
      const attr = sourceTag.attributes.clickEvents as any;
      expect(attr).toBeDefined();
      expect(attr.relation).toBe('oneToMany');
      expect(attr.target).toBe('plugin::zhao-track.click-event');
      expect(attr.mappedBy).toBe('sourceTag');
    });
  });
});
