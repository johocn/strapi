# 创建 zhao-quiz Schema 文件和 Server 核心文件
$root = "e:\code\plugins\zhao-quiz"

# ────────────────────────────────────────────
# SCHEMA: quiz
# ────────────────────────────────────────────
@"
{
  "kind": "collectionType",
  "collectionName": "zhao_quizzes",
  "info": {
    "singularName": "quiz",
    "pluralName": "quizzes",
    "displayName": "题目"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "title": {
      "type": "richtext",
      "required": true
    },
    "type": {
      "type": "enumeration",
      "enum": ["single_choice","multiple_choice","true_false","fill_blank","short_answer","matching","ordering"],
      "required": true
    },
    "options": {
      "type": "json"
    },
    "answer": {
      "type": "text"
    },
    "explanation": {
      "type": "richtext"
    },
    "difficulty": {
      "type": "enumeration",
      "enum": ["easy","medium","hard"],
      "default": "medium"
    },
    "points": {
      "type": "integer",
      "default": 0
    },
    "sort": {
      "type": "integer",
      "default": 0
    },
    "isPublished": {
      "type": "boolean",
      "default": false
    },
    "course": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course",
      "inversedBy": "quizzes"
    },
    "lesson": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course-lesson",
      "inversedBy": "quizzes"
    },
    "knowledgePoints": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-course.knowledge-point",
      "inversedBy": "quizzes"
    }
  }
}
"@ | Set-Content -Path "$root\server\src\content-types\quiz\schema.json" -Encoding UTF8

# ────────────────────────────────────────────
# SCHEMA: quiz-record
# ────────────────────────────────────────────
@"
{
  "kind": "collectionType",
  "collectionName": "zhao_quiz_records",
  "info": {
    "singularName": "quiz-record",
    "pluralName": "quiz-records",
    "displayName": "答题记录"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "quiz": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-quiz.quiz"
    },
    "answer": {
      "type": "json"
    },
    "isCorrect": {
      "type": "boolean"
    },
    "score": {
      "type": "decimal",
      "precision": 5,
      "scale": 2,
      "default": 0
    },
    "totalPoints": {
      "type": "integer",
      "default": 0
    },
    "submittedAt": {
      "type": "datetime"
    },
    "duration": {
      "type": "integer",
      "default": 0
    },
    "course": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course"
    },
    "lesson": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course-lesson"
    }
  }
}
"@ | Set-Content -Path "$root\server\src\content-types\quiz-record\schema.json" -Encoding UTF8

# ────────────────────────────────────────────
# SCHEMA: quiz-exam
# ────────────────────────────────────────────
@"
{
  "kind": "collectionType",
  "collectionName": "zhao_quiz_exams",
  "info": {
    "singularName": "quiz-exam",
    "pluralName": "quiz-exams",
    "displayName": "测验配置"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "description": {
      "type": "text"
    },
    "timeLimit": {
      "type": "integer",
      "default": 0
    },
    "passScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2,
      "default": 60
    },
    "totalPoints": {
      "type": "integer",
      "default": 0
    },
    "questionCount": {
      "type": "integer",
      "default": 0
    },
    "randomOrder": {
      "type": "boolean",
      "default": false
    },
    "allowRetry": {
      "type": "boolean",
      "default": true
    },
    "maxAttempts": {
      "type": "integer",
      "default": 0
    },
    "showResult": {
      "type": "boolean",
      "default": true
    },
    "course": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course",
      "inversedBy": "exams"
    },
    "lesson": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course-lesson",
      "inversedBy": "exams"
    },
    "questions": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-quiz.quiz",
      "inversedBy": "exams"
    }
  }
}
"@ | Set-Content -Path "$root\server\src\content-types\quiz-exam\schema.json" -Encoding UTF8

