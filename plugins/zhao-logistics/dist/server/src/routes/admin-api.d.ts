type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
declare const routes: {
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
export default routes;
