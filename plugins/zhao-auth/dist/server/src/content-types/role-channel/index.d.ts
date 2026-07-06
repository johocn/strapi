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
            role: {
                type: string;
                required: boolean;
            };
            channel: {
                type: string;
                relation: string;
                target: string;
            };
            assignedBy: {
                type: string;
            };
        };
    };
};
export default _default;
