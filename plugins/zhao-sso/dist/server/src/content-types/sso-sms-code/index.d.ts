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
            mobile: {
                type: string;
                required: boolean;
            };
            code: {
                type: string;
                required: boolean;
            };
            scene: {
                type: string;
                default: string;
                required: boolean;
            };
            expires_at: {
                type: string;
                required: boolean;
            };
            used: {
                type: string;
                default: boolean;
                required: boolean;
            };
            ip: {
                type: string;
            };
            provider: {
                type: string;
                default: string;
            };
        };
    };
};
export default _default;
