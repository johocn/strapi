import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    count(where?: any): Promise<number>;
    findMany(params?: {
        orderBy?: any;
    }): Promise<any[]>;
    create(data: {
        app_code: string;
        app_name: string;
        app_secret?: string;
        redirect_uris?: string[];
        allowed_grant_types?: string[];
        is_active?: boolean;
        description?: string;
    }): Promise<any>;
    update(id: number, body: any): Promise<any>;
};
export default _default;
