import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardBody,
  Button,
  Loader,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
} from "@strapi/design-system";
import { ArrowClockwise } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { API_PREFIX } from "./HomePage";

export const DashboardTab = () => {
  const { get } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [channelReport, setChannelReport] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, reportRes] = await Promise.all([
        get(`${API_PREFIX}/dashboard`),
        get(`${API_PREFIX}/channel-report`),
      ]);
      setStats(dashRes.data?.stats || null);
      setChannelReport(reportRes.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader>加载中...</Loader>;

  const cards = [
    { label: "总用户数", value: stats?.totalUsers || 0, color: undefined },
    { label: "活跃用户", value: stats?.activeUsers || 0, color: "success600" },
    { label: "封禁用户", value: stats?.blockedUsers || 0, color: "danger600" },
    { label: "今日登录", value: stats?.todayLogins || 0, color: "primary600" },
    { label: "应用数", value: stats?.totalApps || 0, color: undefined },
    { label: "渠道数", value: stats?.totalChannels || 0, color: undefined },
  ];

  return (
    <Box padding={4}>
      <Flex paddingBottom={4} justifyContent="space-between">
        <Typography variant="delta">数据概览</Typography>
        <Button variant="secondary" startIcon={<ArrowClockwise />} onClick={load}>
          刷新
        </Button>
      </Flex>

      <Grid.Root gridCols={3} gap={4}>
        {cards.map((c) => (
          <Grid.Item col={1} key={c.label}>
            <Card>
              <CardHeader>
                <Typography variant="sigma">{c.label}</Typography>
              </CardHeader>
              <CardBody>
                <Typography
                  variant="alpha"
                  fontWeight="bold"
                  textColor={c.color}
                >
                  {c.value}
                </Typography>
              </CardBody>
            </Card>
          </Grid.Item>
        ))}
      </Grid.Root>

      {channelReport.length > 0 && (
        <Box paddingTop={6}>
          <Typography variant="delta">渠道报告</Typography>
          <Box paddingTop={3} background="neutral0" borderRadius={4} shadow="filterShadow">
            <Table colCount={4} rowCount={channelReport.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">渠道编码</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">渠道名称</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">注册数</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">登录数</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {channelReport.map((ch: any) => (
                  <Tr key={ch.channel_code}>
                    <Td>
                      <Typography>{ch.channel_code}</Typography>
                    </Td>
                    <Td>
                      <Typography>{ch.channel_name}</Typography>
                    </Td>
                    <Td>
                      <Typography>{ch.registrations}</Typography>
                    </Td>
                    <Td>
                      <Typography>{ch.logins}</Typography>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};
