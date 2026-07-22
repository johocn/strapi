type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
declare const _default: () => {
    type: "admin";
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
