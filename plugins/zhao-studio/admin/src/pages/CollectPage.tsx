import React from 'react';
import { Card, Typography, Button, Badge, Space, Modal, List, Tag } from 'antd';
import { useCollectSources } from '../hooks/useCollectSources';
import { useCollectTasks } from '../hooks/useCollectTasks';
import SourceConfig from '../components/SourceConfig';
import TitleSelector from '../components/TitleSelector';
import ContentPreview from '../components/ContentPreview';

const { Title, Text } = Typography;

const CollectPage = () => {
  const {
    sources,
    loading: sourcesLoading,
    createSource,
    updateSource,
    deleteSource,
  } = useCollectSources();

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    getTask,
    fetchSelectedContent,
    confirmImport,
  } = useCollectTasks();

  const [showSourceModal, setShowSourceModal] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState<any>(null);
  const [currentTask, setCurrentTask] = React.useState<any>(null);
  const [selectedTitles, setSelectedTitles] = React.useState<string[]>([]);
  const [fetchedContents, setFetchedContents] = React.useState<any[]>([]);
  const [step, setStep] = React.useState<'list' | 'select' | 'preview'>('list');

  const handleCreateSource = () => {
    setEditingSource(null);
    setShowSourceModal(true);
  };

  const handleEditSource = (source: any) => {
    setEditingSource(source);
    setShowSourceModal(true);
  };

  const handleSaveSource = async (data: any) => {
    if (editingSource) {
      await updateSource(editingSource.id, data);
    } else {
      await createSource(data);
    }
    setShowSourceModal(false);
  };

  const handleStartCollect = async (sourceId: string) => {
    const task = await createTask(sourceId);
    setCurrentTask(task);
    setStep('select');
  };

  const handleFetchContent = async () => {
    const contents = await fetchSelectedContent(currentTask.id, selectedTitles);
    setFetchedContents(contents);
    setStep('preview');
  };

  const handleConfirmImport = async (confirmedContents: any[]) => {
    await confirmImport(currentTask.id, confirmedContents);
    setStep('list');
    setCurrentTask(null);
    setSelectedTitles([]);
    setFetchedContents([]);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>采集管理</Title>
        <Text type="secondary">定向采集内容</Text>
      </div>

      {step === 'list' && (
        <Card
          title="采集源列表"
          extra={<Button type="primary" onClick={handleCreateSource}>创建采集源</Button>}
        >
          <List
            loading={sourcesLoading}
            dataSource={sources}
            renderItem={(source: any) => (
              <List.Item
                actions={[
                  <Button key="edit" onClick={() => handleEditSource(source)}>编辑</Button>,
                  <Button key="collect" type="primary" onClick={() => handleStartCollect(source.id)}>
                    开始采集
                  </Button>,
                  <Button key="delete" danger onClick={() => deleteSource(source.id)}>
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{source.name}</Text>
                      <Tag color={source.type === 'template' ? 'success' : 'warning'}>
                        {source.type === 'template' ? '模板' : '自定义'}
                      </Tag>
                      <Tag color={source.isActive ? 'success' : 'error'}>
                        {source.isActive ? '启用' : '禁用'}
                      </Tag>
                    </Space>
                  }
                  description={<Text type="secondary">{source.url}</Text>}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {step === 'select' && currentTask && (
        <TitleSelector
          titles={currentTask.titles || []}
          onSelectionChange={setSelectedTitles}
          onFetchContent={handleFetchContent}
        />
      )}

      {step === 'preview' && (
        <ContentPreview
          contents={fetchedContents}
          onConfirm={handleConfirmImport}
          onCancel={() => setStep('select')}
        />
      )}

      <Modal
        open={showSourceModal}
        title={editingSource ? '编辑采集源' : '创建采集源'}
        onCancel={() => setShowSourceModal(false)}
        footer={null}
        destroyOnClose
      >
        <SourceConfig
          source={editingSource}
          onSave={handleSaveSource}
          onCancel={() => setShowSourceModal(false)}
        />
      </Modal>
    </Space>
  );
};

export default CollectPage;
