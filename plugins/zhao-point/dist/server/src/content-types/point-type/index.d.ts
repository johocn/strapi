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
            comment: string;
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
            };
            code: {
                type: string;
                required: boolean;
                unique: boolean;
            };
            description: {
                type: string;
                maxLength: number;
            };
            enabled: {
                type: string;
                default: boolean;
            };
            canExpire: {
                type: string;
                default: boolean;
            };
            expireDays: {
                type: string;
                default: number;
            };
            deletedAt: {
                type: string;
                default: any;
            };
        };
    };
};
export default _default;
