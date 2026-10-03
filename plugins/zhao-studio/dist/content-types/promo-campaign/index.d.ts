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
            channel: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            description: {
                type: string;
            };
            startAt: {
                type: string;
                required: boolean;
            };
            endAt: {
                type: string;
                required: boolean;
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
            experiments: {
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