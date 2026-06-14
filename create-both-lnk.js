const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ 
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'strapi',
  user: process.env.DATABASE_USERNAME || 'strapi',
  password: process.env.DATABASE_PASSWORD || 'strapi'
});

async function run() {
  try {
    await client.connect();
    // 删除旧表
    await client.query('DROP TABLE IF EXISTS zhao_knowledge_points_course_lnk');
    await client.query('DROP TABLE IF EXISTS zhao_courses_knowledge_points_lnk');
    
    // 创建第一个表（从标签侧查询使用）
    await client.query(`
      CREATE TABLE "zhao_knowledge_points_course_lnk" (
        "id" SERIAL PRIMARY KEY,
        "knowledge_point_id" INTEGER NOT NULL REFERENCES "zhao_tags"("id") ON DELETE CASCADE,
        "course_id" INTEGER NOT NULL REFERENCES "zhao_courses"("id") ON DELETE CASCADE,
        "knowledge_point_ord" INTEGER NOT NULL DEFAULT 0,
        UNIQUE ("knowledge_point_id", "course_id")
      )
    `);
    console.log('表 zhao_knowledge_points_course_lnk 创建成功');
    
    // 创建第二个表（从课程侧查询使用）
    await client.query(`
      CREATE TABLE "zhao_courses_knowledge_points_lnk" (
        "id" SERIAL PRIMARY KEY,
        "course_id" INTEGER NOT NULL REFERENCES "zhao_courses"("id") ON DELETE CASCADE,
        "tag_id" INTEGER NOT NULL REFERENCES "zhao_tags"("id") ON DELETE CASCADE,
        "course_ord" INTEGER NOT NULL DEFAULT 0,
        UNIQUE ("course_id", "tag_id")
      )
    `);
    console.log('表 zhao_courses_knowledge_points_lnk 创建成功');
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();