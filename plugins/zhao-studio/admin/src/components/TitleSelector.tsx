// admin/src/components/TitleSelector.tsx

import React from 'react';
import { Box, Typography, Checkbox, Button, Flex } from '@strapi/design-system';

interface TitleSelectorProps {
  titles: any[];
  onSelectionChange: (selected: string[]) => void;
  onFetchContent: () => void;
}

const TitleSelector: React.FC<TitleSelectorProps> = ({
  titles,
  onSelectionChange,
  onFetchContent,
}) => {
  const [selectedUrls, setSelectedUrls] = React.useState<string[]>([]);

  const handleSelectAll = () => {
    const allUrls = titles.map((t) => t.url);
    setSelectedUrls(allUrls);
    onSelectionChange(allUrls);
  };

  const handleClearSelection = () => {
    setSelectedUrls([]);
    onSelectionChange([]);
  };

  const handleToggle = (url: string) => {
    const newSelection = selectedUrls.includes(url)
      ? selectedUrls.filter((u) => u !== url)
      : [...selectedUrls, url];
    setSelectedUrls(newSelection);
    onSelectionChange(newSelection);
  };

  return (
    <Box padding={4}>
      <Typography variant="delta">选择要采集的文章</Typography>

      <Flex marginTop={2} gap={2}>
        <Button variant="secondary" onClick={handleSelectAll}>
          全选
        </Button>
        <Button variant="secondary" onClick={handleClearSelection}>
          清空选择
        </Button>
        <Button onClick={onFetchContent} disabled={selectedUrls.length === 0}>
          采集选中项 ({selectedUrls.length})
        </Button>
      </Flex>

      <Flex direction="column" gap={2} marginTop={4}>
        {titles.map((title, index) => (
          <Box key={index} padding={2} background="neutral100">
            <Flex gap={2} alignItems="center">
              <Checkbox
                checked={selectedUrls.includes(title.url)}
                onCheckedChange={() => handleToggle(title.url)}
              />
              <Typography>{title.title}</Typography>
              <Typography variant="pi" color="neutral600">{title.url}</Typography>
            </Flex>
          </Box>
        ))}
      </Flex>
    </Box>
  );
};

export default TitleSelector;