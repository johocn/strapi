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
            maxDailyPerUser: {
                type: string;
                default: number;
            };
            cooldownMinutes: {
                type: string;
                default: number;
            };
        };
    };
};
export default _default;
