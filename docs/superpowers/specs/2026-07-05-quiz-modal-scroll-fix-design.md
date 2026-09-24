# 测验弹窗滚动修复设计

**日期:** 2026-07-05
**主题:** video-player 测验弹窗选项过多时 footer 按钮被遮挡修复
**目标文件:** `e:\code\shao\pages\video-player\video-player.vue`

## 问题背景

在 `video-player.vue` 的测验弹窗中，当题目选项数量超过 4 个时：
1. 最后一个操作按钮（提交/下一题/完成答题）被遮挡，无法点击
2. 弹窗内容区无滚动条，无法滚动查看被遮挡内容

## 根因分析

当前 CSS 布局存在硬编码问题：

```css
.quiz-modal {
  max-height: 90vh;
  overflow: hidden;  /* 内容溢出直接裁剪 */
}

.quiz-content {
  max-height: calc(90vh - 200rpx);  /* 硬编码 200rpx 预留 header+footer */
  overflow-y: auto;
}
```

- `200rpx` 预留空间不足（实际 header + footer ≈ 250rpx+）
- `.quiz-modal` 的 `overflow: hidden` 导致 footer 被裁剪
- 6 个选项时 content 高度超出，footer 被推出视口

## 设计方案

采用 flex 列布局从根因修复，footer 永远固定可见，content 自动滚动。仅修改 `<style>` 段，不动 template 和逻辑。

### 改动清单

**改动 1: `.quiz-modal` 改为 flex 列布局**

```css
.quiz-modal {
  width: 90%;
  max-height: 90vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;          /* 新增 */
  flex-direction: column; /* 新增 */
  overflow: hidden;
}
```

**改动 2: `.quiz-header` 固定不被压缩**

```css
.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0; /* 新增 */
}
```

**改动 3: `.quiz-content` 用 flex:1 替代硬编码 calc**

```css
.quiz-content {
  padding: 30rpx;
  flex: 1;          /* 替代 max-height: calc(90vh - 200rpx) */
  overflow-y: auto;
}
```

**改动 4: `.quiz-footer` 固定不被压缩**

```css
.quiz-footer {
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0; /* 新增 */
}
```

**改动 5: `.option-item` 紧凑化（6 选项场景）**

```css
.option-item {
  display: flex;
  align-items: center;
  padding: 18rpx;       /* 24 → 18 */
  margin-bottom: 10rpx; /* 15 → 10 */
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
  /* 其余样式保持不变 */
}
```

`.option-key` 圆形尺寸保持不变（视觉锚点），仅压缩垂直间距。

## 验证场景

| 场景 | 选项数 | 预期行为 |
|------|--------|----------|
| 4 选项 | 4 | 视觉无显著变化，无滚动条，footer 可见 |
| 6 选项 | 6 | content 出现滚动条，footer 始终可见可点 |
| H5 滚动 | 任意 | 滚动惯性正常（uni-app `overflow-y: auto` 在 H5 即原生滚动） |

## 不做的事

- 不改 template 结构
- 不改 quiz 逻辑代码
- 不做两列布局（6 个选项单列足够）
- 不动其他弹窗（channel picker 等）
- 不重构整个 quiz-modal 组件

## 风险评估

- **低风险**: 仅 CSS 改动，无逻辑变更
- **兼容性**: flex 布局在 H5、小程序、App 三端均原生支持
- **回归点**: `.option-item` padding 缩小可能影响 4 选项场景视觉，需肉眼检查
