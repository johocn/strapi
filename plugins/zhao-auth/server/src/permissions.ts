export const ROLES = {
  ADMIN: "admin",
  CHANNEL_ADMIN: "channel-admin",
  PLUGIN_MANAGER: "plugin-manager",
  INSTRUCTOR: "instructor",
  USER: "user",
  // 11 个中心 × 2 = 22 个新角色
  WEBSITE_MANAGER: "website-manager",
  WEBSITE_EDITOR: "website-editor",
  LOGISTICS_MANAGER: "logistics-manager",
  LOGISTICS_EDITOR: "logistics-editor",
  COURSE_MANAGER: "course-manager",
  COURSE_EDITOR: "course-editor",
  STUDY_MANAGER: "study-manager",
  STUDY_EDITOR: "study-editor",
  QUIZ_MANAGER: "quiz-manager",
  QUIZ_EDITOR: "quiz-editor",
  POINT_MANAGER: "point-manager",
  POINT_EDITOR: "point-editor",
  MARKETING_MANAGER: "marketing-manager",
  MARKETING_EDITOR: "marketing-editor",
  SYSTEM_MANAGER: "system-manager",
  SYSTEM_EDITOR: "system-editor",
  TAG_MANAGER: "tag-manager",
  TAG_EDITOR: "tag-editor",
  STUDIO_MANAGER: "studio-manager",
  STUDIO_EDITOR: "studio-editor",
  WEALTH_MANAGER: "wealth-manager",
  WEALTH_EDITOR: "wealth-editor",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: "系统管理员",
  [ROLES.CHANNEL_ADMIN]: "渠道管理员",
  [ROLES.PLUGIN_MANAGER]: "插件管理员",
  [ROLES.INSTRUCTOR]: "讲师",
  [ROLES.USER]: "普通用户",
  [ROLES.WEBSITE_MANAGER]: "官网管理员",
  [ROLES.WEBSITE_EDITOR]: "官网编辑",
  [ROLES.LOGISTICS_MANAGER]: "物流管理员",
  [ROLES.LOGISTICS_EDITOR]: "物流编辑",
  [ROLES.COURSE_MANAGER]: "课程管理员",
  [ROLES.COURSE_EDITOR]: "课程编辑",
  [ROLES.STUDY_MANAGER]: "学习数据管理员",
  [ROLES.STUDY_EDITOR]: "学习数据编辑",
  [ROLES.QUIZ_MANAGER]: "题库管理员",
  [ROLES.QUIZ_EDITOR]: "题库编辑",
  [ROLES.POINT_MANAGER]: "积分管理员",
  [ROLES.POINT_EDITOR]: "积分编辑",
  [ROLES.MARKETING_MANAGER]: "营销管理员",
  [ROLES.MARKETING_EDITOR]: "营销编辑",
  [ROLES.SYSTEM_MANAGER]: "系统管理员(中心)",
  [ROLES.SYSTEM_EDITOR]: "系统编辑",
  [ROLES.TAG_MANAGER]: "标签管理员",
  [ROLES.TAG_EDITOR]: "标签编辑",
  [ROLES.STUDIO_MANAGER]: "工作室管理员",
  [ROLES.STUDIO_EDITOR]: "工作室编辑",
  [ROLES.WEALTH_MANAGER]: "理财管理员",
  [ROLES.WEALTH_EDITOR]: "理财编辑",
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
          "quiz.exam-attempt.read": { label: "查看考试记录", type: "button" },
          "quiz.exam-attempt.delete": { label: "删除考试记录", type: "button" },
        },
      },
      "menu.quiz-record": {
        label: "答题记录",
        type: "menu",
        children: {
          "quiz-record.read": { label: "查看答题记录", type: "button" },
        },
      },
      "menu.quiz-batch": {
        label: "批量考试",
        type: "menu",
        children: {
          "quiz.quiz-batch.read": { label: "查看", type: "button" },
          "quiz.quiz-batch.create": { label: "创建", type: "button" },
          "quiz.quiz-batch.delete": { label: "删除", type: "button" },
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
      "menu.point-rule-template": {
        label: "规则模板",
        type: "menu",
        children: {
          "point.rule-template.read": { label: "查看", type: "button" },
          "point.rule-template.create": { label: "创建", type: "button" },
          "point.rule-template.update": { label: "编辑", type: "button" },
          "point.rule-template.delete": { label: "删除", type: "button" },
        },
      },
      "menu.point-sign-in": {
        label: "签到记录",
        type: "menu",
        children: {
          "point.sign-in-record.read": { label: "查看", type: "button" },
          "point.sign-in-record.export": { label: "导出", type: "button" },
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
          "channel.user-channel.read": { label: "查看用户渠道", type: "button" },
          "channel.user-channel.assign": { label: "分配渠道", type: "button" },
          "channel.user-channel.revoke": { label: "撤销渠道", type: "button" },
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
      "menu.media": {
        label: "媒体资源",
        type: "menu",
        children: {
          "oss.media-meta.read": { label: "查看媒体", type: "button" },
          "oss.media-meta.upload": { label: "上传媒体", type: "button" },
          "oss.media-meta.delete": { label: "删除媒体", type: "button" },
        },
      },
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
          "menu.sso-binding": {
            label: "三方绑定",
            type: "menu",
            children: {
              "sso.third-party-binding.read": { label: "查看三方绑定", type: "button" },
              "sso.third-party-binding.create": { label: "创建绑定", type: "button" },
              "sso.third-party-binding.update": { label: "编辑绑定", type: "button" },
              "sso.third-party-binding.delete": { label: "删除绑定", type: "button" },
              "sso.oauth-config.read": { label: "查看OAuth配置", type: "button" },
              "sso.oauth-config.create": { label: "创建OAuth配置", type: "button" },
              "sso.oauth-config.update": { label: "编辑OAuth配置", type: "button" },
              "sso.oauth-config.delete": { label: "删除OAuth配置", type: "button" },
            },
          },
          "menu.sso-token": {
            label: "令牌管理",
            type: "menu",
            children: {
              "sso.token.read": { label: "查看令牌", type: "button" },
              "sso.token.delete": { label: "删除令牌", type: "button" },
              "sso.auth-code.read": { label: "查看授权码", type: "button" },
              "sso.auth-code.delete": { label: "删除授权码", type: "button" },
            },
          },
          "menu.sso-user-role": {
            label: "用户应用角色",
            type: "menu",
            children: {
              "sso.user-app-role.read": { label: "查看角色", type: "button" },
              "sso.user-app-role.create": { label: "分配角色", type: "button" },
              "sso.user-app-role.update": { label: "编辑角色", type: "button" },
              "sso.user-app-role.delete": { label: "删除角色", type: "button" },
            },
          },
          "menu.sso-invite": {
            label: "邀请体系",
            type: "menu",
            children: {
              "sso.invite-code.read": { label: "查看邀请码", type: "button" },
              "sso.invite-code.create": { label: "创建邀请码", type: "button" },
              "sso.invite-code.delete": { label: "删除邀请码", type: "button" },
              "sso.invite-code.validate": { label: "核销邀请码", type: "button" },
              "sso.invite-usage.read": { label: "查看使用记录", type: "button" },
              "sso.invite-usage.delete": { label: "删除使用记录", type: "button" },
              "sso.invite-stats.read": { label: "查看邀请统计", type: "button" },
              "sso.referral-relation.read": { label: "查看推荐关系", type: "button" },
              "sso.referral-relation.delete": { label: "删除推荐关系", type: "button" },
            },
          },
          "menu.sso-sms": {
            label: "短信验证",
            type: "menu",
            children: {
              "sso.sms-code.read": { label: "查看短信码", type: "button" },
              "sso.sms-code.delete": { label: "删除短信码", type: "button" },
            },
          },
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
      "menu.tag-index": {
        label: "标签索引",
        type: "menu",
        children: {
          "tag.tag-index.read": { label: "查看", type: "button" },
          "tag.tag-index.create": { label: "创建", type: "button" },
          "tag.tag-index.update": { label: "编辑", type: "button" },
          "tag.tag-index.delete": { label: "删除", type: "button" },
        },
      },
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
      "menu.studio-collect": {
        label: "内容采集",
        type: "menu",
        children: {
          "studio.article-draft.read": { label: "查看文章草稿", type: "button" },
          "studio.article-draft.create": { label: "创建草稿", type: "button" },
          "studio.article-draft.update": { label: "编辑草稿", type: "button" },
          "studio.article-draft.delete": { label: "删除草稿", type: "button" },
          "studio.collect-source.read": { label: "查看采集源", type: "button" },
          "studio.collect-source.create": { label: "创建采集源", type: "button" },
          "studio.collect-source.update": { label: "编辑采集源", type: "button" },
          "studio.collect-source.delete": { label: "删除采集源", type: "button" },
          "studio.collect-task.read": { label: "查看采集任务", type: "button" },
          "studio.collect-task.create": { label: "创建采集任务", type: "button" },
          "studio.collect-task.update": { label: "编辑采集任务", type: "button" },
          "studio.collect-task.delete": { label: "删除采集任务", type: "button" },
          "studio.knowledge-point-index.read": { label: "查看知识索引", type: "button" },
          "studio.knowledge-point-index.create": { label: "创建知识索引", type: "button" },
          "studio.knowledge-point-index.update": { label: "编辑知识索引", type: "button" },
          "studio.knowledge-point-index.delete": { label: "删除知识索引", type: "button" },
        },
      },
      "menu.studio-publish": {
        label: "多平台发布",
        type: "menu",
        children: {
          "studio.publish-platform.read": { label: "查看发布平台", type: "button" },
          "studio.publish-platform.create": { label: "创建发布平台", type: "button" },
          "studio.publish-platform.update": { label: "编辑发布平台", type: "button" },
          "studio.publish-platform.delete": { label: "删除发布平台", type: "button" },
          "studio.publish-account.read": { label: "查看发布账号", type: "button" },
          "studio.publish-account.create": { label: "创建发布账号", type: "button" },
          "studio.publish-account.update": { label: "编辑发布账号", type: "button" },
          "studio.publish-account.delete": { label: "删除发布账号", type: "button" },
          "studio.publish-record.read": { label: "查看发布记录", type: "button" },
          "studio.publish-record.delete": { label: "删除发布记录", type: "button" },
        },
      },
      "menu.studio-stats": {
        label: "数据分析",
        type: "menu",
        children: {
          "studio.stat-summary.read": { label: "查看统计", type: "button" },
          "studio.stat-summary.export": { label: "导出统计", type: "button" },
          "studio.browser-log.read": { label: "查看浏览日志", type: "button" },
          "studio.browser-log.export": { label: "导出浏览日志", type: "button" },
        },
      },
      "menu.studio-ad": {
        label: "广告位",
        type: "menu",
        children: {
          "studio.ad-slot.read": { label: "查看广告位", type: "button" },
          "studio.ad-slot.create": { label: "创建广告位", type: "button" },
          "studio.ad-slot.update": { label: "编辑广告位", type: "button" },
          "studio.ad-slot.delete": { label: "删除广告位", type: "button" },
        },
      },
    },
  },
  "menu.website-center": {
    label: "官网中心",
    type: "menu",
    children: {
      "menu.website-seo": {
        label: "SEO 配置",
        type: "menu",
        children: {
          "seo-config.read": { label: "查看 SEO", type: "button" },
          "seo-config.update": { label: "编辑 SEO", type: "button" },
        },
      },
      "menu.website-brand": {
        label: "品牌信息",
        type: "menu",
        children: {
          "brand-info.read": { label: "查看品牌", type: "button" },
          "brand-info.update": { label: "编辑品牌", type: "button" },
        },
      },
      "menu.website-article": {
        label: "文章管理",
        type: "menu",
        children: {
          "article.read": { label: "查看文章", type: "button" },
          "article.create": { label: "新增文章", type: "button" },
          "article.update": { label: "编辑文章", type: "button" },
          "article.delete": { label: "删除文章", type: "button" },
          "article.publish": { label: "发布文章", type: "button" },
        },
      },
      "menu.website-article-category": {
        label: "文章分类",
        type: "menu",
        children: {
          "article-category.read": { label: "查看分类", type: "button" },
          "article-category.create": { label: "新增分类", type: "button" },
          "article-category.update": { label: "编辑分类", type: "button" },
          "article-category.delete": { label: "删除分类", type: "button" },
        },
      },
      "menu.website-product": {
        label: "产品管理",
        type: "menu",
        children: {
          "product.read": { label: "查看产品", type: "button" },
          "product.create": { label: "新增产品", type: "button" },
          "product.update": { label: "编辑产品", type: "button" },
          "product.delete": { label: "删除产品", type: "button" },
        },
      },
      "menu.website-case": {
        label: "案例管理",
        type: "menu",
        children: {
          "case.read": { label: "查看案例", type: "button" },
          "case.create": { label: "新增案例", type: "button" },
          "case.update": { label: "编辑案例", type: "button" },
          "case.delete": { label: "删除案例", type: "button" },
        },
      },
      "menu.website-compliance": {
        label: "合规公示",
        type: "menu",
        children: {
          "compliance.read": { label: "查看合规", type: "button" },
          "compliance.create": { label: "新增合规", type: "button" },
          "compliance.update": { label: "编辑合规", type: "button" },
          "compliance.delete": { label: "删除合规", type: "button" },
        },
      },
      "menu.website-faq": {
        label: "FAQ 管理",
        type: "menu",
        children: {
          "faq.read": { label: "查看 FAQ", type: "button" },
          "faq.create": { label: "新增 FAQ", type: "button" },
          "faq.update": { label: "编辑 FAQ", type: "button" },
          "faq.delete": { label: "删除 FAQ", type: "button" },
        },
      },
      "menu.website-tutorial": {
        label: "教程管理",
        type: "menu",
        children: {
          "tutorial.read": { label: "查看教程", type: "button" },
          "tutorial.create": { label: "新增教程", type: "button" },
          "tutorial.update": { label: "编辑教程", type: "button" },
          "tutorial.delete": { label: "删除教程", type: "button" },
        },
      },
      "menu.website-download": {
        label: "下载管理",
        type: "menu",
        children: {
          "download.read": { label: "查看下载", type: "button" },
          "download.create": { label: "新增下载", type: "button" },
          "download.update": { label: "编辑下载", type: "button" },
          "download.delete": { label: "删除下载", type: "button" },
        },
      },
      "menu.website-lead": {
        label: "线索管理",
        type: "menu",
        children: {
          "lead.read": { label: "查看线索", type: "button" },
          "lead.update": { label: "更新线索", type: "button" },
          "lead.delete": { label: "删除线索", type: "button" },
        },
      },
      "menu.website-visit-log": {
        label: "访问日志",
        type: "menu",
        children: {
          "visit-log.read": { label: "查看日志", type: "button" },
          "visit-log.delete": { label: "删除日志", type: "button" },
        },
      },
      "menu.website-interaction": {
        label: "互动记录",
        type: "menu",
        children: {
          "interaction.read": { label: "查看互动", type: "button" },
          "interaction.delete": { label: "删除互动", type: "button" },
        },
      },
      "menu.website-search-log": {
        label: "搜索日志",
        type: "menu",
        children: {
          "search-log.read": { label: "查看搜索日志", type: "button" },
          "search-log.delete": { label: "删除搜索日志", type: "button" },
        },
      },
      "menu.website-knowledge-entity": {
        label: "知识实体",
        type: "menu",
        children: {
          "knowledge-entity.read": { label: "查看实体", type: "button" },
          "knowledge-entity.create": { label: "新增实体", type: "button" },
          "knowledge-entity.update": { label: "编辑实体", type: "button" },
          "knowledge-entity.delete": { label: "删除实体", type: "button" },
          "knowledge-entity.manage": { label: "实体管理", type: "button" },
        },
      },
      "menu.website-knowledge-relation": {
        label: "知识关系",
        type: "menu",
        children: {
          "knowledge-relation.read": { label: "查看关系", type: "button" },
          "knowledge-relation.create": { label: "新增关系", type: "button" },
          "knowledge-relation.update": { label: "编辑关系", type: "button" },
          "knowledge-relation.delete": { label: "删除关系", type: "button" },
        },
      },
      "menu.website-ai-summary": {
        label: "AI 摘要",
        type: "menu",
        children: {
          "ai-summary.read": { label: "查看摘要", type: "button" },
          "ai-summary.create": { label: "新增摘要", type: "button" },
          "ai-summary.update": { label: "编辑摘要", type: "button" },
          "ai-summary.delete": { label: "删除摘要", type: "button" },
        },
      },
      "menu.website-first-truth": {
        label: "第一真值",
        type: "menu",
        children: {
          "first-truth.read": { label: "查看真值", type: "button" },
          "first-truth.create": { label: "新增真值", type: "button" },
          "first-truth.update": { label: "编辑真值", type: "button" },
          "first-truth.delete": { label: "删除真值", type: "button" },
          "first-truth.manage": { label: "真值管理", type: "button" },
        },
      },
    },
  },
  "menu.logistics-center": {
    label: "物流中心",
    type: "menu",
    children: {
      "menu.logistics-quote": {
        label: "询价管理",
        type: "menu",
        children: {
          "logistics.quote-request.read": { label: "查看询价单", type: "button" },
          "logistics.quote-request.create": { label: "新增询价单", type: "button" },
          "logistics.quote-request.update": { label: "编辑询价单", type: "button" },
          "logistics.quote-request.delete": { label: "删除询价单", type: "button" },
          "logistics.quote-field-rule.read": { label: "查看字段规则", type: "button" },
          "logistics.quote-field-rule.create": { label: "新增字段规则", type: "button" },
          "logistics.quote-field-rule.update": { label: "编辑字段规则", type: "button" },
          "logistics.quote-field-rule.delete": { label: "删除字段规则", type: "button" },
          "logistics.quote-price-rule.read": { label: "查看报价规则", type: "button" },
          "logistics.quote-price-rule.create": { label: "新增报价规则", type: "button" },
          "logistics.quote-price-rule.update": { label: "编辑报价规则", type: "button" },
          "logistics.quote-price-rule.delete": { label: "删除报价规则", type: "button" },
          "logistics.quote-price-formula.read": { label: "查看报价公式", type: "button" },
          "logistics.quote-price-formula.create": { label: "新增公式", type: "button" },
          "logistics.quote-price-formula.update": { label: "编辑公式", type: "button" },
          "logistics.quote-price-formula.delete": { label: "删除公式", type: "button" },
        },
      },
      "menu.logistics-tracking": {
        label: "货物追踪",
        type: "menu",
        children: {
          "logistics.tracking-shipment.read": { label: "查看运单", type: "button" },
          "logistics.tracking-shipment.create": { label: "新增运单", type: "button" },
          "logistics.tracking-shipment.update": { label: "编辑运单", type: "button" },
          "logistics.tracking-shipment.delete": { label: "删除运单", type: "button" },
          "logistics.tracking-node.read": { label: "查看追踪节点", type: "button" },
          "logistics.tracking-node.create": { label: "新增节点", type: "button" },
          "logistics.tracking-node.update": { label: "编辑节点", type: "button" },
          "logistics.tracking-node.delete": { label: "删除节点", type: "button" },
          "logistics.tracking-provider.read": { label: "查看追踪配置", type: "button" },
          "logistics.tracking-provider.create": { label: "新增追踪配置", type: "button" },
          "logistics.tracking-provider.update": { label: "编辑追踪配置", type: "button" },
          "logistics.tracking-provider.delete": { label: "删除追踪配置", type: "button" },
        },
      },
      "menu.logistics-contact": {
        label: "联系渠道",
        type: "menu",
        children: {
          "logistics.contact-matrix.read": { label: "查看渠道矩阵", type: "button" },
          "logistics.contact-matrix.create": { label: "新增渠道矩阵", type: "button" },
          "logistics.contact-matrix.update": { label: "编辑渠道矩阵", type: "button" },
          "logistics.contact-matrix.delete": { label: "删除渠道矩阵", type: "button" },
        },
      },
      "menu.logistics-review": {
        label: "客户评价",
        type: "menu",
        children: {
          "logistics.review.read": { label: "查看评价", type: "button" },
          "logistics.review.create": { label: "新增评价", type: "button" },
          "logistics.review.update": { label: "编辑评价", type: "button" },
          "logistics.review.delete": { label: "删除评价", type: "button" },
          "logistics.review.approve": { label: "审核评价", type: "button" },
        },
      },
      "menu.logistics-subscription": {
        label: "通知订阅",
        type: "menu",
        children: {
          "logistics.subscription.read": { label: "查看订阅", type: "button" },
          "logistics.subscription.update": { label: "更新订阅", type: "button" },
          "logistics.subscription.delete": { label: "删除订阅", type: "button" },
        },
      },
      "menu.logistics-landing": {
        label: "落地页",
        type: "menu",
        children: {
          "logistics.landing-page.read": { label: "查看落地页", type: "button" },
          "logistics.landing-page.create": { label: "新增落地页", type: "button" },
          "logistics.landing-page.update": { label: "编辑落地页", type: "button" },
          "logistics.landing-page.delete": { label: "删除落地页", type: "button" },
        },
      },
      "menu.logistics-funnel": {
        label: "转化漏斗",
        type: "menu",
        children: {
          "logistics.conversion-funnel.read": { label: "查看漏斗", type: "button" },
          "logistics.conversion-funnel.create": { label: "新增漏斗", type: "button" },
          "logistics.conversion-funnel.update": { label: "编辑漏斗", type: "button" },
          "logistics.conversion-funnel.delete": { label: "删除漏斗", type: "button" },
          "logistics.conversion-event.read": { label: "查看事件", type: "button" },
          "logistics.funnel-stats.read": { label: "查看漏斗统计", type: "button" },
        },
      },
      "menu.logistics-order": {
        label: "意向订单",
        type: "menu",
        children: {
          "logistics.intent-order.read": { label: "查看订单", type: "button" },
          "logistics.intent-order.create": { label: "新增订单", type: "button" },
          "logistics.intent-order.update": { label: "编辑订单", type: "button" },
          "logistics.intent-order.delete": { label: "删除订单", type: "button" },
          "logistics.intent-order.convert": { label: "标记转化", type: "button" },
        },
      },
      "menu.logistics-referral": {
        label: "推荐奖励",
        type: "menu",
        children: {
          "logistics.referral.read": { label: "查看推荐", type: "button" },
          "logistics.referral.create": { label: "新增推荐", type: "button" },
          "logistics.referral.update": { label: "编辑推荐", type: "button" },
          "logistics.referral.delete": { label: "删除推荐", type: "button" },
          "logistics.referral-stats.read": { label: "查看推荐统计", type: "button" },
        },
      },
      "menu.logistics-customer": {
        label: "客户档案",
        type: "menu",
        children: {
          "logistics.customer-profile.read": { label: "查看档案", type: "button" },
          "logistics.customer-profile.update": { label: "编辑档案", type: "button" },
          "logistics.customer-profile.delete": { label: "删除档案", type: "button" },
          "logistics.customer-profile.merge": { label: "合并档案", type: "button" },
        },
      },
    },
  },
  // ===== 理财中心 =====
  "menu.wealth-center": {
    label: "理财中心",
    type: "menu",
    children: {
      "menu.wealth-product": {
        label: "产品管理",
        type: "menu",
        children: {
          "wealth.wealth-product.read": { label: "查看", type: "button" },
          "wealth.wealth-product.create": { label: "创建", type: "button" },
          "wealth.wealth-product.update": { label: "编辑", type: "button" },
          "wealth.wealth-product.delete": { label: "删除", type: "button" },
          "wealth.wealth-product.collect": { label: "采集", type: "button" },
          "wealth.wealth-nav.read": { label: "查看净值", type: "button" },
          "wealth.wealth-nav.create": { label: "录入净值", type: "button" },
          "wealth.wealth-nav.update": { label: "编辑净值", type: "button" },
          "wealth.wealth-nav.delete": { label: "删除净值", type: "button" },
        },
      },
      "menu.wealth-company": {
        label: "公司管理",
        type: "menu",
        children: {
          "wealth.wealth-company.read": { label: "查看", type: "button" },
          "wealth.wealth-company.create": { label: "创建", type: "button" },
          "wealth.wealth-company.update": { label: "编辑", type: "button" },
          "wealth.wealth-company.delete": { label: "删除", type: "button" },
        },
      },
      "menu.wealth-collect": {
        label: "数据采集",
        type: "menu",
        children: {
          "wealth.wealth-collect-config.read": { label: "查看配置", type: "button" },
          "wealth.wealth-collect-config.create": { label: "创建配置", type: "button" },
          "wealth.wealth-collect-config.update": { label: "编辑配置", type: "button" },
          "wealth.wealth-collect-config.delete": { label: "删除配置", type: "button" },
          "wealth.wealth-collect-config.trigger": { label: "触发采集", type: "button" },
          "wealth.wealth-customer-product.read": { label: "查看持仓", type: "button" },
          "wealth.wealth-customer-product.create": { label: "录入持仓", type: "button" },
          "wealth.wealth-customer-product.delete": { label: "删除持仓", type: "button" },
        },
      },
      "menu.wealth-metrics": {
        label: "风险指标",
        type: "menu",
        children: {
          "wealth.wealth-risk-metric.read": { label: "查看风险", type: "button" },
          "wealth.wealth-risk-metric.update": { label: "编辑风险", type: "button" },
          "wealth.wealth-risk-metric.aggregate": { label: "聚合统计", type: "button" },
          "wealth.wealth-risk-metric.trend": { label: "趋势分析", type: "button" },
          "wealth.wealth-risk-metric.peers": { label: "同业对比", type: "button" },
          "wealth.wealth-risk-metric.recalculate": { label: "重算指标", type: "button" },
          "wealth.wealth-recommend-config.read": { label: "查看推荐配置", type: "button" },
          "wealth.wealth-recommend-config.create": { label: "创建推荐配置", type: "button" },
          "wealth.wealth-recommend-config.update": { label: "编辑推荐配置", type: "button" },
          "wealth.wealth-recommend-config.delete": { label: "删除推荐配置", type: "button" },
          "wealth.wealth-annual-snapshot.read": { label: "查看年报", type: "button" },
          "wealth.wealth-annual-snapshot.update": { label: "编辑年报", type: "button" },
          "wealth.wealth-yearly-return.read": { label: "查看年化收益", type: "button" },
          "wealth.wealth-yearly-return.update": { label: "编辑年化收益", type: "button" },
          "wealth.wealth-money-income.read": { label: "查看收益分配", type: "button" },
          "wealth.wealth-money-income.update": { label: "编辑收益分配", type: "button" },
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

/** 提取指定中心的全部权限 key（含中心 menu key 自身）*/
export function centerPermissions(centerKey: string): string[] {
  const center = PERMISSION_TREE[centerKey];
  if (!center?.children) return [];
  return [centerKey, ...flattenPermissions(center.children)];
}

/** 提取指定中心的编辑权限（排除 delete/manage）*/
export function centerEditorPermissions(centerKey: string): string[] {
  return centerPermissions(centerKey).filter(
    (k) => !k.endsWith(".delete") && !k.endsWith(".manage")
  );
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
    // 官网中心
    "menu.website-center",
    "menu.website-seo", "seo-config.read", "seo-config.update",
    "menu.website-brand", "brand-info.read", "brand-info.update",
    "menu.website-article", "article.read", "article.create", "article.update", "article.publish",
    "menu.website-article-category", "article-category.read", "article-category.create", "article-category.update", "article-category.delete",
    "menu.website-product", "product.read", "product.create", "product.update", "product.delete",
    "menu.website-case", "case.read", "case.create", "case.update", "case.delete",
    "menu.website-compliance", "compliance.read", "compliance.create", "compliance.update",
    "menu.website-faq", "faq.read", "faq.create", "faq.update", "faq.delete",
    "menu.website-tutorial", "tutorial.read", "tutorial.create", "tutorial.update", "tutorial.delete",
    "menu.website-download", "download.read", "download.create", "download.update", "download.delete",
    "menu.website-lead", "lead.read", "lead.update", "lead.delete",
    "menu.website-visit-log", "visit-log.read",
    "menu.website-interaction", "interaction.read",
    "menu.website-search-log", "search-log.read",
    "menu.website-knowledge-entity", "knowledge-entity.read", "knowledge-entity.create", "knowledge-entity.update", "knowledge-entity.delete",
    "menu.website-knowledge-relation", "knowledge-relation.read", "knowledge-relation.create", "knowledge-relation.update", "knowledge-relation.delete",
    "menu.website-ai-summary", "ai-summary.read", "ai-summary.create", "ai-summary.update", "ai-summary.delete",
    "menu.website-first-truth", "first-truth.read", "first-truth.create", "first-truth.update", "first-truth.delete",
    // 物流中心权限由上方 flattenPermissions(PERMISSION_TREE) 自动包含（仅排除 system-center）
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
    // 官网中心（read/create/update，不含 delete/manage）
    "menu.website-center",
    "menu.website-seo", "seo-config.read",
    "menu.website-brand", "brand-info.read",
    "menu.website-article", "article.read", "article.create", "article.update",
    "menu.website-article-category", "article-category.read", "article-category.create", "article-category.update",
    "menu.website-product", "product.read", "product.create", "product.update",
    "menu.website-case", "case.read", "case.create", "case.update",
    "menu.website-compliance", "compliance.read", "compliance.create", "compliance.update",
    "menu.website-faq", "faq.read", "faq.create", "faq.update",
    "menu.website-tutorial", "tutorial.read", "tutorial.create", "tutorial.update",
    "menu.website-download", "download.read", "download.create", "download.update",
    "menu.website-lead", "lead.read", "lead.update",
    "menu.website-visit-log", "visit-log.read",
    "menu.website-interaction", "interaction.read",
    "menu.website-search-log", "search-log.read",
    "menu.website-knowledge-entity", "knowledge-entity.read",
    "menu.website-knowledge-relation", "knowledge-relation.read",
    "menu.website-ai-summary", "ai-summary.read", "ai-summary.create",
    "menu.website-first-truth", "first-truth.read",
    // 物流中心（read/create/update，不含 delete）
    "menu.logistics-center",
    "menu.logistics-quote",
    "logistics.quote-request.read", "logistics.quote-request.create", "logistics.quote-request.update",
    "logistics.quote-field-rule.read", "logistics.quote-field-rule.create", "logistics.quote-field-rule.update",
    "logistics.quote-price-rule.read", "logistics.quote-price-rule.create", "logistics.quote-price-rule.update",
    "logistics.quote-price-formula.read",
    "menu.logistics-tracking",
    "logistics.tracking-shipment.read", "logistics.tracking-shipment.create", "logistics.tracking-shipment.update",
    "logistics.tracking-node.read",
    "logistics.tracking-provider.read",
    "menu.logistics-contact",
    "logistics.contact-matrix.read", "logistics.contact-matrix.create", "logistics.contact-matrix.update",
    "menu.logistics-review",
    "logistics.review.read", "logistics.review.create", "logistics.review.update",
    "menu.logistics-subscription",
    "logistics.subscription.read",
    "menu.logistics-landing",
    "logistics.landing-page.read", "logistics.landing-page.create", "logistics.landing-page.update",
    "menu.logistics-funnel",
    "logistics.conversion-funnel.read",
    "logistics.funnel-stats.read",
    "logistics.conversion-event.read",
    "menu.logistics-order",
    "logistics.intent-order.read", "logistics.intent-order.create", "logistics.intent-order.update",
    "menu.logistics-referral",
    "logistics.referral.read",
    "logistics.referral-stats.read",
    "menu.logistics-customer",
    "logistics.customer-profile.read", "logistics.customer-profile.update",
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
    // 官网中心（只读）
    "menu.website-center",
    "menu.website-brand", "brand-info.read",
    "menu.website-article", "article.read",
    "menu.website-product", "product.read",
    "menu.website-case", "case.read",
    "menu.website-compliance", "compliance.read",
    "menu.website-faq", "faq.read",
    "menu.website-tutorial", "tutorial.read",
    "menu.website-download", "download.read",
    "menu.website-lead", "lead.read",
    // 物流中心（只读）
    "menu.logistics-center",
    "menu.logistics-quote",
    "logistics.quote-request.read",
    "logistics.quote-field-rule.read",
    "logistics.quote-price-rule.read",
    "menu.logistics-tracking",
    "logistics.tracking-shipment.read",
    "logistics.tracking-node.read",
    "menu.logistics-contact",
    "logistics.contact-matrix.read",
    "menu.logistics-review",
    "logistics.review.read",
    "menu.logistics-landing",
    "logistics.landing-page.read",
  ],
  [ROLES.USER]: [],
};
