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
                required: boolean;
            };
            title: {
                type: string;
                required: boolean;
            };
            scene: {
                type: string;
                required: boolean;
            };
            templateCode: {
                type: string;
            };
            link: {
                type: string;
            };
            audience: {
                type: string;
            };
            paramsTemplate: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            doneAt: {
                type: string;
            };
            sentCount: {
                type: string;
                default: number;
            };
            description: {
                type: string;
            };
        };
    };
};
export default _default;
