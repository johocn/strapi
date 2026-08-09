import React from 'react';
import {
  Card,
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Popconfirm,
  message,
} from 'antd';
import { useAdZones } from '../hooks/useAdZones';
import { PermissionGate } from '../components/PermissionGate';

const { Title, Text } = Typography;

const POSITION_OPTIONS = [
  { value: 'home-banner', label: '首页Banner' },
  { value: 'home-sidebar', label: '首页侧边栏' },
  { value: 'list-top', label: '列表顶部' },
  { value: 'article-top', label: '文章顶部' },
  { value: 'article-bottom', label: '文章底部' },
  { value: 'article-inline', label: '文章内嵌' },
  { value: 'footer', label: '页脚' },
  { value: 'popup', label: '弹窗' },
  { value: 'float', label: '浮动' },
  { value: 'custom', label: '自定义' },
];

const POSITION_LABELS: Record<string, string> = POSITION_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<string, string>
);

const DISPLAY_MODE_OPTIONS = [
  { value: 'single', label: '单图' },
  { value: 'rotation', label: '轮播' },
  { value: 'slideshow', label: '幻灯片' },
  { value: 'stack', label: '堆叠' },
];

const DISPLAY_MODE_LABELS: Record<string, string> = DISPLAY_MODE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<string, string>
);

const AdZonePage: React.FC = () => {
  const { zones, loading, createZone, updateZone, deleteZone } = useAdZones();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (showModal) {
      if (editing) {
        form.setFieldsValue(editing);
      } else {
        form.resetFields();
        form.setFieldsValue({ isActive: true, sortOrder: 0 });
      }
    }
  }, [showModal, editing, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await updateZone(editing.documentId || editing.id, values);
      } else {
        await createZone(values);
      }
      message.success('保存成功');
      setShowModal(false);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '代码', dataIndex: 'code', key: 'code' },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      render: (v: string) => POSITION_LABELS[v] || v,
    },
    {
      title: '展示模式',
      dataIndex: 'displayMode',
      key: 'displayMode',
      render: (v: string) => DISPLAY_MODE_LABELS[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              setShowModal(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deleteZone(record.documentId || record.id);
                message.success('删除成功');
              } catch {
                message.error('删除失败');
              }
            }}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PermissionGate action="zhao-studio.ad-zone.manage">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>广告区域管理</Title>
          <Text type="secondary">管理广告投放区域及展示配置</Text>
        </div>
        <Card
          title="广告区域列表"
          extra={
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setShowModal(true);
              }}
            >
              新增广告区域
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={zones}
            rowKey={(r) => r.documentId || r.id}
            loading={loading}
          />
        </Card>
        <Modal
          open={showModal}
          title={editing ? '编辑广告区域' : '新增广告区域'}
          onCancel={() => setShowModal(false)}
          onOk={handleSave}
          confirmLoading={saving}
          destroyOnClose
          width={640}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="区域名称" rules={[{ required: true, message: '请输入区域名称' }]}>
              <Input placeholder="请输入区域名称" />
            </Form.Item>
            <Form.Item name="code" label="区域代码" rules={[{ required: true, message: '请输入区域代码' }]}>
              <Input placeholder="唯一标识，如 home-banner-1" />
            </Form.Item>
            <Form.Item name="position" label="位置" rules={[{ required: true, message: '请选择位置' }]}>
              <Select options={POSITION_OPTIONS} placeholder="请选择位置" />
            </Form.Item>
            <Form.Item name="displayMode" label="展示模式" rules={[{ required: true, message: '请选择展示模式' }]}>
              <Select options={DISPLAY_MODE_OPTIONS} placeholder="请选择展示模式" />
            </Form.Item>
            <Space style={{ display: 'flex' }}>
              <Form.Item name="suggestedWidth" label="建议宽度(px)">
                <InputNumber min={0} placeholder="如 750" />
              </Form.Item>
              <Form.Item name="suggestedHeight" label="建议高度(px)">
                <InputNumber min={0} placeholder="如 300" />
              </Form.Item>
              <Form.Item name="sortOrder" label="排序" initialValue={0}>
                <InputNumber min={0} />
              </Form.Item>
            </Space>
            <Form.Item name="adSlotCode" label="关联广告位代码">
              <Input placeholder="可选，关联已有广告位" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} placeholder="区域描述说明" />
            </Form.Item>
            <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </PermissionGate>
  );
};

export default AdZonePage;
