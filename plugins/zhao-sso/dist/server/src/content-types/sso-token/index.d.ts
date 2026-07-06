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
            app_code: {
                type: string;
                required: boolean;
            };
            access_token_jti: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            refresh_token: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            refresh_expires_at: {
                type: string;
                required: boolean;
            };
            revoked: {
                type: string;
                default: boolean;
                required: boolean;
            };
            revoked_at: {
                type: string;
            };
            channel_code: {
                type: string;
            };
        };
    };
};
export default _default;
