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
            name: {
                type: string;
                required: boolean;
                maxLength: number;
            };
            platform: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            config: {
                type: string;
            };
            isActive: {
                type: string;
                default: boolean;
            };
            publishRecords: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            lastPublishedAt: {
                type: string;
            };
            oauthAccessToken: {
                type: string;
                maxLength: number;
            };
            oauthRefreshToken: {
                type: string;
                maxLength: number;
            };
            oauthExpiresAt: {
                type: string;
            };
            oauthOpenId: {
                type: string;
                maxLength: number;
            };
            oauthScope: {
                type: string;
                maxLength: number;
            };
            oauthState: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            lastRefreshAt: {
                type: string;
            };
            createdAt: {
                type: string;
            };
            updatedAt: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map