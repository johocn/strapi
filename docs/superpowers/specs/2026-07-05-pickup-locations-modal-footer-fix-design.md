# 自提点弹窗 footer 被裁切修复设计

**Date**: 2026-07-05
**Status**: Approved
**Owner**: dev

## 背景

Web 端自提点管理页 `pages/points/pickup-locations.vue` 编辑/新增弹窗的"保存"按钮不可见。

用户操作：打开 `http://localhost:5175/#/pages/points/pickup-locations`，点击任意自提点的"编辑"按钮，弹窗内编辑内容后看不到保存功能或保存按钮没有显示。

## 根因

弹窗 DOM 结构（[pickup-locations.vue:66-170](file:///e:/code/web/pages/points/pickup-locations.vue#L66-L170)）：

```html
<view class="modal-mask">
  <view class="modal-content large">              <!-- max-height: 90vh; overflow: hidden -->
    <view class="modal-header">...</view>
    <scroll-view class="modal-body" :style="{ maxHeight: '70vh' }">
      <!-- 大量表单内容 -->
    </scroll-view>
    <view class="modal-footer">                   <!-- 被裁切 -->
      <button>取消</button>
      <button>保存</button>
    </view>
  </view>
</view>
```

问题链路：

1. `modal-content` 设置 `max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;`（[line 550-554](file:///e:/code/web/pages/points/pickup-locations.vue#L550-L554)）
2. `modal-body` 使用内联样式 `:style="{ maxHeight: '70vh' }"`（[line 72](file:///e:/code/web/pages/points/pickup-locations.vue#L72)）
3. uni-app H5 中 `scroll-view` 在仅有 `maxHeight` 而无显式 `height` 时，不会触发滚动，而是按内容高度展开
4. 表单内容较多（基本信息 + 图片与证照 + 其他设置三段），modal-body 实际高度常超过 70vh
5. 加上 modal-header（约 100rpx）+ modal-footer（约 128rpx）后，modal-content 实际高度 > 90vh
6. `modal-content` 的 `overflow: hidden` 把超出部分裁掉 → footer 被推出可视区域外，用户看不到"保存"按钮
7. `modal-body` 的 `flex: 1` 与 `maxHeight` 内联冲突，且 flex 子项缺少 `min-height: 0`，无法正确收缩

## 设计

### 范围

仅修改 [pickup-locations.vue](file:///e:/code/web/pages/points/pickup-locations.vue) 单文件（1 行模板 + 3 处 CSS）。不改后端、不改其他页面、不改表单逻辑。

### 改动 1：删除 modal-body 内联 maxHeight

[pickup-locations.vue:72](file:///e:/code/web/pages/points/pickup-locations.vue#L72)：

```html
<!-- 改前 -->
<scroll-view scroll-y class="modal-body" :style="{ maxHeight: '70vh' }">

<!-- 改后 -->
<scroll-view scroll-y class="modal-body">
```

**原因**：内联 `maxHeight: '70vh'` 与 flex 子项收缩机制冲突，导致 scroll-view 不触发内部滚动而是按内容展开，把 footer 推出可视区。

### 改动 2：modal-header 加 flex-shrink: 0

[pickup-locations.vue:555-558](file:///e:/code/web/pages/points/pickup-locations.vue#L555-L558)：

```css
/* 改前 */
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}

/* 改后 */
.modal-header {
  flex-shrink: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
```

### 改动 3：modal-body 加 min-height: 0

[pickup-locations.vue:562](file:///e:/code/web/pages/points/pickup-locations.vue#L562)：

```css
/* 改前 */
.modal-body { padding: 30rpx; flex: 1; overflow-y: auto; }

/* 改后 */
.modal-body {
  flex: 1;
  min-height: 0;
  padding: 30rpx;
  overflow-y: auto;
}
```

**关键**：`min-height: 0` 是 flex 子项能正确收缩并触发内部滚动的关键属性。flex 子项默认 `min-height: auto`，不会收缩到内容最小高度以下。

### 改动 4：modal-footer 加 flex-shrink: 0

[pickup-locations.vue:610-613](file:///e:/code/web/pages/points/pickup-locations.vue#L610-L613)：

```css
/* 改前 */
.modal-footer {
  display: flex; gap: 20rpx; padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

/* 改后 */
.modal-footer {
  flex-shrink: 0;
  display: flex; gap: 20rpx; padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}
```

### 最终布局结构

```
modal-content (max-height: 90vh, display: flex, flex-direction: column, overflow: hidden)
├── modal-header  (flex-shrink: 0)        ← 固定高度，不被压缩
├── modal-body    (flex: 1, min-height: 0, overflow-y: auto)  ← 自适应收缩，内部滚动
└── modal-footer  (flex-shrink: 0)        ← 固定高度，不被压缩
```

modal-content 无需改动（已有 `max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;`）。

## 验证点

1. 打开 `http://localhost:5175/#/pages/points/pickup-locations`，点击任意自提点的"编辑"按钮
2. 弹窗底部应显示"取消"和"保存"按钮（**关键验证点**）
3. 表单内容超过视口高度时，modal-body 内部出现滚动条
4. 滚动 modal-body 时，header 和 footer 始终可见
5. 点击"保存"按钮：调用 `updatePickupLocation`，成功后弹窗关闭
6. 点击"取消"按钮：弹窗关闭
7. 新增模式（点击"+ 新增"）同样验证 footer 可见
8. 短表单场景（无渠道、无图片、无描述）：弹窗高度自适应内容，不超过 90vh
9. 地图选点弹窗（[line 182-209](file:///e:/code/web/pages/points/pickup-locations.vue#L182-L209)）不受影响（独立 modal，无 maxHeight 内联）

## 不做的事

- 不修改其他页面弹窗（quiz/form.vue、products.vue 等）的同类问题，本次仅修自提点
- 不改后端 API
- 不改表单字段或交互逻辑
- 不改 modal-content 的 `max-height: 90vh`
- 不引入第三方弹窗组件
- 不重构为单独的 Modal 组件（YAGNI）
- 不动地图选点弹窗（独立结构，无 footer 裁切问题）

## 风险

- **低**：改动集中在单文件 1 行模板 + 3 处 CSS，flex 三段式是成熟模式
- **回归点**：`min-height: 0` 是 flex 子项收缩的关键，缺失会导致 body 不滚动、footer 被推出
- **兼容性**：flex 三段式在 H5/小程序/App 各端均支持，无平台差异
