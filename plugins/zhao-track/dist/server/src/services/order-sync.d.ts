import { Core } from '@strapi/strapi';
export interface SyncOrdersParams {
    platformCode: string;
    startTime?: Date;
    endTime?: Date;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    syncOrders(params: SyncOrdersParams): Promise<{
        fetched: number;
        created: number;
        updated: number;
        errors: string[];
    }>;
};
export default _default;
