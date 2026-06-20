import { getFetchClient } from "@strapi/strapi/admin";

const BASE = "/admin/plugins/zhao-course";

export const fetchCategories = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/course-categories`, { params });
  return data;
};

export const fetchTags = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`/admin/plugins/zhao-tag/tags`, { params });
  return data;
};

export const fetchCourses = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/courses`, { params });
  return data;
};

export const fetchCourse = async (documentId: string) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/courses/${documentId}`);
  return data;
};

export const fetchKnowledgePoints = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/knowledge-points`, { params });
  return data;
};

export const fetchLessons = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/lessons`, { params });
  return data;
};

export const fetchAuths = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/user-courses`, { params });
  return data;
};

export const createAuth = async (payload: Record<string, any>) => {
  const { post } = getFetchClient();
  const { data } = await post(`${BASE}/user-courses`, payload);
  return data;
};

export const updateAuth = async (documentId: string, payload: Record<string, any>) => {
  const { put } = getFetchClient();
  const { data } = await put(`${BASE}/user-courses/${documentId}`, payload);
  return data;
};

export const deleteAuth = async (documentId: string) => {
  const { del } = getFetchClient();
  const { data } = await del(`${BASE}/user-courses/${documentId}`);
  return data;
};

export const fetchCourseProgresses = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/course-progresses`, { params });
  return data;
};

export const fetchLessonProgresses = async (params: Record<string, any> = {}) => {
  const { get } = getFetchClient();
  const { data } = await get(`${BASE}/lesson-progresses`, { params });
  return data;
};

export const fetchDashboardStats = async () => {
  const { get } = getFetchClient();
  const [courses, categories, lessons, auths] = await Promise.all([
    get(`${BASE}/courses`, { params: { pagination: { pageSize: 1 } } }),
    get(`${BASE}/course-categories`, { params: { pagination: { pageSize: 1 } } }),
    get(`${BASE}/lessons`, { params: { pagination: { pageSize: 1 } } }),
    get(`${BASE}/user-courses`, { params: { pagination: { pageSize: 1 } } }),
  ]);
  return {
    courseCount: (courses.data as any)?.pagination?.total ?? (courses.data as any)?.length ?? 0,
    categoryCount: (categories.data as any)?.pagination?.total ?? (categories.data as any)?.length ?? 0,
    lessonCount: (lessons.data as any)?.pagination?.total ?? (lessons.data as any)?.length ?? 0,
    authCount: (auths.data as any)?.pagination?.total ?? (auths.data as any)?.length ?? 0,
  };
};
