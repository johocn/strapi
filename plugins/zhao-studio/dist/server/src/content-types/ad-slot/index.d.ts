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
            name: {
                type: string;
                required: boolean;
            };
            code: {
                type: string;
                required: boolean;
                unique: boolean;
            };
            position: {
                type: string;
                enum: string[];
                default: string;
            };
            type: {
                type: string;
                enum: string[];
                default: string;
            };
            targetUrl: {
                type: string;
            };
            productId: {
                type: string;
            };
            imageUrl: {
                type: string;
            };
            isActive: {
                type: string;
                default: boolean;
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