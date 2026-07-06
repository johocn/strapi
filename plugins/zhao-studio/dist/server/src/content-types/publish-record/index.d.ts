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
            article: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            account: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            externalId: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
            };
            error: {
                type: string;
            };
            retryCount: {
                type: string;
                default: number;
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