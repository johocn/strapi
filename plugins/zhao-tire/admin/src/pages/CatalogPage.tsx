import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { errorMessage, useTireApi } from "../utils/api";
import {
  centsToYuan,
  linesToArray,
  money,
  yuanToCents,
} from "../utils/constants";

const { Text } = Typography;

type CatalogType = "packages" | "addons";
type TabKey = "packages" | "addons" | "referral";

const CatalogPage = () => {
  const api = useTireApi();
  const [tab, setTab] = useState<TabKey>("packages");

  // 套餐/增值项
  const [packages, setPackages] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [configDraft, setConfigDraft] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // 邀请码
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralSearch, setReferralSearch] = useState("");
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantTarget, setGrantTarget] = useState<any>(null);
  const [grantCount, setGrantCount] = useState(1);
  const [granting, setGranting] = useState(false);

  const [modalType, setModalType] = useState<CatalogType | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [packageList, addonList, siteConfig] = await Promise.all([
        api.listCollection("packages"),
        api.listCollection("addons"),
        api.getConfig(),
      ]);
      setPackages(Array.isArray(packageList) ? packageList : []);
      setAddons(Array.isArray(addonList) ? addonList : []);
      setConfig(siteConfig || {});
      setConfigDraft(siteConfig || {});
    } catch (error) {
      message.error(`加载套餐配置失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadReferrals = async () => {
    setReferralLoading(true);
    try {
      const params: Record<string, any> = { pageSize: 200 };
      if (referralSearch.trim()) {
        const kw = referralSearch.trim();
        // 根据是否纯数字判断按手机号还是按 code 搜索
        if (/^\d+$/.test(kw)) {
          params.phone = kw;
        } else {
          params.code = kw.toUpperCase();
        }
      }
      const result = await api.listReferralCodes(params);
      setReferrals(Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []);
    } catch (error) {
      message.error(`加载邀请码失败：${errorMessage(error)}`);
    } finally {
      setReferralLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (tab === "referral") loadReferrals();
  }, [tab]);

  const openCreate = (type: CatalogType) => {
    setEditing(null);
    setModalType(type);
    form.resetFields();
    if (type === "packages") {
      form.setFieldsValue({
        baseMonths: 6,
        storePrice: 0,
        pickupPrice: 0,
        extraMonthPrice: 0,
        overdueDayPrice: 0,
        enabled: true,
        sort: 0,
        highlightsText: "",
      });
    } else {
      form.setFieldsValue({ price: 0, enabled: true, sort: 0 });
    }
  };

  const openEdit = (type: CatalogType, record: any) => {
    setEditing(record);
    setModalType(type);
    if (type === "packages") {
      form.setFieldsValue({
        ...record,
        storePrice: centsToYuan(record.storePrice),
        pickupPrice: centsToYuan(record.pickupPrice),
        extraMonthPrice: centsToYuan(record.extraMonthPrice),
        overdueDayPrice: centsToYuan(record.overdueDayPrice),
        highlightsText: Array.isArray(record.highlights)
          ? record.highlights.join("\n")
          : "",
      });
    } else {
      form.setFieldsValue({
        ...record,
        price: centsToYuan(record.price),
      });
    }
  };

  const saveCatalog = async () => {
    if (!modalType) return;
    const values: any = await form.validateFields();
    setSaving(true);
    try {
      let payload: any;
      if (modalType === "packages") {
        payload = {
          name: values.name,
          code: values.code,
          baseMonths: Number(values.baseMonths) || 0,
          storePrice: yuanToCents(values.storePrice),
          pickupPrice: yuanToCents(values.pickupPrice),
          extraMonthPrice: yuanToCents(values.extraMonthPrice),
          overdueDayPrice: yuanToCents(values.overdueDayPrice),
          durationText: values.durationText || "",
          highlights: linesToArray(values.highlightsText || ""),
          enabled: Boolean(values.enabled),
          sort: Number(values.sort) || 0,
        };
      } else {
        payload = {
          name: values.name,
          code: values.code,
          price: yuanToCents(values.price),
          unitText: values.unitText || "",
          enabled: Boolean(values.enabled),
          sort: Number(values.sort) || 0,
        };
      }
      if (editing) {
        await api.updateCollection(modalType, Number(editing.id), payload);
        message.success("已保存");
      } else {
        await api.createCollection(modalType, payload);
        message.success("已新增");
      }
      setModalType(null);
      setEditing(null);
      await loadAll();
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const removeCatalog = async (type: CatalogType, record: any) => {
    try {
      await api.removeCollection(type, Number(record.id));
      message.success("已删除");
      await loadAll();
    } catch (error) {
      message.error(`删除失败：${errorMessage(error)}`);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const updated = await api.updateConfig({
        paymentOnlineEnabled: Boolean(configDraft.paymentOnlineEnabled),
        depositEnabled: Boolean(configDraft.depositEnabled),
        depositRatio: Number(configDraft.depositRatio) || 0,
      });
      setConfig(updated || configDraft);
      setConfigDraft(updated || configDraft);
      message.success("支付配置已保存");
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // 邀请码相关方法
  const openGrantModal = (record: any) => {
    setGrantTarget(record);
    setGrantCount(1);
    setGrantModalOpen(true);
  };

  const handleGrantFree = async () => {
    if (!grantTarget) return;
    setGranting(true);
    try {
      await api.grantFreeToReferral(Number(grantTarget.id), grantCount);
      message.success(`已为 ${grantTarget.nickname || grantTarget.phone} 发放 ${grantCount} 次免单额度`);
      setGrantModalOpen(false);
      setGrantTarget(null);
      await loadReferrals();
    } catch (error) {
      message.error(`发放失败：${errorMessage(error)}`);
    } finally {
      setGranting(false);
    }
  };

  const packageColumns = [
    { title: "名称", dataIndex: "name", width: 160 },
    {
      title: "标识",
      dataIndex: "code",
      width: 130,
      render: (value: string) => <Text code>{value}</Text>,
    },
    {
      title: "基础月数",
      dataIndex: "baseMonths",
      width: 90,
      render: (value: number) => `${value || 0} 个月`,
    },
    {
      title: "到店价",
      dataIndex: "storePrice",
      width: 100,
      align: "right" as const,
      render: (value: number) => money(value),
    },
    {
      title: "上门价",
      dataIndex: "pickupPrice",
      width: 100,
      align: "right" as const,
      render: (value: number) => money(value),
    },
    {
      title: "超月单价",
      dataIndex: "extraMonthPrice",
      width: 110,
      align: "right" as const,
      render: (value: number) => money(value),
    },
    {
      title: "超期日价",
      dataIndex: "overdueDayPrice",
      width: 110,
      align: "right" as const,
      render: (value: number) => money(value),
    },
    {
      title: "时长文案",
      dataIndex: "durationText",
      width: 130,
      render: (value: string) => value || "-",
    },
    {
      title: "亮点",
      dataIndex: "highlights",
      width: 220,
      render: (value: any) =>
        Array.isArray(value) && value.length > 0 ? value.join("、") : "-",
    },
    {
      title: "排序",
      dataIndex: "sort",
      width: 80,
    },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 80,
      render: (value: boolean) =>
        value ? <Text type="success">启用</Text> : <Text type="secondary">停用</Text>,
    },
    {
      title: "操作",
      width: 140,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" type="link" onClick={() => openEdit("packages", record)}>
            编辑
          </Button>
          <Popconfirm
            title="删除该套餐？"
            onConfirm={() => removeCatalog("packages", record)}
          >
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const addonColumns = [
    { title: "名称", dataIndex: "name", width: 180 },
    {
      title: "标识",
      dataIndex: "code",
      width: 140,
      render: (value: string) => <Text code>{value}</Text>,
    },
    {
      title: "价格",
      dataIndex: "price",
      width: 110,
      align: "right" as const,
      render: (value: number) => money(value),
    },
    {
      title: "单位说明",
      dataIndex: "unitText",
      width: 180,
      render: (value: string) => value || "-",
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 80,
      render: (value: boolean) =>
        value ? <Text type="success">启用</Text> : <Text type="secondary">停用</Text>,
    },
    {
      title: "操作",
      width: 140,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" type="link" onClick={() => openEdit("addons", record)}>
            编辑
          </Button>
          <Popconfirm
            title="删除该增值项？"
            onConfirm={() => removeCatalog("addons", record)}
          >
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const referralColumns = [
    {
      title: "邀请码",
      dataIndex: "code",
      width: 130,
      render: (value: string) => <Text code strong style={{ fontSize: 15 }}>{value}</Text>,
    },
    { title: "手机号", dataIndex: "phone", width: 130 },
    {
      title: "昵称",
      dataIndex: "nickname",
      width: 140,
      render: (value: string) => value || "-",
    },
    {
      title: "使用次数",
      dataIndex: "usedCount",
      width: 90,
      align: "right" as const,
      render: (v: number) => v || 0,
    },
    {
      title: "达成交易",
      dataIndex: "completedCount",
      width: 100,
      align: "right" as const,
      render: (v: number) => (
        <Text strong>
          {v || 0}
          <Text type="secondary" style={{ fontWeight: "normal" }}> / 3</Text>
        </Text>
      ),
    },
    {
      title: "待发免单",
      dataIndex: "pendingFreeCount",
      width: 100,
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? (
          <Text type="success" strong style={{ fontSize: 15 }}>{v}</Text>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "累计奖励",
      dataIndex: "totalFreeCount",
      width: 100,
      align: "right" as const,
      render: (v: number) => v || 0,
    },
    {
      title: "操作",
      width: 160,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Button
          size="small"
          type="primary"
          ghost
          onClick={() => openGrantModal(record)}
        >
          发放免单
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as TabKey)}
          items={[
            {
              key: "packages",
              label: "寄存套餐",
              children: (
                <>
                  <div style={{ marginBottom: 16, textAlign: "right" }}>
                    <Space>
                      <Button icon={<ReloadOutlined />} onClick={loadAll}>
                        刷新
                      </Button>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openCreate("packages")}
                      >
                        新增套餐
                      </Button>
                    </Space>
                  </div>
                  <Table
                    rowKey="id"
                    size="middle"
                    loading={loading}
                    columns={packageColumns as any}
                    dataSource={packages}
                    pagination={false}
                    scroll={{ x: 1500 }}
                  />
                </>
              ),
            },
            {
              key: "addons",
              label: "增值项",
              children: (
                <>
                  <div style={{ marginBottom: 16, textAlign: "right" }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openCreate("addons")}
                    >
                      新增增值项
                    </Button>
                  </div>
                  <Table
                    rowKey="id"
                    size="middle"
                    loading={loading}
                    columns={addonColumns as any}
                    dataSource={addons}
                    pagination={false}
                    scroll={{ x: 900 }}
                  />
                </>
              ),
            },
            {
              key: "referral",
              label: "邀请码管理",
              children: (
                <>
                  <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
                    <Input.Search
                      placeholder="按邀请码或手机号搜索"
                      allowClear
                      style={{ width: 280 }}
                      value={referralSearch}
                      onChange={(e) => setReferralSearch(e.target.value)}
                      onSearch={loadReferrals}
                      enterButton
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadReferrals}>
                      刷新
                    </Button>
                    <Text type="secondary">
                      共 {referrals.length} 条 · 满 3 笔交易自动发 1 次免单
                    </Text>
                  </div>
                  <Table
                    rowKey="id"
                    size="middle"
                    loading={referralLoading}
                    columns={referralColumns as any}
                    dataSource={referrals}
                    pagination={false}
                    scroll={{ x: 1000 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Card title="支付开关">
        <Space size={24} wrap align="center">
          <Space>
            <Text>在线支付</Text>
            <Switch
              checked={Boolean(configDraft.paymentOnlineEnabled)}
              onChange={(checked) =>
                setConfigDraft((prev: any) => ({
                  ...prev,
                  paymentOnlineEnabled: checked,
                }))
              }
            />
          </Space>
          <Space>
            <Text>支持定金</Text>
            <Switch
              checked={Boolean(configDraft.depositEnabled)}
              onChange={(checked) =>
                setConfigDraft((prev: any) => ({ ...prev, depositEnabled: checked }))
              }
            />
          </Space>
          <Space>
            <Text>定金比例（%）</Text>
            <InputNumber
              min={0}
              max={100}
              value={Number(configDraft.depositRatio) || 0}
              onChange={(value) =>
                setConfigDraft((prev: any) => ({
                  ...prev,
                  depositRatio: Number(value) || 0,
                }))
              }
            />
          </Space>
          <Button type="primary" loading={savingConfig} onClick={saveConfig}>
            保存支付配置
          </Button>
          <Text type="secondary">
            当前线上状态：{config.paymentOnlineEnabled ? "已开启" : "已关闭"}
          </Text>
        </Space>
      </Card>

      <Modal
        open={!!modalType}
        title={
          `${editing ? "编辑" : "新增"}${modalType === "packages" ? "套餐" : "增值项"}`
        }
        onCancel={() => {
          setModalType(null);
          setEditing(null);
        }}
        onOk={saveCatalog}
        confirmLoading={saving}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请填写名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="code"
            label="标识（英文/数字）"
            rules={[
              { required: true, message: "请填写标识" },
              { pattern: /^[a-z0-9-_]+$/, message: "仅支持小写字母、数字、- 和 _" },
            ]}
          >
            <Input placeholder="如 six_month" />
          </Form.Item>
          {modalType === "packages" ? (
            <>
              <Space size={16} style={{ display: "flex" }}>
                <Form.Item name="baseMonths" label="基础月数" style={{ width: 200 }}>
                  <InputNumber min={1} max={60} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="sort" label="排序" style={{ width: 160 }}>
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="enabled" label="启用" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Space>
              <Space size={16} style={{ display: "flex" }}>
                <Form.Item name="storePrice" label="到店价（元）" style={{ width: 200 }}>
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="pickupPrice" label="上门价（元）" style={{ width: 200 }}>
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Space>
              <Space size={16} style={{ display: "flex" }}>
                <Form.Item
                  name="extraMonthPrice"
                  label="超月单价（元）"
                  style={{ width: 200 }}
                >
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="overdueDayPrice"
                  label="超期日价（元）"
                  style={{ width: 200 }}
                >
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Space>
              <Form.Item name="durationText" label="时长文案">
                <Input placeholder="如 6 个月（180 天）" />
              </Form.Item>
              <Form.Item name="highlightsText" label="亮点（每行一条）">
                <Input.TextArea rows={4} />
              </Form.Item>
            </>
          ) : (
            <>
              <Space size={16} style={{ display: "flex" }}>
                <Form.Item name="price" label="价格（元）" style={{ width: 200 }}>
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="sort" label="排序" style={{ width: 160 }}>
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="enabled" label="启用" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Space>
              <Form.Item name="unitText" label="单位说明">
                <Input placeholder="如 每次 / 每套" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* 发放免单 Modal */}
      <Modal
        open={grantModalOpen}
        title="发放免单额度"
        onCancel={() => {
          setGrantModalOpen(false);
          setGrantTarget(null);
        }}
        onOk={handleGrantFree}
        confirmLoading={granting}
        width={420}
      >
        {grantTarget && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ marginBottom: 12 }}>
              <Text strong>邀请码：</Text>
              <Text code>{grantTarget.code}</Text>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>手机号：</Text>
              {grantTarget.phone}
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>昵称：</Text>
              {grantTarget.nickname || "-"}
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>当前可用免单：</Text>
              <Text type="success" strong style={{ fontSize: 16, marginLeft: 8 }}>
                {grantTarget.pendingFreeCount || 0} 次
              </Text>
            </div>
            <div>
              <Text strong>发放次数：</Text>
              <InputNumber
                min={1}
                max={100}
                value={grantCount}
                onChange={(v) => setGrantCount(Number(v) || 1)}
                style={{ marginLeft: 12 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </Space>
  );
};

export default CatalogPage;