# ────────────────────────────────────────────
# SCHEMA: quiz-exam-attempt
# ────────────────────────────────────────────
@"
{
  "kind": "collectionType",
  "collectionName": "zhao_quiz_exam_attempts",
  "info": {
    "singularName": "quiz-exam-attempt",
    "pluralName": "quiz-exam-attempts",
    "displayName": "考试记录"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "exam": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-quiz.quiz-exam"
    },
    "answers": {
      "type": "json"
    },
    "totalScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2,
      "default": 0
    },
    "isPassed": {
      "type": "boolean"
    },
    "startedAt": {
      "type": "datetime"
    },
    "submittedAt": {
      "type": "datetime"
    },
    "duration": {
      "type": "integer",
      "default": 0
    },
    "attemptNumber": {
      "type": "integer",
      "default": 1
    }
  }
}
"@ | Set-Content -Path "$root\server\src\content-types\quiz-exam-attempt\schema.json" -Encoding UTF8

# ────────────────────────────────────────────
# SCHEMA: quiz-batch
# ────────────────────────────────────────────
@"
{
  "kind": "collectionType",
  "collectionName": "zhao_quiz_batches",
  "info": {
    "singularName": "quiz-batch",
    "pluralName": "quiz-batches",
    "displayName": "批量导入"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "file": {
      "type": "media",
      "multiple": false
    },
    "templateFile": {
      "type": "media",
      "multiple": false
    },
    "totalCount": {
      "type": "integer",
      "default": 0
    },
    "successCount": {
      "type": "integer",
      "default": 0
    },
    "errorCount": {
      "type": "integer",
      "default": 0
    },
    "errors": {
      "type": "json"
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending","processing","completed","failed"],
      "default": "pending"
    },
    "course": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course"
    },
    "lesson": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course-lesson"
    }
  }
}
"@ | Set-Content -Path "$root\server\src\content-types\quiz-batch\schema.json" -Encoding UTF8

# ────────────────────────────────────────────
# content-types/index.ts
# ────────────────────────────────────────────
@"
import quiz from "./quiz/schema.json";
import quizRecord from "./quiz-record/schema.json";
import quizExam from "./quiz-exam/schema.json";
import quizExamAttempt from "./quiz-exam-attempt/schema.json";
import quizBatch from "./quiz-batch/schema.json";

export default {
  quiz: { schema: quiz },
  "quiz-record": { schema: quizRecord },
  "quiz-exam": { schema: quizExam },
  "quiz-exam-attempt": { schema: quizExamAttempt },
  "quiz-batch": { schema: quizBatch },
};
"@ | Set-Content -Path "$root\server\src\content-types\index.ts" -Encoding UTF8

# ────────────────────────────────────────────
# server/src/index.ts
# ────────────────────────────────────────────
@"
import register from "./register";
import bootstrap from "./bootstrap";
import destroy from "./destroy";
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";

export default {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
};
"@ | Set-Content -Path "$root\server\src\index.ts" -Encoding UTF8

# ────────────────────────────────────────────
# server/src/destroy.ts
# ────────────────────────────────────────────
@"
import type { Core } from "@strapi/strapi";

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  // 清理逻辑（如需）
};

export default destroy;
"@ | Set-Content -Path "$root\server\src\destroy.ts" -Encoding UTF8

# ────────────────────────────────────────────
# server/src/permissions.ts
# ────────────────────────────────────────────
@"
export const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export interface PermissionEntry {
  allowRoles: string[];
}

