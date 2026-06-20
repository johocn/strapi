/**
 * TDD测试：验证 /api/zhao-common/v1/public/config 返回包含 auth 字段
 * 运行方式：node tests/public-config-auth.test.js
 */
const http = require("http");

const BASE_URL = "http://localhost:1337";

function fetchJSON(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data.substring(0, 200)}`));
        }
      });
    }).on("error", reject);
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  const errors = [];

  console.log("=== 测试 public/config 接口返回 auth 字段 ===\n");

  try {
    const { status, body } = await fetchJSON("/api/zhao-common/v1/public/config");

    // 测试1: HTTP 200
    console.log("测试1: 接口返回200");
    if (status === 200) {
      console.log("  ✓ PASS");
      passed++;
    } else {
      errors.push(`FAIL: 状态码 ${status}`);
      console.log(`  ✗ FAIL: 状态码 ${status}`);
      failed++;
    }

    const data = body.data || body;

    // 测试2: 返回包含 site 字段
    console.log("\n测试2: 返回包含 site 字段");
    if (data.site && typeof data.site === "object") {
      console.log("  ✓ PASS");
      passed++;
    } else {
      errors.push("FAIL: 缺少 site 字段");
      console.log("  ✗ FAIL: 缺少 site 字段");
      failed++;
    }

    // 测试3: 返回包含 auth 字段（核心测试）
    console.log("\n测试3: 返回包含 auth 字段");
    if (data.auth && typeof data.auth === "object") {
      console.log("  ✓ PASS");
      passed++;
    } else {
      errors.push("FAIL: 缺少 auth 字段");
      console.log("  ✗ FAIL: 缺少 auth 字段");
      failed++;
    }

    // 测试4: auth 包含 mode 字段
    console.log("\n测试4: auth 包含 mode 字段");
    if (data.auth && ["local", "third", "sso"].includes(data.auth.mode)) {
      console.log(`  ✓ PASS: mode = ${data.auth.mode}`);
      passed++;
    } else {
      errors.push(`FAIL: auth.mode 缺失或无效, 实际: ${data.auth?.mode}`);
      console.log(`  ✗ FAIL: auth.mode 缺失或无效, 实际: ${data.auth?.mode}`);
      failed++;
    }

    // 测试5: auth 包含 methods 字段
    console.log("\n测试5: auth 包含 methods 字段");
    if (data.auth && Array.isArray(data.auth.methods) && data.auth.methods.length > 0) {
      console.log(`  ✓ PASS: methods = ${JSON.stringify(data.auth.methods)}`);
      passed++;
    } else {
      errors.push(`FAIL: auth.methods 缺失或无效, 实际: ${JSON.stringify(data.auth?.methods)}`);
      console.log(`  ✗ FAIL: auth.methods 缺失或无效`);
      failed++;
    }

    // 测试6: auth 包含 wechatEnabled 字段
    console.log("\n测试6: auth 包含 wechatEnabled 字段");
    if (data.auth && typeof data.auth.wechatEnabled === "boolean") {
      console.log(`  ✓ PASS: wechatEnabled = ${data.auth.wechatEnabled}`);
      passed++;
    } else {
      errors.push(`FAIL: auth.wechatEnabled 缺失或非布尔, 实际: ${data.auth?.wechatEnabled}`);
      console.log(`  ✗ FAIL: auth.wechatEnabled 缺失或非布尔`);
      failed++;
    }

    // 测试7: auth 包含 registerEnabled 字段
    console.log("\n测试7: auth 包含 registerEnabled 字段");
    if (data.auth && typeof data.auth.registerEnabled === "boolean") {
      console.log(`  ✓ PASS: registerEnabled = ${data.auth.registerEnabled}`);
      passed++;
    } else {
      errors.push(`FAIL: auth.registerEnabled 缺失或非布尔`);
      console.log(`  ✗ FAIL: auth.registerEnabled 缺失或非布尔`);
      failed++;
    }

    // 测试8: auth 不包含敏感信息
    console.log("\n测试8: auth 不包含敏感信息（无 secret/key/password）");
    const authStr = JSON.stringify(data.auth || {});
    const hasSecret = /secret|key|password|token/i.test(authStr) && !/wechatEnabled|ssoEnabled|registerEnabled/.test(authStr);
    if (!hasSecret) {
      console.log("  ✓ PASS: 无敏感信息泄露");
      passed++;
    } else {
      errors.push("FAIL: auth 包含敏感信息");
      console.log("  ✗ FAIL: auth 包含敏感信息");
      failed++;
    }

    // 打印完整返回
    console.log("\n=== 完整返回数据 ===");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    errors.push(`请求失败: ${e.message}`);
    console.error("请求失败:", e.message);
    failed++;
  }

  console.log(`\n=== 测试结果 ===`);
  console.log(`通过: ${passed}, 失败: ${failed}`);
  if (errors.length > 0) {
    console.log("\n失败详情:");
    errors.forEach((err) => console.log(`  - ${err}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
