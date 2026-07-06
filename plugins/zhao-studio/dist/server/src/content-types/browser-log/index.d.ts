declare const _default: {
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
            eventType: {
                type: string;
                enum: string[];
                required: boolean;
            };
            article: {
                type: string;
                relation: string;
                target: string;
            };
            adSlot: {
                type: string;
                relation: string;
                target: string;
            };
            user: {
                type: string;
                relation: string;
                target: string;
            };
            userId: {
                type: string;
            };
            sessionId: {
                type: string;
                required: boolean;
            };
            isRegistered: {
                type: string;
                default: boolean;
            };
            registeredAt: {
                type: string;
            };
            userAgent: {
                type: string;
            };
            platform: {
                type: string;
            };
            browser: {
                type: string;
            };
            browserVersion: {
                type: string;
            };
            os: {
                type: string;
            };
            osVersion: {
                type: string;
            };
            deviceType: {
                type: string;
                enum: string[];
                default: string;
            };
            screenWidth: {
                type: string;
            };
            screenHeight: {
                type: string;
            };
            language: {
                type: string;
            };
            ip: {
                type: string;
            };
            country: {
                type: string;
            };
            city: {
                type: string;
            };
            referrer: {
                type: string;
            };
            referrerDomain: {
                type: string;
            };
            readDuration: {
                type: string;
                default: number;
            };
            scrollDepth: {
                type: string;
                default: number;
            };
            timestamp: {
                type: string;
                required: boolean;
            };
            createdAt: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map