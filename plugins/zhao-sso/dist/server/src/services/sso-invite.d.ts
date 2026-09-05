import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    validateInviteCode: (code: string, appCode: string) => Promise<any | null>;
    getOrCreateVirtualUser: (inviteCodeRecord: any) => Promise<any>;
    buildReferralRelation: (params: {
        inviteeId: number;
        inviteCode: string;
        appCode: string;
        channelCode?: string;
    }) => Promise<{
        success: boolean;
        message: string;
        skip?: boolean;
    }>;
    ensureOwnInviteCode: (ssoUserId: number, appCode: string) => Promise<string>;
    listLandings: (userId: number) => Promise<Array<{
        id: number;
        createdAt: number;
    }>>;
};
export default _default;
