import fs from "fs";
import path from "path";
import type { Core } from "@strapi/strapi";

const MIGRATION_TABLE = "zhao_schema_migrations";

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
];

function getPluginRoot(plugin: string): string {
  try {
    // 使用 require.resolve 获取插件根目录
    const pluginMain = require.resolve(`${plugin}/strapi-server.js`, { paths: [process.cwd()] });
    return path.dirname(path.dirname(pluginMain)); // plugins/zhao-channel/strapi-server.js -> plugins/zhao-channel
  } catch {
    // 兜底：使用 module 对象获取当前文件位置
    try {
      // @ts-ignore
      const currentFile = typeof __filename !== 'undefined' ? __filename : module.filename;
      const migrationRunnerDir = path.dirname(String(currentFile));
      const serverDir = path.dirname(migrationRunnerDir);
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
  async ensureMigrationTable() {
    const hasTable = await strapi.db.connection.schema.hasTable(MIGRATION_TABLE);
    if (!hasTable) {
      await strapi.db.connection.schema.createTable(MIGRATION_TABLE, (table: any) => {
        table.increments("id").primary();
        table.string("plugin", 64).notNullable();
        table.string("version", 32).notNullable();
        table.string("name", 255).notNullable();
        table.timestamp("executed_at").notNullable().defaultTo(strapi.db.connection.fn.now());
        table.unique(["plugin", "version"]);
      });
      strapi.log.info("[migration] 迁移记录表已创建");
    }
  },

  async getExecutedMigrations(plugin: string): Promise<string[]> {
    const rows = await strapi.db.connection(MIGRATION_TABLE)
      .where({ plugin })
      .select("version");
    return rows.map((r: any) => r.version);
  },

  async getMigrationFiles(plugin: string): Promise<Array<{ version: string; name: string; filePath: string }>> {
    const pluginRoot = getPluginRoot(plugin);
    const migrationsDir = path.join(pluginRoot, "server", "database", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".js") || f.endsWith(".ts"))
      .sort();

    const result: Array<{ version: string; name: string; filePath: string }> = [];
    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.(js|ts)$/);
      if (match) {
        result.push({
          version: match[1],
          name: match[2],
          filePath: path.join(migrationsDir, file),
        });
      }
    }
    return result;
  },

  async runMigration(plugin: string, version: string, name: string, filePath: string, direction: "up" | "down" = "up") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const migration = require(filePath);
    const fn = migration[direction];
    if (!fn) {
      if (direction === "down") return;
      throw new Error(`迁移脚本 ${filePath} 缺少 ${direction} 方法`);
    }

    const ctx = {
      strapi,
      db: strapi.db.connection,
    };

    await fn(ctx);

    if (direction === "up") {
      await strapi.db.connection(MIGRATION_TABLE).insert({
        plugin,
        version,
        name,
      });
    } else {
      await strapi.db.connection(MIGRATION_TABLE)
        .where({ plugin, version })
        .del();
    }
  },

  async runAllMigrations() {
    await this.ensureMigrationTable();

    const enabledPlugins = Object.keys(strapi.plugins).filter((p) => p.startsWith("zhao-"));
    const sortedPlugins = PLUGIN_ORDER.filter((p) => enabledPlugins.includes(p));

    let executedCount = 0;
    for (const plugin of sortedPlugins) {
      const files = await this.getMigrationFiles(plugin);
      if (files.length === 0) continue;

      const executed = await this.getExecutedMigrations(plugin);
      const pending = files.filter((f) => !executed.includes(f.version));

      if (pending.length === 0) continue;

      for (const file of pending) {
        try {
          await this.runMigration(plugin, file.version, file.name, file.filePath, "up");
          executedCount++;
        } catch (err: any) {
          strapi.log.error(`[migration] ${plugin}: v${file.version} ${file.name} 执行失败: ${err.message}`);
          throw err;
        }
      }
    }

    if (executedCount > 0) {
      strapi.log.info(`[migration] 数据库迁移完成，共执行 ${executedCount} 个`);
    }
  },

  async rollback(plugin: string, version: string) {
    await this.ensureMigrationTable();

    const files = await this.getMigrationFiles(plugin);
    const target = files.find((f) => f.version === version);
    if (!target) {
      throw new Error(`未找到迁移脚本: ${plugin} v${version}`);
    }

    const executed = await this.getExecutedMigrations(plugin);
    if (!executed.includes(version)) {
      throw new Error(`迁移未执行，无法回滚: ${plugin} v${version}`);
    }

    await this.runMigration(plugin, version, target.name, target.filePath, "down");
    strapi.log.info(`[migration] ${plugin}: v${version} 回滚成功`);
  },
});
