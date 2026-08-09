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
            site: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            canvasWidth: {
                type: string;
                default: number;
            };
            canvasHeight: {
                type: string;
                default: number;
            };
            backgroundColor: {
                type: string;
                default: string;
            };
            backgroundImage: {
                type: string;
            };
            backgroundMode: {
                type: string;
                enum: string[];
                default: string;
            };
            requiredVariables: {
                type: string;
                default: string[];
            };
            optionalVariables: {
                type: string;
                default: string[];
            };
            isActive: {
                type: string;
                default: boolean;
            };
            isDefault: {
                type: string;
                default: boolean;
            };
            elements: {
                type: string;
                relation: string;
                target: string;
                mappedBy: string;
            };
            thumbnail: {
                type: string;
            };
            description: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map