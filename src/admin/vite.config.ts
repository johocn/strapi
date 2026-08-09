import { mergeConfig, type UserConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Strapi admin Vite 自定义配置
 *
 * 修复 sanitize-html（@strapi/admin / @strapi/content-manager 依赖）在浏览器端
 * 引用 Node 内置模块（path/fs/url/source-map-js）导致的 externalize 警告。
 *
 * 通过 resolve.alias 将 Node 内置模块映射到浏览器 polyfill，
 * 避免 "Module has been externalized for browser compatibility" 警告。
 */
export default (config: UserConfig) => {
  // polyfill 文件目录（项目根目录/src/admin/polyfills）
  const polyfillDir = resolve(process.cwd(), 'src', 'admin', 'polyfills');
  return mergeConfig(config, {
    resolve: {
      alias: {
        // Node 内置模块 → 浏览器 polyfill
        path: resolve(polyfillDir, 'path-browserify.js'),
        fs: resolve(polyfillDir, 'fs-browserify.js'),
        url: resolve(polyfillDir, 'url-browserify.js'),
        'source-map-js': resolve(polyfillDir, 'source-map-browserify.js'),
      },
    },
    define: {
      // 部分 CJS 模块引用 global，浏览器端映射到 globalThis
      global: 'globalThis',
    },
    optimizeDeps: {
      // 确保 sanitize-html / postcss 被预构建，CJS → ESM 转换
      include: ['sanitize-html', 'postcss'],
    },
  });
};
