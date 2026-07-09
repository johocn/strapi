declare const _default: {
    'content-api': () => {
        type: string;
        routes: {
            method: string;
            path: string;
            handler: string;
            config: {
                policies: string[];
            };
        }[];
    };
    'admin-api': () => {
        type: string;
        routes: {
            method: string;
            path: string;
            handler: string;
        }[];
    };
};
export default _default;
