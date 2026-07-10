declare const _default: {
    "content-api": {
        type: "content-api";
        routes: {
            method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
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
        }[];
    };
};
export default _default;
