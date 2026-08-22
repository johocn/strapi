/**
 * 微信公众号回调 XML 受限解析/组装工具
 *
 * 安全约束：只做扁平元素/单层文本解析，禁止解析 DTD/DOCTYPE/ENTITY（防 XXE）。
 * - parseXml(xml)：提取 <tag>文本</tag> 为扁平键值对；<![CDATA[...]]> 仅提取其内部文本。
 * - buildXml(parts)：组装被动回复 XML，字符串字段统一用 CDATA 包裹。
 */
/** 受限 XML 解析（扁平化，无嵌套，无 DTD/实体） */
export declare function parseXml(xml: string): Record<string, string>;
/** 组装被动回复 XML（字符串字段用 CDATA，数字字段原样输出） */
export declare function buildXml(parts: Record<string, string | number>): string;
