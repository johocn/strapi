declare const _default: {
    register(): void;
    bootstrap(): void;
    destroy(): void;
    contentTypes: {
        tag: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                    color: {
                        type: string;
                    };
                    icon: {
                        type: string;
                        multiple: boolean;
                    };
                    tagGroup: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    parent: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    children: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    sort: {
                        type: string;
                        default: number;
                    };
                    isPreset: {
                        type: string;
                        default: boolean;
                    };
                    isPublic: {
                        type: string;
                        default: boolean;
                    };
                    indexes: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    deletedAt: {
                        type: string;
                        default: null;
                    };
                };
            };
        };
        "knowledge-point": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                    code: {
                        type: string;
                    };
                    level: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    parent: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    children: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    sort: {
                        type: string;
                        default: number;
                    };
                    deletedAt: {
                        type: string;
                        default: null;
                    };
                };
            };
        };
        "tag-index": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    targetType: {
                        type: string;
                        required: boolean;
                    };
                    targetId: {
                        type: string;
                        required: boolean;
                    };
                    tag: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    createdAt: {
                        type: string;
                    };
                };
            };
        };
        "tag-group": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                    color: {
                        type: string;
                    };
                    icon: {
                        type: string;
                        multiple: boolean;
                    };
                    sort: {
                        type: string;
                        default: number;
                    };
                    parent: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    children: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    deletedAt: {
                        type: string;
                        default: null;
                    };
                };
            };
        };
    };
    controllers: {
        tag: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            find(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        "tag-index": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            find(ctx: any): Promise<void>;
            search(ctx: any): Promise<void>;
        };
        "tag-group": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            find(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
    };
    services: {
        tag: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            find(query?: any): Promise<{
                list: import('@strapi/types/dist/modules/documents').AnyDocument[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            delete(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
        };
        "tag-index": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            sync(targetType: string, targetId: string, tagIds: string[]): Promise<void>;
            remove(targetType: string, targetId: string): Promise<void>;
            searchByTag(tagDocumentId: string, targetType?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            countByTag(tagDocumentId: string): Promise<number>;
        };
        "tag-group": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            find(query?: any): Promise<{
                list: import('@strapi/types/dist/modules/documents').AnyDocument[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            delete(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
        };
    };
    routes: {
        "content-api": () => {
            type: "content-api";
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
};
export default _default;
//# sourceMappingURL=index.d.ts.map