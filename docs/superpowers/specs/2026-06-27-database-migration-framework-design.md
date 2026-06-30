# Strapi 插件数据库迁移框架设计

## 背景

Strapi v5 仅在首次运行时自动创建数据库表结构，上线后新增字段/关系不会自动迁移。
本设计提供一套版本化、可审计、可回滚的数据库迁移框架，适用于已上线的 Strapi 项目。

## 目标

1. 上线后新增 schema 变更（字段、关系、索引）可控、可追溯
2. 支持多插件各自管理自己的迁移
3. 支持回滚（手动触发）
4. 开发环境与生产环境行为一致

## 整体架构

```
zhao-common (迁移调度器)
  ├── services/migration-runner.ts   # 迁移执行核心
  ├── bootstrap.ts                    # 启动时触发迁移
  └── 迁移记录表 zhao_schema_migrations

zhao-channel (插件示例)
  └── server/database/migrations/
      └── 001_add_site_column.js      # 迁移脚本

zhao-xxx (其他插件)
  └── server/database/migrations/
      └── 00X_xxx.js
```

## 迁移记录表

表名：`zhao_schema_migrations`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 主键 |
| plugin | varchar(64) | NOT NULL | 插件名（如 "zhao-channel"） |
| version | varchar(32) | NOT NULL | 版本号（如 "001"） |
| name | varchar(255) | NOT NULL | 迁移名称（如 "add_site_column"） |
| executed_at | timestamp | NOT NULL DEFAULT NOW() | 执行时间 |

唯一约束：`(plugin, version)`

## 迁移脚本规范

### 目录结构

每个插件的迁移脚本放在 `server/database/migrations/` 下。

### 命名规则

`{NNN}_{descriptive-name}.js`

- NNN：3 位数字版本号，从 001 开始
- descriptive-name：简短描述，用下划线分隔
- 示例：`001_add_site_column.js`

### 脚本格式

```javascript
module.exports = {
  name: "add_site_column",

  async up({ strapi, db }) {
    // 迁移逻辑
    // db 是 knex 实例：strapi.db.connection
  },

  async down({ strapi, db }) {
    // 回滚逻辑（可选）
  },
};
```

### 可用参数

- `strapi`：Strapi 实例
- `db`：knex 实例（`strapi.db.connection` 的别名）

## 执行流程

### 启动时自动执行（up）

1. zhao-common bootstrap 启动
2. 检查 `zhao_schema_migrations` 表是否存在，不存在则创建
3. 扫描所有已启用的 `zhao-*` 插件的 `server/database/migrations/` 目录
4. 按插件依赖顺序排序（zhao-common 最先）
5. 对每个插件：
   a. 读取所有迁移脚本，按版本号升序排序
   b. 查询已执行的版本
   c. 找出未执行的迁移
   d. 逐个执行 `up`
   e. 写入迁移记录表
6. 全部完成后继续启动流程

### 手动回滚（down）

通过 admin API 手动触发：

```
POST /zhao-common/v1/admin/migrations/rollback
Body: { plugin: "zhao-channel", version: "001" }
```

1. 校验插件和版本号
2. 加载对应迁移脚本
3. 执行 `down` 方法
4. 从迁移记录表删除对应记录

## 插件执行顺序

按依赖关系从底向上执行：

1. zhao-common（基础，最先执行）
2. zhao-tag, zhao-oss
3. zhao-channel
4. zhao-auth
5. zhao-course, zhao-point, zhao-quiz
6. zhao-third, zhao-wealth, zhao-sso, zhao-studio

通过插件名前缀约定顺序，不做复杂的依赖解析。

## 并发安全

利用数据库唯一约束 `(plugin, version)` 保证同一迁移只执行一次：
- 多个实例同时启动时，先 insert 成功的执行迁移
- 另一个实例 insert 失败（唯一冲突），跳过该版本

## 环境差异

| 环境 | DATABASE_FORCE_MIGRATION | 迁移脚本 |
|------|--------------------------|----------|
| 开发 | true（Strapi 自动同步） | 仍然执行（数据迁移/复杂变更） |
| 生产 | false | 完全依赖迁移脚本 |

开发环境开启 force 不影响迁移脚本执行，迁移脚本只处理 force 不做的事情。

## 失败处理

- 迁移执行失败时：抛出异常，中断启动流程（fail-fast）
- 已成功的迁移不回滚
- 修复脚本后重新启动，从失败的版本继续

## 第一个迁移脚本

解决当前 channel.site 字段缺失问题：

**插件**：zhao-channel
**版本**：001
**名称**：add_site_column
**内容**：
- 检查 `zhao_channels` 表是否有 `site_id` 列
- 如果没有，添加 `site_id` 整数列
- 添加外键约束，关联 `zhao_site_configs(id)`
- down：删除外键约束和 `site_id` 列

## 非目标

1. 不支持数据迁移的 dry-run（后续可加）
2. 不做自动回滚（生产环境风险高）
3. 不处理 schema 对比自动生成迁移（手动编写）
