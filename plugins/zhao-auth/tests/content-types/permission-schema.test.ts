import schema from '../../server/src/content-types/permission/schema.json';

describe('permission schema', () => {
  it('has seedVersion field with empty string default', () => {
    expect(schema.attributes.seedVersion).toBeDefined();
    expect(schema.attributes.seedVersion.type).toBe('string');
    expect(schema.attributes.seedVersion.default).toBe('');
  });

  it('preserves existing fields', () => {
    expect(schema.attributes.role.required).toBe(true);
    expect(schema.attributes.role.unique).toBe(true);
    expect(schema.attributes.permissions.type).toBe('json');
    expect(schema.attributes.isSystem.type).toBe('boolean');
    expect(schema.attributes.level.type).toBe('integer');
  });
});
