import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, TextInput, Field,
  SingleSelect, SingleSelectOption, DatePicker,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const NavDataPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [navData, setNavData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    navDate: new Date(),
    unitNav: "",
    accNav: "",
    dataSource: "manual",
  });
  const { get, post, put } = useFetchClient();

  const fetchProducts = async () => {
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products`, { params: { pageSize: 100 } });
      setProducts(data.records || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNavData = async (productId: number) => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, { params: { pageSize: 100 } });
      setNavData(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchNavData(selectedProduct);
    } else {
      setNavData([]);
    }
  }, [selectedProduct]);

  const handleAddNav = async () => {
    if (!selectedProduct) {
      alert("请先选择产品");
      return;
    }
    try {
      const submitData = {
        navDate: formData.navDate.toISOString().split("T")[0],
        unitNav: parseFloat(formData.unitNav) || null,
        accNav: parseFloat(formData.accNav) || null,
        dataSource: formData.dataSource,
      };
      await post(`/admin/plugins/${PLUGIN_ID}/products/${selectedProduct}/nav`, submitData);
      setModalOpen(false);
      setFormData({ navDate: new Date(), unitNav: "", accNav: "", dataSource: "manual" });
      fetchNavData(selectedProduct);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedProduct) {
      alert("请先选择产品");
      return;
    }
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/recalculate`, { productId: selectedProduct });
      alert("重算任务已触发");
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Typography variant="alpha">净值数据管理</Typography>

          <Flex gap={4}>
            <SingleSelect
              value={selectedProduct}
              onChange={(value: any) => setSelectedProduct(value)}
              placeholder="请选择产品"
            >
              {products.map((p) => (
                <SingleSelectOption key={p.id} value={p.id}>{p.productName}</SingleSelectOption>
              ))}
            </SingleSelect>
            <Button onClick={() => setModalOpen(true)} disabled={!selectedProduct}>
              新增净值
            </Button>
            <Button variant="secondary" onClick={handleRecalculate} disabled={!selectedProduct}>
              重算年化
            </Button>
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : !selectedProduct ? (
            <EmptyStateLayout content="请先选择产品" />
          ) : navData.length === 0 ? (
            <EmptyStateLayout content="暂无净值数据" />
          ) : (
            <Table colCount={5} rowCount={navData.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">日期</Typography></Th>
                  <Th><Typography variant="sigma">单位净值</Typography></Th>
                  <Th><Typography variant="sigma">累计净值</Typography></Th>
                  <Th><Typography variant="sigma">数据来源</Typography></Th>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {navData.map((n: any) => (
                  <Tr key={n.id}>
                    <Td><Typography variant="pi">{n.navDate}</Typography></Td>
                    <Td><Typography variant="pi">{n.unitNav || "-"}</Typography></Td>
                    <Td><Typography variant="pi">{n.accNav || "-"}</Typography></Td>
                    <Td>
                      <Badge textColor="neutral600">{n.dataSource === "crawler" ? "爬虫" : "手动"}</Badge>
                    </Td>
                    <Td>
                      <Button size="S" variant="secondary">编辑</Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Flex>
      </Box>

      {modalOpen && (
        <Modal.Root open={modalOpen} onOpenChange={setModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>新增净值数据</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>日期 *</Field.Label>
                  <DatePicker
                    value={formData.navDate}
                    onChange={(date: any) => setFormData({ ...formData, navDate: date })}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>单位净值</Field.Label>
                  <TextInput
                    type="number"
                    value={formData.unitNav}
                    onChange={(e: any) => setFormData({ ...formData, unitNav: e.target.value })}
                    placeholder="请输入单位净值"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>累计净值</Field.Label>
                  <TextInput
                    type="number"
                    value={formData.accNav}
                    onChange={(e: any) => setFormData({ ...formData, accNav: e.target.value })}
                    placeholder="请输入累计净值"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>数据来源</Field.Label>
                  <SingleSelect
                    value={formData.dataSource}
                    onChange={(value: any) => setFormData({ ...formData, dataSource: value })}
                  >
                    <SingleSelectOption value="manual">手动录入</SingleSelectOption>
                    <SingleSelectOption value="crawler">爬虫采集</SingleSelectOption>
                  </SingleSelect>
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleAddNav}>保存</Button>
              <Button variant="tertiary" onClick={() => setModalOpen(false)}>取消</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { NavDataPage };