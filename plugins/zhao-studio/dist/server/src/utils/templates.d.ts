export interface WebsiteTemplate {
    name: string;
    urlPattern: string;
    titleSelector: string;
    contentSelector: string;
    authorSelector?: string;
    dateSelector?: string;
}
export declare const websiteTemplates: Record<string, WebsiteTemplate>;
export declare function getTemplate(templateId: string): WebsiteTemplate | undefined;
export declare function getAllTemplates(): WebsiteTemplate[];
//# sourceMappingURL=templates.d.ts.map