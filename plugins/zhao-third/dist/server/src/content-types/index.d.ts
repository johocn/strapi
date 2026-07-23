declare const _default: {
    "third-party-config": {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                };
                platform: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                appType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                appId: {
                    type: string;
                    required: boolean;
                };
                appSecret: {
                    type: string;
                    required: boolean;
                };
                token: {
                    type: string;
                    required: boolean;
                };
                encodingAESKey: {
                    type: string;
                    required: boolean;
                };
                merchantId: {
                    type: string;
                    required: boolean;
                };
                enabled: {
                    type: string;
                    default: boolean;
                };
                site: {
                    type: string;
                    relation: string;
                    target: string;
                };
            };
        };
    };
    "third-party-account": {
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
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
            };
            attributes: {
                platform: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                appType: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                openId: {
                    type: string;
                    required: boolean;
                };
                unionId: {
                    type: string;
                };
                nickname: {
                    type: string;
                };
                avatar: {
                    type: string;
                };
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map