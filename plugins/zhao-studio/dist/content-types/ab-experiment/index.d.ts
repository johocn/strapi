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
            channel: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            campaign: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            description: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
            };
            startAt: {
                type: string;
            };
            endAt: {
                type: string;
            };
            variants: {
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