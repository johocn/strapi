import { computePointsPreview } from '../server/src/services/activity'

describe('computePointsPreview 分级积分预览', () => {
  test('全部达成：5+5+20+50+50=130', () => {
    expect(computePointsPreview({ loginAuth: true, subscribed: true, conditions: { contact: true, survey: true } })).toEqual({
      base: 5, auth: 5, contact: 20, survey: 50, subscribe: 50, total: 130,
    })
  })

  test('仅静默登录报名（未授权/未关注/未填信息）：仅 base 5', () => {
    expect(computePointsPreview({ loginAuth: false, subscribed: false, conditions: { contact: false, survey: false } })).toEqual({
      base: 5, auth: 0, contact: 0, survey: 0, subscribe: 0, total: 5,
    })
  })

  test('授权登录 + 联系方式：5+5+20=30', () => {
    expect(computePointsPreview({ loginAuth: true, subscribed: false, conditions: { contact: true, survey: false } })).toEqual({
      base: 5, auth: 5, contact: 20, survey: 0, subscribe: 0, total: 30,
    })
  })

  test('已关注公众号（未授权）：5+50=55', () => {
    expect(computePointsPreview({ loginAuth: false, subscribed: true, conditions: { contact: false, survey: false } })).toEqual({
      base: 5, auth: 0, contact: 0, survey: 0, subscribe: 50, total: 55,
    })
  })
})
