/**
 * 检查用户渠道数据
 */
const { Client } = require('pg');

async function checkUserChannelData() {
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

    console.log('=== 用户 shao 渠道数据检查 ===\n');

    // 1. zhao_user_channels_user_lnk（用户直接授权）
    console.log('1. zhao_user_channels_user_lnk（用户直接授权）:');
    const uculData = await client.query(`
      SELECT * FROM zhao_user_channels_user_lnk WHERE user_id = $1
    `, [userId]);
    if (uculData.rows.length === 0) {
      console.log('   无直接授权');
    } else {
      console.log(JSON.stringify(uculData.rows, null, 2));
    }

    // 2. 用户 zhaoRoles
    console.log('\n2. 用户 zhaoRoles:');
    const userRoles = await client.query(`
      SELECT id, zhao_roles FROM up_users WHERE id = $1
    `, [userId]);
    const zhaoRoles = userRoles.rows[0]?.zhao_roles;
    console.log(`   zhaoRoles: ${JSON.stringify(zhaoRoles)}`);

    // 3. zhao_role_channels（角色授权）
    console.log('\n3. zhao_role_channels（角色授权）:');
    if (Array.isArray(zhaoRoles) && zhaoRoles.length > 0) {
      for (const role of zhaoRoles) {
        const rclData = await client.query(`
          SELECT * FROM zhao_role_channels_channel_lnk rccl
          JOIN zhao_role_channels rc ON rccl.role_channel_id = rc.id
          WHERE rc.role = $1
        `, [role]);
        console.log(`   角色 ${role}:`);
        if (rclData.rows.length === 0) {
          console.log('     无渠道授权');
        } else {
          rclData.rows.forEach(r => console.log(`     role_channel_id: ${r.role_channel_id}, channel_id: ${r.zhao_channel_id}`));
        }
      }
    } else {
      console.log('   用户无 zhaoRoles');
    }

    // 4. zhao_channel_members_user_lnk（渠道成员）
    console.log('\n4. zhao_channel_members_user_lnk（渠道成员）:');
    const cmulData = await client.query(`
      SELECT cmul.channel_member_id, cm.is_current, cmcl.zhao_channel_id, c.name
      FROM zhao_channel_members_user_lnk cmul
      JOIN zhao_channel_members cm ON cmul.channel_member_id = cm.id
      JOIN zhao_channel_members_channel_lnk cmcl ON cm.id = cmcl.channel_member_id
      JOIN zhao_channels c ON cmcl.zhao_channel_id = c.id
      WHERE cmul.user_id = $1
    `, [userId]);
    cmulData.rows.forEach(r => {
      console.log(`   渠道ID: ${r.zhao_channel_id}, 名称: ${r.name}, isCurrent: ${r.is_current}`);
    });

    // 5. 汇总 getUserAllChannels 返回的渠道
    console.log('\n5. getUserAllChannels 预期返回:');
    const allChannelIds = new Set();
    
    // 用户直接授权（zhao_user_channels_user_lnk -> zhao_user_channels_channel_lnk）
    if (uculData.rows.length > 0) {
      for (const row of uculData.rows) {
        const ucclData = await client.query(`
          SELECT zhao_channel_id FROM zhao_user_channels_channel_lnk WHERE user_channel_id = $1
        `, [row.user_channel_id]);
        ucclData.rows.forEach(r => allChannelIds.add(r.zhao_channel_id));
      }
    }
    
    // 角色授权
    if (Array.isArray(zhaoRoles)) {
      for (const role of zhaoRoles) {
        const rclData = await client.query(`
          SELECT zhao_channel_id FROM zhao_role_channels_channel_lnk rccl
          JOIN zhao_role_channels rc ON rccl.role_channel_id = rc.id
          WHERE rc.role = $1
        `, [role]);
        rclData.rows.forEach(r => allChannelIds.add(r.zhao_channel_id));
      }
    }
    
    // 当前渠道（isCurrent: true）
    cmulData.rows.filter(r => r.is_current).forEach(r => allChannelIds.add(r.zhao_channel_id));
    
    // 所有渠道成员关联的渠道
    cmulData.rows.forEach(r => allChannelIds.add(r.zhao_channel_id));
    
    console.log(`   渠道 IDs: [${[...allChannelIds].join(', ')}]`);

    // 6. 课程渠道匹配检查
    console.log('\n6. 课程渠道匹配:');
    const course = await client.query(`
      SELECT channel_ids FROM zhao_courses WHERE document_id = 'laudaldvq00tsrx3turx9f1d'
    `);
    const courseChannelIds = course.rows[0]?.channel_ids || [];
    console.log(`   课程 channel_ids: [${courseChannelIds.join(', ')}]`);
    
    const hasMatch = [...allChannelIds].some(uid => 
      courseChannelIds.some(cid => String(uid) === String(cid))
    );
    console.log(`   匹配结果: ${hasMatch ? '✓ 有匹配（应该能看到课程）' : '✗ 无匹配（看不到课程）'}`);

  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await client.end();
  }
}

checkUserChannelData();