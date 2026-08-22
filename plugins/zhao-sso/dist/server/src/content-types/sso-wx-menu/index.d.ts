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
            name: {
                type: string;
                required: boolean;
            };
            menu_json: {
                type: string;
                required: boolean;
            };
            enabled: {
                type: string;
                default: boolean;
            };
            publish_state: {
                type: string;
                enum: string[];
                default: string;
            };
            last_publish_at: {
                type: string;
            };
            last_error: {
                type: string;
            };
        };
    };
};
export default _default;
