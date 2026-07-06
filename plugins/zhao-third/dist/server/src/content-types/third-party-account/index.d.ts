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
export default _default;
//# sourceMappingURL=index.d.ts.map