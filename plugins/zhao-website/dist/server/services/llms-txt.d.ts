import type { Core } from "@strapi/strapi";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generate(siteId: number, siteUrl: string): Promise<string>;
    /**
     * llms-full.txt：在 llms.txt 的导航之上，给出可直接消费的实体、关系三元组与事实清单。
     * 复用公开出口（exportGraph/exportFacts），保证与 JSON 出口同口径、同隔离。
     */
    generateFull(siteId: number, siteUrl: string): Promise<string>;
};
export default _default;
//# sourceMappingURL=llms-txt.d.ts.map