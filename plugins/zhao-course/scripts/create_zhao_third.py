import json, os

base = r'e:\code\plugins\zhao-third\server\src'

# ============================================================
# 1. Content Types - third-party-account schema
# ============================================================
schema = {
    'kind': 'collectionType',
    'collectionName': 'third_party_accounts',
    'info': {
        'singularName': 'third-party-account',
        'pluralName': 'third-party-accounts',
        'displayName': 'Third Party Account',
        'description': '\u4e09\u65b9\u5e73\u53f0\u8d26\u53f7\u7ed1\u5b9a'
    },
    'options': {'draftAndPublish': False},
    'attributes': {
        'user': {'type': 'relation', 'relation': 'manyToOne', 'target': 'plugin::users-permissions.user', 'required': True},
        'platform': {'type': 'enumeration', 'enum': ['wechat', 'alipay', 'douyin'], 'required': True},
        'appType': {'type': 'enumeration', 'enum': ['official_account', 'mini_program', 'open_platform', 'default'], 'default': 'default', 'required': True},
        'openId': {'type': 'string', 'required': True, 'maxLength': 128},
        'unionId': {'type': 'string', 'maxLength': 128},
        'nickname': {'type': 'string', 'maxLength': 100},
        'avatar': {'type': 'string', 'maxLength': 500},
        'rawProfile': {'type': 'json'},
        'boundAt': {'type': 'datetime'}
    }
}

with open(os.path.join(base, 'content-types', 'third-party-account', 'schema.json'), 'w', encoding='utf-8') as f:
    json.dump(schema, f, indent=2, ensure_ascii=False)

with open(os.path.join(base, 'content-types', 'index.ts'), 'w', encoding='utf-8') as f:
    f.write("""import thirdPartyAccount from \"./third-party-account/schema.json\";

export default {
  \"third-party-account\": { schema: thirdPartyAccount },
};
""")

# ============================================================
# 2. register.ts
# ============================================================
with open(os.path.join(base, 'register.ts'), 'w', encoding='utf-8') as f:
    f.write("""import type { Core } from \"@strapi/strapi\";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const i18n = strapi.plugin(\"zhao-common\").service(\"i18n\");
    i18n.setMessages({
      THIRD_001: \"\u4e09\u65b9\u5e73\u53f0\u4e0d\u652f\u6301 (platform={platform})\",
      THIRD_002: \"\u6388\u6743\u7801\u65e0\u6548\u6216\u5df2\u8fc7\u671f\",
      THIRD_003: \"\u83b7\u53d6\u4e09\u65b9\u7528\u6237\u4fe1\u606f\u5931\u8d25\",
      THIRD_004: \"\u8be5\u4e09\u65b9\u8d26\u53f7\u5df2\u88ab\u7ed1\u5b9a\",
      THIRD_005: \"\u672a\u627e\u5230\u4e09\u65b9\u8d26\u53f7\u7ed1\u5b9a\",
      THIRD_006: \"\u4e09\u65b9\u8d26\u53f7\u7ed1\u5b9a\u5931\u8d25\",
      THIRD_007: \"\u4e09\u65b9\u89e3\u7ed1\u5931\u8d25\",
      THIRD_008: \"\u4e09\u65b9\u767b\u5f55\u914d\u7f6e\u4e0d\u5b58\u5728\",
    });
  } catch {
    // zhao-common \u63d2\u4ef6\u672a\u542f\u7528\u65f6\u9759\u9ed8\u5ffd\u7565
  }
};

export default register;
""")

# ============================================================
# 3. config/index.ts
# ============================================================
with open(os.path.join(base, 'config', 'index.ts'), 'w', encoding='utf-8') as f:
    f.write("""export default {
  default: {
    platforms: {
      wechat: {
        subTypes: {
          official_account: {
            authorizeUrl: \"https://open.weixin.qq.com/connect/oauth2/authorize\",
            parameters: { response_type: \"code\", scope: \"snsapi_userinfo\" },
          },
          mini_program: {
            jsCode2sessionUrl: \"https://api.weixin.qq.com/sns/jscode2session\",
          },
          open_platform: {
            authorizeUrl: \"https://open.weixin.qq.com/connect/qrconnect\",
            parameters: { response_type: \"code\", scope: \"snsapi_login\" },
          },
        },
        tokenUrl: \"https://api.weixin.qq.com/sns/oauth2/access_token\",
        refreshTokenUrl: \"https://api.weixin.qq.com/sns/oauth2/refresh_token\",
        userInfoUrl: \"https://api.weixin.qq.com/sns/userinfo\",
      },
      alipay: {
        appType: \"default\",
        authorizeUrl: \"https://openauth.alipay.com/oauth2/publicAppAuthorize.htm\",
        tokenUrl: \"https://openapi.alipay.com/gateway.do\",
      },
      douyin: {
        appType: \"default\",
        authorizeUrl: \"https://open.douyin.com/platform/oauth/connect\",
        tokenUrl: \"https://open.douyin.com/oauth/access_token\",
        userInfoUrl: \"https://open.douyin.com/oauth/userinfo\",
      },
    },
    defaultRole: \"authenticated\",
  },
};
""")

