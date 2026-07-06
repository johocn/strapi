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
            date: {
                type: string;
                required: boolean;
            };
            article: {
                type: string;
                relation: string;
                target: string;
            };
            adSlot: {
                type: string;
                relation: string;
                target: string;
            };
            summaryType: {
                type: string;
                enum: string[];
                required: boolean;
            };
            pv: {
                type: string;
                default: number;
            };
            uv: {
                type: string;
                default: number;
            };
            clickCount: {
                type: string;
                default: number;
            };
            clickRate: {
                type: string;
                default: number;
            };
            avgReadDuration: {
                type: string;
                default: number;
            };
            avgScrollDepth: {
                type: string;
                default: number;
            };
            deviceStats: {
                type: string;
            };
            regionStats: {
                type: string;
            };
            referrerStats: {
                type: string;
            };
            createdAt: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map