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
            app_code: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            app_name: {
                type: string;
                required: boolean;
            };
            app_secret: {
                type: string;
                required: boolean;
            };
            redirect_uris: {
                type: string;
                required: boolean;
            };
            allowed_grant_types: {
                type: string;
                required: boolean;
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
