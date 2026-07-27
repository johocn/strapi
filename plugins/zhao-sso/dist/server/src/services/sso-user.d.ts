import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    createUser(data: {
        username?: string;
        mobile?: string;
        email?: string;
        password?: string;
        register_channel?: string;
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        invite_code_used?: string;
    }): Promise<any>;
    findByIdentifier(identifier: string): Promise<any>;
    findByUuid(uuid: string): Promise<any>;
    verifyPassword(user: any, password: string): Promise<boolean>;
    updateLoginInfo(userId: number, channelCode?: string): Promise<any>;
    changePassword(userId: number, newPassword: string): Promise<any>;
    isBlocked(user: any): Promise<boolean>;
    findById(id: number): Promise<any>;
    bindContact(userId: number, type: string, identifier: string, password?: string): Promise<any>;
    bindThirdParty(userId: number, providerData: {
        provider: string;
        provider_user_id: string;
        nickname?: string;
        avatar?: string;
        raw?: any;
    }): Promise<any>;
    unbindThirdParty(userId: number, provider: string): Promise<any>;
    count(where?: any): Promise<number>;
    findMany(params: {
        where?: any;
        orderBy?: any;
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    findOneWithBindings(id: number): Promise<any>;
    updateAdmin(id: number, body: any): Promise<any>;
};
export default _default;
