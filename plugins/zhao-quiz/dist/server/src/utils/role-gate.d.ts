/**
 * 考试/试卷角色门控共用逻辑：
 * - 读取用户 zhaoRoles 角色码白名单（quiz.examRoles）
 * - admin 恒放行；白名单空=不启用角色门控=放行
 */
export declare function resolveUserRoles(strapi: any, userId?: number): Promise<string[]>;
export declare function hasGrantedRole(userRoles: string[], whitelist: string[]): boolean;
/** 从关联课程 featureFlags（JSON 对象/字符串）解析 quiz.examRoles */
export declare function parseQuizExamRoles(course: any): string[];
