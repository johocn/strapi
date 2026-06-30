// admin/src/components/AIAssistant.tsx

import React from 'react';
import { Box, Typography, Button, Flex, Badge } from '@strapi/design-system';
import { useAIActions } from '../hooks/useAIActions';

interface AIAssistantProps {
  articleId: string;
  article: any;
  onApply: (field: string, value: string) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ articleId, article, onApply }) => {
  const {
    loading,
    error,
    generateSummary,
    optimizeTitle,
    rewriteContent,
    convertLanguage,
  } = useAIActions();

  const [showModal, setShowModal] = React.useState(false);
  const [modalContent, setModalContent] = React.useState<string>('');
  const [modalField, setModalField] = React.useState<string>('');
  const [titleStyle, setTitleStyle] = React.useState<'formal' | 'casual' | 'shocking' | null>(null);
  const [rewriteTone, setRewriteTone] = React.useState<'formal' | 'casual' | 'humorous' | null>(null);
  const [convertTarget, setConvertTarget] = React.useState<'simplified' | 'traditional' | null>(null);

  const handleGenerateSummary = async () => {
    try {
      const result = await generateSummary(articleId, 150);
      setModalContent(result.summary);
      setModalField('aiSummary');
      setShowModal(true);
    } catch (err) {
      // error handled by hook
    }
  };

  const handleOptimizeTitle = async (style: 'formal' | 'casual' | 'shocking') => {
    setTitleStyle(null);
    try {
      const result = await optimizeTitle(articleId, style);
      setModalContent(result.optimizedTitle);
      setModalField('aiOptimizedTitle');
      setShowModal(true);
    } catch (err) {
      // error handled by hook
    }
  };

  const handleRewriteContent = async (tone: 'formal' | 'casual' | 'humorous') => {
    setRewriteTone(null);
    try {
      const result = await rewriteContent(articleId, tone);
      setModalContent(result.rewrittenContent);
      setModalField('content');
      setShowModal(true);
    } catch (err) {
      // error handled by hook
    }
  };

  const handleConvertLanguage = async (target: 'simplified' | 'traditional') => {
    setConvertTarget(null);
    try {
      const result = await convertLanguage(articleId, target);
      setModalContent(result.convertedContent);
      setModalField('content');
      setShowModal(true);
    } catch (err) {
      // error handled by hook
    }
  };

  const handleApply = () => {
    onApply(modalField, modalContent);
    setShowModal(false);
  };

  return (
    <Box padding={4}>
      <Typography variant="delta">AI辅助</Typography>

      {error && (
        <Box marginTop={2}>
          <Badge variant="danger">{error}</Badge>
        </Box>
      )}

      <Flex marginTop={4} gap={4} direction="column">
        <Button onClick={handleGenerateSummary} disabled={loading}>
          {loading ? '处理中...' : '生成摘要'}
        </Button>

        <Box>
          <Typography variant="pi">优化标题</Typography>
          <Flex gap={2} marginTop={1}>
            <Button variant={titleStyle === 'formal' ? 'default' : 'secondary'} onClick={() => setTitleStyle('formal')} disabled={loading}>
              正式风格
            </Button>
            <Button variant={titleStyle === 'casual' ? 'default' : 'secondary'} onClick={() => setTitleStyle('casual')} disabled={loading}>
              轻松风格
            </Button>
            <Button variant={titleStyle === 'shocking' ? 'default' : 'secondary'} onClick={() => setTitleStyle('shocking')} disabled={loading}>
              震惊风格
            </Button>
          </Flex>
          {titleStyle && (
            <Button marginTop={2} onClick={() => handleOptimizeTitle(titleStyle)} disabled={loading}>
              {loading ? '处理中...' : '执行优化'}
            </Button>
          )}
        </Box>

        <Box>
          <Typography variant="pi">改写内容</Typography>
          <Flex gap={2} marginTop={1}>
            <Button variant={rewriteTone === 'formal' ? 'default' : 'secondary'} onClick={() => setRewriteTone('formal')} disabled={loading}>
              正式语气
            </Button>
            <Button variant={rewriteTone === 'casual' ? 'default' : 'secondary'} onClick={() => setRewriteTone('casual')} disabled={loading}>
              轻松语气
            </Button>
            <Button variant={rewriteTone === 'humorous' ? 'default' : 'secondary'} onClick={() => setRewriteTone('humorous')} disabled={loading}>
              幽默语气
            </Button>
          </Flex>
          {rewriteTone && (
            <Button marginTop={2} onClick={() => handleRewriteContent(rewriteTone)} disabled={loading}>
              {loading ? '处理中...' : '执行改写'}
            </Button>
          )}
        </Box>

        <Box>
          <Typography variant="pi">繁简转换</Typography>
          <Flex gap={2} marginTop={1}>
            <Button variant={convertTarget === 'simplified' ? 'default' : 'secondary'} onClick={() => setConvertTarget('simplified')} disabled={loading}>
              转为简体
            </Button>
            <Button variant={convertTarget === 'traditional' ? 'default' : 'secondary'} onClick={() => setConvertTarget('traditional')} disabled={loading}>
              转为繁体
            </Button>
          </Flex>
          {convertTarget && (
            <Button marginTop={2} onClick={() => handleConvertLanguage(convertTarget)} disabled={loading}>
              {loading ? '处理中...' : '执行转换'}
            </Button>
          )}
        </Box>
      </Flex>

      {showModal && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100%"
          height="100%"
          background="neutral1000"
          zIndex={100}
          onClick={() => setShowModal(false)}
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
            maxWidth="600px"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Typography variant="delta">AI生成结果</Typography>
            <Box marginTop={4} maxHeight="300px" overflow="auto">
              <Typography>{modalContent.substring(0, 500)}{modalContent.length > 500 ? '...' : ''}</Typography>
            </Box>
            <Flex marginTop={4} justifyContent="flex-end" gap={2}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleApply}>
                应用到文章
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AIAssistant;