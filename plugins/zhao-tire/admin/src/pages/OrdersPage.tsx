import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { StatusTag } from "../components/StatusTag";
import { PhotoUploader } from "../components/PhotoUploader";
import { usePermissions } from "../components/Layout";
import {
  absoluteMediaUrl,
  errorMessage,
  useTireApi,
} from "../utils/api";
import {
  CAR_TEXT,
  OUTBOUND_TEXT,
  PAYMENT_METHOD_TEXT,
  PAYMENT_TEXT,
  SERVICE_TEXT,
  SLOT_TEXT,
  STATUS_TEXT,
  TIMELINE_TEXT,
  dateText,
  dateTimeText,
  money,
  remainingColor,
  remainingText,
  yuanToCents,
} from "../utils/constants";

const { RangePicker } = DatePicker;
const { CheckableTag } = Tag;
const { Text } = Typography;

type OrderAction = {
  type:
    | "inbound"
    | "outbound"
    | "edit"
    | "reject"
    | "reject-outbound"
    | "payment";
  order: any;
};

const STATUS_FILTERS = [
  { value: "", label: "全部" },
  ...Object.keys(STATUS_TEXT).map((key) => ({
    value: key,
    label: STATUS_TEXT[key],
  })),
];

const daysLeft = (value: unknown): number => {
  if (!value) return 0;
  const target = dayjs(String(value).slice(0, 10)).startOf("day");
  return target.diff(dayjs().startOf("day"), "day");
};

const ACTION_TITLE: Record<string, string> = {
  inbound: "入库登记",
  outbound: "出库登记",
  edit: "修改订单",
  reject: "拒绝订单",
  "reject-outbound": "驳回出库申请",
  payment: "收款登记",
};

const ACTION_CONFIRM: Record<string, string> = {
  inbound: "确认入库",
  outbound: "确认出库",
  edit: "保存修改",
  reject: "确认拒绝",
  "reject-outbound": "确认驳回",
  payment: "登记收款",
};

