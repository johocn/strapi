import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findByProvider(provider: string): Promise<{
        id: any;
        documentId: any;
        provider: any;
        appId: any;
        appSecret: any;
        scope: any;
        extraConfig: any;
        redirectUris: any;
        isEnabled: any;
    }>;
    list(): Promise<any[]>;
    create(data: {
        provider: string;
        app_id: string;
        app_secret: string;
        scope?: string;
        extra_config?: any;
        redirect_uris?: string[];
        is_enabled?: boolean;
        description?: string;
    }): Promise<any>;
    update(id: number, data: Record<string, any>): Promise<any>;
    delete(id: number): Promise<any>;
};
export default _default;
