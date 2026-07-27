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
            invite_code: {
                type: string;
                relation: string;
                target: string;
            };
            total_invites: {
                type: string;
                required: boolean;
            };
            active_invites: {
                type: string;
                required: boolean;
            };
            last_invited_at: {
                type: string;
            };
        };
    };
};
export default _default;
