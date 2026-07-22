#!/usr/bin/env node
const path = require('path');

async function main() {
  const Strapi = require('@strapi/strapi');
  const strapi = await Strapi().load();

  try {
    const today = new Date().toISOString().slice(0, 10);
    const backupTable = `users_zhao_roles_backup_${today.replace(/-/g, '')}`;

    console.log(`[migrate] 开始迁移 zhao_roles 字段格式...`);
    console.log(`[migrate] 1. 创建备份表 ${backupTable}`);

    const knex = strapi.db.connection;
    const dbType = strapi.db.config.connection.client;

    if (dbType === 'postgres') {
      await knex.raw(`CREATE TABLE ${backupTable} AS SELECT id, zhao_roles FROM users`);
    } else if (dbType === 'mysql') {
      await knex.raw(`CREATE TABLE ${backupTable} AS SELECT id, zhao_roles FROM users`);
    } else {
      throw new Error(`不支持的数据库类型: ${dbType}`);
    }
    console.log(`[migrate] 备份完成: ${backupTable}`);

    const users = await knex('users').select('id', 'zhao_roles');
    console.log(`[migrate] 2. 共 ${users.length} 个用户待检查`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const raw = user.zhao_roles;

      if (raw == null) { skippedCount++; continue; }

      let arr;
      if (typeof raw === 'string') {
        try { arr = JSON.parse(raw); } catch { skippedCount++; continue; }
      } else {
        arr = raw;
      }

      if (!Array.isArray(arr) || arr.length === 0) { skippedCount++; continue; }

      if (typeof arr[0] === 'object' && arr[0] !== null) {
        skippedCount++;
        continue;
      }

      const newArr = arr.map(roleName => ({
        role: roleName,
        assignedByRole: 'system',
        assignedAt: null,
      }));

      await knex('users')
        .where({ id: user.id })
        .update({ zhao_roles: JSON.stringify(newArr) });

      migratedCount++;
    }

    console.log(`[migrate] 3. 迁移完成`);
    console.log(`[migrate]    - 已迁移: ${migratedCount} 个用户`);
    console.log(`[migrate]    - 已跳过（空/已是新格式）: ${skippedCount} 个用户`);
    console.log(`[migrate] 回滚命令:`);
    console.log(`[migrate]   UPDATE users SET zhao_roles = (SELECT zhao_roles FROM ${backupTable} WHERE users.id = ${backupTable}.id);`);
  } catch (err) {
    console.error('[migrate] 迁移失败:', err);
    process.exitCode = 1;
  } finally {
    await strapi.destroy();
  }
}

main();