import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { errorMessage, useTireApi } from "../utils/api";

const money = (fen?: number) => {
  const value = Number(fen) || 0;
  return `¥${(value / 100).toFixed(2)}`;
};

const fmtTime = (value?: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

const CHANNEL_TEXT: Record<string, string> = {
  wechat: "微信支付",
  store_pay: "到店支付",
  pickup_pay: "取货付款",
  deposit: "定金",
  full: "全额",
  mock: "模拟通道",
};

const STATUS_TEXT: Record<string, string> = {
  pending: "待确认",
  paid: "已到账",
  failed: "失败",
  canceled: "已取消",
  refunded: "已退款",
};

const SHARE_STATUS_TEXT: Record<string, { text: string; color: string }> = {
  bound: { text: "待入库", color: "blue" },
  valid: { text: "已生效", color: "green" },
  pending_review: { text: "风控审核", color: "orange" },
  invalid: { text: "无效", color: "default" },
  rolled_back: { text: "已回滚", color: "default" },
};

type PaymentRow = {
  id: number;
  paymentNo: string;
  orderNo: string;
  channel: string;
  amount: number;
  status: string;
  provider?: string;
  operatorName?: string;
  paidAt?: string | null;
  createdAt?: string;
  note?: string;
};

type ShareRow = {
  id: number;
  shareCode: string;
  referrerPhone: string;
  inviteePhone?: string | null;
  orderNo?: string | null;
  boundAt?: string | null;
  validAt?: string | null;
  status: string;
  riskReason?: string | null;
  reward?: {
    issued: number;
    available: number;
    used: number;
    latestRewardNo?: string | null;
  };
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const PaymentsPage = () => {
  const api = useTireApi();

  const [activeTab, setActiveTab] = useState("todo");
  const [loading, setLoading] = useState(false);

  const [pendingRows, setPendingRows] = useState<PaymentRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const [ledger, setLedger] = useState<{ rows: PaymentRow[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerStatus, setLedgerStatus] = useState<string | undefined>();
  const [ledgerOrderNo, setLedgerOrderNo] = useState("");

  const [shares, setShares] = useState<{ rows: ShareRow[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [sharePage, setSharePage] = useState(1);
  const [shareStatus, setShareStatus] = useState<string | undefined>();
  const [shareReferrer, setShareReferrer] = useState("");
  const [shareInvitee, setShareInvitee] = useState("");
  const [shareRange, setShareRange] = useState<any>(null);

  const loadPending = useCallback(async () => {
    const result = await api.listPayments({ status: "pending", pageSize: 100 });
    const rows: PaymentRow[] = result?.data || [];
    setPendingRows(rows);
    setPendingTotal(Number(result?.meta?.total) || rows.length);
    setPendingAmount(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  }, [api]);

  const loadLedger = useCallback(
    async (page = ledgerPage) => {
      const result = await api.listPayments({
        page,
        pageSize: 20,
        status: ledgerStatus,
        orderNo: ledgerOrderNo.trim() || undefined,
      });
      setLedger({
        rows: result?.data || [],
        total: Number(result?.meta?.total) || 0,
      });
      setLedgerPage(page);
    },
    [api, ledgerPage, ledgerStatus, ledgerOrderNo]
  );

  const shareParams = useCallback(
    (page = sharePage) => ({
      page,
      pageSize: 20,
      status: shareStatus,
      referrerPhone: shareReferrer.trim() || undefined,
      inviteePhone: shareInvitee.trim() || undefined,
      from: shareRange?.[0] ? dayjs(shareRange[0]).format("YYYY-MM-DD") : undefined,
      to: shareRange?.[1] ? dayjs(shareRange[1]).format("YYYY-MM-DD") : undefined,
    }),
    [sharePage, shareStatus, shareReferrer, shareInvitee, shareRange]
  );

  const loadShares = useCallback(
    async (page = sharePage) => {
      const result = await api.listShareRecords(shareParams(page));
      setShares({
        rows: result?.data || [],
        total: Number(result?.pagination?.total) || 0,
      });
      setSharePage(page);
    },
    [api, shareParams, sharePage]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadPending(), loadLedger(1), loadShares(1)]);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loadPending, loadLedger, loadShares]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmPayment = async (row: PaymentRow) => {
    setConfirmingId(row.id);
    try {
      await api.confirmPayment(row.id);
      message.success(`流水 ${row.paymentNo} 已确认到账`);
      await Promise.all([loadPending(), loadLedger(1)]);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setConfirmingId(null);
    }
  };

  const exportShares = async () => {
    try {
      const blob = await api.exportShareRecords(shareParams(1));
      downloadBlob(blob, `邀请记录-${dayjs().format("YYYYMMDD")}.csv`);
      message.success("邀请记录已导出");
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  const pendingColumns: ColumnsType<PaymentRow> = useMemo(
    () => [
      {
        title: "流水号",
        dataIndex: "paymentNo",
        width: 190,
        render: (value: string) => <span style={{ fontFamily: "monospace" }}>{value}</span>,
      },
      { title: "订单号", dataIndex: "orderNo", width: 170 },
      {
        title: "渠道",
        dataIndex: "channel",
        width: 110,
        render: (value: string) => CHANNEL_TEXT[value] || value,
      },
      {
        title: "金额",
        dataIndex: "amount",
        width: 110,
        align: "right",
        render: (value: number) => <strong>{money(value)}</strong>,
      },
      {
        title: "创建时间",
        dataIndex: "createdAt",
        width: 160,
        render: (value: string) => fmtTime(value),
      },
      {
        title: "操作",
        width: 130,
        render: (_: unknown, row) => (
          <Button
            type="primary"
            size="small"
            loading={confirmingId === row.id}
            onClick={() => confirmPayment(row)}
          >
            确认到账
          </Button>
        ),
      },
    ],
    [confirmingId]
  );

  const ledgerColumns: ColumnsType<PaymentRow> = [
    {
      title: "流水号",
      dataIndex: "paymentNo",
      width: 190,
      render: (value: string) => <span style={{ fontFamily: "monospace" }}>{value}</span>,
    },
    { title: "订单号", dataIndex: "orderNo", width: 170 },
    {
      title: "渠道",
      dataIndex: "channel",
      width: 100,
      render: (value: string) => CHANNEL_TEXT[value] || value,
    },
    {
      title: "金额",
      dataIndex: "amount",
      width: 100,
      align: "right",
      render: (value: number) => (
        <span style={{ color: value < 0 ? "#DC2626" : undefined }}>{money(value)}</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value: string) => (
        <Tag color={value === "paid" ? "green" : value === "pending" ? "orange" : "default"}>
          {STATUS_TEXT[value] || value}
        </Tag>
      ),
    },
    { title: "操作人", dataIndex: "operatorName", width: 110, render: (value: string) => value || "-" },
    { title: "到账时间", dataIndex: "paidAt", width: 160, render: (value: string) => fmtTime(value) },
    { title: "备注", dataIndex: "note", render: (value: string) => value || "-" },
  ];

  const shareColumns: ColumnsType<ShareRow> = [
    { title: "分享人", dataIndex: "referrerPhone", width: 130 },
    {
      title: "被邀请人",
      dataIndex: "inviteePhone",
      width: 130,
      render: (value: string | null) => value || "-",
    },
    { title: "邀请码", dataIndex: "shareCode", width: 100 },
    { title: "订单号", dataIndex: "orderNo", width: 160, render: (value: string) => value || "-" },
    { title: "绑定时间", dataIndex: "boundAt", width: 160, render: (value: string) => fmtTime(value) },
    {
      title: "入库生效",
      width: 100,
      render: (_: unknown, row) => (
        <Tag color={row.status === "valid" ? "green" : "default"}>
          {row.status === "valid" ? "是" : "否"}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value: string) => {
        const meta = SHARE_STATUS_TEXT[value] || { text: value, color: "default" };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: "奖励（发放/可用/已用）",
      width: 180,
      render: (_: unknown, row) => {
        const reward = row.reward;
        if (!reward) return "-";
        return `${reward.issued} / ${reward.available} / ${reward.used}`;
      },
    },
    {
      title: "风险原因",
      dataIndex: "riskReason",
      width: 130,
      render: (value: string) => value || "-",
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="待确认流水" value={pendingTotal} suffix="笔" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="待确认金额" value={pendingAmount / 100} precision={2} prefix="¥" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="台账记录" value={ledger.total} suffix="笔" />
          </Card>
        </Col>
      </Row>

      <Card
        tabList={[
          { key: "todo", label: "待办确认" },
          { key: "ledger", label: "支付台账" },
          { key: "shares", label: "邀请记录" },
        ]}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
        tabBarExtraContent={
          <Button loading={loading} onClick={refreshAll}>
            刷新
          </Button>
        }
      >
        {activeTab === "todo" ? (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="说明">
                mock 支付回调或 H5 支付成功后，待确认流水会在确认到账前保持 pending。
              </Descriptions.Item>
              <Descriptions.Item label="待确认合计">
                {pendingTotal} 笔 / {money(pendingAmount)}
              </Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={pendingRows}
              columns={pendingColumns}
              pagination={false}
              locale={{ emptyText: "暂无待确认流水" }}
            />
          </>
        ) : null}

        {activeTab === "ledger" ? (
          <>
            <Space style={{ marginBottom: 12 }} wrap>
              <Select
                allowClear
                placeholder="状态"
                value={ledgerStatus}
                style={{ width: 130 }}
                onChange={(value) => setLedgerStatus(value)}
                options={Object.keys(STATUS_TEXT).map((value) => ({
                  value,
                  label: STATUS_TEXT[value],
                }))}
              />
              <Input
                placeholder="按订单号搜索"
                value={ledgerOrderNo}
                style={{ width: 200 }}
                onChange={(event) => setLedgerOrderNo(event.target.value)}
                onPressEnter={() => loadLedger(1)}
              />
              <Button type="primary" onClick={() => loadLedger(1)}>
                查询
              </Button>
            </Space>
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={ledger.rows}
              columns={ledgerColumns}
              pagination={{
                current: ledgerPage,
                pageSize: 20,
                total: ledger.total,
                showSizeChanger: false,
                onChange: (page) => loadLedger(page),
              }}
              locale={{ emptyText: "暂无支付流水" }}
            />
          </>
        ) : null}

        {activeTab === "shares" ? (
          <>
            <Space style={{ marginBottom: 12 }} wrap>
              <Select
                allowClear
                placeholder="状态"
                value={shareStatus}
                style={{ width: 140 }}
                onChange={(value) => setShareStatus(value)}
                options={Object.entries(SHARE_STATUS_TEXT).map(([value, meta]) => ({
                  value,
                  label: meta.text,
                }))}
              />
              <Input
                placeholder="分享人手机号"
                value={shareReferrer}
                style={{ width: 160 }}
                onChange={(event) => setShareReferrer(event.target.value)}
              />
              <Input
                placeholder="被邀请人手机号"
                value={shareInvitee}
                style={{ width: 160 }}
                onChange={(event) => setShareInvitee(event.target.value)}
              />
              <DatePicker.RangePicker value={shareRange} onChange={(value) => setShareRange(value)} />
              <Button type="primary" onClick={() => loadShares(1)}>
                查询
              </Button>
              <Button onClick={exportShares}>导出 CSV</Button>
            </Space>
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={shares.rows}
              columns={shareColumns}
              scroll={{ x: 1200 }}
              pagination={{
                current: sharePage,
                pageSize: 20,
                total: shares.total,
                showSizeChanger: false,
                onChange: (page) => loadShares(page),
              }}
              locale={{ emptyText: "暂无邀请记录" }}
            />
          </>
        ) : null}
      </Card>
    </div>
  );
};

export default PaymentsPage;
