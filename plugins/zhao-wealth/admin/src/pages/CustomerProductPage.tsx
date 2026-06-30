import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, SingleSelect, SingleSelectOption,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const CustomerProductPage = () => {
  const [customerProducts, setCustomerProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>("");
  const { get } = useFetchClient();

  const fetchCustomerProducts = async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 100 };
      if (filterChannel) params.channelId = filterChannel;
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/customer-products`, { params });
      setCustomerProducts(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerProducts();
  }, [filterChannel]);

  // 按产品统计
  const productStats: Record<number, { productName: string; count: number }> = {};
  customerProducts.forEach((cp: any) => {
    const productId = cp.product?.id;
    if (!productStats[productId]) {
      productStats[productId] = {
        productName: cp.product?.productName || "未知产品",
        count: 0,
      };
    }
    productStats[productId].count++;
  });

  const statsArray = Object.values(productStats).sort((a, b) => b.count - a.count);

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Typography variant="alpha">客户自选产品统计</Typography>

          <Typography variant="beta" fontWeight="bold">产品关注热度排名</Typography>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : statsArray.length === 0 ? (
            <EmptyStateLayout content="暂无客户自选数据" />
          ) : (
            <Table colCount={2} rowCount={statsArray.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">产品名称</Typography></Th>
                  <Th><Typography variant="sigma">关注人数</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {statsArray.map((stat, index) => (
                  <Tr key={index}>
                    <Td><Typography variant="pi" fontWeight="bold">{stat.productName}</Typography></Td>
                    <Td>
                      <Badge textColor={stat.count > 10 ? "success600" : stat.count > 5 ? "warning600" : "neutral600"}>
                        {stat.count} 人
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}

          <Typography variant="beta" fontWeight="bold" marginTop={4}>自选记录列表</Typography>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : customerProducts.length === 0 ? (
            <EmptyStateLayout content="暂无自选记录" />
          ) : (
            <Table colCount={5} rowCount={customerProducts.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">用户</Typography></Th>
                  <Th><Typography variant="sigma">产品</Typography></Th>
                  <Th><Typography variant="sigma">渠道</Typography></Th>
                  <Th><Typography variant="sigma">关注时间</Typography></Th>
                  <Th><Typography variant="sigma">备注</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {customerProducts.map((cp: any) => (
                  <Tr key={cp.id}>
                    <Td><Typography variant="pi">{cp.user?.username || cp.user?.id || "-"}</Typography></Td>
                    <Td><Typography variant="pi" fontWeight="bold">{cp.product?.productName || "-"}</Typography></Td>
                    <Td><Typography variant="pi">{cp.channel?.name || "-"}</Typography></Td>
                    <Td><Typography variant="pi">{cp.followTime ? new Date(cp.followTime).toLocaleString() : "-"}</Typography></Td>
                    <Td><Typography variant="pi">{cp.remark || "-"}</Typography></Td>
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

export { CustomerProductPage };