export declare function generateChannelPath(channelId: number, parentPath: string | null): string;
export declare function getChannelDepth(path: string | null): number;
export declare function parseChannelPath(path: string): number[];
export declare function buildPath(parentPath: string, childId: number): string;
export declare function parsePathIds(path: string): number[];
export declare function getPathPrefix(path: string): string;
export declare function getDescendantIdsByPath(strapi: any, path: string, includeSelf: boolean): Promise<number[]>;
