// 商户促销活动 —— 后端契约测试（零依赖，Node 20 内置 node:test）
// 锁死：activity 促销字段 / 模块类型白名单 / 宣传模板枚举
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const schema = JSON.parse(readFileSync(resolve(here, '../src/content-types/activity/schema.json'), 'utf8'))
const svcSrc = readFileSync(resolve(here, '../src/services/activity.ts'), 'utf8')

// 与 C 端 shao 白名单保持完全一致的期望清单（16 类）
const EXPECTED_MODULE_TYPES = [
  'cover', 'info', 'rich', 'highlights', 'speakers', 'agenda', 'images',
  'rewards', 'contact', 'message', 'faq', 'custom', 'floatContact',
  'goods', 'purpose', 'notice',
]

test('activity schema 含 goodsList(json) 与 purpose(text)', () => {
  assert.equal(schema.attributes.goodsList?.type, 'json')
  assert.equal(schema.attributes.purpose?.type, 'text')
})

test('PROMO_MODULE_TYPES 覆盖 16 类且顺序稳定', () => {
  const m = svcSrc.match(/export const PROMO_MODULE_TYPES = \[([\s\S]*?)\] as const/)
  assert.ok(m, '未找到 PROMO_MODULE_TYPES 常量')
  const actual = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1])
  assert.deepEqual(actual, EXPECTED_MODULE_TYPES)
})

test('PROMO_TEMPLATES 含 sale', () => {
  const m = svcSrc.match(/export const PROMO_TEMPLATES = \[([\s\S]*?)\] as const/)
  assert.ok(m, '未找到 PROMO_TEMPLATES 常量')
  const actual = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1])
  assert.ok(actual.includes('sale'), 'promoTemplate 缺 sale 会导致保存被拒')
})

const statsSvcSrc = readFileSync(resolve(here, '../src/services/activity-stats.ts'), 'utf8')
const statsCtlSrc = readFileSync(resolve(here, '../src/controllers/activity-stats.ts'), 'utf8')

test('getOverview 支持 promoTemplate 过滤', () => {
  assert.ok(
    /getOverview\(\{[^}]*promoTemplate/.test(statsSvcSrc),
    'getOverview 签名缺 promoTemplate 参数'
  )
  assert.ok(statsSvcSrc.includes('promoTemplate'), '未按 promoTemplate 过滤')
  assert.ok(/ctx\.query[\s\S]*promoTemplate/.test(statsCtlSrc) || statsCtlSrc.includes('promoTemplate'), 'controller 未透传 promoTemplate')
})