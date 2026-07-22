import publishPlatform from '../../server/src/content-types/publish-platform/schema.json';
import browserLog from '../../server/src/content-types/browser-log/schema.json';
import publishRecord from '../../server/src/content-types/publish-record/schema.json';

describe('existing schema modifications', () => {
  it('publish-platform has extended type enum and category', () => {
    expect(publishPlatform.attributes.type.enum).toContain('taobao');
    expect(publishPlatform.attributes.type.enum).toContain('pdd');
    expect(publishPlatform.attributes.type.enum).toContain('douyin-ecom');
    expect(publishPlatform.attributes.type.enum).toContain('jd');
    expect(publishPlatform.attributes.type.enum).toContain('douyin');
    expect(publishPlatform.attributes.type.enum).toContain('bilibili');
    expect(publishPlatform.attributes.category.enum).toEqual(['content', 'social', 'ecommerce', 'custom']);
    expect(publishPlatform.attributes.category.default).toBe('content');
  });

  it('browser-log has promoChannelCode', () => {
    expect(browserLog.attributes.promoChannelCode.type).toBe('string');
  });

  it('publish-record has abVariant relation', () => {
    expect(publishRecord.attributes.abVariant.relation).toBe('manyToOne');
    expect(publishRecord.attributes.abVariant.target).toBe('plugin::zhao-studio.ab-variant');
  });
});
