"use strict";
// server/src/utils/templates.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteTemplates = void 0;
exports.getTemplate = getTemplate;
exports.getAllTemplates = getAllTemplates;
exports.websiteTemplates = {
    'sina-finance': {
        name: '新浪财经',
        urlPattern: 'https://finance.sina.com.cn/roll/',
        titleSelector: '.news-item h2 a',
        contentSelector: '.article-content',
        authorSelector: '.article-author',
        dateSelector: '.article-time',
    },
    'sohu-tech': {
        name: '搜狐科技',
        urlPattern: 'https://it.sohu.com/',
        titleSelector: '.news-list li a',
        contentSelector: '.article-body',
        authorSelector: '.author-name',
        dateSelector: '.publish-time',
    },
    'netease-news': {
        name: '网易新闻',
        urlPattern: 'https://news.163.com/',
        titleSelector: '.news_title a',
        contentSelector: '.post_body',
        authorSelector: '.post_author',
        dateSelector: '.post_time',
    },
    'tencent-tech': {
        name: '腾讯科技',
        urlPattern: 'https://new.qq.com/ch/tech/',
        titleSelector: '.list-item .title a',
        contentSelector: '.content-article',
        authorSelector: '.author',
        dateSelector: '.time',
    },
};
function getTemplate(templateId) {
    return exports.websiteTemplates[templateId];
}
function getAllTemplates() {
    return Object.values(exports.websiteTemplates);
}
//# sourceMappingURL=templates.js.map