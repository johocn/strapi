import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, TextInput, Field,
  SingleSelect, SingleSelectOption,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const statusLabels: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
};

const statusColors: Record<string, string> = {
  pending: "warning600",
  approved: "primary600",
  rejected: "danger600",
  shipped: "success600",
  completed: "success600",
  cancelled: "neutral600",
};

const RedemptionPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [expressCompany, setExpressCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any>(null);

  const { get, put } = useFetchClient();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/point-redemptions`, { params });
      setOrders(data.records || []);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const openReview = (order: any) => {
    setSelectedOrder(order);
    setReviewStatus("");
    setExpressCompany("");
    setTrackingNumber("");
    setReviewModalOpen(true);
  };

  const openDetail = (order: any) => {
    setDetailOrder(order);
    setDetailModalOpen(true);
  };

  const handleReview = async () => {
    if (!selectedOrder || !reviewStatus) return;
    try {
      const body: any = { status: reviewStatus };
      if (reviewStatus === "shipped") {
        body.expressCompany = expressCompany;
        body.trackingNumber = trackingNumber;
      }
      await put(`/admin/plugins/${PLUGIN_ID}/point-redemptions/${selectedOrder.id}`, body);
      setReviewModalOpen(false);
      fetchOrders();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getNextActions = (status: string) => {
    const actions: Record<string, string[]> = {
      pending: ["approved", "rejected"],
      approved: ["shipped", "cancelled"],
      shipped: ["completed"],
    };
    return actions[status] || [];
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Typography variant="alpha">兑换管理</Typography>

          <Box width="200px">
            <SingleSelect
              placeholder="状态筛选"
              value={statusFilter}
              onChange={(v: string | number) => { setStatusFilter(String(v || "")); setPage(1); }}
            >
              <SingleSelectOption value="">全部</SingleSelectOption>
              <SingleSelectOption value="pending">待审核</SingleSelectOption>
              <SingleSelectOption value="approved">已通过</SingleSelectOption>
              <SingleSelectOption value="shipped">已发货</SingleSelectOption>
              <SingleSelectOption value="completed">已完成</SingleSelectOption>
              <SingleSelectOption value="rejected">已驳回</SingleSelectOption>
              <SingleSelectOption value="cancelled">已取消</SingleSelectOption>
            </SingleSelect>
          </Box>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : orders.length === 0 ? (
            <EmptyStateLayout content="暂无兑换记录" />
          ) : (
            <>
              <Table colCount={8} rowCount={orders.length}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">商品</Typography></Th>
                    <Th><Typography variant="sigma">用户</Typography></Th>
                    <Th><Typography variant="sigma">数量</Typography></Th>
                    <Th><Typography variant="sigma">积分</Typography></Th>
                    <Th><Typography variant="sigma">配送方式</Typography></Th>
                    <Th><Typography variant="sigma">状态</Typography></Th>
                    <Th><Typography variant="sigma">时间</Typography></Th>
                    <Th><Typography variant="sigma">操作</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {orders.map((o: any) => (
                    <Tr key={o.id}>
                      <Td><Typography variant="pi" fontWeight="bold">{o.itemName}</Typography></Td>
                      <Td><Typography variant="pi">{o.user?.id || o.user}</Typography></Td>
                      <Td><Typography variant="pi">{o.quantity || 1}</Typography></Td>
                      <Td><Typography variant="pi">{o.totalCost || o.pointsCost}</Typography></Td>
                      <Td><Typography variant="pi">{o.deliveryType === "express" ? "快递" : o.deliveryType === "self_pickup" ? "自提" : "-"}</Typography></Td>
                      <Td>
                        <Badge textColor={statusColors[o.status] || "neutral600"}>
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </Td>
                      <Td><Typography variant="pi">{new Date(o.createdAt).toLocaleDateString()}</Typography></Td>
                      <Td>
                        <Flex gap={2}>
                          <Button size="S" variant="secondary" onClick={() => openDetail(o)}>详情</Button>
                          {getNextActions(o.status).length > 0 && (
                            <Button size="S" onClick={() => openReview(o)}>审核</Button>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="pi">共 {total} 条记录</Typography>
                <Flex gap={2}>
                  <Button variant="tertiary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    上一页
                  </Button>
                  <Typography variant="pi">{page} / {totalPages}</Typography>
                  <Button variant="tertiary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    下一页
                  </Button>
                </Flex>
              </Flex>
            </>
          )}
        </Flex>
      </Box>

      {reviewModalOpen && selectedOrder && (
        <Modal.Root open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>审核兑换: {selectedOrder.itemName}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>审核结果</Field.Label>
                  <SingleSelect value={reviewStatus} onChange={(v: string | number) => setReviewStatus(String(v))}>
                    {getNextActions(selectedOrder.status).map((s) => (
                      <SingleSelectOption key={s} value={s}>
                        {statusLabels[s] || s}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>

                {reviewStatus === "shipped" && (
                  <>
                    <Field.Root>
                      <Field.Label>快递公司</Field.Label>
                      <TextInput value={expressCompany} onChange={(e: any) => setExpressCompany(e.target.value)} />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>快递单号</Field.Label>
                      <TextInput value={trackingNumber} onChange={(e: any) => setTrackingNumber(e.target.value)} />
                    </Field.Root>
                  </>
                )}
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleReview}>确认</Button>
              <Button variant="tertiary" onClick={() => setReviewModalOpen(false)}>取消</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}

      {detailModalOpen && detailOrder && (
        <Modal.Root open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>兑换详情</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={3}>
                <Typography><strong>商品:</strong> {detailOrder.itemName}</Typography>
                <Typography><strong>积分数:</strong> {detailOrder.totalCost || detailOrder.pointsCost}</Typography>
                <Typography><strong>数量:</strong> {detailOrder.quantity || 1}</Typography>
                <Typography><strong>状态:</strong> {statusLabels[detailOrder.status]}</Typography>
                <Typography><strong>配送方式:</strong> {detailOrder.deliveryType === "express" ? "快递配送" : detailOrder.deliveryType === "self_pickup" ? "到店自提" : "未指定"}</Typography>
                {detailOrder.deliveryType === "express" && (
                  <>
                    <Typography><strong>收件人:</strong> {detailOrder.receiverName || "-"}</Typography>
                    <Typography><strong>电话:</strong> {detailOrder.receiverPhone || "-"}</Typography>
                    <Typography><strong>地址:</strong> {detailOrder.receiverAddress || "-"}</Typography>
                    <Typography><strong>快递公司:</strong> {detailOrder.expressCompany || "-"}</Typography>
                    <Typography><strong>快递单号:</strong> {detailOrder.trackingNumber || "-"}</Typography>
                  </>
                )}
                <Typography><strong>备注:</strong> {detailOrder.remark || "-"}</Typography>
                <Typography><strong>创建时间:</strong> {new Date(detailOrder.createdAt).toLocaleString()}</Typography>
                {detailOrder.completedAt && (
                  <Typography><strong>完成时间:</strong> {new Date(detailOrder.completedAt).toLocaleString()}</Typography>
                )}
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onClick={() => setDetailModalOpen(false)}>关闭</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { RedemptionPage };
