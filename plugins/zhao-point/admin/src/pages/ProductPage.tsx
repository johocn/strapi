import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, TextInput, Field,
  SingleSelect, SingleSelectOption,
} from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { useNavigate } from "react-router-dom";
import { PLUGIN_ID } from "../pluginId";

const ProductPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockDelta, setStockDelta] = useState("");
  const { get, post, put, del } = useFetchClient();
  const navigate = useNavigate();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products`, { params: { pageSize: 100 } });
      setProducts(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "on_shelf" ? "off_shelf" : "on_shelf";
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/products/${id}`, { status: newStatus });
      fetchProducts();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleStockAdjust = async () => {
    if (!selectedProduct) return;
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/products/${selectedProduct.id}/stock`, {
        delta: parseInt(stockDelta),
      });
      setStockModalOpen(false);
      setSelectedProduct(null);
      setStockDelta("");
      fetchProducts();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此商品？")) return;
    try {
      await del(`/admin/plugins/${PLUGIN_ID}/products/${id}`);
      fetchProducts();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Flex justifyContent="space-between">
            <Typography variant="alpha">积分商城</Typography>
            <Button onClick={() => navigate("/plugins/" + PLUGIN_ID + "/products/new")}>
              新建商品
            </Button>
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : products.length === 0 ? (
            <EmptyStateLayout content="暂无商品" />
          ) : (
            <Table colCount={6} rowCount={products.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">商品名称</Typography></Th>
                  <Th><Typography variant="sigma">所需积分</Typography></Th>
                  <Th><Typography variant="sigma">库存</Typography></Th>
                  <Th><Typography variant="sigma">配送方式</Typography></Th>
                  <Th><Typography variant="sigma">状态</Typography></Th>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {products.map((p: any) => (
                  <Tr key={p.id}>
                    <Td><Typography variant="pi" fontWeight="bold">{p.name}</Typography></Td>
                    <Td><Typography variant="pi">{p.pointsCost}</Typography></Td>
                    <Td>
                      <Typography variant="pi">{p.stock >= 0 ? p.stock : "不限"}</Typography>
                    </Td>
                    <Td><Typography variant="pi">{p.deliveryType}</Typography></Td>
                    <Td>
                      <Badge textColor={p.status === "on_shelf" ? "success600" : "neutral600"}>
                        {p.status === "on_shelf" ? "上架中" : "已下架"}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Button size="S" variant="secondary" onClick={() => navigate(`/plugins/${PLUGIN_ID}/products/${p.id}/edit`)}>
                          编辑
                        </Button>
                        <Button size="S" variant="secondary" onClick={() => toggleStatus(p.id, p.status)}>
                          {p.status === "on_shelf" ? "下架" : "上架"}
                        </Button>
                        <Button size="S" variant="secondary" onClick={() => {
                          setSelectedProduct(p);
                          setStockModalOpen(true);
                        }}>
                          调库存
                        </Button>
                        <Button size="S" variant="danger-light" onClick={() => handleDelete(p.id)}>
                          删除
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Flex>
      </Box>

      {stockModalOpen && (
        <Modal.Root open={stockModalOpen} onOpenChange={setStockModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>调整库存: {selectedProduct?.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Field.Root>
                <Field.Label>库存变动</Field.Label>
                <TextInput
                  value={stockDelta}
                  onChange={(e: any) => setStockDelta(e.target.value)}
                  placeholder="正数增加，负数减少"
                />
              </Field.Root>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleStockAdjust}>确认</Button>
              <Button variant="tertiary" onClick={() => setStockModalOpen(false)}>取消</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { ProductPage };
