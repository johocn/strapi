declare const _default: {
    "provider-registry": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./provider-registry').ProviderRegistry;
    "sync-service": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./sync-service').SyncService;
    "url-resolver": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./url-resolver').UrlResolver;
    "media-service": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getNextPathId(): Promise<number>;
        ensureFolderByPath(humanPath: string): Promise<any>;
        buildHumanPath(folderId: number): Promise<string>;
        resolveHumanPathToNumericPath(humanPath: string): Promise<string | null>;
        uploadFile(params: import('./media-service').UploadParams): Promise<import('./media-service').UploadResult>;
        canDeleteFile(fileId: number, user: any): Promise<boolean>;
        checkReferences(fileId: number): Promise<Array<{
            uid: string;
            field: string;
            label: string;
            collection: boolean;
            required: boolean;
            items: Array<{
                id: number;
                documentId: string;
                title: string;
            }>;
        }>>;
        listFiles(params: {
            page: number;
            pageSize: number;
            folderPath?: string;
            mime?: string;
            search?: string;
            sort?: string;
            user?: any;
        }): Promise<{
            list: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        getFolderTree(): Promise<any[]>;
        createFolder(name: string, parentId?: number | null): Promise<{
            id: number;
            documentId: string;
            name: string;
            path: string;
        }>;
        findFileById(fileId: number): Promise<any | null>;
        listSyncRecords(params: {
            page: number;
            pageSize: number;
            status?: string;
        }): Promise<{
            data: any[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        repairFolders(): Promise<string[]>;
        ensureSiteDefaultFolders(siteId: number): Promise<any>;
        listFilesBySite(siteId: number, params?: {
            page?: number;
            pageSize?: number;
            category?: string;
        }): Promise<{
            list: any[];
            pagination: any;
        }>;
    };
    "media-stream": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./media-stream').MediaStream;
};
export default _default;
