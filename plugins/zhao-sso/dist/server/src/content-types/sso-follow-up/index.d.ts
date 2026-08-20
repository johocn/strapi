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
            partner: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            customer: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            content: {
                type: string;
                required: boolean;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            nextFollowAt: {
                type: string;
            };
        };
    };
};
export default _default;
