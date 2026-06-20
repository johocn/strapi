import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Switch,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const TAB_LIST = [
  { value: "increase", label: "增加规则" },
  { value: "decrease", label: "扣除规则" },
];

const PointRulePage = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("increase");
  const { get, put } = useFetchClient();

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/point-rules`, {
        params: { category: tab },
      });
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [tab]);

  const toggleEnabled = async (action: string, enabled: boolean) => {
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/point-rules/${action}`, { enabled });
      setRules((prev) =>
        prev.map((r) => (r.action === action ? { ...r, enabled } : r))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Typography variant="alpha">积分规则管理</Typography>

          <Flex gap={2} wrap="wrap">
            {TAB_LIST.map((t) => (
              <Button
                key={t.value}
                variant={tab === t.value ? "default" : "secondary"}
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : rules.length === 0 ? (
            <EmptyStateLayout content="暂无规则" />
          ) : (
            <Table colCount={6} rowCount={rules.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                  <Th><Typography variant="sigma">描述</Typography></Th>
                  <Th><Typography variant="sigma">积分值</Typography></Th>
                  <Th><Typography variant="sigma">每日上限</Typography></Th>
                  <Th><Typography variant="sigma">一次性</Typography></Th>
                  <Th><Typography variant="sigma">启用</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {rules.map((r: any) => (
                  <Tr key={r.action}>
                    <Td><Typography variant="pi" fontWeight="bold">{r.action}</Typography></Td>
                    <Td><Typography variant="pi">{r.description}</Typography></Td>
                    <Td><Typography variant="pi">{r.points}</Typography></Td>
                    <Td><Typography variant="pi">{r.limitPerDay > 0 ? r.limitPerDay : "不限"}</Typography></Td>
                    <Td><Typography variant="pi">{r.isOneTime ? "是" : "否"}</Typography></Td>
                    <Td>
                      <Switch
                        checked={r.enabled}
                        onCheckedChange={(v: boolean) => toggleEnabled(r.action, v)}
                      />
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

export { PointRulePage };
