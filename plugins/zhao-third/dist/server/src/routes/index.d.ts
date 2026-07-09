declare const _default: {
    "content-api": () => {
        type: "content-api";
        routes: {
            method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
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