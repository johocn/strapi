// admin/src/components/UserPicker.tsx
import React, { useState, useEffect } from 'react';
import { Select, Spin } from 'antd';
import { fetchUsers } from '../api';

export interface UserPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export const UserPicker: React.FC<UserPickerProps> = ({
  value,
  onChange,
  placeholder = '选择用户',
}) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchUsers({ page: 1, pageSize: 20, search });
        const opts = (res.data || []).map((u: any) => ({
          label: u.username,
          value: u.documentId,
        }));
        setOptions(opts);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      style={{ width: '100%' }}
      filterOption={false}
      onSearch={setSearch}
      onChange={onChange}
      notFoundContent={loading ? <Spin size="small" /> : null}
      options={options}
    />
  );
};

export default UserPicker;
