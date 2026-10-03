// server/src/services/rpa/xiaohongshu.ts
// 小红书创作中心（creator.xiaohongshu.com）图文发布驱动。
//
// ⚠️ 选择器状态：未在真实浏览器实测（当前无 RPA 验证环境）。
//    选择器集中在本文件 SELECTORS，均为「多候选兜底」写法，改站点只需改这一处。
//    真机调试入口：发布失败时 rpa-client 会把截图 + DOM 落到 <tmp>/zhao-rpa-debug/，
//    对照实际 DOM 增删 SELECTORS 候选即可，无需改动流程代码。
import { step, toUploadPayload, isLocalPath } from './shared';
import type { RpaDriver, RpaPublishInput, RpaPublishOutput } from './types';

const SELECTORS = {
  /** 发布页顶部「上传图文 / 上传视频」切换 */
  imageTextTab: 'div.creator-tab:has-text("上传图文"), span:has-text("上传图文"), div:has-text("上传图文")',

  /** 图片文件输入框 */
  fileInput: 'input[type="file"]',

  /** 标题输入（占位符含「标题」） */
  titleInput: 'input[placeholder*="标题"], input.d-text, .title-input input',

  /** 正文富文本编辑器（Quill） */
  contentEditor: 'div.ql-editor, div[contenteditable="true"], #post-textarea',

  /** 「发布」按钮 */
  publishButton: 'button:has-text("发布"), div.publishBtn button, button.d-button.primary',

  /** 发布成功标志：成功页或成功提示 */
  successIndicator: 'text=发布成功, text=笔记发布成功, text=发布完成',
};

async function uploadImages(page: any, images: string[] | undefined): Promise<void> {
  if (!images?.length) return;
  await step('uploadImages', async () => {
    const input = page.locator(SELECTORS.fileInput).first();
    await input.waitFor({ state: 'attached', timeout: 20000 });
    const payloads = [];
    for (const src of images) {
      payloads.push(isLocalPath(src) ? src : await toUploadPayload(src));
    }
    await input.setInputFiles(payloads as any);
    // 图片上传+校验是异步的，等 FileReader 处理完（平台无稳定信号，退化为固定等待）
    await page.waitForTimeout(4000);
  });
}

const driver: RpaDriver = {
  platform: 'xiaohongshu',

  async publish(page: any, input: RpaPublishInput, _workDir: string): Promise<RpaPublishOutput> {
    // 1. 切到「上传图文」Tab
    await step('selectImageTextTab', async () => {
      const tab = page.locator(SELECTORS.imageTextTab).first();
      await tab.waitFor({ state: 'visible', timeout: 30000 });
      await tab.click();
    });

    // 2. 上传配图（小红书图文至少 1 张）
    await uploadImages(page, input.images ?? (input.coverImage ? [input.coverImage] : undefined));

    // 3. 标题（平台上限 20 字）
    await step('fillTitle', async () => {
      const title = page.locator(SELECTORS.titleInput).first();
      await title.waitFor({ state: 'visible', timeout: 20000 });
      await title.fill((input.title || '').slice(0, 20));
    });

    // 4. 正文
    await step('fillContent', async () => {
      const editor = page.locator(SELECTORS.contentEditor).first();
      await editor.waitFor({ state: 'visible', timeout: 20000 });
      await editor.click();
      await editor.fill(input.content || '');
    });

    // 5. 发布
    await step('clickPublish', async () => {
      const btn = page.locator(SELECTORS.publishButton).last();
      await btn.waitFor({ state: 'visible', timeout: 20000 });
      await btn.click();
    });

    // 6. 等成功（URL 跳转成功页 或 出现成功文案）
    await step('awaitSuccess', async () => {
      try {
        await page.waitForURL(/publish\/success|note-manager/, { timeout: 30000 });
      } catch {
        await page.locator(SELECTORS.successIndicator).first().waitFor({ state: 'visible', timeout: 15000 });
      }
    });

    const url: string = page.url();
    return {
      success: true,
      externalId: url.split('/').filter(Boolean).pop(),
      url,
    };
  },
};

export default driver;