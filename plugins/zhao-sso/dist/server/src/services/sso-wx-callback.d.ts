import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 读取服务器配置（供后台展示 / server-url） */
    getServerConfig(): Promise<{
        url: string;
        token: any;
        welcomeReply: any;
        encMode: string;
    }>;
    verifySignature: (params: {
        timestamp?: string | number;
        nonce?: string | number;
        signature?: string;
    }) => Promise<boolean>;
    /**
     * 处理微信推送消息/事件（验签由 controller 层完成，此处只做业务分发与落库）
     * 返回被动回复内容（关注+配置了欢迎语返回文本 XML，否则返回微信认可的 success）
     */
    handleXml(xml: string): Promise<string>;
};
export default _default;
