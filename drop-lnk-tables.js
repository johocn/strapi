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
    await client.query('DROP TABLE IF EXISTS zhao_courses_knowledge_points_lnk');
    console.log('所有知识点关联表已删除');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();