export type PermissionAction = \`\${string}.\${"read" | "create" | "update" | "delete"}\`;

export const PERMISSIONS: Record<PermissionAction, PermissionEntry> = {
  "quiz.read": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER] },
  "quiz.create": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR] },
  "quiz.update": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR] },
  "quiz.delete": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  "quiz-record.read": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER] },
  "quiz-record.create": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR] },
  "quiz-record.update": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR] },
  "quiz-record.delete": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  "quiz-exam.read": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER] },
  "quiz-exam.create": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR] },
  "quiz-exam.update": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR] },
  "quiz-exam.delete": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  "quiz-exam-attempt.read": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER] },
  "quiz-exam-attempt.delete": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  "quiz-batch.read": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER] },
  "quiz-batch.create": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR] },
  "quiz-batch.delete": { allowRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
};
"@ | Set-Content -Path "$root\server\src\permissions.ts" -Encoding UTF8

# ────────────────────────────────────────────
# server/src/policies/has-permission.ts
# ────────────────────────────────────────────
@"
import type { Core } from "@strapi/strapi";
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
      return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
    }
    const action = config?.action as string | undefined;
    if (!action) {
      return { passed: false, code: "MISSING_ACTION", message: "未指定权限动作" };
    }
    const permission = PERMISSIONS[action as keyof typeof PERMISSIONS];
    if (!permission) {
      strapi.log.warn(\`[zhao-quiz] 未定义的权限动作: \${action}\`);
      return { passed: false, code: "PERMISSION_NOT_FOUND", message: \`权限动作 "\${action}" 未定义\` };
    }
    const userRoles = (user.roles as string[]) || [];
    if (userRoles.length === 0) {
      return { passed: false, code: "NO_ROLES", message: "用户无角色信息" };
    }
    const hasPermission = permission.allowRoles.some((role) => userRoles.includes(role));
    if (!hasPermission) {
      return { passed: false, code: "FORBIDDEN", message: \`无权执行操作 "\${action}"\` };
    }
    return { passed: true };
  };
};

export default createHasPermission;
"@ | Set-Content -Path "$root\server\src\policies\has-permission.ts" -Encoding UTF8

# ────────────────────────────────────────────
# server/src/config/index.ts
# ────────────────────────────────────────────
@"
export default {
  default: {
    scoring: {
      difficultyMultiplier: {
        easy: 1.0,
        medium: 1.2,
        hard: 1.5,
      },
      partialScore: {
        multipleChoice: 0.5,
        matching: true,
      },
    },
    batch: {
      maxFileSize: 10485760,
      allowedFormats: [".csv", ".xlsx"],
    },
    exam: {
      defaultPassScore: 60,
      defaultTimeLimit: 0,
    },
  },
  validator: (config: Record<string, unknown>) => {
    if (config.scoring && typeof config.scoring !== "object") {
      throw new Error("scoring 配置必须是对象");
    }
  },
};
"@ | Set-Content -Path "$root\server\src\config\index.ts" -Encoding UTF8

# ────────────────────────────────────────────
# server/src/register.ts
# ────────────────────────────────────────────
@"
import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const i18n = strapi.plugin("zhao-common").service("i18n");
    i18n.setMessages({
      QUIZ_001: "题目不存在",
      QUIZ_002: "无权访问该题目",
      QUIZ_003: "答题参数错误",
      QUIZ_004: "考试不存在",
      QUIZ_005: "考试次数已达上限",
      QUIZ_006: "考试已超时",
      QUIZ_007: "批量导入格式错误",
      QUIZ_008: "文件解析失败",
      QUIZ_009: "用户答案错误格式",
      QUIZ_010: "积分领取成功",
    });
  } catch {
    // zhao-common 插件未启用时静默忽略
  }
};

export default register;
"@ | Set-Content -Path "$root\server\src\register.ts" -Encoding UTF8

# ────────────────────────────────────────────
# server/src/bootstrap.ts
# ────────────────────────────────────────────
@"
import type { Core } from "@strapi/strapi";
import createHasPermission from "./policies/has-permission";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const authService = strapi.plugin("zhao-auth").service("auth");
    (authService as any).registerPolicy("has-permission", createHasPermission(strapi));
    strapi.log.info("zhao-quiz: has-permission 策略已注册到 zhao-auth");
  } catch {
    strapi.log.warn("zhao-quiz: zhao-auth 插件未启用，权限策略未注册");
  }
};

export default bootstrap;
"@ | Set-Content -Path "$root\server\src\bootstrap.ts" -Encoding UTF8

Write-Host "Schema + Server core files created successfully"
