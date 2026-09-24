# 跨渠道开关配置

channelUsage 字段控制租户级别的跨渠道功能总开关。

## 三档语义

| 值 | crossChannelEnabled | mergedChannelIds | 业务含义 |
|---|---|---|---|
| site_only | false | siteChannelIds | 仅站点渠道 |
| site_and_cross | true | siteChannelIds | 站点+跨渠道 |
| site_cross_user（默认） | true | site∪user | 站点+跨渠道+个人 |

- `crossChannelEnabled`：是否允许跨渠道内容可见
- `mergedChannelIds`：合并后的可见渠道 id 列表

## 配置位置

### 主开关（可编辑）

路径：`/pages/tenant/detail` → "渠道配置"区块 → "是否允许跨渠道"开关

- ON → `site_cross_user`
- OFF → `site_only`

### 子开关（只读 + 联动）

路径：`/pages/settings/site-config` → "渠道配置"区块

- 顶部显示"跨渠道总开关"只读徽章（已开启/已关闭）
- 下方"跨渠道访问"开关在 site_only 时灰色禁用

## 联动规则

| 主开关 | 子开关"跨渠道访问"状态 |
|---|---|
| site_only | 灰色禁用，无法点击 |
| site_cross_user | 正常可编辑 |

## 后端过滤公式

```
record 可见 =
  (channelScope === 'all')
  || (crossChannelEnabled && allowCrossChannel === true)
  || (channelScope === 'specific' && channelIds ∩ mergedChannelIds 非空)
```

## 验证步骤

1. 租户详情页切到 site_only → 保存
2. 站点配置页刷新 → "跨渠道访问"开关灰色禁用
3. 课程接口返回：仅站点渠道课程，跨渠道课程屏蔽
4. 租户详情页切回 site_cross_user → 保存
5. 站点配置页刷新 → "跨渠道访问"开关可编辑
6. 课程接口返回：含跨渠道课程
