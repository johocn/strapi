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
            openid: {
                type: string;
                required: boolean;
            };
            event: {
                type: string;
                required: boolean;
                enum: string[];
            };
            event_key: {
                type: string;
            };
            scene_key: {
                type: string;
            };
            payload: {
                type: string;
            };
            openid_bound: {
                type: string;
                default: boolean;
            };
        };
    };
};
export default _default;
