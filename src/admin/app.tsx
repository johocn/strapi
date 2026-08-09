import type { StrapiApp } from '@strapi/strapi/admin';

// 内容类型中文 displayName 翻译，解决 Content Manager 的 MISSING_TRANSLATION 警告
// Strapi Content Manager 对每个 content type 的 displayName 调用 formatMessage，
// 中文 displayName 在 en/zh-Hans locale 的 messages 中找不到对应 key 会报错
import contentTypeTranslations from './translations/content-types-zh-Hans.json';

// 各插件 zh-Hans 翻译聚合（作为 registerTrads 兜底，确保 plugin.name 等 key 始终有翻译）
// 注意：Vite admin root 是 src/admin/，无法跨目录引用 ../plugins/...，
// 所以将所有插件翻译聚合到本目录内的 plugins-zh-Hans.json
import pluginTranslations from './translations/plugins-zh-Hans.json';

// 框架杂项翻译：英文 content type displayName（如 Channel Member、SSO User）+ Strapi 内部 widget key
import frameworkMiscTranslations from './translations/framework-misc-zh-Hans.json';

export default {
  config: {
    // 注册中文 locale，触发 Strapi 加载各插件的 zh-Hans.json 翻译
    locales: ['zh-Hans'],
    translations: {
      // 默认 locale (en)：中文 displayName 作为 key，值等于 key 本身
      en: { ...contentTypeTranslations },
      // 中文 locale：content type displayName + 插件翻译 + 框架杂项
      'zh-Hans': {
        ...contentTypeTranslations,
        ...pluginTranslations,
        ...frameworkMiscTranslations,
      },
    },
  },
  bootstrap(app: StrapiApp) {
    // 可在此添加自定义引导逻辑
  },
};
