import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useFetchClient, Page } from "@strapi/strapi/admin";
import { useNavigate, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { useIntl } from "react-intl";
import { Main, Box, Flex, Typography, Grid, Card, CardHeader, CardBody, Button, Badge, Loader, Table, Thead, Tr, Th, Tbody, Td, IconButton, Modal, Field, SingleSelect, SingleSelectOption } from "@strapi/design-system";
import { Play, Book, Key, Star, ChevronLeft, ChevronRight, Plus, Trash } from "@strapi/icons";
import { P as PLUGIN_ID } from "./index-BXMrQmW6.mjs";
const HomePage = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { get } = useFetchClient();
  const [stats, setStats] = useState({
    courseCount: 0,
    categoryCount: 0,
    lessonCount: 0,
    authCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [courses, categories, lessons, auths] = await Promise.all([
          get("/admin/plugins/zhao-course/courses", { params: { pagination: { pageSize: 1 } } }),
          get("/admin/plugins/zhao-course/course-categories", { params: { pagination: { pageSize: 1 } } }),
          get("/admin/plugins/zhao-course/lessons", { params: { pagination: { pageSize: 1 } } }),
          get("/admin/plugins/zhao-course/user-courses", { params: { pagination: { pageSize: 1 } } })
        ]);
        setStats({
          courseCount: courses.data?.pagination?.total ?? 0,
          categoryCount: categories.data?.pagination?.total ?? 0,
          lessonCount: lessons.data?.pagination?.total ?? 0,
          authCount: auths.data?.pagination?.total ?? 0
        });
      } catch {
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
      icon: Play,
      color: "primary500",
      path: "/content-manager/collection-types/plugin::zhao-course.course"
    },
    {
      title: "课时数",
      value: stats.lessonCount,
      icon: Book,
      color: "success500",
      path: "/content-manager/collection-types/plugin::zhao-course.course-lesson"
    },
    {
      title: "授权数",
      value: stats.authCount,
      icon: Key,
      color: "warning500",
      path: "auth"
    },
    {
      title: "分类数",
      value: stats.categoryCount,
      icon: Star,
      color: "danger500",
      path: "/content-manager/collection-types/plugin::zhao-course.course-category"
    }
  ];
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: "课程管理" }),
    /* @__PURE__ */ jsx(Typography, { variant: "epsilon", textColor: "neutral600", children: "管理课程、课时、知识点、积分和授权" }),
    /* @__PURE__ */ jsx(Grid.Root, { gap: 4, gridCols: 4, children: statCards.map((card) => /* @__PURE__ */ jsx(Grid.Item, { col: 1, children: /* @__PURE__ */ jsxs(
      Card,
      {
        style: { cursor: "pointer" },
        onClick: () => {
          if (card.path.startsWith("/")) {
            navigate(card.path);
          } else {
            navigate(`/plugins/${PLUGIN_ID}/${card.path}`);
          }
        },
        children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", children: [
            /* @__PURE__ */ jsx(card.icon, { fill: `var(--strapi-${card.color})`, width: 24, height: 24 }),
            /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: card.title })
          ] }) }),
          /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", children: isLoading ? "..." : card.value }) })
        ]
      }
    ) }, card.title)) }),
    /* @__PURE__ */ jsx(Box, { padding: 4, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "sigma", fontWeight: "bold", children: "快捷操作" }),
      /* @__PURE__ */ jsxs(Flex, { gap: 3, wrap: "wrap", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: () => navigate("/content-manager/collection-types/plugin::zhao-course.course"),
            children: "管理课程"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: () => navigate(`/plugins/${PLUGIN_ID}/progress`),
            children: "学习进度"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: () => navigate(`/plugins/${PLUGIN_ID}/auth`),
            children: "授权管理"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: () => navigate(`/plugins/${PLUGIN_ID}/points`),
            children: "积分记录"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs(Box, { background: "neutral100", padding: 4, borderRadius: 4, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "sigma", fontWeight: "bold", children: "内容类型" }),
      /* @__PURE__ */ jsx(Flex, { gap: 2, wrap: "wrap", paddingTop: 3, children: [
        { label: "课程", uid: "course" },
        { label: "课程分类", uid: "course-category" },
        { label: "课程标签", uid: "course-tag" },
        { label: "知识点", uid: "knowledge-point" },
        { label: "课时", uid: "course-lesson" },
        { label: "用户授权", uid: "user-course-auth" },
        { label: "课程进度", uid: "course-progress" },
        { label: "课时进度", uid: "lesson-progress" }
      ].map((ct) => /* @__PURE__ */ jsx(
        Badge,
        {
          style: { cursor: "pointer" },
          onClick: () => navigate(`/content-manager/collection-types/plugin::zhao-course.${ct.uid}`),
          children: ct.label
        },
        ct.uid
      )) })
    ] })
  ] }) }) });
};
const ProgressPage = () => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const [courseProgresses, setCourseProgresses] = useState([]);
  const [lessonProgresses, setLessonProgresses] = useState([]);
  const [activeTab, setActiveTab] = useState("course");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === "course") {
          const { data } = await get("/admin/plugins/zhao-course/course-progresses", {
            params: {
              pagination: { page, pageSize: 10 },
              populate: { user: true, course: true }
            }
          });
          setCourseProgresses(Array.isArray(data) ? data : data?.results ?? []);
          setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
        } else {
          const { data } = await get("/admin/plugins/zhao-course/lesson-progresses", {
            params: {
              pagination: { page, pageSize: 10 },
              populate: { user: true, lesson: true, course: true }
            }
          });
          setLessonProgresses(Array.isArray(data) ? data : data?.results ?? []);
          setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeTab, page, get]);
  const getUserName = (user) => {
    if (!user) return "-";
    return user.username || user.email || user.id || "-";
  };
  const getCourseTitle = (course) => {
    if (!course) return "-";
    return course.title || course.id || "-";
  };
  const getLessonTitle = (lesson) => {
    if (!lesson) return "-";
    return lesson.title || lesson.id || "-";
  };
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: "学习进度" }),
    /* @__PURE__ */ jsxs(Flex, { gap: 3, children: [
      /* @__PURE__ */ jsx(
        Badge,
        {
          active: activeTab === "course",
          style: { cursor: "pointer", padding: "8px 16px" },
          onClick: () => {
            setActiveTab("course");
            setPage(1);
          },
          children: "课程进度"
        }
      ),
      /* @__PURE__ */ jsx(
        Badge,
        {
          active: activeTab === "lesson",
          style: { cursor: "pointer", padding: "8px 16px" },
          onClick: () => {
            setActiveTab("lesson");
            setPage(1);
          },
          children: "课时进度"
        }
      )
    ] }),
    isLoading ? /* @__PURE__ */ jsx(Flex, { justifyContent: "center", padding: 8, children: /* @__PURE__ */ jsx(Loader, { children: "Loading content..." }) }) : activeTab === "course" ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(Table, { colCount: 7, rowCount: courseProgresses.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: "用户" }),
          /* @__PURE__ */ jsx(Th, { children: "课程" }),
          /* @__PURE__ */ jsx(Th, { children: "进度" }),
          /* @__PURE__ */ jsx(Th, { children: "已完成课时/总课时" }),
          /* @__PURE__ */ jsx(Th, { children: "是否完成" }),
          /* @__PURE__ */ jsx(Th, { children: "积分已领取" }),
          /* @__PURE__ */ jsx(Th, { children: "获得积分" })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: courseProgresses.map((item) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsx(Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(Badge, { children: [
            Number(item.progress ?? 0).toFixed(1),
            "%"
          ] }) }),
          /* @__PURE__ */ jsxs(Td, { children: [
            item.completedLessons ?? 0,
            " / ",
            item.totalLessons ?? 0
          ] }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isCompleted ? "success" : "secondary", children: item.isCompleted ? "已完成" : "学习中" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isPointsClaimed ? "success" : "secondary", children: item.isPointsClaimed ? "已领取" : "未领取" }) }),
          /* @__PURE__ */ jsx(Td, { children: item.pointsEarned ?? 0 })
        ] }, item.id || item.documentId)) })
      ] }),
      pagination.total > pagination.pageSize && /* @__PURE__ */ jsxs(Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
        /* @__PURE__ */ jsx(
          IconButton,
          {
            label: "Previous",
            onClick: () => setPage(Math.max(1, page - 1)),
            disabled: page <= 1,
            variant: "ghost",
            children: /* @__PURE__ */ jsx(ChevronLeft, {})
          }
        ),
        /* @__PURE__ */ jsxs(Typography, { variant: "omega", children: [
          page,
          " / ",
          Math.ceil(pagination.total / pagination.pageSize)
        ] }),
        /* @__PURE__ */ jsx(
          IconButton,
          {
            label: "Next",
            onClick: () => setPage(page + 1),
            disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
            variant: "ghost",
            children: /* @__PURE__ */ jsx(ChevronRight, {})
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(Table, { colCount: 8, rowCount: lessonProgresses.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: "用户" }),
          /* @__PURE__ */ jsx(Th, { children: "课时" }),
          /* @__PURE__ */ jsx(Th, { children: "课程" }),
          /* @__PURE__ */ jsx(Th, { children: "进度" }),
          /* @__PURE__ */ jsx(Th, { children: "是否完成" }),
          /* @__PURE__ */ jsx(Th, { children: "已答题" }),
          /* @__PURE__ */ jsx(Th, { children: "答题正确" }),
          /* @__PURE__ */ jsx(Th, { children: "积分已领取" })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: lessonProgresses.map((item) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsx(Td, { children: getLessonTitle(item.lesson) }),
          /* @__PURE__ */ jsx(Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsxs(Badge, { children: [
            Number(item.progress ?? 0).toFixed(1),
            "%"
          ] }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isCompleted ? "success" : "secondary", children: item.isCompleted ? "已完成" : "学习中" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isAnswered ? "success" : "secondary", children: item.isAnswered ? "是" : "否" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isCorrect ? "success" : "danger", children: item.isCorrect ? "正确" : item.isAnswered ? "错误" : "-" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isPointsClaimed ? "success" : "secondary", children: item.isPointsClaimed ? "已领取" : "未领取" }) })
        ] }, item.id || item.documentId)) })
      ] }),
      pagination.total > pagination.pageSize && /* @__PURE__ */ jsxs(Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
        /* @__PURE__ */ jsx(
          IconButton,
          {
            label: "Previous",
            onClick: () => setPage(Math.max(1, page - 1)),
            disabled: page <= 1,
            variant: "ghost",
            children: /* @__PURE__ */ jsx(ChevronLeft, {})
          }
        ),
        /* @__PURE__ */ jsxs(Typography, { variant: "omega", children: [
          page,
          " / ",
          Math.ceil(pagination.total / pagination.pageSize)
        ] }),
        /* @__PURE__ */ jsx(
          IconButton,
          {
            label: "Next",
            onClick: () => setPage(page + 1),
            disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
            variant: "ghost",
            children: /* @__PURE__ */ jsx(ChevronRight, {})
          }
        )
      ] })
    ] })
  ] }) }) });
};
const AuthPage = () => {
  const { get, post, del } = useFetchClient();
  const [auths, setAuths] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formState, setFormState] = useState({
    user: "",
    course: "",
    authType: "admin_grant",
    expiresAt: ""
  });
  useEffect(() => {
    const fetchAuths = async () => {
      setIsLoading(true);
      try {
        const { data } = await get("/admin/plugins/zhao-course/user-courses", {
          params: {
            pagination: { page, pageSize: 10 },
            populate: { user: true, course: true }
          }
        });
        setAuths(Array.isArray(data) ? data : data?.results ?? []);
        setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
      } catch {
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
          params: { pagination: { pageSize: 100 } }
        });
        setCourses(Array.isArray(data) ? data : data?.results ?? []);
      } catch {
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
          isExpired: false
        }
      });
      setShowCreateModal(false);
      setFormState({ user: "", course: "", authType: "admin_grant", expiresAt: "" });
      setPage(page);
    } catch {
    }
  };
  const getUserName = (user) => {
    if (!user) return "-";
    return user.username || user.email || user.id || "-";
  };
  const getCourseTitle = (course) => {
    if (!course) return "-";
    return course.title || course.id || "-";
  };
  const authTypeLabels = {
    free: "免费",
    paid: "付费",
    admin_grant: "管理员授权"
  };
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
      /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: "授权管理" }),
      /* @__PURE__ */ jsxs(Modal.Root, { open: showCreateModal, onOpenChange: setShowCreateModal, children: [
        /* @__PURE__ */ jsx(Modal.Trigger, { children: /* @__PURE__ */ jsx(Button, { startIcon: /* @__PURE__ */ jsx(Plus, {}), children: "手动授权" }) }),
        /* @__PURE__ */ jsxs(Modal.Content, { children: [
          /* @__PURE__ */ jsx(Modal.Header, { children: /* @__PURE__ */ jsx(Modal.Title, { children: "手动授权" }) }),
          /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
            /* @__PURE__ */ jsxs(Field.Root, { name: "user", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "用户 ID" }),
              /* @__PURE__ */ jsx(
                Field.Input,
                {
                  value: formState.user,
                  onChange: (e) => setFormState({ ...formState, user: e.target.value }),
                  placeholder: "输入用户 ID"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "course", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "课程" }),
              /* @__PURE__ */ jsx(
                SingleSelect,
                {
                  value: formState.course,
                  onChange: (value) => setFormState({ ...formState, course: value }),
                  placeholder: "选择课程",
                  children: courses.map((course) => /* @__PURE__ */ jsx(SingleSelectOption, { value: String(course.id), children: course.title || course.id }, course.id || course.documentId))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "authType", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "授权方式" }),
              /* @__PURE__ */ jsxs(
                SingleSelect,
                {
                  value: formState.authType,
                  onChange: (value) => setFormState({ ...formState, authType: value }),
                  children: [
                    /* @__PURE__ */ jsx(SingleSelectOption, { value: "admin_grant", children: "管理员授权" }),
                    /* @__PURE__ */ jsx(SingleSelectOption, { value: "paid", children: "付费" }),
                    /* @__PURE__ */ jsx(SingleSelectOption, { value: "free", children: "免费" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(Field.Root, { name: "expiresAt", children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "过期时间（可选）" }),
              /* @__PURE__ */ jsx(
                Field.Input,
                {
                  type: "datetime-local",
                  value: formState.expiresAt,
                  onChange: (e) => setFormState({ ...formState, expiresAt: e.target.value })
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(Modal.Footer, { children: [
            /* @__PURE__ */ jsx(Modal.Close, { children: /* @__PURE__ */ jsx(Button, { variant: "tertiary", children: "取消" }) }),
            /* @__PURE__ */ jsx(Button, { onClick: handleCreate, disabled: !formState.user || !formState.course, children: "确认授权" })
          ] })
        ] })
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsx(Flex, { justifyContent: "center", padding: 8, children: /* @__PURE__ */ jsx(Loader, { children: "Loading content..." }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(Table, { colCount: 6, rowCount: auths.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: "用户" }),
          /* @__PURE__ */ jsx(Th, { children: "课程" }),
          /* @__PURE__ */ jsx(Th, { children: "授权方式" }),
          /* @__PURE__ */ jsx(Th, { children: "过期时间" }),
          /* @__PURE__ */ jsx(Th, { children: "是否过期" }),
          /* @__PURE__ */ jsx(Th, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: auths.map((item) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsx(Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { children: authTypeLabels[item.authType] || item.authType }) }),
          /* @__PURE__ */ jsx(Td, { children: item.expiresAt ? new Date(item.expiresAt).toLocaleString("zh-CN") : "永不过期" }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isExpired ? "danger" : "success", children: item.isExpired ? "已过期" : "有效" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
            IconButton,
            {
              label: "删除",
              onClick: async () => {
                try {
                  await del(`/admin/plugins/zhao-course/user-courses/${item.documentId}`);
                  setAuths(auths.filter((a) => a.documentId !== item.documentId));
                } catch {
                }
              },
              variant: "ghost",
              children: /* @__PURE__ */ jsx(Trash, {})
            }
          ) })
        ] }, item.id || item.documentId)) })
      ] }),
      pagination.total > pagination.pageSize && /* @__PURE__ */ jsxs(Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
        /* @__PURE__ */ jsx(
          IconButton,
          {
            label: "Previous",
            onClick: () => setPage(Math.max(1, page - 1)),
            disabled: page <= 1,
            variant: "ghost",
            children: /* @__PURE__ */ jsx(ChevronLeft, {})
          }
        ),
        /* @__PURE__ */ jsxs(Typography, { variant: "omega", children: [
          page,
          " / ",
          Math.ceil(pagination.total / pagination.pageSize)
        ] }),
        /* @__PURE__ */ jsx(
          IconButton,
          {
            label: "Next",
            onClick: () => setPage(page + 1),
            disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
            variant: "ghost",
            children: /* @__PURE__ */ jsx(ChevronRight, {})
          }
        )
      ] })
    ] })
  ] }) }) });
};
const PointsPage = () => {
  const { get } = useFetchClient();
  const [courseProgresses, setCourseProgresses] = useState([]);
  const [lessonProgresses, setLessonProgresses] = useState([]);
  const [activeTab, setActiveTab] = useState("course");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === "course") {
          const { data } = await get("/admin/plugins/zhao-course/course-progresses", {
            params: {
              pagination: { page, pageSize: 10 },
              populate: { user: true, course: true }
            }
          });
          const results = (Array.isArray(data) ? data : data?.results ?? []).filter((item) => item.isPointsClaimed || item.pointsEarned > 0);
          setCourseProgresses(results);
          setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
        } else {
          const { data } = await get("/admin/plugins/zhao-course/lesson-progresses", {
            params: {
              pagination: { page, pageSize: 10 },
              populate: { user: true, lesson: true, course: true }
            }
          });
          const results = (Array.isArray(data) ? data : data?.results ?? []).filter((item) => item.isPointsClaimed || item.pointsEarned > 0);
          setLessonProgresses(results);
          setPagination(data?.pagination ?? { page: 1, pageSize: 10, total: 0 });
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeTab, page, get]);
  const getUserName = (user) => {
    if (!user) return "-";
    return user.username || user.email || user.id || "-";
  };
  const getCourseTitle = (course) => {
    if (!course) return "-";
    return course.title || course.id || "-";
  };
  const getLessonTitle = (lesson) => {
    if (!lesson) return "-";
    return lesson.title || lesson.id || "-";
  };
  return /* @__PURE__ */ jsx(Main, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", fontWeight: "bold", children: "积分记录" }),
    /* @__PURE__ */ jsxs(Flex, { gap: 3, children: [
      /* @__PURE__ */ jsx(
        Badge,
        {
          active: activeTab === "course",
          style: { cursor: "pointer", padding: "8px 16px" },
          onClick: () => {
            setActiveTab("course");
            setPage(1);
          },
          children: "课程积分"
        }
      ),
      /* @__PURE__ */ jsx(
        Badge,
        {
          active: activeTab === "lesson",
          style: { cursor: "pointer", padding: "8px 16px" },
          onClick: () => {
            setActiveTab("lesson");
            setPage(1);
          },
          children: "课时积分"
        }
      )
    ] }),
    isLoading ? /* @__PURE__ */ jsx(Flex, { justifyContent: "center", padding: 8, children: /* @__PURE__ */ jsx(Loader, { children: "Loading content..." }) }) : activeTab === "course" ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(Table, { colCount: 5, rowCount: courseProgresses.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: "用户" }),
          /* @__PURE__ */ jsx(Th, { children: "课程" }),
          /* @__PURE__ */ jsx(Th, { children: "获得积分" }),
          /* @__PURE__ */ jsx(Th, { children: "领取状态" }),
          /* @__PURE__ */ jsx(Th, { children: "完成状态" })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: courseProgresses.map((item) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsx(Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { fontWeight: "bold", children: item.pointsEarned ?? 0 }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isPointsClaimed ? "success" : "warning", children: item.isPointsClaimed ? "已领取" : "未领取" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isCompleted ? "success" : "secondary", children: item.isCompleted ? "已完成" : "未完成" }) })
        ] }, item.id || item.documentId)) })
      ] }),
      courseProgresses.length === 0 && /* @__PURE__ */ jsx(Box, { padding: 4, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsx(Typography, { variant: "omega", textColor: "neutral600", children: "暂无课程积分记录" }) })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(Table, { colCount: 6, rowCount: lessonProgresses.length, children: [
        /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Th, { children: "用户" }),
          /* @__PURE__ */ jsx(Th, { children: "课时" }),
          /* @__PURE__ */ jsx(Th, { children: "课程" }),
          /* @__PURE__ */ jsx(Th, { children: "获得积分" }),
          /* @__PURE__ */ jsx(Th, { children: "领取状态" }),
          /* @__PURE__ */ jsx(Th, { children: "积分类型" })
        ] }) }),
        /* @__PURE__ */ jsx(Tbody, { children: lessonProgresses.map((item) => /* @__PURE__ */ jsxs(Tr, { children: [
          /* @__PURE__ */ jsx(Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsx(Td, { children: getLessonTitle(item.lesson) }),
          /* @__PURE__ */ jsx(Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { fontWeight: "bold", children: item.pointsEarned ?? 0 }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { variant: item.isPointsClaimed ? "success" : "warning", children: item.isPointsClaimed ? "已领取" : "未领取" }) }),
          /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Badge, { children: item.isAnswered ? "答题积分" : "课时积分" }) })
        ] }, item.id || item.documentId)) })
      ] }),
      lessonProgresses.length === 0 && /* @__PURE__ */ jsx(Box, { padding: 4, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsx(Typography, { variant: "omega", textColor: "neutral600", children: "暂无课时积分记录" }) })
    ] }),
    pagination.total > pagination.pageSize && /* @__PURE__ */ jsxs(Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
      /* @__PURE__ */ jsx(
        IconButton,
        {
          label: "Previous",
          onClick: () => setPage(Math.max(1, page - 1)),
          disabled: page <= 1,
          variant: "ghost",
          children: /* @__PURE__ */ jsx(ChevronLeft, {})
        }
      ),
      /* @__PURE__ */ jsxs(Typography, { variant: "omega", children: [
        page,
        " / ",
        Math.ceil(pagination.total / pagination.pageSize)
      ] }),
      /* @__PURE__ */ jsx(
        IconButton,
        {
          label: "Next",
          onClick: () => setPage(page + 1),
          disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
          variant: "ghost",
          children: /* @__PURE__ */ jsx(ChevronRight, {})
        }
      )
    ] })
  ] }) }) });
};
const App = () => {
  return /* @__PURE__ */ jsxs(Routes, { children: [
    /* @__PURE__ */ jsx(Route, { index: true, element: /* @__PURE__ */ jsx(HomePage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "progress", element: /* @__PURE__ */ jsx(ProgressPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "auth", element: /* @__PURE__ */ jsx(AuthPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "points", element: /* @__PURE__ */ jsx(PointsPage, {}) }),
    /* @__PURE__ */ jsx(Route, { path: "*", element: /* @__PURE__ */ jsx(Page.Error, {}) })
  ] });
};
export {
  App
};
