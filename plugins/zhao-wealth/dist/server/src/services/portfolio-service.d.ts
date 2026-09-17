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
    }) => Promise<{
        ok: boolean;
        code: number;
        msg: string;
        record?: undefined;
    } | {
        ok: boolean;
        record: any;
        code?: undefined;
        msg?: undefined;
    }>;
    getPlans: (userId: string, params: {
        page?: number;
        pageSize?: number;
    }) => Promise<{
        records: any[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getPlanDetail: (planId: number, userId: string) => Promise<any>;
    updatePlan: (planId: number, userId: string, planData: {
        planName?: string;
        planType?: string;
        products?: PortfolioProduct[];
        totalAmount?: number;
    }) => Promise<{
        ok: boolean;
        code: number;
        msg: string;
        record?: undefined;
    } | {
        ok: boolean;
        record: any;
        code?: undefined;
        msg?: undefined;
    }>;
    deletePlan: (planId: number, userId: string) => Promise<{
        ok: boolean;
        code: number;
        msg: string;
        record?: undefined;
    } | {
        ok: boolean;
        record: any;
        code?: undefined;
        msg?: undefined;
    }>;
    calculatePlanPerformance: (planId: number, userId: string, period?: string) => Promise<PlanPerformance | null>;
    exportPlanSummary: (planId: number, userId: string) => Promise<{
        planName: any;
        planType: any;
        totalAmount: number;
        products: any;
        performance: PlanPerformance;
        exportDate: string;
        disclaimer: string;
    }>;
    normalizeProducts: (products: PortfolioProduct[]) => PortfolioProduct[];
};
export default _default;
