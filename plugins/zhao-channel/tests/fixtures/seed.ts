import type { Core } from "@strapi/strapi";

export interface TestFixtures {
  channels: any[];
  users: any[];
  channelMembers: any[];
  userInvites: any[];
  userChannels: any[];
  roleChannels: any[];
}

export async function seedTestData(strapi: Core.Strapi): Promise<TestFixtures> {
  const { db } = strapi;

  const tables = [
    "plugin::zhao-channel.role-channel",
    "plugin::zhao-channel.user-channel",
    "plugin::zhao-channel.channel-member",
    "plugin::zhao-channel.user-invite",
    "plugin::zhao-channel.channel",
  ];
  for (const table of tables) {
    await db.query(table).deleteMany();
  }
  await db.query("plugin::users-permissions.user").deleteMany({
    where: { email: { $endsWith: "@channel-test.com" } },
  });

  const ch1 = await db.query("plugin::zhao-channel.channel").create({
    data: {
      name: "总代",
      code: "AGENT001",
      slug: "agent-main",
      channelTier: "root",
      status: true,
      description: "全国总代理渠道",
      path: "/0/",
      depth: 0,
    },
  });
  await db.query("plugin::zhao-channel.channel").update({
    where: { id: ch1.id },
    data: { path: `/${ch1.id}/` },
  });
  ch1.path = `/${ch1.id}/`;

  const ch2 = await db.query("plugin::zhao-channel.channel").create({
    data: {
      name: "区域代理",
      code: "REG001",
      slug: "regional-beijing",
      channelTier: "regional",
      status: true,
      description: "北京区域代理",
      parentChannel: ch1.id,
      path: `/${ch1.id}/0/`,
      depth: 1,
    },
  });
  await db.query("plugin::zhao-channel.channel").update({
    where: { id: ch2.id },
    data: { path: `/${ch1.id}/${ch2.id}/` },
  });
  ch2.path = `/${ch1.id}/${ch2.id}/`;

  const ch3 = await db.query("plugin::zhao-channel.channel").create({
    data: {
      name: "门店A",
      code: "STORE001",
      slug: "store-a",
      channelTier: "store",
      status: true,
      description: "A号门店",
      parentChannel: ch2.id,
      path: `/${ch1.id}/${ch2.id}/0/`,
      depth: 2,
    },
  });
  await db.query("plugin::zhao-channel.channel").update({
    where: { id: ch3.id },
    data: { path: `/${ch1.id}/${ch2.id}/${ch3.id}/` },
  });
  ch3.path = `/${ch1.id}/${ch2.id}/${ch3.id}/`;

  const ch4 = await db.query("plugin::zhao-channel.channel").create({
    data: {
      name: "禁用渠道",
      code: "DISABLED001",
      slug: "disabled-chan",
      channelTier: "agent",
      status: false,
      description: "已被禁用的渠道",
      path: "/0/",
      depth: 0,
    },
  });
  await db.query("plugin::zhao-channel.channel").update({
    where: { id: ch4.id },
    data: { path: `/${ch4.id}/` },
  });
  ch4.path = `/${ch4.id}/`;

  const ch5 = await db.query("plugin::zhao-channel.channel").create({
    data: {
      name: "独立门店",
      code: "STANDALONE001",
      slug: "standalone",
      channelTier: "store",
      status: true,
      description: "独立的门店渠道",
      path: "/0/",
      depth: 0,
    },
  });
  await db.query("plugin::zhao-channel.channel").update({
    where: { id: ch5.id },
    data: { path: `/${ch5.id}/` },
  });
  ch5.path = `/${ch5.id}/`;

  const channels = [ch1, ch2, ch3, ch4, ch5];

  const users = [];
  const TEST_EMAILS = [
    "testuser1@channel-test.com",
    "testuser2@channel-test.com",
    "testuser3@channel-test.com",
    "testuser4@channel-test.com",
    "testuser5@channel-test.com",
    "testuser6@channel-test.com",
    "testuser7@channel-test.com",
    "testuser8@channel-test.com",
  ];
  for (let i = 1; i <= 8; i++) {
    const user = await db.query("plugin::users-permissions.user").create({
      data: {
        username: `testuser${i}`,
        email: TEST_EMAILS[i - 1],
        password: "$2a$10$testpasswordhashplaceholder123456",
        provider: "local",
        confirmed: true,
        blocked: false,
      },
    });
    users.push(user);
  }

  const cm1 = await db.query("plugin::zhao-channel.channel-member").create({
    data: {
      channel: ch1.id,
      user: users[0].id,
      role: "owner",
      isCurrent: true,
    },
  });

  const cm2 = await db.query("plugin::zhao-channel.channel-member").create({
    data: {
      channel: ch2.id,
      user: users[1].id,
      role: "admin",
      isCurrent: true,
    },
  });

  const channelMembers = [cm1, cm2];

  const invite1 = await db.query("plugin::zhao-channel.user-invite").create({
    data: {
      user: users[0].id,
      inviteCode: "INVITE001",
      inviteMethod: "organic",
      distributionPath: ch1.path,
      invitedBy: null,
      inviteChannel: ch1.id,
      inviteDepth: 0,
    },
  });

  const invite2 = await db.query("plugin::zhao-channel.user-invite").create({
    data: {
      user: users[1].id,
      inviteCode: "INVITE002",
      inviteMethod: "invite_code",
      distributionPath: ch2.path,
      invitedBy: users[0].id,
      inviteChannel: ch2.id,
      inviteDepth: 1,
    },
  });

  const userInvites = [invite1, invite2];

  let uc0: any, uc0b: any, uc1: any, uc2: any;
  uc0 = await db.query("plugin::zhao-channel.user-channel").create({
    data: {
      user: users[0].id,
      channel: ch1.id,
      grantedBy: users[0].id,
    },
  });

  uc0b = await db.query("plugin::zhao-channel.user-channel").create({
    data: {
      user: users[1].id,
      channel: ch2.id,
      grantedBy: users[0].id,
    },
  });

  uc1 = await db.query("plugin::zhao-channel.user-channel").create({
    data: {
      user: users[2].id,
      channel: ch1.id,
      grantedBy: users[0].id,
    },
  });

  uc2 = await db.query("plugin::zhao-channel.user-channel").create({
    data: {
      user: users[3].id,
      channel: ch1.id,
      grantedBy: users[0].id,
    },
  });

  const userChannels = [uc0, uc0b, uc1, uc2];

  return {
    channels: channels.map((c: any) => ({ ...c, id: c.id })),
    users: users.map((u: any) => ({ ...u, id: u.id })),
    channelMembers,
    userInvites,
    userChannels,
    roleChannels: [],
  };
}

export async function cleanupTestData(strapi: Core.Strapi): Promise<void> {
  const { db } = strapi;
  const tables = [
    "plugin::zhao-channel.role-channel",
    "plugin::zhao-channel.user-channel",
    "plugin::zhao-channel.channel-member",
    "plugin::zhao-channel.user-invite",
    "plugin::zhao-channel.channel",
  ];
  for (const table of tables) {
    await db.query(table).deleteMany();
  }
  await db.query("plugin::users-permissions.user").deleteMany({
    where: { email: { $endsWith: "@channel-test.com" } },
  });
}
