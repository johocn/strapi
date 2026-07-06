declare const _default: {
    admin: {
        type: "admin";
        routes: any[];
    };
    'content-api': {
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
};
export default _default;
//# sourceMappingURL=index.d.ts.map