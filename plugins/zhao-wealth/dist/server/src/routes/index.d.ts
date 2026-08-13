declare const _default: {
    'content-api': {
        type: string;
        routes: ({
            method: string;
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies: string[];
            };
        } | {
            method: string;
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies?: undefined;
            };
        })[];
    };
    'admin-api': {
        type: string;
        routes: {
            method: "GET" | "DELETE" | "POST" | "PUT" | "PATCH";
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies: string[];
            };
        }[];
    };
};
export default _default;
