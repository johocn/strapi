declare const _default: {
    "content-api": {
        type: "content-api";
        routes: {
            method: "GET" | "POST" | "PUT" | "DELETE";
            path: string;
            handler: string;
            config: {
                auth: boolean;
            };
        }[];
    };
};
export default _default;
