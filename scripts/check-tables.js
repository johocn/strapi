/**
 * 查看数据库表列表
 */
const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询所有表
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename LIKE '%channel%'
      ORDER BY tablename
    `);

    console.log('=== 渠道相关表 ===');
    tablesResult.rows.forEach(row => {
      console.log(row.tablename);
    });

    // 查询用户表
    const userTables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND (tablename LIKE '%user%' OR tablename LIKE '%users%')
      ORDER BY tablename
    `);

    console.log('\n=== 用户相关表 ===');
    userTables.rows.forEach(row => {
      console.log(row.tablename);
    });

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

checkTables();
