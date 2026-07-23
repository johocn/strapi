declare const _default: {
    "source-tag": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                tagId: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                promoCampaign: {
                    type: string;
                    relation: string;
                    target: string;
                };
                scene: {
                    type: string;
                };
                sourceUrl: {
                    type: string;
                };
                utmSource: {
                    type: string;
                };
                utmMedium: {
                    type: string;
                };
                utmCampaign: {
                    type: string;
                };
                utmContent: {
                    type: string;
                };
                utmTerm: {
                    type: string;
                };
                deviceFingerprint: {
                    type: string;
                };
                firstSeenAt: {
                    type: string;
                    default: any;
                };
                lastSeenAt: {
                    type: string;
                };
                clickEvents: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
            };
        };
    };
    "click-event": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                coupon: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                sourceTag: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                promoPid: {
                    type: string;
                };
                promoCampaign: {
                    type: string;
                    relation: string;
                    target: string;
                };
                abVariant: {
                    type: string;
                    relation: string;
                    target: string;
                };
                deviceFingerprint: {
                    type: string;
                    required: boolean;
                };
                clickedAt: {
                    type: string;
                    required: boolean;
                };
                ip: {
                    type: string;
                };
                userAgent: {
                    type: string;
                };
                browser: {
                    type: string;
                };
                os: {
                    type: string;
                };
                device: {
                    type: string;
                };
                referer: {
                    type: string;
                };
                resolvedLink: {
                    type: string;
                };
            };
        };
    };
    order: {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
                "content-type-builder": {
                    visible: boolean;
                };
            };
            attributes: {
                orderId: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                coupon: {
                    type: string;
                    relation: string;
                    target: string;
                };
                sourceTag: {
                    type: string;
                    relation: string;
                    target: string;
                };
                promoPid: {
                    type: string;
                };
                promoCampaign: {
                    type: string;
                    relation: string;
                    target: string;
                };
                deviceFingerprint: {
                    type: string;
                };
                transactedAt: {
                    type: string;
                    required: boolean;
                };
                amount: {
                    type: string;
                    required: boolean;
                };
                commission: {
                    type: string;
                };
                commissionStatus: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                platform: {
                    type: string;
                    relation: string;
                    target: string;
                };
                matchedClick: {
                    type: string;
                    relation: string;
                    target: string;
                };
                attributionQuality: {
                    type: string;
                    enum: string[];
                    default: string;
                };
                syncedAt: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
