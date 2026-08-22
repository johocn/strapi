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
            draft_id: {
                type: string;
            };
            title: {
                type: string;
                required: boolean;
            };
            author: {
                type: string;
            };
            digest: {
                type: string;
            };
            content: {
                type: string;
            };
            thumb_media_id: {
                type: string;
            };
            pic_url: {
                type: string;
            };
            content_source_url: {
                type: string;
            };
            show_cover_pic: {
                type: string;
                default: boolean;
            };
            publish_state: {
                type: string;
                enum: string[];
                default: string;
            };
            publish_id: {
                type: string;
            };
            wx_published_at: {
                type: string;
            };
            last_error: {
                type: string;
            };
        };
    };
};
export default _default;
