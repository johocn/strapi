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
            type: {
                type: string;
                enum: string[];
                required: boolean;
            };
            name: {
                type: string;
            };
            media_id: {
                type: string;
            };
            wx_url: {
                type: string;
            };
            remark: {
                type: string;
            };
        };
    };
};
export default _default;
