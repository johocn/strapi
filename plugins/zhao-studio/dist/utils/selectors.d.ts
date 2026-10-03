export interface ScrapedTitle {
    title: string;
    url: string;
}
export interface ScrapedContent {
    title: string;
    body: string;
    author?: string;
    date?: string;
    images?: string[];
}
export declare function extractTitles(html: string, selector: string): ScrapedTitle[];
export declare function extractContent(html: string, contentSelector: string, authorSelector?: string, dateSelector?: string): ScrapedContent;
export declare function filterDuplicates(titles: ScrapedTitle[]): ScrapedTitle[];
//# sourceMappingURL=selectors.d.ts.map