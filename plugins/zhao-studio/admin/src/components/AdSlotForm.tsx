import React from 'react';
import { Form, Input, InputNumber, Select, Switch, Button, Space } from 'antd';

interface AdSlotFormProps {
  slot?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AdSlotForm: React.FC<AdSlotFormProps> = ({ slot, onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (slot) {
      form.setFieldsValue(slot);
    } else {
      form.resetFields();
    }
  }, [slot, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="广告位名称" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="position" label="广告位置" rules={[{ required: true }]}>
        <Select options={[
          { value: 'header', label: '顶部' },
          { value: 'footer', label: '底部' },
          { value: 'sidebar', label: '侧边栏' },
          { value: 'inarticle', label: '文章内嵌' },
        ]} />
      </Form.Item>
      <Form.Item name="type" label="广告类型">
        <Select options={[
          { value: 'image', label: '图片' },
          { value: 'text', label: '文字' },
          { value: 'video', label: '视频' },
        ]} />
      </Form.Item>
      <Form.Item name="width" label="宽度">
        <InputNumber />
      </Form.Item>
      <Form.Item name="height" label="高度">
        <InputNumber />
      </Form.Item>
      <Form.Item name="adCode" label="广告代码">
        <Input.TextArea rows={4} />
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

export default AdSlotForm;
