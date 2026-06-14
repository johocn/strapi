/**
 * 测试 Strapi 的过滤查询
 */
const { Client } = require('pg');

async function testFilters() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 测试 Strapi 可能的查询方式
    console.log('=== 测试不同查询方式 ===');

    // 1. channel_scope = 'specific' AND allow_cross_channel = true
    const test1 = await client.query(`
      SELECT id, title, channel_scope, allow_cross_channel
      FROM zhao_courses
      WHERE status = 'published'
      AND channel_scope = 'specific'
      AND allow_cross_channel = true
    `);
    console.log(`\n1. channel_scope='specific' AND allow_cross_channel=true:`);
    test1.rows.forEach(r => console.log(`   ${r.id}: ${r.title}`));

    // 2. channel_scope = 'all'
    const test2 = await client.query(`
      SELECT id, title, channel_scope
      FROM zhao_courses
      WHERE status = 'published'
      AND channel_scope = 'all'
    `);
    console.log(`\n2. channel_scope='all':`);
    test2.rows.forEach(r => console.log(`   ${r.id}: ${r.title}`));

    // 3. channel_ids @> '59'
    const test3 = await client.query(`
      SELECT id, title, channel_scope, allow_cross_channel
      FROM zhao_courses
      WHERE status = 'published'
      AND channel_ids @> '59'
    `);
    console.log(`\n3. channel_ids @> '59':`);
    test3.rows.forEach(r => console.log(`   ${r.id}: ${r.title}, allowCrossChannel=${r.allow_cross_channel}`));

    // 4. 组合 OR 查询
    const test4 = await client.query(`
      SELECT id, title, channel_scope, allow_cross_channel
      FROM zhao_courses
      WHERE status = 'published'
      AND (
        channel_scope = 'all'
        OR (channel_scope = 'specific' AND allow_cross_channel = true)
        OR channel_ids @> '59'
      )
    `);
    console.log(`\n4. 完整 OR 组合查询:`);
    test4.rows.forEach(r => console.log(`   ${r.id}: ${r.title}, scope=${r.channel_scope}, allow=${r.allow_cross_channel}`));

    // 5. 检查 publishedAt 状态
    console.log('\n=== 检查发布状态 ===');
    const pubStatus = await client.query(`
      SELECT id, title, status, published_at
      FROM zhao_courses
      WHERE document_id IN ('laudaldvq00tsrx3turx9f1d', 'u5izfqfz2hewok3i55aiwln1')
    `);
    pubStatus.rows.forEach(r => console.log(`ID: ${r.id}, title: ${r.title}, published_at: ${r.published_at}`));

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

testFilters();
