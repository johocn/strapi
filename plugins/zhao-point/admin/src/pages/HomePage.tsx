import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Grid, Card, CardBody, CardHeader,
  Button, Loader, EmptyStateLayout,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { useNavigate } from "react-router-dom";
import { PLUGIN_ID } from "../pluginId";

const HomePage = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get } = useFetchClient();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await get(`/admin/plugins/${PLUGIN_ID}/dashboard`);
        setStats(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [get]);

  if (loading) return <Loader>加载中...</Loader>;
  if (error) return <EmptyStateLayout content={`加载失败: ${error}`} />;

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={6} alignItems="stretch">
          <Typography variant="alpha">积分管理概览</Typography>

          <Grid.Root gridCols={4} gap={4}>
            <Grid.Item col={1}>
              <Card>
                <CardHeader>
                  <Typography variant="sigma">今日活跃用户</Typography>
                </CardHeader>
                <CardBody>
                  <Typography variant="alpha" fontWeight="bold">{stats?.activeUsersToday || 0}</Typography>
                </CardBody>
              </Card>
            </Grid.Item>
            <Grid.Item col={1}>
              <Card>
                <CardHeader>
                  <Typography variant="sigma">累计发放积分</Typography>
                </CardHeader>
                <CardBody>
                  <Typography variant="alpha" fontWeight="bold">{stats?.totalPointsIssued?.toLocaleString() || 0}</Typography>
                </CardBody>
              </Card>
            </Grid.Item>
            <Grid.Item col={1}>
              <Card>
                <CardHeader>
                  <Typography variant="sigma">累计消耗积分</Typography>
                </CardHeader>
                <CardBody>
                  <Typography variant="alpha" fontWeight="bold">{stats?.totalPointsSpent?.toLocaleString() || 0}</Typography>
                </CardBody>
              </Card>
            </Grid.Item>
            <Grid.Item col={1}>
              <Card>
                <CardHeader>
                  <Typography variant="sigma">待处理兑换</Typography>
                </CardHeader>
                <CardBody>
                  <Typography variant="alpha" fontWeight="bold" textColor={stats?.pendingRedemptions > 0 ? "danger600" : undefined}>
                    {stats?.pendingRedemptions || 0}
                  </Typography>
                </CardBody>
              </Card>
            </Grid.Item>
          </Grid.Root>

          {stats?.expiringSoonPoints > 0 && (
            <Box padding={4} background="warning100" borderColor="warning600" borderStyle="solid" borderWidth="1px" borderRadius={4}>
              <Typography textColor="warning600" fontWeight="bold">
                即将过期积分: {stats.expiringSoonPoints.toLocaleString()} 分
              </Typography>
            </Box>
          )}

          <Flex gap={4} wrap="wrap">
            <Button onClick={() => navigate("records")}>积分记录</Button>
            <Button onClick={() => navigate("rules")} variant="secondary">积分规则</Button>
            <Button onClick={() => navigate("redemptions")} variant="secondary">兑换管理</Button>
            <Button onClick={() => navigate("products")} variant="secondary">积分商城</Button>
            <Button onClick={() => navigate("verifications")} variant="secondary">核销管理</Button>
            <Button onClick={() => navigate("config")} variant="tertiary">系统配置</Button>
          </Flex>

          {stats?.topEarnActions?.length > 0 && (
            <Box>
              <Typography variant="delta" paddingBottom={3}>今日热门操作</Typography>
              <Grid.Root gridCols={2} gap={3}>
                {stats.topEarnActions.map((item: any) => (
                  <Grid.Item col={1} key={item.action}>
                    <Card>
                      <CardBody>
                        <Typography variant="pi">{item.action}</Typography>
                        <Typography variant="epsilon" fontWeight="bold">
                          {item.totalPoints} 积分 ({item.count} 次)
                        </Typography>
                      </CardBody>
                    </Card>
                  </Grid.Item>
                ))}
              </Grid.Root>
            </Box>
          )}
        </Flex>
      </Box>
    </Main>
  );
};

export { HomePage };
