import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    callAI(params: {
        prompt: string;
        type: string;
    }): Promise<any>;
    callQwen(params: {
        prompt: string;
        type: string;
    }, config: any, provider: any): Promise<any>;
    callWenxin(params: {
        prompt: string;
        type: string;
    }, config: any, provider: any): Promise<any>;
    callHunyuan(params: {
        prompt: string;
        type: string;
    }, config: any, provider: any): Promise<any>;
    callSpark(params: {
        prompt: string;
        type: string;
    }, config: any, provider: any): Promise<any>;
    callCustom(params: {
        prompt: string;
        type: string;
    }, config: any): Promise<any>;
    generateSummary(articleId: string, options?: {
        length?: number;
    }): Promise<any>;
    optimizeTitle(articleId: string, style: "formal" | "casual" | "shocking"): Promise<any>;
    rewriteContent(articleId: string, tone: "formal" | "casual" | "humorous"): Promise<any>;
    convertLanguage(articleId: string, target: "simplified" | "traditional"): Promise<any>;
    chat(messages: Array<{
        role: string;
        content: string;
    }>): Promise<{
        content: any;
        role: string;
    }>;
};
export default _default;
//# sourceMappingURL=ai-assist.d.ts.map