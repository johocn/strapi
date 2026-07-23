/**
 * tenant.service 单元测试
 *
 * 测试策略：
 * - 使用内联 createMockStrapi()，与 auth-service.test.ts 风格一致
 * - mock zhao-channel.channel-permission.getUserAllChannels
 * - mock strapi.db.connection(knex 链) 与 strapi.db.query
 * - 验证 admin / 非 admin 两个分支返回字段完整性
 */
import type { Core } from "@strapi/strapi";
import tenantServiceFactory from "../../server/src/services/tenant.service";

const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

// ========== Mock 工具 ==========
function createMockStrapi(opts: {
  sites?: any[];
  links?: any[];
  channelIds?: number[];
}): Core.Strapi {
  const { sites = [], links = [], channelIds = [] } = opts;

  const channelPermissionService = {
    getUserAllChannels: jest.fn().mockResolvedValue(channelIds),
  };

  const queryFindMany = jest.fn().mockResolvedValue(sites);

  const connectionBuilder = (table: string) => {
    if (table !== "zhao_channels_sites_lnk") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      whereIn: (_col: string, _vals: any[]) => ({
        select: (_cols: string | string[]) => Promise.resolve(links),
      }),
    };
  };

  const mockStrapi = {
    plugin: (name: string) => {
      if (name === "zhao-channel") {
        return {
          service: (svc: string) => {
            if (svc === "channel-permission") return channelPermissionService;
            throw new Error(`Unknown service: ${svc}`);
          },
        };
      }
      throw new Error(`Unknown plugin: ${name}`);
    },
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    db: {
      query: jest.fn((uid: string) => {
        if (uid !== SITE_CONFIG_UID) {
          throw new Error(`Unexpected uid: ${uid}`);
        }
        return { findMany: queryFindMany };
      }),
      connection: jest.fn(connectionBuilder),
    },
  } as unknown as Core.Strapi;

  return mockStrapi;
}

// ========== 套件 ==========
describe("tenant.service.getMyTenants", () => {
  // ── admin 分支 ──
  describe("admin 分支", () => {
    it("返回全部租户并包含完整字段 siteName/featureFlags/updatedAt/channelsCount/templateName", async () => {
      const sites = [
        {
          id: 1,
          documentId: "doc-1",
          siteName: "站点 A",
          domain: "a.example.com",
          featureFlags: { moduleX: true },
          updatedAt: "2025-01-01T00:00:00.000Z",
          channels: [{ id: 10 }, { id: 11 }],
          template: { name: "tpl-default" },
        },
      ];
      const strapi = createMockStrapi({ sites });
      const svc = tenantServiceFactory({ strapi });

      const result = await svc.getMyTenants(1, ["admin"]);

      expect(result).toHaveLength(1);
      const tenant = result[0];
      expect(tenant.id).toBe(1);
      expect(tenant.documentId).toBe("doc-1");
      expect(tenant.siteName).toBe("站点 A");
      expect(tenant.domain).toBe("a.example.com");
      expect(tenant.featureFlags).toEqual({ moduleX: true });
      expect(tenant.updatedAt).toBe("2025-01-01T00:00:00.000Z");
      expect(tenant.channelsCount).toBe(2);
      expect(tenant.templateName).toBe("tpl-default");
    });
  });

  // ── 非 admin 分支 ──
  describe("非 admin 分支", () => {
    it("按 channelIds 过滤并返回完整字段", async () => {
      const sites = [
        {
          id: 5,
          documentId: "doc-5",
          siteName: "站点 B",
          domain: "b.example.com",
          featureFlags: { moduleY: false },
          updatedAt: "2025-02-02T00:00:00.000Z",
          channels: [{ id: 20 }],
          template: { name: "tpl-custom" },
        },
      ];
      const strapi = createMockStrapi({
        sites,
        links: [{ site_config_id: 5 }],
        channelIds: [100, 200],
      });
      const svc = tenantServiceFactory({ strapi });

      const result = await svc.getMyTenants(2, ["editor"]);

      // 校验 channel-permission 被调用
      const channelSvc = strapi
        .plugin("zhao-channel")
        .service("channel-permission");
      expect(channelSvc.getUserAllChannels).toHaveBeenCalledWith(2);

      // 校验 connection 链被调用
      expect(strapi.db.connection).toHaveBeenCalledWith(
        "zhao_channels_sites_lnk"
      );

      // 校验 query.findMany 被以 where: { id: { $in: [5] } } 调用
      const findMany = (strapi.db.query as jest.Mock)(SITE_CONFIG_UID)
        .findMany;
      expect(findMany).toHaveBeenCalled();
      const callArg = findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({ id: { $in: [5] } });

      // 校验返回字段
      expect(result).toHaveLength(1);
      const tenant = result[0];
      expect(tenant.id).toBe(5);
      expect(tenant.documentId).toBe("doc-5");
      expect(tenant.siteName).toBe("站点 B");
      expect(tenant.domain).toBe("b.example.com");
      expect(tenant.featureFlags).toEqual({ moduleY: false });
      expect(tenant.updatedAt).toBe("2025-02-02T00:00:00.000Z");
      expect(tenant.channelsCount).toBe(1);
      expect(tenant.templateName).toBe("tpl-custom");
    });

    it("featureFlags 为空时降级为 {}", async () => {
      const sites = [
        {
          id: 7,
          documentId: "doc-7",
          siteName: "站点 C",
          domain: "c.example.com",
          // featureFlags 缺失
          updatedAt: "2025-03-03T00:00:00.000Z",
          channels: [],
          template: null,
        },
      ];
      const strapi = createMockStrapi({
        sites,
        links: [{ site_config_id: 7 }],
        channelIds: [300],
      });
      const svc = tenantServiceFactory({ strapi });

      const result = await svc.getMyTenants(3, ["viewer"]);

      expect(result).toHaveLength(1);
      const tenant = result[0];
      expect(tenant.featureFlags).toEqual({});
      expect(tenant.channelsCount).toBe(0);
      expect(tenant.templateName).toBeNull();
    });
  });
});
