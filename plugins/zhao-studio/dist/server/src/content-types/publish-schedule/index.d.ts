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
            };
            article: {
                type: string;
                relation: string;
                target: string;
            };
            video: {
                type: string;
                relation: string;
                target: string;
            };
            gallery: {
                type: string;
                relation: string;
                target: string;
            };
            accountIds: {
                type: string;
            };
            scheduledAt: {
                type: string;
                required: boolean;
            };
            triggeredAt: {
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
            };
            createdBy: {
                type: string;
                relation: string;
                target: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map