import fs from "fs";
import path from "path";
import type { Core } from "@strapi/strapi";

/**
 * 种子数据执行器（Seed Runner）
 *
 * 与 migration-runner 的差异：
 * - migration 处理 schema 变更（DDL），seed 处理数据初始化（DML）
 * - 两者都有独立追踪表，启动时自动执行未运行的文件
 * - seed 文件内部应实现幂等性（findOrCreate 模式），便于手动重跑
 *
 * 文件位置：plugins/<plugin>/server/database/seeds/NNN_name.js
 * 文件格式：
 *   module.exports = {
 *     up: async ({ strapi, db }) => { ... },
 *     // 可选 down：用于回滚
 *     down: async ({ strapi, db }) => { ... }
 *   }
 *
 * 追踪表：zhao_schema_seeds（plugin + version 唯一）
 */

const SEED_TABLE = "zhao_schema_seeds";

const PLUGIN_ORDER = [
  "zhao-common",
  "zhao-tag",
  "zhao-oss",
  "zhao-channel",
  "zhao-auth",
  "zhao-course",
  "zhao-point",
  "zhao-quiz",
  "zhao-third",
  "zhao-wealth",
  "zhao-sso",
  "zhao-studio",
  "zhao-website",
  "zhao-logistics",
];

function getPluginRoot(plugin: string): string {
  try {
    const pluginMain = require.resolve(`${plugin}/strapi-server.js`, { paths: [process.cwd()] });
    return path.dirname(path.dirname(pluginMain));
  } catch {
    try {
      // @ts-ignore
      const currentFile = typeof __filename !== 'undefined' ? __filename : module.filename;
      const seedRunnerDir = path.dirname(String(currentFile));
      const serverDir = path.dirname(seedRunnerDir);
      const pluginDir = path.dirname(serverDir);
      const pluginsDir = path.dirname(pluginDir);
      const targetPlugin = path.join(pluginsDir, plugin);
      if (fs.existsSync(targetPlugin)) {
        return targetPlugin;
      }
    } catch (e) {
      // ignore
    }
    return "";
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async ensureSeedTable() {
    const hasTable = await strapi.db.connection.schema.hasTable(SEED_TABLE);
    if (!hasTable) {
      await strapi.db.connection.schema.createTable(SEED_TABLE, (table: any) => {
        table.increments("id").primary();
        table.string("plugin", 64).notNullable();
        table.string("version", 32).notNullable();
        table.string("name", 255).notNullable();
        table.timestamp("executed_at").notNullable().defaultTo(strapi.db.connection.fn.now());
        table.unique(["plugin", "version"]);
      });
      strapi.log.info("[seed] 种子数据记录表已创建");
    }
  },

  async getExecutedSeeds(plugin: string): Promise<string[]> {
    const rows = await strapi.db.connection(SEED_TABLE)
      .where({ plugin })
      .select("version");
    return rows.map((r: any) => r.version);
  },

  async getSeedFiles(plugin: string): Promise<Array<{ version: string; name: string; filePath: string }>> {
    const pluginRoot = getPluginRoot(plugin);
    const seedsDir = path.join(pluginRoot, "server", "database", "seeds");
    if (!fs.existsSync(seedsDir)) {
      return [];
    }

    const files = fs.readdirSync(seedsDir)
      .filter((f) => f.endsWith(".js") || f.endsWith(".ts"))
      .sort();

    const result: Array<{ version: string; name: string; filePath: string }> = [];
    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.(js|ts)$/);
      if (match) {
        result.push({
          version: match[1],
          name: match[2],
          filePath: path.join(seedsDir, file),
        });
      }
    }
    return result;
  },

  async runSeed(plugin: string, version: string, name: string, filePath: string, direction: "up" | "down" = "up") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const seed = require(filePath);
    const fn = seed[direction];
    if (!fn) {
      if (direction === "down") return;
      throw new Error(`种子脚本 ${filePath} 缺少 ${direction} 方法`);
    }

    const ctx = {
      strapi,
      db: strapi.db.connection,
    };

    await fn(ctx);

    if (direction === "up") {
      await strapi.db.connection(SEED_TABLE).insert({
        plugin,
        version,
        name,
      });
    } else {
      await strapi.db.connection(SEED_TABLE)
        .where({ plugin, version })
        .del();
    }
  },

  /**
   * 启动时自动执行所有未执行的种子脚本
   * 幂等性保证：追踪表记录已执行版本，不会重复执行
   * 同时要求 seed 文件内部做 findOrCreate 幂等检查（防止手动重跑或追踪表丢失）
   */
  async runAllSeeds() {
    await this.ensureSeedTable();

    const enabledPlugins = Object.keys(strapi.plugins).filter((p) => p.startsWith("zhao-"));
    const sortedPlugins = PLUGIN_ORDER.filter((p) => enabledPlugins.includes(p));

    let executedCount = 0;
    for (const plugin of sortedPlugins) {
      const files = await this.getSeedFiles(plugin);
      if (files.length === 0) continue;

      const executed = await this.getExecutedSeeds(plugin);
      const pending = files.filter((f) => !executed.includes(f.version));

      if (pending.length === 0) continue;

      strapi.log.info(`[seed] ${plugin}: 发现 ${pending.length} 个待执行种子脚本`);

      for (const file of pending) {
        try {
          await this.runSeed(plugin, file.version, file.name, file.filePath, "up");
          executedCount++;
          strapi.log.info(`[seed] ${plugin}: v${file.version} ${file.name} 执行成功`);
        } catch (err: any) {
          strapi.log.error(`[seed] ${plugin}: v${file.version} ${file.name} 执行失败: ${err.message}`);
          throw err;
        }
      }
    }

    if (executedCount > 0) {
      strapi.log.info(`[seed] 种子数据执行完成，共执行 ${executedCount} 个`);
    }
  },

  /**
   * 回滚指定种子（需 seed 文件提供 down 方法）
   */
  async rollback(plugin: string, version: string) {
    await this.ensureSeedTable();

    const files = await this.getSeedFiles(plugin);
    const target = files.find((f) => f.version === version);
    if (!target) {
      throw new Error(`未找到种子脚本: ${plugin} v${version}`);
    }

    const executed = await this.getExecutedSeeds(plugin);
    if (!executed.includes(version)) {
      throw new Error(`种子未执行，无法回滚: ${plugin} v${version}`);
    }

    await this.runSeed(plugin, version, target.name, target.filePath, "down");
    strapi.log.info(`[seed] ${plugin}: v${version} 回滚成功`);
  },

  /**
   * 列出所有种子文件及执行状态（供诊断使用）
   */
  async listSeeds(plugin?: string) {
    await this.ensureSeedTable();
    const plugins = plugin ? [plugin] : PLUGIN_ORDER.filter((p) => Object.keys(strapi.plugins).includes(p));
    const result: Array<{ plugin: string; version: string; name: string; executed: boolean; executedAt?: string }> = [];

    for (const p of plugins) {
      const files = await this.getSeedFiles(p);
      const executed = await this.getExecutedSeeds(p);
      const executedRows = await strapi.db.connection(SEED_TABLE).where({ plugin: p }).select("version", "executed_at");
      const executedMap = new Map(executedRows.map((r: any) => [r.version, r.executed_at]));

      for (const f of files) {
        result.push({
          plugin: p,
          version: f.version,
          name: f.name,
          executed: executed.includes(f.version),
          executedAt: executedMap.get(f.version),
        });
      }
    }
    return result;
  },
});
