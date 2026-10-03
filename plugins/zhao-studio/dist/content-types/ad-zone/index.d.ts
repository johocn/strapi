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
            site: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            position: {
                type: string;
                enum: string[];
                default: string;
            };
            displayMode: {
                type: string;
                enum: string[];
                default: string;
            };
            suggestedWidth: {
                type: string;
            };
            suggestedHeight: {
                type: string;
            };
            adSlotCode: {
                type: string;
            };
            description: {
                type: string;
            };
            isActive: {
                type: string;
                default: boolean;
            };
            sortOrder: {
                type: string;
                default: number;
            };
            adContents: {
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