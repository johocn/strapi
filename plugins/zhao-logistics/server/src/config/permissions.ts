/**
 * zhao-logistics 权限定义
 * 命名规范：zhao-logistics.{ct}.{action}
 * action: read / create / update / delete / publish
 */
export const PERMISSIONS = {
  "quote-request": {
    actions: ["read", "create", "update", "delete"],
    displayName: "询价单",
  },
  "quote-field-rule": {
    actions: ["read", "create", "update", "delete"],
    displayName: "询价动态字段规则",
  },
  "quote-price-rule": {
    actions: ["read", "create", "update", "delete"],
    displayName: "报价规则表",
  },
  "quote-price-formula": {
    actions: ["read", "create", "update", "delete"],
    displayName: "报价公式模板",
  },
  "tracking-shipment": {
    actions: ["read", "create", "update", "delete"],
    displayName: "货物追踪主表",
  },
  "tracking-node": {
    actions: ["read", "create", "update", "delete"],
    displayName: "追踪节点",
  },
  "tracking-provider": {
    actions: ["read", "create", "update", "delete"],
    displayName: "追踪 API 配置",
  },
  "contact-matrix": {
    actions: ["read", "create", "update", "delete"],
    displayName: "联系渠道矩阵",
  },
} as const;

/**
 * 系统角色权限映射
 * super-admin: 全部权限（Strapi 自动）
 * admin: 除 tracking-provider.create/update/delete 外的全部（API Key 安全）
 * editor: 内容管理权限
 * viewer: 全部 .read
 */
export const ROLE_PERMISSIONS = {
  admin: {
    "quote-request": ["read", "create", "update", "delete"],
    "quote-field-rule": ["read", "create", "update", "delete"],
    "quote-price-rule": ["read", "create", "update", "delete"],
    "quote-price-formula": ["read", "create", "update", "delete"],
    "tracking-shipment": ["read", "create", "update", "delete"],
    "tracking-node": ["read", "create", "update", "delete"],
    "tracking-provider": ["read"], // admin 只读 tracking-provider
    "contact-matrix": ["read", "create", "update", "delete"],
  },
  editor: {
    "quote-field-rule": ["read", "create", "update", "delete"],
    "quote-price-rule": ["read", "create", "update", "delete"],
    "contact-matrix": ["read", "create", "update", "delete"],
  },
  viewer: {
    "quote-request": ["read"],
    "quote-field-rule": ["read"],
    "quote-price-rule": ["read"],
    "quote-price-formula": ["read"],
    "tracking-shipment": ["read"],
    "tracking-node": ["read"],
    "tracking-provider": ["read"],
    "contact-matrix": ["read"],
  },
} as const;

/**
 * 生成权限标识符
 */
export function buildPermissionId(ct: string, action: string): string {
  return `zhao-logistics.${ct}.${action}`;
}

/**
 * 获取所有权限标识符列表
 */
export function getAllPermissionIds(): string[] {
  const ids: string[] = [];
  for (const [ct, config] of Object.entries(PERMISSIONS)) {
    for (const action of config.actions) {
      ids.push(buildPermissionId(ct, action));
    }
  }
  return ids;
}
