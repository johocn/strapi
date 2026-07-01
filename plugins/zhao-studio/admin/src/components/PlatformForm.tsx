import React from 'react';
import { Form, Input, Select, Switch, Button, Space } from 'antd';

interface PlatformFormProps {
  platform?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const PlatformForm: React.FC<PlatformFormProps> = ({ platform, onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (platform) {
      form.setFieldsValue(platform);
    } else {
      form.resetFields();
    }
  }, [platform, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="平台名称" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="type" label="平台类型" rules={[{ required: true }]}>
        <Select options={[
          { value: 'wechat', label: '微信公众号' },
          { value: 'toutiao', label: '今日头条' },
          { value: 'douyin', label: '抖音' },
          { value: 'xhs', label: '小红书' },
          { value: 'web', label: '网站' },
        ]} />
      </Form.Item>
      <Form.Item name="appId" label="AppID">
        <Input />
      </Form.Item>
      <Form.Item name="appSecret" label="AppSecret">
        <Input.Password />
      </Form.Item>
      <Form.Item name="callbackUrl" label="回调URL">
        <Input />
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

export default PlatformForm;
