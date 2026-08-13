import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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
export declare const httpClient: {
    /**
     * GET 请求
     */
    get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    /**
     * POST 请求
     * data 可以是对象（自动序列化）或字符串（如 URLSearchParams）
     */
    post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    /**
     * 获取底层 axios 实例（用于高级配置）
     */
    readonly instance: AxiosInstance;
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
export declare function createHttpClient(config?: AxiosRequestConfig): AxiosInstance;
