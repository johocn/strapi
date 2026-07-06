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
            login_type: {
                type: string;
                required: boolean;
            };
            provider: {
                type: string;
            };
            channel_code: {
                type: string;
            };
            app_code: {
                type: string;
            };
            ip: {
                type: string;
            };
            user_agent: {
                type: string;
            };
            success: {
                type: string;
                required: boolean;
            };
            fail_reason: {
                type: string;
            };
        };
    };
};
export default _default;
