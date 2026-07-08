declare const _default: {
    "rate-limit": (config: {
        windowMs: number;
        max: number;
        message?: string;
    }) => (ctx: any, next: any) => Promise<any>;
};
export default _default;
