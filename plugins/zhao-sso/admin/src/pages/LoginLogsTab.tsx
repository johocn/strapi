import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Typography,
  Button,
  Loader,
  EmptyStateLayout,
  SingleSelect,
  SingleSelectOption,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Status,
} from "@strapi/design-system";
import { ArrowClockwise } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { API_PREFIX } from "./HomePage";

export const LoginLogsTab = () => {
  const { get } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loginType, setLoginType] = useState("");
  const [successFilter, setSuccessFilter] = useState("");

  const pageSize = 25;

  const load = useCallback(
    async (p = page, lt = loginType, sf = successFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(pageSize),
        });
        if (lt) params.set("login_type", lt);
        if (sf) params.set("success", sf);
        const { data } = await get(`${API_PREFIX}/login-logs?${params}`);
        setLogs(data?.data || []);
        setTotal(data?.meta?.pagination?.total || 0);
        setPage(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [page, loginType, successFilter]
  );

  useEffect(() => {
    load(1);
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box padding={4}>
      <Flex gap={2} paddingBottom={4} wrap="wrap">
        <SingleSelect
          value={loginType}
          onValueChange={(v: string) => {
            setLoginType(v);
            load(1, v, successFilter);
          }}
          placeholder="全部类型"
        >
          <SingleSelectOption value="password">密码登录</SingleSelectOption>
          <SingleSelectOption value="wechat">微信登录</SingleSelectOption>
          <SingleSelectOption value="alipay">支付宝登录</SingleSelectOption>
          <SingleSelectOption value="token">Token 刷新</SingleSelectOption>
        </SingleSelect>
        <SingleSelect
          value={successFilter}
          onValueChange={(v: string) => {
            setSuccessFilter(v);
            load(1, loginType, v);
          }}
          placeholder="全部结果"
        >
          <SingleSelectOption value="true">成功</SingleSelectOption>
          <SingleSelectOption value="false">失败</SingleSelectOption>
        </SingleSelect>
        <Button variant="secondary" startIcon={<ArrowClockwise />} onClick={() => load()}>
          刷新
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : logs.length === 0 ? (
        <EmptyStateLayout content="暂无登录日志" />
      ) : (
        <>
          <Box background="neutral0" borderRadius={4} shadow="filterShadow">
            <Table colCount={8} rowCount={logs.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">ID</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">用户</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">登录类型</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">结果</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">IP</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">User-Agent</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">渠道</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">时间</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {logs.map((log: any) => (
                  <Tr key={log.id}>
                    <Td>
                      <Typography>{log.id}</Typography>
                    </Td>
                    <Td>
                      <Typography>
                        {log.user?.nickname ||
                          log.user?.username ||
                          log.user?.email ||
                          log.user_id ||
                          "-"}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>{log.login_type}</Typography>
                    </Td>
                    <Td>
                      <Status variant={log.success ? "success" : "danger"}>
                        <Typography>
                          {log.success ? "成功" : "失败"}
                        </Typography>
                      </Status>
                    </Td>
                    <Td>
                      <Typography>{log.ip || "-"}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {log.user_agent || "-"}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>{log.channel_code || "-"}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : "-"}
                      </Typography>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Flex
            paddingTop={4}
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="omega">
              共 {total} 条，第 {page}/{totalPages} 页
            </Typography>
            <Flex gap={2}>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => load(page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
              >
                下一页
              </Button>
            </Flex>
          </Flex>
        </>
      )}
    </Box>
  );
};
