import { useState, useEffect } from "react";
import {
  Main,
  Box,
  Flex,
  Typography,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Button,
  Modal,
  TextInput,
  SingleSelect,
  SingleSelectOption,
  Loader,
  Field,
} from "@strapi/design-system";
import { ChevronLeft, ChevronRight, Plus, Trash } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

const AuthPage = () => {
  const { get, post, del } = useFetchClient();
  const [auths, setAuths] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ page: 1, pageSize: 10, total: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formState, setFormState] = useState<any>({
    user: "",
    course: "",
    authType: "admin_grant",
    expiresAt: "",
  });

  useEffect(() => {
    const fetchAuths = async () => {
      setIsLoading(true);
      try {
        const { data } = await get("/admin/plugins/zhao-course/user-courses", {
          params: {
            pagination: { page, pageSize: 10 },
            populate: { user: true, course: true },
          },
        });
        setAuths(Array.isArray(data) ? data : data?.results ?? []);
        setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
      } catch {
        // 静默处理
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuths();
  }, [page, get]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data } = await get("/admin/plugins/zhao-course/courses", {
          params: { pagination: { pageSize: 100 } },
        });
        setCourses(Array.isArray(data) ? data : data?.results ?? []);
      } catch {
        // 静默处理
      }
    };
    fetchCourses();
  }, [get]);

  const handleCreate = async () => {
    try {
      await post("/admin/plugins/zhao-course/user-courses", {
        data: {
          user: Number(formState.user),
          course: Number(formState.course),
          authType: formState.authType,
          expiresAt: formState.expiresAt || null,
          isExpired: false,
        },
      });
      setShowCreateModal(false);
      setFormState({ user: "", course: "", authType: "admin_grant", expiresAt: "" });
      // 触发刷新
      setPage(page);
    } catch {
      // 静默处理
    }
  };

  const getUserName = (user: any) => {
    if (!user) return "-";
    return user.username || user.email || user.id || "-";
  };

  const getCourseTitle = (course: any) => {
    if (!course) return "-";
    return course.title || course.id || "-";
  };

  const authTypeLabels: Record<string, string> = {
    free: "免费",
    paid: "付费",
    admin_grant: "管理员授权",
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={6}>
          <Flex justifyContent="space-between" alignItems="center">
            <Typography variant="alpha" fontWeight="bold">
              授权管理
            </Typography>
            <Modal.Root open={showCreateModal} onOpenChange={setShowCreateModal}>
              <Modal.Trigger>
                <Button startIcon={<Plus />}>手动授权</Button>
              </Modal.Trigger>
              <Modal.Content>
                <Modal.Header>
                  <Modal.Title>手动授权</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Flex direction="column" gap={4}>
                    <Field.Root name="user">
                      <Field.Label>用户 ID</Field.Label>
                      <Field.Input
                        value={formState.user}
                        onChange={(e: any) => setFormState({ ...formState, user: e.target.value })}
                        placeholder="输入用户 ID"
                      />
                    </Field.Root>
                    <Field.Root name="course">
                      <Field.Label>课程</Field.Label>
                      <SingleSelect
                        value={formState.course}
                        onChange={(value: any) => setFormState({ ...formState, course: value })}
                        placeholder="选择课程"
                      >
                        {courses.map((course: any) => (
                          <SingleSelectOption key={course.id || course.documentId} value={String(course.id)}>
                            {course.title || course.id}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Field.Root>
                    <Field.Root name="authType">
                      <Field.Label>授权方式</Field.Label>
                      <SingleSelect
                        value={formState.authType}
                        onChange={(value: any) => setFormState({ ...formState, authType: value })}
                      >
                        <SingleSelectOption value="admin_grant">管理员授权</SingleSelectOption>
                        <SingleSelectOption value="paid">付费</SingleSelectOption>
                        <SingleSelectOption value="free">免费</SingleSelectOption>
                      </SingleSelect>
                    </Field.Root>
                    <Field.Root name="expiresAt">
                      <Field.Label>过期时间（可选）</Field.Label>
                      <Field.Input
                        type="datetime-local"
                        value={formState.expiresAt}
                        onChange={(e: any) => setFormState({ ...formState, expiresAt: e.target.value })}
                      />
                    </Field.Root>
                  </Flex>
                </Modal.Body>
                <Modal.Footer>
                  <Modal.Close>
                    <Button variant="tertiary">取消</Button>
                  </Modal.Close>
                  <Button onClick={handleCreate} disabled={!formState.user || !formState.course}>
                    确认授权
                  </Button>
                </Modal.Footer>
              </Modal.Content>
            </Modal.Root>
          </Flex>

          {isLoading ? (
            <Flex justifyContent="center" padding={8}>
              <Loader>Loading content...</Loader>
            </Flex>
          ) : (
            <>
              <Table colCount={6} rowCount={auths.length}>
                <Thead>
                  <Tr>
                    <Th>用户</Th>
                    <Th>课程</Th>
                    <Th>授权方式</Th>
                    <Th>过期时间</Th>
                    <Th>是否过期</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {auths.map((item: any) => (
                    <Tr key={item.id || item.documentId}>
                      <Td>{getUserName(item.user)}</Td>
                      <Td>{getCourseTitle(item.course)}</Td>
                      <Td>
                        <Badge>
                          {authTypeLabels[item.authType] || item.authType}
                        </Badge>
                      </Td>
                      <Td>
                        {item.expiresAt
                          ? new Date(item.expiresAt).toLocaleString("zh-CN")
                          : "永不过期"}
                      </Td>
                      <Td>
                        <Badge variant={item.isExpired ? "danger" : "success"}>
                          {item.isExpired ? "已过期" : "有效"}
                        </Badge>
                      </Td>
                      <Td>
                        <IconButton
                          label="删除"
                          onClick={async () => {
                            try {
                              await del(`/admin/plugins/zhao-course/user-courses/${item.documentId}`);
                              setAuths(auths.filter((a: any) => a.documentId !== item.documentId));
                            } catch {
                              // 静默处理
                            }
                          }}
                          variant="ghost"
                        >
                          <Trash />
                        </IconButton>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {pagination.total > pagination.pageSize && (
                <Flex justifyContent="center" padding={4} gap={2}>
                  <IconButton
                    label="Previous"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    variant="ghost"
                  >
                    <ChevronLeft />
                  </IconButton>
                  <Typography variant="omega">
                    {page} / {Math.ceil(pagination.total / pagination.pageSize)}
                  </Typography>
                  <IconButton
                    label="Next"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(pagination.total / pagination.pageSize)}
                    variant="ghost"
                  >
                    <ChevronRight />
                  </IconButton>
                </Flex>
              )}
            </>
          )}
        </Flex>
      </Box>
    </Main>
  );
};

export { AuthPage };