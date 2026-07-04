type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"],
  },
});

const userRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"],
  },
});

const channelScopeRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access",
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/courses", "course.find"),
    publicRoute("GET", "/courses/:documentId", "course.findOne"),
    publicRoute("GET", "/course-categories", "course-category.find"),
    publicRoute("GET", "/course-categories/:documentId", "course-category.findOne"),
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
    channelScopeRoute("PUT", "/lesson-progresses/:documentId", "lesson-progress.update", "lesson-progress.update"),
  ],
});
