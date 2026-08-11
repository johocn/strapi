declare const _default: {
    'content-api': {
        type: string;
        routes: ({
            method: string;
            path: string;
            handler: string;
            config: {
                policies: string[];
            };
        } | {
            method: string;
            path: string;
            handler: string;
            config?: undefined;
        })[];
    };
    'admin-api': {
        type: string;
        routes: {
            method: string;
            path: string;
            handler: string;
        }[];
    };
};
export default _default;
