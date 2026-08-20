declare const _default: {
    schema: {
        kind: string;
        collectionName: string;
        info: {
            singularName: string;
            pluralName: string;
            displayName: string;
        };
        options: {
            draftAndPublish: boolean;
        };
        attributes: {
            user: {
                type: string;
                relation: string;
                target: string;
            };
            segment: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            segmentScore: {
                type: string;
                default: number;
            };
            segmentReason: {
                type: string;
            };
            dimensions: {
                type: string;
                default: {};
            };
            lastCalculatedAt: {
                type: string;
            };
        };
    };
};
export default _default;
