// admin/src/components/ChannelScopePicker.tsx
import React, { useState, useEffect } from 'react';
import { Radio, TreeSelect, Spin } from 'antd';

export interface ChannelScopePickerProps {
  value?: { all: boolean; channelIds: string[] };
  onChange?: (value: { all: boolean; channelIds: string[] }) => void;
  channels?: { id: string; name: string; parentId?: string }[];
  loading?: boolean;
}

export const ChannelScopePicker: React.FC<ChannelScopePickerProps> = ({
  value = { all: false, channelIds: [] },
  onChange,
  channels = [],
  loading = false,
}) => {
  const [scope, setScope] = useState(value);

  useEffect(() => setScope(value), [value]);

  const handleChange = (newScope: { all: boolean; channelIds: string[] }) => {
    setScope(newScope);
    onChange?.(newScope);
  };

  if (loading) return <Spin size="small" />;

  return (
    <div>
      <Radio.Group
        value={scope.all ? 'all' : 'specific'}
        onChange={e => {
          if (e.target.value === 'all') {
            handleChange({ all: true, channelIds: [] });
          } else {
            handleChange({ all: false, channelIds: scope.channelIds });
          }
        }}
      >
        <Radio value="all">全部渠道</Radio>
        <Radio value="specific">指定渠道</Radio>
      </Radio.Group>
      {!scope.all && (
        <TreeSelect
          style={{ width: '100%', marginTop: 8 }}
          value={scope.channelIds}
          onChange={(ids: string[]) => handleChange({ all: false, channelIds: ids })}
          treeData={channels.map(c => ({ title: c.name, value: c.id, key: c.id }))}
          treeCheckable
          placeholder="选择渠道"
        />
      )}
    </div>
  );
};

export default ChannelScopePicker;
