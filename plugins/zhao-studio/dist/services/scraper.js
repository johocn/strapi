"use strict";
// server/src/services/scraper.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const selectors_1 = require("../utils/selectors");
const templates_1 = require("../utils/templates");
const errors_1 = require("../utils/errors");
exports.default = ({ strapi }) => ({
    async fetchTitles(sourceId) {
        const source = await strapi
            .documents('plugin::zhao-studio.collect-source')
            .findOne({ documentId: sourceId });
        if (!source) {
            throw new Error('采集源不存在');
        }
        try {
            const response = await axios_1.default.get(source.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const selector = source.type === 'template' && source.template
                ? (0, templates_1.getTemplate)(source.template)?.titleSelector || source.titleSelector
                : source.titleSelector;
            const titles = (0, selectors_1.extractTitles)(response.data, selector);
            const filteredTitles = (0, selectors_1.filterDuplicates)(titles);
            return filteredTitles;
        }
        catch (error) {
            const errorType = (0, errors_1.identifyErrorType)(error);
            throw new Error(errorType.message);
        }
    },
    async fetchContent(url, sourceId) {
        const source = await strapi
            .documents('plugin::zhao-studio.collect-source')
            .findOne({ documentId: sourceId });
        if (!source) {
            throw new Error('采集源不存在');
        }
        try {
            const response = await axios_1.default.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const template = source.type === 'template' && source.template
                ? (0, templates_1.getTemplate)(source.template)
                : null;
            const contentSelector = template?.contentSelector || source.contentSelector;
            const authorSelector = template?.authorSelector || source.authorSelector;
            const dateSelector = template?.dateSelector || source.dateSelector;
            const content = (0, selectors_1.extractContent)(response.data, contentSelector, authorSelector, dateSelector);
            return content;
        }
        catch (error) {
            const errorType = (0, errors_1.identifyErrorType)(error);
            throw new Error(errorType.message);
        }
    },
});
//# sourceMappingURL=scraper.js.map