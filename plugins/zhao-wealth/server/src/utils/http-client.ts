'use strict';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * 采集器专用 axios HTTP 客户端
 *
 * 优势（相比原生 fetch）：
 * 1. 自动 JSON 解析 — 无需手动 resp.json()，response.data 已是对象
 * 2. 统一超时控制 — 默认 15s，可按需覆盖
 * 3. 请求/响应拦截器 — 统一日志和错误处理
 * 4. 更好的错误信息 — error.response / error.request / error.message 三级分类
 * 5. 自动 Cookie/Referer 管理 — 通过 headers 配置即可
 *
 * 使用方式：
 *   import { httpClient } from '../utils/http-client';
 *   const resp = await httpClient.post(url, params, { headers: {...} });
 *   const data = resp.data;  // 已自动解析 JSON
 */

// 默认请求头
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// 默认超时 15 秒
const DEFAULT_TIMEOUT = 15000;

/**
 * 创建带默认配置的 axios 实例
 */
function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    timeout: DEFAULT_TIMEOUT,
    headers: DEFAULT_HEADERS,
    // 不自动跟随重定向（某些采集接口重定向到错误页）
    maxRedirects: 3,
    // 响应大小限制 10MB
    maxContentLength: 10 * 1024 * 1024,
  });

  // 请求拦截器：记录请求日志
  instance.interceptors.request.use(
    (config) => {
      const url = config.url || '';
      // 简短日志（避免打印大 body）
      console.log(`[http] ${config.method?.toUpperCase() || 'GET'} ${url.substring(0, 120)}`);
      return config;
    },
    (error) => {
      console.error(`[http] 请求构造失败: ${error.message}`);
      return Promise.reject(error);
    }
  );

  // 响应拦截器：统一错误处理
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        // 服务器返回了非 2xx 状态码
        const { status, statusText, config } = error.response;
        const errMsg = `HTTP ${status} ${statusText} — ${config?.url?.substring(0, 80) || ''}`;
        console.error(`[http] 响应错误: ${errMsg}`);
        return Promise.reject(new Error(errMsg));
      } else if (error.request) {
        // 请求已发出但无响应（超时、网络错误等）
        const errMsg = error.code === 'ECONNABORTED'
          ? `请求超时 (${error.config?.timeout || DEFAULT_TIMEOUT}ms) — ${error.config?.url?.substring(0, 80) || ''}`
          : `网络错误: ${error.message}`;
        console.error(`[http] ${errMsg}`);
        return Promise.reject(new Error(errMsg));
      } else {
        // 请求构造阶段出错
        console.error(`[http] 请求失败: ${error.message}`);
        return Promise.reject(error);
      }
    }
  );

  return instance;
}

// 单例实例
const instance = createAxiosInstance();

/**
 * HTTP 客户端（基于 axios）
 *
 * 用法示例：
 *   // GET 请求
 *   const resp = await httpClient.get('https://api.example.com/data');
 *   const data = resp.data;
 *
 *   // POST 表单
 *   const resp = await httpClient.post(url, params, {
 *     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 *   });
 *
 *   // 自定义超时
 *   const resp = await httpClient.get(url, { timeout: 30000 });
 */
export const httpClient = {
  /**
   * GET 请求
   */
  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return instance.get(url, config);
  },

  /**
   * POST 请求
   * data 可以是对象（自动序列化）或字符串（如 URLSearchParams）
   */
  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return instance.post(url, data, config);
  },

  /**
   * 获取底层 axios 实例（用于高级配置）
   */
  get instance(): AxiosInstance {
    return instance;
  },
};

/**
 * 创建带自定义配置的新 axios 实例
 * 适用于需要不同 baseURL、headers 或 cookie 管理的采集器
 *
 * 示例：
 *   const client = createHttpClient({
 *     baseURL: 'https://www.example.com',
 *     headers: { Referer: 'https://www.example.com' },
 *   });
 *   const resp = await client.get('/api/data');
 */
export function createHttpClient(config: AxiosRequestConfig = {}): AxiosInstance {
  return axios.create({
    timeout: DEFAULT_TIMEOUT,
    headers: { ...DEFAULT_HEADERS, ...config.headers },
    ...config,
  });
}
