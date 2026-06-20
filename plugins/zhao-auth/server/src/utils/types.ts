import type Koa from "koa";
import type { SignOptions, VerifyOptions } from "jsonwebtoken"; // 可选，提升精度

// ── 用户认证信息 ──
export interface AuthUser {
  id: number;
  email?: string;
  username?: string;
  roles?: string[];
  /** 原始 JWT payload */
  [key: string]: unknown;
}

// ── 策略配置 ──
export interface PolicyConfig {
  name: string;
  roles?: string[];
  channelId?: number | string;
  /** 自定义策略配置 */
  [key: string]: unknown;
}

// ── 认证上下文 ──
export interface AuthContext {
  user: AuthUser | null;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
}

// ── 策略检查结果 ──
export interface PolicyResult {
  passed: boolean;
  code?: string;
  message?: string;
}

// ── JWT 载荷
export interface JwtPayload {
  id: number;
  email?: string;
  username?: string;
  /** 单角色（字符串或对象） */
  role?: string | { name: string };
  /** 多角色（字符串数组或对象数组） */
  roles?: string[] | { name: string }[];
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

// ── 中间件配置 ──
export interface AuthMiddlewareConfig {
  /** 允许跳过认证的路径模式 */
  publicPaths?: string[];
  /** JWT secret，默认使用 Strapi 的 admin/API jwt secret */
  jwtSecret?: string;
  /** 默认策略 */
  defaultPolicies?: PolicyConfig[];
}

// ── JWT 服务接口 ──
export interface JwtService {
  /** 验证并解码 JWT，支持额外选项 */
  verify(token: string, secret?: string, options?: VerifyOptions): Promise<JwtPayload>;
  /** 签发 JWT，支持签名选项（如 expiresIn） */
  sign(payload: JwtPayload, options?: SignOptions): Promise<string>;
  /** 获取 JWT secret（优先 API token secret，fallback admin jwt secret） */
  getSecret(): string;
  /** 从 Koa 上下文中提取 Bearer Token */
  extractToken(ctx: Koa.Context): string | null;
}

// ── 认证服务接口 ──
export interface AuthService {
  /** 验证 JWT token，返回用户信息 */
  authenticate(token: string): Promise<AuthUser>;
  /** 执行策略链检查 */
  authorize(context: AuthContext, policies: PolicyConfig[]): Promise<PolicyResult>;
  /** 从请求上下文中提取 token（通常委托给 JwtService） */
  extractToken(ctx: Koa.Context): string | null;
  /** 获取当前请求用户（从 ctx.state 读取） */
  getUser(ctx: Koa.Context): AuthUser | null;
  /** 注册策略处理器 */
  registerPolicy(name: string, handler: PolicyHandler): void;
}

// ── 策略处理器 ──
export type PolicyHandler = (
  context: AuthContext,
  config?: Record<string, unknown>,
) => Promise<PolicyResult> | PolicyResult;

// ── 角色层级定义 ──
export interface RoleHierarchy {
  [roleName: string]: number;
}

// ── 角色继承定义 ──
export interface RoleInheritance {
  [roleName: string]: string[];
}

// ── 用户权限结构 ──
export interface UserPermissions {
  direct: string[];
  inherited: string[];
  effective: string[];
}