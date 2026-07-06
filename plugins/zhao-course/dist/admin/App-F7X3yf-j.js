"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const admin = require("@strapi/strapi/admin");
const reactRouterDom = require("react-router-dom");
const react = require("react");
const reactIntl = require("react-intl");
const designSystem = require("@strapi/design-system");
const icons = require("@strapi/icons");
const index = require("./index-DzS-mdpm.js");
const HomePage = () => {
  const { formatMessage } = reactIntl.useIntl();
  const navigate = reactRouterDom.useNavigate();
  const { get } = admin.useFetchClient();
  const [stats, setStats] = react.useState({
    courseCount: 0,
    categoryCount: 0,
    lessonCount: 0,
    authCount: 0
  });
  const [isLoading, setIsLoading] = react.useState(true);
  react.useEffect(() => {
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
      icon: icons.Play,
      color: "primary500",
      path: "/content-manager/collection-types/plugin::zhao-course.course"
    },
    {
      title: "课时数",
      value: stats.lessonCount,
      icon: icons.Book,
      color: "success500",
      path: "/content-manager/collection-types/plugin::zhao-course.course-lesson"
    },
    {
      title: "授权数",
      value: stats.authCount,
      icon: icons.Key,
      color: "warning500",
      path: "auth"
    },
    {
      title: "分类数",
      value: stats.categoryCount,
      icon: icons.Star,
      color: "danger500",
      path: "/content-manager/collection-types/plugin::zhao-course.course-category"
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Main, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 8, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", children: "课程管理" }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "epsilon", textColor: "neutral600", children: "管理课程、课时、知识点、积分和授权" }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Root, { gap: 4, gridCols: 4, children: statCards.map((card) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { col: 1, children: /* @__PURE__ */ jsxRuntime.jsxs(
      designSystem.Card,
      {
        style: { cursor: "pointer" },
        onClick: () => {
          if (card.path.startsWith("/")) {
            navigate(card.path);
          } else {
            navigate(`/plugins/${index.PLUGIN_ID}/${card.path}`);
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardHeader, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 3, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntime.jsx(card.icon, { fill: `var(--strapi-${card.color})`, width: 24, height: 24 }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", fontWeight: "bold", children: card.title })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardBody, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "delta", fontWeight: "bold", children: isLoading ? "..." : card.value }) })
        ]
      }
    ) }, card.title)) }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 4, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 3, children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", fontWeight: "bold", children: "快捷操作" }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 3, wrap: "wrap", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Button,
          {
            variant: "secondary",
            onClick: () => navigate("/content-manager/collection-types/plugin::zhao-course.course"),
            children: "管理课程"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Button,
          {
            variant: "secondary",
            onClick: () => navigate(`/plugins/${index.PLUGIN_ID}/progress`),
            children: "学习进度"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Button,
          {
            variant: "secondary",
            onClick: () => navigate(`/plugins/${index.PLUGIN_ID}/auth`),
            children: "授权管理"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Button,
          {
            variant: "secondary",
            onClick: () => navigate(`/plugins/${index.PLUGIN_ID}/points`),
            children: "积分记录"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { background: "neutral100", padding: 4, borderRadius: 4, children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", fontWeight: "bold", children: "内容类型" }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { gap: 2, wrap: "wrap", paddingTop: 3, children: [
        { label: "课程", uid: "course" },
        { label: "课程分类", uid: "course-category" },
        { label: "课程标签", uid: "course-tag" },
        { label: "知识点", uid: "knowledge-point" },
        { label: "课时", uid: "course-lesson" },
        { label: "用户授权", uid: "user-course-auth" },
        { label: "课程进度", uid: "course-progress" },
        { label: "课时进度", uid: "lesson-progress" }
      ].map((ct) => /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Badge,
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
  const { formatMessage } = reactIntl.useIntl();
  const { get } = admin.useFetchClient();
  const [courseProgresses, setCourseProgresses] = react.useState([]);
  const [lessonProgresses, setLessonProgresses] = react.useState([]);
  const [activeTab, setActiveTab] = react.useState("course");
  const [isLoading, setIsLoading] = react.useState(true);
  const [search, setSearch] = react.useState("");
  const [page, setPage] = react.useState(1);
  const [pagination, setPagination] = react.useState({ page: 1, pageSize: 10, total: 0 });
  react.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Main, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 8, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", children: "学习进度" }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 3, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Badge,
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
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Badge,
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
    isLoading ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", padding: 8, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { children: "Loading content..." }) }) : activeTab === "course" ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Table, { colCount: 7, rowCount: courseProgresses.length, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Thead, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "用户" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "课程" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "进度" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "已完成课时/总课时" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "是否完成" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "积分已领取" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "获得积分" })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tbody, { children: courseProgresses.map((item) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Badge, { children: [
            Number(item.progress ?? 0).toFixed(1),
            "%"
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Td, { children: [
            item.completedLessons ?? 0,
            " / ",
            item.totalLessons ?? 0
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isCompleted ? "success" : "secondary", children: item.isCompleted ? "已完成" : "学习中" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isPointsClaimed ? "success" : "secondary", children: item.isPointsClaimed ? "已领取" : "未领取" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: item.pointsEarned ?? 0 })
        ] }, item.id || item.documentId)) })
      ] }),
      pagination.total > pagination.pageSize && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.IconButton,
          {
            label: "Previous",
            onClick: () => setPage(Math.max(1, page - 1)),
            disabled: page <= 1,
            variant: "ghost",
            children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronLeft, {})
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "omega", children: [
          page,
          " / ",
          Math.ceil(pagination.total / pagination.pageSize)
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.IconButton,
          {
            label: "Next",
            onClick: () => setPage(page + 1),
            disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
            variant: "ghost",
            children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronRight, {})
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Table, { colCount: 8, rowCount: lessonProgresses.length, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Thead, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "用户" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "课时" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "课程" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "进度" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "是否完成" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "已答题" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "答题正确" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "积分已领取" })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tbody, { children: lessonProgresses.map((item) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getLessonTitle(item.lesson) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Badge, { children: [
            Number(item.progress ?? 0).toFixed(1),
            "%"
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isCompleted ? "success" : "secondary", children: item.isCompleted ? "已完成" : "学习中" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isAnswered ? "success" : "secondary", children: item.isAnswered ? "是" : "否" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isCorrect ? "success" : "danger", children: item.isCorrect ? "正确" : item.isAnswered ? "错误" : "-" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isPointsClaimed ? "success" : "secondary", children: item.isPointsClaimed ? "已领取" : "未领取" }) })
        ] }, item.id || item.documentId)) })
      ] }),
      pagination.total > pagination.pageSize && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.IconButton,
          {
            label: "Previous",
            onClick: () => setPage(Math.max(1, page - 1)),
            disabled: page <= 1,
            variant: "ghost",
            children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronLeft, {})
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "omega", children: [
          page,
          " / ",
          Math.ceil(pagination.total / pagination.pageSize)
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.IconButton,
          {
            label: "Next",
            onClick: () => setPage(page + 1),
            disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
            variant: "ghost",
            children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronRight, {})
          }
        )
      ] })
    ] })
  ] }) }) });
};
const AuthPage = () => {
  const { get, post, del } = admin.useFetchClient();
  const [auths, setAuths] = react.useState([]);
  const [courses, setCourses] = react.useState([]);
  const [isLoading, setIsLoading] = react.useState(true);
  const [page, setPage] = react.useState(1);
  const [pagination, setPagination] = react.useState({ page: 1, pageSize: 10, total: 0 });
  const [showCreateModal, setShowCreateModal] = react.useState(false);
  const [formState, setFormState] = react.useState({
    user: "",
    course: "",
    authType: "admin_grant",
    expiresAt: ""
  });
  react.useEffect(() => {
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
  react.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Main, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 8, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "space-between", alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", children: "授权管理" }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Root, { open: showCreateModal, onOpenChange: setShowCreateModal, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Trigger, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Plus, {}), children: "手动授权" }) }),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Content, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Header, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Title, { children: "手动授权" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Body, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 4, children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "user", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "用户 ID" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.Field.Input,
                {
                  value: formState.user,
                  onChange: (e) => setFormState({ ...formState, user: e.target.value }),
                  placeholder: "输入用户 ID"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "course", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "课程" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.SingleSelect,
                {
                  value: formState.course,
                  onChange: (value) => setFormState({ ...formState, course: value }),
                  placeholder: "选择课程",
                  children: courses.map((course) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: String(course.id), children: course.title || course.id }, course.id || course.documentId))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "authType", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "授权方式" }),
              /* @__PURE__ */ jsxRuntime.jsxs(
                designSystem.SingleSelect,
                {
                  value: formState.authType,
                  onChange: (value) => setFormState({ ...formState, authType: value }),
                  children: [
                    /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: "admin_grant", children: "管理员授权" }),
                    /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: "paid", children: "付费" }),
                    /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: "free", children: "免费" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { name: "expiresAt", children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "过期时间（可选）" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.Field.Input,
                {
                  type: "datetime-local",
                  value: formState.expiresAt,
                  onChange: (e) => setFormState({ ...formState, expiresAt: e.target.value })
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Footer, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Close, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { variant: "tertiary", children: "取消" }) }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: handleCreate, disabled: !formState.user || !formState.course, children: "确认授权" })
          ] })
        ] })
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", padding: 8, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { children: "Loading content..." }) }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Table, { colCount: 6, rowCount: auths.length, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Thead, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "用户" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "课程" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "授权方式" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "过期时间" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "是否过期" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tbody, { children: auths.map((item) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { children: authTypeLabels[item.authType] || item.authType }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: item.expiresAt ? new Date(item.expiresAt).toLocaleString("zh-CN") : "永不过期" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isExpired ? "danger" : "success", children: item.isExpired ? "已过期" : "有效" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.IconButton,
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
              children: /* @__PURE__ */ jsxRuntime.jsx(icons.Trash, {})
            }
          ) })
        ] }, item.id || item.documentId)) })
      ] }),
      pagination.total > pagination.pageSize && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.IconButton,
          {
            label: "Previous",
            onClick: () => setPage(Math.max(1, page - 1)),
            disabled: page <= 1,
            variant: "ghost",
            children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronLeft, {})
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "omega", children: [
          page,
          " / ",
          Math.ceil(pagination.total / pagination.pageSize)
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.IconButton,
          {
            label: "Next",
            onClick: () => setPage(page + 1),
            disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
            variant: "ghost",
            children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronRight, {})
          }
        )
      ] })
    ] })
  ] }) }) });
};
const PointsPage = () => {
  const { get } = admin.useFetchClient();
  const [courseProgresses, setCourseProgresses] = react.useState([]);
  const [lessonProgresses, setLessonProgresses] = react.useState([]);
  const [activeTab, setActiveTab] = react.useState("course");
  const [isLoading, setIsLoading] = react.useState(true);
  const [page, setPage] = react.useState(1);
  const [pagination, setPagination] = react.useState({ page: 1, pageSize: 10, total: 0 });
  react.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Main, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 8, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 6, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", fontWeight: "bold", children: "积分记录" }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 3, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Badge,
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
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Badge,
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
    isLoading ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", padding: 8, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { children: "Loading content..." }) }) : activeTab === "course" ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Table, { colCount: 5, rowCount: courseProgresses.length, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Thead, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "用户" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "课程" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "获得积分" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "领取状态" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "完成状态" })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tbody, { children: courseProgresses.map((item) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", children: item.pointsEarned ?? 0 }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isPointsClaimed ? "success" : "warning", children: item.isPointsClaimed ? "已领取" : "未领取" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isCompleted ? "success" : "secondary", children: item.isCompleted ? "已完成" : "未完成" }) })
        ] }, item.id || item.documentId)) })
      ] }),
      courseProgresses.length === 0 && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 4, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", textColor: "neutral600", children: "暂无课程积分记录" }) })
    ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Table, { colCount: 6, rowCount: lessonProgresses.length, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Thead, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "用户" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "课时" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "课程" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "获得积分" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "领取状态" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Th, { children: "积分类型" })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tbody, { children: lessonProgresses.map((item) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tr, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getUserName(item.user) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getLessonTitle(item.lesson) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: getCourseTitle(item.course) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", children: item.pointsEarned ?? 0 }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { variant: item.isPointsClaimed ? "success" : "warning", children: item.isPointsClaimed ? "已领取" : "未领取" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Td, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { children: item.isAnswered ? "答题积分" : "课时积分" }) })
        ] }, item.id || item.documentId)) })
      ] }),
      lessonProgresses.length === 0 && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 4, background: "neutral100", borderRadius: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", textColor: "neutral600", children: "暂无课时积分记录" }) })
    ] }),
    pagination.total > pagination.pageSize && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "center", padding: 4, gap: 2, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.IconButton,
        {
          label: "Previous",
          onClick: () => setPage(Math.max(1, page - 1)),
          disabled: page <= 1,
          variant: "ghost",
          children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronLeft, {})
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "omega", children: [
        page,
        " / ",
        Math.ceil(pagination.total / pagination.pageSize)
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.IconButton,
        {
          label: "Next",
          onClick: () => setPage(page + 1),
          disabled: page >= Math.ceil(pagination.total / pagination.pageSize),
          variant: "ghost",
          children: /* @__PURE__ */ jsxRuntime.jsx(icons.ChevronRight, {})
        }
      )
    ] })
  ] }) }) });
};
const App = () => {
  return /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { index: true, element: /* @__PURE__ */ jsxRuntime.jsx(HomePage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "progress", element: /* @__PURE__ */ jsxRuntime.jsx(ProgressPage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "auth", element: /* @__PURE__ */ jsxRuntime.jsx(AuthPage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "points", element: /* @__PURE__ */ jsxRuntime.jsx(PointsPage, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx(admin.Page.Error, {}) })
  ] });
};
exports.App = App;
