# zhao-studio

内容工作室插件：定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计

## 功能模块

- 模块1：智能采集（半自动采集）
- 模块2：草稿加工（人+AI）
- 模块3：多渠道发布（内部生产）
- 模块4：C端内容分发（基础实现）

## 安装

```bash
npm install zhao-studio
```

## 配置

在 `config/plugins.ts` 中配置：

```typescript
export default ({ env }) => ({
  'zhao-studio': {
    enabled: true,
    resolve: './plugins/zhao-studio',
  },
});
```