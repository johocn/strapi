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
            provider: {
                type: string;
                default: string;
                required: boolean;
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
            isEnabled: {
                type: string;
                default: boolean;
                required: boolean;
            };
            description: {
                type: string;
            };
        };
    };
};
export default _default;
