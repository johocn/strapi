"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const register = ({ strapi }) => {
  try {
    const zhaoCommon = strapi.plugin("zhao-common");
    if (!zhaoCommon) {
      strapi.log.warn("zhao-course: zhao-common 插件未启用，i18n 未注册");
      return;
    }
    const i18n = zhaoCommon.service("i18n");
    if (!i18n || typeof i18n.setMessages !== "function") {
      strapi.log.warn("zhao-course: zhao-common i18n 服务不可用");
      return;
    }
    i18n.setMessages({
      COURSE_001: "课程不存在 (id={courseId})",
      COURSE_002: "课程未启用积分",
      COURSE_003: "课程积分已领取",
      COURSE_004: "课程未完成，无法领取积分",
      COURSE_005: "无权访问该课程",
      COURSE_006: "课程授权已过期",
      COURSE_007: "课程为收费课程，请先购买",
      COURSE_008: "无可领取课程积分",
      LESSON_001: "课时不存在 (id={lessonId})",
      LESSON_002: "课时未启用积分",
      LESSON_003: "课时积分已领取",
      LESSON_004: "课时未完成，无法领取积分",
      LESSON_005: "课时需答题才能获得积分",
      LESSON_006: "答题错误，无法获得积分",
      LESSON_007: "无可领取课时积分",
      PROGRESS_001: "学习进度记录不存在",
      PROGRESS_002: "非法进度上报"
    });
  } catch (err) {
    strapi.log.warn("zhao-course: i18n 注册失败", err);
  }
  strapi.log.info("zhao-course: 插件已加载，路由配置已注册");
};
const bootstrap = async ({ strapi }) => {
  strapi.log.info("zhao-course: 插件已加载，路由配置已注册");
  try {
    const courseService = strapi.plugin("zhao-course").service("course");
    if (courseService?.listChannelConfigInvalid) {
      const invalid = await courseService.listChannelConfigInvalid();
      if (invalid.length > 0) {
        strapi.log.warn(
          `[zhao-course] 检测到 ${invalid.length} 个课程渠道配置异常（specific + channelIds 非空 + pointChannel 为空）：`
        );
        for (const c of invalid) {
          strapi.log.warn(
            `  - course.documentId=${c.documentId} title=${c.title} channelIds=${JSON.stringify(c.channelIds)} pointChannel=${c.pointChannel}`
          );
        }
      } else {
        strapi.log.info("[zhao-course] 渠道配置巡检通过：所有 specific 课程均已设置 pointChannel");
      }
    }
  } catch (e) {
    strapi.log.error(`[zhao-course] 渠道配置巡检失败: ${e instanceof Error ? e.message : String(e)}`);
  }
};
const destroy = ({ strapi: _strapi }) => {
};
const config = {
  default: {
    // 课程插件默认配置
    points: {
      // 积分相关默认配置
      autoClaim: false
      // 是否自动领取积分
    }
  },
  validator: (config2) => {
    if (config2.points && typeof config2.points !== "object") {
      throw new Error("points 配置必须是对象");
    }
  }
};
const kind$5 = "collectionType";
const collectionName$5 = "zhao_course_categories";
const info$5 = { "singularName": "course-category", "pluralName": "course-categories", "displayName": "课程分类" };
const options$5 = { "draftAndPublish": false };
const attributes$5 = { "name": { "type": "string", "required": true }, "description": { "type": "text" }, "sort": { "type": "integer", "default": 0 }, "courses": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-course.course", "mappedBy": "category" }, "channelScope": { "type": "enumeration", "enum": ["all", "specific"], "default": "all" }, "channelIds": { "type": "json", "default": "[]" }, "allowCrossChannel": { "type": "boolean", "default": true }, "deletedAt": { "type": "datetime", "default": null } };
const courseCategory$2 = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  attributes: attributes$5
};
const kind$4 = "collectionType";
const collectionName$4 = "zhao_courses";
const info$4 = { "singularName": "course", "pluralName": "courses", "displayName": "课程" };
const options$4 = { "draftAndPublish": true };
const attributes$4 = { "title": { "type": "string", "required": true }, "slug": { "type": "uid", "targetField": "title", "required": false }, "description": { "type": "text" }, "cover": { "type": "media", "multiple": false, "required": false }, "thumbnail": { "type": "media", "multiple": false, "required": false }, "author": { "type": "string" }, "difficulty": { "type": "enumeration", "enum": ["beginner", "intermediate", "advanced", "expert"], "default": "beginner" }, "duration": { "type": "string" }, "level": { "type": "enumeration", "enum": ["introductory", "foundation", "advanced", "professional"], "default": "introductory" }, "language": { "type": "enumeration", "enum": ["zh-CN", "zh-TW", "en-US", "ja-JP", "ko-KR"], "default": "zh-CN" }, "keywords": { "type": "json" }, "studentCount": { "type": "integer", "default": 0 }, "viewCount": { "type": "integer", "default": 0 }, "likeCount": { "type": "integer", "default": 0 }, "isFeatured": { "type": "boolean", "default": false }, "isFree": { "type": "boolean", "default": false }, "originalPrice": { "type": "decimal", "precision": 10, "scale": 2, "default": 0 }, "discountPrice": { "type": "decimal", "precision": 10, "scale": 2, "default": 0 }, "enrollStartDate": { "type": "datetime" }, "enrollEndDate": { "type": "datetime" }, "courseStartDate": { "type": "datetime" }, "courseEndDate": { "type": "datetime" }, "publishDate": { "type": "datetime" }, "status": { "type": "enumeration", "enum": ["draft", "pending", "published", "archived"], "default": "draft" }, "auditStatus": { "type": "enumeration", "enum": ["pending", "approved", "rejected"], "default": "pending" }, "rating": { "type": "decimal", "precision": 3, "scale": 1, "default": 0 }, "ratingCount": { "type": "integer", "default": 0 }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course-category", "inversedBy": "courses" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag" }, "lessons": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-course.course-lesson", "mappedBy": "course" }, "quizzes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-quiz.quiz", "mappedBy": "course" }, "exams": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-quiz.quiz-exam", "mappedBy": "course" }, "sort": { "type": "integer", "default": 0 }, "enablePoints": { "type": "boolean", "default": false }, "points": { "type": "integer", "default": 0 }, "pointsType": { "type": "enumeration", "enum": ["course_points", "lesson_points"], "default": "course_points" }, "isPaid": { "type": "boolean", "default": false }, "price": { "type": "decimal", "precision": 10, "scale": 2, "default": 0 }, "channelScope": { "type": "enumeration", "enum": ["all", "specific"], "default": "all" }, "channelIds": { "type": "json", "default": "[]" }, "allowCrossChannel": { "type": "boolean", "default": true }, "pointChannel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "deletedAt": { "type": "datetime", "default": null } };
const course$2 = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "zhao_course_lessons";
const info$3 = { "singularName": "course-lesson", "pluralName": "course-lessons", "displayName": "课时" };
const options$3 = { "draftAndPublish": false };
const attributes$3 = { "title": { "type": "string", "required": true }, "slug": { "type": "uid", "targetField": "title", "required": false }, "type": { "type": "enumeration", "enum": ["video", "audio", "article", "quiz"], "default": "video" }, "thumbnail": { "type": "media", "multiple": false, "required": false }, "summary": { "type": "text" }, "content": { "type": "richtext" }, "video_url": { "type": "string" }, "audio_url": { "type": "string" }, "images": { "type": "media", "multiple": true, "required": false }, "attachments": { "type": "media", "multiple": true, "required": false }, "duration": { "type": "integer", "default": 0 }, "isFreePreview": { "type": "boolean", "default": false }, "previewDuration": { "type": "integer", "default": 0 }, "sequenceNumber": { "type": "integer", "default": 0 }, "learningObjectives": { "type": "text" }, "prerequisites": { "type": "text" }, "completionThreshold": { "type": "integer", "default": 100 }, "isRequired": { "type": "boolean", "default": true }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course", "inversedBy": "lessons" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag" }, "quizzes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-quiz.quiz", "mappedBy": "lesson" }, "exams": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-quiz.quiz-exam", "mappedBy": "lesson" }, "sort": { "type": "integer", "default": 0 }, "enablePoints": { "type": "boolean", "default": false }, "points": { "type": "integer", "default": 0 }, "pointsType": { "type": "enumeration", "enum": ["lesson_points", "quiz_points"], "default": "lesson_points" }, "deletedAt": { "type": "datetime", "default": null } };
const courseLesson$2 = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_user_course_auths";
const info$2 = { "singularName": "user-course-auth", "pluralName": "user-course-auths", "displayName": "用户课程授权" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course" }, "authType": { "type": "enumeration", "enum": ["free", "paid", "admin_grant"], "default": "free" }, "expiresAt": { "type": "datetime" }, "isExpired": { "type": "boolean", "default": false }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "deletedAt": { "type": "datetime", "default": null } };
const userCourseAuth$2 = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_course_progresses";
const info$1 = { "singularName": "course-progress", "pluralName": "course-progresses", "displayName": "课程学习记录" };
const options$1 = { "draftAndPublish": false };
const attributes$1 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course" }, "completedLessons": { "type": "integer", "default": 0 }, "totalLessons": { "type": "integer", "default": 0 }, "progress": { "type": "decimal", "precision": 5, "scale": 2, "default": 0 }, "isCompleted": { "type": "boolean", "default": false }, "pointsEarned": { "type": "integer", "default": 0 }, "isPointsClaimed": { "type": "boolean", "default": false }, "lessonPointsSummary": { "type": "json", "default": {} }, "lastStudyAt": { "type": "datetime" } };
const courseProgress$2 = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_lesson_progresses";
const info = { "singularName": "lesson-progress", "pluralName": "lesson-progresses", "displayName": "课时学习记录" };
const options = { "draftAndPublish": false };
const attributes = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "lesson": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course-lesson" }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course" }, "progress": { "type": "decimal", "precision": 5, "scale": 2, "default": 0 }, "playPosition": { "type": "integer", "default": 0 }, "duration": { "type": "integer", "default": 0 }, "isCompleted": { "type": "boolean", "default": false }, "isAnswered": { "type": "boolean", "default": false }, "isCorrect": { "type": "boolean", "default": false }, "pointsEarned": { "type": "integer", "default": 0 }, "isPointsClaimed": { "type": "boolean", "default": false }, "calculatedPoints": { "type": "integer", "default": 0 }, "quizPointsDetail": { "type": "json", "default": {} }, "lastStudyAt": { "type": "datetime" } };
const lessonProgress$2 = {
  kind,
  collectionName,
  info,
  options,
  attributes
};
const courseLifecycles = ({ strapi }) => {
  const syncTagIndex2 = async (event) => {
    const { result } = event;
    if (!result?.documentId) return;
    const tagIds = (result.tags || []).map((t) => t?.documentId).filter(Boolean);
    try {
      const service = strapi.plugin("zhao-tag")?.service("tag-index");
      if (service) {
        await service.sync("course", result.documentId, tagIds);
      }
    } catch (err) {
      strapi.log.error(`[zhao-course] Failed to sync tag-index for course ${result.documentId}: ${err}`);
    }
  };
  const removeTagIndex2 = async (event) => {
    const { result } = event;
    if (!result?.documentId) return;
    try {
      const service = strapi.plugin("zhao-tag")?.service("tag-index");
      if (service) {
        await service.remove("course", result.documentId);
      }
    } catch (err) {
      strapi.log.error(`[zhao-course] Failed to remove tag-index for course ${result.documentId}: ${err}`);
    }
  };
  return {
    async afterCreate(event) {
      await syncTagIndex2(event);
    },
    async afterUpdate(event) {
      await syncTagIndex2(event);
    },
    async afterDelete(event) {
      await removeTagIndex2(event);
    }
  };
};
const courseLessonLifecycles = ({ strapi }) => {
  const syncTagIndex2 = async (event) => {
    const { result } = event;
    if (!result?.documentId) return;
    const tagIds = (result.tags || []).map((t) => t?.documentId).filter(Boolean);
    try {
      const service = strapi.plugin("zhao-tag")?.service("tag-index");
      if (service) {
        await service.sync("lesson", result.documentId, tagIds);
      }
    } catch (err) {
      strapi.log.error(`[zhao-course] Failed to sync tag-index for lesson ${result.documentId}: ${err}`);
    }
  };
  const removeTagIndex2 = async (event) => {
    const { result } = event;
    if (!result?.documentId) return;
    try {
      const service = strapi.plugin("zhao-tag")?.service("tag-index");
      if (service) {
        await service.remove("lesson", result.documentId);
      }
    } catch (err) {
      strapi.log.error(`[zhao-course] Failed to remove tag-index for lesson ${result.documentId}: ${err}`);
    }
  };
  return {
    async afterCreate(event) {
      await syncTagIndex2(event);
    },
    async afterUpdate(event) {
      await syncTagIndex2(event);
    },
    async afterDelete(event) {
      await removeTagIndex2(event);
    }
  };
};
const contentTypes = {
  "course-category": { schema: courseCategory$2 },
  course: { schema: course$2, lifecycles: courseLifecycles },
  "course-lesson": { schema: courseLesson$2, lifecycles: courseLessonLifecycles },
  "user-course-auth": { schema: userCourseAuth$2 },
  "course-progress": { schema: courseProgress$2 },
  "lesson-progress": { schema: lessonProgress$2 }
};
const wrap$5 = (data, meta = {}) => ({ data, meta });
const wrapList$5 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const courseCategory$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      const channelScope = ctx.state.channelScope || { all: true, channelIds: [], isGuest: true };
      ctx.body = wrapList$5(await strapi.plugin("zhao-course").service("course-category").find(ctx.query, {
        channelScope,
        mergedChannelIds: ctx.state.mergedChannelIds || [],
        siteChannelIds: ctx.state.siteChannelIds || [],
        crossChannelEnabled: ctx.state.crossChannelEnabled ?? true
      }));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("course-category").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "分类不存在" };
        return;
      }
      if (!ctx.path?.includes("/admin/") && ctx.state.publicOnly !== false) {
        const ch = result;
        if (ch.channelScope === "all") {
          ctx.body = wrap$5(result);
          return;
        }
        if (ch.channelScope === "specific" && ch.allowCrossChannel === true) {
          ctx.body = wrap$5(result);
          return;
        }
        if (ch.channelScope === "specific" && ch.allowCrossChannel === false) {
          const mergedChannelIds = ctx.state.mergedChannelIds || ctx.state.channelScope?.channelIds || [];
          const categoryChannelIds = Array.isArray(ch.channelIds) ? ch.channelIds : [];
          const hasAccess = mergedChannelIds.some((mid) => categoryChannelIds.some((cid) => String(mid) === String(cid)));
          if (!hasAccess) {
            ctx.status = 403;
            ctx.body = { error: "无权访问此分类" };
            return;
          }
        }
      }
      ctx.body = wrap$5(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("course-category").create(data, { siteId: ctx.state?.siteId });
      ctx.status = 201;
      ctx.body = wrap$5(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap$5(await strapi.plugin("zhao-course").service("course-category").update(documentId, data, { siteId: ctx.state?.siteId }));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$5(await strapi.plugin("zhao-course").service("course-category").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  }
});
const wrap$4 = (data, meta = {}) => ({ data, meta });
const wrapList$4 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const course$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      const isAdmin = ctx.path?.includes("/admin/") ?? false;
      const publicOnly = !isAdmin;
      const channelScope = ctx.state.channelScope || (publicOnly ? { all: true, channelIds: [], isGuest: true } : { all: true, channelIds: [], isGuest: false });
      ctx.body = wrapList$4(await strapi.plugin("zhao-course").service("course").find(ctx.query, publicOnly, {
        channelScope,
        mergedChannelIds: ctx.state.mergedChannelIds || [],
        siteChannelIds: ctx.state.siteChannelIds || [],
        crossChannelEnabled: ctx.state.crossChannelEnabled ?? true
      }));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程 ID" };
        return;
      }
      const isAdmin = ctx.path?.includes("/admin/") ?? false;
      const publicOnly = !isAdmin;
      const result = await strapi.plugin("zhao-course").service("course").findOne(documentId, publicOnly);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "课程不存在" };
        return;
      }
      const hasAccess = await this.checkCourseAccess(ctx, result);
      if (!hasAccess) {
        ctx.status = 403;
        ctx.body = { error: "该课程仅限渠道成员访问" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  /**
   * 检查用户是否有课程访问权限
   */
  async checkCourseAccess(ctx, result) {
    const isAdmin = ctx.path?.includes("/admin/") ?? false;
    if (!isAdmin && ctx.state.publicOnly !== false) {
      const ch = result;
      if (ch.channelScope === "all") {
        return true;
      }
      const crossChannelEnabled = ctx.state.crossChannelEnabled !== false;
      if (crossChannelEnabled && ch.channelScope === "specific" && ch.allowCrossChannel === true) {
        return true;
      }
      if (ch.channelScope === "specific" && ch.allowCrossChannel === false) {
        const mergedChannelIds = ctx.state.mergedChannelIds || ctx.state.channelScope?.channelIds || [];
        const courseChannelIds = Array.isArray(ch.channelIds) ? ch.channelIds : [];
        const hasAccess = mergedChannelIds.some((mid) => courseChannelIds.some((cid) => String(mid) === String(cid)));
        if (!hasAccess) {
          return false;
        }
      }
    }
    return true;
  },
  async create(ctx) {
    try {
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = parseErr.status || 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }
      if (!data?.title) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程标题" };
        return;
      }
      if (typeof data.title !== "string" || data.title.trim().length === 0) {
        ctx.status = 400;
        ctx.body = { error: "课程标题必须是有效的字符串" };
        return;
      }
      const result = await strapi.plugin("zhao-course").service("course").create(data, { siteId: ctx.state?.siteId });
      ctx.status = 201;
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程 ID" };
        return;
      }
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = parseErr.status || 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }
      ctx.body = wrap$4(await strapi.plugin("zhao-course").service("course").update(documentId, data, { siteId: ctx.state?.siteId }));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程 ID" };
        return;
      }
      ctx.body = wrap$4(await strapi.plugin("zhao-course").service("course").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async publish(ctx) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程ID" };
        return;
      }
      const courseService = strapi.plugin("zhao-course").service("course");
      ctx.body = await courseService.publish(documentId);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async unpublish(ctx) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程ID" };
        return;
      }
      const courseService = strapi.plugin("zhao-course").service("course");
      ctx.body = wrap$4(await courseService.unpublish(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  /**
   * 列出渠道配置异常的课程（admin 巡检用）
   * GET /zhao-course/v1/admin/courses/channel-config-invalid
   * 返回：{ data: [{ documentId, title, channelScope, channelIds, pointChannel, reason }] }
   */
  async listChannelConfigInvalid(ctx) {
    try {
      const invalid = await strapi.plugin("zhao-course").service("course").listChannelConfigInvalid();
      ctx.body = { data: invalid, meta: { count: invalid.length } };
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  }
});
const wrap$3 = (data, meta = {}) => ({ data, meta });
const wrapList$3 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const courseLesson$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList$3(await strapi.plugin("zhao-course").service("course-lesson").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("course-lesson").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "课时不存在" };
        return;
      }
      ctx.body = wrap$3(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = parseErr.status || 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }
      if (!data?.title) {
        ctx.status = 400;
        ctx.body = { error: "缺少课时名称" };
        return;
      }
      const result = await strapi.plugin("zhao-course").service("course-lesson").create(data);
      ctx.status = 201;
      ctx.body = wrap$3(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课时 ID" };
        return;
      }
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = parseErr.status || 400;
          ctx.body = { error: "无效的 JSON 数据" };
          return;
        }
      }
      ctx.body = wrap$3(await strapi.plugin("zhao-course").service("course-lesson").update(documentId, data));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$3(await strapi.plugin("zhao-course").service("course-lesson").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  }
});
const wrap$2 = (data, meta = {}) => ({ data, meta });
const wrapList$2 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const userCourseAuth$1 = ({ strapi }) => ({
  // 渠道范围过滤工具
  _scopeSvc() {
    return strapi.plugin("zhao-auth")?.service("channel-scope");
  },
  _channelFilter(ctx, field) {
    return this._scopeSvc()?.buildChannelFilter?.(ctx.state?.channelScope, field) ?? null;
  },
  _assertInScope(ctx, record, field) {
    this._scopeSvc()?.assertRecordInScope?.(ctx.state?.channelScope, record, field);
  },
  // 通过 channel documentId 校验是否在 scope 内（复用 channel-scope.service）
  async _assertChannelDocIdInScope(ctx, channelDocumentId) {
    await this._scopeSvc()?.assertChannelDocIdInScope?.(ctx.state?.channelScope, channelDocumentId);
  },
  async find(ctx) {
    try {
      const query = { ...ctx.query };
      const cf = this._channelFilter(ctx, "channel");
      if (cf) {
        query.filters = { ...query.filters ?? {}, ...cf };
      }
      ctx.body = wrapList$2(await strapi.plugin("zhao-course").service("user-course-auth").find(query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("user-course-auth").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "授权记录不存在" };
        return;
      }
      if (result.channel != null) {
        const normalized = typeof result.channel === "number" ? { id: result.channel } : result.channel;
        this._assertInScope(ctx, { channel: normalized }, "channel");
      }
      ctx.body = wrap$2(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("user-course-auth").create(data);
      ctx.status = 201;
      ctx.body = wrap$2(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap$2(await strapi.plugin("zhao-course").service("user-course-auth").update(documentId, data));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$2(await strapi.plugin("zhao-course").service("user-course-auth").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  /**
   * 授权课程给用户
   */
  async grant(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      if (data?.channel) {
        const channelDocId = typeof data.channel === "string" ? data.channel : data.channel?.documentId;
        if (channelDocId) {
          await this._assertChannelDocIdInScope(ctx, channelDocId);
        }
      }
      const result = await strapi.plugin("zhao-course").service("user-course-auth").create(data);
      ctx.status = 201;
      ctx.body = wrap$2(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  /**
   * 撤销用户课程授权
   */
  async revoke(ctx) {
    try {
      const { documentId } = ctx.params;
      const existing = await strapi.plugin("zhao-course").service("user-course-auth").findOne(documentId);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "授权记录不存在" };
        return;
      }
      if (existing.channel != null) {
        const normalized = typeof existing.channel === "number" ? { id: existing.channel } : existing.channel;
        this._assertInScope(ctx, { channel: normalized }, "channel");
      }
      ctx.body = wrap$2(await strapi.plugin("zhao-course").service("user-course-auth").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  /**
   * 查询课程授权状态
   */
  async checkAuth(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { courseDocumentId } = ctx.params;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      if (!courseDocumentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程 ID" };
        return;
      }
      const result = await strapi.plugin("zhao-course").service("user-course-auth").checkAuth(userId, courseDocumentId);
      ctx.body = wrap$2(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  /**
   * 获取我的授权课程
   */
  async myCourses(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      ctx.body = wrapList$2(await strapi.plugin("zhao-course").service("user-course-auth").getUserAuthCourses(userId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  }
});
const wrap$1 = (data, meta = {}) => ({ data, meta });
const wrapList$1 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const courseProgress$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList$1(await strapi.plugin("zhao-course").service("course-progress").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("course-progress").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "进度记录不存在" };
        return;
      }
      ctx.body = wrap$1(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("course-progress").create(data);
      ctx.status = 201;
      ctx.body = wrap$1(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap$1(await strapi.plugin("zhao-course").service("course-progress").update(documentId, data));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$1(await strapi.plugin("zhao-course").service("course-progress").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  /**
   * 获取我的课程进度
   */
  async myProgresses(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      ctx.body = wrapList$1(await strapi.plugin("zhao-course").service("course-progress").getUserProgresses(userId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  /**
   * 领取课程积分
   */
  async claimPoints(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { documentId } = ctx.params;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课程进度 ID" };
        return;
      }
      const courseProgressService = strapi.plugin("zhao-course").service("course-progress");
      const courseProgress2 = await courseProgressService.findCourseProgressById(documentId);
      if (!courseProgress2) {
        ctx.status = 404;
        ctx.body = { error: "课程进度不存在" };
        return;
      }
      if (courseProgress2.user.id !== userId) {
        ctx.status = 403;
        ctx.body = { error: "只能领取自己的课程积分" };
        return;
      }
      const authResult = await strapi.plugin("zhao-course").service("user-course-auth").checkAuth(userId, courseProgress2.course.documentId);
      if (!authResult.authorized) {
        ctx.status = 403;
        ctx.body = { error: "未授权访问该课程" };
        return;
      }
      ctx.body = wrap$1(await courseProgressService.claimPoints(userId, documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  }
});
const wrap = (data, meta = {}) => ({ data, meta });
const wrapList = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const lessonProgress$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("lesson-progress").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("lesson-progress").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "课时进度不存在" };
        return;
      }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("lesson-progress").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("lesson-progress").update(documentId, data));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-course").service("lesson-progress").delete(documentId);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  /**
   * 查询当前用户的课时进度列表
   */
  async myProgresses(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      const { course: course2 } = ctx.query;
      const filters = { user: { id: userId } };
      if (course2) {
        filters.course = { documentId: course2 };
      }
      const results = await strapi.documents("plugin::zhao-course.lesson-progress").findMany({
        filters,
        populate: { lesson: true, course: true }
      });
      ctx.body = wrapList(results);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  /**
   * 上报课时进度
   */
  async reportProgress(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { lessonDocumentId, lessonId } = ctx.request.body;
      const effectiveLessonId = lessonDocumentId || lessonId;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      if (!effectiveLessonId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课时 ID" };
        return;
      }
      const lessonProgressService = strapi.plugin("zhao-course").service("lesson-progress");
      const lesson = await strapi.documents("plugin::zhao-course.course-lesson").findOne({
        documentId: effectiveLessonId,
        populate: { course: true }
      });
      if (!lesson) {
        ctx.status = 404;
        ctx.body = { error: "课时不存在" };
        return;
      }
      const authResult = await strapi.plugin("zhao-course").service("user-course-auth").checkAuth(userId, lesson.course.documentId);
      if (!authResult.authorized) {
        ctx.status = 403;
        ctx.body = { error: "未授权访问该课程" };
        return;
      }
      ctx.body = wrap(await lessonProgressService.reportProgress(userId, ctx.request.body));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  /**
   * 提交课时答题
   */
  async submitAnswer(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { documentId } = ctx.params;
      const { isCorrect } = ctx.request.body;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课时进度 ID" };
        return;
      }
      const lessonProgressService = strapi.plugin("zhao-course").service("lesson-progress");
      const lessonProgress2 = await lessonProgressService.findLessonProgressById(documentId);
      if (!lessonProgress2) {
        ctx.status = 404;
        ctx.body = { error: "课时进度不存在" };
        return;
      }
      if (Number(lessonProgress2.user?.id ?? lessonProgress2.user) !== Number(userId)) {
        ctx.status = 403;
        ctx.body = { error: "只能操作自己的课时进度" };
        return;
      }
      ctx.body = wrap(await lessonProgressService.submitAnswer(userId, documentId, isCorrect));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  /**
   * 领取课时积分
   */
  async claimPoints(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { documentId } = ctx.params;
      const { selectedChannelId } = ctx.request.body || {};
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "用户未登录" };
        return;
      }
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少课时进度 ID" };
        return;
      }
      const lessonProgressService = strapi.plugin("zhao-course").service("lesson-progress");
      const lessonProgress2 = await lessonProgressService.findLessonProgressById(documentId);
      if (!lessonProgress2) {
        ctx.status = 404;
        ctx.body = { error: "课时进度不存在" };
        return;
      }
      if (Number(lessonProgress2.user?.id ?? lessonProgress2.user) !== Number(userId)) {
        ctx.status = 403;
        ctx.body = { error: "只能领取自己的课时积分" };
        return;
      }
      ctx.body = wrap(await lessonProgressService.claimPoints(userId, documentId, selectedChannelId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  }
});
const controllers = {
  "course-category": courseCategory$1,
  course: course$1,
  "course-lesson": courseLesson$1,
  "user-course-auth": userCourseAuth$1,
  "course-progress": courseProgress$1,
  "lesson-progress": lessonProgress$1
};
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"]
  }
});
const publicChannelScopeRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-common.resolve-channel-scope"
    ]
  }
});
const userRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"]
  }
});
const channelScopeRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    // ===== 公开路由 =====
    publicChannelScopeRoute("GET", "/courses", "course.find"),
    publicChannelScopeRoute("GET", "/courses/:documentId", "course.findOne"),
    publicChannelScopeRoute("GET", "/course-categories", "course-category.find"),
    publicChannelScopeRoute("GET", "/course-categories/:documentId", "course-category.findOne"),
    publicRoute("GET", "/course-lessons", "course-lesson.find"),
    publicRoute("GET", "/course-lessons/:documentId", "course-lesson.findOne"),
    publicRoute("GET", "/lessons", "course-lesson.find"),
    publicRoute("GET", "/lessons/:documentId", "course-lesson.findOne"),
    // ===== 注册用户路由 =====
    userRoute("GET", "/my/courses", "user-course-auth.myCourses"),
    userRoute("GET", "/my/course-progresses", "course-progress.myProgresses"),
    userRoute("GET", "/my/lesson-progresses", "lesson-progress.myProgresses"),
    userRoute("POST", "/my/lesson-progress", "lesson-progress.reportProgress"),
    userRoute("POST", "/my/lesson-answer/:documentId", "lesson-progress.submitAnswer"),
    userRoute("POST", "/my/claim-lesson-points/:documentId", "lesson-progress.claimPoints"),
    userRoute("POST", "/my/claim-course-points/:documentId", "course-progress.claimPoints"),
    userRoute("GET", "/my/course-auth/:courseDocumentId", "user-course-auth.checkAuth"),
    // ===== 管理员路由 =====
    channelScopeRoute("GET", "/courses", "course.find", "course.read"),
    channelScopeRoute("GET", "/courses/:documentId", "course.findOne", "course.read"),
    channelScopeRoute("POST", "/courses", "course.create", "course.create"),
    channelScopeRoute("PUT", "/courses/:documentId", "course.update", "course.update"),
    channelScopeRoute("DELETE", "/courses/:documentId", "course.delete", "course.delete"),
    channelScopeRoute("POST", "/courses/:documentId/publish", "course.publish", "course.publish"),
    channelScopeRoute("POST", "/courses/:documentId/unpublish", "course.unpublish", "course.publish"),
    channelScopeRoute("GET", "/courses/channel-config-invalid", "course.listChannelConfigInvalid", "course.read"),
    channelScopeRoute("GET", "/course-categories", "course-category.find", "course-category.read"),
    channelScopeRoute("GET", "/course-categories/:documentId", "course-category.findOne", "course-category.read"),
    channelScopeRoute("POST", "/course-categories", "course-category.create", "course-category.create"),
    channelScopeRoute("PUT", "/course-categories/:documentId", "course-category.update", "course-category.update"),
    channelScopeRoute("DELETE", "/course-categories/:documentId", "course-category.delete", "course-category.delete"),
    channelScopeRoute("GET", "/course-lessons", "course-lesson.find", "lesson.read"),
    channelScopeRoute("GET", "/course-lessons/:documentId", "course-lesson.findOne", "lesson.read"),
    channelScopeRoute("POST", "/course-lessons", "course-lesson.create", "lesson.create"),
    channelScopeRoute("PUT", "/course-lessons/:documentId", "course-lesson.update", "lesson.update"),
    channelScopeRoute("DELETE", "/course-lessons/:documentId", "course-lesson.delete", "lesson.delete"),
    channelScopeRoute("GET", "/lessons", "course-lesson.find", "lesson.read"),
    channelScopeRoute("GET", "/lessons/:documentId", "course-lesson.findOne", "lesson.read"),
    channelScopeRoute("POST", "/lessons", "course-lesson.create", "lesson.create"),
    channelScopeRoute("PUT", "/lessons/:documentId", "course-lesson.update", "lesson.update"),
    channelScopeRoute("DELETE", "/lessons/:documentId", "course-lesson.delete", "lesson.delete"),
    channelScopeRoute("GET", "/user-courses", "user-course-auth.find", "user-course.read"),
    channelScopeRoute("GET", "/user-courses/:documentId", "user-course-auth.findOne", "user-course.read"),
    channelScopeRoute("POST", "/user-courses", "user-course-auth.grant", "user-course.grant"),
    channelScopeRoute("DELETE", "/user-courses/:documentId", "user-course-auth.revoke", "user-course.grant"),
    channelScopeRoute("GET", "/course-progresses", "course-progress.find", "course-progress.read"),
    channelScopeRoute("GET", "/course-progresses/:documentId", "course-progress.findOne", "course-progress.read"),
    channelScopeRoute("PUT", "/course-progresses/:documentId", "course-progress.update", "course-progress.update"),
    channelScopeRoute("GET", "/lesson-progresses", "lesson-progress.find", "lesson-progress.read"),
    channelScopeRoute("GET", "/lesson-progresses/:documentId", "lesson-progress.findOne", "lesson-progress.read"),
    channelScopeRoute("PUT", "/lesson-progresses/:documentId", "lesson-progress.update", "lesson-progress.update")
  ]
});
const routes = {
  "content-api": contentApi
};
const UID$5 = "plugin::zhao-course.course-category";
async function getSiteChannelUsage$1(strapi, siteId) {
  if (!siteId) return "site_cross_user";
  try {
    const site = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      select: ["channelUsage"]
    });
    return site?.channelUsage || "site_cross_user";
  } catch {
    return "site_cross_user";
  }
}
async function validateCategoryChannelConfig(data, strapi, siteId) {
  if (data.allowCrossChannel === true) {
    const channelUsage = await getSiteChannelUsage$1(strapi, siteId);
    if (channelUsage === "site_only") {
      const err = new Error("当前租户未开启跨渠道功能，不允许设置 allowCrossChannel=true");
      err.code = "COURSE_003";
      err.status = 400;
      throw err;
    }
  }
}
const courseCategory = ({ strapi }) => ({
  /**
   * 查询分类列表（支持渠道过滤和分页）
   * @param query - 查询参数，支持 pagination, filters, sort, fields, populate
   * @param channelScope - 渠道范围，包含 isGuest 标识游客
   */
  async find(query = {}, ctxState) {
    const channelScope = ctxState?.channelScope;
    const mergedChannelIds = ctxState?.mergedChannelIds || [];
    const siteChannelIds = ctxState?.siteChannelIds || [];
    const crossChannelEnabled = ctxState?.crossChannelEnabled ?? true;
    const page = Number(query.pagination?.page) || 1;
    const pageSize = Number(query.pagination?.pageSize) || 25;
    const [list] = await Promise.all([
      strapi.documents(UID$5).findMany({
        ...query,
        sort: [{ sort: "asc" }],
        pagination: { page: 1, pageSize: 1e3 }
      })
    ]);
    let filteredList = list;
    const isGuest = !channelScope || channelScope.isGuest === true || !channelScope.all && !channelScope.channelIds?.length;
    if (!channelScope?.all) {
      const effectiveMergedIds = isGuest ? siteChannelIds : mergedChannelIds;
      filteredList = list.filter((category) => {
        if (category.channelScope === "all") return true;
        if (category.channelScope === null) return true;
        if (category.channelScope === "specific") {
          if (crossChannelEnabled && category.allowCrossChannel === true) return true;
          const categoryChannelIds = category.channelIds || [];
          return categoryChannelIds.some(
            (cid) => effectiveMergedIds.some((mid) => String(mid) === String(cid))
          );
        }
        return false;
      });
    }
    const start = (page - 1) * pageSize;
    const paginatedList = filteredList.slice(start, start + pageSize);
    return {
      list: paginatedList,
      pagination: { page, pageSize, total: filteredList.length, pageCount: Math.ceil(filteredList.length / pageSize) }
    };
  },
  async findOne(documentId, params = {}) {
    return strapi.documents(UID$5).findOne({ documentId, ...params });
  },
  async create(data, options2) {
    await validateCategoryChannelConfig(data, strapi, options2?.siteId);
    return strapi.documents(UID$5).create({ data });
  },
  async update(documentId, data, options2) {
    await validateCategoryChannelConfig(data, strapi, options2?.siteId);
    return strapi.documents(UID$5).update({ documentId, data });
  },
  async delete(documentId) {
    return strapi.documents(UID$5).delete({ documentId });
  }
});
const UID$4 = "plugin::zhao-course.course";
const TARGET_TYPE$1 = "plugin::zhao-course.course";
const DATE_FIELDS = ["enrollStartDate", "enrollEndDate", "courseStartDate", "courseEndDate", "publishDate"];
function cleanDateFields(data) {
  const clean = { ...data };
  for (const field of DATE_FIELDS) {
    if (clean[field] === "" || clean[field] === null || clean[field] === void 0) {
      delete clean[field];
    }
  }
  return clean;
}
async function validateChannelConfig(data, strapi, siteId) {
  const scope = data.channelScope;
  if (scope === "specific") {
    const ids = data.channelIds;
    const isArray = Array.isArray(ids);
    if (!isArray || ids.length === 0) {
      const err = new Error("channelScope 为 specific 时，channelIds 至少要包含 1 个渠道");
      err.code = "COURSE_001";
      err.status = 400;
      throw err;
    }
    for (const id of ids) {
      if (typeof id !== "number" && typeof id !== "string") {
        const err = new Error("channelIds 仅支持数字或字符串 ID");
        err.code = "COURSE_001";
        err.status = 400;
        throw err;
      }
    }
    const pc = data.pointChannel;
    if (pc == null) {
      const err = new Error("channelScope 为 specific 时，pointChannel（积分归属渠道）必填");
      err.code = "COURSE_001";
      err.status = 400;
      throw err;
    }
    const pcId = typeof pc === "object" ? pc.id ?? pc.documentId : pc;
    const inScope = ids.some((id) => String(id) === String(pcId));
    if (!inScope) {
      const err = new Error("pointChannel 必须是 channelIds 之一");
      err.code = "COURSE_001";
      err.status = 400;
      throw err;
    }
  }
  if (scope === "all") {
    data.channelIds = [];
    data.pointChannel = null;
  }
  if (data.allowCrossChannel === true) {
    const channelUsage = await getSiteChannelUsage(strapi, siteId);
    if (channelUsage === "site_only") {
      const err = new Error("当前租户未开启跨渠道功能，不允许设置 allowCrossChannel=true");
      err.code = "COURSE_003";
      err.status = 400;
      throw err;
    }
  }
}
async function getSiteChannelUsage(strapi, siteId) {
  if (!siteId) return "site_cross_user";
  try {
    const site = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      select: ["channelUsage"]
    });
    return site?.channelUsage || "site_cross_user";
  } catch {
    return "site_cross_user";
  }
}
function extractTagIds$1(result) {
  if (!result?.tags) return [];
  return result.tags.map((t) => t.documentId).filter(Boolean);
}
async function syncTagIndex$1(strapi, targetType, targetId, tagIds) {
  try {
    await strapi.plugin("zhao-tag").service("tag-index").sync(targetType, targetId, tagIds);
  } catch (e) {
    strapi.log.error(`[tag-index sync] ${targetType}/${targetId} failed: ${e}`);
  }
}
async function removeTagIndex$1(strapi, targetType, targetId) {
  try {
    await strapi.plugin("zhao-tag").service("tag-index").remove(targetType, targetId);
  } catch (e) {
    strapi.log.error(`[tag-index remove] ${targetType}/${targetId} failed: ${e}`);
  }
}
const course = ({ strapi }) => {
  const publishDoc = async (documentId) => {
    await strapi.documents(UID$4).update({
      documentId,
      data: {
        status: "published",
        publishDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    return strapi.documents(UID$4).publish({
      documentId,
      populate: {
        category: true,
        tags: true,
        cover: true,
        thumbnail: true,
        lessons: true
      }
    });
  };
  const unpublishDoc = async (documentId) => {
    await strapi.documents(UID$4).update({
      documentId,
      data: {
        status: "draft"
      }
    });
    return strapi.documents(UID$4).unpublish({
      documentId,
      populate: {
        category: true,
        tags: true,
        cover: true,
        thumbnail: true,
        lessons: true
      }
    });
  };
  return {
    /**
     * 列出渠道配置异常的课程：
     * - channelScope="specific" + channelIds 非空 + pointChannel 为空
     * - channelScope="specific" + pointChannel 不属于 channelIds
     * 返回数组：[{ documentId, title, channelScope, channelIds, pointChannel, reason }]
     */
    async listChannelConfigInvalid() {
      const docs = await strapi.db.query(UID$4).findMany({
        where: { channelScope: "specific" },
        select: ["documentId", "title", "channelScope", "channelIds"],
        populate: { pointChannel: { select: ["id", "documentId"] } },
        limit: 5e3
      });
      const invalid = [];
      for (const d of docs) {
        const ids = Array.isArray(d.channelIds) ? d.channelIds : [];
        if (ids.length === 0) continue;
        const pc = d.pointChannel;
        const pcId = pc ? pc.id ?? pc.documentId ?? pc : null;
        if (!pcId) {
          invalid.push({
            documentId: d.documentId,
            title: d.title,
            channelScope: d.channelScope,
            channelIds: ids,
            pointChannel: null,
            reason: "pointChannel 为空"
          });
          continue;
        }
        const inScope = ids.some((id) => String(id) === String(pcId));
        if (!inScope) {
          invalid.push({
            documentId: d.documentId,
            title: d.title,
            channelScope: d.channelScope,
            channelIds: ids,
            pointChannel: pcId,
            reason: "pointChannel 不在 channelIds 中"
          });
        }
      }
      return invalid;
    },
    async find(query = {}, publicOnly = false, ctxState) {
      const { filters, populate, sort, pagination, fields, locale } = query;
      const mergedFilters = { ...filters };
      const channelScope = ctxState?.channelScope;
      const mergedChannelIds = ctxState?.mergedChannelIds || [];
      const siteChannelIds = ctxState?.siteChannelIds || [];
      const crossChannelEnabled = ctxState?.crossChannelEnabled ?? true;
      const isAdmin = !!channelScope?.all && !channelScope?.isGuest;
      if (channelScope?.isGuest) {
        mergedFilters.$or = [
          { channelScope: "all" },
          { channelScope: "specific", allowCrossChannel: true }
        ];
      } else {
        mergedFilters.$or = [
          { channelScope: "all" },
          { channelScope: "specific" },
          { channelScope: null }
          // 兼容旧数据
        ];
      }
      const page = Number(pagination?.page) || 1;
      const pageSize = Number(pagination?.pageSize) || 25;
      let list = [];
      if (isAdmin) {
        const dbWhere = { deletedAt: null };
        if (filters?.title?.$contains) dbWhere.title = { $contains: filters.title.$contains };
        if (filters?.status) dbWhere.status = filters.status;
        if (filters?.category?.documentId) {
          const cat = await strapi.db.query("plugin::zhao-course.course-category").findOne({
            where: { documentId: filters.category.documentId },
            select: ["id"]
          });
          if (cat) dbWhere.category = cat.id;
        }
        const dbQueryParams = {
          where: dbWhere,
          limit: 1e3,
          orderBy: { id: "asc" }
        };
        const dbPopulate = ["category", "tags", "cover", "thumbnail"];
        if (dbPopulate.length > 0) dbQueryParams.populate = dbPopulate;
        const allRows = await strapi.db.query(UID$4).findMany(dbQueryParams);
        const docMap = /* @__PURE__ */ new Map();
        for (const row of allRows) {
          const docId = row.documentId;
          const existing = docMap.get(docId);
          if (!existing) {
            docMap.set(docId, row);
          } else {
            const existingIsDraft = existing.publishedAt == null;
            const currentIsDraft = row.publishedAt == null;
            if (currentIsDraft && !existingIsDraft) {
              docMap.set(docId, row);
            }
          }
        }
        list = Array.from(docMap.values());
      } else {
        const docParams = {
          filters: mergedFilters,
          status: publicOnly ? "published" : "draft",
          populate: {
            category: true,
            tags: true,
            cover: true,
            thumbnail: true,
            ...populate || {}
          }
        };
        if (sort) docParams.sort = sort;
        docParams.pagination = { page: 1, pageSize: 1e3 };
        if (fields) docParams.fields = fields;
        if (locale) docParams.locale = locale;
        list = await strapi.documents(UID$4).findMany(docParams);
      }
      let filteredList = list;
      if (channelScope?.isGuest) {
        const guestMergedIds = crossChannelEnabled ? siteChannelIds : siteChannelIds;
        filteredList = list.filter((course2) => {
          if (course2.channelScope === "all") return true;
          if (course2.channelScope === null) return true;
          if (crossChannelEnabled && course2.channelScope === "specific" && course2.allowCrossChannel === true) return true;
          if (course2.channelScope === "specific") {
            const courseChannelIds = Array.isArray(course2.channelIds) ? course2.channelIds : [];
            return courseChannelIds.some((cid) => guestMergedIds.some((mid) => String(mid) === String(cid)));
          }
          return false;
        });
      } else if (channelScope && !channelScope.all) {
        filteredList = list.filter((course2) => {
          if (course2.channelScope === "all") return true;
          if (course2.channelScope === null) return true;
          if (crossChannelEnabled && course2.channelScope === "specific" && course2.allowCrossChannel === true) return true;
          if (course2.channelScope === "specific") {
            const courseChannelIds = Array.isArray(course2.channelIds) ? course2.channelIds : [];
            return courseChannelIds.some((cid) => mergedChannelIds.some((mid) => String(mid) === String(cid)));
          }
          return false;
        });
      }
      if (sort) {
        const sortField = typeof sort === "string" ? sort : Object.keys(sort)[0];
        const sortOrder = typeof sort === "string" ? "asc" : sort[sortField] === "desc" ? "desc" : "asc";
        filteredList.sort((a, b) => {
          const av = a?.[sortField];
          const bv = b?.[sortField];
          if (av == null && bv == null) return 0;
          if (av == null) return sortOrder === "asc" ? -1 : 1;
          if (bv == null) return sortOrder === "asc" ? 1 : -1;
          if (av < bv) return sortOrder === "asc" ? -1 : 1;
          if (av > bv) return sortOrder === "asc" ? 1 : -1;
          return 0;
        });
      }
      const start = (page - 1) * pageSize;
      const paginatedList = filteredList.slice(start, start + pageSize);
      return {
        list: paginatedList,
        pagination: {
          page,
          pageSize,
          total: filteredList.length,
          pageCount: Math.ceil(filteredList.length / pageSize)
        }
      };
    },
    async findOne(documentId, publicOnly = false) {
      const params = {
        documentId,
        populate: {
          category: true,
          tags: true,
          cover: true,
          thumbnail: true,
          lessons: true,
          pointChannel: true
        }
      };
      if (publicOnly) {
        params.status = "published";
      }
      const result = await strapi.documents(UID$4).findOne(params);
      return result;
    },
    async create(data, options2) {
      validateChannelConfig(data, strapi, options2?.siteId);
      if (data.pointChannel != null && typeof data.pointChannel !== "object") {
        data.pointChannel = { id: data.pointChannel };
      }
      const cleaned = cleanDateFields(data);
      const needPublish = cleaned.status === "published";
      const result = await strapi.documents(UID$4).create({
        data: cleaned,
        populate: {
          category: true,
          tags: true,
          cover: true,
          thumbnail: true,
          lessons: true
        }
      });
      if (needPublish && result?.documentId) {
        const published = await publishDoc(result.documentId);
        await syncTagIndex$1(strapi, TARGET_TYPE$1, result.documentId, extractTagIds$1(published));
        return published;
      }
      await syncTagIndex$1(strapi, TARGET_TYPE$1, result.documentId, extractTagIds$1(result));
      return result;
    },
    async update(documentId, data, options2) {
      validateChannelConfig(data, strapi, options2?.siteId);
      if (data.pointChannel != null && typeof data.pointChannel !== "object") {
        data.pointChannel = { id: data.pointChannel };
      }
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        const tagIds = data.tags.map((t) => t.documentId || t.id).filter(Boolean);
        const existingTags = await strapi.documents("plugin::zhao-tag.tag").findMany({
          filters: { documentId: { $in: tagIds } },
          fields: ["documentId"]
        });
        const existingTagIds = new Set(existingTags.map((t) => t.documentId));
        const missingIds = tagIds.filter((id) => !existingTagIds.has(id));
        if (missingIds.length > 0) {
          const err = new Error(`标签不存在: ${missingIds.join(", ")}`);
          err.code = "COURSE_002";
          err.status = 400;
          throw err;
        }
      }
      const cleaned = cleanDateFields(data);
      const needPublish = cleaned.status === "published";
      const result = await strapi.documents(UID$4).update({
        documentId,
        data: cleaned,
        populate: {
          category: true,
          tags: true,
          cover: true,
          thumbnail: true,
          lessons: true
        }
      });
      if (needPublish && result?.documentId) {
        const published = await publishDoc(result.documentId);
        await syncTagIndex$1(strapi, TARGET_TYPE$1, result.documentId, extractTagIds$1(published));
        return published;
      }
      await syncTagIndex$1(strapi, TARGET_TYPE$1, result.documentId, extractTagIds$1(result));
      return result;
    },
    async delete(documentId) {
      const result = await strapi.documents(UID$4).delete({ documentId });
      await removeTagIndex$1(strapi, TARGET_TYPE$1, documentId);
      return result;
    },
    async publish(documentId) {
      return publishDoc(documentId);
    },
    async unpublish(documentId) {
      return unpublishDoc(documentId);
    }
  };
};
const UID$3 = "plugin::zhao-course.course-lesson";
const TARGET_TYPE = "plugin::zhao-course.course-lesson";
function extractTagIds(result) {
  if (!result?.tags) return [];
  return result.tags.map((t) => t.documentId).filter(Boolean);
}
async function syncTagIndex(strapi, targetType, targetId, tagIds) {
  try {
    await strapi.plugin("zhao-tag").service("tag-index").sync(targetType, targetId, tagIds);
  } catch (e) {
    strapi.log.error(`[tag-index sync] ${targetType}/${targetId} failed: ${e}`);
  }
}
async function removeTagIndex(strapi, targetType, targetId) {
  try {
    await strapi.plugin("zhao-tag").service("tag-index").remove(targetType, targetId);
  } catch (e) {
    strapi.log.error(`[tag-index remove] ${targetType}/${targetId} failed: ${e}`);
  }
}
const courseLesson = ({ strapi }) => ({
  async find(query = {}) {
    const { filters, populate, sort, pagination, fields, locale } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;
    const docParams = {
      filters: filters || {},
      populate: {
        course: true,
        images: true,
        attachments: true,
        thumbnail: true,
        tags: true,
        ...populate || {}
      }
    };
    if (sort) docParams.sort = sort;
    docParams.pagination = { page, pageSize };
    if (fields) docParams.fields = fields;
    if (locale) docParams.locale = locale;
    const [list, total] = await Promise.all([
      strapi.documents(UID$3).findMany(docParams),
      strapi.documents(UID$3).count({ filters: filters || {} })
    ]);
    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  async findOne(documentId) {
    return strapi.documents(UID$3).findOne({
      documentId,
      populate: { course: true, images: true, attachments: true, thumbnail: true, tags: true }
    });
  },
  async create(data) {
    const result = await strapi.documents(UID$3).create({
      data,
      populate: { course: true, images: true, attachments: true, thumbnail: true, tags: true }
    });
    await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(result));
    return result;
  },
  async update(documentId, data) {
    const result = await strapi.documents(UID$3).update({
      documentId,
      data,
      populate: { course: true, images: true, attachments: true, thumbnail: true, tags: true }
    });
    await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(result));
    return result;
  },
  async delete(documentId) {
    const result = await strapi.documents(UID$3).delete({ documentId });
    await removeTagIndex(strapi, TARGET_TYPE, documentId);
    return result;
  }
});
const UID$2 = "plugin::zhao-course.user-course-auth";
const userCourseAuth = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async find(query = {}) {
      return strapi.documents(UID$2).findMany({
        ...query,
        populate: { user: true, course: true }
      });
    },
    async findOne(documentId) {
      return strapi.documents(UID$2).findOne({
        documentId,
        populate: { user: true, course: true }
      });
    },
    async create(data) {
      return strapi.documents(UID$2).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID$2).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID$2).delete({ documentId });
    },
    /**
     * 检查用户是否有权访问课程
     */
    async checkAuth(userId, courseDocumentId) {
      const course2 = await strapi.documents("plugin::zhao-course.course").findOne({
        documentId: courseDocumentId
      });
      if (!course2) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("COURSE_001", { courseId: courseDocumentId }) : "课程不存在";
        throwErr("COURSE_001", 404, msg);
      }
      if (!course2.isPaid) {
        const existing = await strapi.db.query(UID$2).findOne({
          where: { user: userId, course: course2.id }
        });
        if (!existing) {
          await strapi.documents(UID$2).create({
            data: {
              user: userId,
              course: course2.id,
              authType: "free",
              isExpired: false
            }
          });
        }
        return { authorized: true };
      }
      const auth = await strapi.db.query(UID$2).findOne({
        where: { user: userId, course: course2.id }
      });
      if (!auth) {
        return { authorized: false };
      }
      if (auth.expiresAt && new Date(auth.expiresAt) < /* @__PURE__ */ new Date()) {
        await strapi.db.query(UID$2).update({
          where: { id: auth.id },
          data: { isExpired: true }
        });
        return { authorized: false, auth };
      }
      return { authorized: true, auth };
    },
    /**
     * 获取用户的授权课程列表
     */
    async getUserAuthCourses(userId) {
      return strapi.db.query(UID$2).findMany({
        where: { user: userId, isExpired: false },
        populate: { course: true }
      });
    }
  };
};
const QUIZ_RECORD_UID = "plugin::zhao-quiz.quiz-record";
const LESSON_PROGRESS_UID$1 = "plugin::zhao-course.lesson-progress";
async function sumQuizPoints(strapi, userId, lessonId) {
  const detail = {};
  let total = 0;
  try {
    const records = await strapi.db.query(QUIZ_RECORD_UID).findMany({
      where: { user: userId, lesson: lessonId, isCorrect: true },
      populate: { quiz: true }
    });
    for (const record of records) {
      const quiz = record.quiz;
      const points = quiz?.points ?? 0;
      const quizDocId = quiz?.documentId ?? quiz?.id ?? String(record.id);
      if (points > 0) {
        detail[quizDocId] = { points, isCorrect: true };
        total += points;
      }
    }
  } catch (err) {
    strapi.log.warn(`[zhao-course] sumQuizPoints 查询答题记录失败: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { total, detail };
}
async function calculateLessonPoints(strapi, lesson, progress) {
  if (!lesson?.enablePoints) {
    return { points: 0, detail: {} };
  }
  if (lesson.pointsType === "lesson_points") {
    if (!progress?.isCompleted) {
      return { points: 0, detail: {} };
    }
    return { points: lesson.points ?? 0, detail: {} };
  }
  if (lesson.pointsType === "quiz_points") {
    if (!progress?.isAnswered || !progress?.isCorrect) {
      return { points: 0, detail: {} };
    }
    const userId = progress.user?.id ?? progress.user;
    const lessonId = lesson.id;
    const { total, detail } = await sumQuizPoints(strapi, userId, lessonId);
    return { points: total, detail };
  }
  return { points: 0, detail: {} };
}
async function calculateCoursePoints(strapi, course2, userId, courseId) {
  if (!course2?.enablePoints) {
    return { points: 0, detail: {} };
  }
  if (course2.pointsType === "course_points") {
    return { points: course2.points ?? 0, detail: {} };
  }
  if (course2.pointsType === "lesson_points") {
    const lessonProgresses = await strapi.db.query(LESSON_PROGRESS_UID$1).findMany({
      where: { user: userId, course: courseId, isPointsClaimed: true },
      populate: { lesson: { select: ["documentId", "title"] } }
    });
    let total = 0;
    const detail = {};
    for (const lp of lessonProgresses) {
      const earned = lp.pointsEarned ?? 0;
      if (earned > 0) {
        const lessonDocId = lp.lesson?.documentId ?? String(lp.lesson?.id ?? lp.id);
        detail[lessonDocId] = {
          title: lp.lesson?.title ?? "",
          pointsEarned: earned
        };
        total += earned;
      }
    }
    return { points: total, detail };
  }
  return { points: 0, detail: {} };
}
const UID$1 = "plugin::zhao-course.course-progress";
const LESSON_PROGRESS_UID = "plugin::zhao-course.lesson-progress";
const LESSON_UID$1 = "plugin::zhao-course.course-lesson";
const courseProgress = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async findCourseProgressById(progressId) {
      return strapi.db.query(UID$1).findOne({
        where: { id: progressId },
        populate: { course: true }
      });
    },
    async find(query = {}) {
      const { filters, pagination } = query;
      const page = Number(pagination?.page) || 1;
      const pageSize = Number(pagination?.pageSize) || 25;
      const [list, total] = await Promise.all([
        strapi.documents(UID$1).findMany({
          ...query,
          populate: { user: true, course: true },
          pagination: { page, pageSize }
        }),
        strapi.documents(UID$1).count({ filters: filters || {} })
      ]);
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    async findOne(documentId) {
      return strapi.documents(UID$1).findOne({
        documentId,
        populate: { user: true, course: true }
      });
    },
    async create(data) {
      return strapi.documents(UID$1).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID$1).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID$1).delete({ documentId });
    },
    async getOrCreate(userId, courseId) {
      let progress = await strapi.db.query(UID$1).findOne({
        where: { user: userId, course: courseId }
      });
      if (!progress) {
        const totalLessons = await strapi.db.query(LESSON_UID$1).count({
          where: { course: courseId }
        });
        progress = await strapi.db.query(UID$1).create({
          data: {
            user: userId,
            course: courseId,
            completedLessons: 0,
            totalLessons,
            progress: 0,
            isCompleted: false,
            pointsEarned: 0,
            isPointsClaimed: false,
            lessonPointsSummary: {}
          }
        });
      }
      return progress;
    },
    async recalculate(userId, courseId) {
      const progress = await this.getOrCreate(userId, courseId);
      const completedCount = await strapi.db.query(LESSON_PROGRESS_UID).count({
        where: { user: userId, course: courseId, isCompleted: true }
      });
      const totalLessons = progress.totalLessons || 0;
      const percent = totalLessons > 0 ? Math.min(Math.round(completedCount / totalLessons * 1e4) / 100, 100) : 0;
      const isCompleted = completedCount >= totalLessons && totalLessons > 0;
      await strapi.db.query(UID$1).update({
        where: { id: progress.id },
        data: {
          completedLessons: completedCount,
          progress: percent,
          isCompleted,
          lastStudyAt: /* @__PURE__ */ new Date()
        }
      });
      return { ...progress, completedLessons: completedCount, progress: percent, isCompleted };
    },
    async claimPoints(userId, progressRecordId) {
      const progress = await strapi.db.query(UID$1).findOne({
        where: { id: progressRecordId },
        populate: { course: true }
      });
      if (!progress) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("PROGRESS_001") : "学习进度记录不存在";
        throwErr("PROGRESS_001", 404, msg);
      }
      const progressUserId = progress.user?.id ?? progress.user;
      if (progressUserId !== userId) {
        throwErr("PROGRESS_002", 403, "无权操作此进度记录");
      }
      if (progress.isPointsClaimed) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("COURSE_003") : "课程积分已领取";
        throwErr("COURSE_003", 409, msg);
      }
      const course2 = progress.course;
      if (!course2?.enablePoints) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("COURSE_002") : "课程未启用积分";
        throwErr("COURSE_002", 400, msg);
      }
      if (!progress.isCompleted) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("COURSE_004") : "课程未完成，无法领取积分";
        throwErr("COURSE_004", 400, msg);
      }
      const { points: pointsToEarn, detail } = await calculateCoursePoints(strapi, course2, userId, course2.id);
      if (pointsToEarn <= 0) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("COURSE_008") : "无可领取课程积分";
        throwErr("COURSE_008", 400, msg);
      }
      try {
        const pointService = strapi.plugin("zhao-point")?.service("point");
        if (pointService?.earnPoints) {
          await pointService.earnPoints({
            userId,
            action: "complete_course",
            source: "zhao-course",
            method: course2.pointsType,
            remark: `课程《${course2.title ?? ""}》积分领取`
          });
        }
      } catch (err) {
        strapi.log.warn(`[zhao-course] zhao-point 积分发放失败，回滚领取状态: ${err instanceof Error ? err.message : String(err)}`);
        throwErr("COURSE_009", 502, "积分发放失败，请稍后重试");
      }
      await strapi.db.query(UID$1).update({
        where: { id: progress.id },
        data: {
          pointsEarned: pointsToEarn,
          lessonPointsSummary: detail,
          isPointsClaimed: true
        }
      });
      return { pointsEarned: pointsToEarn, claimed: true, detail };
    },
    async getUserProgresses(userId) {
      return strapi.db.query(UID$1).findMany({
        where: { user: userId },
        populate: { course: true }
      });
    }
  };
};
const UID = "plugin::zhao-course.lesson-progress";
const LESSON_UID = "plugin::zhao-course.course-lesson";
const lessonProgress = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async findLessonById(lessonId) {
      return strapi.db.query(LESSON_UID).findOne({
        where: { id: lessonId },
        populate: { course: true }
      });
    },
    async findLessonProgressById(progressId) {
      return strapi.db.query(UID).findOne({
        where: { id: Number(progressId) },
        populate: { lesson: { populate: { course: true } }, user: true }
      });
    },
    async find(query = {}) {
      return strapi.documents(UID).findMany({
        ...query,
        populate: { user: true, lesson: true, course: true }
      });
    },
    async findOne(documentId) {
      return strapi.documents(UID).findOne({
        documentId,
        populate: { user: true, lesson: true, course: true }
      });
    },
    async create(data) {
      return strapi.documents(UID).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID).delete({ documentId });
    },
    async reportProgress(userId, data) {
      const lesson = await strapi.documents("plugin::zhao-course.course-lesson").findOne({
        documentId: data.lessonDocumentId,
        populate: { course: true }
      });
      if (!lesson) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("LESSON_001", { lessonId: data.lessonDocumentId }) : "课时不存在";
        throwErr("LESSON_001", 404, msg);
      }
      const courseId = lesson.course?.id || lesson.course;
      const lessonId = lesson.id;
      let progress = await strapi.db.query(UID).findOne({
        where: { user: userId, lesson: lessonId }
      });
      let progressPercent = Math.min(100, Math.max(0, data.progress ?? 0));
      if (progress) {
        if (progressPercent <= Number(progress.progress) || 0) {
          return progress;
        }
        if (data.duration && data.duration > 0 && data.playPosition !== void 0) {
          const serverProgress = Math.min(100, Math.round(data.playPosition / data.duration * 100));
          progressPercent = Math.min(progressPercent, serverProgress + 5);
        }
        const isCompleted = progressPercent >= 100;
        const updateData = {
          progress: Math.max(Number(progress.progress) || 0, progressPercent),
          playPosition: data.playPosition ?? progress.playPosition,
          duration: data.duration ?? progress.duration,
          lastStudyAt: /* @__PURE__ */ new Date()
        };
        if (isCompleted && !progress.isCompleted) {
          updateData.isCompleted = true;
        }
        progress = await strapi.db.query(UID).update({
          where: { id: progress.id },
          data: updateData
        });
      } else {
        const isCompleted = progressPercent >= 100;
        progress = await strapi.db.query(UID).create({
          data: {
            user: userId,
            lesson: lessonId,
            course: courseId,
            progress: Math.min(100, progressPercent),
            playPosition: data.playPosition ?? 0,
            duration: data.duration ?? 0,
            isCompleted,
            isAnswered: false,
            isCorrect: false,
            pointsEarned: 0,
            calculatedPoints: 0,
            quizPointsDetail: {},
            isPointsClaimed: false,
            lastStudyAt: /* @__PURE__ */ new Date()
          }
        });
      }
      if (progressPercent >= 100 && courseId) {
        await strapi.plugin("zhao-course").service("course-progress").recalculate(userId, courseId);
      }
      return progress;
    },
    async submitAnswer(userId, progressRecordId, isCorrect) {
      const progress = await strapi.db.query(UID).findOne({
        where: { id: Number(progressRecordId) },
        populate: { lesson: true, user: true }
      });
      if (!progress) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("PROGRESS_001") : "学习进度记录不存在";
        throwErr("PROGRESS_001", 404, msg);
      }
      const progressUserId = progress.user?.id ?? progress.user;
      if (Number(progressUserId) !== Number(userId)) {
        throwErr("PROGRESS_002", 403, "无权操作此进度记录");
      }
      const lesson = progress.lesson;
      const updateData = {
        isAnswered: true,
        isCorrect,
        lastStudyAt: /* @__PURE__ */ new Date()
      };
      if (isCorrect) {
        updateData.isCompleted = true;
        updateData.progress = 100;
      }
      if (isCorrect && lesson?.enablePoints && lesson.pointsType === "quiz_points") {
        const { total, detail } = await sumQuizPoints(strapi, userId, lesson.id);
        updateData.quizPointsDetail = detail;
        updateData.calculatedPoints = total;
      }
      const updated = await strapi.db.query(UID).update({
        where: { id: progress.id },
        data: updateData
      });
      if (isCorrect && progress.course) {
        await strapi.plugin("zhao-course").service("course-progress").recalculate(userId, progress.course);
      }
      return updated;
    },
    async claimPoints(userId, progressRecordId, selectedChannelId) {
      const progress = await strapi.db.query(UID).findOne({
        where: { id: Number(progressRecordId) },
        populate: { lesson: { populate: { course: { populate: { pointChannel: true } } } }, user: true }
      });
      if (!progress) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("PROGRESS_001") : "学习进度记录不存在";
        throwErr("PROGRESS_001", 404, msg);
      }
      const progressUserId = progress.user?.id ?? progress.user;
      if (Number(progressUserId) !== Number(userId)) {
        throwErr("PROGRESS_002", 403, "无权操作此进度记录");
      }
      if (progress.isPointsClaimed) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("LESSON_003") : "课时积分已领取";
        throwErr("LESSON_003", 409, msg);
      }
      const lesson = progress.lesson;
      if (!lesson?.enablePoints) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("LESSON_002") : "课时未启用积分";
        throwErr("LESSON_002", 400, msg);
      }
      if (lesson.pointsType === "lesson_points" && !progress.isCompleted) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("LESSON_004") : "课时未完成，无法领取积分";
        throwErr("LESSON_004", 400, msg);
      }
      if (lesson.pointsType === "quiz_points") {
        if (!progress.isAnswered) {
          const i18n = strapi.plugin("zhao-common")?.service("i18n");
          const msg = i18n ? i18n.t("LESSON_005") : "课时需答题才能获得积分";
          throwErr("LESSON_005", 400, msg);
        }
        if (!progress.isCorrect) {
          const i18n = strapi.plugin("zhao-common")?.service("i18n");
          const msg = i18n ? i18n.t("LESSON_006") : "答题错误，无法获得积分";
          throwErr("LESSON_006", 400, msg);
        }
      }
      const { points: pointsToEarn, detail } = await calculateLessonPoints(strapi, lesson, progress);
      if (pointsToEarn <= 0) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("LESSON_007") : "无可领取课时积分";
        throwErr("LESSON_007", 400, msg);
      }
      try {
        const pointService = strapi.plugin("zhao-point")?.service("point");
        if (pointService?.earnPoints) {
          const course2 = lesson.course;
          const channelIds = Array.isArray(course2?.channelIds) ? course2.channelIds : [];
          const pointChannelId = course2?.pointChannel?.id ?? course2?.pointChannel ?? null;
          let finalChannelId = selectedChannelId ?? pointChannelId;
          if (course2?.channelScope === "specific" && finalChannelId) {
            const inScope = channelIds.some((id) => String(id) === String(finalChannelId));
            if (!inScope) {
              throwErr("LESSON_009", 400, "所选渠道不在课程所属渠道范围内");
            }
          }
          let userChannelId = null;
          try {
            const channelMemberService = strapi.plugin("zhao-channel")?.service("channel-member");
            if (channelMemberService?.getMyChannel) {
              const myCh = await channelMemberService.getMyChannel(userId);
              userChannelId = myCh?.id ?? null;
            }
          } catch {
          }
          await pointService.earnPoints({
            userId,
            action: lesson.pointsType === "quiz_points" ? "complete_quiz" : "complete_lesson",
            source: "zhao-course",
            method: lesson.pointsType,
            remark: `课时《${lesson.title ?? ""}》积分领取`,
            channelId: finalChannelId ?? void 0,
            userChannelId: userChannelId ?? void 0
          });
        }
      } catch (err) {
        strapi.log.warn(`[zhao-course] zhao-point 课时积分发放失败: ${err instanceof Error ? err.message : String(err)}`);
        throwErr("LESSON_008", 502, "积分发放失败，请稍后重试");
      }
      await strapi.db.query(UID).update({
        where: { id: progress.id },
        data: {
          pointsEarned: pointsToEarn,
          calculatedPoints: pointsToEarn,
          quizPointsDetail: detail,
          isPointsClaimed: true
        }
      });
      return { pointsEarned: pointsToEarn, claimed: true, detail };
    }
  };
};
const services = {
  "course-category": courseCategory,
  course,
  "course-lesson": courseLesson,
  "user-course-auth": userCourseAuth,
  "course-progress": courseProgress,
  "lesson-progress": lessonProgress
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes
};
exports.default = index;
