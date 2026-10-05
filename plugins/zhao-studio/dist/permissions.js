"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions = [
    // === 基础 CRUD ===
    { section: 'plugins', displayName: 'Read', uid: 'read', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Create', uid: 'create', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Update', uid: 'update', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Delete', uid: 'delete', pluginName: 'zhao-studio' },
    // === 采集模块 ===
    { section: 'plugins', displayName: 'Collect Source Manage', uid: 'collect-source.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Collect Task Manage', uid: 'collect-task.manage', pluginName: 'zhao-studio' },
    // === 发布模块 ===
    { section: 'plugins', displayName: 'Publish Platform Manage', uid: 'publish-platform.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Publish Account Manage', uid: 'publish-account.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Publish Video Manage', uid: 'publish-video.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Publish Gallery Manage', uid: 'publish-gallery.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Publish Record Manage', uid: 'publish-record.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Publish Action', uid: 'publish.publish', pluginName: 'zhao-studio' },
    // === 文章草稿 ===
    { section: 'plugins', displayName: 'Article Draft Manage', uid: 'article-draft.manage', pluginName: 'zhao-studio' },
    // === 知识库 ===
    { section: 'plugins', displayName: 'Knowledge Index Manage', uid: 'knowledge-index.manage', pluginName: 'zhao-studio' },
    // === 统计 ===
    { section: 'plugins', displayName: 'Stat Summary View', uid: 'stat-summary.view', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Browser Log View', uid: 'browser-log.view', pluginName: 'zhao-studio' },
    // === AI ===
    { section: 'plugins', displayName: 'AI Manage', uid: 'ai.manage', pluginName: 'zhao-studio' },
    // === 广告 ===
    { section: 'plugins', displayName: 'Ad Zone Manage', uid: 'ad-zone.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Ad Content Manage', uid: 'ad-content.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Ad Slot Manage', uid: 'ad-slot.manage', pluginName: 'zhao-studio' },
    // === 海报 ===
    { section: 'plugins', displayName: 'Poster Template Manage', uid: 'poster-template.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Poster Element Manage', uid: 'poster-element.manage', pluginName: 'zhao-studio' },
    // === 同步事件 ===
    { section: 'plugins', displayName: 'Sync Event Manage', uid: 'sync-event.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Sync Event Resolve', uid: 'sync-event.resolve', pluginName: 'zhao-studio' },
    // === 推广渠道 ===
    { section: 'plugins', displayName: 'Promo Channel Manage', uid: 'promo-channel.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'Promo Campaign Manage', uid: 'promo-campaign.manage', pluginName: 'zhao-studio' },
    // === A/B 测试 ===
    { section: 'plugins', displayName: 'AB Experiment Manage', uid: 'ab-experiment.manage', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'AB Experiment Start', uid: 'ab-experiment.start', pluginName: 'zhao-studio' },
    { section: 'plugins', displayName: 'AB Experiment Stop', uid: 'ab-experiment.stop', pluginName: 'zhao-studio' },
    // === 渠道报表 ===
    { section: 'plugins', displayName: 'Channel Report View', uid: 'channel-report.view', pluginName: 'zhao-studio' },
];
exports.default = { actions };
//# sourceMappingURL=permissions.js.map