declare const _default: {
    "content-api": {
        type: "content-api";
        routes: ({
            method: "GET" | "POST";
            path: string;
            handler: string;
            config: {
                auth: boolean;
            };
        } | {
            method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
            path: string;
            handler: string;
            config: {
                auth: boolean;
                policies: {
                    name: string;
                    config: {
                        allow: "full" | "read" | "storage";
                    };
                }[];
            };
        })[];
    };
};
export default _default;
