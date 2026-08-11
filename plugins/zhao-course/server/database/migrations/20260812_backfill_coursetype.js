/**
 * 示例 migration：为老课程数据填充 courseType / enrollMode 字段
 *
 * 文件命名规范：YYYYMMDD_简短描述.js（日期作为版本号，保证执行顺序）
 * 文件位置：plugins/<plugin>/server/database/migrations/
 *
 * migration vs seed 的区别：
 * - migration：处理 schema 变更或一次性数据迁移（如老数据回填），严肃操作，失败会阻断启动
 * - seed：处理种子数据初始化（如默认标签、广告位），失败不阻断启动
 *
 * 幂等性：courseType 已有值则跳过
 * 迁移规则：
 *   is_paid=true  → course_type='paid'
 *   is_free=true  → course_type='free'
 *   其余          → course_type='free'（默认）
 *   enroll_mode 统一设为 'none'（默认，老数据无报名概念）
 *
 * up: 执行迁移
 * down: 回滚（可选，数据迁移通常不可逆）
 */
module.exports = {
  async up({ strapi, db }) {
    // 检查 course_type 列是否存在（schema 变更后应已存在）
    const hasCourseTypeCol = await db.schema.hasColumn('zhao_courses', 'course_type');
    if (!hasCourseTypeCol) {
      console.log('[migration 20260812] zhao_courses.course_type 列不存在，跳过');
      return;
    }

    // 查询所有 courseType 为 NULL 的课程（enum 列不能为空字符串）
    const courses = await db('zhao_courses')
      .select('id', 'document_id', 'title', 'is_free', 'is_paid', 'course_type', 'enroll_mode')
      .whereNull('course_type');

    console.log(`[migration 20260812] 共 ${courses.length} 门课程 courseType 为 NULL`);

    if (courses.length === 0) {
      console.log('[migration 20260812] 所有课程已有 courseType（无 NULL 值）');
      return;
    }

    let freeCount = 0;
    let paidCount = 0;
    for (const c of courses) {
      const courseType = c.is_paid ? 'paid' : 'free';
      await db('zhao_courses')
        .where('id', c.id)
        .update({
          course_type: courseType,
          enroll_mode: c.enroll_mode || 'none',
          updated_at: new Date(),
        });

      if (courseType === 'paid') paidCount++;
      else freeCount++;
    }

    console.log(`[migration 20260812] 迁移完成：paid=${paidCount}, free=${freeCount}`);
  },

  async down({ strapi, db }) {
    // 数据迁移通常不可逆，这里仅清空 courseType 回到 NULL 状态（谨慎使用）
    console.log('[migration 20260812] 回滚：将 courseType 置为 NULL');
    await db('zhao_courses').whereNotNull('course_type').update({
      course_type: null,
      updated_at: new Date(),
    });
  },
};
