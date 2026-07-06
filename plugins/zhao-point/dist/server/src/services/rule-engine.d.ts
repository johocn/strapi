import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    validateAction: (params: {
        userId: string | number;
        action: string;
        source?: string;
        channelId?: string | number;
    }) => Promise<{
        valid: boolean;
        rule: any;
        reason: string;
        todayCount?: undefined;
    } | {
        valid: boolean;
        rule: any;
        reason: string;
        todayCount: number;
    } | {
        valid: boolean;
        rule: any;
        reason?: undefined;
        todayCount?: undefined;
    }>;
    getEligibleActions: (userId: string | number, channelId?: string | number) => Promise<any[]>;
    getTemplates: (filters?: {
        category?: string;
        enabled?: boolean;
    }) => Promise<any[]>;
    createTemplate: (data: any) => Promise<any>;
    updateTemplate: (id: string | number, data: any) => Promise<any>;
    deleteTemplate: (id: string | number) => Promise<any>;
    applyTemplate: (templateId: string | number, targetAction: string) => Promise<any>;
    batchEnableActions: (actions: string[], enabled: boolean) => Promise<{
        updated: number;
    }>;
};
export default _default;
