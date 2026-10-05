/**
 * 把一段交互包成具名步骤。失败时抛出的错误带步骤前缀，便于定位是「哪一步选择器没命中」。
 */
export declare function step<T>(name: string, fn: () => Promise<T>): Promise<T>;
/**
 * 发布失败时落盘截图 + DOM，供后续在真实浏览器调试选择器时对照。
 * 目录：<os.tmpdir()>/zhao-rpa-debug。绝不抛异常。
 */
export declare function dumpDebug(page: any, platform: string, label: string): Promise<string | undefined>;
/**
 * 远程图片 → Playwright setInputFiles 可接受的 { name, mimeType, buffer } 载荷。
 * 本地的 http(s) 之外的路径（file:// 或相对路径）直接交给 Playwright。
 */
export declare function toUploadPayload(src: string): Promise<{
    name: string;
    mimeType: string;
    buffer: Buffer;
}>;
/** 判断是否为可直接交给 Playwright 的本地路径 */
export declare function isLocalPath(src: string): boolean;
//# sourceMappingURL=shared.d.ts.map