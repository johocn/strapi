import React from 'react';
import { Card, Button, Space, Typography, Tag, List } from 'antd';

const { Title, Paragraph, Text } = Typography;

interface ContentItem {
  title: string;
  content: string;
  author?: string;
  date?: string;
  url?: string;
}

interface ContentPreviewProps {
  contents: ContentItem[];
  onConfirm: (confirmed: ContentItem[]) => void;
  onCancel: () => void;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ contents, onConfirm, onCancel }) => {
  const [excluded, setExcluded] = React.useState<string[]>([]);

  const handleToggle = (title: string) => {
    setExcluded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleConfirm = () => {
    const confirmed = contents.filter((c) => !excluded.includes(c.title));
    onConfirm(confirmed);
  };

  return (
    <Card
      title="内容预览"
      extra={
        <Space>
          <Button onClick={onCancel}>返回</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认导入（{contents.length - excluded.length}）
          </Button>
        </Space>
      }
    >
      <List
        dataSource={contents}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                size="small"
                onClick={() => handleToggle(item.title)}
                key="toggle"
              >
                {excluded.includes(item.title) ? '恢复' : '排除'}
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{item.title}</Text>
                  {excluded.includes(item.title) && <Tag color="error">已排除</Tag>}
                </Space>
              }
              description={
                <>
                  {item.author && <Text type="secondary">作者: {item.author}</Text>}
                  {item.date && <Text type="secondary"> 日期: {item.date}</Text>}
                  <Paragraph
                    ellipsis={{ rows: 3 }}
                    style={{ marginTop: 8, marginBottom: 0 }}
                  >
                    {item.content}
                  </Paragraph>
                </>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ContentPreview;