# ============================================================
# 4. permissions.ts
# ============================================================
with open(os.path.join(base, 'permissions.ts'), 'w', encoding='utf-8') as f:
    f.write("""export const ROLES = {
  SUPER_ADMIN: \"super-admin\",
  ADMIN: \"admin\",
  EDITOR: \"editor\",
  VIEWER: \"viewer\",
} as const;

export interface PermissionEntry {
  allowRoles: string[];
}

export type PermissionAction = `${string}.${"read" | "create" | "update" | "delete"}`;

export const PERMISSIONS: Record<PermissionAction, PermissionEntry> = {
  \"third-party-config.read\": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  \"third-party-config.create\": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  \"third-party-config.update\": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  \"third-party-config.delete\": { allowRoles: [ROLES.SUPER_ADMIN] },

  \"third-party-account.read\": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VIEWER] },
  \"third-party-account.delete\": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
};
""")

# ============================================================
# 5. bootstrap.ts
# ============================================================
with open(os.path.join(base, 'bootstrap.ts'), 'w', encoding='utf-8') as f:
    f.write("""import type { Core } from \"@strapi/strapi\";
import createHasPermission from \"./policies/has-permission\";

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const authService = strapi.plugin(\"zhao-auth\").service(\"auth\");
    (authService as any).registerPolicy(\"has-permission\", createHasPermission(strapi));
    strapi.log.info(\"zhao-third: has-permission \u7b56\u7565\u5df2\u6ce8\u518c\u5230 zhao-auth\");
  } catch {
    strapi.log.warn(\"zhao-third: zhao-auth \u63d2\u4ef6\u672a\u542f\u7528\uff0c\u6743\u9650\u7b56\u7565\u672a\u6ce8\u518c\");
  }
};

export default bootstrap;
""")

print("Step 1 done: content-types, register, config, permissions, bootstrap")

# ============================================================
# 6. policies/has-permission.ts
# ============================================================
import os
os.makedirs(os.path.join(base, 'policies'), exist_ok=True)
with open(os.path.join(base, 'policies', 'has-permission.ts'), 'w', encoding='utf-8') as f:
    f.write('''import type { Core } from "@strapi/strapi";
import { PERMISSIONS } from "../permissions";

export interface PolicyResult {
  passed: boolean;
  code?: string;
  message?: string;
}

export type PolicyHandler = (
  context: Record<string, unknown>,
  config?: Record<string, unknown>,
) => Promise<PolicyResult> | PolicyResult;

const createHasPermission = (strapi: Core.Strapi): PolicyHandler => {
  return (context, config): PolicyResult => {
    const user = context?.user as Record<string, unknown> | undefined;
    if (!user || !user.id) {
      return { passed: false, code: "UNAUTHENTICATED", message: "\u672a\u8ba4\u8bc1\uff0c\u8bf7\u5148\u767b\u5f55" };
    }

    const action = config?.action as string | undefined;
    if (!action) {
      return { passed: false, code: "MISSING_ACTION", message: "\u672a\u6307\u5b9a\u6743\u9650\u52a8\u4f5c (action)" };
    }

    const permission = PERMISSIONS[action as keyof typeof PERMISSIONS];
    if (!permission) {
      strapi.log.warn(`[zhao-third] \u672a\u5b9a\u4e49\u7684\u6743\u9650\u52a8\u4f5c: ${action}`);
      return { passed: false, code: "PERMISSION_NOT_FOUND", message: `\u6743\u9650\u52a8\u4f5c "${action}" \u672a\u5b9a\u4e49` };
    }

    const userRoles = (user.roles as string[]) || [];
    if (userRoles.length === 0) {
      return { passed: false, code: "NO_ROLES", message: "\u7528\u6237\u65e0\u89d2\u8272\u4fe1\u606f" };
    }

    const hasPermission = permission.allowRoles.some((role) => userRoles.includes(role));
    if (!hasPermission) {
      return { passed: false, code: "FORBIDDEN", message: `\u65e0\u6743\u6267\u884c\u64cd\u4f5c "${action}"\uff0c\u9700\u8981\u89d2\u8272 [${permission.allowRoles.join(", ")}]` };
    }

    return { passed: true };
  };
};

export default createHasPermission;
''')

print("Step 2 done: policies")
