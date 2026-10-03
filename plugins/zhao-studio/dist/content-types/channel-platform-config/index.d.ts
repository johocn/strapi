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
            channel: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            platform: {
                type: string;
                relation: string;
                target: string;
            };
            promoPid: {
                type: string;
            };
            promoLink: {
                type: string;
            };
            isActive: {
                type: string;
                default: boolean;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map