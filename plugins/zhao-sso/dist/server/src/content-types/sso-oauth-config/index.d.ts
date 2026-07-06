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
            provider: {
                type: string;
                required: boolean;
            };
            app_id: {
                type: string;
                required: boolean;
            };
            app_secret: {
                type: string;
                required: boolean;
            };
            scope: {
                type: string;
            };
            extra_config: {
                type: string;
            };
            redirect_uris: {
                type: string;
            };
            is_enabled: {
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
