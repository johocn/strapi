declare const _default: {
    default: {
        authenticate: {
            publicPaths: string[];
        };
        authorize: {
            policies: Array<{
                name: string;
                [key: string]: unknown;
            }>;
        };
    };
    validator: (config: Record<string, unknown>) => void;
};
export default _default;
