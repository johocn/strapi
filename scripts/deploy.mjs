#!/usr/bin/env node
/**
 * strapi 部署脚本
 *
 * 遵守部署铁律：本地构建 → 上传 dist/ 到服务器 → pm2 restart（绝不在服务器构建/安装依赖）。
 * 服务器 `strapi start` 从根 `dist/` 启动（含 admin 前端构建物 build/admin 与后端编译产物）。
 *
 * 环境变量（从 .env / 进程环境读取，不硬编码域名）：
 *   SERVER_HOST     服务器主机或 IP，或 ssh 别名（如 qing，别名已含 User/Port/IdentityFile）
 *   SERVER_USER     SSH 用户名（默认空，用别名默认）
 *   SERVER_PORT     SSH/SCP 端口（默认空，用别名默认）
 *   REMOTE_DIR      服务器上 strapi 项目目录（必填，例如 /www/apps/strapi）
 *   APP_NAME        pm2 进程名（默认 strapi）
 *   SKIP_BUILD      设为 1 时跳过本地构建（仅上传+重启）
 *   SKIP_RESTART    设为 1 时跳过 pm2 restart（仅构建+上传）
 *   NODE_OPTIONS    构建时的 Node 堆内存；默认 --max-old-space-size=8192（admin 前端打包内存占用高）
 *
 * 用法：
 *   node scripts/deploy.mjs            # 完整部署（构建+上传+重启）
 *   SKIP_BUILD=1 node scripts/deploy.mjs   # 仅上传已有 dist + 重启
 *   SKIP_RESTART=1 node scripts/deploy.mjs # 构建+上传，不重启
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cwd = resolve(scriptDir, ".."); // 项目根（脚本在 scripts/ 下），不依赖进程 cwd

function loadEnv() {
  const baseEnv = { ...process.env };
  const env = { ...process.env };
  const envPath = resolve(scriptDir, "..", ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in baseEnv)) env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();

const SERVER_HOST = env.SERVER_HOST;
const SERVER_USER = env.SERVER_USER || "";
const SERVER_PORT = env.SERVER_PORT || "";
const REMOTE_DIR = env.REMOTE_DIR;
const APP_NAME = env.APP_NAME || "strapi";
const SKIP_BUILD = env.SKIP_BUILD === "1";
const SKIP_RESTART = env.SKIP_RESTART === "1";
const NODE_OPTS = env.NODE_OPTIONS || "--max-old-space-size=8192";

const SSH_ARGS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new"];
if (SERVER_PORT) SSH_ARGS.push("-p", SERVER_PORT);
if (SERVER_USER) SSH_ARGS.push("-l", SERVER_USER);
const target = SERVER_USER ? `${SERVER_USER}@${SERVER_HOST}` : SERVER_HOST;

const distDir = resolve(cwd, "dist");

function fail(msg) {
  console.error(`\n[deploy] 错误：${msg}`);
  process.exit(1);
}

function run(label, argv, opts = {}) {
  const { shellCat, ...rest } = opts;
  console.log(`\n[deploy] >> ${label}\n  ${shellCat ?? argv.join(" ")}`);
  const res = spawnSync(shellCat ?? argv[0], shellCat ? undefined : argv.slice(1), {
    stdio: "inherit",
    cwd,
    ...rest,
  });
  if (res.status !== 0) fail(`${label} 失败（exit=${res.status}）`);
  return res.stdout;
}

function ssh(remoteCmd) {
  run("远端执行", ["ssh", ...SSH_ARGS, target, remoteCmd]);
}

for (const [name, val] of [["SERVER_HOST", SERVER_HOST], ["REMOTE_DIR", REMOTE_DIR]]) {
  if (!val) fail(`缺少环境变量 ${name}（可在 .env 中配置）`);
}

// 1) 本地构建（下）
if (!SKIP_BUILD) {
  run("本地构建 strapi dist", ["npx", "strapi", "build"], { shellCat: "npx strapi build", env: { ...process.env, NODE_OPTIONS: NODE_OPTS } });
} else {
  console.log("\n[deploy] 已设置 SKIP_BUILD=1，跳过本地构建。");
}

// 2) 校验产物：后端编译 + admin 前端 HTML 都必须存在
// 根 dist/ 结构（strapi build 产物）：build/(admin前端) + config/ plugins/ src/(后端编译)
if (!existsSync(resolve(distDir, "src", "index.js")) && !existsSync(resolve(distDir, "config", "server.js"))) {
  fail(`未找到后端编译产物（dist/src/index.js 或 dist/config/server.js），请先本地构建。`);
}
if (!existsSync(resolve(distDir, "build", "index.html"))) {
  fail(`未找到 admin 前端产物 ${resolve(distDir, "build", "index.html")}，strapi start 无法提供 admin 面板。`);
}

// 3) 上传 dist/ 到服务器（暂存区 → sudo 拷入 REMOTE_DIR）
const STAGING = "/tmp/strapi-deploy";
console.log(`\n[deploy] >> 上传 dist/ 到 ${target}:${REMOTE_DIR}`);
run("准备暂存目录", ["ssh", ...SSH_ARGS, target, `rm -rf ${STAGING} && mkdir -p ${STAGING}`]);
run("SCP 上传 dist/ 到暂存区", ["scp", ...SSH_ARGS, "-r", distDir, `${target}:${STAGING}`]);
ssh(
  `sudo rm -rf ${REMOTE_DIR}/dist.new && ` +
    `sudo cp -r ${STAGING}/dist ${REMOTE_DIR}/dist.new && ` +
    `sudo rm -rf ${REMOTE_DIR}/dist && ` +
    `sudo mv ${REMOTE_DIR}/dist.new ${REMOTE_DIR}/dist && ` +
    `sudo chown -R $(whoami):$(whoami) ${REMOTE_DIR}/dist && ` +
    `rm -rf ${STAGING}`
);

// 4) 校验远端 dist 已就位，然后 pm2 重启（进程由 ecosystem.config.cjs 管理，
//    环境变量（DATABASE_*、NODE_ENV 等）已在其中定义，重启时维持，勿额外覆盖）
ssh(`test -f ${REMOTE_DIR}/dist/build/index.html && echo "[deploy] 远端 admin 产物已就位"`);
if (!SKIP_RESTART) {
  ssh(`cd ${REMOTE_DIR} && pm2 restart ${APP_NAME} --update-env`);
} else {
  console.log("\n[deploy] 已设置 SKIP_RESTART=1，跳过重启。");
}

// 5) 状态
ssh(`pm2 status ${APP_NAME}`);

console.log(`\n[deploy] 完成。服务器：${target} 目录 ${REMOTE_DIR}，进程 ${APP_NAME}`);
console.log(`[deploy] 验证：curl -s -o /dev/null -w '%{http_code}' http://localhost:1337/admin/`);