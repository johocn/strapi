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
            sourceType: {
                type: string;
                enum: string[];
                required: boolean;
            };
            sourceContentType: {
                type: string;
                required: boolean;
            };
            sourceDocumentId: {
                type: string;
            };
            sourceUrl: {
                type: string;
            };
            sourceTitle: {
                type: string;
            };
            targetDraftId: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
            };
            eventStatus: {
                type: string;
                enum: string[];
                default: string;
            };
            eventPayload: {
                type: string;
            };
            resolvedAt: {
                type: string;
            };
            resolvedBy: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map