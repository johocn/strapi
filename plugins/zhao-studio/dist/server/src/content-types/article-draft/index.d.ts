declare const _default: {
    schema: {
        kind: string;
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
            title: {
                type: string;
                required: boolean;
                maxLength: number;
            };
            content: {
                type: string;
                required: boolean;
            };
            sourceUrl: {
                type: string;
            };
            sourceTitle: {
                type: string;
            };
            sourcePublishedAt: {
                type: string;
            };
            sourceAuthor: {
                type: string;
            };
            category: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
            };
            aiProcessed: {
                type: string;
                default: boolean;
            };
            aiSummary: {
                type: string;
            };
            aiOptimizedTitle: {
                type: string;
            };
            publishRecords: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            browserLogs: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            statSummaries: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            websiteArticles: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            scope: {
                type: string;
                enum: string[];
                default: string;
            };
            scopeTenantId: {
                type: string;
            };
            publishedAt: {
                type: string;
            };
            createdAt: {
                type: string;
            };
            updatedAt: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map