const OrderActionDrawer = ({
  action,
  onClose,
  onDone,
}: {
  action: OrderAction;
  onClose: () => void;
  onDone: () => void;
}) => {
  const { type, order } = action;
  const api = useTireApi();
  const [form] = Form.useForm();
  const [photos, setPhotos] = useState<File[]>([]);
  const [locationCode, setLocationCode] = useState(order.locationCode || "");
  const [reason, setReason] = useState("");
  const [amountYuan, setAmountYuan] = useState(
    Math.max(0, ((order.amountTotal || 0) - (order.paidAmount || 0)) / 100)
  );
  const [paymentMethod, setPaymentMethod] = useState(
    order.paymentMethod || "store_pay"
  );
  const [redemptionCode, setRedemptionCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (type !== "edit") return;
    form.setFieldsValue({
      customerName: order.customerName,
      phone: order.phone,
      plateNo: order.plateNo || "",
      carType: order.carType,
      tireSpec: order.tireSpec || "",
      withWheelRim: Boolean(order.withWheelRim),
      serviceType: order.serviceType,
      pickupDate: order.pickupDate ? dayjs(order.pickupDate) : null,
      pickupSlot: order.pickupSlot || undefined,
      storageStartDate: order.storageStartDate
        ? dayjs(order.storageStartDate)
        : null,
      expectedReturnDate: order.expectedReturnDate
        ? dayjs(order.expectedReturnDate)
        : null,
      locationCode: order.locationCode || "",
      note: order.note || "",
    });
  }, [type, order, form]);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (type === "inbound") {
        if (!locationCode.trim()) {
          message.warning("请填写仓位编号");
          return;
        }
        if (photos.length === 0) {
          message.warning("请至少上传一张入库照片");
          return;
        }
        await api.submitOrderPhotos(order.id, "inbound", photos, {
          locationCode: locationCode.trim(),
        });
        message.success("入库成功");
      } else if (type === "outbound") {
        if (photos.length === 0) {
          message.warning("请至少上传一张出库照片");
          return;
        }
        if (!redemptionCode.trim()) {
          message.warning("请扫描或输入客户的出库核销码");
          return;
        }
        await api.submitOrderPhotos(order.id, "outbound", photos, {
          redemptionCode: redemptionCode.trim(),
        });
        message.success("出库成功，核销码已失效");
      } else if (type === "reject") {
        if (!reason.trim()) {
          message.warning("请填写拒绝原因");
          return;
        }
        await api.orderAction(order.id, "reject", { reason: reason.trim() });
        message.success("已拒绝订单");
      } else if (type === "reject-outbound") {
        if (!reason.trim()) {
          message.warning("请填写驳回原因");
          return;
        }
        await api.orderAction(order.id, "reject-outbound", {
          reason: reason.trim(),
        });
        message.success("已驳回出库申请");
      } else if (type === "payment") {
        const amount = yuanToCents(amountYuan);
        if (amount <= 0) {
          message.warning("收款金额必须大于 0");
          return;
        }
        await api.orderAction(order.id, "payment", {
          amount,
          paymentMethod,
        });
        message.success("收款已登记");
      } else if (type === "edit") {
        const values: any = await form.validateFields();
        const payload: any = {
          customerName: String(values.customerName || "").trim(),
          phone: String(values.phone || "").trim(),
          plateNo: String(values.plateNo || "").trim(),
          tireSpec: String(values.tireSpec || "").trim(),
          carType: values.carType,
          withWheelRim: Boolean(values.withWheelRim),
          serviceType: values.serviceType,
          locationCode: String(values.locationCode || "").trim(),
          note: String(values.note || ""),
        };
        if (values.pickupDate) {
          payload.pickupDate = values.pickupDate.format("YYYY-MM-DD");
        }
        if (values.pickupSlot) payload.pickupSlot = values.pickupSlot;
        if (values.storageStartDate) {
          payload.storageStartDate = values.storageStartDate.format(
            "YYYY-MM-DD"
          );
        }
        if (values.expectedReturnDate) {
          payload.expectedReturnDate = values.expectedReturnDate.format(
            "YYYY-MM-DD"
          );
        }
        await api.updateOrder(order.id, payload);
        message.success("订单已更新");
      }
      onDone();
      onClose();
    } catch (error) {
      message.error(`操作失败：${errorMessage(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={`${ACTION_TITLE[type]} · ${order.orderNo}`}
      open
      width={type === "edit" ? 560 : 480}
      onClose={onClose}
      styles={{ body: { padding: 24 } }}
      footer={
        <Space style={{ float: "right" }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={submit}>
            {ACTION_CONFIRM[type]}
          </Button>
        </Space>
      }
    >
      {type === "inbound" || type === "outbound" ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            客户：{order.customerName}（{order.phone}），车牌 {order.plateNo || "-"}
          </div>
          {type === "inbound" ? (
            <div>
              <div style={{ marginBottom: 8 }}>仓位编号</div>
              <Input
                value={locationCode}
                onChange={(event) => setLocationCode(event.target.value)}
                placeholder="如 A-01-3"
                maxLength={32}
              />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 8 }}>出库核销码</div>
              <Input
                value={redemptionCode}
                onChange={(event) => setRedemptionCode(event.target.value)}
                placeholder="请扫描或输入客户出示的 6 位核销码"
                maxLength={16}
                status={order.paymentStatus !== "paid" ? "warning" : undefined}
              />
              {order.paymentStatus !== "paid" ? (
                <Text type="danger" style={{ fontSize: 12 }}>
                  该订单尚未结清（应收 {money(order.amountTotal)}，已收 {money(order.paidAmount)}），需先收款后才能出库。
                </Text>
              ) : null}
            </div>
          )}
          <div>
            <div style={{ marginBottom: 8 }}>
              {type === "inbound" ? "入库照片" : "出库照片"}
            </div>
            <PhotoUploader max={4} onChange={setPhotos} />
          </div>
        </Space>
      ) : null}

      {type === "reject" || type === "reject-outbound" ? (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text type="secondary">
            {type === "reject"
              ? "拒绝后订单状态变为「已拒绝」。"
              : "驳回后客户可重新提交出库申请。"}
          </Text>
          <Input.TextArea
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="请填写原因，方便后续追溯"
          />
        </Space>
      ) : null}

      {type === "payment" ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            订单总额 {money(order.amountTotal)}，已收 {money(order.paidAmount)}，待收{" "}
            {money(Math.max(0, (order.amountTotal || 0) - (order.paidAmount || 0)))}
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>收款金额（元）</div>
            <InputNumber
              min={0}
              precision={2}
              step={0.01}
              value={amountYuan}
              onChange={(value) => setAmountYuan(Number(value) || 0)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>支付方式</div>
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={Object.keys(PAYMENT_METHOD_TEXT).map((value) => ({
                value,
                label: PAYMENT_METHOD_TEXT[value],
              }))}
              style={{ width: "100%" }}
            />
          </div>
        </Space>
      ) : null}

      {type === "edit" ? (
        <Form form={form} layout="vertical">
          <Form.Item
            name="customerName"
            label="客户姓名"
            rules={[{ required: true, message: "请填写客户姓名" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: "请填写手机号" },
              { pattern: /^1[3-9]\d{9}$/, message: "手机号格式不正确" },
            ]}
          >
            <Input maxLength={11} />
          </Form.Item>
          <Form.Item name="plateNo" label="车牌号">
            <Input />
          </Form.Item>
          <Form.Item name="carType" label="车型">
            <Select
              options={Object.keys(CAR_TEXT).map((value) => ({
                value,
                label: CAR_TEXT[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="tireSpec" label="轮胎规格">
            <Input />
          </Form.Item>
          <Form.Item name="withWheelRim" label="带轮毂" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="serviceType" label="服务类型">
            <Select
              options={Object.keys(SERVICE_TEXT).map((value) => ({
                value,
                label: SERVICE_TEXT[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="pickupDate" label="上门日期">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="pickupSlot" label="上门时段">
            <Select
              allowClear
              options={Object.keys(SLOT_TEXT).map((value) => ({
                value,
                label: SLOT_TEXT[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="storageStartDate" label="寄存开始日">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="expectedReturnDate" label="预计取回日">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="locationCode" label="仓位编号">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      ) : null}
    </Drawer>
  );
};

const OrdersPage = () => {
  const api = useTireApi();
  const { canFull, canStorage } = usePermissions();

  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [action, setAction] = useState<OrderAction | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const result = await api.listOrders({ ...filters, page, pageSize });
      setRows(result?.data || []);
      setTotal(Number(result?.pagination?.total) || 0);
    } catch (error) {
      message.error(`加载订单失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [
    page,
    pageSize,
    filters.status,
    filters.serviceType,
    filters.keyword,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const openDetail = async (order: any) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      setDetail(await api.getOrder(order.id));
    } catch (error) {
      message.error(`加载订单详情失败：${errorMessage(error)}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (order: any) => {
    try {
      setDetail(await api.getOrder(order.id));
    } catch {
      // 详情刷新失败不阻断列表刷新
    }
  };

  const runAction = async (
    record: any,
    actionName: string,
    body: any = {},
    success = "操作成功"
  ) => {
    try {
      await api.orderAction(record.id, actionName, body);
      message.success(success);
      await loadOrders();
      if (detailOpen && detail?.id === record.id) await refreshDetail(record);
    } catch (error) {
      message.error(`操作失败：${errorMessage(error)}`);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportOrders({ ...filters });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `雪地胎订单-${dayjs().format("YYYYMMDD")}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      message.error(`导出失败：${errorMessage(error)}`);
    }
  };

  const handleDone = async () => {
    await loadOrders();
    if (detailOpen && detail) {
      try {
        setDetail(await api.getOrder(detail.id));
      } catch {
        // 忽略详情刷新失败
      }
    }
  };

  const columns = [
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 150,
      render: (value: string, record: any) => (
        <a onClick={() => openDetail(record)}>{value}</a>
      ),
    },
    {
      title: "客户",
      width: 170,
      render: (_: any, record: any) => (
        <div>
          <div>{record.customerName}</div>
          <Text type="secondary">{record.phone}</Text>
        </div>
      ),
    },
    {
      title: "车牌",
      dataIndex: "plateNo",
      width: 110,
      render: (value: string) => value || "-",
    },
    {
      title: "服务",
      dataIndex: "serviceType",
      width: 100,
      render: (value: string) => SERVICE_TEXT[value] || value,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 110,
      render: (value: string, record: any) => (
        <Space direction="vertical" size={0}>
          <StatusTag status={value} />
          {record.status === "stored" &&
          record.outboundRequestStatus === "pending" ? (
            <Text style={{ fontSize: 12, color: "#E0523F" }}>出库申请待审</Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "金额",
      dataIndex: "amountTotal",
      width: 110,
      align: "right" as const,
      render: (value: number, record: any) => (
        <Space direction="vertical" size={0} style={{ alignItems: "flex-end" }}>
          <span>{money(value)}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {PAYMENT_TEXT[record.paymentStatus] || record.paymentStatus}
          </Text>
        </Space>
      ),
    },
    {
      title: "到期",
      width: 130,
      render: (_: any, record: any) => {
        const days = daysLeft(record.expireAt);
        const isActive =
          record.status === "stored" || record.status === "pending_outbound";
        return (
          <Space direction="vertical" size={0}>
            <span>{dateText(record.expireAt)}</span>
            {isActive ? (
              <Text style={{ fontSize: 12, color: remainingColor(days) }}>
                {remainingText(days)}
              </Text>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 260,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space wrap size={4}>
          <Button size="small" type="link" onClick={() => openDetail(record)}>
            详情
          </Button>
          {record.status === "pending_accept" && canFull ? (
            <>
              <Popconfirm
                title="确认接单？"
                onConfirm={() => runAction(record, "accept", {}, "已接单")}
              >
                <Button size="small" type="link">
                  接单
                </Button>
              </Popconfirm>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => setAction({ type: "reject", order: record })}
              >
                拒绝
              </Button>
            </>
          ) : null}
          {record.status === "accepted" && canStorage ? (
            <Button
              size="small"
              type="link"
              onClick={() => setAction({ type: "inbound", order: record })}
            >
              入库
            </Button>
          ) : null}
          {record.status === "stored" &&
          record.outboundRequestStatus === "pending" &&
          canFull ? (
            <>
              <Popconfirm
                title="通过该出库申请？"
                onConfirm={() =>
                  runAction(record, "approve-outbound", {}, "已通过出库申请")
                }
              >
                <Button size="small" type="link">
                  通过出库
                </Button>
              </Popconfirm>
              <Button
                size="small"
                type="link"
                danger
                onClick={() =>
                  setAction({ type: "reject-outbound", order: record })
                }
              >
                驳回出库
              </Button>
            </>
          ) : null}
          {record.status === "pending_outbound" && canStorage ? (
            <Button
              size="small"
              type="link"
              onClick={() => setAction({ type: "outbound", order: record })}
            >
              出库
            </Button>
          ) : null}
          {canFull ? (
            <>
              <Button
                size="small"
                type="link"
                icon={<EditOutlined />}
                onClick={() => setAction({ type: "edit", order: record })}
              >
                改单
              </Button>
              <Button
                size="small"
                type="link"
                onClick={() => setAction({ type: "payment", order: record })}
              >
                收款
              </Button>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  const detailPhotos = (photos: any[]) => {
    if (!photos || photos.length === 0) {
      return <Text type="secondary">暂无照片</Text>;
    }
    return (
      <Image.PreviewGroup>
        <Space wrap>
          {photos.map((photo: any) => (
            <Image
              key={photo.id}
              src={absoluteMediaUrl(photo.url)}
              width={88}
              height={88}
              style={{ objectFit: "cover", borderRadius: 6 }}
            />
          ))}
        </Space>
      </Image.PreviewGroup>
    );
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <Card
          style={{ width: 240, flex: "0 0 240px" }}
          styles={{ body: { padding: 16 } }}
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Text strong>订单状态</Text>
            <Space wrap size={4}>
              {STATUS_FILTERS.map((item) => (
                <CheckableTag
                  key={item.value || "all"}
                  checked={(filters.status || "") === item.value}
                  onChange={() => {
                    setPage(1);
                    setFilters((prev) => ({
                      ...prev,
                      status: item.value || undefined,
                    }));
                  }}
                >
                  {item.label}
                </CheckableTag>
              ))}
            </Space>
            <Text strong>服务类型</Text>
            <Select
              allowClear
              placeholder="全部服务"
              style={{ width: "100%" }}
              value={filters.serviceType}
              onChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, serviceType: value }));
              }}
              options={Object.keys(SERVICE_TEXT).map((value) => ({
                value,
                label: SERVICE_TEXT[value],
              }))}
            />
            <Text strong>下单日期</Text>
            <RangePicker
              style={{ width: "100%" }}
              value={
                filters.dateFrom && filters.dateTo
                  ? [dayjs(filters.dateFrom), dayjs(filters.dateTo)]
                  : null
              }
              onChange={(values) => {
                setPage(1);
                setFilters((prev) => ({
                  ...prev,
                  dateFrom: values?.[0]?.format("YYYY-MM-DD"),
                  dateTo: values?.[1]?.format("YYYY-MM-DD"),
                }));
              }}
            />
            <Text strong>关键词</Text>
            <Input.Search
              allowClear
              placeholder="订单号 / 手机号 / 车牌 / 姓名"
              style={{ width: "100%" }}
              onSearch={(value) => {
                setPage(1);
                setFilters((prev) => ({
                  ...prev,
                  keyword: value.trim() || undefined,
                }));
              }}
            />
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={() => loadOrders()}>
                刷新
              </Button>
              {canFull ? (
                <Button icon={<DownloadOutlined />} onClick={handleExport}>
                  导出 Excel
                </Button>
              ) : null}
            </Space>
          </Space>
        </Card>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Table
            rowKey="id"
            size="middle"
            loading={loading}
            columns={columns as any}
            dataSource={rows}
            scroll={{ x: 1180 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 单`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
            }}
          />
        </div>
      </div>

      <Drawer
        title={detail ? `订单详情 · ${detail.orderNo}` : "订单详情"}
        open={detailOpen}
        width={760}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
        styles={{ body: { padding: 24 } }}
        extra={detail ? <StatusTag status={detail.status} /> : null}
      >
        {detail ? (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Descriptions column={2} size="small" bordered title="客户与车辆">
              <Descriptions.Item label="客户姓名">
                {detail.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="车牌号">
                {detail.plateNo || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="车型">
                {CAR_TEXT[detail.carType] || detail.carType}
              </Descriptions.Item>
              <Descriptions.Item label="轮胎规格">
                {detail.tireSpec || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="带轮毂">
                {detail.withWheelRim ? "是" : "否"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions column={2} size="small" bordered title="服务与寄存">
              <Descriptions.Item label="服务类型">
                {SERVICE_TEXT[detail.serviceType] || detail.serviceType}
              </Descriptions.Item>
              <Descriptions.Item label="取回方式">
                {detail.returnMethod || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="上门日期">
                {dateText(detail.pickupDate)}
              </Descriptions.Item>
              <Descriptions.Item label="上门时段">
                {SLOT_TEXT[detail.pickupSlot] || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="寄存开始日">
                {dateText(detail.storageStartDate)}
              </Descriptions.Item>
              <Descriptions.Item label="预计取回日">
                {dateText(detail.expectedReturnDate)}
              </Descriptions.Item>
              <Descriptions.Item label="寄存月数">
                {detail.months || 0} 个月
              </Descriptions.Item>
              <Descriptions.Item label="到期日">
                {dateText(detail.expireAt)}
              </Descriptions.Item>
              <Descriptions.Item label="仓位编号">
                {detail.locationCode || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="入库时间">
                {dateTimeText(detail.inboundAt)}
              </Descriptions.Item>
              <Descriptions.Item label="出库时间">
                {dateTimeText(detail.outboundAt)}
              </Descriptions.Item>
              <Descriptions.Item label="出库申请">
                {OUTBOUND_TEXT[detail.outboundRequestStatus] ||
                  detail.outboundRequestStatus ||
                  "-"}
              </Descriptions.Item>
              <Descriptions.Item label="申请时间">
                {dateTimeText(detail.outboundRequestedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="出库备注">
                {detail.outboundNote || "-"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions column={2} size="small" bordered title="费用">
              <Descriptions.Item label="套餐费">
                {money(detail.amountPackage)}
              </Descriptions.Item>
              <Descriptions.Item label="增值费">
                {money(detail.amountAddon)}
              </Descriptions.Item>
              <Descriptions.Item label="订单总额">
                {money(detail.amountTotal)}
              </Descriptions.Item>
              <Descriptions.Item label="已收金额">
                {money(detail.paidAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {PAYMENT_METHOD_TEXT[detail.paymentMethod] ||
                  detail.paymentMethod}
              </Descriptions.Item>
              <Descriptions.Item label="支付状态">
                {PAYMENT_TEXT[detail.paymentStatus] || detail.paymentStatus}
              </Descriptions.Item>
              <Descriptions.Item label="套餐快照" span={2}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(detail.packageSnapshot || {}, null, 2)}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="增值项" span={2}>
                {Array.isArray(detail.addons) && detail.addons.length > 0
                  ? detail.addons
                      .map((item: any) => `${item.name} ${money(item.price)}`)
                      .join("、")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="续费记录" span={2}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(detail.renewals || [], null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="入库照片">
              {detailPhotos(detail.inboundPhotos)}
            </Card>
            <Card size="small" title="出库照片">
              {detailPhotos(detail.outboundPhotos)}
            </Card>

            <Card size="small" title="操作记录">
              {Array.isArray(detail.timeline) && detail.timeline.length > 0 ? (
                <Timeline
                  items={detail.timeline.map((item: any, index: number) => ({
                    key: index,
                    color: "blue",
                    children: (
                      <div>
                        <div>
                          {TIMELINE_TEXT[item.event] || item.event} ·{" "}
                          {dateTimeText(item.at)}
                        </div>
                        {item.detail ? (
                          <Text type="secondary">{item.detail}</Text>
                        ) : null}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Text type="secondary">暂无记录</Text>
              )}
            </Card>

            <Descriptions column={2} size="small" bordered title="其他信息">
              <Descriptions.Item label="订单 ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="来源">
                {detail.source || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="下单令牌">
                {detail.clientToken || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="入库操作员">
                {detail.storageOperator?.firstname ||
                  detail.storageOperator?.email ||
                  "-"}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dateTimeText(detail.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dateTimeText(detail.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="协议同意时间">
                {dateTimeText(detail.agreementAcceptedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {detail.note || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Drawer>

      {action ? (
        <OrderActionDrawer
          action={action}
          onClose={() => setAction(null)}
          onDone={handleDone}
        />
      ) : null}
    </>
  );
};

export default OrdersPage;
