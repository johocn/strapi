/**
 * path 模块浏览器 polyfill
 *
 * 提供 sanitize-html / postcss 在浏览器端需要的 path 函数。
 * 基于path-browserify 核心实现，仅保留实际使用的 API。
 */

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path))
  }
}

// 判断是否为绝对路径（POSIX + Windows 兼容）
function isAbsolute(path) {
  assertPath(path)
  return path.length > 0 && (path.charCodeAt(0) === 47 /* / */ || path.charCodeAt(0) === 92 /* \ */ || /^[a-zA-Z]:/.test(path))
}

function normalize(path) {
  assertPath(path)
  const isAbs = isAbsolute(path)
  const trailingSlash = path.length > 0 && path.charCodeAt(path.length - 1) === 47
  path = normalizeString(path, !isAbs)
  if (path.length === 0 && !isAbs) path = '.'
  if (path.length > 0 && trailingSlash) path += '/'
  if (isAbs) return '/' + path
  return path
}

function normalizeString(path, allowAboveRoot) {
  let res = ''
  let lastSegmentLength = 0
  let lastSlash = -1
  let dots = 0
  let code
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i)
    else if (code === 47 /* / */) break
    else code = 47
    if (code === 47 /* / */) {
      if (lastSlash === i - 1 || dots === 1) {
        // no-op
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 ||
            res.charCodeAt(res.length - 1) !== 46 /* . */ ||
            res.charCodeAt(res.length - 2) !== 46 /* . */) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf('/')
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = ''
                lastSegmentLength = 0
              } else {
                res = res.slice(0, lastSlashIndex)
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/')
              }
              lastSlash = i
              dots = 0
              continue
            }
          } else if (res.length === 2 || res.length === 1) {
            res = ''
            lastSegmentLength = 0
            lastSlash = i
            dots = 0
            continue
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += '/..'
          else res = '..'
          lastSegmentLength = 2
        }
      } else {
        if (res.length > 0) res += '/' + path.slice(lastSlash + 1, i)
        else res = path.slice(lastSlash + 1, i)
        lastSegmentLength = i - lastSlash - 1
      }
      lastSlash = i
      dots = 0
    } else if (code === 46 /* . */ && dots !== -1) {
      ++dots
    } else {
      dots = -1
    }
  }
  return res
}

function resolve() {
  let resolvedPath = ''
  let resolvedAbsolute = false
  for (let i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const path = i >= 0 ? arguments[i] : '/'
    assertPath(path)
    if (path.length === 0) continue
    resolvedPath = path + '/' + resolvedPath
    resolvedAbsolute = path.charCodeAt(0) === 47 /* / */
  }
  if (resolvedAbsolute) {
    return '/' + normalizeString(resolvedPath, !resolvedAbsolute)
  }
  return normalizeString(resolvedPath, !resolvedAbsolute) || '.'
}

function join() {
  if (arguments.length === 0) return '.'
  let joined
  for (let i = 0; i < arguments.length; ++i) {
    const arg = arguments[i]
    assertPath(arg)
    if (arg.length > 0) {
      if (joined === undefined) joined = arg
      else joined += '/' + arg
    }
  }
  if (joined === undefined) return '.'
  return normalize(joined)
}

function dirname(path) {
  assertPath(path)
  if (path.length === 0) return '.'
  let code = path.charCodeAt(0)
  const hasRoot = code === 47
  let end = -1
  let matchedSlash = true
  for (let i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i)
    if (code === 47) {
      if (!matchedSlash) {
        end = i
        break
      }
    } else {
      matchedSlash = false
    }
  }
  if (end === -1) return hasRoot ? '/' : '.'
  if (hasRoot && end === 1) return '//'
  return path.slice(0, end)
}

