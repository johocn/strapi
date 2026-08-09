/**
 * url 模块浏览器空 stub
 *
 * 浏览器端已有原生 URL API，
 * 仅补充 fileURLToPath / pathToFileURL 签名避免 TypeError。
 */
export function fileURLToPath(url) {
  if (typeof url === 'string') return url
  if (url && url.pathname) return url.pathname
  return ''
}
export function pathToFileURL(path) {
  if (typeof path !== 'string') path = String(path || '')
  return { href: 'file://' + path, pathname: path }
}
export function URL(href, base) {
  if (typeof window !== 'undefined' && window.URL) {
    return new window.URL(href, base)
  }
  return { href, pathname: href }
}
export default { fileURLToPath, pathToFileURL, URL }
