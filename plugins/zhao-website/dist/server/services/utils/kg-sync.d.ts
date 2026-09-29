/**
 * 按 H2 标题从 HTML 正文定位段落，返回去标签纯文本（截断 500 字）。
 * 段名为保留值『开篇』时取首个 H2 之前的引言段。
 * 定位失败返回 null（调用方必须 warn，不可静默）。
 */
export declare function extractSectionText(html: string, section: string): string | null;
export declare function knowledgeGraphSync(targetType: string, rawContent: any): Promise<void>;
//# sourceMappingURL=kg-sync.d.ts.map