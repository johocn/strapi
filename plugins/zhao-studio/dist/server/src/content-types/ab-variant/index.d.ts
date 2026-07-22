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
            experiment: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            name: {
                type: string;
                required: boolean;
                maxLength: number;
            };
            weight: {
                type: string;
                required: boolean;
                default: number;
            };
            article: {
                type: string;
                relation: string;
                target: string;
            };
            coupon: {
                type: string;
                relation: string;
                target: string;
            };
            description: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map