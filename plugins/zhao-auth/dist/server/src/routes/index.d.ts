declare const _default: {
    "content-api": {
        type: string;
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
        type: string;
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
