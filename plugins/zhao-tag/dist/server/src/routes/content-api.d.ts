type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
declare const _default: () => {
    type: "content-api";
    routes: {
        method: Method;
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
export default _default;
//# sourceMappingURL=content-api.d.ts.map