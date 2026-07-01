import React from 'react';
import { Form, Input, Select, Switch, Button, Space, Divider, message } from 'antd';
import { useAIConfig } from '../hooks/useAIConfig';

interface AIConfigFormProps {
  config?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AIConfigForm: React.FC<AIConfigFormProps> = ({ config, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const { testConfig } = useAIConfig();

  React.useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    } else {
      form.resetFields();
    }
  }, [config, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      await testConfig(values);
      message.success('配置测试成功');
    } catch {
      message.error('配置测试失败');
    }
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="provider" label="AI 服务商" rules={[{ required: true }]}>
        <Select options={[
          { value: 'openai', label: 'OpenAI' },
          { value: 'azure', label: 'Azure OpenAI' },
          { value: 'claude', label: 'Anthropic Claude' },
          { value: 'qwen', label: '阿里通义千问' },
          { value: 'wenxin', label: '百度文心一言' },
          { value: 'zhipu', label: '智谱 GLM' },
        ]} />
      </Form.Item>
      <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
        <Input.Password />
      </Form.Item>
      <Form.Item name="apiBase" label="API Base URL">
        <Input placeholder="留空使用默认" />
      </Form.Item>
      <Form.Item name="model" label="模型名称">
        <Input placeholder="gpt-4, gpt-3.5-turbo 等" />
      </Form.Item>
      <Form.Item name="temperature" label="温度参数" initialValue={0.7}>
        <Select options={[
          { value: 0, label: '0 (精确)' },
          { value: 0.3, label: '0.3 (低)' },
          { value: 0.7, label: '0.7 (中)' },
          { value: 1, label: '1.0 (高)' },
        ]} />
      </Form.Item>
      <Form.Item name="maxTokens" label="最大 Token 数">
        <Input />
      </Form.Item>
      <Divider />
      <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
          <Button onClick={handleTest}>测试配置</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default AIConfigForm;
