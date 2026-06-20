import { useState, useEffect } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import {
  Main,
  Box,
  Flex,
  Typography,
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
} from "@strapi/design-system";
import { Grid } from "@strapi/design-system";
import { Book, Key, Star, Play } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

import { getTranslation } from "../utils/getTranslation";
import { PLUGIN_ID } from "../pluginId";

interface DashboardStats {
  courseCount: number;
  categoryCount: number;
  lessonCount: number;
  authCount: number;
}

const HomePage = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { get } = useFetchClient();
  const [stats, setStats] = useState<DashboardStats>({
    courseCount: 0,
    categoryCount: 0,
    lessonCount: 0,
    authCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [courses, categories, lessons, auths] = await Promise.all([
          get("/admin/plugins/zhao-course/courses", { params: { pagination: { pageSize: 1 } } }),
          get("/admin/plugins/zhao-course/course-categories", { params: { pagination: { pageSize: 1 } } }),
          get("/admin/plugins/zhao-course/lessons", { params: { pagination: { pageSize: 1 } } }),
          get("/admin/plugins/zhao-course/user-courses", { params: { pagination: { pageSize: 1 } } }),
        ]);
        setStats({
          courseCount: (courses.data as any)?.pagination?.total ?? 0,
          categoryCount: (categories.data as any)?.pagination?.total ?? 0,
          lessonCount: (lessons.data as any)?.pagination?.total ?? 0,
          authCount: (auths.data as any)?.pagination?.total ?? 0,
        });
      } catch {
        // 静默处理
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [get]);

  const statCards = [
    {
      title: "课程数",
      value: stats.courseCount,
      icon: Play as any,
      color: "primary500",
      path: "/content-manager/collection-types/plugin::zhao-course.course",
    },
    {
      title: "课时数",
      value: stats.lessonCount,
      icon: Book,
      color: "success500",
      path: "/content-manager/collection-types/plugin::zhao-course.course-lesson",
    },
    {
      title: "授权数",
      value: stats.authCount,
      icon: Key,
      color: "warning500",
      path: "auth",
    },
    {
      title: "分类数",
      value: stats.categoryCount,
      icon: Star,
      color: "danger500",
      path: "/content-manager/collection-types/plugin::zhao-course.course-category",
    },
  ];

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={6}>
          <Typography variant="alpha" fontWeight="bold">
            课程管理
          </Typography>
          <Typography variant="epsilon" textColor="neutral600">
            管理课程、课时、知识点、积分和授权
          </Typography>

          <Grid.Root gap={4} gridCols={4}>
            {statCards.map((card) => (
              <Grid.Item key={card.title} col={1}>
                <Card
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (card.path.startsWith("/")) {
                      navigate(card.path);
                    } else {
                      navigate(`/plugins/${PLUGIN_ID}/${card.path}`);
                    }
                  }}
                >
                  <CardHeader>
                    <Flex gap={3} alignItems="center">
                      <card.icon fill={`var(--strapi-${card.color})`} width={24} height={24} />
                      <Typography variant="omega" fontWeight="bold">
                        {card.title}
                      </Typography>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Typography variant="delta" fontWeight="bold">
                      {isLoading ? "..." : card.value}
                    </Typography>
                  </CardBody>
                </Card>
              </Grid.Item>
            ))}
          </Grid.Root>

          <Box padding={4} background="neutral100" borderRadius={4}>
            <Flex direction="column" gap={3}>
              <Typography variant="sigma" fontWeight="bold">
                快捷操作
              </Typography>
              <Flex gap={3} wrap="wrap">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/content-manager/collection-types/plugin::zhao-course.course")}
                >
                  管理课程
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/plugins/${PLUGIN_ID}/progress`)}
                >
                  学习进度
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/plugins/${PLUGIN_ID}/auth`)}
                >
                  授权管理
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/plugins/${PLUGIN_ID}/points`)}
                >
                  积分记录
                </Button>
              </Flex>
            </Flex>
          </Box>

          <Box background="neutral100" padding={4} borderRadius={4}>
            <Typography variant="sigma" fontWeight="bold">
              内容类型
            </Typography>
            <Flex gap={2} wrap="wrap" paddingTop={3}>
              {[
                { label: "课程", uid: "course" },
                { label: "课程分类", uid: "course-category" },
                { label: "课程标签", uid: "course-tag" },
                { label: "知识点", uid: "knowledge-point" },
                { label: "课时", uid: "course-lesson" },
                { label: "用户授权", uid: "user-course-auth" },
                { label: "课程进度", uid: "course-progress" },
                { label: "课时进度", uid: "lesson-progress" },
              ].map((ct) => (
                <Badge
                  key={ct.uid}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(`/content-manager/collection-types/plugin::zhao-course.${ct.uid}`)
                  }
                >
                  {ct.label}
                </Badge>
              ))}
            </Flex>
          </Box>
        </Flex>
      </Box>
    </Main>
  );
};

export { HomePage };
