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
            scene_key: {
                type: string;
                required: boolean;
                unique: boolean;
            };
            title: {
                type: string;
            };
            kind: {
                type: string;
                required: boolean;
                enum: string[];
                default: string;
            };
            expire_seconds: {
                type: string;
                default: number;
            };
            ticket: {
                type: string;
            };
            wx_url: {
                type: string;
            };
            qrcode_url: {
                type: string;
            };
            remark: {
                type: string;
            };
        };
    };
};
export default _default;
