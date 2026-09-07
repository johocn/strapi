import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    beforeUpdate(event: any): Promise<void>;
    beforeCreate(event: any): Promise<void>;
};
export default _default;
