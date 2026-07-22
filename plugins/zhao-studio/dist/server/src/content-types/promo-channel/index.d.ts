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
            code: {
                type: string;
                required: boolean;
                unique: boolean;
            };
            description: {
                type: string;
            };
            scene: {
                type: string;
                enum: string[];
                default: string;
            };
            status: {
                type: string;
                default: boolean;
            };
            budget: {
                type: string;
            };
            actualCost: {
                type: string;
            };
            sortOrder: {
                type: string;
                default: number;
            };
            platformConfigs: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            campaigns: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            experiments: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            coupons: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map