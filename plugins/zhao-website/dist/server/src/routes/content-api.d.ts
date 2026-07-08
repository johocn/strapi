type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
declare const _default: () => {
    type: "content-api";
    routes: {
        method: Method;
        path: string;
        handler: string;
        config: {
            auth: boolean;
            policies: string[];
        };
    }[];
};
export default _default;
