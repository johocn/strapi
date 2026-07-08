declare const _default: {
    article: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byCategory(ctx: any): Promise<void>;
        featured(ctx: any): Promise<void>;
        related(ctx: any): Promise<any>;
    };
    product: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
    };
    case: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
    };
    faq: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byCategory(ctx: any): Promise<void>;
    };
    tutorial: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byDifficulty(ctx: any): Promise<void>;
    };
    compliance: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byCategory(ctx: any): Promise<void>;
    };
    download: {
        list(ctx: any): Promise<void>;
        download(ctx: any): Promise<any>;
    };
    lead: {
        submit(ctx: any): Promise<{
            success: boolean;
        }>;
        track(ctx: any): Promise<any>;
    };
    "seo-output": {
        sitemap(ctx: any): Promise<void>;
        robots(ctx: any): Promise<void>;
        llmsTxt(ctx: any): Promise<void>;
        manifest(ctx: any): Promise<void>;
    };
    "site-info": {
        info(ctx: any): Promise<void>;
    };
};
export default _default;
