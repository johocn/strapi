declare const _default: {
    register: ({ strapi: _strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    config: {
        default: {
            enabled: true;
            uploadTimeoutMs: number;
            maxRetries: number;
            healthCheckIntervalMs: number;
            syncDelete: true;
            fallbackToLocal: true;
            enableUrlRewrite: true;
            providers: any[];
        };
        validator(): void;
    };
    controllers: {
        "sync-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getDashboard(ctx: any): Promise<void>;
            getSyncRecords(ctx: any): Promise<void>;
            triggerSync(ctx: any): Promise<void>;
            batchSync(ctx: any): Promise<void>;
            deleteRemote(ctx: any): Promise<void>;
            checkHealth(ctx: any): Promise<void>;
        };
        "settings-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getConfig(ctx: any): Promise<void>;
            updateConfig(ctx: any): Promise<void>;
            testProvider(ctx: any): Promise<void>;
        };
        "api-controller": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            upload(ctx: any): Promise<void>;
            getSyncStatus(ctx: any): Promise<void>;
            mediaList(ctx: any): Promise<void>;
            getFolders(ctx: any): Promise<void>;
            createFolder(ctx: any): Promise<void>;
            deleteMedia(ctx: any): Promise<void>;
            repairFolders(ctx: any): Promise<void>;
        };
    };
    routes: {
        "content-api": {
            type: string;
            routes: {
                method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies: (string | {
                        name: string;
                        config: {
                            action: string;
                        };
                    })[];
                };
            }[];
        };
    };
    services: {
        "provider-registry": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/provider-registry').ProviderRegistry;
        "sync-service": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/sync-service').SyncService;
        "url-resolver": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/url-resolver').UrlResolver;
        "media-service": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getNextPathId(): Promise<number>;
            ensureFolderByPath(humanPath: string): Promise<any>;
            buildHumanPath(folderId: number): Promise<string>;
            uploadFile(params: import('./services/media-service').UploadParams): Promise<import('./services/media-service').UploadResult>;
            canDeleteFile(fileId: number, user: any): Promise<boolean>;
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
    };
    contentTypes: {
        "sync-record": {
            schema: {
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    fileId: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    fileHash: {
                        type: string;
                        required: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    provider: {
                        type: string;
                        required: boolean;
                    };
                    remoteUrl: {
                        type: string;
                    };
                    remoteEtag: {
                        type: string;
                    };
                    errorMessage: {
                        type: string;
                    };
                    retryCount: {
                        type: string;
                        default: number;
                        min: number;
                    };
                    lastSyncedAt: {
                        type: string;
                    };
                };
            };
        };
        "media-meta": {
            schema: {
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    site: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    file: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    fileId: {
                        type: string;
                        required: boolean;
                    };
                    folder: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    category: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    uploader: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    uploaderRole: {
                        type: string;
                        maxLength: number;
                    };
                    modifier: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    originalFilename: {
                        type: string;
                        maxLength: number;
                    };
                    mimeType: {
                        type: string;
                        maxLength: number;
                    };
                    fileSize: {
                        type: string;
                    };
                    fileExt: {
                        type: string;
                        maxLength: number;
                    };
                    usageCount: {
                        type: string;
                        default: number;
                    };
                    lastUsedAt: {
                        type: string;
                    };
                    isPublic: {
                        type: string;
                        default: boolean;
                    };
                    tags: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
    };
    policies: {};
};
export default _default;
