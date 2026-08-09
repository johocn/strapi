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
  Collapse,
  Popconfirm,
  message,
  Row,
  Col,
  Divider,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { usePosterTemplates } from '../hooks/usePosterTemplates';
import { posterApi } from '../utils/posterApi';
import { PermissionGate } from '../components/PermissionGate';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ELEMENT_TYPE_OPTIONS = [
  { value: 'text', label: '文本' },
  { value: 'image', label: '图片' },
  { value: 'qrcode', label: '二维码' },
  { value: 'shape', label: '形状' },
  { value: 'background', label: '背景' },
];

const ELEMENT_TYPE_COLORS: Record<string, string> = {
  text: '#1890ff',
  image: '#52c41a',
  qrcode: '#722ed1',
  shape: '#fa8c16',
  background: '#13c2c2',
};

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: '常规' },
  { value: 'bold', label: '粗体' },
  { value: '300', label: '300' },
  { value: '500', label: '500' },
  { value: '700', label: '700' },
  { value: '900', label: '900' },
];

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
];

const IMAGE_FIT_OPTIONS = [
  { value: 'cover', label: '覆盖' },
  { value: 'contain', label: '包含' },
  { value: 'fill', label: '拉伸' },
  { value: 'none', label: '原始' },
  { value: 'scale-down', label: '缩小' },
];

const QR_CONTENT_MODE_OPTIONS = [
  { value: 'static', label: '静态内容' },
  { value: 'url', label: 'URL' },
  { value: 'invite', label: '邀请链接' },
];

const QR_FALLBACK_MODE_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'placeholder', label: '占位图' },
  { value: 'text', label: '文字' },
];

const QR_ERROR_LEVEL_OPTIONS = [
  { value: 'L', label: 'L (7%)' },
  { value: 'M', label: 'M (15%)' },
  { value: 'Q', label: 'Q (25%)' },
  { value: 'H', label: 'H (30%)' },
];

const SHAPE_TYPE_OPTIONS = [
  { value: 'rect', label: '矩形' },
  { value: 'circle', label: '圆形' },
  { value: 'line', label: '线条' },
  { value: 'triangle', label: '三角形' },
];

const BACKGROUND_MODE_OPTIONS = [
  { value: 'color', label: '纯色' },
  { value: 'image', label: '图片' },
  { value: 'gradient', label: '渐变' },
];

const MAX_PREVIEW_WIDTH = 400;

const createEmptyElement = (): any => ({
  elementType: 'text',
  elementKey: '',
  elementName: '',
  isVariable: false,
  variableName: '',
  defaultValue: '',
  content: '',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  zIndex: 0,
  rotation: 0,
  opacity: 1,
  fontSize: 14,
  fontColor: '#333333',
  fontWeight: 'normal',
  fontFamily: '',
  textAlign: 'left',
  lineHeight: 1.5,
  letterSpacing: 0,
  borderRadius: 0,
  borderWidth: 0,
  borderColor: '#000000',
  elementBgColor: '',
  imageFit: 'cover',
  qrContentMode: 'static',
  qrBaseUrl: '',
  qrInviteParam: '',
  qrInviteSeparator: '&',
  qrFallbackMode: 'none',
  qrErrorLevel: 'M',
  qrSize: 200,
  qrColor: '#000000',
  qrBgColor: '#ffffff',
  shapeType: 'rect',
});

