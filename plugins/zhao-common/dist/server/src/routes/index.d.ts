declare const _default: {
    admin: {
        type: "admin";
        routes: any[];
    };
    "content-api": () => {
        type: "content-api";
        routes: ({
            method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
            path: string;
            handler: string;
            config: {
                auth: boolean;
            };
        } | {
            method: string;
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
