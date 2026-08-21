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
            code: {
                type: string;
                unique: boolean;
                required: boolean;
            };
            name: {
                type: string;
                required: boolean;
            };
            source: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            event: {
                type: string;
            };
            cronExpression: {
                type: string;
            };
            templateCode: {
                type: string;
            };
            scene: {
                type: string;
                required: boolean;
            };
            delayMinutes: {
                type: string;
                default: number;
            };
            link: {
                type: string;
            };
            paramsTemplate: {
                type: string;
            };
            enabled: {
                type: string;
                default: boolean;
                required: boolean;
            };
            description: {
                type: string;
            };
            conversionWindowDays: {
                type: string;
            };
        };
    };
};
export default _default;
