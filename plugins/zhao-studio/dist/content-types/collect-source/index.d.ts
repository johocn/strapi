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
                maxLength: number;
            };
            url: {
                type: string;
                required: boolean;
            };
            type: {
                type: string;
                enum: string[];
                default: string;
            };
            template: {
                type: string;
            };
            titleSelector: {
                type: string;
            };
            contentSelector: {
                type: string;
            };
            authorSelector: {
                type: string;
            };
            dateSelector: {
                type: string;
            };
            isActive: {
                type: string;
                default: boolean;
            };
            tasks: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            lastCollectedAt: {
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