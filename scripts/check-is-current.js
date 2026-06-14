/**
 * 检查用户渠道成员的 isCurrent 字段
 */
const { Client } = require('pg');

async function checkIsCurrent() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi',
    user: 'postgres',
    password: 'admin',
  });

  try {
    await client.connect();

    const userId = 2;

    console.log('=== 检查 channel_member isCurrent ===\n');

    // 1. zhao_channel_members 表结构
    console.log('zhao_channel_members 表字段:');
    const cmStruct = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'zhao_channel_members'
      ORDER BY ordinal_position
    `);
    cmStruct.rows.forEach(r => console.log(`  ${r.column_name}`));

    // 2. 用户 shao 的 channel_member 记录
    console.log('\n用户 shao 的 channel_member 记录:');
    const cmData = await client.query(`
      SELECT cm.id, cm.is_current, cm.role
      FROM zhao_channel_members cm
      JOIN zhao_channel_members_user_lnk cmul ON cm.id = cmul.channel_member_id
      WHERE cmul.user_id = $1
    `, [userId]);
    console.log(JSON.stringify(cmData.rows, null, 2));

    // 3. 检查 getUserAllChannels 逻辑
    console.log('\n=== getUserAllChannels 逻辑分析 ===');
    
    // 用户 zhaoRoles
    const userRoles = await client.query(`
      SELECT id, zhao_roles FROM up_users WHERE id = $1
    `, [userId]);
    const zhaoRoles = userRoles.rows[0]?.zhao_roles;
    console.log(`用户 zhaoRoles: ${JSON.stringify(zhaoRoles)}`);

    // 用户 role (up_users_role_lnk)
    const upRole = await client.query(`
      SELECT r.type
      FROM up_users_role_lnk url
      JOIN up_roles r ON url.role_id = r.id
      WHERE url.user_id = $1
    `, [userId]);
    console.log(`用户 up_roles.type: ${upRole.rows[0]?.type || '无'}`);

    // channel_member isCurrent
    const isCurrent = cmData.rows[0]?.is_current;
    console.log(`channel_member isCurrent: ${isCurrent}`);

    // 4. 根据 getUserAllChannels 逻辑计算返回的渠道
    console.log('\n=== getUserAllChannels 预期返回的渠道 ===');
    const allChannelIds = new Set();

    // 步骤1: zhao_user_channels - 无数据
    
    // 步骤2: 角色渠道
    let roleNames = [];
    if (Array.isArray(zhaoRoles) && zhaoRoles.length > 0) {
      roleNames = zhaoRoles;
    } else if (upRole.rows[0]?.type) {
      roleNames = [upRole.rows[0].type];
    }
    console.log(`使用的角色: ${JSON.stringify(roleNames)}`);

    if (roleNames.includes('admin')) {
      console.log('用户是 admin，返回所有渠道');
    } else {
      for (const role of roleNames) {
        const roleChannels = await client.query(`
          SELECT channel_id FROM zhao_role_channels_channel_lnk rccl
          JOIN zhao_role_channels rc ON rccl.role_channel_id = rc.id
          WHERE rc.role = $1
        `, [role]);
        roleChannels.rows.forEach(r => allChannelIds.add(r.channel_id));
      }
      console.log(`角色渠道: [${[...allChannelIds].join(', ')}]`);
    }

    // 步骤3: channel_member (isCurrent: true)
    if (isCurrent === true) {
      const channels = await client.query(`
        SELECT channel_id FROM zhao_channel_members_channel_lnk
        WHERE channel_member_id = $1
      `, [cmData.rows[0]?.id]);
      channels.rows.forEach(r => allChannelIds.add(r.channel_id));
      console.log(`channel_member (isCurrent=true) 渠道: [${channels.rows.map(r => r.channel_id).join(', ')}]`);
    } else {
      console.log(`channel_member isCurrent=${isCurrent}，不添加渠道`);
    }

    console.log(`\n最终渠道 IDs: [${[...allChannelIds].join(', ')}]`);

    // 5. 课程匹配检查
    console.log('\n=== 课程匹配检查 ===');
    const course = await client.query(`
      SELECT channel_ids FROM zhao_courses WHERE document_id = 'laudaldvq00tsrx3turx9f1d'
    `);
    const courseChannelIds = course.rows[0]?.channel_ids || [];
    console.log(`课程 channel_ids: [${courseChannelIds.join(', ')}]`);
    
    const hasMatch = [...allChannelIds].some(uid => 
      courseChannelIds.some(cid => String(uid) === String(cid))
    );
    console.log(`匹配结果: ${hasMatch ? '✓ 有匹配' : '✗ 无匹配'}`);

    if (!hasMatch && isCurrent !== true) {
      console.log('\n⚠️ 问题: channel_member.isCurrent 不是 true，导致 getUserAllChannels 不返回渠道59');
    }

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

checkIsCurrent();