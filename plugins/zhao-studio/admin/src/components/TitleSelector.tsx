import React from 'react';
import { Card, Checkbox, Button, Space, Typography, List } from 'antd';

const { Title } = Typography;

interface TitleSelectorProps {
  titles: string[];
  onSelectionChange: (selected: string[]) => void;
  onFetchContent: () => void;
}

const TitleSelector: React.FC<TitleSelectorProps> = ({ titles, onSelectionChange, onFetchContent }) => {
  const [selected, setSelected] = React.useState<string[]>([]);

  const handleToggle = (title: string) => {
    const next = selected.includes(title)
      ? selected.filter((t) => t !== title)
      : [...selected, title];
    setSelected(next);
    onSelectionChange(next);
  };

  const handleSelectAll = () => {
    setSelected(titles);
    onSelectionChange(titles);
  };

  const handleClear = () => {
    setSelected([]);
    onSelectionChange([]);
  };

  return (
    <Card
      title="选择要采集的标题"
      extra={
        <Space>
          <Button size="small" onClick={handleSelectAll}>全选</Button>
          <Button size="small" onClick={handleClear}>清空</Button>
        </Space>
      }
    >
      <List
        dataSource={titles}
        renderItem={(title) => (
          <List.Item>
            <Checkbox
              checked={selected.includes(title)}
              onChange={() => handleToggle(title)}
            >
              {title}
            </Checkbox>
          </List.Item>
        )}
      />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button type="primary" onClick={onFetchContent} disabled={selected.length === 0}>
          获取内容（{selected.length}）
        </Button>
      </div>
    </Card>
  );
};

export default TitleSelector;
