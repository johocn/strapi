export const ROLES = {
  ADMIN: "admin",
  CHANNEL_ADMIN: "channel-admin",
  PLUGIN_MANAGER: "plugin-manager",
  INSTRUCTOR: "instructor",
  USER: "user",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: "系统管理员",
  [ROLES.CHANNEL_ADMIN]: "渠道管理员",
  [ROLES.PLUGIN_MANAGER]: "插件管理员",
  [ROLES.INSTRUCTOR]: "讲师",
  [ROLES.USER]: "普通用户",
};

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

// ===== 权限树定义 =====

export interface PermissionItem {
  label: string;
  type: "menu" | "button";
  children?: Record<string, PermissionItem>;
}

export const PERMISSION_TREE: Record<string, PermissionItem> = {
  "menu.course-center": {
    label: "课程中心",
    type: "menu",
    children: {
      "menu.course": {
        label: "课程管理",
        type: "menu",
        children: {
          "course.read": { label: "查看课程", type: "button" },
          "course.create": { label: "新增课程", type: "button" },
          "course.update": { label: "编辑课程", type: "button" },
          "course.publish": { label: "发布课程", type: "button" },
          "course.delete": { label: "删除课程", type: "button" },
        },
      },
      "menu.lesson": {
        label: "课时管理",
        type: "menu",
        children: {
          "lesson.read": { label: "查看课时", type: "button" },
          "lesson.create": { label: "新增课时", type: "button" },
          "lesson.update": { label: "编辑课时", type: "button" },
          "lesson.delete": { label: "删除课时", type: "button" },
        },
      },
      "menu.category": {
        label: "课程分类",
        type: "menu",
        children: {
          "course-category.read": { label: "查看分类", type: "button" },
          "course-category.create": { label: "新增分类", type: "button" },
          "course-category.update": { label: "编辑分类", type: "button" },
          "course-category.delete": { label: "删除分类", type: "button" },
        },
      },
      "menu.auth": {
        label: "用户授权",
        type: "menu",
        children: {
          "user-course.read": { label: "查看授权", type: "button" },
          "user-course.grant": { label: "授权管理", type: "button" },
        },
      },
    },
  },
  "menu.study-center": {
    label: "学习数据",
    type: "menu",
    children: {
      "menu.progress": {
        label: "课程进度",
        type: "menu",
        children: {
          "course-progress.read": { label: "查看课程进度", type: "button" },
          "course-progress.update": { label: "更新课程进度", type: "button" },
        },
      },
      "menu.lesson-progress": {
        label: "课时进度",
        type: "menu",
        children: {
          "lesson-progress.read": { label: "查看课时进度", type: "button" },
          "lesson-progress.update": { label: "更新课时进度", type: "button" },
        },
      },
    },
  },
  "menu.quiz-center": {
    label: "题库系统",
    type: "menu",
    children: {
      "menu.quiz": {
        label: "题库管理",
        type: "menu",
        children: {
          "quiz.read": { label: "查看题目", type: "button" },
          "quiz.create": { label: "新增题目", type: "button" },
          "quiz.update": { label: "编辑题目", type: "button" },
          "quiz.delete": { label: "删除题目", type: "button" },
        },
      },
      "menu.exam": {
        label: "考试管理",
        type: "menu",
        children: {
          "exam.read": { label: "查看考试", type: "button" },
          "exam.create": { label: "新增考试", type: "button" },
          "exam.update": { label: "编辑考试", type: "button" },
          "exam.delete": { label: "删除考试", type: "button" },
        },
      },
      "menu.quiz-record": {
        label: "答题记录",
        type: "menu",
        children: {
          "quiz-record.read": { label: "查看答题记录", type: "button" },
        },
      },
    },
  },
  "menu.point-center": {
    label: "积分体系",
    type: "menu",
    children: {
      "menu.point-type": {
        label: "积分类型",
        type: "menu",
        children: {
          "point-type.read": { label: "查看积分类型", type: "button" },
          "point-type.create": { label: "新增积分类型", type: "button" },
          "point-type.update": { label: "编辑积分类型", type: "button" },
          "point-type.delete": { label: "删除积分类型", type: "button" },
        },
      },
      "menu.point-rule": {
        label: "积分规则",
        type: "menu",
        children: {
          "point-rule.read": { label: "查看规则", type: "button" },
          "point-rule.create": { label: "新增规则", type: "button" },
          "point-rule.update": { label: "编辑规则", type: "button" },
          "point-rule.delete": { label: "删除规则", type: "button" },
        },
      },
      "menu.point-record": {
        label: "积分记录",
        type: "menu",
        children: {
          "point-record.read": { label: "查看记录", type: "button" },
        },
      },
      "menu.product": {
        label: "积分产品",
        type: "menu",
        children: {
          "point-product.read": { label: "查看产品", type: "button" },
          "point-product.create": { label: "新增产品", type: "button" },
          "point-product.update": { label: "编辑产品", type: "button" },
          "point-product.delete": { label: "删除产品", type: "button" },
        },
      },
      "menu.exchange": {
        label: "兑换记录",
        type: "menu",
        children: {
          "point-exchange.read": { label: "查看兑换", type: "button" },
        },
      },
      "menu.point-stat": {
        label: "积分统计",
        type: "menu",
        children: {
          "point-dashboard.read": { label: "查看统计", type: "button" },
        },
      },
      "menu.point-config": {
        label: "积分配置",
        type: "menu",
        children: {
          "point-config.read": { label: "查看配置", type: "button" },
          "point-config.update": { label: "修改配置", type: "button" },
        },
      },
      "menu.pickup-location": {
        label: "自提点",
        type: "menu",
        children: {
          "pickup-location.read": { label: "查看自提点", type: "button" },
          "pickup-location.create": { label: "新增自提点", type: "button" },
          "pickup-location.update": { label: "编辑自提点", type: "button" },
          "pickup-location.delete": { label: "删除自提点", type: "button" },
        },
      },
      "menu.point-verification": {
        label: "积分核销",
        type: "menu",
        children: {
          "point-verification.read": { label: "查看核销记录", type: "button" },
        },
      },
    },
  },
  "menu.marketing-center": {
    label: "营销运营",
    type: "menu",
    children: {
      "menu.channel": {
        label: "渠道管理",
        type: "menu",
        children: {
          "channel.read": { label: "查看渠道", type: "button" },
          "channel.create": { label: "新增渠道", type: "button" },
          "channel.update": { label: "编辑渠道", type: "button" },
          "channel.delete": { label: "删除渠道", type: "button" },
          "channel.config.update": { label: "修改渠道配置", type: "button" },
        },
      },
      "menu.network": {
        label: "渠道网络",
        type: "menu",
        children: {
          "network.view": { label: "查看网络", type: "button" },
        },
      },
      "menu.members": {
        label: "成员管理",
        type: "menu",
        children: {
          "channel-member.read": { label: "查看成员", type: "button" },
          "channel-member.add": { label: "邀请成员", type: "button" },
          "channel-member.remove": { label: "移除成员", type: "button" },
        },
      },
      "menu.invite": {
        label: "分销邀请",
        type: "menu",
        children: {
          "user-invite.send": { label: "创建邀请", type: "button" },
          "user-invite.validate": { label: "使用邀请", type: "button" },
        },
      },
      "menu.channel-permission": {
        label: "渠道权限",
        type: "menu",
        children: {
          "channel-permission.set": { label: "授权渠道", type: "button" },
        },
      },
      "menu.redemption-code": {
        label: "兑换码",
        type: "menu",
        children: {
          "redemption-code.create": { label: "创建兑换码", type: "button" },
          "redemption-code.delete": { label: "删除兑换码", type: "button" },
        },
      },
      "menu.redemption-record": {
        label: "兑换记录",
        type: "menu",
        children: {
          "redemption-record.review": { label: "审核兑换", type: "button" },
        },
      },
    },
  },
  "menu.system-center": {
    label: "系统工具",
    type: "menu",
    children: {
      "menu.media": { label: "媒体资源", type: "menu" },
      "menu.soft-delete": {
        label: "回收站",
        type: "menu",
        children: {
          "soft-delete.read": { label: "查看回收站", type: "button" },
          "soft-delete.manage": { label: "管理回收站", type: "button" },
        },
      },
      "menu.feature-flag": {
        label: "功能开关",
        type: "menu",
        children: {
          "feature-flag.update": { label: "修改粗粒度开关", type: "button" },
          "config.feature.update": { label: "修改细粒度配置", type: "button" },
        },
      },
      "menu.site-config": {
        label: "站点配置",
        type: "menu",
        children: {
          "config.read": { label: "查看配置", type: "button" },
          "config.create": { label: "新增配置", type: "button" },
          "config.update": { label: "修改配置", type: "button" },
          "config.delete": { label: "删除配置", type: "button" },
          "site-config.update": { label: "修改站点配置", type: "button" },
        },
      },
      "menu.verification": { label: "验证记录", type: "menu" },
      "menu.user-roles": {
        label: "用户角色",
        type: "menu",
        children: {
          "role.assign": { label: "分配角色", type: "button" },
          "role.revoke": { label: "撤销角色", type: "button" },
          "role.create": { label: "新增角色", type: "button" },
          "role.read": { label: "查看角色", type: "button" },
          "role.read-logs": { label: "查看角色日志", type: "button" },
        },
      },
      "menu.permissions": {
        label: "权限管理",
        type: "menu",
        children: {
          "permissions.read": { label: "查看权限", type: "button" },
          "permissions.update": { label: "更新权限", type: "button" },
        },
      },
      "menu.role-logs": { label: "操作日志", type: "menu" },
      "menu.oss": {
        label: "OSS 管理",
        type: "menu",
        children: {
          "oss.read": { label: "查看 OSS", type: "button" },
          "oss.upload": { label: "上传文件", type: "button" },
          "oss.delete": { label: "删除文件", type: "button" },
          "oss.dashboard": { label: "查看仪表盘", type: "button" },
          "oss.record": { label: "查看同步记录", type: "button" },
          "oss.settings": { label: "修改存储设置", type: "button" },
        },
      },
      "menu.third": {
        label: "三方配置",
        type: "menu",
        children: {
          "third-party-config.read": { label: "查看配置", type: "button" },
          "third-party-config.create": { label: "新增配置", type: "button" },
          "third-party-config.update": { label: "编辑配置", type: "button" },
          "third-party-config.delete": { label: "删除配置", type: "button" },
          "third-party-account.read": { label: "查看绑定账号", type: "button" },
          "third-party-account.delete": { label: "解绑账号", type: "button" },
        },
      },
      "menu.sso": {
        label: "SSO 管理",
        type: "menu",
        children: {
          "sso.dashboard": { label: "查看仪表盘", type: "button" },
          "sso.user-read": { label: "查看用户", type: "button" },
          "sso.user-update": { label: "编辑用户", type: "button" },
          "sso.app-read": { label: "查看应用", type: "button" },
          "sso.app-create": { label: "创建应用", type: "button" },
          "sso.app-update": { label: "编辑应用", type: "button" },
          "sso.channel-read": { label: "查看渠道", type: "button" },
          "sso.channel-create": { label: "创建渠道", type: "button" },
          "sso.channel-update": { label: "编辑渠道", type: "button" },
          "sso.log-read": { label: "查看日志", type: "button" },
        },
      },
      "menu.tenant": {
        label: "租户管理",
        type: "menu",
        children: {
          "tenant.read": { label: "查看租户", type: "button" },
          "tenant.create": { label: "新建租户", type: "button" },
          "tenant.update": { label: "编辑租户", type: "button" },
          "tenant.delete": { label: "删除租户", type: "button" },
        },
      },
      "menu.template": {
        label: "模板管理",
        type: "menu",
        children: {
          "template.read": { label: "查看模板", type: "button" },
          "template.create": { label: "新增模板", type: "button" },
          "template.update": { label: "编辑模板", type: "button" },
          "template.delete": { label: "删除模板", type: "button" },
        },
      },
    },
  },
  "menu.tag-center": {
    label: "标签体系",
    type: "menu",
    children: {
      "menu.tag": {
        label: "标签管理",
        type: "menu",
        children: {
          "tag.read": { label: "查看标签", type: "button" },
          "tag.create": { label: "新增标签", type: "button" },
          "tag.update": { label: "编辑标签", type: "button" },
          "tag.delete": { label: "删除标签", type: "button" },
        },
      },
      "menu.tag-group": {
        label: "分组管理",
        type: "menu",
        children: {
          "tag-group.read": { label: "查看分组", type: "button" },
          "tag-group.create": { label: "新增分组", type: "button" },
          "tag-group.update": { label: "编辑分组", type: "button" },
          "tag-group.delete": { label: "删除分组", type: "button" },
        },
      },
      "menu.knowledge": {
        label: "知识点",
        type: "menu",
        children: {
          "knowledge-point.read": { label: "查看知识点", type: "button" },
          "knowledge-point.create": { label: "新增知识点", type: "button" },
          "knowledge-point.update": { label: "编辑知识点", type: "button" },
          "knowledge-point.delete": { label: "删除知识点", type: "button" },
        },
      },
      "menu.tag-preset": { label: "分类预设", type: "menu" },
      "menu.tag-search": { label: "全局检索", type: "menu" },
    },
  },
  "menu.studio-center": {
    label: "直播工作室",
    type: "menu",
    children: {
      "menu.studio": {
        label: "工作室管理",
        type: "menu",
        children: {
          "zhao-studio.read": { label: "查看工作室", type: "button" },
          "zhao-studio.create": { label: "新增工作室", type: "button" },
          "zhao-studio.update": { label: "编辑工作室", type: "button" },
          "zhao-studio.delete": { label: "删除工作室", type: "button" },
        },
      },
    },
  },
};

