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
            code: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            user: {
                type: string;
                relation: string;
                target: string;
            };
            app_code: {
                type: string;
                required: boolean;
            };
            redirect_uri: {
                type: string;
                required: boolean;
            };
            channel_code: {
                type: string;
            };
            scopes: {
                type: string;
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
        };
    };
};
export default _default;
