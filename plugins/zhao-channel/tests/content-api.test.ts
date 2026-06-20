import http from "http";
import { setupStrapi, teardownStrapi, getStrapi } from "./helpers/strapi-setup";
import { seedTestData, cleanupTestData, TestFixtures } from "./fixtures/seed";
import supertest from "supertest";

let fixtures: TestFixtures;
let request: supertest.SuperTest<supertest.Test>;
let ownerToken: string;
let adminToken: string;
let userToken: string;

const API = "/api/zhao-channel";

async function signToken(userId: number): Promise<string> {
  const strapi = getStrapi();
  const jwtService = strapi.plugin("zhao-auth").service("jwt");
  return jwtService.sign({ id: userId });
}

beforeAll(async () => {
  await setupStrapi();
  fixtures = await seedTestData(getStrapi());
  const strapi = getStrapi();
  const server = (strapi as any).server;
  request = supertest(http.createServer(server.app.callback()));

  ownerToken = await signToken(fixtures.users[0].id);
  adminToken = await signToken(fixtures.users[1].id);
  userToken = await signToken(fixtures.users[2].id);
});

afterAll(async () => {
  await cleanupTestData(getStrapi());
  await teardownStrapi();
});

describe("Content API — 公开层端点", () => {
  test("GET /v1/channel/public/:id — 获取公开信息", async () => {
    const res = await request.get(
      `${API}/v1/channel/public/${fixtures.channels[0].id}`
    );
    expect(res.status).toBe(200);
  });

  test("POST /v1/channel/validate/public — 验证邀请码", async () => {
    const res = await request
      .post(`${API}/v1/channel/validate/public`)
      .send({ code: fixtures.channels[0].code })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  test("POST /v1/channel/register/public — 公开注册", async () => {
    const unique = Date.now();
    const res = await request
      .post(`${API}/v1/channel/register/public`)
      .send({
        code: fixtures.channels[0].code,
        name: "公开注册测试",
        channelTier: "agent",
        email: `public-${unique}@test.com`,
        username: `pubtest${unique}`,
        password: "Test123456",
      })
      .set("Content-Type", "application/json");
    expect([200, 201, 400]).toContain(res.status);
  });
});

describe("Content API — 用户层端点", () => {
  test("GET /v1/my/channels — 应返回渠道列表", async () => {
    const res = await request
      .get(`${API}/v1/my/channels`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  test("POST /v1/my/channel/register — 通过邀请码注册", async () => {
    const res = await request
      .post(`${API}/v1/my/channel/register`)
      .send({
        code: fixtures.channels[0].code,
        name: "API注册代理",
        channelTier: "agent",
      })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${userToken}`);
    expect([200, 201]).toContain(res.status);
  });

  test("POST /v1/my/channel/validate — 验证邀请码", async () => {
    const res = await request
      .post(`${API}/v1/my/channel/validate`)
      .send({ code: fixtures.channels[0].code })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /v1/my/channels/accessible — 用户可访问渠道", async () => {
    const res = await request
      .get(`${API}/v1/my/channels/accessible`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /v1/my/invite/chain — 获取分销链", async () => {
    const res = await request
      .get(`${API}/v1/my/invite/chain`)
      .query({ userId: fixtures.users[1].id })
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /v1/my/invite/downstream — 获取下级", async () => {
    const res = await request
      .get(`${API}/v1/my/invite/downstream`)
      .query({ userId: fixtures.users[0].id })
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /v1/my/invite/stats — 获取分销统计", async () => {
    const res = await request
      .get(`${API}/v1/my/invite/stats`)
      .query({ userId: fixtures.users[0].id })
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });
});

describe("Content API — 渠道成员层端点", () => {
  test("GET /v1/channel/:id — 应返回渠道详情", async () => {
    const res = await request
      .get(`${API}/v1/channel/${fixtures.channels[0].id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /v1/channel/:id/network — 获取渠道网络", async () => {
    const res = await request
      .get(`${API}/v1/channel/${fixtures.channels[0].id}/network`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /v1/channel/:id/stats — 获取渠道统计", async () => {
    const res = await request
      .get(`${API}/v1/channel/${fixtures.channels[0].id}/stats`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /v1/channel-members — 获取成员列表", async () => {
    const res = await request
      .get(`${API}/v1/channel-members`)
      .query({ channel: fixtures.channels[0].id })
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });
});

describe("Content API — 渠道管理员层端点", () => {
  test("POST /v1/admin/channel — 应创建新渠道", async () => {
    const res = await request
      .post(`${API}/v1/admin/channel`)
      .send({
        name: "API测试渠道",
        channelTier: "agent",
        parentChannel: fixtures.channels[0].id,
      })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect([200, 201, 400]).toContain(res.status);
  });

  test("PUT /v1/admin/channel/:id — 应更新渠道", async () => {
    const res = await request
      .put(`${API}/v1/admin/channel/${fixtures.channels[0].id}`)
      .send({ name: "API更新名" })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  test("POST /v1/admin/channel-members — 邀请成员", async () => {
    const res = await request
      .post(`${API}/v1/admin/channel-members`)
      .send({
        channelId: fixtures.channels[0].id,
        inviterId: fixtures.users[0].id,
        email: fixtures.users[6].email,
        role: "member",
      })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect([200, 201]).toContain(res.status);
  });

  test("POST /v1/admin/permissions/batch-grant — 批量授权", async () => {
    const res = await request
      .post(`${API}/v1/admin/permissions/batch-grant`)
      .send({
        type: "user",
        targetId: fixtures.users[2].id,
        channelIds: [fixtures.channels[0].id],
        grantedBy: fixtures.users[0].id,
      })
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect([200, 201]).toContain(res.status);
  });
});

describe("Content API — 渠道所有者层端点", () => {
  test("DELETE /v1/admin/channel/:id — 应删除渠道", async () => {
    const strapi = getStrapi();
    const ch = await strapi.db.query("plugin::zhao-channel.channel").create({
      data: {
        name: "待删除渠道",
        code: "DEL-" + Date.now(),
        channelTier: "agent",
        path: `/${fixtures.channels[0].id}/`,
        depth: 1,
        status: "active",
      },
    });
    await strapi.db.query("plugin::zhao-channel.channel-member").create({
      data: {
        user: fixtures.users[0].id,
        channel: ch.id,
        role: "owner",
        isCurrent: false,
      },
    });
    const res = await request
      .delete(`${API}/v1/admin/channel/${ch.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });
});

describe("Content API — 错误处理", () => {
  test("不存在的路由应返回 404", async () => {
    const res = await request.get(`${API}/v1/nonexistent-route`);
    expect(res.status).toBe(404);
  });

  test("旧路径应返回 404", async () => {
    const res = await request.get(`${API}/channel`);
    expect(res.status).toBe(404);
  });
});
