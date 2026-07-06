import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    syncPublishStatus(articleId: string): Promise<void>;
    syncAllPendingRecords(): Promise<{
        synced: number;
        failed: number;
    }>;
    cleanupOldRecords(days: number): Promise<{
        deleted: number;
    }>;
};
export default _default;
//# sourceMappingURL=status-sync.d.ts.map