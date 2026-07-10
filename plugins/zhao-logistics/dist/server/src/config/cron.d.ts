/**
 * zhao-logistics 定时任务
 * - 每 10 分钟同步活跃运单轨迹
 * - 每 30 分钟处理订阅通知（检测新节点）
 */
declare const cronTasks: {
    "*/10 * * * *": {
        task: ({ strapi }: {
            strapi: any;
        }) => Promise<void>;
        options: {
            tz: string;
        };
    };
    "*/30 * * * *": {
        task: ({ strapi }: {
            strapi: any;
        }) => Promise<void>;
        options: {
            tz: string;
        };
    };
};
export default cronTasks;