// ===== 工具函数 =====

/** 递归展开权限树为扁平 key 数组 */
export function flattenPermissions(
  tree: Record<string, PermissionItem>
): string[] {
  const keys: string[] = [];
  for (const [key, item] of Object.entries(tree)) {
    keys.push(key);
    if (item.children) {
      keys.push(...flattenPermissions(item.children));
    }
  }
  return keys;
}

/** 获取权限 key 的所有子权限（含自身） */
export function expandPermissionKeys(
  keys: string[],
  tree: Record<string, PermissionItem> = PERMISSION_TREE
): string[] {
  const expanded = new Set<string>();

  const findAndExpand = (
    key: string,
    nodes: Record<string, PermissionItem>
  ): boolean => {
    for (const [k, item] of Object.entries(nodes)) {
      if (k === key) {
        expanded.add(k);
        if (item.children) {
          flattenPermissions(item.children).forEach((ck) =>
            expanded.add(ck)
          );
        }
        return true;
      }
      if (item.children && findAndExpand(key, item.children)) {
        return true;
      }
    }
    return false;
  };

  keys.forEach((key) => findAndExpand(key, tree));
  return Array.from(expanded);
}

/** 获取权限项的 label（用于前端展示） */
export function getPermissionLabel(
  key: string,
  tree: Record<string, PermissionItem> = PERMISSION_TREE
): string | null {
  for (const [k, item] of Object.entries(tree)) {
    if (k === key) return item.label;
    if (item.children) {
      const found = getPermissionLabel(key, item.children);
      if (found) return found;
    }
  }
  return null;
}

