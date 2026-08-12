import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    ensureSeedTable(): Promise<void>;
    getExecutedSeeds(plugin: string): Promise<string[]>;
    getSeedFiles(plugin: string): Promise<Array<{
        version: string;
        name: string;
        filePath: string;
    }>>;
    runSeed(plugin: string, version: string, name: string, filePath: string, direction?: "up" | "down"): Promise<void>;
    /**
     * 启动时自动执行所有未执行的种子脚本
     * 幂等性保证：追踪表记录已执行版本，不会重复执行
     * 同时要求 seed 文件内部做 findOrCreate 幂等检查（防止手动重跑或追踪表丢失）
     */
    runAllSeeds(): Promise<void>;
    /**
     * 回滚指定种子（需 seed 文件提供 down 方法）
     */
    rollback(plugin: string, version: string): Promise<void>;
    /**
     * 列出所有种子文件及执行状态（供诊断使用）
     */
    listSeeds(plugin?: string): Promise<{
        plugin: string;
        version: string;
        name: string;
        executed: boolean;
        executedAt?: string;
    }[]>;
};
export default _default;
