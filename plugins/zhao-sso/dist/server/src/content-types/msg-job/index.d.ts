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
            };
            scene: {
                type: string;
                required: boolean;
            };
            template: {
                type: string;
                relation: string;
                target: string;
            };
            version: {
                type: string;
                relation: string;
                target: string;
            };
            provider: {
                type: string;
                default: string;
                required: boolean;
            };
            toTarget: {
                type: string;
            };
            params: {
                type: string;
            };
            link: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            retryCount: {
                type: string;
                default: number;
            };
            nextRetryAt: {
                type: string;
            };
            wxMsgId: {
                type: string;
            };
            result: {
                type: string;
            };
            scheduledAt: {
                type: string;
            };
            sentAt: {
                type: string;
            };
            dedupeKey: {
                type: string;
                unique: boolean;
            };
            readAt: {
                type: string;
            };
        };
    };
};
export default _default;