function basename(path, ext) {
  assertPath(path)
  let start = 0
  let end = -1
  let matchedSlash = true
  let i
  if (ext !== undefined && typeof ext !== 'string') {
    throw new TypeError('"ext" argument must be a string')
  }
  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path) return ''
    let extIdx = ext.length - 1
    let firstNonSlashEnd = -1
    for (i = path.length - 1; i >= 0; --i) {
      const code = path.charCodeAt(i)
      if (code === 47) {
        if (!matchedSlash) {
          start = i + 1
          break
        }
      } else {
        if (firstNonSlashEnd === -1) {
          matchedSlash = false
          firstNonSlashEnd = i + 1
        }
        if (extIdx >= 0) {
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1) {
              end = i
            }
          } else {
            extIdx = -1
            end = firstNonSlashEnd
          }
        }
      }
    }
    if (start === end) end = firstNonSlashEnd
    else if (end === -1) end = path.length
    return path.slice(start, end)
  }
  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47) {
      if (!matchedSlash) {
        start = i + 1
        break
      }
    } else if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
  }
  if (end === -1) return ''
  return path.slice(start, end)
}

function extname(path) {
  assertPath(path)
  let startDot = -1
  let startPart = 0
  let end = -1
  let matchedSlash = true
  let preDotState = 0
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charCodeAt(i)
    if (code === 47) {
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
    if (code === 46 /* . */) {
      if (startDot === -1) startDot = i
      else if (preDotState !== 1) preDotState = 1
    } else if (startDot !== -1) {
      preDotState = 2
    }
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || (preDotState === 1 && startDot === end - 1)) {
    return ''
  }
  return path.slice(startDot, end)
}

function relative(from, to) {
  assertPath(from)
  assertPath(to)
  if (from === to) return ''
  from = resolve(from)
  to = resolve(to)
  if (from === to) return ''
  let fromStart = 1
  for (; fromStart < from.length; ++fromStart) {
    if (from.charCodeAt(fromStart) !== 47 /* / */) break
  }
  const fromEnd = from.length
  const fromLen = (fromEnd - fromStart)
  let toStart = 1
  for (; toStart < to.length; ++toStart) {
    if (to.charCodeAt(toStart) !== 47 /* / */) break
  }
  const toEnd = to.length
  const toLen = (toEnd - toStart)
  const length = (fromLen < toLen ? fromLen : toLen)
  let lastCommonSep = -1
  let i = 0
  for (; i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === 47 /* / */) {
          return to.slice(toStart + i + 1)
        } else if (i === 0) {
          return to.slice(toStart + i)
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === 47 /* / */) {
          lastCommonSep = i
        } else if (i === 0) {
          lastCommonSep = 0
        }
      }
      break
    }
    const fromCode = from.charCodeAt(fromStart + i)
    const toCode = to.charCodeAt(toStart + i)
    if (fromCode !== toCode) break
    else if (fromCode === 47 /* / */) lastCommonSep = i
  }
  let out = ''
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || from.charCodeAt(i) === 47 /* / */) {
      if (out.length === 0) out += '..'
      else out += '/..'
    }
  }
  if (out.length > 0) return out + to.slice(toStart + lastCommonSep)
  toStart += lastCommonSep
  if (to.charCodeAt(toStart) === 47 /* / */) ++toStart
  return to.slice(toStart)
}

export default {
  isAbsolute,
  resolve,
  normalize,
  join,
  dirname,
  basename,
  extname,
  relative,
  sep: '/',
  delimiter: ':',
  parse(path) {
    assertPath(path)
    const ret = { root: '', dir: '', base: '', ext: '', name: '' }
    if (path.length === 0) return ret
    let code = path.charCodeAt(0)
    let isAbsolute = (code === 47)
    let start = isAbsolute ? 1 : 0
    let startDot = -1
    let startPart = 0
    let end = -1
    let matchedSlash = true
    let i = path.length - 1
    while (i >= start) {
      code = path.charCodeAt(i)
      if (code === 47) {
        if (!matchedSlash) {
          startPart = i + 1
          break
        }
      } else {
        if (end === -1) {
          matchedSlash = false
          end = i + 1
        }
        if (code === 46) {
          if (startDot === -1) startDot = i
        }
      }
      i--
    }
    if (end === -1) {
      end = path.length
    }
    if (startDot === -1) {
      ret.base = path.slice(startPart, end)
      ret.name = ret.base
    } else {
      ret.name = path.slice(startPart, startDot)
      ret.base = path.slice(startPart, end)
    }
    ret.ext = path.slice(startDot, end)
    if (isAbsolute) ret.root = '/'
    ret.dir = path.slice(0, startPart)
    return ret
  }
}
