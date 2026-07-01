import React from 'react';
import { Form, Input, Select, Switch, Button, Space } from 'antd';
import { CollectSource } from '../hooks/useCollectSources';

interface SourceConfigProps {
  source?: CollectSource | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const SourceConfig: React.FC<SourceConfigProps> = ({ source, onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (source) {
      form.setFieldsValue(source);
    } else {
      form.resetFields();
    }
  }, [source, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSave(values);
    });
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="url" label="URL" rules={[{ required: true, message: '请输入URL' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="type" label="类型" initialValue="custom">
        <Select options={[
          { value: 'template', label: '模板' },
          { value: 'custom', label: '自定义' },
        ]} />
      </Form.Item>
      <Form.Item name="template" label="模板">
        <Input />
      </Form.Item>
      <Form.Item name="titleSelector" label="标题选择器">
        <Input />
      </Form.Item>
      <Form.Item name="contentSelector" label="内容选择器">
        <Input />
      </Form.Item>
      <Form.Item name="authorSelector" label="作者选择器">
        <Input />
      </Form.Item>
      <Form.Item name="dateSelector" label="日期选择器">
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

export default SourceConfig;
