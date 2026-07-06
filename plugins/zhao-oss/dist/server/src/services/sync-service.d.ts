import { Core } from '@strapi/strapi';
export interface SyncService {
    backupFile(fileId: number): Promise<void>;
    batchSync(limit?: number, offset?: number): Promise<{
        total: number;
        success: number;
        failed: number;
    }>;
    deleteRemote(recordId: number): Promise<void>;
    deleteFileCompletely(fileId: number): Promise<{
        deletedLocal: boolean;
        deletedRemote: boolean;
        deletedRecord: boolean;
    }>;
    checkSyncStatus(fileId: number): Promise<{
        synced: boolean;
        provider?: string;
        remoteUrl?: string;
    }>;
    getSyncStats(): Promise<{
        total: number;
        synced: number;
        failed: number;
        pending: number;
    }>;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => SyncService;
export default _default;
