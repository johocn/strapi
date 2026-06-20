import os

base = r'e:\code\plugins\zhao-third\server\src'

# ============================================================
# 8. controllers/third-party-auth.ts
# ============================================================
controller_code = r'''export default ({ strapi }: { strapi: any }) => ({
  async getAuthUrl(ctx: any) {
    try {
      const { platform } = ctx.params;
      const { appType, redirectUri, state } = ctx.request.body;

      if (!appType || !redirectUri) {
        return ctx.badRequest("Missing required fields: appType, redirectUri");
      }

      const url = await strapi
        .plugin("zhao-third")
        .service("third-party-auth")
        .getAuthUrl(platform, appType, redirectUri, state);

      ctx.body = { url };
    } catch (err: any) {
      strapi.log.error("[zhao-third] getAuthUrl error:", err);
      ctx.throw(500, { code: err.code || "UNKNOWN", message: err.message });
    }
  },

  async callback(ctx: any) {
    try {
      const { platform } = ctx.params;
      const { appType, code, inviteCode, encryptedData, iv } = ctx.request.body;

      if (!appType || !code) {
        return ctx.badRequest("Missing required fields: appType, code");
      }

      const result = await strapi
        .plugin("zhao-third")
        .service("third-party-auth")
        .handleCallback(platform, appType, code, inviteCode, encryptedData, iv);

      ctx.body = result;
    } catch (err: any) {
      strapi.log.error("[zhao-third] callback error:", err);
      ctx.throw(500, { code: err.code || "UNKNOWN", message: err.message });
    }
  },

  async bind(ctx: any) {
    try {
      const { platform } = ctx.params;
      const { appType, code } = ctx.request.body;
      const userId = ctx.state.user?.id;

      if (!appType || !code) {
        return ctx.badRequest("Missing required fields: appType, code");
      }
      if (!userId) {
        return ctx.unauthorized("Not authenticated");
      }

      const result = await strapi
        .plugin("zhao-third")
        .service("third-party-auth")
        .bindAccount(userId, platform, appType, code);

      ctx.body = result;
    } catch (err: any) {
      strapi.log.error("[zhao-third] bind error:", err);
      ctx.throw(500, { code: err.code || "UNKNOWN", message: err.message });
    }
  },

  async unbind(ctx: any) {
    try {
      const { platform } = ctx.params;
      const { appType } = ctx.query;
      const userId = ctx.state.user?.id;

      if (!appType) {
        return ctx.badRequest("Missing required field: appType");
      }
      if (!userId) {
        return ctx.unauthorized("Not authenticated");
      }

      await strapi
        .plugin("zhao-third")
        .service("third-party-auth")
        .unbindAccount(userId, platform, appType);

      ctx.body = { ok: true };
    } catch (err: any) {
      strapi.log.error("[zhao-third] unbind error:", err);
      ctx.throw(500, { code: err.code || "UNKNOWN", message: err.message });
    }
  },

  async accounts(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized("Not authenticated");
      }

      const accounts = await strapi
        .plugin("zhao-third")
        .service("third-party-auth")
        .getBoundAccounts(userId);

      ctx.body = accounts;
    } catch (err: any) {
      strapi.log.error("[zhao-third] accounts error:", err);
      ctx.throw(500, { code: err.code || "UNKNOWN", message: err.message });
    }
  },
});
'''

with open(os.path.join(base, 'controllers', 'third-party-auth.ts'), 'w', encoding='utf-8') as f:
    f.write(controller_code)

# controllers/index.ts
with open(os.path.join(base, 'controllers', 'index.ts'), 'w', encoding='utf-8') as f:
    f.write('''import thirdPartyAuth from "./third-party-auth";

export default {
  "third-party-auth": thirdPartyAuth,
};
''')

print("Step 4 done: controllers")

# ============================================================
# 9. routes
# ============================================================

# content-api.ts
with open(os.path.join(base, 'routes', 'content-api.ts'), 'w', encoding='utf-8') as f:
    f.write('''export default () => ({
  type: "content-api",
  routes: [
    // Public: get auth URL
    {
      method: "POST",
      path: "/auth/:platform/url",
      handler: "third-party-auth.getAuthUrl",
      config: { auth: false },
    },
    // Public: handle OAuth callback
    {
      method: "POST",
      path: "/auth/:platform/callback",
      handler: "third-party-auth.callback",
      config: { auth: false },
    },
    // Authenticated: bind third-party account
    {
      method: "POST",
      path: "/bind/:platform",
      handler: "third-party-auth.bind",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
    // Authenticated: unbind third-party account
    {
      method: "DELETE",
      path: "/bind/:platform",
      handler: "third-party-auth.unbind",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
    // Authenticated: list bound accounts
    {
      method: "GET",
      path: "/accounts",
      handler: "third-party-auth.accounts",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
  ],
});
''')

