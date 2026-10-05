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
            videoUrl: {
                type: string;
                required: boolean;
            };
            coverImage: {
                type: string;
            };
            description: {
                type: string;
            };
            duration: {
                type: string;
            };
            size: {
                type: string;
            };
            tags: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
            };
            publishRecords: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            publishSchedules: {
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