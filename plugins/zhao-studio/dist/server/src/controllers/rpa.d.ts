import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getCookiesStatus(ctx: any): Promise<void>;
    /** 手动录入：从浏览器 DevTools 复制的 cookie JSON 数组 */
    saveCookies(ctx: any): Promise<void>;
    clearCookies(ctx: any): Promise<void>;
    /** 扫码登录：返回二维码截图（dataURL），会话在进程内保留 5 分钟 */
    startLogin(ctx: any): Promise<void>;
    /** 扫码完成后抓取并保存 cookie */
    finishLogin(ctx: any): Promise<void>;
    cancelLogin(ctx: any): Promise<void>;
};
export default _default;
//# sourceMappingURL=rpa.d.ts.map