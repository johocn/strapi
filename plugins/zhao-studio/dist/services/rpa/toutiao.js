"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/services/rpa/toutiao.ts
// 头条号创作平台（mp.toutiao.com）图文发布驱动。
//
// ⚠️ 选择器状态：未在真实浏览器实测（当前无 RPA 验证环境）。
//    选择器集中于本文件 SELECTORS，改站点只需改这一处。
//    真机调试入口：发布失败时 rpa-client 会把截图 + DOM 落到 <tmp>/zhao-rpa-debug/。
const shared_1 = require("./shared");
const SELECTORS = {
    /** 标题输入 */
    titleInput: 'textarea[placeholder*="标题"], input[placeholder*="标题"], .article-title textarea',
    /** 正文编辑器（ProseMirror 富文本） */
    contentEditor: 'div.ProseMirror, div[contenteditable="true"], .ql-editor',
    /** 「预览并发布 / 发布」按钮 */
    publishButton: 'button:has-text("预览并发布"), button:has-text("发布"), .publish-btn button',
    /** 二次确认弹层中的「确认发布」 */
    confirmPublish: 'button:has-text("确认发布"), button:has-text("确定")',
    /** 发布成功标志 */
    successIndicator: 'text=发布成功, text=已发布, text=发表成功',
};
const driver = {
    platform: 'toutiao',
    async publish(page, input, _workDir) {
        // 1. 标题
        await (0, shared_1.step)('fillTitle', async () => {
            const title = page.locator(SELECTORS.titleInput).first();
            await title.waitFor({ state: 'visible', timeout: 30000 });
            await title.fill(input.title || '');
        });
        // 2. 正文
        await (0, shared_1.step)('fillContent', async () => {
            const editor = page.locator(SELECTORS.contentEditor).first();
            await editor.waitFor({ state: 'visible', timeout: 20000 });
            await editor.click();
            await editor.fill(input.content || '');
        });
        // 3. 发布
        await (0, shared_1.step)('clickPublish', async () => {
            const btn = page.locator(SELECTORS.publishButton).first();
            await btn.waitFor({ state: 'visible', timeout: 20000 });
            await btn.click();
        });
        // 4. 部分账号有二次确认弹层，命中则点确认
        await (0, shared_1.step)('confirmPublish', async () => {
            const confirm = page.locator(SELECTORS.confirmPublish).first();
            try {
                await confirm.waitFor({ state: 'visible', timeout: 5000 });
                await confirm.click();
            }
            catch {
                /* 无二次确认弹层，跳过 */
            }
        });
        // 5. 等成功
        await (0, shared_1.step)('awaitSuccess', async () => {
            try {
                await page.waitForURL(/graphic\/publish-success|content-manage|profile_v4/, { timeout: 30000 });
            }
            catch {
                await page.locator(SELECTORS.successIndicator).first().waitFor({ state: 'visible', timeout: 15000 });
            }
        });
        const url = page.url();
        return {
            success: true,
            externalId: url.split('/').filter(Boolean).pop(),
            url,
        };
    },
};
exports.default = driver;
//# sourceMappingURL=toutiao.js.map