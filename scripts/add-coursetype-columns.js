// 手动添加 course_type / points_price / enroll_mode 列到 zhao_courses 表
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  const knex = require('knex')({
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'strapi',
      user: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'admin',
    },
  });

  try {
    console.log('[INFO] 检查并添加 course_type / points_price / enroll_mode 列...');

    // course_type (enumeration)
    const hasCourseType = await knex.schema.hasColumn('zhao_courses', 'course_type');
    if (!hasCourseType) {
      // 先创建 enum 类型
      await knex.raw("CREATE TYPE zhao_courses_course_type_enum AS ENUM ('free', 'points', 'paid')");
      await knex.raw("ALTER TABLE zhao_courses ADD COLUMN course_type zhao_courses_course_type_enum DEFAULT 'free'");
      console.log('[OK] 添加列: course_type (enum, default=free)');
    } else {
      console.log('[SKIP] course_type 列已存在');
    }

    // points_price (integer)
    const hasPointsPrice = await knex.schema.hasColumn('zhao_courses', 'points_price');
    if (!hasPointsPrice) {
      await knex.schema.alterTable('zhao_courses', (table) => {
        table.integer('points_price').defaultTo(0);
      });
      console.log('[OK] 添加列: points_price (integer, default=0)');
    } else {
      console.log('[SKIP] points_price 列已存在');
    }

    // enroll_mode (enumeration)
    const hasEnrollMode = await knex.schema.hasColumn('zhao_courses', 'enroll_mode');
    if (!hasEnrollMode) {
      await knex.raw("CREATE TYPE zhao_courses_enroll_mode_enum AS ENUM ('none', 'required', 'period')");
      await knex.raw("ALTER TABLE zhao_courses ADD COLUMN enroll_mode zhao_courses_enroll_mode_enum DEFAULT 'none'");
      console.log('[OK] 添加列: enroll_mode (enum, default=none)');
    } else {
      console.log('[SKIP] enroll_mode 列已存在');
    }

    // 验证
    const cols = await knex.raw(
      "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'zhao_courses' AND column_name IN ('course_type','points_price','enroll_mode') ORDER BY column_name"
    );
    console.log('\n验证列:');
    console.table(cols.rows);

  } catch (err) {
    // 如果 enum 类型已存在但列不存在，需要先处理
    if (err.message.includes('already exists')) {
      console.log('[WARN] enum 类型已存在，尝试直接添加列...');
      try {
        const hasCourseType = await knex.schema.hasColumn('zhao_courses', 'course_type');
        if (!hasCourseType) {
          await knex.raw("ALTER TABLE zhao_courses ADD COLUMN course_type zhao_courses_course_type_enum DEFAULT 'free'");
          console.log('[OK] 添加列: course_type');
        }
        const hasEnrollMode = await knex.schema.hasColumn('zhao_courses', 'enroll_mode');
        if (!hasEnrollMode) {
          await knex.raw("ALTER TABLE zhao_courses ADD COLUMN enroll_mode zhao_courses_enroll_mode_enum DEFAULT 'none'");
          console.log('[OK] 添加列: enroll_mode');
        }
      } catch (e2) {
        console.error('[ERROR] 重试失败:', e2.message);
        process.exit(1);
      }
    } else {
      console.error('[ERROR]:', err.message);
      process.exit(1);
    }
  } finally {
    await knex.destroy();
  }
})();
