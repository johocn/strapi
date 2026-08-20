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
            template: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            code: {
                type: string;
                required: boolean;
            };
            name: {
                type: string;
            };
            wxTemplateId: {
                type: string;
            };
            wxTemplateFields: {
                type: string;
            };
            content: {
                type: string;
            };
            link: {
                type: string;
            };
            weight: {
                type: string;
                default: number;
            };
            status: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            sentCount: {
                type: string;
                default: number;
            };
            successCount: {
                type: string;
                default: number;
            };
            clickCount: {
                type: string;
                default: number;
            };
            lastUsedAt: {
                type: string;
            };
        };
    };
};
export default _default;
