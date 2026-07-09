declare const _default: {
    "content-api": {
        type: "content-api";
        routes: {
            method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
            path: string;
            handler: string;
            config: {
                auth: boolean;
            };
        }[];
    };
    tenant: {
        type: "content-api";
        routes: {
            method: string;
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
