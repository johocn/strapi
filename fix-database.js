const { Pool } = require('pg');
require('dotenv').config();

// 从环境变量获取数据库配置
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'strapi',
  user: process.env.DATABASE_USERNAME || 'strapi',
  password: process.env.DATABASE_PASSWORD || 'strapi',
});

async function fixDatabase() {
  const client = await pool.connect();
  try {
    console.log('开始修复数据库...');

    // 第一步：查询所有外键约束
    console.log('\n1. 查找 zhao_course_tags 表的外键约束...');
    const constraintsResult = await client.query(`
      SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
      FROM 
          information_schema.table_constraints AS tc 
      JOIN 
          information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN 
          information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE 
          tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'zhao_course_tags'
    `);

    if (constraintsResult.rows.length > 0) {
      console.log('\n发现以下外键约束:');
      constraintsResult.rows.forEach(row => {
        console.log(`  - ${row.constraint_name}: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });

      // 第二步：删除所有外键约束
      console.log('\n2. 删除外键约束...');
      for (const row of constraintsResult.rows) {
        try {
          await client.query(`ALTER TABLE "public"."zhao_course_tags" DROP CONSTRAINT IF EXISTS "${row.constraint_name}" CASCADE`);
          console.log(`  ✓ 已删除约束: ${row.constraint_name}`);
        } catch (err) {
          console.log(`  ✗ 删除约束 ${row.constraint_name} 失败:`, err.message);
        }
      }
    } else {
      console.log('  没有找到外键约束');
    }

    // 第三步：删除表
    console.log('\n3. 删除 zhao_course_tags 表...');
    try {
      await client.query('DROP TABLE IF EXISTS "public"."zhao_course_tags" CASCADE');
      console.log('  ✓ 已删除表 zhao_course_tags');
    } catch (err) {
      console.log('  ✗ 删除表失败:', err.message);
    }

    // 第四步：验证表已删除
    console.log('\n4. 验证表是否已删除...');
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'zhao_course_tags'
    `);

    if (verifyResult.rows.length === 0) {
      console.log('  ✓ 表 zhao_course_tags 已成功删除');
    } else {
      console.log('  ✗ 表 zhao_course_tags 仍然存在');
    }

    console.log('\n数据库修复完成！');

  } catch (err) {
    console.error('数据库修复失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabase();
