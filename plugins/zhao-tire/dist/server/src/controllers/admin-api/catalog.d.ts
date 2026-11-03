export declare const buildCollectionCrud: (name: string) => {
    list(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    remove(ctx: any): Promise<void>;
};
export declare const prefixHandlers: (prefix: string, handlers: Record<string, Function>) => Record<string, Function>;
declare const _default: {
    getConfig(ctx: any): Promise<void>;
    updateConfig(ctx: any): Promise<void>;
};
export default _default;
