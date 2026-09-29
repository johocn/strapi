import type { Core } from "@strapi/strapi";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    afterCreate(event: any): Promise<void>;
    afterUpdate(event: any): Promise<void>;
    beforeUpdate(event: any): Promise<void>;
    beforeCreate(event: any): Promise<void>;
};
export default _default;
//# sourceMappingURL=lifecycles.d.ts.map