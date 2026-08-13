import { Core } from '@strapi/strapi';
interface PortfolioProduct {
    productId: number;
    productName: string;
    allocationRatio: number;
    addedDate: string;
}
interface PlanPerformance {
    weightedReturn: number | null;
    weightedVolatility: number | null;
    weightedDrawdown: number | null;
    totalProducts: number;
    totalAmount: number | null;
    period: string;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    createPlan: (userId: string, planData: {
        planName: string;
        planType?: string;
        products: PortfolioProduct[];
        totalAmount?: number;
    }) => Promise<any>;
    getPlans: (userId: string, params: {
        page?: number;
        pageSize?: number;
    }) => Promise<{
        records: any[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getPlanDetail: (planId: number) => Promise<any>;
    updatePlan: (planId: number, planData: {
        planName?: string;
        planType?: string;
        products?: PortfolioProduct[];
        totalAmount?: number;
    }) => Promise<any>;
    deletePlan: (planId: number) => Promise<any>;
    calculatePlanPerformance: (planId: number, period?: string) => Promise<PlanPerformance | null>;
    exportPlanSummary: (planId: number) => Promise<{
        planName: any;
        planType: any;
        totalAmount: number;
        products: any;
        performance: PlanPerformance;
        exportDate: string;
        disclaimer: string;
    }>;
};
export default _default;
