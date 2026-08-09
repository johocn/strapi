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
  DatePicker,
  Tabs,
  Popconfirm,
  message,
} from 'antd';
import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { PlusOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { useAdZones } from '../hooks/useAdZones';
import { useAdContents } from '../hooks/useAdContents';
import { PermissionGate } from '../components/PermissionGate';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CONTENT_TYPE_OPTIONS = [
  { value: 'single-image', label: '单图' },
  { value: 'multi-image', label: '多图' },
  { value: 'slideshow', label: '幻灯片' },
  { value: 'video', label: '视频' },
  { value: 'html', label: 'HTML' },
];

const CONTENT_TYPE_LABELS: Record<string, string> = CONTENT_TYPE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<string, string>
);

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: '常规' },
  { value: 'bold', label: '粗体' },
  { value: '300', label: '细体 300' },
  { value: '500', label: '中等 500' },
  { value: '700', label: '加粗 700' },
];

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
];

const OVERFLOW_OPTIONS = [
  { value: 'hidden', label: '隐藏' },
  { value: 'ellipsis', label: '省略号' },
  { value: 'visible', label: '可见' },
  { value: 'clip', label: '裁剪' },
];

const POSITION_OPTIONS = [
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
  { value: 'top-center', label: '顶部居中' },
  { value: 'bottom-center', label: '底部居中' },
];

const LINK_TYPE_OPTIONS = [
  { value: 'none', label: '无链接' },
  { value: 'internal', label: '内部链接' },
  { value: 'external', label: '外部链接' },
];

const LINK_TARGET_OPTIONS = [
  { value: '_self', label: '当前窗口' },
  { value: '_blank', label: '新窗口' },
];

const SLIDESHOW_EFFECT_OPTIONS = [
  { value: 'fade', label: '淡入淡出' },
  { value: 'slide', label: '滑动' },
  { value: 'zoom', label: '缩放' },
  { value: 'flip', label: '翻转' },
];

