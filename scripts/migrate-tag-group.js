// 一次性迁移脚本：将 tag.group 字符串值迁移为 tag-group 记录 + tagGroup 关系
// 用法：node scripts/migrate-tag-group.js
// 必须在 Strapi 启动前执行（Strapi schema 重建会删除 group 列）
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
    // 1. 检测 tag 表是否存在 group 列（幂等性保证）
    const hasGroupColumn = await knex.schema.hasColumn('zhao_tags', 'group');
    if (!hasGroupColumn) {
      console.log('[SKIP] zhao_tags.group 列不存在，无需迁移');
      process.exit(0);
    }

    console.log('[INFO] 检测到 zhao_tags.group 列，开始迁移...');

    // 2. 读取所有 group 字段非空的 tag 记录
    const tagsWithGroup = await knex('zhao_tags')
      .whereNotNull('group')
      .where('group', '!=', '')
      .select('id', 'document_id', 'group');
    console.log(`[INFO] 找到 ${tagsWithGroup.length} 条有 group 值的 tag 记录`);

    if (tagsWithGroup.length === 0) {
      console.log('[INFO] 无需迁移数据，直接删除 group 列');
      await knex.schema.alterTable('zhao_tags', (table) => {
        table.dropColumn('group');
      });
      console.log('[OK] 已删除 zhao_tags.group 列');
      process.exit(0);
    }

    // 3. 去重 group 字符串值
    const uniqueGroupNames = [...new Set(tagsWithGroup.map((t) => t.group))];
    console.log(`[INFO] 去重后共 ${uniqueGroupNames.length} 个唯一分组名:`, uniqueGroupNames);

    // 4. 确保 zhao_tag_groups 表存在（Strapi 启动前可能未创建）
    const tagGroupTableExists = await knex.schema.hasTable('zhao_tag_groups');
    if (!tagGroupTableExists) {
      console.log('[INFO] zhao_tag_groups 表不存在，创建临时表...');
      await knex.schema.createTable('zhao_tag_groups', (table) => {
        table.increments('id').primary();
        table.string('document_id').nullable();
        table.string('name').notNullable();
        table.string('slug').nullable();
        table.text('description').nullable();
        table.string('color').nullable();
        table.integer('sort').defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('published_at').nullable();
        table.timestamp('deleted_at').nullable();
      });
      console.log('[OK] 已创建 zhao_tag_groups 临时表');
    }

    // 5. 为每个唯一名称创建 tag-group 记录
    const groupNameToId = {};
    for (const name of uniqueGroupNames) {
      // 检查是否已存在同名记录（幂等）
      let existing = await knex('zhao_tag_groups').where('name', name).select('id', 'document_id').first();
      if (!existing) {
        const [id] = await knex('zhao_tag_groups').insert({
          name,
          document_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        });
        existing = { id, document_id: null };
        console.log(`[OK] 创建 tag-group: "${name}" (id=${id})`);
      } else {
        console.log(`[SKIP] tag-group 已存在: "${name}" (id=${existing.id})`);
      }
      groupNameToId[name] = existing.id;
    }

    // 6. 确保 join 表存在（zhao_tags_tag_group_lnk）
    const joinTableExists = await knex.schema.hasTable('zhao_tags_tag_group_lnk');
    if (!joinTableExists) {
      console.log('[INFO] 创建 join 表 zhao_tags_tag_group_lnk...');
      await knex.schema.createTable('zhao_tags_tag_group_lnk', (table) => {
        table.increments('id').primary();
        table.integer('tag_id').unsigned().notNullable();
        table.integer('tag_group_id').unsigned().notNullable();
        table.double('tag_ord').defaultTo(0);
        table.unique(['tag_id', 'tag_group_id']);
      });
      console.log('[OK] 已创建 join 表');
    }

    // 7. 建立 tag 与 tag-group 的关联
    for (const tag of tagsWithGroup) {
      const tagGroupId = groupNameToId[tag.group];
      if (!tagGroupId) {
        console.log(`[WARN] tag id=${tag.id} 的 group "${tag.group}" 未找到对应 tag-group，跳过`);
        continue;
      }

      // 检查关联是否已存在（幂等）
      const existingLink = await knex('zhao_tags_tag_group_lnk')
        .where({ tag_id: tag.id, tag_group_id: tagGroupId })
        .first();
      if (existingLink) {
        console.log(`[SKIP] tag id=${tag.id} 已关联 tag-group id=${tagGroupId}`);
        continue;
      }

      await knex('zhao_tags_tag_group_lnk').insert({
        tag_id: tag.id,
        tag_group_id: tagGroupId,
        tag_ord: 0,
      });
      console.log(`[OK] tag id=${tag.id} 关联 tag-group id=${tagGroupId}`);
    }

    // 8. 删除 tag 表的 group 列
    await knex.schema.alterTable('zhao_tags', (table) => {
      table.dropColumn('group');
    });
    console.log('[OK] 已删除 zhao_tags.group 列');

    console.log('\n[DONE] 迁移完成，可以启动 Strapi');
  } catch (err) {
    console.error('[ERROR]', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
})();
