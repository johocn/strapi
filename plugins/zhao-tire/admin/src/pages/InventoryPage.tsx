import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from "antd";
import { BellOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { StatusTag } from "../components/StatusTag";
import { usePermissions } from "../components/Layout";
import { errorMessage, useTireApi } from "../utils/api";
import {
  OUTBOUND_TEXT,
  SERVICE_TEXT,
  WARM,
  dateText,
  dateTimeText,
  remainingColor,
  remainingText,
} from "../utils/constants";

const { Text } = Typography;

type InventoryTab = "stored" | "expiring";

const InventoryPage = () => {
  const api = useTireApi();
  const { canFull } = usePermissions();

  const [tab, setTab] = useState<InventoryTab>("stored");
  const [locationCode, setLocationCode] = useState("");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState<{ locationCode?: string; keyword?: string }>(
    {}
  );
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [reminding, setReminding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === "stored") {
        const result = await api.listInventory({
          ...query,
          page,
          pageSize,
        });
        setRows(result?.data || []);
        setTotal(Number(result?.pagination?.total) || 0);
      } else {
        const result = await api.listExpiring({ ...query, days });
        const keyword = String(query.keyword || "").toLowerCase();
        const list = (result?.data || []).filter((item: any) => {
          if (!keyword) return true;
          return [
            item.phone,
            item.plateNo,
            item.customerName,
            item.orderNo,
          ]
            .map((value) => String(value || "").toLowerCase())
            .some((value) => value.includes(keyword));
        });
        setRows(list);
        setTotal(list.length);
      }
    } catch (error) {
      message.error(`加载库存失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [
    tab,
    page,
    pageSize,
    days,
    query.locationCode,
    query.keyword,
  ]);

  const search = () => {
    setPage(1);
    setSelectedKeys([]);
    setQuery({
      locationCode: locationCode.trim() || undefined,
      keyword: keyword.trim() || undefined,
    });
  };

  const reset = () => {
    setLocationCode("");
    setKeyword("");
    setPage(1);
    setSelectedKeys([]);
    setQuery({});
  };

  const remind = async () => {
    if (selectedKeys.length === 0) {
      message.warning("请先勾选需要提醒的订单");
      return;
    }
    setReminding(true);
    try {
      const result = await api.remindInventory(
        selectedKeys.map((key) => Number(key))
      );
      message.success(
        `已生成提醒：排队 ${result?.queued || 0} 条，跳过 ${
          result?.skipped || 0
        } 条`
      );
      setSelectedKeys([]);
      await load();
    } catch (error) {
      message.error(`生成提醒失败：${errorMessage(error)}`);
    } finally {
      setReminding(false);
    }
  };

  const columns = [
    {
      title: "仓位编号",
      dataIndex: "locationCode",
      width: 120,
      render: (value: string) => value || "-",
    },
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 150,
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
      title: "入库时间",
      dataIndex: "inboundAt",
      width: 150,
      render: (value: string) => dateTimeText(value),
    },
    {
      title: "到期日",
      dataIndex: "expireAt",
      width: 120,
      render: (value: string) => dateText(value),
    },
    {
      title: "剩余",
      dataIndex: "remainingDays",
      width: 110,
      render: (value: number) => (
        <Text style={{ color: remainingColor(value), fontWeight: 500 }}>
          {remainingText(value)}
        </Text>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value: string, record: any) => (
        <Space direction="vertical" size={0}>
          <StatusTag status={value} />
          {record.outboundRequestStatus === "pending" ? (
            <Text style={{ fontSize: 12, color: WARM }}>出库待审</Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "出库申请",
      dataIndex: "outboundRequestStatus",
      width: 100,
      render: (value: string) =>
        OUTBOUND_TEXT[value] || value || "未申请",
    },
    {
      title: "轮胎规格",
      dataIndex: "tireSpec",
      width: 130,
      render: (value: string) => value || "-",
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card styles={{ body: { padding: 16 } }}>
        <Space wrap size={12}>
          <Input
            allowClear
            placeholder="仓位编号"
            value={locationCode}
            onChange={(event) => setLocationCode(event.target.value)}
            onPressEnter={search}
            style={{ width: 160 }}
          />
          <Input
            allowClear
            placeholder="手机号 / 车牌 / 订单号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={search}
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={search}>
            查询
          </Button>
          <Button onClick={reset}>重置</Button>
          <Button icon={<ReloadOutlined />} onClick={() => load()}>
            刷新
          </Button>
          {canFull ? (
            <Popconfirm
              title={`为已选 ${selectedKeys.length} 单生成提醒？`}
              onConfirm={remind}
              disabled={selectedKeys.length === 0}
            >
              <Button
                icon={<BellOutlined />}
                loading={reminding}
                disabled={selectedKeys.length === 0}
              >
                批量生成提醒（{selectedKeys.length}）
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      </Card>

      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          activeKey={tab}
          onChange={(key) => {
            setTab(key as InventoryTab);
            setPage(1);
            setSelectedKeys([]);
          }}
          items={[
            {
              key: "stored",
              label: "在存",
            },
            {
              key: "expiring",
              label: "临期超期",
            },
          ]}
          tabBarExtraContent={
            tab === "expiring" ? (
              <Space>
                <Text type="secondary">预警范围</Text>
                <Select
                  value={days}
                  onChange={(value) => {
                    setDays(value);
                    setPage(1);
                    setSelectedKeys([]);
                  }}
                  style={{ width: 130 }}
                  options={[
                    { value: 7, label: "7 天内" },
                    { value: 15, label: "15 天内" },
                    { value: 30, label: "30 天内" },
                    { value: 60, label: "60 天内" },
                  ]}
                />
              </Space>
            ) : null
          }
        />
        {tab === "expiring" ? (
          <Text type="secondary">
            共 {total} 单（含超期，按到期日升序）
          </Text>
        ) : null}
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns as any}
          dataSource={rows}
          scroll={{ x: 1280 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys),
          }}
          pagination={
            tab === "stored"
              ? {
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  showTotal: (value) => `共 ${value} 单`,
                  onChange: (nextPage, nextPageSize) => {
                    setPage(nextPage);
                    setPageSize(nextPageSize);
                  },
                }
              : false
          }
        />
      </Card>
    </Space>
  );
};

export default InventoryPage;
