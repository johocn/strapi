import React from 'react';
import { Tabs, Card, Button, Space, Select, message } from 'antd';
import PublishRecordList from './PublishRecordList';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import { usePublishAccounts } from '../hooks/usePublishAccounts';
import { usePublishActions } from '../hooks/usePublishActions';

const PublishPanel: React.FC<{ articleIds: string[] }> = ({ articleIds }) => {
  const { platforms } = usePublishPlatforms();
  const { accounts, fetchAccounts } = usePublishAccounts();
  const { publish, loading } = usePublishActions();
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>();
  const [selectedAccount, setSelectedAccount] = React.useState<string>();

  React.useEffect(() => {
    if (selectedPlatform) {
      fetchAccounts(selectedPlatform);
    }
  }, [selectedPlatform, fetchAccounts]);

  const handlePublish = async () => {
    if (!selectedPlatform || !selectedAccount) {
      message.warning('请选择平台和账号');
      return;
    }
    if (articleIds.length === 0) {
      message.warning('请选择要发布的文章');
      return;
    }
    try {
      await publish({
        articleIds,
        platformId: selectedPlatform,
        accountId: selectedAccount,
      });
      message.success('发布任务已创建');
    } catch (err) {
      message.error('发布失败');
    }
  };

  return (
    <Tabs
      items={[
        {
          key: 'publish',
          label: '发布',
          children: (
            <Card>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Select
                  placeholder="选择平台"
                  style={{ width: '100%' }}
                  value={selectedPlatform}
                  onChange={(v) => {
                    setSelectedPlatform(v);
                    setSelectedAccount(undefined);
                  }}
                  options={platforms.map((p: any) => ({ value: p.id, label: p.name }))}
                />
                <Select
                  placeholder="选择账号"
                  style={{ width: '100%' }}
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                  options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                  disabled={!selectedPlatform}
                />
                <Button
                  type="primary"
                  onClick={handlePublish}
                  loading={loading}
                  disabled={articleIds.length === 0}
                >
                  发布选中文章（{articleIds.length}）
                </Button>
              </Space>
            </Card>
          ),
        },
        {
          key: 'records',
          label: '发布记录',
          children: <PublishRecordList />,
        },
      ]}
    />
  );
};

export default PublishPanel;
