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
  Loader,
} from "@strapi/design-system";
import { ChevronLeft, ChevronRight } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

const PointsPage = () => {
  const { get } = useFetchClient();
  const [courseProgresses, setCourseProgresses] = useState<any[]>([]);
  const [lessonProgresses, setLessonProgresses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"course" | "lesson">("course");
  const [isLoading, setIsLoading] = useState(true);
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
          // 只显示有积分记录的
          const results = (Array.isArray(data) ? data : data?.results ?? [])
            .filter((item: any) => item.isPointsClaimed || item.pointsEarned > 0);
          setCourseProgresses(results);
          setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
        } else {
          const { data } = await get("/admin/plugins/zhao-course/lesson-progresses", {
            params: {
              pagination: { page, pageSize: 10 },
              populate: { user: true, lesson: true, course: true },
            },
          });
          const results = (Array.isArray(data) ? data : data?.results ?? [])
            .filter((item: any) => item.isPointsClaimed || item.pointsEarned > 0);
          setLessonProgresses(results);
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
            积分记录
          </Typography>

          {/* Tab 切换 */}
          <Flex gap={3}>
            <Badge
              active={activeTab === "course"}
              style={{ cursor: "pointer", padding: "8px 16px" }}
              onClick={() => { setActiveTab("course"); setPage(1); }}
            >
              课程积分
            </Badge>
            <Badge
              active={activeTab === "lesson"}
              style={{ cursor: "pointer", padding: "8px 16px" }}
              onClick={() => { setActiveTab("lesson"); setPage(1); }}
            >
              课时积分
            </Badge>
          </Flex>

          {isLoading ? (
            <Flex justifyContent="center" padding={8}>
              <Loader>Loading content...</Loader>
            </Flex>
          ) : activeTab === "course" ? (
            <>
              <Table colCount={5} rowCount={courseProgresses.length}>
                <Thead>
                  <Tr>
                    <Th>用户</Th>
                    <Th>课程</Th>
                    <Th>获得积分</Th>
                    <Th>领取状态</Th>
                    <Th>完成状态</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {courseProgresses.map((item: any) => (
                    <Tr key={item.id || item.documentId}>
                      <Td>{getUserName(item.user)}</Td>
                      <Td>{getCourseTitle(item.course)}</Td>
                      <Td>
                        <Typography fontWeight="bold">{item.pointsEarned ?? 0}</Typography>
                      </Td>
                      <Td>
                        <Badge variant={item.isPointsClaimed ? "success" : "warning"}>
                          {item.isPointsClaimed ? "已领取" : "未领取"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge variant={item.isCompleted ? "success" : "secondary"}>
                          {item.isCompleted ? "已完成" : "未完成"}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {courseProgresses.length === 0 && (
                <Box padding={4} background="neutral100" borderRadius={4}>
                  <Typography variant="omega" textColor="neutral600">
                    暂无课程积分记录
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <>
              <Table colCount={6} rowCount={lessonProgresses.length}>
                <Thead>
                  <Tr>
                    <Th>用户</Th>
                    <Th>课时</Th>
                    <Th>课程</Th>
                    <Th>获得积分</Th>
                    <Th>领取状态</Th>
                    <Th>积分类型</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {lessonProgresses.map((item: any) => (
                    <Tr key={item.id || item.documentId}>
                      <Td>{getUserName(item.user)}</Td>
                      <Td>{getLessonTitle(item.lesson)}</Td>
                      <Td>{getCourseTitle(item.course)}</Td>
                      <Td>
                        <Typography fontWeight="bold">{item.pointsEarned ?? 0}</Typography>
                      </Td>
                      <Td>
                        <Badge variant={item.isPointsClaimed ? "success" : "warning"}>
                          {item.isPointsClaimed ? "已领取" : "未领取"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge>
                          {item.isAnswered ? "答题积分" : "课时积分"}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {lessonProgresses.length === 0 && (
                <Box padding={4} background="neutral100" borderRadius={4}>
                  <Typography variant="omega" textColor="neutral600">
                    暂无课时积分记录
                  </Typography>
                </Box>
              )}
            </>
          )}

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
        </Flex>
      </Box>
    </Main>
  );
};

export { PointsPage };
