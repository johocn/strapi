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
        attributes: {
            name: {
                type: string;
                required: boolean;
                maxLength: number;
            };
            displayName: {
                type: string;
                maxLength: number;
            };
            description: {
                type: string;
            };
            presetConfig: {
                type: string;
                required: boolean;
            };
            fieldConstraints: {
                type: string;
                required: boolean;
            };
            enabled: {
                type: string;
                default: boolean;
            };
            isDefault: {
                type: string;
                default: boolean;
            };
            sites: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            themeConfig: {
                type: string;
                default: string;
            };
        };
    };
};
export default _default;
