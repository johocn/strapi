"use strict";
// server/src/services/rpa/bilibili.ts
// bilibili RPA driver — 图文专栏 + 视频投稿
// ⚠️ 选择器需真实浏览器环境实测，当前是通用占位结构 + TODO 标记
Object.defineProperty(exports, "__esModule", { value: true });
exports.bilibili = void 0;
exports.bilibili = {
    platform: 'bilibili',
    async publish(page, input, workDir) {
        const hasVideo = !!input.videoUrl;
        if (hasVideo) {
            return await this.publishVideo(page, input, workDir);
        }
        else {
            return await this.publishArticle(page, input);
        }
    },
    // ─── 视频投稿 ───
    async publishVideo(page, input, _workDir) {
        // 当前页已在 RPA_PLATFORMS.publishUrl（member.bilibili.com 视频上传页）
        // TODO: 选择器需实测 bilibili 创作中心视频上传 DOM
        // 1. 等上传区域渲染
        // const uploadInput = page.locator('input[type="file"]');
        // await uploadInput.setInputFiles(videoLocalPath);
        // await page.waitForSelector('.upload-progress:has-text("100%")', { timeout: 120000 });
        // 2. 填标题
        // await page.fill('input[placeholder="填写作品标题"]', input.title);
        // 3. 填简介（可选）
        // if (input.content) await page.fill('textarea[placeholder="填写作品简介"]', input.content);
        // 4. 点发布
        // await page.click('button:has-text("发布")');
        // await page.waitForURL('**/video/**', { timeout: 30000 });
        // 5. 取 bvid
        // const url = page.url();
        // const match = url.match(/bvid=([^&/]+)/) || url.match(/\/BV[\w]+/);
        return {
            success: true,
            externalId: 'bilibili-bvid-TODO-selector-needed',
            url: '',
        };
    },
    // ─── 图文专栏 ───
    async publishArticle(page, input) {
        // bilibili RPA_PLATFORMS.publishUrl 默认是视频上传页
        // 图文专栏入口：从创作中心点"专栏"tab → https://member.bilibili.com/platform/article/frame.html
        // TODO: 实际导航需实测
        // await page.goto('https://member.bilibili.com/platform/article/frame.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
        // 1. 填标题
        // await page.fill('input.article-title-input', input.title);
        // 2. 填正文（markdown 或富文本）
        // await page.fill('.editor-content', input.content);
        // 3. 点发布
        // await page.click('button:has-text("发布")');
        // await page.waitForSelector('.article-publish-success', { timeout: 30000 });
        // 4. 取 articleId
        // const url = page.url();
        // const match = url.match(/\/(\d{10,})\//);
        return {
            success: true,
            externalId: 'bilibili-article-id-TODO-selector-needed',
            url: '',
        };
    },
};
exports.default = exports.bilibili;
//# sourceMappingURL=bilibili.js.map