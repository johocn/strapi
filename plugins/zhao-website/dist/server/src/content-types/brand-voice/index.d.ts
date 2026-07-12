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
            "content-type-builder": {
                visible: boolean;
            };
        };
        attributes: {
            site: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
                inversedBy: string;
            };
            name: {
                type: string;
                maxLength: number;
                required: boolean;
            };
            category: {
                type: string;
                enum: string[];
                required: boolean;
            };
            content: {
                type: string;
                required: boolean;
            };
            variables: {
                type: string;
            };
            status: {
                type: string;
                default: boolean;
            };
            tags: {
                type: string;
            };
            deletedAt: {
                type: string;
                default: any;
            };
        };
    };
};
export default _default;
