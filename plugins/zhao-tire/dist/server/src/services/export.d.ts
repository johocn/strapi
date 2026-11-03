import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    ordersExcel(query?: any): Promise<{
        buffer: Buffer<any>;
        filename: string;
    }>;
};
export default _default;
