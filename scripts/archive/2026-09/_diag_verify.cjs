// 用线上同源的最新 stripCodeBlock + parsePromoImport 逻辑，实测真实场景
function stripCodeBlock(raw) {
  let s = String(raw ?? '')
  s = s.replace(/```[a-zA-Z]*\s*/g, '').replace(/```/g, '')
  const start = s.indexOf('{')
  if (start >= 0) {
    let depth = 0, inStr = false, esc = false
    for (let i = start; i < s.length; i++) {
      const ch = s[i]
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
      if (ch === '"') { inStr = true; continue }
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0) return s.slice(start, i + 1) }
    }
    const j = s.lastIndexOf('}')
    if (j > start) return s.slice(start, j + 1)
  }
  return s
}
const fs = require('fs')
const raw = fs.readFileSync('e:/code/.tmp/promo_user2.json','utf8')

const cases = [
  ['干净 JSON', raw.trim()],
  ['JSON 末尾追加含{}解说', raw + '\n好的，这是我按你要求生成的(可调)。{注意仅考虑转化} [也可调整]'],
  ['JSON 末尾追加普通解说', raw + '\n需要我帮你微调文案语气，让引流转化效果更强吗？'],
]
for (const [name, src] of cases) {
  const cleaned = stripCodeBlock(src)
  try { const o = JSON.parse(cleaned); console.log(`[${name}] 解析OK 模块数=${o.promoModules?.length} title=${o.title}`) }
  catch(e){ console.log(`[${name}] 解析FAIL -> ${e.message}`) }
}