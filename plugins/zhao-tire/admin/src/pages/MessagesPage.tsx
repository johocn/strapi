import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Collapse,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  EditOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { errorMessage, useTireApi } from "../utils/api";
import {
  SMS_STATUS_COLOR,
  SMS_STATUS_TEXT,
  SMS_TYPE_TEXT,
  dateTimeText,
} from "../utils/constants";

const { Text } = Typography;

const DEFAULT_TEMPLATES: Record<string, string> = {
  order_created:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 已下单成功，请在订单页保存二维码。",
  accepted:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 已接单，{pickupText}，请保持电话畅通。",
  inbound:
    "{name}您好，您的轮胎已入库，订单 {orderNo}，仓位 {locationCode}，寄存到期日 {expireAt}。",
  due_7:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（剩余 {daysLeft} 天），请提前安排取胎或续费。",
  due_3:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（仅剩 {daysLeft} 天），请尽快取胎或续费。",
  outbound_done:
    "{name}您好，您的雪地胎寄存订单 {orderNo} 的轮胎已完成出库，感谢使用雪地胎寄存服务。",
  manual: "{name}您好，{content}",
};

const TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATES);

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success("已复制到剪贴板");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    message.success("已复制到剪贴板");
  }
};

const MessagesPage = () => {
  const api = useTireApi();

  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({
    ...DEFAULT_TEMPLATES,
  });
  const [templateLoading, setTemplateLoading] = useState(true);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [contentDraft, setContentDraft] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { ...filters, page, pageSize };
      const keyword = String(params.keyword || "").trim();
      delete params.keyword;
      if (keyword) {
        if (/^1[3-9]\d{9}$/.test(keyword)) params.phone = keyword;
        else params.orderNo = keyword;
      }
      const result = await api.listSmsLogs(params);
      setRows(result?.data || []);
      setTotal(Number(result?.pagination?.total) || 0);
    } catch (error) {
      message.error(`加载通知失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplateLoading(true);
    try {
      const config = await api.getConfig();
      const override = config?.smsTemplateOverride;
      const merged: Record<string, string> = { ...DEFAULT_TEMPLATES };
      if (override && typeof override === "object") {
        TEMPLATE_KEYS.forEach((key) => {
          if (typeof override[key] === "string" && override[key].trim()) {
            merged[key] = override[key];
          }
        });
      }
      setTemplates(merged);
    } catch (error) {
      message.error(`加载模板失败：${errorMessage(error)}`);
    } finally {
      setTemplateLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [
    page,
    pageSize,
    filters.status,
    filters.type,
    filters.keyword,
  ]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const updateStatus = async (record: any, status: string) => {
    try {
      await api.updateSmsLog(record.id, {
        status,
        ...(record.content ? { content: record.content } : {}),
      });
      message.success(status === "sent" ? "已标记为已发送" : "已跳过");
      await loadLogs();
    } catch (error) {
      message.error(`操作失败：${errorMessage(error)}`);
    }
  };

  const saveContent = async () => {
    if (!editing) return;
    try {
      await api.updateSmsLog(editing.id, {
        status: editing.status,
        content: contentDraft,
      });
      message.success("文案已更新");
      setEditing(null);
      await loadLogs();
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    }
  };

  const saveTemplates = async () => {
    setSavingTemplates(true);
    try {
      const override: Record<string, string> = {};
      TEMPLATE_KEYS.forEach((key) => {
        const value = String(templates[key] || "").trim();
        if (value && value !== DEFAULT_TEMPLATES[key]) {
          override[key] = value;
        }
      });
      await api.updateConfig({ smsTemplateOverride: override });
      message.success("模板文案已保存");
      await loadTemplates();
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSavingTemplates(false);
    }
  };

  const columns = [
    {
      title: "类型",
      dataIndex: "type",
      width: 120,
      render: (value: string) => SMS_TYPE_TEXT[value] || value,
    },
    {
      title: "订单号",
      width: 150,
      render: (_: any, record: any) => record.order?.orderNo || "-",
    },
    {
      title: "手机号",
      dataIndex: "phone",
      width: 130,
    },
    {
      title: "文案",
      dataIndex: "content",
      width: 360,
      render: (value: string) => (
        <Tooltip title={value}>
          <div
            style={{
              maxWidth: 340,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </div>
        </Tooltip>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value: string) => (
        <Tag color={SMS_STATUS_COLOR[value]}>
          {SMS_STATUS_TEXT[value] || value}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 150,
      render: (value: string) => dateTimeText(value),
    },
    {
      title: "操作",
      width: 220,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size={2} wrap>
          <Button
            size="small"
            type="link"
            icon={<CopyOutlined />}
            onClick={() => copyText(record.content || "")}
          >
            复制
          </Button>
          <Button
            size="small"
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              setContentDraft(record.content || "");
            }}
          >
            编辑
          </Button>
          {record.status === "pending" ? (
            <>
              <Popconfirm
                title="确认该通知已发送？"
                onConfirm={() => updateStatus(record, "sent")}
              >
                <Button size="small" type="link" icon={<SendOutlined />}>
                  已发
                </Button>
              </Popconfirm>
              <Popconfirm
                title="跳过该通知？"
                onConfirm={() => updateStatus(record, "skipped")}
              >
                <Button size="small" type="link" danger>
                  跳过
                </Button>
              </Popconfirm>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card styles={{ body: { padding: 16 } }}>
        <Space wrap size={12}>
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 130 }}
            value={filters.status}
            onChange={(value) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, status: value }));
            }}
            options={Object.keys(SMS_STATUS_TEXT).map((value) => ({
              value,
              label: SMS_STATUS_TEXT[value],
            }))}
          />
          <Select
            allowClear
            placeholder="通知类型"
            style={{ width: 150 }}
            value={filters.type}
            onChange={(value) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, type: value }));
            }}
            options={Object.keys(SMS_TYPE_TEXT).map((value) => ({
              value,
              label: SMS_TYPE_TEXT[value],
            }))}
          />
          <Input.Search
            allowClear
            placeholder="手机号 / 订单号"
            style={{ width: 240 }}
            onSearch={(value) => {
              setPage(1);
              setFilters((prev) => ({
                ...prev,
                keyword: value.trim() || undefined,
              }));
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => loadLogs()}>
            刷新
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns as any}
        dataSource={rows}
        scroll={{ x: 1300 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
      />

      <Card
        title="模板文案"
        extra={
          <Space>
            <Button
              onClick={() => setTemplates({ ...DEFAULT_TEMPLATES })}
              disabled={savingTemplates}
            >
              恢复默认
            </Button>
            <Button
              type="primary"
              loading={savingTemplates}
              onClick={saveTemplates}
            >
              保存模板
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text type="secondary">
            可用变量：{"{name} {orderNo} {expireAt} {daysLeft} {locationCode} {pickupText} {content}"}
          </Text>
          <Collapse
            items={TEMPLATE_KEYS.map((key) => ({
              key,
              label: SMS_TYPE_TEXT[key] || key,
              children: (
                <Input.TextArea
                  rows={3}
                  value={templates[key]}
                  disabled={templateLoading}
                  onChange={(event) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                />
              ),
            }))}
          />
        </Space>
      </Card>

      <Modal
        open={!!editing}
        title={editing ? `编辑文案 · ${SMS_TYPE_TEXT[editing.type] || editing.type}` : "编辑文案"}
        onCancel={() => setEditing(null)}
        onOk={saveContent}
        okText="保存"
        width={560}
      >
        <Input.TextArea
          rows={5}
          value={contentDraft}
          onChange={(event) => setContentDraft(event.target.value)}
        />
      </Modal>
    </Space>
  );
};

export default MessagesPage;
