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
            inviter: {
                type: string;
                relation: string;
                target: string;
            };
            invitee: {
                type: string;
                relation: string;
                target: string;
            };
            invite_code: {
                type: string;
                relation: string;
                target: string;
            };
            level: {
                type: string;
                required: boolean;
            };
            channel_code: {
                type: string;
            };
        };
    };
};
export default _default;
