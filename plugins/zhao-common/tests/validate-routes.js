// 验证zhao-common路由配置结构的脚本
// 使用esbuild编译TypeScript路由文件，然后验证结构
const esbuild = require("esbuild");
const path = require("path");

async function validateRoutes() {
  const pluginRoot = path.resolve(__dirname, "..");
  const routesDir = path.join(pluginRoot, "server", "src", "routes");

  console.log("=== 验证zhao-common路由配置结构 ===\n");

  // 编译并加载路由文件
  const indexPath = path.join(routesDir, "index.ts");
  const contentApiPath = path.join(routesDir, "content-api.ts");
  const adminPath = path.join(routesDir, "admin.ts");

  let errors = [];
  let passed = 0;

  try {
    // 编译index.ts
    const indexResult = await esbuild.build({
      entryPoints: [indexPath],
      bundle: true,
      format: "cjs",
      platform: "node",
      write: false,
      external: [],
    });

    const indexCode = indexResult.outputFiles[0].text;
    const indexModule = { exports: {} };
    const moduleFactory = new Function("module", "exports", indexCode);
    moduleFactory(indexModule, indexModule.exports);
    const routesConfig = indexModule.exports.default;

    // Strapi 5支持两种路由格式：对象和factory function
    // instantiateRouterInputs会自动检测并调用factory function
    // 这里模拟Strapi的行为，如果值是函数则调用它
    const mockStrapi = {};
    const resolveRouter = (input) =>
      typeof input === "function" ? input({ strapi: mockStrapi }) : input;

    const adminRouter = resolveRouter(routesConfig.admin);
    const contentApiRouter = resolveRouter(routesConfig["content-api"]);

    // 验证1: named router format
    console.log("测试1: 验证named router format");
    if (routesConfig.admin && routesConfig["content-api"]) {
      console.log("  ✓ PASS: 导出包含admin和content-api键");
      passed++;
    } else {
      errors.push("FAIL: 导出缺少admin或content-api键");
      console.log("  ✗ FAIL: 导出缺少admin或content-api键");
    }

    // 验证2: content-api type
    console.log("\n测试2: 验证content-api type");
    if (contentApiRouter.type === "content-api") {
      console.log("  ✓ PASS: content-api type正确");
      passed++;
    } else {
      errors.push(`FAIL: content-api type错误, 实际: ${contentApiRouter.type}`);
      console.log(`  ✗ FAIL: content-api type错误, 实际: ${contentApiRouter.type}`);
    }

    // 验证3: admin type
    console.log("\n测试3: 验证admin type");
    if (adminRouter.type === "admin") {
      console.log("  ✓ PASS: admin type正确");
      passed++;
    } else {
      errors.push(`FAIL: admin type错误, 实际: ${adminRouter.type}`);
      console.log(`  ✗ FAIL: admin type错误, 实际: ${adminRouter.type}`);
    }

    // 验证4: content-api路由数量
    console.log("\n测试4: 验证content-api路由数量");
    const contentApiRoutes = contentApiRouter.routes;
    if (Array.isArray(contentApiRoutes) && contentApiRoutes.length >= 3) {
      console.log(`  ✓ PASS: content-api有${contentApiRoutes.length}个路由`);
      passed++;
    } else {
      errors.push(`FAIL: content-api路由数量不足, 实际: ${contentApiRoutes?.length}`);
      console.log(`  ✗ FAIL: content-api路由数量不足, 实际: ${contentApiRoutes?.length}`);
    }

    // 验证5: /v1/site-config路由
    console.log("\n测试5: 验证/v1/site-config路由");
    const siteConfigRoute = contentApiRoutes.find((r) => r.path === "/v1/site-config");
    if (siteConfigRoute && siteConfigRoute.handler === "site-config.getPublic") {
      console.log("  ✓ PASS: /v1/site-config路由正确");
      passed++;
    } else {
      errors.push("FAIL: /v1/site-config路由缺失或handler错误");
      console.log("  ✗ FAIL: /v1/site-config路由缺失或handler错误");
      console.log("  实际路由:", siteConfigRoute);
    }

    // 验证6: /v1/public/config路由
    console.log("\n测试6: 验证/v1/public/config路由");
    const publicConfigRoute = contentApiRoutes.find((r) => r.path === "/v1/public/config");
    if (publicConfigRoute && publicConfigRoute.handler === "config.getPublic") {
      console.log("  ✓ PASS: /v1/public/config路由正确");
      passed++;
    } else {
      errors.push("FAIL: /v1/public/config路由缺失或handler错误");
      console.log("  ✗ FAIL: /v1/public/config路由缺失或handler错误");
      console.log("  实际路由:", publicConfigRoute);
    }

    // 验证7: /v1/site-config/public路由
    console.log("\n测试7: 验证/v1/site-config/public路由");
    const siteConfigPublicRoute = contentApiRoutes.find((r) => r.path === "/v1/site-config/public");
    if (siteConfigPublicRoute && siteConfigPublicRoute.handler === "site-config.getPublic") {
      console.log("  ✓ PASS: /v1/site-config/public路由正确");
      passed++;
    } else {
      errors.push("FAIL: /v1/site-config/public路由缺失或handler错误");
      console.log("  ✗ FAIL: /v1/site-config/public路由缺失或handler错误");
      console.log("  实际路由:", siteConfigPublicRoute);
    }

    // 验证8: 所有路由的handler格式
    console.log("\n测试8: 验证所有content-api路由handler格式");
    const handlerRegex = /^[a-z-]+\.[a-zA-Z]+$/;
    let allHandlersValid = true;
    contentApiRoutes.forEach((route) => {
      if (!handlerRegex.test(route.handler)) {
        console.log(`  ✗ FAIL: ${route.path}的handler格式错误: ${route.handler}`);
        errors.push(`FAIL: ${route.path}的handler格式错误: ${route.handler}`);
        allHandlersValid = false;
      }
    });
    if (allHandlersValid) {
      console.log("  ✓ PASS: 所有handler格式正确");
      passed++;
    }

    // 验证9: 不应手动添加prefix（开发规范）
    console.log("\n测试9: 验证未手动添加prefix（开发规范）");
    if (contentApiRouter.prefix === undefined && adminRouter.prefix === undefined) {
      console.log("  ✓ PASS: 未手动添加prefix，符合开发规范");
      passed++;
    } else {
      errors.push("FAIL: 手动添加了prefix，违反开发规范");
      console.log("  ✗ FAIL: 手动添加了prefix，违反开发规范");
      console.log(`  content-api prefix: ${contentApiRouter.prefix}`);
      console.log(`  admin prefix: ${adminRouter.prefix}`);
    }

    // 验证10: 打印所有路由
    console.log("\n=== 所有content-api路由 ===");
    contentApiRoutes.forEach((route, i) => {
      console.log(`  ${i + 1}. ${route.method} ${route.path} -> ${route.handler}`);
    });

    console.log("\n=== 所有admin路由 ===");
    adminRouter.routes.forEach((route, i) => {
      console.log(`  ${i + 1}. ${route.method} ${route.path} -> ${route.handler}`);
    });

  } catch (e) {
    errors.push(`编译或执行错误: ${e.message}`);
    console.error("错误:", e);
  }

  console.log(`\n=== 测试结果 ===`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${errors.length}`);
  if (errors.length > 0) {
    console.log("\n失败详情:");
    errors.forEach((err) => console.log(`  - ${err}`));
    process.exit(1);
  } else {
    console.log("\n所有测试通过!");
    process.exit(0);
  }
}

validateRoutes().catch((e) => {
  console.error("未捕获错误:", e);
  process.exit(1);
});
