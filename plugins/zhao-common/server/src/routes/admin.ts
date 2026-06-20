// zhao-common 不使用 Strapi admin 路由
// 所有管理 API 走 content-api 类型，使用 zhao-auth 策略
// 详见 content-api.ts
export default {
  type: "admin" as const,
  routes: [] as any[],
};
