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
            role: {
                type: string;
                required: boolean;
                unique: boolean;
                maxLength: number;
            };
            displayName: {
                type: string;
                required: boolean;
                maxLength: number;
            };
            description: {
                type: string;
            };
            permissions: {
                type: string;
                required: boolean;
                default: any[];
            };
            isSystem: {
                type: string;
                required: boolean;
                default: boolean;
            };
            level: {
                type: string;
                default: number;
                min: number;
                max: number;
            };
        };
    };
};
export default _default;
