declare const _default: {
    "content-api": {
        type: "content-api";
        routes: (import('@strapi/types/dist/core').Route | {
            method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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
