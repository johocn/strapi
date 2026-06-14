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
    await client.query('DROP TABLE IF EXISTS zhao_knowledge_points_course_lnk');
    await client.query(`
      CREATE TABLE "zhao_courses_knowledge_points_lnk" (
        "id" SERIAL PRIMARY KEY,
        "course_id" INTEGER NOT NULL REFERENCES "zhao_courses"("id") ON DELETE CASCADE,
        "knowledge_point_id" INTEGER NOT NULL REFERENCES "zhao_tags"("id") ON DELETE CASCADE,
        "knowledge_point_ord" INTEGER NOT NULL DEFAULT 0,
        UNIQUE ("course_id", "knowledge_point_id")
      )
    `);
    console.log('表创建成功');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();