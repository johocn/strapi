/**
 * fs 模块浏览器空 stub
 *
 * sanitize-html / postcss 在浏览器端不实际读写文件，
 * 仅提供函数签名避免 TypeError。
 */
export const existsSync = () => false
export const readFileSync = () => ''
export const writeFileSync = () => {}
export const statSync = () => ({ isFile: () => false, isDirectory: () => false })
export const readdirSync = () => []
export const mkdirSync = () => {}
export const unlinkSync = () => {}
export default {
  existsSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  mkdirSync,
  unlinkSync,
}
