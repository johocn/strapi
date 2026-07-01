import React from 'react';
import { Form, Input, Select, Switch, Button, Space } from 'antd';

interface AccountFormProps {
  account?: any;
  platforms?: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, platforms = [], onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (account) {
      form.setFieldsValue(account);
    } else {
      form.resetFields();
    }
  }, [account, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="账号名称" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="platformId" label="所属平台" rules={[{ required: true }]}>
        <Select
          options={platforms.map((p) => ({ value: p.documentId || p.id, label: p.name }))}
          placeholder="选择平台"
        />
      </Form.Item>
      <Form.Item name="accountId" label="平台账号ID">
        <Input />
      </Form.Item>
      <Form.Item name="accessToken" label="Access Token">
        <Input.Password />
      </Form.Item>
      <Form.Item name="refreshToken" label="Refresh Token">
        <Input.Password />
      </Form.Item>
      <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default AccountForm;