// ===== 默认角色权限映射 =====

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.ADMIN]: flattenPermissions(PERMISSION_TREE),
  [ROLES.CHANNEL_ADMIN]: [
    ...flattenPermissions(PERMISSION_TREE).filter(
      (k) => !k.startsWith("menu.system-center")
    ),
    "menu.tenant",
    "tenant.read",
    "tenant.create",
    "tenant.update",
    "tenant.delete",
    "menu.site-config",
    "site-config.update",
    "config.read",
    "config.update",
    "menu.feature-flag",
    "feature-flag.update",
    "config.feature.update",
    "channel.config.update",
    "menu.user-roles",
    "role.read",
    "role.assign",
    "role.revoke",
    "role.create",
    "role.read-logs",
  ],
  [ROLES.PLUGIN_MANAGER]: flattenPermissions(
    ((t: Record<string, PermissionItem>) => {
      const result: Record<string, PermissionItem> = {};
      for (const key of [
        "menu.course-center",
        "menu.quiz-center",
        "menu.point-center",
        "menu.tag-center",
        "menu.studio-center",
      ]) {
        if (t[key]) result[key] = t[key];
      }
      return result;
    })(PERMISSION_TREE)
  ).concat([
    "menu.site-config",
    "site-config.update",
    "config.read",
    "config.update",
    "config.feature.update",
    "channel.config.update",
  ]),
  [ROLES.INSTRUCTOR]: [
    // 课程中心
    "menu.course-center",
    "menu.course",
    "course.read",
    "course.create",
    "course.update",
    "course.publish",
    "menu.lesson",
    "lesson.read",
    "lesson.create",
    "lesson.update",
    "lesson.delete",
    "menu.category",
    "course-category.read",
    "course-category.create",
    "course-category.update",
    "menu.auth",
    "user-course.read",
    "user-course.grant",
    // 学习数据
    "menu.study-center",
    "menu.progress",
    "course-progress.read",
    "course-progress.update",
    "menu.lesson-progress",
    "lesson-progress.read",
    "lesson-progress.update",
    // 标签体系
    "menu.tag-center",
    "menu.tag",
    "tag.read",
    "tag.create",
    "tag.update",
    "menu.knowledge",
    "knowledge-point.read",
    "knowledge-point.create",
    "knowledge-point.update",
  ],
  [ROLES.USER]: [],
};
