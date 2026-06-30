import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, SingleSelect, SingleSelectOption,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { useNavigate } from "react-router-dom";
import { PLUGIN_ID } from "../pluginId";

const PRODUCT_TYPES: Record<string, string> = {
  "bank-wealth": "银行理财",
  "stock-fund": "股票基金",
  "bond-fund": "债券基金",
  "mixed-fund": "混合基金",
  "money-fund": "货币基金",
};

const RISK_LEVELS: Record<string, string> = {
  "R1": "低风险",
  "R2": "中低风险",
  "R3": "中风险",
  "R4": "中高风险",
  "R5": "高风险",
};

const ProductPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");
  const { get, del, put } = useFetchClient();
  const navigate = useNavigate();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 100 };
      if (filterType) params.productType = filterType;
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products`, { params });
      setProducts(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterType]);

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/products/${id}`, { status: !currentStatus });
      fetchProducts();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此产品？")) return;
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
            <Typography variant="alpha">产品管理</Typography>
            <Button onClick={() => navigate(`/plugins/${PLUGIN_ID}/products/new`)}>
              新建产品
            </Button>
          </Flex>

          <Flex gap={4}>
            <SingleSelect value={filterType} onChange={(value: string | number) => setFilterType(String(value))} placeholder="筛选产品类型">
              <SingleSelectOption value="">全部</SingleSelectOption>
              {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
                <SingleSelectOption key={key} value={key}>{label}</SingleSelectOption>
              ))}
            </SingleSelect>
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : products.length === 0 ? (
            <EmptyStateLayout content="暂无产品" />
          ) : (
            <Table colCount={7} rowCount={products.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">产品名称</Typography></Th>
                  <Th><Typography variant="sigma">产品代码</Typography></Th>
                  <Th><Typography variant="sigma">类型</Typography></Th>
                  <Th><Typography variant="sigma">风险等级</Typography></Th>
                  <Th><Typography variant="sigma">发行机构</Typography></Th>
                  <Th><Typography variant="sigma">状态</Typography></Th>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {products.map((p: any) => (
                  <Tr key={p.id}>
                    <Td><Typography variant="pi" fontWeight="bold">{p.productName}</Typography></Td>
                    <Td><Typography variant="pi">{p.productCode}</Typography></Td>
                    <Td>
                      <Badge textColor="neutral600">{PRODUCT_TYPES[p.productType] || p.productType}</Badge>
                    </Td>
                    <Td>
                      <Badge textColor={p.riskLevel === "R1" ? "success600" : p.riskLevel === "R5" ? "danger600" : "neutral600"}>
                        {RISK_LEVELS[p.riskLevel] || p.riskLevel}
                      </Badge>
                    </Td>
                    <Td><Typography variant="pi">{p.company?.name || "-"}</Typography></Td>
                    <Td>
                      <Badge textColor={p.status ? "success600" : "neutral600"}>
                        {p.status ? "启用" : "停用"}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Button size="S" variant="secondary" onClick={() => navigate(`/plugins/${PLUGIN_ID}/products/${p.id}/edit`)}>
                          编辑
                        </Button>
                        <Button size="S" variant="secondary" onClick={() => navigate(`/plugins/${PLUGIN_ID}/nav-data?productId=${p.id}`)}>
                          净值
                        </Button>
                        <Button size="S" variant="secondary" onClick={() => handleToggleStatus(p.id, p.status)}>
                          {p.status ? "停用" : "启用"}
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
    </Main>
  );
};

export { ProductPage };