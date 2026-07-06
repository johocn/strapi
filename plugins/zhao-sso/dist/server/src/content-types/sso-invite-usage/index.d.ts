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
            user: {
                type: string;
                relation: string;
                target: string;
            };
            channel_code: {
                type: string;
            };
            app_code: {
                type: string;
            };
            used_at: {
                type: string;
                required: boolean;
            };
        };
    };
};
export default _default;
