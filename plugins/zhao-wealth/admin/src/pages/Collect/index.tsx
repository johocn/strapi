import { Tabs } from 'antd';
import TaskTab from './TaskTab';
import NavTab from './NavTab';
import LogTab from './LogTab';

const Collect = () => (
  <Tabs
    defaultActiveKey="task"
    items={[
      { key: 'task', label: '采集任务', children: <TaskTab /> },
      { key: 'nav', label: '净值明细', children: <NavTab /> },
      { key: 'log', label: '操作日志', children: <LogTab /> },
    ]}
  />
);

export default Collect;
