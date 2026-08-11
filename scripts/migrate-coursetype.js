// 迁移脚本：为老课程数据填充 courseType / enrollMode 字段
// 用法：node scripts/migrate-coursetype.js
// 幂等性：courseType 已有值则跳过
//
// 迁移规则：
//   is_paid=true  → course_type='paid'
//   is_free=true  → course_type='free'
//   其余          → course_type='free'（默认）
//   enroll_mode 统一设为 'none'（默认，老数据无报名概念）
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  const client = process.env.DATABASE_CLIENT || 'postgres';
  if (client !== 'postgres') {
    console.log(`[SKIP] DATABASE_CLIENT=${client}, 仅支持 postgres`);
    process.exit(0);
  }

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
    console.log('[INFO] 开始迁移 courseType / enrollMode...');

    // 检查 course_type 列是否存在（schema 变更后应已存在）
    const hasCourseTypeCol = await knex.schema.hasColumn('zhao_courses', 'course_type');
    if (!hasCourseTypeCol) {
      console.log('[ERROR] zhao_courses.course_type 列不存在，请先重启 Strapi 让 schema 生效');
      process.exit(1);
    }

    // 查询所有 courseType 为 NULL 的课程（enum 列不能为空字符串）
    const courses = await knex('zhao_courses')
      .select('id', 'document_id', 'title', 'is_free', 'is_paid', 'course_type', 'enroll_mode')
      .whereNull('course_type');

    console.log(`[INFO] 共 ${courses.length} 门课程 courseType 为 NULL`);

    if (courses.length === 0) {
      console.log('[OK] 所有课程已有 courseType（无 NULL 值）');
    } else {
      let freeCount = 0, paidCount = 0;
      for (const c of courses) {
        const courseType = c.is_paid ? 'paid' : 'free';
        await knex('zhao_courses')
          .where('id', c.id)
          .update({
            course_type: courseType,
            enroll_mode: c.enroll_mode || 'none',
            updated_at: new Date(),
          });
        if (courseType === 'paid') paidCount++;
        else freeCount++;
        console.log(`[OK] NULL → 课程 #${c.id} "${c.title}" → courseType=${courseType}`);
      }
      console.log(`[完成] NULL 迁移 ${courses.length} 门：免费 ${freeCount}，付费 ${paidCount}`);
    }

    // 第二阶段：修正 is_paid=true 但 course_type='free' 的课程
    const paidAsFree = await knex('zhao_courses')
      .select('id', 'title', 'is_paid', 'course_type')
      .where('is_paid', true)
      .where('course_type', '!=', 'paid');

    if (paidAsFree.length > 0) {
      console.log(`\n[INFO] 发现 ${paidAsFree.length} 门 is_paid=true 但 course_type≠paid 的课程，修正中...`);
      for (const c of paidAsFree) {
        await knex('zhao_courses').where('id', c.id).update({ course_type: 'paid', updated_at: new Date() });
        console.log(`[OK] 修正 课程 #${c.id} "${c.title}" → courseType=paid`);
      }
    } else {
      console.log('[OK] 无需修正 is_paid/courseType 不一致');
    }

    // 统计最终结果
    const stats = await knex('zhao_courses')
      .select('course_type')
      .count('* as cnt')
      .groupBy('course_type');
    console.log('\n最终 courseType 分布:');
    console.table(stats);
  } catch (err) {
    console.error('[ERROR] 迁移失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
})();
