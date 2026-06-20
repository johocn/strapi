import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Typography,
  Button,
  Loader,
  EmptyStateLayout,
  TextInput,
  SingleSelect,
  SingleSelectOption,
  Modal,
  Field,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Status,
} from "@strapi/design-system";
import { Pencil } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { API_PREFIX } from "./HomePage";

export const UsersTab = () => {
  const { get, put } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const pageSize = 25;

  const load = useCallback(
    async (p = page, s = search, st = statusFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(pageSize),
        });
        if (s) params.set("search", s);
        if (st) params.set("status", st);
        const { data } = await get(`${API_PREFIX}/users?${params}`);
        setUsers(data?.data || []);
        setTotal(data?.meta?.pagination?.total || 0);
        setPage(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter]
  );

  useEffect(() => {
    load(1);
  }, []);

  const handleSearch = () => load(1, search, statusFilter);

  const handleEdit = (user: any) => {
    setEditForm({
      id: user.id,
      nickname: user.nickname || "",
      username: user.username || "",
      status: user.status || "active",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      await put(`${API_PREFIX}/users/${editForm.id}`, editForm);
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box padding={4}>
      <Flex gap={2} paddingBottom={4} wrap="wrap">
        <TextInput
          placeholder="搜索邮箱/用户名/手机号"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent) =>
            e.key === "Enter" && handleSearch()
          }
        />
        <SingleSelect
          value={statusFilter}
          onValueChange={(v: string) => {
            setStatusFilter(v);
            load(1, search, v);
          }}
          placeholder="全部状态"
        >
          <SingleSelectOption value="active">活跃</SingleSelectOption>
          <SingleSelectOption value="blocked">封禁</SingleSelectOption>
          <SingleSelectOption value="inactive">未激活</SingleSelectOption>
        </SingleSelect>
        <Button variant="secondary" onClick={handleSearch}>
          搜索
        </Button>
      </Flex>

      {loading ? (
        <Loader>加载中...</Loader>
      ) : users.length === 0 ? (
        <EmptyStateLayout content="暂无用户数据" />
      ) : (
        <>
          <Box background="neutral0" borderRadius={4} shadow="filterShadow">
            <Table colCount={10} rowCount={users.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">ID</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">UUID</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">用户名</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">昵称</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">邮箱</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">手机号</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">状态</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">注册渠道</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">注册时间</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">操作</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((u: any) => (
                  <Tr key={u.id}>
                    <Td>
                      <Typography>{u.id}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {u.uuid}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>{u.username || "-"}</Typography>
                    </Td>
                    <Td>
                      <Typography>{u.nickname || "-"}</Typography>
                    </Td>
                    <Td>
                      <Typography>{u.email || "-"}</Typography>
                    </Td>
                    <Td>
                      <Typography>{u.mobile || "-"}</Typography>
                    </Td>
                    <Td>
                      <Status
                        variant={
                          u.status === "active"
                            ? "success"
                            : u.status === "blocked"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        <Typography>
                          {u.status === "active"
                            ? "活跃"
                            : u.status === "blocked"
                              ? "封禁"
                              : u.status}
                        </Typography>
                      </Status>
                    </Td>
                    <Td>
                      <Typography>{u.register_channel || "-"}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleString()
                          : "-"}
                      </Typography>
                    </Td>
                    <Td>
                      <Button
                        size="S"
                        variant="tertiary"
                        startIcon={<Pencil />}
                        onClick={() => handleEdit(u)}
                      >
                        编辑
                      </Button>
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

      <Modal.Root
        open={editOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setEditOpen(false);
        }}
      >
        <Modal.Content>
          <Modal.Header closeLabel="关闭">
            <Modal.Title>编辑用户</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex direction="column" gap={4} alignItems="stretch">
              <Field.Root name="username" required>
                <Field.Label>用户名</Field.Label>
                <TextInput
                  value={editForm.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm({ ...editForm, username: e.target.value })
                  }
                />
              </Field.Root>
              <Field.Root name="nickname">
                <Field.Label>昵称</Field.Label>
                <TextInput
                  value={editForm.nickname}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm({ ...editForm, nickname: e.target.value })
                  }
                />
              </Field.Root>
              <Field.Root name="status" required>
                <Field.Label>状态</Field.Label>
                <SingleSelect
                  value={editForm.status}
                  onValueChange={(v: string) =>
                    setEditForm({ ...editForm, status: v })
                  }
                >
                  <SingleSelectOption value="active">活跃</SingleSelectOption>
                  <SingleSelectOption value="blocked">封禁</SingleSelectOption>
                  <SingleSelectOption value="inactive">
                    未激活
                  </SingleSelectOption>
                </SingleSelect>
              </Field.Root>
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Flex justifyContent="space-between" width="100%">
              <Button variant="tertiary" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>保存</Button>
            </Flex>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  );
};
