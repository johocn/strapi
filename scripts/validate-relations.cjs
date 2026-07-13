/**
 * 校验所有 content-type schema 的关系引用
 * 检查每个 inversedBy/mappedBy 是否在 target 中有对应属性
 * 用法: node scripts/validate-relations.cjs
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const types = {};

// 1. 扫描插件 content-types
const pluginsDir = path.join(PROJECT_ROOT, 'plugins');
if (fs.existsSync(pluginsDir)) {
  for (const plugin of fs.readdirSync(pluginsDir)) {
    const ctDir = path.join(pluginsDir, plugin, 'server/src/content-types');
    if (!fs.existsSync(ctDir)) continue;
    for (const ct of fs.readdirSync(ctDir)) {
      const schemaPath = path.join(ctDir, ct, 'schema.json');
      if (!fs.existsSync(schemaPath)) continue;
      const raw = fs.readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(raw.replace(/^\uFEFF/, ''));
      const key = `plugin::${plugin}.${ct}`;
      types[key] = schema;
    }
  }
}

// 2. 扫描主项目 API content-types
const apiDir = path.join(PROJECT_ROOT, 'src/api');
if (fs.existsSync(apiDir)) {
  for (const api of fs.readdirSync(apiDir)) {
    const ctDir = path.join(apiDir, api, 'content-types');
    if (!fs.existsSync(ctDir)) continue;
    for (const ct of fs.readdirSync(ctDir)) {
      const schemaPath = path.join(ctDir, ct, 'schema.json');
      if (!fs.existsSync(schemaPath)) continue;
      const raw = fs.readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(raw.replace(/^\uFEFF/, ''));
      const key = `api::${api}.${ct}`;
      types[key] = schema;
    }
  }
}

console.log(`共扫描 ${Object.keys(types).length} 个 content-types\n`);

// 3. 检查所有关系
let errors = 0;
for (const [key, schema] of Object.entries(types)) {
  for (const [attrName, attr] of Object.entries(schema.attributes || {})) {
    if (attr.type !== 'relation') continue;

    const target = attr.target;
    if (!target) continue;

    // 检查 target 是否存在（跳过 Strapi 内置类型如 admin::user）
    if (!types[target]) {
      // 内置类型不校验
      if (target.startsWith('admin::') || target.startsWith('plugin::') && !target.startsWith('plugin::zhao-')) {
        continue;
      }
      console.log(`⚠️  ${key}.${attrName}: target "${target}" 不在自定义 content-types 中（可能是内置类型）`);
      continue;
    }

    // 检查 inversedBy
    if (attr.inversedBy) {
      const targetAttr = types[target].attributes?.[attr.inversedBy];
      if (!targetAttr) {
        console.log(`❌ ${key}.${attrName}: inversedBy "${attr.inversedBy}" 在 ${target} 中不存在`);
        errors++;
      } else if (targetAttr.type !== 'relation') {
        console.log(`❌ ${key}.${attrName}: inversedBy "${attr.inversedBy}" 在 ${target} 中不是关系类型`);
        errors++;
      }
    }

    // 检查 mappedBy
    if (attr.mappedBy) {
      const targetAttr = types[target].attributes?.[attr.mappedBy];
      if (!targetAttr) {
        console.log(`❌ ${key}.${attrName}: mappedBy "${attr.mappedBy}" 在 ${target} 中不存在`);
        errors++;
      } else if (targetAttr.type !== 'relation') {
        console.log(`❌ ${key}.${attrName}: mappedBy "${attr.mappedBy}" 在 ${target} 中不是关系类型`);
        errors++;
      }
    }
  }
}

if (errors === 0) {
  console.log('✅ 所有自定义 content-type 的关系引用验证通过');
} else {
  console.log(`\n共发现 ${errors} 个错误`);
}
process.exit(errors > 0 ? 1 : 0);
