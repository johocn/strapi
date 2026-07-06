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
            uuid: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            username: {
                type: string;
                unique: boolean;
            };
            mobile: {
                type: string;
                unique: boolean;
            };
            email: {
                type: string;
                unique: boolean;
            };
            password_hash: {
                type: string;
            };
            avatar_url: {
                type: string;
            };
            nickname: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            register_channel: {
                type: string;
            };
            last_login_channel: {
                type: string;
            };
            invite_code_used: {
                type: string;
            };
            invited_by: {
                type: string;
            };
            utm_source: {
                type: string;
            };
            utm_medium: {
                type: string;
            };
            utm_campaign: {
                type: string;
            };
            last_login_at: {
                type: string;
            };
            login_count: {
                type: string;
                default: number;
                required: boolean;
            };
            password_changed_at: {
                type: string;
            };
            third_party_bindings: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
        };
    };
};
export default _default;
