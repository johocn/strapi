# 业务监督

admin 巡视各业务模块数据的入口清单。本章节只看数据，不创建内容。

## 步骤

1. 课程巡视 → `/pages/course/list`
   - 查看课程状态分布（草稿/待审核/已发布/已归档）
   - 控制台首页"课程状态"图表也展示此数据

2. 题库巡视 → `/pages/quiz/list`
   - 查看题目总数和类型分布

3. 积分巡视 → `/pages/points/records`
   - 查看积分发放记录
   - 积分统计 → `/pages/points/statistics`
   - 签到记录 → `/pages/points/sign-in-records`

4. 学习数据 → `/pages/study/progress`
   - 查看课程进度概览
   - 课时进度 → `/pages/study/lesson-progress`

5. 渠道网络 → `/pages/channel/network`
   - 查看渠道树形结构（父子渠道关系）

6. 兑换记录 → `/pages/redemption/records`
   - 查看兑换码使用记录

## 验证

- 各列表页能正常加载并显示数据
- 数据量与控制台首页统计卡片一致