const AdContentPage: React.FC = () => {
  const { zones } = useAdZones();
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | undefined>(undefined);
  const { contents, loading, createContent, updateContent, deleteContent, fetchContents } =
    useAdContents({ adZoneId: selectedZoneId });

  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('basic');
  const [showMediaLib, setShowMediaLib] = React.useState(false);
  const [mediaLibTargetIndex, setMediaLibTargetIndex] = React.useState<number | null>(null);
  const [imageList, setImageList] = React.useState<Array<{url: string; title?: string; subtitle?: string; linkUrl?: string}>>([]);

  const components = useStrapiApp('AdContentPage', (state) => state.components);
  const MediaLibraryDialog = components?.['media-library'] as React.ComponentType<any> | undefined;

  const contentType = Form.useWatch('contentType', form);

  React.useEffect(() => {
    if (showModal) {
      if (editing) {
        form.setFieldsValue(editing);
        // 转换 images 到 imageList（兼容旧格式 string[]）
        const rawImages = editing.images || [];
        const normalized = rawImages.map((img: any) => 
          typeof img === 'string' ? { url: img } : img
        );
        setImageList(normalized);
      } else {
        form.resetFields();
        form.setFieldsValue({
          isActive: true,
          sortOrder: 0,
          priority: 0,
          contentType: 'single-image',
          linkType: 'none',
          linkTarget: '_blank',
          videoAutoplay: false,
          videoMuted: true,
          videoLoop: false,
          videoControls: true,
          slideshowAutoplay: true,
          slideshowInterval: 3,
          slideshowEffect: 'fade',
          slideshowLoop: true,
          slideshowShowDots: true,
          slideshowShowArrows: true,
          slideshowPauseOnHover: true,
          showCountdown: false,
        });
        setImageList([]);
      }
      setActiveTab('basic');
    }
  }, [showModal, editing, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // 处理图片素材：使用 imageList 状态中的对象数组
      const submitData = { ...values };
      if (['single-image', 'multi-image', 'slideshow'].includes(values.contentType)) {
        // 过滤掉没有URL的图片项
        submitData.images = imageList.filter(img => img.url);
        delete submitData.imagesRaw;
      }
      // 处理日期
      if (values.startAt) {
        submitData.startAt = values.startAt.toISOString ? values.startAt.toISOString() : values.startAt;
      }
      if (values.endAt) {
        submitData.endAt = values.endAt.toISOString ? values.endAt.toISOString() : values.endAt;
      }

      setSaving(true);
      if (editing) {
        await updateContent(editing.documentId || editing.id, submitData);
      } else {
        await createContent(submitData);
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
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      render: (v: string) => CONTENT_TYPE_LABELS[v] || v,
    },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    { title: '优先级', dataIndex: 'priority', key: 'priority' },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
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
                await deleteContent(record.documentId || record.id);
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
    <PermissionGate action="zhao-studio.ad-content.manage">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>广告内容管理</Title>
          <Text type="secondary">管理广告内容素材及展示样式</Text>
        </div>
        <Card
          title="广告内容列表"
          extra={
            <Space>
              <Select
                placeholder="筛选广告区域"
                allowClear
                style={{ width: 200 }}
                value={selectedZoneId}
                onChange={(v) => {
                  setSelectedZoneId(v);
                }}
              >
                {zones.map((z) => (
                  <Select.Option key={z.documentId || z.id} value={z.documentId || z.id}>
                    {z.name}
                  </Select.Option>
                ))}
              </Select>
              <Button onClick={() => fetchContents()}>刷新</Button>
              <Button
                type="primary"
                onClick={() => {
                  setEditing(null);
                  setShowModal(true);
                }}
              >
                新增广告内容
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={contents}
            rowKey={(r) => r.documentId || r.id}
            loading={loading}
          />
        </Card>

        <Modal
          open={showModal}
          title={editing ? '编辑广告内容' : '新增广告内容'}
          onCancel={() => setShowModal(false)}
          onOk={handleSave}
          confirmLoading={saving}
          destroyOnClose
          width={800}
        >
          <Form form={form} layout="vertical">
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              {/* Tab 1: 基本信息 */}
              <Tabs.TabPane tab="基本信息" key="basic">
                <Form.Item name="name" label="内容名称" rules={[{ required: true, message: '请输入内容名称' }]}>
                  <Input placeholder="请输入内容名称" />
                </Form.Item>
                <Form.Item name="adZone" label="所属广告区域" rules={[{ required: true, message: '请选择广告区域' }]}>
                  <Select placeholder="请选择广告区域">
                    {zones.map((z) => (
                      <Select.Option key={z.documentId || z.id} value={z.documentId || z.id}>
                        {z.name} ({z.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="contentType" label="内容类型" rules={[{ required: true, message: '请选择内容类型' }]}>
                  <Select options={CONTENT_TYPE_OPTIONS} placeholder="请选择内容类型" />
                </Form.Item>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="sortOrder" label="排序" initialValue={0}>
                    <InputNumber min={0} />
                  </Form.Item>
                  <Form.Item name="priority" label="优先级" initialValue={0}>
                    <InputNumber min={0} />
                  </Form.Item>
                  <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
                    <Switch />
                  </Form.Item>
                </Space>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="startAt" label="开始时间">
                    <DatePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="endAt" label="结束时间">
                    <DatePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                </Space>
              </Tabs.TabPane>

              {/* Tab 2: 标题样式 */}
              <Tabs.TabPane tab="标题样式" key="title">
                <Form.Item name="title" label="主标题">
                  <Input placeholder="主标题文本" />
                </Form.Item>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="titleColor" label="标题颜色">
                    <Input placeholder="如 #333333" />
                  </Form.Item>
                  <Form.Item name="titleFontSize" label="字号(px)">
                    <InputNumber min={0} placeholder="如 18" />
                  </Form.Item>
                  <Form.Item name="titleFontWeight" label="字重">
                    <Select options={FONT_WEIGHT_OPTIONS} allowClear placeholder="选择字重" />
                  </Form.Item>
                </Space>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="titleAlign" label="对齐方式">
                    <Select options={TEXT_ALIGN_OPTIONS} allowClear placeholder="选择对齐" />
                  </Form.Item>
                  <Form.Item name="titleOverflow" label="溢出处理">
                    <Select options={OVERFLOW_OPTIONS} allowClear placeholder="选择溢出处理" />
                  </Form.Item>
                  <Form.Item name="titleMaxLines" label="最大行数">
                    <InputNumber min={0} placeholder="如 2" />
                  </Form.Item>
                  <Form.Item name="titleLineHeight" label="行高">
                    <InputNumber min={0} step={0.1} placeholder="如 1.5" />
                  </Form.Item>
                </Space>
                <Form.Item name="subtitle" label="副标题">
                  <Input placeholder="副标题文本" />
                </Form.Item>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="subtitleColor" label="副标题颜色">
                    <Input placeholder="如 #666666" />
                  </Form.Item>
                  <Form.Item name="subtitleFontSize" label="副标题字号(px)">
                    <InputNumber min={0} placeholder="如 14" />
                  </Form.Item>
                </Space>
              </Tabs.TabPane>

              {/* Tab 3: 按钮/标签 */}
              <Tabs.TabPane tab="按钮/标签" key="cta">
                <Form.Item name="ctaText" label="按钮文字">
                  <Input placeholder="如 立即购买" />
                </Form.Item>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="ctaTextColor" label="按钮文字颜色">
                    <Input placeholder="如 #ffffff" />
                  </Form.Item>
                  <Form.Item name="ctaBgColor" label="按钮背景色">
                    <Input placeholder="如 #ff4d4f" />
                  </Form.Item>
                  <Form.Item name="ctaFontSize" label="按钮字号(px)">
                    <InputNumber min={0} placeholder="如 14" />
                  </Form.Item>
                  <Form.Item name="ctaPosition" label="按钮位置">
                    <Select options={POSITION_OPTIONS} allowClear placeholder="选择位置" />
                  </Form.Item>
                </Space>
                <Form.Item name="badgeText" label="标签文字">
                  <Input placeholder="如 热门" />
                </Form.Item>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="badgeBgColor" label="标签背景色">
                    <Input placeholder="如 #fa8c16" />
                  </Form.Item>
                  <Form.Item name="badgeTextColor" label="标签文字颜色">
                    <Input placeholder="如 #ffffff" />
                  </Form.Item>
                  <Form.Item name="badgePosition" label="标签位置">
                    <Select options={POSITION_OPTIONS} allowClear placeholder="选择位置" />
                  </Form.Item>
                </Space>
              </Tabs.TabPane>

              {/* Tab 4: 素材 */}
              <Tabs.TabPane tab="素材" key="media">
                {['single-image', 'multi-image', 'slideshow'].includes(contentType) && (
                  <div>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>图片列表（{imageList.length}）</Text>
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setImageList([...imageList, { url: '' }]);
                          setMediaLibTargetIndex(imageList.length);
                          setShowMediaLib(true);
                        }}
                      >
                        添加图片
                      </Button>
                    </div>
                    {imageList.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#999', border: '1px dashed #d9d9d9', borderRadius: 8 }}>
                        <PictureOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                        <div>点击"添加图片"选择媒体库中的图片</div>
                      </div>
                    )}
                    {imageList.map((img, imgIdx) => (
                      <Card
                        key={imgIdx}
                        size="small"
                        style={{ marginBottom: 12 }}
                        title={`图片 ${imgIdx + 1}`}
                        extra={
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              const next = imageList.filter((_, i) => i !== imgIdx);
                              setImageList(next);
                            }}
                          />
                        }
                      >
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            {img.url ? (
                              <img
                                src={img.url.startsWith('http') ? img.url : `${window.location.origin}${img.url}`}
                                alt={img.title || ''}
                                style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
                              />
                            ) : (
                              <div style={{ width: 80, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 4, border: '1px dashed #d9d9d9' }}>
                                <PictureOutlined style={{ color: '#ccc' }} />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <Input
                                size="small"
                                placeholder="图片URL（可手动输入或点击右侧按钮选择）"
                                value={img.url}
                                onChange={(e) => {
                                  const next = [...imageList];
                                  next[imgIdx] = { ...next[imgIdx], url: e.target.value };
                                  setImageList(next);
                                }}
                              />
                              <Button
                                type="link"
                                size="small"
                                icon={<PictureOutlined />}
                                style={{ padding: '4px 0' }}
                                onClick={() => {
                                  setMediaLibTargetIndex(imgIdx);
                                  setShowMediaLib(true);
                                }}
                              >
                                从媒体库选择
                              </Button>
                            </div>
                          </div>
                          <Input
                            size="small"
                            addonBefore="标题"
                            placeholder="该图片的标题（可选，留空则使用全局标题）"
                            value={img.title || ''}
                            onChange={(e) => {
                              const next = [...imageList];
                              next[imgIdx] = { ...next[imgIdx], title: e.target.value };
                              setImageList(next);
                            }}
                          />
                          <Input
                            size="small"
                            addonBefore="描述"
                            placeholder="该图片的描述文字（可选）"
                            value={img.subtitle || ''}
                            onChange={(e) => {
                              const next = [...imageList];
                              next[imgIdx] = { ...next[imgIdx], subtitle: e.target.value };
                              setImageList(next);
                            }}
                          />
                          <Input
                            size="small"
                            addonBefore="链接"
                            placeholder="点击该图片跳转的链接（可选，留空则使用全局链接）"
                            value={img.linkUrl || ''}
                            onChange={(e) => {
                              const next = [...imageList];
                              next[imgIdx] = { ...next[imgIdx], linkUrl: e.target.value };
                              setImageList(next);
                            }}
                          />
                        </Space>
                      </Card>
                    ))}
                  </div>
                )}
                {contentType === 'video' && (
                  <>
                    <Form.Item name="videoUrl" label="视频URL">
                      <Input placeholder="视频播放地址" />
                    </Form.Item>
                    <Form.Item name="videoPoster" label="视频封面">
                      <Input placeholder="封面图URL" />
                    </Form.Item>
                    <Space style={{ display: 'flex' }}>
                      <Form.Item name="videoAutoplay" label="自动播放" valuePropName="checked" initialValue={false}>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="videoMuted" label="静音" valuePropName="checked" initialValue={true}>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="videoLoop" label="循环播放" valuePropName="checked" initialValue={false}>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="videoControls" label="显示控制条" valuePropName="checked" initialValue={true}>
                        <Switch />
                      </Form.Item>
                    </Space>
                  </>
                )}
                {contentType === 'html' && (
                  <Form.Item name="htmlContent" label="HTML内容">
                    <TextArea rows={8} placeholder="自定义HTML代码" />
                  </Form.Item>
                )}
                {!contentType && (
                  <Text type="secondary">请先在"基本信息"中选择内容类型</Text>
                )}
              </Tabs.TabPane>

              {/* Tab 5: 链接 */}
              <Tabs.TabPane tab="链接" key="link">
                <Form.Item name="linkType" label="链接类型" initialValue="none">
                  <Select options={LINK_TYPE_OPTIONS} />
                </Form.Item>
                <Form.Item name="linkUrl" label="链接地址">
                  <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item name="linkTarget" label="打开方式" initialValue="_blank">
                  <Select options={LINK_TARGET_OPTIONS} />
                </Form.Item>
              </Tabs.TabPane>

              {/* Tab 6: 展示 */}
              <Tabs.TabPane tab="展示" key="display">
                <Form.Item name="displayStyle" label="展示样式">
                  <Input placeholder="如 block / inline-block / flex" />
                </Form.Item>
                <Space style={{ display: 'flex' }}>
                  <Form.Item name="width" label="宽度(px)">
                    <InputNumber min={0} placeholder="如 750" />
                  </Form.Item>
                  <Form.Item name="height" label="高度(px)">
                    <InputNumber min={0} placeholder="如 300" />
                  </Form.Item>
                  <Form.Item name="borderRadius" label="圆角(px)">
                    <InputNumber min={0} placeholder="如 8" />
                  </Form.Item>
                </Space>
                <Form.Item name="backgroundColor" label="背景色">
                  <Input placeholder="如 #ffffff" />
                </Form.Item>

                <Text strong>幻灯片设置</Text>
                <div style={{ marginTop: 12 }}>
                  <Space style={{ display: 'flex' }}>
                    <Form.Item name="slideshowAutoplay" label="自动播放" valuePropName="checked" initialValue={true}>
                      <Switch />
                    </Form.Item>
                    <Form.Item name="slideshowInterval" label="间隔(秒)" initialValue={3}>
                      <InputNumber min={1} />
                    </Form.Item>
                    <Form.Item name="slideshowEffect" label="切换效果" initialValue="fade">
                      <Select options={SLIDESHOW_EFFECT_OPTIONS} />
                    </Form.Item>
                    <Form.Item name="slideshowLoop" label="循环" valuePropName="checked" initialValue={true}>
                      <Switch />
                    </Form.Item>
                  </Space>
                  <Space style={{ display: 'flex' }}>
                    <Form.Item name="slideshowShowDots" label="显示圆点" valuePropName="checked" initialValue={true}>
                      <Switch />
                    </Form.Item>
                    <Form.Item name="slideshowShowArrows" label="显示箭头" valuePropName="checked" initialValue={true}>
                      <Switch />
                    </Form.Item>
                    <Form.Item name="slideshowPauseOnHover" label="悬停暂停" valuePropName="checked" initialValue={true}>
                      <Switch />
                    </Form.Item>
                  </Space>
                </div>

                <Text strong>其他设置</Text>
                <div style={{ marginTop: 12 }}>
                  <Space style={{ display: 'flex' }}>
                    <Form.Item name="closeDelay" label="关闭延迟(ms)">
                      <InputNumber min={0} placeholder="如 5000" />
                    </Form.Item>
                    <Form.Item name="showCountdown" label="显示倒计时" valuePropName="checked" initialValue={false}>
                      <Switch />
                    </Form.Item>
                  </Space>
                </div>
              </Tabs.TabPane>
            </Tabs>
          </Form>
        </Modal>
        {showMediaLib && MediaLibraryDialog && (
          <MediaLibraryDialog
            allowedTypes={['images']}
            multiple={false}
            onClose={() => {
              setShowMediaLib(false);
              setMediaLibTargetIndex(null);
            }}
            onSelectAssets={(assets: any) => {
              if (mediaLibTargetIndex !== null && assets.length > 0) {
                const asset = assets[0];
                const next = [...imageList];
                next[mediaLibTargetIndex] = {
                  ...next[mediaLibTargetIndex],
                  url: asset.url,
                };
                setImageList(next);
              }
              setShowMediaLib(false);
              setMediaLibTargetIndex(null);
            }}
          />
        )}
      </Space>
    </PermissionGate>
  );
};

export default AdContentPage;
