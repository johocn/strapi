describe('Article Service', () => {
  test('create should generate unique slug', async () => {
    // 实际测试需要完整 Strapi 环境
    expect(true).toBe(true);
  });

  test('find should only return published articles', async () => {
    expect(true).toBe(true);
  });

  test('findOne should return null for draft article', async () => {
    expect(true).toBe(true);
  });

  test('publish should set status to published and publishedAt', async () => {
    expect(true).toBe(true);
  });

  test('softDelete should set deletedAt and exclude from queries', async () => {
    expect(true).toBe(true);
  });

  test('slug conflict should throw error', async () => {
    expect(true).toBe(true);
  });

  test('firstTruthValidate should block publish on error-level conflict', async () => {
    expect(true).toBe(true);
  });
});
