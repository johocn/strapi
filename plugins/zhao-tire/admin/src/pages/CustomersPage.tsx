import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Input,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { StatusTag } from "../components/StatusTag";
import { errorMessage, useTireApi } from "../utils/api";
import {
  SERVICE_TEXT,
  dateText,
  dateTimeText,
  money,
} from "../utils/constants";

const { Text } = Typography;

const CustomersPage = () => {
  const api = useTireApi();
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.listCustomers({
        page,
        pageSize,
        keyword: query,
      });
      setRows(result?.data || []);
      setTotal(Number(result?.pagination?.total) || 0);
    } catch (error) {
      message.error(`加载客户失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, query]);

  const columns = [
    {
      title: "客户姓名",
      dataIndex: "customerName",
      width: 150,
      render: (value: string, record: any) => value || `手机号 ${record.phone}`,
    },
    { title: "手机号", dataIndex: "phone", width: 140 },
    { title: "订单数", dataIndex: "orderCount", width: 100 },
    {
      title: "在存数",
      dataIndex: "storedCount",
      width: 100,
      render: (value: number) =>
        value > 0 ? (
          <Text style={{ color: "#2563EB" }}>{value}</Text>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "累计金额",
      dataIndex: "totalAmount",
      width: 120,
      align: "right" as const,
      render: (value: number) => money(value),
    },
    { title: "最近订单号", dataIndex: "latestOrderNo", width: 160 },
    {
      title: "最近下单",
      dataIndex: "latestCreatedAt",
      width: 160,
      render: (value: string) => dateTimeText(value),
    },
    {
      title: "操作",
      width: 120,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Button size="small" type="link" onClick={() => setCurrent(record)}>
          历史订单
        </Button>
      ),
    },
  ];

  const orderColumns = [
    { title: "订单号", dataIndex: "orderNo", width: 150 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: "服务",
      dataIndex: "serviceType",
      width: 100,
      render: (value: string) => SERVICE_TEXT[value] || value,
    },
    {
      title: "车牌",
      dataIndex: "plateNo",
      width: 110,
      render: (value: string) => value || "-",
    },
    {
      title: "仓位",
      dataIndex: "locationCode",
      width: 100,
      render: (value: string) => value || "-",
    },
    {
      title: "下单时间",
      dataIndex: "createdAt",
      width: 150,
      render: (value: string) => dateTimeText(value),
    },
    {
      title: "到期日",
      dataIndex: "expireAt",
      width: 110,
      render: (value: string) => dateText(value),
    },
    {
      title: "金额",
      dataIndex: "amountTotal",
      width: 100,
      align: "right" as const,
      render: (value: number) => money(value),
    },
  ];

  return (
    <>
      <Card styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Input
            allowClear
            placeholder="手机号 / 姓名 / 车牌"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => {
              setPage(1);
              setQuery(keyword.trim() || undefined);
            }}
            style={{ width: 260 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => {
              setPage(1);
              setQuery(keyword.trim() || undefined);
            }}
          >
            查询
          </Button>
          <Button
            onClick={() => {
              setKeyword("");
              setPage(1);
              setQuery(undefined);
            }}
          >
            重置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => load()}>
            刷新
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="phone"
        size="middle"
        loading={loading}
        columns={columns as any}
        dataSource={rows}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 位客户`,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
      />

      <Drawer
        title={current ? `历史订单 · ${current.customerName || current.phone}` : "历史订单"}
        open={!!current}
        width={720}
        onClose={() => setCurrent(null)}
        styles={{ body: { padding: 24 } }}
      >
        {current ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Text type="secondary">
              手机号 {current.phone}，共 {current.orderCount} 单，累计{" "}
              {money(current.totalAmount)}
            </Text>
            <Table
              rowKey="id"
              size="small"
              columns={orderColumns as any}
              dataSource={current.orders || []}
              pagination={false}
              scroll={{ x: 1000 }}
            />
          </Space>
        ) : null}
      </Drawer>
    </>
  );
};

export default CustomersPage;
