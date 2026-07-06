const { Strapi } = require('@strapi/strapi');

async function initChannelAdmin() {
  console.log('[init-channel-admin] 正在初始化渠道管理员...');

  const strapi = await Strapi().load();

  try {
    let rootChannel = await strapi.db.query('plugin::zhao-channel.channel').findOne({
      where: { channelTier: 'root' },
    });

    if (!rootChannel) {
      console.log('[init-channel-admin] 创建根渠道...');
      const channelService = strapi.plugin('zhao-channel').service('channel');
      rootChannel = await channelService.createRoot({
        name: '平台根渠道',
        description: '系统自动创建的根渠道，所有渠道的顶级父渠道',
      });
      console.log(`[init-channel-admin] 根渠道创建成功 (ID: ${rootChannel.id}, Code: ${rootChannel.code})`);
    } else {
      console.log(`[init-channel-admin] 根渠道已存在 (ID: ${rootChannel.id})`);
    }

    let adminUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { role: { type: 'admin' } },
    });

    if (!adminUser) {
      console.log('[init-channel-admin] 创建渠道管理员用户...');
      const passwordHash = await strapi.service('plugin::users-permissions.auth').hashPassword('a123456');
      adminUser = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          username: 'channel-admin',
          email: 'admin@example.com',
          password: passwordHash,
          provider: 'local',
          confirmed: true,
          blocked: false,
        },
      });
      console.log(`[init-channel-admin] 用户创建成功 (ID: ${adminUser.id}, Username: ${adminUser.username})`);
    } else {
      console.log(`[init-channel-admin] 用户已存在 (ID: ${adminUser.id}, Username: ${adminUser.username})`);
    }

    let existingMember = await strapi.db.query('plugin::zhao-channel.channel-member').findOne({
      where: { user: adminUser.id, channel: rootChannel.id },
    });

    if (!existingMember) {
      console.log('[init-channel-admin] 创建渠道成员关联...');
      await strapi.db.query('plugin::zhao-channel.channel-member').create({
        data: {
          channel: rootChannel.id,
          user: adminUser.id,
          role: 'owner',
          isCurrent: true,
        },
      });
      console.log(`[init-channel-admin] 渠道成员关联创建成功 (User: ${adminUser.id}, Channel: ${rootChannel.id}, Role: owner)`);
    } else {
      console.log('[init-channel-admin] 渠道成员关联已存在');
    }

    let existingUserChannel = await strapi.db.query('plugin::zhao-channel.user-channel').findOne({
      where: { user: adminUser.id, channel: rootChannel.id },
    });

    if (!existingUserChannel) {
      console.log('[init-channel-admin] 创建用户渠道权限...');
      await strapi.db.query('plugin::zhao-channel.user-channel').create({
        data: {
          user: adminUser.id,
          channel: rootChannel.id,
          grantedBy: 'system',
        },
      });
      console.log(`[init-channel-admin] 用户渠道权限创建成功 (User: ${adminUser.id}, Channel: ${rootChannel.id})`);
    } else {
      console.log('[init-channel-admin] 用户渠道权限已存在');
    }

    let adminRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'admin' },
    });

    if (adminRole) {
      let existingRoleChannel = await strapi.db.query('plugin::zhao-channel.role-channel').findOne({
        where: { role: adminRole.id, channel: rootChannel.id },
      });

      if (!existingRoleChannel) {
        console.log('[init-channel-admin] 创建角色渠道关联...');
        await strapi.db.query('plugin::zhao-channel.role-channel').create({
          data: {
            role: adminRole.id,
            channel: rootChannel.id,
            grantedBy: 'system',
          },
        });
        console.log(`[init-channel-admin] 角色渠道关联创建成功 (Role: ${adminRole.id}, Channel: ${rootChannel.id})`);
      } else {
        console.log('[init-channel-admin] 角色渠道关联已存在');
      }
    }

    let existingInvite = await strapi.db.query('plugin::zhao-channel.user-invite').findOne({
      where: { user: adminUser.id },
    });

    if (!existingInvite) {
      console.log('[init-channel-admin] 创建用户邀请码...');
      const userInviteService = strapi.plugin('zhao-channel').service('user-invite');
      await userInviteService.createForUser(adminUser.id);
      console.log(`[init-channel-admin] 用户邀请码创建成功 (User: ${adminUser.id})`);
    } else {
      console.log('[init-channel-admin] 用户邀请码已存在');
    }

    console.log('');
    console.log('========================================');
    console.log('渠道管理员初始化完成！');
    console.log('========================================');
    console.log(`用户名: ${adminUser.username}`);
    console.log(`邮箱: ${adminUser.email}`);
    console.log(`默认密码: a123456 (首次登录请修改)`);
    console.log(`渠道ID: ${rootChannel.id}`);
    console.log(`渠道名称: ${rootChannel.name}`);
    console.log('========================================');

  } catch (error) {
    console.error('[init-channel-admin] 初始化失败:', error.message);
    process.exit(1);
  } finally {
    await strapi.destroy();
  }
}

initChannelAdmin();