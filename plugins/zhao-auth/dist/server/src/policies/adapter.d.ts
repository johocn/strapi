import { Core } from '@strapi/strapi';
import { AuthContext, PolicyResult } from '../utils/types';
type CustomPolicyHandler = (context: AuthContext, config?: Record<string, unknown>) => Promise<PolicyResult> | PolicyResult;
type StrapiPolicyHandler = (policyContext: any, config: any, { strapi }: {
    strapi: Core.Strapi;
}) => Promise<boolean | void> | boolean | void;
/**
 * 将自定义 PolicyHandler 适配为 Strapi v5 原生 PolicyHandler 签名
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
export declare function adaptPolicy(handler: CustomPolicyHandler): StrapiPolicyHandler;
export {};
