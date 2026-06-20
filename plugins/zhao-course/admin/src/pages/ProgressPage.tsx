import { useState, useEffect } from "react";
import { useIntl } from "react-intl";
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
  Searchbar,
  SearchForm,
  IconButton,
  Pagination,
  Loader,
} from "@strapi/design-system";
import { Pencil, Trash, Eye, ChevronLeft, ChevronRight } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { getTranslation } from "../utils/getTranslation";

const ProgressPage = () => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const [courseProgresses, setCourseProgresses] = useState<any[]>([]);
  const [lessonProgresses, setLessonProgresses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"course" | "lesson">("course");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ page: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === "course") {
          const { data } = await get("/admin/plugins/zhao-course/course-progresses", {
            params: {
              pagination: { page, pageSize: 10 },
              populate: { user: true, course: true },
            },
          });
          setCourseProgresses(Array.isArray(data) ? data : data?.results ?? []);
          setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
        } else {
          const { data } = await get("/admin/plugins/zhao-course/lesson-progresses", {
            params: {
              pagination: { page, pageSize: 10 },
              populate: { user: true, lesson: true, course: true },
            },
          });
          setLessonProgresses(Array.isArray(data) ? data : data?.results ?? []);
          setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
        }
      } catch {
        // 静默处理
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeTab, page, get]);

  const getUserName = (user: any) => {
    if (!user) return "-";
    return user.username || user.email || user.id || "-";
  };

  const getCourseTitle = (course: any) => {
    if (!course) return "-";
    return course.title || course.id || "-";
  };

  const getLessonTitle = (lesson: any) => {
    if (!lesson) return "-";
    return lesson.title || lesson.id || "-";
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={6}>
          <Typography variant="alpha" fontWeight="bold">
            学习进度
          </Typography>

          {/* Tab 切换 */}
          <Flex gap={3}>
            <Badge
              active={activeTab === "course"}
              style={{ cursor: "pointer", padding: "8px 16px" }}
              onClick={() => { setActiveTab("course"); setPage(1); }}
            >
              课程进度
            </Badge>
            <Badge
              active={activeTab === "lesson"}
              style={{ cursor: "pointer", padding: "8px 16px" }}
              onClick={() => { setActiveTab("lesson"); setPage(1); }}
            >
              课时进度
            </Badge>
          </Flex>

          {isLoading ? (
            <Flex justifyContent="center" padding={8}>
              <Loader>Loading content...</Loader>
            </Flex>
          ) : activeTab === "course" ? (
            <>
              <Table colCount={7} rowCount={courseProgresses.length}>
                <Thead>
                  <Tr>
                    <Th>用户</Th>
                    <Th>课程</Th>
                    <Th>进度</Th>
                    <Th>已完成课时/总课时</Th>
                    <Th>是否完成</Th>
                    <Th>积分已领取</Th>
                    <Th>获得积分</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {courseProgresses.map((item: any) => (
                    <Tr key={item.id || item.documentId}>
                      <Td>{getUserName(item.user)}</Td>
                      <Td>{getCourseTitle(item.course)}</Td>
                      <Td>
                        <Badge>{Number(item.progress ?? 0).toFixed(1)}%</Badge>
                      </Td>
                      <Td>{item.completedLessons ?? 0} / {item.totalLessons ?? 0}</Td>
                      <Td>
                        <Badge variant={item.isCompleted ? "success" : "secondary"}>
                          {item.isCompleted ? "已完成" : "学习中"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge variant={item.isPointsClaimed ? "success" : "secondary"}>
                          {item.isPointsClaimed ? "已领取" : "未领取"}
                        </Badge>
                      </Td>
                      <Td>{item.pointsEarned ?? 0}</Td>
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
                  <Typography variant="omega">{page} / {Math.ceil(pagination.total / pagination.pageSize)}</Typography>
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
          ) : (
            <>
              <Table colCount={8} rowCount={lessonProgresses.length}>
                <Thead>
                  <Tr>
                    <Th>用户</Th>
                    <Th>课时</Th>
                    <Th>课程</Th>
                    <Th>进度</Th>
                    <Th>是否完成</Th>
                    <Th>已答题</Th>
                    <Th>答题正确</Th>
                    <Th>积分已领取</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {lessonProgresses.map((item: any) => (
                    <Tr key={item.id || item.documentId}>
                      <Td>{getUserName(item.user)}</Td>
                      <Td>{getLessonTitle(item.lesson)}</Td>
                      <Td>{getCourseTitle(item.course)}</Td>
                      <Td>
                        <Badge>{Number(item.progress ?? 0).toFixed(1)}%</Badge>
                      </Td>
                      <Td>
                        <Badge variant={item.isCompleted ? "success" : "secondary"}>
                          {item.isCompleted ? "已完成" : "学习中"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge variant={item.isAnswered ? "success" : "secondary"}>
                          {item.isAnswered ? "是" : "否"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge variant={item.isCorrect ? "success" : "danger"}>
                          {item.isCorrect ? "正确" : item.isAnswered ? "错误" : "-"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge variant={item.isPointsClaimed ? "success" : "secondary"}>
                          {item.isPointsClaimed ? "已领取" : "未领取"}
                        </Badge>
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
                  <Typography variant="omega">{page} / {Math.ceil(pagination.total / pagination.pageSize)}</Typography>
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

export { ProgressPage };
