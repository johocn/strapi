import { useEffect, useState } from "react";
import { Main, Box, Typography, Flex, Loader, Card, Badge } from "@strapi/design-system";
import { useNavigate } from "react-router-dom";
import { PLUGIN_ID } from "../pluginId";

const HomePage = () => {
  const [stats, setStats] = useState({
    productCount: 0,
    companyCount: 0,
    collectPending: 0,
    collectSuccess: 0,
    collectFailed: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 模拟加载统计数据
    setLoading(false);
  }, []);

  const menuItems = [
    { label: "理财公司", path: "companies", icon: "🏢" },
    { label: "产品管理", path: "products", icon: "📊" },
    { label: "采集配置", path: "collect-configs", icon: "⚙️" },
    { label: "净值数据", path: "nav-data", icon: "📈" },
    { label: "推荐配置", path: "recommend", icon: "⭐" },
    { label: "客户自选", path: "customer-products", icon: "👥" },
  ];

  return (
    <Main>
      <Box padding={8}>
        <Typography variant="alpha" fontWeight="bold" tag="h1">
          理财基金管理
        </Typography>
        <Box paddingTop={1}>
          <Typography variant="epsilon" textColor="neutral600" tag="p">
            管理理财产品、净值数据、年化计算、推荐配置
          </Typography>
        </Box>

        {loading ? (
          <Loader>加载中...</Loader>
        ) : (
          <Flex direction="column" gap={6} marginTop={6}>
            {/* 统计卡片 */}
            <Flex gap={4} wrap="wrap">
              <Card padding={4} style={{ minWidth: "200px" }}>
                <Typography variant="pi" textColor="neutral600">产品总数</Typography>
                <Typography variant="delta" fontWeight="bold" marginTop={1}>{stats.productCount}</Typography>
              </Card>
              <Card padding={4} style={{ minWidth: "200px" }}>
                <Typography variant="pi" textColor="neutral600">理财公司</Typography>
                <Typography variant="delta" fontWeight="bold" marginTop={1}>{stats.companyCount}</Typography>
              </Card>
              <Card padding={4} style={{ minWidth: "200px" }}>
                <Typography variant="pi" textColor="neutral600">采集状态</Typography>
                <Flex gap={2} marginTop={1}>
                  <Badge textColor="success600">成功 {stats.collectSuccess}</Badge>
                  <Badge textColor="warning600">待采 {stats.collectPending}</Badge>
                  <Badge textColor="danger600">失败 {stats.collectFailed}</Badge>
                </Flex>
              </Card>
            </Flex>

            {/* 功能入口 */}
            <Typography variant="beta" fontWeight="bold">功能入口</Typography>
            <Flex gap={4} wrap="wrap">
              {menuItems.map((item) => (
                <Card
                  key={item.path}
                  padding={4}
                  style={{ minWidth: "180px", cursor: "pointer" }}
                  onClick={() => navigate(`/plugins/${PLUGIN_ID}/${item.path}`)}
                >
                  <Typography variant="pi" fontWeight="bold">
                    {item.icon} {item.label}
                  </Typography>
                </Card>
              ))}
            </Flex>
          </Flex>
        )}
      </Box>
    </Main>
  );
};

export { HomePage };