# admin.ts
with open(os.path.join(base, 'routes', 'admin.ts'), 'w', encoding='utf-8') as f:
    f.write('''export default () => ({
  type: "admin",
  routes: [
    // third-party-config CRUD (admin)
    {
      method: "GET",
      path: "/third-party-configs",
      handler: "third-party-config.find",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-config.read" }] } },
        ],
      },
    },
    {
      method: "GET",
      path: "/third-party-configs/:documentId",
      handler: "third-party-config.findOne",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-config.read" }] } },
        ],
      },
    },
    {
      method: "POST",
      path: "/third-party-configs",
      handler: "third-party-config.create",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-config.create" }] } },
        ],
      },
    },
    {
      method: "PUT",
      path: "/third-party-configs/:documentId",
      handler: "third-party-config.update",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-config.update" }] } },
        ],
      },
    },
    {
      method: "DELETE",
      path: "/third-party-configs/:documentId",
      handler: "third-party-config.delete",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-config.delete" }] } },
        ],
      },
    },
    // third-party-account admin management
    {
      method: "GET",
      path: "/third-party-accounts",
      handler: "third-party-account.find",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-account.read" }] } },
        ],
      },
    },
    {
      method: "GET",
      path: "/third-party-accounts/:documentId",
      handler: "third-party-account.findOne",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-account.read" }] } },
        ],
      },
    },
    {
      method: "DELETE",
      path: "/third-party-accounts/:documentId",
      handler: "third-party-account.delete",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "third-party-account.delete" }] } },
        ],
      },
    },
  ],
});
''')

# routes/index.ts
with open(os.path.join(base, 'routes', 'index.ts'), 'w', encoding='utf-8') as f:
    f.write('''import admin from "./admin";
import contentApi from "./content-api";

export default {
  admin,
  "content-api": contentApi,
};
''')

print("Step 5 done: routes")

# ============================================================
# 10. index.ts (entry point)
# ============================================================
with open(os.path.join(base, 'index.ts'), 'w', encoding='utf-8') as f:
    f.write('''import register from "./register";
import bootstrap from "./bootstrap";
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";

export default {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
};
''')

# ============================================================
# 11. third-party-config content-type (admin config)
# ============================================================
config_schema = {
    'kind': 'collectionType',
    'collectionName': 'third_party_configs',
    'info': {
        'singularName': 'third-party-config',
        'pluralName': 'third-party-configs',
        'displayName': 'Third Party Config',
        'description': '三方登录平台配置'
    },
    'options': {'draftAndPublish': False},
    'attributes': {
        'platform': {'type': 'enumeration', 'enum': ['wechat', 'alipay', 'douyin'], 'required': True},
        'appType': {'type': 'enumeration', 'enum': ['official_account', 'mini_program', 'open_platform', 'default'], 'required': True},
        'appId': {'type': 'string', 'required': True, 'maxLength': 64},
        'appSecret': {'type': 'string', 'required': True, 'maxLength': 128},
        'enabled': {'type': 'boolean', 'default': True},
        'extraConfig': {'type': 'json'},
    }
}

import json
os.makedirs(os.path.join(base, 'content-types', 'third-party-config'), exist_ok=True)
with open(os.path.join(base, 'content-types', 'third-party-config', 'schema.json'), 'w', encoding='utf-8') as f:
    json.dump(config_schema, f, indent=2, ensure_ascii=False)

# Update content-types/index.ts to include third-party-config
with open(os.path.join(base, 'content-types', 'index.ts'), 'w', encoding='utf-8') as f:
    f.write('''import thirdPartyAccount from "./third-party-account/schema.json";
import thirdPartyConfig from "./third-party-config/schema.json";

export default {
  "third-party-account": { schema: thirdPartyAccount },
  "third-party-config": { schema: thirdPartyConfig },
};
''')

# ============================================================
# 12. third-party-config controller
# ============================================================
controller_config_code = r'''export default ({ strapi }: { strapi: any }) => ({
  async find(ctx: any) {
    try {
      const entries = await strapi.db.query("plugin::zhao-third.third-party-config").findMany({
        populate: ["createdBy", "updatedBy"],
      });
      ctx.body = { data: entries };
    } catch (err: any) {
      ctx.throw(500, err);
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const entry = await strapi.db.query("plugin::zhao-third.third-party-config").findOne({
        where: { documentId },
      });
      if (!entry) {
        return ctx.notFound("Config not found");
      }
      ctx.body = { data: entry };
    } catch (err: any) {
      ctx.throw(500, err);
    }
  },

  async create(ctx: any) {
    try {
      const entry = await strapi.db.query("plugin::zhao-third.third-party-config").create({
        data: ctx.request.body,
      });
      ctx.body = { data: entry };
    } catch (err: any) {
      ctx.throw(500, err);
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const entry = await strapi.db.query("plugin::zhao-third.third-party-config").update({
        where: { documentId },
        data: ctx.request.body,
      });
      ctx.body = { data: entry };
    } catch (err: any) {
      ctx.throw(500, err);
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      await strapi.db.query("plugin::zhao-third.third-party-config").delete({
        where: { documentId },
      });
      ctx.body = { data: null };
    } catch (err: any) {
      ctx.throw(500, err);
    }
  },
});
'''

with open(os.path.join(base, 'controllers', 'third-party-config.ts'), 'w', encoding='utf-8') as f:
    f.write(controller_config_code)

# Update controllers/index.ts
with open(os.path.join(base, 'controllers', 'index.ts'), 'w', encoding='utf-8') as f:
    f.write('''import thirdPartyAuth from "./third-party-auth";
import thirdPartyConfig from "./third-party-config";

export default {
  "third-party-auth": thirdPartyAuth,
  "third-party-config": thirdPartyConfig,
};
''')

print("Step 6 done: third-party-config, index.ts, all done!")
