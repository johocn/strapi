import React, { useState } from 'react';
import { Card, Form, Select, Radio, Button, Typography, message, Alert } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { postJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const { Title, Paragraph } = Typography;

const StudioBridgePage = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await postJSON(API.studioBridgePublish, {
        draftDocumentId: values.draftDocumentId,
        siteId: values.siteId,
        status: values.status,
      });
      setResult(res);
      message.success('发布成功');
    } catch (err) {
      message.error(`发布失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Title level={3}><RocketOutlined /> 从 Studio 一键发布到官网</Title>
      <Paragraph type="secondary">
        将 zhao-studio 的草稿文章发布到 zhao-website，自动同步标题、内容、标签、SEO 字段。
      </Paragraph>

      <Alert
        type="info"
        showIcon
        message="草稿 documentId 与站点 ID 请从 zhao-studio 草稿列表和站点配置中获取后填入"
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ status: 'published' }}
        style={{ maxWidth: 500 }}
      >
        <Form.Item
          name="draftDocumentId"
          label="草稿 Document ID"
          rules={[{ required: true, message: '请输入草稿 documentId' }]}
        >
          <Select
            mode="tags"
            maxCount={1}
            placeholder="输入 zhao-studio 草稿的 documentId"
          />
        </Form.Item>

        <Form.Item
          name="siteId"
          label="目标站点 ID"
          rules={[{ required: true, message: '请输入站点 ID' }]}
        >
          <Select
            mode="tags"
            maxCount={1}
            placeholder="输入目标 site-config 的 ID"
          />
        </Form.Item>

        <Form.Item name="status" label="发布状态">
          <Radio.Group>
            <Radio value="published">立即发布</Radio>
            <Radio value="draft">存为草稿</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<RocketOutlined />}>
            一键发布
          </Button>
        </Form.Item>
      </Form>

      {result && (
        <Alert
          type="success"
          showIcon
          message="发布结果"
          description={<pre style={{ margin: 0 }}>{JSON.stringify(result, null, 2)}</pre>}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default StudioBridgePage;
