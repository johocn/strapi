/**
 * 检查课程 channelIds 字段格式
 */
const { Client } = require('pg');

async function checkChannelIds() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询课程表结构和 channelIds 字段
    const structResult = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'zhao_courses'
      AND column_name = 'channel_ids'
    `);

    console.log('=== channel_ids 字段类型 ===');
    console.log(JSON.stringify(structResult.rows, null, 2));

    // 查询包含渠道59的课程
    const courses59 = await client.query(`
      SELECT id, title, channel_ids, channel_scope, allow_cross_channel
      FROM zhao_courses
      WHERE status = 'published'
      AND channel_scope = 'specific'
      ORDER BY id DESC
    `);

    console.log('\n=== 所有已发布且为 specific 渠道的课程 ===');
    courses59.rows.forEach(row => {
      console.log(`ID: ${row.id}, Title: ${row.title}`);
      console.log(`  channel_ids: ${JSON.stringify(row.channel_ids)} (类型: ${typeof row.channel_ids})`);
      console.log(`  channel_scope: ${row.channel_scope}, allow_cross_channel: ${row.allow_cross_channel}`);
    });

    // 直接测试 JSONB 查询
    console.log('\n=== 测试 JSONB 查询 ===');

    // 测试 59 是否在 channel_ids 中
    const test1 = await client.query(`
      SELECT id, title, channel_ids
      FROM zhao_courses
      WHERE status = 'published'
      AND channel_scope = 'specific'
      AND channel_ids @> '59'
    `);
    console.log(`@> '59' 查询结果: ${test1.rows.length} 条`);

    const test2 = await client.query(`
      SELECT id, title, channel_ids
      FROM zhao_courses
      WHERE status = 'published'
      AND channel_scope = 'specific'
      AND channel_ids @> '59'::jsonb
    `);
    console.log(`@> '59'::jsonb 查询结果: ${test2.rows.length} 条`);

    const test3 = await client.query(`
      SELECT id, title, channel_ids
      FROM zhao_courses
      WHERE status = 'published'
      AND channel_scope = 'specific'
      AND 59 = ANY(channel_ids)
    `);
    console.log(`59 = ANY(channel_ids) 查询结果: ${test3.rows.length} 条`);

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

checkChannelIds();
