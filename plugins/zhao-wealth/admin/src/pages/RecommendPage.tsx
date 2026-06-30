import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, TextInput, Field,
  SingleSelect, SingleSelectOption, Textarea, Toggle,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const RecommendPage = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    product: "",
    recommendOrder: 0,
    recommendReason: "",
    status: true,
  });
  const { get, post, put, del } = useFetchClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configsRes, productsRes] = await Promise.all([
        get(`/admin/plugins/${PLUGIN_ID}/recommend-configs`, { params: { pageSize: 100 } }),
        get(`/admin/plugins/${PLUGIN_ID}/products`, { params: { pageSize: 100 } }),
      ]);
      setConfigs(configsRes.data.records || []);
      setProducts(productsRes.data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditConfig(null);
    setFormData({
      product: "",
      recommendOrder: 0,
      recommendReason: "",
      status: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (config: any) => {
    setEditConfig(config);
    setFormData({
      product: config.product?.id || "",
      recommendOrder: config.recommendOrder || 0,
      recommendReason: config.recommendReason || "",
      status: config.status ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.product) {
      alert("请选择产品");
      return;
    }
    try {
      const submitData = {
        product: Number(formData.product),
        recommendOrder: formData.recommendOrder,
        recommendReason: formData.recommendReason,
        status: formData.status,
      };
      if (editConfig) {
        await put(`/admin/plugins/${PLUGIN_ID}/recommend-configs/${editConfig.id}`, submitData);
      } else {
        await post(`/admin/plugins/${PLUGIN_ID}/recommend-configs`, submitData);
      }
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此推荐配置？")) return;
    try {
      await del(`/admin/plugins/${PLUGIN_ID}/recommend-configs/${id}`);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/recommend-configs/${id}`, { status: !currentStatus });
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Flex justifyContent="space-between">
            <Typography variant="alpha">推荐配置管理</Typography>
            <Button onClick={handleCreate}>新增推荐</Button>
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : configs.length === 0 ? (
            <EmptyStateLayout content="暂无推荐配置" />
          ) : (
            <Table colCount={5} rowCount={configs.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">产品名称</Typography></Th>
                  <Th><Typography variant="sigma">排序</Typography></Th>
                  <Th><Typography variant="sigma">推荐理由</Typography></Th>
                  <Th><Typography variant="sigma">状态</Typography></Th>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {configs.map((c: any) => (
                  <Tr key={c.id}>
                    <Td><Typography variant="pi" fontWeight="bold">{c.product?.productName || "-"}</Typography></Td>
                    <Td><Typography variant="pi">{c.recommendOrder}</Typography></Td>
                    <Td><Typography variant="pi">{c.recommendReason || "-"}</Typography></Td>
                    <Td>
                      <Badge textColor={c.status ? "success600" : "neutral600"}>
                        {c.status ? "启用" : "停用"}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Button size="S" variant="secondary" onClick={() => handleEdit(c)}>
                          编辑
                        </Button>
                        <Button size="S" variant="secondary" onClick={() => handleToggleStatus(c.id, c.status)}>
                          {c.status ? "停用" : "启用"}
                        </Button>
                        <Button size="S" variant="danger-light" onClick={() => handleDelete(c.id)}>
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

      {modalOpen && (
        <Modal.Root open={modalOpen} onOpenChange={setModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>{editConfig ? "编辑推荐" : "新增推荐"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>产品 *</Field.Label>
                  <SingleSelect
                    value={formData.product}
                    onChange={(value: any) => setFormData({ ...formData, product: value })}
                    placeholder="请选择产品"
                  >
                    {products.map((p) => (
                      <SingleSelectOption key={p.id} value={p.id}>{p.productName}</SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
                <Field.Root>
                  <Field.Label>排序权重</Field.Label>
                  <TextInput
                    type="number"
                    value={formData.recommendOrder.toString()}
                    onChange={(e: any) => setFormData({ ...formData, recommendOrder: parseInt(e.target.value) || 0 })}
                    placeholder="数字越小排序越靠前"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>推荐理由</Field.Label>
                  <Textarea
                    value={formData.recommendReason}
                    onChange={(e: any) => setFormData({ ...formData, recommendReason: e.target.value })}
                    placeholder="请输入推荐理由"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>状态</Field.Label>
                  <Toggle
                    checked={formData.status}
                    onChange={() => setFormData({ ...formData, status: !formData.status })}
                    onLabel="启用"
                    offLabel="停用"
                  />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleSave}>保存</Button>
              <Button variant="tertiary" onClick={() => setModalOpen(false)}>取消</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { RecommendPage };