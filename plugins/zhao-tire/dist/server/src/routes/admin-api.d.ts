type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type Allow = "read" | "full" | "storage" | "payment";
declare const _default: () => {
    type: "content-api";
    routes: {
        method: Method;
        path: string;
        handler: string;
        config: {
            auth: boolean;
            policies: {
                name: string;
                config: {
                    allow: Allow;
                };
            }[];
        };
    }[];
};
export default _default;
