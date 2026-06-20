import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const VerificationPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const { get } = useFetchClient();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/verifications`, {
        params: { page, pageSize },
      });
      setLogs(data.records || []);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  const statusLabels: Record<string, string> = {
    pending: "待核销",
    approved: "已核销",
    rejected: "已拒绝",
  };

  const directionLabels: Record<string, string> = {
    superior_to_subordinate: "上级→下级",
    subordinate_to_superior: "下级→上级",
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Typography variant="alpha">核销管理</Typography>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : logs.length === 0 ? (
            <EmptyStateLayout content="暂无核销记录" />
          ) : (
            <>
              <Table colCount={7} rowCount={logs.length}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">核销人</Typography></Th>
                    <Th><Typography variant="sigma">被核销用户</Typography></Th>
                    <Th><Typography variant="sigma">渠道</Typography></Th>
                    <Th><Typography variant="sigma">方向</Typography></Th>
                    <Th><Typography variant="sigma">方式</Typography></Th>
                    <Th><Typography variant="sigma">状态</Typography></Th>
                    <Th><Typography variant="sigma">时间</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map((l: any) => (
                    <Tr key={l.id}>
                      <Td><Typography variant="pi">{l.verifier?.id || l.verifier}</Typography></Td>
                      <Td><Typography variant="pi">{l.verifiedUser?.id || l.verifiedUser || "-"}</Typography></Td>
                      <Td><Typography variant="pi">{l.channel?.id || l.channel}</Typography></Td>
                      <Td><Typography variant="pi">{directionLabels[l.direction] || l.direction}</Typography></Td>
                      <Td><Typography variant="pi">{l.method === "qr_scan" ? "扫码" : "手动"}</Typography></Td>
                      <Td>
                        <Badge
                          textColor={l.status === "approved" ? "success600" : l.status === "rejected" ? "danger600" : "warning600"}
                        >
                          {statusLabels[l.status] || l.status}
                        </Badge>
                      </Td>
                      <Td><Typography variant="pi">{new Date(l.createdAt).toLocaleString()}</Typography></Td>
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
    </Main>
  );
};

export { VerificationPage };
