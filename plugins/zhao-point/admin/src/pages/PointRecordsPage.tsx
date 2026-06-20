import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Modal, Field, TextInput,
  SingleSelect, SingleSelectOption, SearchForm, Searchbar,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const PointRecordsPage = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustRemark, setAdjustRemark] = useState("");

  const { get, post } = useFetchClient();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (search) params.userId = search;
      if (typeFilter) params.type = typeFilter;
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/point-records`, { params });
      setRecords(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, typeFilter]);

  const handleAdjust = async () => {
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/point-records/admin-adjust`, {
        userId: parseInt(adjustUserId),
        points: parseInt(adjustPoints),
        remark: adjustRemark,
      });
      setAdjustModalOpen(false);
      setAdjustUserId("");
      setAdjustPoints("");
      setAdjustRemark("");
      fetchRecords();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Flex justifyContent="space-between">
            <Typography variant="alpha">积分记录</Typography>
            <Button onClick={() => setAdjustModalOpen(true)}>手动调整</Button>
          </Flex>

          <Flex gap={3}>
            <SearchForm>
              <Searchbar
                placeholder="搜索用户ID..."
                value={search}
                onClear={() => setSearch("")}
                onChange={(e: any) => setSearch(e.target.value)}
                clearLabel="清除"
                name="search"
              >
                搜索用户
              </Searchbar>
            </SearchForm>
            <Box width="200px">
              <SingleSelect
                placeholder="变动类型"
                value={typeFilter}
                onChange={(v: string | number) => setTypeFilter(String(v || ""))}
              >
                <SingleSelectOption value="">全部</SingleSelectOption>
                <SingleSelectOption value="increase">增加</SingleSelectOption>
                <SingleSelectOption value="decrease">扣除</SingleSelectOption>
              </SingleSelect>
            </Box>
            <Button onClick={fetchRecords}>搜索</Button>
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : records.length === 0 ? (
            <EmptyStateLayout content="暂无积分记录" />
          ) : (
            <>
              <Table colCount={7} rowCount={records.length}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">时间</Typography></Th>
                    <Th><Typography variant="sigma">用户</Typography></Th>
                    <Th><Typography variant="sigma">操作</Typography></Th>
                    <Th><Typography variant="sigma">变动</Typography></Th>
                    <Th><Typography variant="sigma">余额</Typography></Th>
                    <Th><Typography variant="sigma">来源</Typography></Th>
                    <Th><Typography variant="sigma">备注</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {records.map((r: any) => (
                    <Tr key={r.id}>
                      <Td><Typography variant="pi">{new Date(r.createdAt).toLocaleString()}</Typography></Td>
                      <Td><Typography variant="pi">{r.user?.id || r.user}</Typography></Td>
                      <Td><Typography variant="pi">{r.action}</Typography></Td>
                      <Td>
                        <Typography
                          variant="pi"
                          textColor={r.type === "increase" ? "success600" : "danger600"}
                          fontWeight="bold"
                        >
                          {r.type === "increase" ? "+" : "-"}{Math.abs(r.points)}
                        </Typography>
                      </Td>
                      <Td><Typography variant="pi">{r.balance}</Typography></Td>
                      <Td><Typography variant="pi">{r.method || "-"}</Typography></Td>
                      <Td><Typography variant="pi">{r.remark || "-"}</Typography></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="pi">共 {total} 条记录</Typography>
                <Flex gap={2}>
                  <Button
                    variant="tertiary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <Typography variant="pi">{page} / {totalPages}</Typography>
                  <Button
                    variant="tertiary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </Flex>
              </Flex>
            </>
          )}
        </Flex>
      </Box>

      {adjustModalOpen && (
        <Modal.Root open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>手动调整积分</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>用户ID</Field.Label>
                  <TextInput
                    value={adjustUserId}
                    onChange={(e: any) => setAdjustUserId(e.target.value)}
                    placeholder="请输入用户ID"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>调整数量</Field.Label>
                  <TextInput
                    value={adjustPoints}
                    onChange={(e: any) => setAdjustPoints(e.target.value)}
                    placeholder="正数增加，负数扣除"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>备注</Field.Label>
                  <TextInput
                    value={adjustRemark}
                    onChange={(e: any) => setAdjustRemark(e.target.value)}
                    placeholder="调整原因"
                  />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleAdjust}>确认调整</Button>
              <Button variant="tertiary" onClick={() => setAdjustModalOpen(false)}>取消</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { PointRecordsPage };
