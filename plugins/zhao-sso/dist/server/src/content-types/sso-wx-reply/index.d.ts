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
            trigger: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            match: {
                type: string;
                unique: boolean;
            };
            reply_type: {
                type: string;
                enum: string[];
                default: string;
            };
            text: {
                type: string;
            };
            title: {
                type: string;
            };
            desc: {
                type: string;
            };
            pic_url: {
                type: string;
            };
            link_url: {
                type: string;
            };
            sort: {
                type: string;
                default: number;
            };
            enabled: {
                type: string;
                default: boolean;
            };
        };
    };
};
export default _default;
