"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 插件配置 - 相对路径方案
 * 适用于：Linux/Mac/通用环境
 * 插件目录：./plugins/（相对于项目根目录）
 */
const config = ({ env }) => ({
    i18n: {
        enabled: true,
        config: {
            defaultLocale: "zh-CN",
            locales: [
                { code: "zh-CN", name: "中文 (简体)" },
            ],
        },
    },
    "zhao-auth": {
        enabled: true,
        resolve: "./plugins/zhao-auth",
        config: {
            authenticate: {
                publicPaths: [
                    '/api/auth/local',
                    '/api/auth/local/register',
                    '/api/auth/forgot-password',
                    '/api/auth/reset-password',
                    '/admin',
                    '/_health',
                    '/documentation',
                    '/api/auth/email-confirmation',
                    '/api/auth/send-email-confirmation',
                    '/api/connect/(.*)',
                ],
            },
        },
    },
    "zhao-channel": {
        enabled: true,
        resolve: "./plugins/zhao-channel",
    },
    "zhao-common": {
        enabled: true,
        resolve: "./plugins/zhao-common",
    },
    "zhao-third": {
        enabled: true,
        resolve: "./plugins/zhao-third",
        config: {
            platforms: {
                wechat: {
                    official_account: {
                        authorizeUrl: "https://open.weixin.qq.com/connect/oauth2/authorize",
                        parameters: ["appid", "redirect_uri", "response_type", "scope", "state"],
                    },
                    mini_program: {},
                    open_platform: {
                        authorizeUrl: "https://open.weixin.qq.com/connect/qrconnect",
                        parameters: ["appid", "redirect_uri", "response_type", "scope", "state"],
                    },
                },
                alipay: {
                    h5: {
                        authorizeUrl: "https://openauth.alipay.com/oauth2/publicAppAuthorize.htm",
                        parameters: ["app_id", "scope", "redirect_uri"],
                    },
                },
                douyin: {
                    h5: {
                        authorizeUrl: "https://open.douyin.com/platform/oauth/connect",
                        parameters: ["client_key", "scope", "redirect_uri", "response_type", "state"],
                    },
                },
            },
        },
    },
    "zhao-course": {
        enabled: true,
        resolve: "./plugins/zhao-course",
    },
    "zhao-deal": {
        enabled: true,
        resolve: "./plugins/zhao-deal",
    },
    "zhao-track": {
        enabled: true,
        resolve: "./plugins/zhao-track",
    },
    "zhao-point": {
        enabled: true,
        resolve: "./plugins/zhao-point",
    },
    "zhao-quiz": {
        enabled: true,
        resolve: "./plugins/zhao-quiz",
    },
    "zhao-oss": {
        enabled: true,
        resolve: "./plugins/zhao-oss",
        config: {
            providers: [
                {
                    name: "aliyun",
                    enabled: true,
                    primary: true,
                    options: {
                        accessKeyId: env("ALIYUN_OSS_ACCESS_KEY_ID"),
                        accessKeySecret: env("ALIYUN_OSS_ACCESS_KEY_SECRET"),
                        bucket: env("ALIYUN_OSS_BUCKET"),
                        region: env("ALIYUN_OSS_REGION"),
                    },
                },
            ],
            maxRetries: 3,
            uploadTimeoutMs: 30000,
            referenceMap: [
                // ============ 官网中心 (zhao-website) — 18 字段 ============
                { uid: "plugin::zhao-website.article", field: "coverImage", label: "资讯文章-封面图" },
                { uid: "plugin::zhao-website.article", field: "ogImage", label: "资讯文章-OG分享图" },
                { uid: "plugin::zhao-website.brand-info", field: "logo", label: "企业品牌-Logo" },
                { uid: "plugin::zhao-website.brand-info", field: "logoDark", label: "企业品牌-深色Logo" },
                { uid: "plugin::zhao-website.brand-info", field: "favicon", label: "企业品牌-Favicon" },
                { uid: "plugin::zhao-website.brand-info", field: "wechatQrCode", label: "企业品牌-微信二维码" },
                { uid: "plugin::zhao-website.case", field: "clientLogo", label: "落地案例-客户Logo" },
                { uid: "plugin::zhao-website.case", field: "coverImage", label: "落地案例-封面图" },
                { uid: "plugin::zhao-website.case", field: "images", label: "落地案例-案例图集", collection: true },
                { uid: "plugin::zhao-website.download", field: "file", label: "下载文件-下载文件", required: true },
                { uid: "plugin::zhao-website.knowledge-entity", field: "image", label: "知识图谱实体-实体图片" },
                { uid: "plugin::zhao-website.product", field: "coverImage", label: "产品/方案-封面图" },
                { uid: "plugin::zhao-website.product", field: "images", label: "产品/方案-产品图集", collection: true },
                { uid: "plugin::zhao-website.product", field: "ogImage", label: "产品/方案-OG分享图" },
                { uid: "plugin::zhao-website.seo-config", field: "ogImage", label: "SEO配置-默认OG图" },
                { uid: "plugin::zhao-website.seo-config", field: "favicon", label: "SEO配置-Favicon" },
                { uid: "plugin::zhao-website.seo-config", field: "organizationLogo", label: "SEO配置-组织Logo" },
                { uid: "plugin::zhao-website.tutorial", field: "coverImage", label: "教程-封面图" },
                // ============ 物流中心 (zhao-logistics) — 3 字段 ============
                { uid: "plugin::zhao-logistics.landing-page", field: "ogImage", label: "营销落地页-OG分享图" },
                { uid: "plugin::zhao-logistics.review", field: "videoPoster", label: "客户评价-视频封面" },
                { uid: "plugin::zhao-logistics.review", field: "images", label: "客户评价-评价图集", collection: true },
                // ============ 课程中心 (zhao-course) — 5 字段 ============
                { uid: "plugin::zhao-course.course", field: "cover", label: "课程-封面图" },
                { uid: "plugin::zhao-course.course", field: "thumbnail", label: "课程-缩略图" },
                { uid: "plugin::zhao-course.course-lesson", field: "thumbnail", label: "课时-缩略图" },
                { uid: "plugin::zhao-course.course-lesson", field: "images", label: "课时-图片集", collection: true },
                { uid: "plugin::zhao-course.course-lesson", field: "attachments", label: "课时-附件", collection: true },
                // ============ 站点配置 (zhao-common) — 3 字段 ============
                { uid: "plugin::zhao-common.site-config", field: "logo", label: "站点配置-Logo" },
                { uid: "plugin::zhao-common.site-config", field: "favicon", label: "站点配置-Favicon" },
                { uid: "plugin::zhao-common.site-config", field: "shareImage", label: "站点配置-分享图" },
                // ============ 标签管理 (zhao-tag) — 2 字段 ============
                { uid: "plugin::zhao-tag.tag-group", field: "icon", label: "标签分组-图标" },
                { uid: "plugin::zhao-tag.tag", field: "icon", label: "标签-图标" },
                // ============ 测验 (zhao-quiz) — 2 字段 ============
                { uid: "plugin::zhao-quiz.quiz-batch", field: "file", label: "测验批次-文件" },
                { uid: "plugin::zhao-quiz.quiz-batch", field: "templateFile", label: "测验批次-模板文件" },
                // ============ 积分商城 (zhao-point) — 5 字段 ============
                { uid: "plugin::zhao-point.point-product", field: "coverImage", label: "积分商品-封面图" },
                { uid: "plugin::zhao-point.point-product", field: "images", label: "积分商品-图集", collection: true },
                { uid: "plugin::zhao-point.point-product", field: "video", label: "积分商品-视频" },
                { uid: "plugin::zhao-point.pickup-location", field: "businessLicense", label: "自提点-营业执照" },
                { uid: "plugin::zhao-point.pickup-location", field: "coverImage", label: "自提点-封面图" },
                // ============ 优惠券中心 (zhao-deal) — 3 字段 ============
                { uid: "plugin::zhao-deal.category", field: "icon", label: "商品分类-图标" },
                { uid: "plugin::zhao-deal.product", field: "mainImage", label: "商品-主图" },
                { uid: "plugin::zhao-deal.coupon-collection", field: "coverImage", label: "优惠券合集-封面图" },
            ],
        },
    },
    "zhao-sso": {
        enabled: true,
        resolve: "./plugins/zhao-sso",
    },
    "zhao-tag": {
        enabled: true,
        resolve: "./plugins/zhao-tag",
    },
    "zhao-wealth": {
        enabled: true,
        resolve: "./plugins/zhao-wealth",
    },
    "zhao-studio": {
        enabled: true,
        resolve: "./plugins/zhao-studio",
    },
    "zhao-website": {
        enabled: true,
        resolve: "./plugins/zhao-website",
    },
    "zhao-logistics": {
        enabled: true,
        resolve: "./plugins/zhao-logistics",
    },
});
exports.default = config;