const PosterTemplatePage: React.FC = () => {
  const { templates, loading, createTemplate, findOneTemplate, updateTemplate, deleteTemplate, cloneTemplate, batchSaveElements } =
    usePosterTemplates();

  const [viewMode, setViewMode] = React.useState<'list' | 'editor'>('list');
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [templateForm] = Form.useForm();
  const [elementForm] = Form.useForm();
  const [saving, setSaving] = React.useState(false);

  // Editor state
  const [currentTemplate, setCurrentTemplate] = React.useState<any>(null);
  const [elements, setElements] = React.useState<any[]>([]);
  const [currentElementIndex, setCurrentElementIndex] = React.useState<number>(-1);

  // --- List view handlers ---
  React.useEffect(() => {
    if (showModal) {
      if (editing) {
        templateForm.setFieldsValue(editing);
      } else {
        templateForm.resetFields();
        templateForm.setFieldsValue({
          canvasWidth: 750,
          canvasHeight: 1060,
          isActive: true,
          isDefault: false,
          backgroundMode: 'color',
          backgroundColor: '#ffffff',
        });
      }
    }
  }, [showModal, editing, templateForm]);

  const handleSaveTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      setSaving(true);
      if (editing) {
        await updateTemplate(editing.documentId || editing.id, values);
      } else {
        await createTemplate(values);
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

  const handleEnterEditor = async (record: any) => {
    try {
      const detail = await findOneTemplate(record.documentId || record.id);
      setCurrentTemplate(detail);
      const elementList = detail.elements || [];
      setElements(elementList);
      setCurrentElementIndex(elementList.length > 0 ? 0 : -1);
      if (elementList.length > 0) {
        elementForm.setFieldsValue(elementList[0]);
      } else {
        elementForm.resetFields();
      }
      setViewMode('editor');
    } catch (err: any) {
      message.error(err?.message || '加载模板详情失败');
    }
  };

  const handleClone = async (record: any) => {
    try {
      await cloneTemplate(record.documentId || record.id);
      message.success('克隆成功');
    } catch (err: any) {
      message.error(err?.message || '克隆失败');
    }
  };

  // --- Editor view handlers ---
  const handleSelectElement = (index: number) => {
    setCurrentElementIndex(index);
    if (index >= 0 && elements[index]) {
      elementForm.setFieldsValue(elements[index]);
    }
  };

  const handleAddElement = () => {
    const newElement = createEmptyElement();
    newElement.elementKey = `element_${Date.now()}`;
    newElement.elementName = `元素 ${elements.length + 1}`;
    const updated = [...elements, newElement];
    setElements(updated);
    setCurrentElementIndex(updated.length - 1);
    elementForm.setFieldsValue(newElement);
  };

  const handleDeleteElement = (index: number) => {
    const updated = elements.filter((_, i) => i !== index);
    setElements(updated);
    if (currentElementIndex >= updated.length) {
      setCurrentElementIndex(updated.length - 1);
    }
    if (updated.length > 0 && currentElementIndex === index) {
      const newIndex = Math.max(0, index - 1);
      setCurrentElementIndex(newIndex);
      elementForm.setFieldsValue(updated[newIndex]);
    } else if (updated.length === 0) {
      setCurrentElementIndex(-1);
      elementForm.resetFields();
    }
  };

  const handleElementFormChange = () => {
    if (currentElementIndex < 0) return;
    const values = elementForm.getFieldsValue();
    const updated = [...elements];
    updated[currentElementIndex] = { ...updated[currentElementIndex], ...values };
    setElements(updated);
  };

  const handleSaveAllElements = async () => {
    if (!currentTemplate) return;
    try {
      setSaving(true);
      await batchSaveElements(currentTemplate.documentId || currentTemplate.id, elements);
      message.success('元素保存成功');
    } catch (err: any) {
      message.error(err?.message || '保存元素失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplateProperties = async () => {
    if (!currentTemplate) return;
    try {
      const values = await templateForm.validateFields();
      setSaving(true);
      await updateTemplate(currentTemplate.documentId || currentTemplate.id, values);
      message.success('模板属性保存成功');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setCurrentTemplate(null);
    setElements([]);
    setCurrentElementIndex(-1);
  };

  // --- Editor initialization: set template form when entering editor ---
  React.useEffect(() => {
    if (viewMode === 'editor' && currentTemplate) {
      templateForm.setFieldsValue(currentTemplate);
    }
  }, [viewMode, currentTemplate, templateForm]);

  // --- List view columns ---
  const listColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '代码', dataIndex: 'code', key: 'code' },
    {
      title: '画布尺寸',
      key: 'canvas',
      render: (_: any, record: any) =>
        `${record.canvasWidth || '-'} x ${record.canvasHeight || '-'}`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (v: boolean) => (v ? <Tag color="blue">默认</Tag> : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" type="primary" onClick={() => handleEnterEditor(record)}>
            编辑
          </Button>
          <Button size="small" icon={<CopyOutlined />} onClick={() => handleClone(record)}>
            克隆
          </Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deleteTemplate(record.documentId || record.id);
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

  // --- Preview component ---
  const canvasWidth = currentTemplate?.canvasWidth || 750;
  const canvasHeight = currentTemplate?.canvasHeight || 1060;
  const previewScale = Math.min(MAX_PREVIEW_WIDTH / canvasWidth, 500 / canvasHeight, 1);

  const renderPreview = () => (
    <div
      style={{
        width: canvasWidth * previewScale,
        height: canvasHeight * previewScale,
        backgroundColor: currentTemplate?.backgroundColor || '#ffffff',
        backgroundImage: currentTemplate?.backgroundImage
          ? `url(${currentTemplate.backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        position: 'relative',
        border: '1px solid #d9d9d9',
        overflow: 'hidden',
      }}
    >
      {elements.map((el, index) => {
        const isSelected = index === currentElementIndex;
        return (
          <div
            key={index}
            onClick={() => handleSelectElement(index)}
            style={{
              position: 'absolute',
              left: (el.x || 0) * previewScale,
              top: (el.y || 0) * previewScale,
              width: (el.width || 50) * previewScale,
              height: (el.height || 30) * previewScale,
              zIndex: el.zIndex || 0,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              opacity: el.opacity != null ? el.opacity : 1,
              backgroundColor:
                el.elementBgColor ||
                (el.elementType === 'background' ? 'transparent' : ELEMENT_TYPE_COLORS[el.elementType] + '33'),
              border: isSelected
                ? '2px solid #1890ff'
                : `1px solid ${ELEMENT_TYPE_COLORS[el.elementType] || '#999'}`,
              borderRadius: (el.borderRadius || 0) * previewScale,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.max(8, (el.fontSize || 12) * previewScale),
              color: el.fontColor || '#333',
              fontWeight: el.fontWeight || 'normal',
              textAlign: el.textAlign || 'center',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              padding: '2px',
            }}
            title={el.elementName || el.elementKey}
          >
            {el.elementType === 'text' && (el.content || el.defaultValue || el.elementName)}
            {el.elementType === 'image' && 'IMG'}
            {el.elementType === 'qrcode' && 'QR'}
            {el.elementType === 'shape' && (el.shapeType === 'circle' ? 'O' : 'SHP')}
            {el.elementType === 'background' && 'BG'}
          </div>
        );
      })}
    </div>
  );

  // --- Element editor form ---
  const renderElementForm = () => {
    if (currentElementIndex < 0 || !elements[currentElementIndex]) {
      return <Empty description="请选择或添加元素" />;
    }
    const currentElementType = elements[currentElementIndex]?.elementType;

    return (
      <Form
        form={elementForm}
        layout="vertical"
        size="small"
        onValuesChange={handleElementFormChange}
      >
        <Collapse defaultActiveKey={['basic', 'position']} ghost>
          <Collapse.Panel header="基础信息" key="basic">
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="elementType" label="元素类型">
                  <Select options={ELEMENT_TYPE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="elementKey" label="元素Key">
                  <Input placeholder="唯一标识" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="elementName" label="元素名称">
                  <Input placeholder="显示名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="zIndex" label="层级">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="isVariable" label="是否变量" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="variableName" label="变量名">
                  <Input placeholder="变量名称" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="defaultValue" label="默认值">
              <Input placeholder="默认值" />
            </Form.Item>
            <Form.Item name="content" label="内容">
              <TextArea rows={2} placeholder="文本内容或图片URL" />
            </Form.Item>
          </Collapse.Panel>

          <Collapse.Panel header="位置与尺寸" key="position">
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="x" label="X坐标(px)">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="y" label="Y坐标(px)">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="width" label="宽度(px)">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="height" label="高度(px)">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="rotation" label="旋转角度">
                  <InputNumber min={-360} max={360} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="opacity" label="透明度(0-1)">
                  <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>

          {currentElementType === 'text' && (
            <Collapse.Panel header="文字样式" key="text">
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="fontSize" label="字号(px)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fontColor" label="字体颜色">
                    <Input placeholder="#333333" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="fontWeight" label="字重">
                    <Select options={FONT_WEIGHT_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fontFamily" label="字体">
                    <Input placeholder="如 Microsoft YaHei" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="textAlign" label="对齐方式">
                    <Select options={TEXT_ALIGN_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="lineHeight" label="行高">
                    <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="letterSpacing" label="字间距(px)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Collapse.Panel>
          )}

          <Collapse.Panel header="边框与背景" key="border">
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="borderRadius" label="圆角(px)">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="borderWidth" label="边框宽度(px)">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="borderColor" label="边框颜色">
                  <Input placeholder="#000000" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="elementBgColor" label="背景色">
                  <Input placeholder="如 #ffffff" />
                </Form.Item>
              </Col>
            </Row>
            {currentElementType === 'image' && (
              <Form.Item name="imageFit" label="图片适配">
                <Select options={IMAGE_FIT_OPTIONS} />
              </Form.Item>
            )}
          </Collapse.Panel>

          {currentElementType === 'qrcode' && (
            <Collapse.Panel header="二维码设置" key="qrcode">
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="qrContentMode" label="内容模式">
                    <Select options={QR_CONTENT_MODE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="qrErrorLevel" label="容错级别">
                    <Select options={QR_ERROR_LEVEL_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="qrBaseUrl" label="基础URL">
                <Input placeholder="https://..." />
              </Form.Item>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="qrInviteParam" label="邀请参数">
                    <Input placeholder="如 inviteCode" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="qrInviteSeparator" label="参数分隔符">
                    <Input placeholder="如 &" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="qrFallbackMode" label="降级模式">
                    <Select options={QR_FALLBACK_MODE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="qrSize" label="尺寸(px)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="qrColor" label="二维码颜色">
                    <Input placeholder="#000000" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="qrBgColor" label="背景色">
                    <Input placeholder="#ffffff" />
                  </Form.Item>
                </Col>
              </Row>
            </Collapse.Panel>
          )}

          {currentElementType === 'shape' && (
            <Collapse.Panel header="形状设置" key="shape">
              <Form.Item name="shapeType" label="形状类型">
                <Select options={SHAPE_TYPE_OPTIONS} />
              </Form.Item>
            </Collapse.Panel>
          )}
        </Collapse>
      </Form>
    );
  };

  // --- Render ---
  if (viewMode === 'editor' && currentTemplate) {
    return (
      <PermissionGate action="zhao-studio.poster-template.manage">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBackToList}>
                返回列表
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                编辑海报模板: {currentTemplate.name}
              </Title>
            </Space>
            <Space>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveTemplateProperties}>
                保存模板属性
              </Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveAllElements}>
                保存全部元素
              </Button>
            </Space>
          </div>

          <Row gutter={16}>
            {/* Left: Template properties + Preview */}
            <Col span={8}>
              <Card title="模板属性" size="small" style={{ marginBottom: 16 }}>
                <Form form={templateForm} layout="vertical" size="small">
                  <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="code" label="模板代码" rules={[{ required: true, message: '请输入模板代码' }]}>
                    <Input />
                  </Form.Item>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item name="canvasWidth" label="画布宽度(px)">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="canvasHeight" label="画布高度(px)">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="backgroundMode" label="背景模式">
                    <Select options={BACKGROUND_MODE_OPTIONS} />
                  </Form.Item>
                  <Form.Item name="backgroundColor" label="背景颜色">
                    <Input placeholder="#ffffff" />
                  </Form.Item>
                  <Form.Item name="backgroundImage" label="背景图片URL">
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item name="isActive" label="启用" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="isDefault" label="设为默认" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="description" label="描述">
                    <TextArea rows={2} />
                  </Form.Item>
                  <Form.Item name="requiredVariables" label="必需变量(JSON)">
                    <TextArea rows={2} placeholder='["title","avatar"]' />
                  </Form.Item>
                  <Form.Item name="optionalVariables" label="可选变量(JSON)">
                    <TextArea rows={2} placeholder='["subtitle","date"]' />
                  </Form.Item>
                </Form>
              </Card>

              <Card title="画布预览" size="small">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderPreview()}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  缩放比例: {Math.round(previewScale * 100)}% (实际: {canvasWidth}x{canvasHeight})
                </Text>
              </Card>
            </Col>

            {/* Right: Element list + Element editor */}
            <Col span={16}>
              <Card
                title="元素列表"
                size="small"
                style={{ marginBottom: 16 }}
                extra={
                  <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddElement}>
                    添加元素
                  </Button>
                }
              >
                <Table
                  size="small"
                  dataSource={elements.map((el, index) => ({ ...el, _index: index }))}
                  rowKey="_index"
                  pagination={false}
                  rowSelection={{
                    type: 'radio',
                    selectedRowKeys: currentElementIndex >= 0 ? [currentElementIndex] : [],
                    onChange: (keys) => handleSelectElement(keys[0] as number),
                  }}
                  columns={[
                    {
                      title: '名称',
                      dataIndex: 'elementName',
                      key: 'elementName',
                      render: (v: string, record: any) => v || record.elementKey || '-',
                    },
                    {
                      title: 'Key',
                      dataIndex: 'elementKey',
                      key: 'elementKey',
                    },
                    {
                      title: '类型',
                      dataIndex: 'elementType',
                      key: 'elementType',
                      render: (v: string) => {
                        const opt = ELEMENT_TYPE_OPTIONS.find((o) => o.value === v);
                        return (
                          <Tag color={ELEMENT_TYPE_COLORS[v] || 'default'}>
                            {opt?.label || v}
                          </Tag>
                        );
                      },
                    },
                    {
                      title: '位置',
                      key: 'pos',
                      render: (_: any, record: any) => `${record.x},${record.y}`,
                    },
                    {
                      title: '尺寸',
                      key: 'size',
                      render: (_: any, record: any) => `${record.width}x${record.height}`,
                    },
                    {
                      title: '操作',
                      key: 'action',
                      width: 80,
                      render: (_: any, record: any) => (
                        <Popconfirm
                          title="确认删除该元素?"
                          onConfirm={() => handleDeleteElement(record._index)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </Card>

              <Card
                title={
                  currentElementIndex >= 0
                    ? `编辑元素: ${elements[currentElementIndex]?.elementName || elements[currentElementIndex]?.elementKey || ''}`
                    : '元素编辑'
                }
                size="small"
              >
                {renderElementForm()}
              </Card>
            </Col>
          </Row>
        </Space>
      </PermissionGate>
    );
  }

  // --- List view ---
  return (
    <PermissionGate action="zhao-studio.poster-template.manage">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>海报模板管理</Title>
          <Text type="secondary">管理海报模板及元素坐标配置</Text>
        </div>
        <Card
          title="模板列表"
          extra={
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setShowModal(true);
              }}
            >
              新增模板
            </Button>
          }
        >
          <Table
            columns={listColumns}
            dataSource={templates}
            rowKey={(r) => r.documentId || r.id}
            loading={loading}
          />
        </Card>

        <Modal
          open={showModal}
          title={editing ? '编辑模板' : '新增模板'}
          onCancel={() => setShowModal(false)}
          onOk={handleSaveTemplate}
          confirmLoading={saving}
          destroyOnClose
          width={640}
        >
          <Form form={templateForm} layout="vertical">
            <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
              <Input placeholder="请输入模板名称" />
            </Form.Item>
            <Form.Item name="code" label="模板代码" rules={[{ required: true, message: '请输入模板代码' }]}>
              <Input placeholder="唯一标识" />
            </Form.Item>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="canvasWidth" label="画布宽度(px)" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="canvasHeight" label="画布高度(px)" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="backgroundMode" label="背景模式">
              <Select options={BACKGROUND_MODE_OPTIONS} />
            </Form.Item>
            <Form.Item name="backgroundColor" label="背景颜色">
              <Input placeholder="#ffffff" />
            </Form.Item>
            <Form.Item name="backgroundImage" label="背景图片URL">
              <Input placeholder="https://..." />
            </Form.Item>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="isDefault" label="设为默认" valuePropName="checked" initialValue={false}>
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="描述">
              <TextArea rows={2} placeholder="模板描述" />
            </Form.Item>
            <Form.Item name="requiredVariables" label="必需变量(JSON)">
              <TextArea rows={2} placeholder='["title","avatar"]' />
            </Form.Item>
            <Form.Item name="optionalVariables" label="可选变量(JSON)">
              <TextArea rows={2} placeholder='["subtitle","date"]' />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </PermissionGate>
  );
};

export default PosterTemplatePage;
