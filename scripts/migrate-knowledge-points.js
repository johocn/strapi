// 迁移脚本：将 knowledge-point 数据迁移为 tag（归入"知识点"分组）
// + 将 course/quiz 的 knowledgePoints 关系迁移到 tags 关系
// 用法：node scripts/migrate-knowledge-points.js
// 必须在 Strapi 启动前执行（避免 join 表被删除）
// 幂等性：tag name 已存在则跳过，关联已存在则跳过
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
    console.log('[INFO] 开始迁移 knowledge-point → tag...');

    // 1. 检测 knowledge-point 表是否存在
    const kpTableExists = await knex.schema.hasTable('zhao_knowledge_points');
    if (!kpTableExists) {
      console.log('[SKIP] zhao_knowledge_points 表不存在，无需迁移');
      process.exit(0);
    }

    // 2. 查找"知识点"分组的 id
    const kpGroup = await knex('zhao_tag_groups').where('slug', 'knowledge-point').first();
    if (!kpGroup) {
      console.log('[ERROR] 未找到 slug=knowledge-point 的 tag-group，请先运行 seed-tag-groups.js');
      process.exit(1);
    }
    console.log(`[INFO] 知识点分组 id=${kpGroup.id}`);

    // 3. 读取所有 knowledge-point 记录（排除 test-kp）
    const kps = await knex('zhao_knowledge_points')
      .whereNot('name', 'test-kp')
      .select('id', 'document_id', 'name', 'description', 'code', 'level', 'sort');
    console.log(`[INFO] 找到 ${kps.length} 条 knowledge-point 记录需迁移`);

    // 4. 为每个 knowledge-point 创建对应的 tag（幂等：name 已存在则跳过）
    const kpIdToTagId = {};
    for (const kp of kps) {
      let existingTag = await knex('zhao_tags').where('name', kp.name).first();
      if (existingTag) {
        console.log(`[SKIP] tag 已存在: "${kp.name}" (id=${existingTag.id})`);
        kpIdToTagId[kp.id] = existingTag.id;
      } else {
        const inserted = await knex('zhao_tags').insert({
          document_id: kp.document_id,
          name: kp.name,
          slug: null,
          description: kp.description,
          sort: kp.sort || 0,
          created_at: new Date(),
          updated_at: new Date(),
        }).returning('id');
        const tagId = Array.isArray(inserted) ? (typeof inserted[0] === 'object' ? inserted[0].id : inserted[0]) : inserted;
        console.log(`[OK] 创建 tag: "${kp.name}" (id=${tagId})`);
        kpIdToTagId[kp.id] = tagId;
      }

      // 建立 tag → 知识点分组 关联（幂等）
      const existingLink = await knex('zhao_tags_tag_group_lnk')
        .where({ tag_id: kpIdToTagId[kp.id], tag_group_id: kpGroup.id })
        .first();
      if (!existingLink) {
        await knex('zhao_tags_tag_group_lnk').insert({
          tag_id: kpIdToTagId[kp.id],
          tag_group_id: kpGroup.id,
          tag_ord: 0,
        });
        console.log(`[OK] tag "${kp.name}" 关联到知识点分组`);
      }
    }

    // 5. 迁移 course.knowledgePoints → course.tags
    const courseKpLnkExists = await knex.schema.hasTable('zhao_courses_knowledge_points_lnk');
    if (courseKpLnkExists) {
      console.log('[INFO] 迁移 course.knowledgePoints → course.tags...');
      const courseLinks = await knex('zhao_courses_knowledge_points_lnk').select('*');
      let migrated = 0;
      for (const link of courseLinks) {
        const tagId = kpIdToTagId[link.knowledge_point_id];
        if (!tagId) {
          console.log(`[WARN] knowledge_point_id=${link.knowledge_point_id} 未找到对应 tag，跳过`);
          continue;
        }
        const courseTagsLnkExists = await knex.schema.hasTable('zhao_courses_tags_lnk');
        if (!courseTagsLnkExists) {
          console.log('[WARN] zhao_courses_tags_lnk 表不存在，跳过 course 关联迁移');
          break;
        }
        const existing = await knex('zhao_courses_tags_lnk')
          .where({ course_id: link.course_id, tag_id: tagId })
          .first();
        if (existing) {
          continue;
        }
        await knex('zhao_courses_tags_lnk').insert({
          course_id: link.course_id,
          tag_id: tagId,
          tag_ord: 0,
        });
        migrated++;
      }
      console.log(`[OK] course 关联迁移 ${migrated} 条`);
    } else {
      console.log('[SKIP] zhao_courses_knowledge_points_lnk 表不存在');
    }

    // 6. 迁移 quiz.knowledgePoints → quiz.tags
    const quizKpLnkExists = await knex.schema.hasTable('zhao_quizzes_knowledge_points_lnk');
    if (quizKpLnkExists) {
      console.log('[INFO] 迁移 quiz.knowledgePoints → quiz.tags...');
      const quizLinks = await knex('zhao_quizzes_knowledge_points_lnk').select('*');
      let migrated = 0;
      for (const link of quizLinks) {
        const tagId = kpIdToTagId[link.knowledge_point_id];
        if (!tagId) {
          console.log(`[WARN] knowledge_point_id=${link.knowledge_point_id} 未找到对应 tag，跳过`);
          continue;
        }
        const quizTagsLnkExists = await knex.schema.hasTable('zhao_quizzes_tags_lnk');
        if (!quizTagsLnkExists) {
          console.log('[WARN] zhao_quizzes_tags_lnk 表不存在，跳过 quiz 关联迁移');
          break;
        }
        const existing = await knex('zhao_quizzes_tags_lnk')
          .where({ quiz_id: link.quiz_id, tag_id: tagId })
          .first();
        if (existing) {
          continue;
        }
        await knex('zhao_quizzes_tags_lnk').insert({
          quiz_id: link.quiz_id,
          tag_id: tagId,
          tag_ord: 0,
        });
        migrated++;
      }
      console.log(`[OK] quiz 关联迁移 ${migrated} 条`);
    } else {
      console.log('[SKIP] zhao_quizzes_knowledge_points_lnk 表不存在');
    }

    console.log('\n[DONE] knowledge-point 迁移完成，可以启动 Strapi');
  } catch (err) {
    console.error('[ERROR]', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
})();
