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
            channel_code: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            channel_name: {
                type: string;
                required: boolean;
            };
            channel_type: {
                type: string;
                required: boolean;
            };
            utm_template: {
                type: string;
            };
            is_active: {
                type: string;
                default: boolean;
                required: boolean;
            };
            description: {
                type: string;
            };
        };
    };
};
export default _default;
