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
                inversedBy: string;
            };
            provider: {
                type: string;
                required: boolean;
            };
            provider_user_id: {
                type: string;
                required: boolean;
            };
            provider_union_id: {
                type: string;
            };
            provider_nickname: {
                type: string;
            };
            provider_avatar: {
                type: string;
            };
            provider_data: {
                type: string;
            };
            bound_at: {
                type: string;
                required: boolean;
            };
        };
    };
};
export default _default;
