/**
 * 检查数据库中各角色的权限配置
 */
const { Client } = require('pg');

async function checkPermissions() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    // 查询所有角色权限
    const result = await client.query(`
      SELECT role, display_name, is_system,
             (SELECT jsonb_array_length(permissions)) as perm_count,
             permissions
      FROM zhao_permissions
      ORDER BY role
    `);

    console.log('=== 数据库中的角色权限 ===\n');

    for (const row of result.rows) {
      console.log(`角色: ${row.role}`);
      console.log(`显示名: ${row.display_name}`);
      console.log(`权限数量: ${row.perm_count}`);
      console.log(`是否系统角色: ${row.is_system}`);

      const perms = row.permissions || [];
      const hasTagCenter = perms.includes('menu.tag-center');
      console.log(`包含 menu.tag-center: ${hasTagCenter}`);

      // 检查是否包含标签相关权限
      const tagPerms = perms.filter(p => p.includes('tag') || p.includes('knowledge'));
      console.log(`标签相关权限: ${JSON.stringify(tagPerms)}`);

      console.log('---');
    }

    // 检查 admin 角色的完整权限列表
    const adminResult = await client.query(`
      SELECT permissions
      FROM zhao_permissions
      WHERE role = 'admin'
    `);

    if (adminResult.rows.length > 0) {
      console.log('\n=== Admin 角色权限列表 ===');
      const adminPerms = adminResult.rows[0].permissions || [];
      console.log(`总数: ${adminPerms.length}`);

      // 检查关键权限
      const keyPerms = [
        'menu.tag-center',
        'menu.tag',
        'menu.knowledge',
        'menu.tag-group',
        'menu.system-center',
        'menu.point-center',
        'menu.course-center'
      ];

      for (const key of keyPerms) {
        console.log(`${key}: ${adminPerms.includes(key) ? '✓' : '✗'}`);
      }
    }

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await client.end();
  }
}

checkPermissions();
