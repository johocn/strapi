// admin/src/pages/CollectPage.tsx

import React from 'react';
import { Box, Typography, Button, Badge, Flex } from '@strapi/design-system';
import { useCollectSources } from '../hooks/useCollectSources';
import { useCollectTasks } from '../hooks/useCollectTasks';
import SourceConfig from '../components/SourceConfig';
import TitleSelector from '../components/TitleSelector';
import ContentPreview from '../components/ContentPreview';

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
    <Box padding={4}>
      <Typography variant="alpha">采集管理</Typography>
      <Typography variant="pi" color="neutral600">定向采集内容</Typography>

      {step === 'list' && (
        <Box marginTop={4}>
          <Flex justifyContent="space-between" marginBottom={4}>
            <Typography variant="beta">采集源列表</Typography>
            <Button onClick={handleCreateSource}>创建采集源</Button>
          </Flex>

          <Flex direction="column" gap={2}>
            {sources.map((source: any) => (
              <Box key={source.id} padding={3} background="neutral100">
                <Flex justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight="bold">{source.name}</Typography>
                    <Typography variant="pi" color="neutral600">{source.url}</Typography>
                  </Box>
                  <Flex gap={2}>
                    <Badge variant={source.type === 'template' ? 'success' : 'warning'}>
                      {source.type === 'template' ? '模板' : '自定义'}
                    </Badge>
                    <Badge variant={source.isActive ? 'success' : 'danger'}>
                      {source.isActive ? '启用' : '禁用'}
                    </Badge>
                  </Flex>
                  <Flex gap={2}>
                    <Button variant="secondary" onClick={() => handleEditSource(source)}>
                      编辑
                    </Button>
                    <Button onClick={() => handleStartCollect(source.id)}>
                      开始采集
                    </Button>
                    <Button variant="danger" onClick={() => deleteSource(source.id)}>
                      删除
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {step === 'select' && currentTask && (
        <TitleSelector
          titles={currentTask.titles}
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

      {showSourceModal && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100%"
          height="100%"
          background="neutral1000"
          zIndex={100}
          onClick={() => setShowSourceModal(false)}
        >
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            background="neutral0"
            padding={4}
            borderRadius={4}
            shadow="tableShadow"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <SourceConfig
              source={editingSource}
              onSave={handleSaveSource}
              onCancel={() => setShowSourceModal(false)}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CollectPage;