"use strict";
// server/src/utils/selectors.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTitles = extractTitles;
exports.extractContent = extractContent;
exports.filterDuplicates = filterDuplicates;
const cheerio = __importStar(require("cheerio"));
function extractTitles(html, selector) {
    const $ = cheerio.load(html);
    const titles = [];
    $(selector).each((_, element) => {
        const $element = $(element);
        const title = $element.text().trim();
        const url = $element.attr('href') || '';
        if (title && url) {
            titles.push({ title, url });
        }
    });
    return titles;
}
function extractContent(html, contentSelector, authorSelector, dateSelector) {
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || $('title').text().trim();
    const body = $(contentSelector).text().trim();
    const author = authorSelector ? $(authorSelector).text().trim() : undefined;
    const date = dateSelector ? $(dateSelector).text().trim() : undefined;
    const images = [];
    $(contentSelector).find('img').each((_, element) => {
        const src = $(element).attr('src');
        if (src) {
            images.push(src);
        }
    });
    return { title, body, author, date, images };
}
function filterDuplicates(titles) {
    const seen = new Set();
    return titles.filter((title) => {
        const key = title.url;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
//# sourceMappingURL=selectors.js.map