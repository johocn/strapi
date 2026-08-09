/**
 * source-map-js 模块浏览器空 stub
 *
 * postcss 引用 source-map-js 用于生成 source map，
 * 浏览器端 admin 不需要 source map，提供空构造器即可。
 */
export class SourceMapConsumer {
  static async with() { return null }
  constructor() {}
  destroy() {}
}
export class SourceMapGenerator {
  constructor() {}
  addMapping() {}
  setSourceContent() {}
  toJSON() { return { version: 3, sources: [], mappings: '' } }
  toString() { return '{"version":3,"sources":[],"mappings":""}' }
}
export default { SourceMapConsumer, SourceMapGenerator }
