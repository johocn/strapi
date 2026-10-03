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
            posterTemplate: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
                required: boolean;
            };
            elementType: {
                type: string;
                enum: string[];
                required: boolean;
                default: string;
            };
            elementKey: {
                type: string;
                required: boolean;
            };
            elementName: {
                type: string;
            };
            sortOrder: {
                type: string;
                default: number;
            };
            isVariable: {
                type: string;
                default: boolean;
            };
            variableName: {
                type: string;
            };
            defaultValue: {
                type: string;
            };
            content: {
                type: string;
            };
            x: {
                type: string;
                default: number;
            };
            y: {
                type: string;
                default: number;
            };
            width: {
                type: string;
                default: number;
            };
            height: {
                type: string;
                default: number;
            };
            zIndex: {
                type: string;
                default: number;
            };
            rotation: {
                type: string;
                default: number;
            };
            opacity: {
                type: string;
                default: number;
            };
            fontSize: {
                type: string;
                default: number;
            };
            fontColor: {
                type: string;
                default: string;
            };
            fontWeight: {
                type: string;
                enum: string[];
                default: string;
            };
            fontFamily: {
                type: string;
                default: string;
            };
            textAlign: {
                type: string;
                enum: string[];
                default: string;
            };
            lineHeight: {
                type: string;
                default: number;
            };
            letterSpacing: {
                type: string;
                default: number;
            };
            borderRadius: {
                type: string;
                default: number;
            };
            borderWidth: {
                type: string;
                default: number;
            };
            borderColor: {
                type: string;
                default: string;
            };
            elementBgColor: {
                type: string;
            };
            imageFit: {
                type: string;
                enum: string[];
                default: string;
            };
            qrContentMode: {
                type: string;
                enum: string[];
                default: string;
            };
            qrBaseUrl: {
                type: string;
            };
            qrInviteParam: {
                type: string;
                default: string;
            };
            qrInviteSeparator: {
                type: string;
                default: string;
            };
            qrFallbackMode: {
                type: string;
                enum: string[];
                default: string;
            };
            qrErrorLevel: {
                type: string;
                enum: string[];
                default: string;
            };
            qrSize: {
                type: string;
                default: number;
            };
            qrColor: {
                type: string;
                default: string;
            };
            qrBgColor: {
                type: string;
                default: string;
            };
            shapeType: {
                type: string;
                enum: string[];
                default: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map