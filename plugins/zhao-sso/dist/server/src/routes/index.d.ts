declare const _default: {
    "content-api": {
        type: string;
        routes: ({
            method: string;
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies?: undefined;
            };
        } | {
            method: string;
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies: string[];
            };
        } | {
            method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies: (string | {
                    name: string;
                    config: {
                        action: string;
                    };
                })[];
            };
        })[];
    };
};
export default _default;
