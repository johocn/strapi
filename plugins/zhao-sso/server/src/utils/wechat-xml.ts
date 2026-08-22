/**
 * 微信公众号回调 XML 受限解析/组装工具
 *
 * 安全约束：只做扁平元素/单层文本解析，禁止解析 DTD/DOCTYPE/ENTITY（防 XXE）。
 * - parseXml(xml)：提取 <tag>文本</tag> 为扁平键值对；<![CDATA[...]]> 仅提取其内部文本。
 * - buildXml(parts)：组装被动回复 XML，字符串字段统一用 CDATA 包裹。
 */

/** 受限 XML 解析（扁平化，无嵌套，无 DTD/实体） */
export function parseXml(xml: string): Record<string, string> {
  if (typeof xml !== "string" || !xml.trim()) return {};

  // 存在 DOCTYPE / ENTITY 声明直接拒绝，杜绝 XXE
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new Error("XXE blocked: DOCTYPE/ENTITY not allowed in xml");
  }

  // 剥离微信推送最外层 <xml>...</xml> 包裹，避免其吞并所有子节点的文本
  const body = xml
    .trim()
    .replace(/^\s*<xml[^>]*>\s*/i, "")
    .replace(/\s*<\/xml>\s*$/i, "");

  const result: Record<string, string> = {};
  // 匹配 <name>xxx</name> 的成对标签（单层，仅捕获其内容文本）
  const tagRe = /<([a-zA-Z_][\w.:-]*)\s*>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(body)) !== null) {
    const name = m[1];
    const inner = m[2];
    // 先提取 CDATA 内容，再剥离残余标签，仅保留文本
    const text = inner
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!(name in result)) result[name] = text || "";
  }
  return result;
}

/** 组装被动回复 XML（字符串字段用 CDATA，数字字段原样输出） */
export function buildXml(parts: Record<string, string | number>): string {
  const cdata = (v: string | number): string =>
    typeof v === "number" ? String(v) : `<![CDATA[${String(v)}]]>`;
  const inner = Object.entries(parts)
    .map(([k, v]) => `<${k}>${cdata(v)}</${k}>`)
    .join("");
  return `<xml>${inner}</xml>`;
}